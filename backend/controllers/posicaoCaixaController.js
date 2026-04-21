// Controller: Posição de Caixa
// Gerencia registro de pagamentos e consultas do caixa do dia
const { PagamentoCaixa } = require("../models/PagamentoCaixa");
const { Venda } = require("../models/Venda");
const { Agendamento } = require("../models/Agendamento");
const { Op, fn, col, where, literal } = require("sequelize");

// Normaliza nomes de formas de pagamento para categorias usadas na UI/relatórios
function normalizeForma(raw) {
  if (!raw && raw !== 0) return "outro";
  const s = String(raw).toLowerCase().trim();
  // Mapear variações de cartão para 'cartao'
  const cartaoKeys = [
    "debito",
    "débito",
    "credito",
    "crédito",
    "card",
    "cartao",
    "cartão",
  ];
  if (cartaoKeys.includes(s)) return "cartao";
  // Dinheiro
  if (["dinheiro", "cash", "especie", "espécie"].includes(s)) return "dinheiro";
  // Pix
  if (s.indexOf("pix") !== -1) return "pix";
  // Caso não reconhecido, categorizar como 'outro'
  return "outro";
}

// ──────────────────────────────────────────────
// POST /api/posicao-caixa — Registrar novo pagamento
// ──────────────────────────────────────────────
exports.registrarPagamento = async (req, res) => {
  try {
    const {
      cliente_id,
      cliente_nome,
      pet_id,
      pet_nome,
      servico,
      forma_pagamento,
      valor,
    } = req.body;

    // Validação dos campos obrigatórios
    if (
      !cliente_id ||
      !cliente_nome ||
      !servico ||
      !forma_pagamento ||
      valor === undefined
    ) {
      return res.status(400).json({
        erro: "Campos obrigatórios: cliente_id, cliente_nome, servico, forma_pagamento, valor",
      });
    }

    // Validar forma de pagamento
    const formasPermitidas = ["dinheiro", "pix", "cartao"];
    if (!formasPermitidas.includes(forma_pagamento)) {
      return res.status(400).json({
        erro: "Forma de pagamento inválida. Use: dinheiro, pix ou cartao",
      });
    }

    // Validar valor positivo
    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return res
        .status(400)
        .json({ erro: "Valor deve ser um número positivo" });
    }

    // Criar o registro de pagamento
    const pagamento = await PagamentoCaixa.create({
      cliente_id: parseInt(cliente_id),
      cliente_nome: String(cliente_nome).trim(),
      pet_id: pet_id ? parseInt(pet_id) : null,
      pet_nome: pet_nome ? String(pet_nome).trim() : null,
      servico: String(servico).trim(),
      forma_pagamento,
      valor: valorNumerico,
      data_movimentacao: new Date(),
    });

    res.status(201).json(pagamento);
  } catch (error) {
    console.error("Erro ao registrar pagamento:", error);
    res.status(500).json({ erro: "Erro ao registrar pagamento" });
  }
};

