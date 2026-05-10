const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const ContaReceber = require("../models/ContaReceber");

// Helpers
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

// ── GET /api/contas-receber ───────────────────────────────────────────────────
// Parâmetros de query: clienteId, clienteNome, status, dataVencimentoInicio, dataVencimentoFim, previsao, limit, offset
router.get("/", async (req, res) => {
  try {
    const {
      clienteId,
      clienteNome,
      status,
      dataVencimentoInicio,
      dataVencimentoFim,
      previsao,
      limit: lim,
      offset: off,
    } = req.query;

    const where = {};

    // Filtro de empresa (multi-tenant)
    if (req.user?.empresaId) {
      where[Op.or] = [{ empresa_id: req.user.empresaId }, { empresa_id: null }];
    }

    if (clienteId) where.clienteId = Number(clienteId);
    if (clienteNome) where.clienteNome = { [Op.like]: `%${clienteNome}%` };

    if (status) {
      const statusList = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statusList.length === 1) where.status = statusList[0];
      else where.status = { [Op.in]: statusList };
    } else {
      // Por padrão, mostrar pendentes e parcialmente pagos
      where.status = { [Op.in]: ["pendente", "parcial"] };
    }

    // Filtro por previsão de vencimento
    if (previsao && previsao !== "todos") {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const hoje23 = new Date(hoje);
      hoje23.setHours(23, 59, 59, 999);

      if (previsao === "atrasado") {
        where.dataVencimento = { [Op.lt]: hoje };
      } else if (previsao === "hoje") {
        where.dataVencimento = { [Op.between]: [hoje, hoje23] };
      } else if (previsao === "proximos7") {
        const fim7 = new Date(hoje);
        fim7.setDate(hoje.getDate() + 7);
        fim7.setHours(23, 59, 59, 999);
        where.dataVencimento = { [Op.between]: [hoje, fim7] };
      } else if (previsao === "proximos30") {
        const fim30 = new Date(hoje);
        fim30.setDate(hoje.getDate() + 30);
        fim30.setHours(23, 59, 59, 999);
        where.dataVencimento = { [Op.between]: [hoje, fim30] };
      }
    } else if (dataVencimentoInicio || dataVencimentoFim) {
      const cond = {};
      if (dataVencimentoInicio) cond[Op.gte] = dataVencimentoInicio;
      if (dataVencimentoFim) cond[Op.lte] = dataVencimentoFim;
      where.dataVencimento = cond;
    }

    const limit = Math.min(parseInt(lim, 10) || 500, 2000);
    const offset = parseInt(off, 10) || 0;

    const rows = await ContaReceber.findAll({
      where,
      order: [
        ["dataVencimento", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit,
      offset,
    });

    return res.json(rows.map((r) => r.toJSON()));
  } catch (err) {
    console.error("[GET /api/contas-receber] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contas-receber/todos ─────────────────────────────────────────────
// Lista TODOS os registros (sem filtrar status) — para histórico
router.get("/todos", async (req, res) => {
  try {
    const { clienteId, clienteNome, limit: lim, offset: off } = req.query;
    const where = {};

    if (req.user?.empresaId) {
      where[Op.or] = [{ empresa_id: req.user.empresaId }, { empresa_id: null }];
    }
    if (clienteId) where.clienteId = Number(clienteId);
    if (clienteNome) where.clienteNome = { [Op.like]: `%${clienteNome}%` };

    const limit = Math.min(parseInt(lim, 10) || 500, 2000);
    const offset = parseInt(off, 10) || 0;

    const rows = await ContaReceber.findAll({
      where,
      order: [["dataVencimento", "DESC"]],
      limit,
      offset,
    });
    return res.json(rows.map((r) => r.toJSON()));
  } catch (err) {
    console.error("[GET /api/contas-receber/todos] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contas-receber/:id ───────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const row = await ContaReceber.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Registro não encontrado" });
    return res.json(row.toJSON());
  } catch (err) {
    console.error("[GET /api/contas-receber/:id] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/contas-receber ──────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    // Validações básicas
    if (!body.valor || toNum(body.valor) <= 0) {
      return res.status(400).json({ error: "Valor deve ser maior que zero" });
    }
    if (!body.dataVencimento) {
      return res
        .status(400)
        .json({ error: "Data de vencimento é obrigatória" });
    }

    const parcelas = Math.max(1, parseInt(body.parcelas, 10) || 1);
    const valorTotal = toNum(body.valor);
    const valorParcela = valorTotal / parcelas;

    // Auto-assign empresa_id
    const empresa_id = body.empresa_id || req.user?.empresaId || null;

    const hoje = new Date().toISOString().split("T")[0];
    const created = [];

    for (let i = 0; i < parcelas; i++) {
      // Calcular data de vencimento de cada parcela
      let venc = body.dataVencimento;
      if (parcelas > 1 && i > 0) {
        const d = new Date(body.dataVencimento + "T00:00:00");
        d.setMonth(d.getMonth() + i);
        venc = d.toISOString().split("T")[0];
      }

      const row = await ContaReceber.create({
        clienteId: body.clienteId || null,
        clienteNome: (body.clienteNome || "").trim() || null,
        descricao: (body.descricao || "").trim() || null,
        categoria: body.categoria || null,
        valor: valorParcela,
        dataEmissao: body.dataEmissao || hoje,
        dataVencimento: venc,
        formaPagamento: body.formaPagamento || null,
        status: body.status || "pendente",
        observacoes: (body.observacoes || "").trim() || null,
        parcelas,
        parcelaNumero: i + 1,
        documentoOrigem: body.documentoOrigem || null,
        valorPago: 0,
        empresa_id,
      });
      created.push(row.toJSON());
    }

    console.log(
      `[POST /api/contas-receber] Criados ${created.length} registros`,
    );
    return res.status(201).json(parcelas === 1 ? created[0] : created);
  } catch (err) {
    console.error("[POST /api/contas-receber] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/contas-receber/:id ───────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const row = await ContaReceber.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Registro não encontrado" });

    const body = req.body || {};
    await row.update({
      clienteId: body.clienteId !== undefined ? body.clienteId : row.clienteId,
      clienteNome:
        body.clienteNome !== undefined ? body.clienteNome : row.clienteNome,
      descricao: body.descricao !== undefined ? body.descricao : row.descricao,
      categoria: body.categoria !== undefined ? body.categoria : row.categoria,
      valor: body.valor !== undefined ? toNum(body.valor) : row.valor,
      dataEmissao:
        body.dataEmissao !== undefined ? body.dataEmissao : row.dataEmissao,
      dataVencimento:
        body.dataVencimento !== undefined
          ? body.dataVencimento
          : row.dataVencimento,
      formaPagamento:
        body.formaPagamento !== undefined
          ? body.formaPagamento
          : row.formaPagamento,
      status: body.status !== undefined ? body.status : row.status,
      observacoes:
        body.observacoes !== undefined ? body.observacoes : row.observacoes,
      parcelas: body.parcelas !== undefined ? body.parcelas : row.parcelas,
      parcelaNumero:
        body.parcelaNumero !== undefined
          ? body.parcelaNumero
          : row.parcelaNumero,
      documentoOrigem:
        body.documentoOrigem !== undefined
          ? body.documentoOrigem
          : row.documentoOrigem,
      valorPago:
        body.valorPago !== undefined ? toNum(body.valorPago) : row.valorPago,
      dataPagamento:
        body.dataPagamento !== undefined
          ? body.dataPagamento
          : row.dataPagamento,
    });

    return res.json(row.toJSON());
  } catch (err) {
    console.error("[PUT /api/contas-receber/:id] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/contas-receber/:id/receber ─────────────────────────────────────
// Registra recebimento total ou parcial de um documento
router.patch("/:id/receber", async (req, res) => {
  try {
    const row = await ContaReceber.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Registro não encontrado" });

    const { valorRecebido, dataPagamento, formaPagamento } = req.body || {};
    const vr = toNum(valorRecebido);
    if (vr <= 0) {
      return res.status(400).json({ error: "Valor recebido inválido" });
    }

    const novoPago = toNum(row.valorPago) + vr;
    const saldo = toNum(row.valor) - novoPago;
    const novoStatus = saldo <= 0 ? "pago" : "parcial";

    await row.update({
      valorPago: novoPago,
      status: novoStatus,
      dataPagamento: dataPagamento || new Date().toISOString().split("T")[0],
      formaPagamento: formaPagamento || row.formaPagamento,
    });

    return res.json(row.toJSON());
  } catch (err) {
    console.error("[PATCH /api/contas-receber/:id/receber] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/contas-receber/:id ───────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const row = await ContaReceber.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Registro não encontrado" });
    await row.destroy();
    console.log(`[DELETE /api/contas-receber/${req.params.id}] Removido`);
    return res.json({ success: true, message: "Registro removido" });
  } catch (err) {
    console.error("[DELETE /api/contas-receber/:id] Erro:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/contas-receber/resumo/periodo ────────────────────────────────────
// Totais por período (usado pelo painel financeiro)
router.get("/resumo/periodo", async (req, res) => {
  try {
    const agora = new Date();
    const hoje0 = new Date(agora);
    hoje0.setHours(0, 0, 0, 0);
    const hoje23 = new Date(agora);
    hoje23.setHours(23, 59, 59, 999);

    const baseWhere = req.user?.empresaId
      ? { [Op.or]: [{ empresa_id: req.user.empresaId }, { empresa_id: null }] }
      : {};

    const statusPendentes = { [Op.in]: ["pendente", "parcial"] };

    const [hoje, essaSemana, proximaSemana, esseMes, proximoMes, atrasado] =
      await Promise.all([
        ContaReceber.findAll({
          where: {
            ...baseWhere,
            status: statusPendentes,
            dataVencimento: { [Op.between]: [hoje0, hoje23] },
          },
          attributes: ["valor", "valorPago"],
        }),
        ContaReceber.findAll({
          where: {
            ...baseWhere,
            status: statusPendentes,
            dataVencimento: {
              [Op.between]: [
                hoje0,
                new Date(
                  agora.getFullYear(),
                  agora.getMonth(),
                  agora.getDate() + 6,
                  23,
                  59,
                  59,
                ),
              ],
            },
          },
          attributes: ["valor", "valorPago"],
        }),
        ContaReceber.findAll({
          where: {
            ...baseWhere,
            status: statusPendentes,
            dataVencimento: {
              [Op.between]: [
                new Date(
                  agora.getFullYear(),
                  agora.getMonth(),
                  agora.getDate() + 7,
                ),
                new Date(
                  agora.getFullYear(),
                  agora.getMonth(),
                  agora.getDate() + 13,
                  23,
                  59,
                  59,
                ),
              ],
            },
          },
          attributes: ["valor", "valorPago"],
        }),
        ContaReceber.findAll({
          where: {
            ...baseWhere,
            status: statusPendentes,
            dataVencimento: {
              [Op.between]: [
                new Date(agora.getFullYear(), agora.getMonth(), 1),
                new Date(
                  agora.getFullYear(),
                  agora.getMonth() + 1,
                  0,
                  23,
                  59,
                  59,
                ),
              ],
            },
          },
          attributes: ["valor", "valorPago"],
        }),
        ContaReceber.findAll({
          where: {
            ...baseWhere,
            status: statusPendentes,
            dataVencimento: {
              [Op.between]: [
                new Date(agora.getFullYear(), agora.getMonth() + 1, 1),
                new Date(
                  agora.getFullYear(),
                  agora.getMonth() + 2,
                  0,
                  23,
                  59,
                  59,
                ),
              ],
            },
          },
          attributes: ["valor", "valorPago"],
        }),
        ContaReceber.findAll({
          where: {
            ...baseWhere,
            status: statusPendentes,
            dataVencimento: { [Op.lt]: hoje0 },
          },
          attributes: ["valor", "valorPago"],
        }),
      ]);

    const calcSaldo = (rows) =>
      rows.reduce(
        (acc, r) => acc + Math.max(0, toNum(r.valor) - toNum(r.valorPago)),
        0,
      );

    return res.json({
      hoje: calcSaldo(hoje),
      essaSemana: calcSaldo(essaSemana),
      proximaSemana: calcSaldo(proximaSemana),
      esseMes: calcSaldo(esseMes),
      proximoMes: calcSaldo(proximoMes),
      atrasado: calcSaldo(atrasado),
    });
  } catch (err) {
    console.error(
      "[GET /api/contas-receber/resumo/periodo] Erro:",
      err.message,
    );
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
