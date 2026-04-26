const {
  Produto,
  Cliente,
  Pet,
  Agendamento,
  Venda,
  Entrada,
  sequelize,
} = require("../models");
const { Op, literal } = require("sequelize");
const cache = require("../utils/simpleCache");

function handleError(res, context, error) {
  console.error(context, error);
  return res
    .status(500)
    .json({ erro: context, mensagem: error?.message, stack: error?.stack });
}

// Produtos com estoque baixo ou sem estoque
exports.produtosEstoqueBaixo = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    // Usar condição literal para comparar colunas diretamente no SQL
    const condition = "(estoqueAtual = 0) OR (estoqueAtual < estoqueMinimo)";
    const whereClause = { [Op.and]: [literal(condition)] };
    if (empresaId) whereClause.empresa_id = empresaId;
    const cacheKey = `dashboard:produtosEstoqueBaixo:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const produtos = await Produto.findAll({
      attributes: ["id", "nome", "estoqueAtual", "estoqueMinimo"],
      where: whereClause,
      order: [["estoqueAtual", "ASC"]],
      limit: 50,
    });

    const result = produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      estoqueAtual: p.estoqueAtual,
      estoqueMinimo: p.estoqueMinimo,
    }));
    cache.set(cacheKey, result, 10); // cache 10s
    console.log(`Encontrados ${result.length} produtos com estoque baixo`);
    res.json(result);
  } catch (error) {
    return handleError(res, "Erro ao buscar produtos com estoque baixo", error);
  }
};

// Resumo do dashboard: clientes, agendamentos hoje, vendas hoje, faturamento e ticket médio
exports.resumo = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:resumo:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const clientesTable = Cliente.getTableName
      ? Cliente.getTableName()
      : "clientes";
    const agTable = Agendamento.getTableName
      ? Agendamento.getTableName()
      : "agendamentos";
    const vendasTable = Venda.getTableName ? Venda.getTableName() : "vendas";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const empresaFilter = empresaId ? "AND empresa_id = :empresaId" : "";

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const sql = `SELECT
      (SELECT COUNT(*) FROM ${clientesTable} WHERE 1=1 ${empresaFilter}) AS clientes,
      (SELECT COUNT(*) FROM ${clientesTable} WHERE createdAt >= :inicioMes AND createdAt < :amanha ${empresaFilter}) AS clientesMes,
      (SELECT COUNT(*) FROM ${agTable} WHERE dataAgendamento >= :hoje AND dataAgendamento < :amanha ${empresaFilter}) AS agendamentosHoje,
      (SELECT COUNT(*) FROM ${vendasTable} WHERE data >= :hoje AND data < :amanha AND status <> 'cancelado' ${empresaFilter}) AS vendasHoje,
      (SELECT COALESCE(SUM(COALESCE(
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.final')) AS DECIMAL(15,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.totalFinal')) AS DECIMAL(15,2)),
        CAST(JSON_UNQUOTE(JSON_EXTRACT(totais, '$.total')) AS DECIMAL(15,2)),
        0
      )),0) FROM ${vendasTable} WHERE data >= :hoje AND data < :amanha AND status <> 'cancelado' ${empresaFilter}) AS vendasTotal`;

    const replacements = {
      inicioMes: inicioMes.toISOString().slice(0, 19).replace("T", " "),
      hoje: hoje.toISOString().slice(0, 19).replace("T", " "),
      amanha: amanha.toISOString().slice(0, 19).replace("T", " "),
    };
    if (empresaId) replacements.empresaId = empresaId;

    const rows = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });

    const r = rows && rows[0] ? rows[0] : {};
    const clientes = Number(r.clientes || 0);
    const agendamentosHoje = Number(r.agendamentosHoje || 0);
    const vendasHoje = Number(r.vendasHoje || 0);
    const vendasTotal = parseFloat(Number(r.vendasTotal || 0));
    const ticketMedio =
      vendasHoje > 0 ? parseFloat((vendasTotal / vendasHoje).toFixed(2)) : 0;

    const out = {
      clientes,
      agendamentosHoje,
      vendasHoje,
      vendasTotal,
      ticketMedio,
    };
    cache.set(cacheKey, out, 15); // TTL 15s
    res.json(out);
  } catch (error) {
    return handleError(res, "Erro ao gerar resumo do dashboard", error);
  }
};

// Aniversariantes (Clientes e Pets) dos próximos 7 dias
exports.aniversariantes = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:aniversariantes:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // montar lista de MM-DD para os próximos 7 dias
    const dias = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() + i);
      const mm = ("0" + (d.getMonth() + 1)).slice(-2);
      const dd = ("0" + d.getDate()).slice(-2);
      dias.push(`${mm}-${dd}`);
    }

    // Buscar apenas pets cujas datas batem com os próximos 7 dias (evitar carregar todos)
    const pets = await Pet.findAll({
      attributes: ["id", "nome", "data_nascimento", "cliente_id"],
      where: Object.assign(
        {
          [Op.and]: [
            { data_nascimento: { [Op.not]: null } },
            sequelize.where(
              sequelize.fn(
                "DATE_FORMAT",
                sequelize.col("data_nascimento"),
                "%m-%d",
              ),
              { [Op.in]: dias },
            ),
          ],
        },
        empresaId ? { empresa_id: empresaId } : {},
      ),
    });

    const clienteIds = Array.from(
      new Set(pets.map((p) => p.cliente_id).filter(Boolean)),
    );
    const clientesMap = new Map();
    if (clienteIds.length > 0) {
      const clientes = await Cliente.findAll({
        attributes: ["id", "nome"],
        where: { id: clienteIds },
      });
      clientes.forEach((c) => clientesMap.set(c.id, c.nome));
    }

    const petsAniversariantes = pets.map((pet) => ({
      id: pet.id,
      nome: pet.nome,
      dataNascimento: pet.data_nascimento,
      clienteNome: clientesMap.get(pet.cliente_id) || null,
    }));

    // Buscar clientes aniversariantes (somente colunas necessárias)
    const clientes = await Cliente.findAll({
      attributes: ["id", "nome", "data_nascimento"],
      where: Object.assign(
        {
          [Op.and]: [
            { data_nascimento: { [Op.not]: null } },
            sequelize.where(
              sequelize.fn(
                "DATE_FORMAT",
                sequelize.col("data_nascimento"),
                "%m-%d",
              ),
              { [Op.in]: dias },
            ),
          ],
        },
        empresaId ? { empresa_id: empresaId } : {},
      ),
    });

    const clientesAniversariantes = clientes.map((c) => ({
      id: c.id,
      nome: c.nome,
      dataNascimento: c.data_nascimento,
    }));

    const out = {
      pets: petsAniversariantes,
      clientes: clientesAniversariantes,
    };
    cache.set(cacheKey, out, 10);
    res.json(out);
  } catch (error) {
    return handleError(res, "Erro ao buscar aniversariantes", error);
  }
};

// Oportunidades de venda (produtos que clientes já devem estar precisando)
exports.oportunidadesVenda = async (req, res) => {
  try {
    // Buscar vendas dos últimos 90 dias para analisar padrões
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 90);
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:oportunidadesVenda:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const vendas = await Venda.findAll({
      attributes: ["id", "clienteId", "itens", "data"],
      where: Object.assign(
        { data: { [Op.gte]: dataLimite }, status: { [Op.ne]: "cancelado" } },
        empresaId ? { empresa_id: empresaId } : {},
      ),
      order: [["data", "DESC"]],
      limit: 100,
    });

    const oportunidadesMap = new Map();
    const clienteIds = new Set();

    vendas.forEach((venda) => {
      if (venda.clienteId) clienteIds.add(venda.clienteId);
      if (!venda.itens || !Array.isArray(venda.itens)) return;
      venda.itens.forEach((item) => {
        const key = `${venda.clienteId}-${item.nome || item.produto}`;
        if (!oportunidadesMap.has(key)) {
          const diasDesdeCompra = Math.floor(
            (new Date() - new Date(venda.data)) / (1000 * 60 * 60 * 24),
          );
          if (diasDesdeCompra >= 30) {
            oportunidadesMap.set(key, {
              clienteId: venda.clienteId,
              produtoNome:
                item.nome ||
                (item.produto && item.produto.nome) ||
                item.produto ||
                "Produto",
              ultimaCompra: venda.data,
              quantidade: item.quantidade || 1,
              diasDesdeCompra,
            });
          }
        }
      });
    });

    // Buscar nomes dos clientes em lote
    const clientesMap = new Map();
    if (clienteIds.size > 0) {
      const clientes = await Cliente.findAll({
        attributes: ["id", "nome"],
        where: { id: Array.from(clienteIds) },
      });
      clientes.forEach((c) => clientesMap.set(c.id, c.nome));
    }

    const oportunidades = Array.from(oportunidadesMap.values())
      .map((o) => ({
        clienteNome: clientesMap.get(o.clienteId) || "Cliente não identificado",
        produtoNome: o.produtoNome,
        ultimaCompra: o.ultimaCompra,
        quantidade: o.quantidade,
        diasDesdeCompra: o.diasDesdeCompra,
      }))
      .sort((a, b) => b.diasDesdeCompra - a.diasDesdeCompra)
      .slice(0, 20);

    cache.set(cacheKey, oportunidades, 10);
    res.json(oportunidades);
  } catch (error) {
    return handleError(res, "Erro ao buscar oportunidades de venda", error);
  }
};

// Taxi Dog (agendamentos com serviço de transporte para hoje)
exports.levaTraz = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const cacheKey = `dashboard:levaTraz:${empresaId || "all"}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Buscar agendamentos do dia com atributos mínimos
    const agendamentos = await Agendamento.findAll({
      attributes: [
        "id",
        "horario",
        "status",
        "observacoes",
        "servicos",
        "dataAgendamento",
      ],
      where: Object.assign(
        { dataAgendamento: { [Op.gte]: hoje, [Op.lt]: amanha } },
        empresaId ? { empresa_id: empresaId } : {},
      ),
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome", "cliente_id"],
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: [
                "id",
                "nome",
                "endereco",
                "numero",
                "complemento",
                "bairro",
                "cidade",
                "estado",
                "cep",
              ],
            },
          ],
        },
      ],
      order: [["horario", "ASC"]],
    });

    // Filtrar agendamentos com taxidog ativado OU que mencionam transporte nas observações
    const levaTrazList = agendamentos
      .filter((ag) => {
        if (ag.taxidog) return true;
        const obs = (ag.observacoes || "").toLowerCase();
        return (
          obs.includes("leva") ||
          obs.includes("traz") ||
          obs.includes("buscar") ||
          obs.includes("busca") ||
          obs.includes("transporte") ||
          obs.includes("entregar")
        );
      })
      .map((ag) => {
        const obs = (ag.observacoes || "").toLowerCase();
        let tipo = "buscar";
        if (obs.includes("entregar") || obs.includes("levar")) {
          tipo = "entregar";
        }

        // Formatador simples de endereço completo
        const cliente = ag.pet?.cliente || {};
        const partes = [];
        if (cliente.endereco) partes.push(cliente.endereco);
        if (cliente.numero) partes.push(String(cliente.numero));
        let complemento = cliente.complemento
          ? String(cliente.complemento).trim()
          : "";
        const bairro = cliente.bairro ? String(cliente.bairro).trim() : "";
        const cidade = cliente.cidade ? String(cliente.cidade).trim() : "";
        const estado = cliente.estado ? String(cliente.estado).trim() : "";
        if (complemento) partes.push(complemento);
        const enderecoRuaNum = partes.join(", ");
        const localidade = [
          bairro,
          cidade ? cidade + (estado ? "/" + estado : "") : null,
        ]
          .filter(Boolean)
          .join(" • ");
        const enderecoCompleto = [enderecoRuaNum, localidade]
          .filter(Boolean)
          .join(" — ");

        return {
          horario: ag.horario || "Horário não definido",
          petNome: ag.pet?.nome || "Pet não identificado",
          clienteNome: ag.pet?.cliente?.nome || "Cliente não identificado",
          endereco:
            enderecoCompleto ||
            ag.pet?.cliente?.endereco ||
            "Endereço não cadastrado",
          servicos: ag.servicos || ag.servico || "",
          status: ag.status || "agendado",
          tipo,
        };
      });

    res.json(levaTrazList);
  } catch (error) {
    return handleError(res, "Erro ao buscar Taxi Dog", error);
  }
};

