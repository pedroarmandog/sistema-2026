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

// Produtos com estoque baixo ou sem estoque
exports.produtosEstoqueBaixo = async (req, res) => {
  try {
    const empresaId = req.user?.empresaId;
    // Usar condição literal para comparar colunas diretamente no SQL
    const condition = "(estoqueAtual = 0) OR (estoqueAtual < estoqueMinimo)";
    const whereClause = { [Op.and]: [literal(condition)] };
    if (empresaId) whereClause.empresa_id = empresaId;
    const produtos = await Produto.findAll({
      where: whereClause,
      order: [["estoqueAtual", "ASC"]],
      limit: 50,
    });

    console.log(`Encontrados ${produtos.length} produtos com estoque baixo`);
    res.json(produtos);
  } catch (error) {
    console.error("Erro ao buscar produtos com estoque baixo:", error);
    res.status(500).json({ erro: "Erro ao buscar produtos" });
  }
};

// Aniversariantes (Clientes e Pets) dos próximos 7 dias
exports.aniversariantes = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0); // normaliza para meia-noite para incluir aniversários de hoje
    const proximos7Dias = new Date(hoje);
    proximos7Dias.setDate(hoje.getDate() + 7);

    // Buscar pets com data de nascimento definida
    const pets = await Pet.findAll({
      where: Object.assign(
        { data_nascimento: { [Op.not]: null } },
        req.user?.empresaId ? { empresa_id: req.user.empresaId } : {},
      ),
    });

    // Filtrar pets que fazem aniversário nos próximos 7 dias
    // Usamos parse direto da string para evitar offset de fuso horário (UTC vs BRT)
    const petsFiltrados = pets.filter((pet) => {
      const dataPet = pet.data_nascimento || pet.dataNascimento;
      if (!dataPet) return false;
      const dateStr =
        typeof dataPet === "string"
          ? dataPet.split("T")[0]
          : dataPet.toISOString().split("T")[0];
      const [, mesStr, diaStr] = dateStr.split("-");
      const mes = parseInt(mesStr, 10) - 1; // 0-indexed
      const dia = parseInt(diaStr, 10);
      const aniversarioEsteAno = new Date(hoje.getFullYear(), mes, dia);
      const aniversarioProximoAno = new Date(hoje.getFullYear() + 1, mes, dia);
      return (
        (aniversarioEsteAno >= hoje && aniversarioEsteAno <= proximos7Dias) ||
        (aniversarioProximoAno >= hoje &&
          aniversarioProximoAno <= proximos7Dias)
      );
    });

    // Carregar clientes correspondentes em lote para evitar include problemático
    const clienteIds = Array.from(
      new Set(
        petsFiltrados.map((p) => p.cliente_id || p.clienteId).filter(Boolean),
      ),
    );
    let clientesMap = new Map();
    if (clienteIds.length > 0) {
      const clientes = await Cliente.findAll({ where: { id: clienteIds } });
      clientes.forEach((c) => clientesMap.set(c.id, c.nome));
    }

    const petsAniversariantes = petsFiltrados.map((pet) => {
      const dataPet = pet.data_nascimento || pet.dataNascimento;
      return {
        nome: pet.nome,
        dataNascimento: dataPet,
        clienteNome: clientesMap.get(pet.cliente_id || pet.clienteId) || null,
      };
    });

    // Buscar clientes aniversariantes
    const clientes = await Cliente.findAll({
      where: Object.assign(
        { data_nascimento: { [Op.not]: null } },
        req.user?.empresaId ? { empresa_id: req.user.empresaId } : {},
      ),
    });

    // Filtrar clientes que fazem aniversário nos próximos 7 dias
    // Usamos parse direto da string para evitar offset de fuso horário (UTC vs BRT)
    const clientesAniversariantes = clientes
      .filter((cliente) => {
        if (!cliente.data_nascimento) return false;
        const dataCli = cliente.data_nascimento;
        const dateStr =
          typeof dataCli === "string"
            ? dataCli.split("T")[0]
            : dataCli.toISOString().split("T")[0];
        const [, mesStr, diaStr] = dateStr.split("-");
        const mes = parseInt(mesStr, 10) - 1;
        const dia = parseInt(diaStr, 10);
        const aniversarioEsteAno = new Date(hoje.getFullYear(), mes, dia);
        const aniversarioProximoAno = new Date(
          hoje.getFullYear() + 1,
          mes,
          dia,
        );
        return (
          (aniversarioEsteAno >= hoje && aniversarioEsteAno <= proximos7Dias) ||
          (aniversarioProximoAno >= hoje &&
            aniversarioProximoAno <= proximos7Dias)
        );
      })
      .map((cliente) => ({
        nome: cliente.nome,
        dataNascimento: cliente.data_nascimento,
      }));

    res.json({
      pets: petsAniversariantes,
      clientes: clientesAniversariantes,
    });
  } catch (error) {
    console.error("Erro ao buscar aniversariantes:", error);
    res.status(500).json({ erro: "Erro ao buscar aniversariantes" });
  }
};

