"use strict";

const NotaFiscal = require("../models/NotaFiscal");
const { Op } = require("sequelize");

/**
 * notaFiscalController
 *
 * Gerencia o registro de notas fiscais na Central Fiscal.
 * Rota: /api/notas-fiscais
 *
 * Este controller NÃO emite notas — apenas gerencia os registros.
 * A emissão será implementada futuramente nos adapters de provedores.
 */

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notas-fiscais
// Lista notas fiscais com filtros
// ─────────────────────────────────────────────────────────────────────────────

async function listar(req, res) {
  try {
    const empresa_id = req.user.empresaId;
    const {
      tipo,
      status,
      dataInicio,
      dataFim,
      venda_id,
      agendamento_id,
      busca,
      page = 1,
      limit = 50,
    } = req.query;

    const where = { empresa_id };

    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (venda_id) where.venda_id = venda_id;
    if (agendamento_id) where.agendamento_id = agendamento_id;

    if (dataInicio || dataFim) {
      where.data_emissao = {};
      if (dataInicio) where.data_emissao[Op.gte] = new Date(dataInicio);
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        where.data_emissao[Op.lte] = fim;
      }
    }

    if (busca) {
      where[Op.or] = [
        { destinatario_nome: { [Op.like]: `%${busca}%` } },
        { destinatario_documento: { [Op.like]: `%${busca}%` } },
        { chave_acesso: { [Op.like]: `%${busca}%` } },
        { numero: { [Op.like]: `%${busca}%` } },
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await NotaFiscal.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: Number(limit),
      offset,
      // Não retorna xml_autorizado na listagem (campo pesado)
      attributes: {
        exclude: ["xml_autorizado", "xml_cancelamento", "resposta_api"],
      },
    });

    return res.json({
      total: count,
      pagina: Number(page),
      totalPaginas: Math.ceil(count / Number(limit)),
      notas: rows,
    });
  } catch (err) {
    console.error("[notas-fiscais] listar:", err);
    return res.status(500).json({ erro: "Erro ao listar notas fiscais" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notas-fiscais/:id
// Busca uma nota fiscal pelo ID (inclui XML)
// ─────────────────────────────────────────────────────────────────────────────

async function buscarPorId(req, res) {
  try {
    const empresa_id = req.user.empresaId;
    const { id } = req.params;

    const nota = await NotaFiscal.findOne({ where: { id, empresa_id } });
    if (!nota)
      return res.status(404).json({ erro: "Nota fiscal não encontrada" });

    return res.json(nota);
  } catch (err) {
    console.error("[notas-fiscais] buscarPorId:", err);
    return res.status(500).json({ erro: "Erro ao buscar nota fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notas-fiscais/por-venda/:vendaId
// Busca notas fiscais associadas a uma venda
// ─────────────────────────────────────────────────────────────────────────────

async function buscarPorVenda(req, res) {
  try {
    const empresa_id = req.user.empresaId;
    const { vendaId } = req.params;

    const notas = await NotaFiscal.findAll({
      where: { empresa_id, venda_id: vendaId },
      attributes: {
        exclude: ["xml_autorizado", "xml_cancelamento", "resposta_api"],
      },
    });

    return res.json(notas);
  } catch (err) {
    console.error("[notas-fiscais] buscarPorVenda:", err);
    return res.status(500).json({ erro: "Erro ao buscar notas da venda" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/notas-fiscais
// Cria um rascunho de nota fiscal (sem emitir)
// ─────────────────────────────────────────────────────────────────────────────

async function criar(req, res) {
  try {
    const empresa_id = req.user.empresaId;

    const nota = await NotaFiscal.create({
      ...req.body,
      empresa_id,
      status: "rascunho",
    });

    return res.status(201).json(nota);
  } catch (err) {
    console.error("[notas-fiscais] criar:", err);
    return res
      .status(500)
      .json({ erro: "Erro ao criar rascunho de nota fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/notas-fiscais/:id
// Atualiza dados de uma nota fiscal (apenas rascunhos ou atualização de status)
// ─────────────────────────────────────────────────────────────────────────────

async function atualizar(req, res) {
  try {
    const empresa_id = req.user.empresaId;
    const { id } = req.params;

    const nota = await NotaFiscal.findOne({ where: { id, empresa_id } });
    if (!nota)
      return res.status(404).json({ erro: "Nota fiscal não encontrada" });

    // Não permite alterar notas autorizadas (apenas cancelar)
    if (nota.status === "autorizada" && req.body.status !== "cancelada") {
      return res.status(400).json({
        erro: "Notas autorizadas não podem ser editadas. Para cancelar, use o status 'cancelada'.",
      });
    }

    await nota.update(req.body);
    return res.json(nota);
  } catch (err) {
    console.error("[notas-fiscais] atualizar:", err);
    return res.status(500).json({ erro: "Erro ao atualizar nota fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/notas-fiscais/resumo
// Resumo de status para a Central Fiscal
// ─────────────────────────────────────────────────────────────────────────────

async function resumo(req, res) {
  try {
    const empresa_id = req.user.empresaId;

    const statusList = [
      "rascunho",
      "aguardando",
      "autorizada",
      "cancelada",
      "inutilizada",
      "erro",
      "denegada",
    ];

    const contagens = {};
    for (const status of statusList) {
      contagens[status] = await NotaFiscal.count({
        where: { empresa_id, status },
      });
    }

    return res.json({ empresa_id, contagens });
  } catch (err) {
    console.error("[notas-fiscais] resumo:", err);
    return res.status(500).json({ erro: "Erro ao buscar resumo fiscal" });
  }
}

module.exports = {
  listar,
  buscarPorId,
  buscarPorVenda,
  criar,
  atualizar,
  resumo,
};