// Produtos próximos do vencimento
exports.produtosVencimento = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    // Como o campo validade é STRING, vamos buscar todos os produtos que têm validade
    // e filtrar/ordenar no JavaScript
    const whereVenc = {
      validade: { [Op.not]: null },
      estoqueAtual: { [Op.gt]: 0 },
    };
    if (empresaId) whereVenc.empresa_id = empresaId;
    // Processar em batches para evitar carregar toda a tabela na memória
    const limitBatch = 2000;
    let offset = 0;
    const hoje = new Date();
    const candidatos = [];
    const maxCollect = 2000; // limite de segurança para não acumular milhões

    while (true) {
      const batch = await Produto.findAll({
        where: whereVenc,
        attributes: ["id", "nome", "validade", "estoqueAtual"],
        order: [["id", "ASC"]],
        limit: limitBatch,
        offset,
      });
      if (!batch || batch.length === 0) break;

      for (const produto of batch) {
        const validadeStr = produto.validade;
        let diasRestantes = null;
        if (validadeStr && validadeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          const dataValidade = new Date(validadeStr);
          if (!isNaN(dataValidade.getTime())) {
            diasRestantes = Math.floor(
              (dataValidade - hoje) / (1000 * 60 * 60 * 24),
            );
          }
        }
        if (
          diasRestantes !== null &&
          diasRestantes <= 90 &&
          diasRestantes >= 0
        ) {
          candidatos.push({ ...produto.toJSON(), diasRestantes });
        }
      }

      offset += batch.length;
      if (offset > 100000) break; // proteção adicional
      if (candidatos.length >= maxCollect) break; // já temos muitos candidatos
    }

    const produtosComValidade = candidatos
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 50);

    res.json(produtosComValidade);
  } catch (error) {
    return handleError(
      res,
      "Erro ao buscar produtos próximos do vencimento",
      error,
    );
  }
};