// Oportunidades de venda (produtos que clientes já devem estar precisando)
exports.oportunidadesVenda = async (req, res) => {
  try {
    // Buscar vendas dos últimos 90 dias para analisar padrões
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 90);

    const vendas = await Venda.findAll({
      where: Object.assign(
        { data: { [Op.gte]: dataLimite }, status: { [Op.ne]: "cancelado" } },
        req.user?.empresaId ? { empresa_id: req.user.empresaId } : {},
      ),
      include: [
        {
          model: Cliente,
          as: "Cliente",
          attributes: ["id", "nome"],
          required: false,
        },
      ],
      order: [["data", "DESC"]],
      limit: 100,
    });

    // Analisar vendas e criar oportunidades
    const oportunidadesMap = new Map();

    vendas.forEach((venda) => {
      if (!venda.clienteId || !venda.itens || !Array.isArray(venda.itens))
        return;

      venda.itens.forEach((item) => {
        const key = `${venda.clienteId}-${item.nome || item.produto}`;

        if (!oportunidadesMap.has(key)) {
          // Calcular dias desde a última compra
          const diasDesdeCompra = Math.floor(
            (new Date() - new Date(venda.data)) / (1000 * 60 * 60 * 24),
          );

          // Considerar oportunidade se passou mais de 30 dias
          if (diasDesdeCompra >= 30) {
            oportunidadesMap.set(key, {
              clienteNome:
                venda.Cliente?.nome ||
                venda.cliente ||
                "Cliente não identificado",
              produtoNome:
                item.nome ||
                (typeof item.produto === "object" && item.produto !== null
                  ? item.produto?.nome || item.produto?.descricao
                  : item.produto) ||
                "Produto",
              ultimaCompra: venda.data,
              quantidade: item.quantidade || 1,
              diasDesdeCompra,
            });
          }
        }
      });
    });

    // Converter Map para array e ordenar por dias desde compra (mais antigos primeiro)
    const oportunidades = Array.from(oportunidadesMap.values())
      .sort((a, b) => b.diasDesdeCompra - a.diasDesdeCompra)
      .slice(0, 20);

    res.json(oportunidades);
  } catch (error) {
    console.error("Erro ao buscar oportunidades de venda:", error);
    res.status(500).json({ erro: "Erro ao buscar oportunidades" });
  }
};

// Taxi Dog (agendamentos com serviço de transporte para hoje)
exports.levaTraz = async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Buscar agendamentos do dia
    const agendamentos = await Agendamento.findAll({
      where: Object.assign(
        { dataAgendamento: { [Op.gte]: hoje, [Op.lt]: amanha } },
        req.user?.empresaId ? { empresa_id: req.user.empresaId } : {},
      ),
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["nome"],
          include: [
            {
              model: Cliente,
              as: "cliente",
              attributes: ["nome", "endereco"],
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

        return {
          horario: ag.horario || "Horário não definido",
          petNome: ag.pet?.nome || "Pet não identificado",
          clienteNome: ag.pet?.cliente?.nome || "Cliente não identificado",
          endereco: ag.pet?.cliente?.endereco || "Endereço não cadastrado",
          servicos: ag.servicos || ag.servico || "",
          status: ag.status || "agendado",
          tipo,
        };
      });

    res.json(levaTrazList);
  } catch (error) {
    console.error("Erro ao buscar Taxi Dog:", error);
    res.status(500).json({ erro: "Erro ao buscar agendamentos" });
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
    const produtos = await Produto.findAll({
      where: whereVenc,
    });

    // Filtrar e processar produtos com validade
    const hoje = new Date();
    const produtosComValidade = produtos
      .map((produto) => {
        // Tentar parsear a validade se estiver em formato de data
        const validadeStr = produto.validade;
        let diasRestantes = null;

        // Tentar diferentes formatos de data
        if (validadeStr && validadeStr.match(/^\d{4}-\d{2}-\d{2}/)) {
          const dataValidade = new Date(validadeStr);
          if (!isNaN(dataValidade.getTime())) {
            diasRestantes = Math.floor(
              (dataValidade - hoje) / (1000 * 60 * 60 * 24),
            );
          }
        }

        return {
          ...produto.toJSON(),
          diasRestantes,
        };
      })
      .filter(
        (p) =>
          p.diasRestantes !== null &&
          p.diasRestantes <= 90 &&
          p.diasRestantes >= 0,
      )
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 50);

    res.json(produtosComValidade);
  } catch (error) {
    console.error("Erro ao buscar produtos próximos do vencimento:", error);
    res.status(500).json({ erro: "Erro ao buscar produtos" });
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
    console.error("Erro ao buscar contagem de vendas hoje:", error);
    res.status(500).json({ erro: "Erro ao buscar vendas" });
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
    console.error("Erro ao calcular ticket médio:", error);
    res.status(500).json({ erro: "Erro ao calcular ticket médio" });
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

    // Buscar agendamentos concluídos que têm periódicos (vacinas, vermífugos, antiparasitários)
    const agendamentos = await Agendamento.findAll({
      where: Object.assign({ status: "concluido" }, whereEmpresa),
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
    console.error("Erro ao buscar periódicos:", error);
    res.status(500).json({ erro: "Erro ao buscar periódicos" });
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
    console.error("Erro ao buscar contas a pagar:", error);
    res.status(500).json({ erro: "Erro ao buscar contas a pagar" });
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

    const [agendados, checkin, prontos] = await Promise.all([
      Agendamento.count({
        where: Object.assign({}, whereBase, { status: "agendado" }),
      }),
      Agendamento.count({
        where: Object.assign({}, whereBase, { status: "checkin" }),
      }),
      Agendamento.count({
        where: Object.assign({}, whereBase, { status: "pronto" }),
      }),
    ]);

    res.json({ agendados, checkin, prontos });
  } catch (error) {
    console.error("Erro ao buscar indicadores:", error);
    res.status(500).json({ erro: "Erro ao buscar indicadores" });
  }
};