// ──────────────────────────────────────────────────────
// GET /api/posicao-caixa/hoje — Listar movimentações do dia
// ──────────────────────────────────────────────────────
exports.listarHoje = async (req, res) => {
  try {
    // Início e fim do dia atual
    const hoje = new Date();
    const inicioDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      0,
      0,
      0,
    );
    const fimDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      23,
      59,
      59,
    );

    const movimentos = [];

    // 1) Movimentos manuais registrados em PagamentoCaixa
    const manuais = await PagamentoCaixa.findAll({
      where: { data_movimentacao: { [Op.between]: [inicioDia, fimDia] } },
      order: [["data_movimentacao", "DESC"]],
      raw: true,
    });
    manuais.forEach((m) => {
      const forma = normalizeForma(m.forma_pagamento);
      movimentos.push({
        origem: "manual",
        referencia: m.id,
        data: m.data_movimentacao,
        cliente: m.cliente_nome || null,
        pet: m.pet_nome || null,
        servico: m.servico || null,
        forma_pagamento: forma,
        valor: Number(m.valor) || 0,
      });
    });

    // 2) Agendamentos finalizados (buscamos primeiro para evitar duplicar vendas geradas por agendamento)
    const agendados = await Agendamento.findAll({
      where: {
        dataAgendamento: { [Op.between]: [inicioDia, fimDia] },
        status: "concluido",
        [Op.or]: [
          { totalPago: { [Op.gt]: 0 } },
          where(literal("JSON_LENGTH(pagamentos)"), ">", 0),
        ],
      },
      order: [["dataAgendamento", "DESC"]],
      raw: true,
    });

    const agendamentoIds = new Set((agendados || []).map((a) => Number(a.id)));

    // 3) Vendas realizadas em nova-venda (todas com totalPago > 0 ou pagamentos)
    const vendas = await Venda.findAll({
      where: {
        data: { [Op.between]: [inicioDia, fimDia] },
        [Op.or]: [
          { totalPago: { [Op.gt]: 0 } },
          where(literal("JSON_LENGTH(pagamentos)"), ">", 0),
        ],
      },
      order: [["data", "DESC"]],
      raw: true,
    });

    for (const v of vendas) {
      // Tentar detectar se a venda está vinculada a um agendamento (metadata em `totais`)
      let vendaAgId = null;
      try {
        const totaisObj =
          typeof v.totais === "string"
            ? JSON.parse(v.totais || "{}")
            : v.totais || {};
        vendaAgId =
          totaisObj.agendamentoId ||
          (totaisObj.meta && totaisObj.meta.agendamentoId) ||
          v.agendamentoId ||
          null;
      } catch (e) {
        vendaAgId = v.agendamentoId || null;
      }

      // Se esta venda foi originada de um agendamento que já está na lista, ignorar para evitar duplicata
      if (vendaAgId && agendamentoIds.has(Number(vendaAgId))) {
        continue;
      }

      const pagamentos = v.pagamentos || [];
      try {
        (Array.isArray(pagamentos) ? pagamentos : []).forEach((p) => {
          const forma = normalizeForma(
            p.forma || p.forma_pagamento || p.tipo || "outro",
          );
          const valor =
            Number(p.valor || p.amount || p.valorPago || p.total) || 0;
          movimentos.push({
            origem: "venda",
            referencia: v.id,
            data: v.data,
            cliente: v.cliente || null,
            pet: null,
            servico: "Venda",
            forma_pagamento: forma,
            valor,
          });
        });
      } catch (e) {
        // fallback: somar totalPago como único movimento
        movimentos.push({
          origem: "venda",
          referencia: v.id,
          data: v.data,
          cliente: v.cliente || null,
          pet: null,
          servico: "Venda",
          forma_pagamento: "desconhecido",
          valor: Number(v.totalPago) || 0,
        });
      }
    }

    // 4) Agendamentos finalizados (pagamentos em agendamento-detalhes) - agora processamos os agendados
    agendados.forEach((a) => {
      const pagamentos = a.pagamentos || [];
      try {
        (Array.isArray(pagamentos) ? pagamentos : []).forEach((p) => {
          const forma = normalizeForma(
            p.forma || p.forma_pagamento || p.tipo || "outro",
          );
          const valor =
            Number(p.valor || p.amount || p.valorPago || p.total) || 0;
          movimentos.push({
            origem: "agendamento",
            referencia: a.id,
            data: a.dataAgendamento,
            cliente: null,
            pet: a.petId || null,
            servico: a.servico || null,
            forma_pagamento: forma,
            valor,
          });
        });
      } catch (e) {
        movimentos.push({
          origem: "agendamento",
          referencia: a.id,
          data: a.dataAgendamento,
          cliente: null,
          pet: a.petId || null,
          servico: a.servico || null,
          forma_pagamento: "desconhecido",
          valor: Number(a.totalPago) || 0,
        });
      }
    });

    // Ordenar por data desc
    movimentos.sort((a, b) => new Date(b.data) - new Date(a.data));

    res.json(movimentos);
  } catch (error) {
    console.error("Erro ao listar movimentações do dia:", error);
    res.status(500).json({ erro: "Erro ao listar movimentações" });
  }
};