// Contagem de vendas realizadas hoje
exports.vendasHoje = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const where = {
      data: { [Op.gte]: hoje, [Op.lt]: amanha },
      status: { [Op.ne]: "cancelado" },
    };
    if (empresaId) where.empresa_id = empresaId;

    const count = await Venda.count({ where });

    res.json({ count });
  } catch (error) {
    return handleError(res, "Erro ao buscar contagem de vendas hoje", error);
  }
};

// Ticket médio das vendas do dia
exports.ticketMedio = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const where = {
      data: { [Op.gte]: hoje, [Op.lt]: amanha },
      status: { [Op.ne]: "cancelado" },
    };
    if (empresaId) where.empresa_id = empresaId;

    const vendas = await Venda.findAll({ where, attributes: ["totais"] });

    if (!vendas || vendas.length === 0) {
      return res.json({ ticketMedio: 0 });
    }

    let soma = 0;
    let contador = 0;

    vendas.forEach((v) => {
      try {
        let total = 0;
        if (v.totais) {
          // totais pode ser objeto JSON ou string
          const totaisObj =
            typeof v.totais === "string" ? JSON.parse(v.totais) : v.totais;
          total =
            parseFloat(
              totaisObj.final || totaisObj.totalFinal || totaisObj.total || 0,
            ) || 0;
        }
        if (!isNaN(total)) {
          soma += total;
          contador++;
        }
      } catch (err) {
        // ignorar vendas com formato inválido
      }
    });

    const ticket = contador > 0 ? soma / contador : 0;

    res.json({ ticketMedio: parseFloat(ticket.toFixed(2)) });
  } catch (error) {
    return handleError(res, "Erro ao calcular ticket médio", error);
  }
};

