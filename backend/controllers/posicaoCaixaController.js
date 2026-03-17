// Controller: Posição de Caixa
// Gerencia registro de pagamentos e consultas do caixa do dia
const { PagamentoCaixa } = require("../models/PagamentoCaixa");
const { Op, fn, col } = require("sequelize");

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
      return res
        .status(400)
        .json({
          erro: "Campos obrigatórios: cliente_id, cliente_nome, servico, forma_pagamento, valor",
        });
    }

    // Validar forma de pagamento
    const formasPermitidas = ["dinheiro", "pix", "cartao"];
    if (!formasPermitidas.includes(forma_pagamento)) {
      return res
        .status(400)
        .json({
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

    const movimentacoes = await PagamentoCaixa.findAll({
      where: {
        data_movimentacao: {
          [Op.between]: [inicioDia, fimDia],
        },
      },
      order: [["data_movimentacao", "DESC"]],
    });

    res.json(movimentacoes);
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

    // Buscar totais agrupados por forma de pagamento
    const totais = await PagamentoCaixa.findAll({
      attributes: ["forma_pagamento", [fn("SUM", col("valor")), "total"]],
      where: {
        data_movimentacao: {
          [Op.between]: [inicioDia, fimDia],
        },
      },
      group: ["forma_pagamento"],
      raw: true,
    });

    // Montar objeto de resumo
    const resumo = {
      dinheiro: 0,
      pix: 0,
      cartao: 0,
      total_geral: 0,
    };

    totais.forEach((item) => {
      const val = parseFloat(item.total) || 0;
      resumo[item.forma_pagamento] = val;
      resumo.total_geral += val;
    });

    res.json(resumo);
  } catch (error) {
    console.error("Erro ao gerar resumo do caixa:", error);
    res.status(500).json({ erro: "Erro ao gerar resumo do caixa" });
  }
};