// ──────────────────────────────────────────────────────────────
// GET /api/posicao-caixa/resumo — Totais do dia por forma de pagamento
// ──────────────────────────────────────────────────────────────
exports.resumoCaixa = async (req, res) => {
  try {
    const hoje = new Date();
    const inicioDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      0,
      0,
      0,
    );
    const fimDia = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      23,
      59,
      59,
    );

    // Vamos agregar de 3 fontes: PagamentoCaixa (manuais), Vendas, Agendamentos
    const resumo = { dinheiro: 0, pix: 0, cartao: 0, outro: 0, total_geral: 0 };

    // 1) PagamentoCaixa
    const totaisManuais = await PagamentoCaixa.findAll({
      attributes: ["forma_pagamento", [fn("SUM", col("valor")), "total"]],
      where: { data_movimentacao: { [Op.between]: [inicioDia, fimDia] } },
      group: ["forma_pagamento"],
      raw: true,
    });
    totaisManuais.forEach((t) => {
      const forma = normalizeForma(t.forma_pagamento || "outro");
      const val = Number(t.total) || 0;
      resumo[forma] = (resumo[forma] || 0) + val;
      resumo.total_geral += val;
    });

    // 2) Agendamentos e Vendas - evitar duplicatas quando uma venda foi criada a partir de um agendamento
    const agendados = await Agendamento.findAll({
      where: {
        dataAgendamento: { [Op.between]: [inicioDia, fimDia] },
        status: "concluido",
        [Op.or]: [
          { totalPago: { [Op.gt]: 0 } },
          where(literal("JSON_LENGTH(pagamentos)"), ">", 0),
        ],
      },
      raw: true,
    });
    const agendamentoIds = new Set((agendados || []).map((a) => Number(a.id)));

    const vendas = await Venda.findAll({
      where: {
        data: { [Op.between]: [inicioDia, fimDia] },
        [Op.or]: [
          { totalPago: { [Op.gt]: 0 } },
          where(literal("JSON_LENGTH(pagamentos)"), ">", 0),
        ],
      },
      raw: true,
    });

    vendas.forEach((v) => {
      // Ignorar vendas vinculadas a agendamentos já listados (metadata em `totais`)
      let vendaAgId = null;
      try {
        const totaisObj =
          typeof v.totais === "string"
            ? JSON.parse(v.totais || "{}")
            : v.totais || {};
        vendaAgId =
          totaisObj.agendamentoId ||
          (totaisObj.meta && totaisObj.meta.agendamentoId) ||
          v.agendamentoId ||
          null;
      } catch (e) {
        vendaAgId = v.agendamentoId || null;
      }
      if (vendaAgId && agendamentoIds.has(Number(vendaAgId))) return;

      const pagamentos = v.pagamentos || [];
      (Array.isArray(pagamentos) ? pagamentos : []).forEach((p) => {
        const forma = normalizeForma(
          p.forma || p.forma_pagamento || p.tipo || "outro",
        );
        const val = Number(p.valor || p.amount || p.total || v.totalPago) || 0;
        resumo[forma] = (resumo[forma] || 0) + val;
        resumo.total_geral += val;
      });
    });

    // Agendamentos (somar pagamentos dos agendados)
    agendados.forEach((a) => {
      const pagamentos = a.pagamentos || [];
      (Array.isArray(pagamentos) ? pagamentos : []).forEach((p) => {
        const forma = normalizeForma(
          p.forma || p.forma_pagamento || p.tipo || "outro",
        );
        const val = Number(p.valor || p.amount || p.total || a.totalPago) || 0;
        resumo[forma] = (resumo[forma] || 0) + val;
        resumo.total_geral += val;
      });
    });

    // Garantir campos padrão
    resumo.dinheiro = Number(resumo.dinheiro || 0);
    resumo.pix = Number(resumo.pix || 0);
    resumo.cartao = Number(resumo.cartao || 0);
    resumo.outro = Number(resumo.outro || 0);
    resumo.total_geral = Number(resumo.total_geral || 0);

    res.json(resumo);
  } catch (error) {
    console.error("Erro ao gerar resumo do caixa:", error);
    res.status(500).json({ erro: "Erro ao gerar resumo do caixa" });
  }
};