// Periódicos: pets com serviços periódicos a renovar nos próximos 7 dias
exports.periodicos = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const em7Dias = new Date(hoje);
    em7Dias.setDate(em7Dias.getDate() + 7);

    const whereEmpresa = req.user?.empresaId
      ? { empresa_id: req.user.empresaId }
      : {};

    // Buscar agendamentos concluídos (limitado ao último ano) para evitar findAll massivo
    const desde = new Date();
    desde.setDate(desde.getDate() - 365);
    const agendamentos = await Agendamento.findAll({
      where: Object.assign(
        { status: "concluido", dataAgendamento: { [Op.gte]: desde } },
        whereEmpresa,
      ),
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome"],
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: ["id", "nome"],
            },
          ],
        },
      ],
      order: [["dataAgendamento", "DESC"]],
    });

    // Agrupar por pet e analisar periodicidades
    const periodicosMap = new Map();

    agendamentos.forEach((ag) => {
      if (!ag.pet) return;
      const servicos = ag.servicos || ag.servico || "";
      const servicosStr =
        typeof servicos === "string" ? servicos : JSON.stringify(servicos);

      // Verificar se o agendamento tem serviços periódicos
      const ehPeriodico =
        servicosStr.toLowerCase().includes("vacina") ||
        servicosStr.toLowerCase().includes("vermifug") ||
        servicosStr.toLowerCase().includes("antipara") ||
        servicosStr.toLowerCase().includes("banho") ||
        servicosStr.toLowerCase().includes("tosa");

      if (!ehPeriodico) return;

      const key = `${ag.pet.id}-${servicosStr}`;
      if (!periodicosMap.has(key)) {
        const dataAg = new Date(ag.dataAgendamento);
        // Estimar renovação em 30 dias após o último atendimento
        const dataRenovacao = new Date(dataAg);
        dataRenovacao.setDate(dataRenovacao.getDate() + 30);

        if (dataRenovacao >= hoje && dataRenovacao <= em7Dias) {
          periodicosMap.set(key, {
            petId: ag.pet.id,
            petNome: ag.pet.nome,
            clienteNome: ag.pet.cliente?.nome || "N/A",
            clienteId: ag.pet.cliente?.id || null,
            servico: servicosStr,
            ultimoAtendimento: ag.dataAgendamento,
            dataRenovacao: dataRenovacao.toISOString().split("T")[0],
          });
        }
      }
    });

    res.json(Array.from(periodicosMap.values()));
  } catch (error) {
    return handleError(res, "Erro ao buscar periódicos", error);
  }
};

// Contas a pagar vencendo hoje
exports.contasAPagarHoje = async (req, res) => {
  try {
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split("T")[0];

    const whereEmpresa = req.user?.empresaId
      ? { empresa_id: req.user.empresaId }
      : {};

    const entradas = await Entrada.findAll({
      where: Object.assign(
        {
          situacao: { [Op.in]: ["pendente", "concluido"] },
          dataEntrada: dataHoje,
        },
        whereEmpresa,
      ),
      order: [["valorTotal", "DESC"]],
      limit: 20,
    });

    const contas = entradas.map((e) => ({
      id: e.id,
      fornecedor: e.fornecedor || "Não informado",
      numero: e.numero || "",
      valorTotal: parseFloat(e.valorTotal || 0),
      dataEmissao: e.dataEmissao,
      dataEntrada: e.dataEntrada,
      situacao: e.situacao,
    }));

    res.json(contas);
  } catch (error) {
    return handleError(res, "Erro ao buscar contas a pagar", error);
  }
};

// Indicadores do atendimento (agendados, checkin, prontos)
exports.indicadoresAtendimento = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const whereBase = Object.assign(
      { dataAgendamento: { [Op.gte]: hoje, [Op.lt]: amanha } },
      req.user?.empresaId ? { empresa_id: req.user.empresaId } : {},
    );

    // Agregação em uma única query para reduzir número de queries
    const table =
      typeof Agendamento.getTableName === "function"
        ? Agendamento.getTableName()
        : "agendamentos";
    const sql = `SELECT 
      SUM(CASE WHEN status='agendado' THEN 1 ELSE 0 END) AS agendados,
      SUM(CASE WHEN status='checkin' THEN 1 ELSE 0 END) AS checkin,
      SUM(CASE WHEN status='pronto' THEN 1 ELSE 0 END) AS prontos
      FROM ${table}
      WHERE dataAgendamento >= :hoje AND dataAgendamento < :amanha ${req.user?.empresaId ? "AND empresa_id = :empresaId" : ""}`;

    const replacements = {
      hoje: hoje.toISOString().slice(0, 19).replace("T", " "),
      amanha: amanha.toISOString().slice(0, 19).replace("T", " "),
    };
    if (req.user?.empresaId) replacements.empresaId = req.user.empresaId;

    const [rows] = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes.SELECT,
    });
    const agendados = Number(rows.agendados || 0);
    const checkin = Number(rows.checkin || 0);
    const prontos = Number(rows.prontos || 0);

    res.json({ agendados, checkin, prontos });
  } catch (error) {
    return handleError(res, "Erro ao buscar indicadores", error);
  }
};
