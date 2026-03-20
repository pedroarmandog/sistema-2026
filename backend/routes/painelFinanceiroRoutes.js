/**
 * painelFinanceiroRoutes.js
 * Endpoints do Painel Financeiro – dados 100% do banco de dados.
 *
 * Fontes de dados:
 *   ENTRADAS:  vendas (status pago/parcial) + agendamentos (concluido) + movimentos_caixa (entrada)
 *   SAÍDAS:    entradas_mercadoria (situacao=pago, via dataPagamento) + movimentos_caixa (saida)
 *   A RECEBER: vendas status pendente/parcial
 *   A PAGAR:   entradas_mercadoria situacao=concluido (nota recebida mas não paga)
 *
 * Todos os parâmetros recebidos via query string são validados e usados
 * somente como valores em queries parametrizadas (Sequelize Op) – sem risco de SQL injection.
 */

const express = require("express");
const router = express.Router();
const { Op, fn, col, literal } = require("sequelize");

// ── Modelos ──────────────────────────────────────────────────────────────────
const { Venda, sequelize: seqVenda } = require("../models/Venda");
const { Agendamento } = require("../models/Agendamento");
const { MovimentoCaixa } = require("../models/MovimentoCaixa");
const Entrada = require("../models/Entrada");

// Instância do sequelize compartilhada
const { sequelize } = require("../models/Cliente");

// ── Utilitários ───────────────────────────────────────────────────────────────

/**
 * Converte um valor numérico para número seguro (evita NaN/null).
 */
function toNum(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Calcula o início e fim de semana (dom–sáb) contendo a data passada.
 */
function semanaContendo(date) {
  const d = new Date(date);
  const dia = d.getDay(); // 0=dom
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - dia);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

/**
 * Retorna o primeiro e último dia do mês.
 */
function limitesMes(ano, mes) {
  // mes: 1-based
  const inicio = new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  const fim = new Date(ano, mes, 0, 23, 59, 59, 999);
  return { inicio, fim };
}

/**
 * Retorna o nome do dia da semana em português para uma data.
 */
function nomeDiaSemana(date) {
  const nomes = [
    "Domingo",
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
  ];
  return nomes[new Date(date).getDay()];
}

/**
 * Formata uma data como DD/MM/YYYY.
 */
function fmtData(date) {
  const d = new Date(date);
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${d.getFullYear()}`;
}

// ── Helpers de consulta ───────────────────────────────────────────────────────

/**
 * Soma total de entradas (vendas + agendamentos + movimentos caixa entrada)
 * para um array de datas [Date start, Date end].
 */
async function somaEntradas(inicio, fim) {
  const [vendas, agendamentos, movimentos] = await Promise.all([
    // Vendas pagas total ou parcial dentro do período
    Venda.sum("totalPago", {
      where: {
        data: { [Op.between]: [inicio, fim] },
        status: { [Op.in]: ["pago", "parcial"] },
      },
    }),
    // Agendamentos concluídos
    Agendamento.sum("totalPago", {
      where: {
        dataAgendamento: { [Op.between]: [inicio, fim] },
        status: "concluido",
      },
    }),
    // Movimentos de caixa – entradas
    MovimentoCaixa.sum("valor", {
      where: {
        data: { [Op.between]: [inicio, fim] },
        tipo: "entrada",
      },
    }),
  ]);
  return toNum(vendas) + toNum(agendamentos) + toNum(movimentos);
}

/**
 * Soma total de saídas (entradas_mercadoria pagas + movimentos caixa saida)
 * para um intervalo de datas.
 * @param {Date} inicio
 * @param {Date} fim
 */
async function somaSaidas(inicio, fim) {
  const [comprasPagas, movimentos] = await Promise.all([
    // Entradas_mercadoria onde a data de pagamento cai no período e estão pagas
    Entrada.sum("valorTotal", {
      where: {
        dataPagamento: { [Op.between]: [inicio, fim] },
        situacao: "pago",
      },
    }),
    // Movimentos de caixa – saídas
    MovimentoCaixa.sum("valor", {
      where: {
        data: { [Op.between]: [inicio, fim] },
        tipo: "saida",
      },
    }),
  ]);
  return toNum(comprasPagas) + toNum(movimentos);
}

// ── ENDPOINT 1: Resumo (Contas a Receber / a Pagar) ──────────────────────────
/**
 * GET /api/painel-financeiro/resumo
 * Retorna totais de contas a receber e a pagar agrupados por período.
 * Usado nos cards laterais do painel.
 */
router.get("/resumo", async (req, res) => {
  try {
    const agora = new Date();
    const hoje0 = new Date(agora);
    hoje0.setHours(0, 0, 0, 0);
    const hoje23 = new Date(agora);
    hoje23.setHours(23, 59, 59, 999);

    // Semana atual (dom–sáb)
    const semana = semanaContendo(agora);
    // Próxima semana
    const proxSemIni = new Date(semana.fim);
    proxSemIni.setDate(proxSemIni.getDate() + 1);
    proxSemIni.setHours(0, 0, 0, 0);
    const proxSemFim = new Date(proxSemIni);
    proxSemFim.setDate(proxSemIni.getDate() + 6);
    proxSemFim.setHours(23, 59, 59, 999);

    // Mês atual
    const mesMesIni = new Date(
      agora.getFullYear(),
      agora.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const mesMesFim = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Próximo mês
    const proxMesIni = new Date(
      agora.getFullYear(),
      agora.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );
    const proxMesFim = new Date(
      agora.getFullYear(),
      agora.getMonth() + 2,
      0,
      23,
      59,
      59,
      999,
    );

    // ── CONTAS A RECEBER ──────────────────────────────────────────────────────
    // Vendas pendentes/parciais: saldo ainda a receber = (totais.totalFinal ou valor dos itens) - totalPago
    // Como totais é JSON, calculamos de forma mais simples:
    // usamos o campo 'data' da venda para agrupar temporalmente.
    // Valor a receber por venda = totalPago é o que JÁ foi recebido.
    // Para vendas pendentes, o total a receber é armazenado em totais.totalComDesconto ou similar.
    // Simplificação prática: somar totalPago das vendas (i.e., "quanto entrou por venda") como proxy
    // e usar dados de vendas status='pendente' ou 'parcial' para "a receber futuro".
    // NOTA: Aqui interpretamos "contas a receber" como valor total das vendas status=pendente|parcial.

    const [recHoje, recSemana, recProxSem, recMes, recProxMes, recAtrasado] =
      await Promise.all([
        // Hoje
        Venda.findAll({
          where: {
            data: { [Op.between]: [hoje0, hoje23] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Esta semana
        Venda.findAll({
          where: {
            data: { [Op.between]: [semana.inicio, semana.fim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Próxima semana
        Venda.findAll({
          where: {
            data: { [Op.between]: [proxSemIni, proxSemFim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Este mês
        Venda.findAll({
          where: {
            data: { [Op.between]: [mesMesIni, mesMesFim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Próximo mês
        Venda.findAll({
          where: {
            data: { [Op.between]: [proxMesIni, proxMesFim] },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
        // Atrasadas (anteriores a hoje)
        Venda.findAll({
          where: {
            data: { [Op.lt]: hoje0 },
            status: { [Op.in]: ["pendente", "parcial"] },
          },
          attributes: ["totais", "totalPago"],
        }),
      ]);

    // Calcula saldo pendente de uma lista de vendas
    const calcReceber = (vendas) =>
      vendas.reduce((acc, v) => {
        const total = toNum(
          v.totais?.totalComDesconto ||
            v.totais?.totalFinal ||
            v.totais?.subtotal ||
            0,
        );
        const pago = toNum(v.totalPago);
        return acc + Math.max(0, total - pago);
      }, 0);

    const receber = {
      hoje: calcReceber(recHoje),
      essaSemana: calcReceber(recSemana),
      proximaSemana: calcReceber(recProxSem),
      esseMes: calcReceber(recMes),
      proximoMes: calcReceber(recProxMes),
      atrasado: calcReceber(recAtrasado),
    };
    receber.geral =
      receber.hoje +
      receber.essaSemana +
      receber.proximaSemana +
      receber.esseMes +
      receber.proximoMes +
      receber.atrasado;

    // ── CONTAS A PAGAR ────────────────────────────────────────────────────────
    // Documentos a pagar são entradas_mercadoria com situacao='concluido'
    // (ainda não pagos). O campo dataEntrada armazena a data de vencimento
    // definida no momento da criação do documento. Quando o documento for pago,
    // situacao muda para 'pago' e ele deixa de aparecer aqui.

    const [
      pagHoje,
      pagSemana,
      pagProxSem,
      pagMes,
      pagProxMes,
      pagAtrasado,
      pagGeral,
    ] = await Promise.all([
      // Vencimento hoje
      Entrada.findAll({
        where: {
          dataEntrada: { [Op.between]: [hoje0, hoje23] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento esta semana
      Entrada.findAll({
        where: {
          dataEntrada: { [Op.between]: [semana.inicio, semana.fim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento próxima semana
      Entrada.findAll({
        where: {
          dataEntrada: { [Op.between]: [proxSemIni, proxSemFim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento este mês
      Entrada.findAll({
        where: {
          dataEntrada: { [Op.between]: [mesMesIni, mesMesFim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Vencimento próximo mês
      Entrada.findAll({
        where: {
          dataEntrada: { [Op.between]: [proxMesIni, proxMesFim] },
          situacao: "concluido",
        },
        attributes: ["valorTotal"],
      }),
      // Atrasados: vencimento anterior a hoje e ainda não pago
      Entrada.findAll({
        where: { dataEntrada: { [Op.lt]: hoje0 }, situacao: "concluido" },
        attributes: ["valorTotal"],
      }),
      // Geral: todos os documentos não pagos, independente de vencimento
      Entrada.findAll({
        where: { situacao: "concluido" },
        attributes: ["valorTotal"],
      }),
    ]);

    const calcPagar = (entradas) =>
      entradas.reduce((acc, e) => acc + toNum(e.valorTotal), 0);

    const pagar = {
      hoje: calcPagar(pagHoje),
      essaSemana: calcPagar(pagSemana),
      proximaSemana: calcPagar(pagProxSem),
      esseMes: calcPagar(pagMes),
      proximoMes: calcPagar(pagProxMes),
      atrasado: calcPagar(pagAtrasado),
      geral: calcPagar(pagGeral),
    };

    return res.json({ receber, pagar });
  } catch (err) {
    console.error("[painel-financeiro/resumo] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar resumo financeiro" });
  }
});

// ── ENDPOINT 2: Calendário ────────────────────────────────────────────────────
/**
 * GET /api/painel-financeiro/calendario?mes=3&ano=2026
 * Retorna, para cada dia do mês, o total de entradas, saídas, saldo do dia
 * e saldo acumulado.
 */
router.get("/calendario", async (req, res) => {
  try {
    // Validar e sanitizar parâmetros
    const hoje = new Date();
    const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
    const ano = parseInt(req.query.ano) || hoje.getFullYear();

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    const { inicio: mesIni, fim: mesFim } = limitesMes(ano, mes);
    const totalDias = new Date(ano, mes, 0).getDate();

    // Buscar dados agregados de vendas por dia
    const [vendasDia, agendDia, movEntDia, comprasDia, movSaiDia] =
      await Promise.all([
        // Vendas pagas por dia
        Venda.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            data: { [Op.between]: [mesIni, mesFim] },
            status: { [Op.in]: ["pago", "parcial"] },
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Agendamentos concluídos por dia
        Agendamento.findAll({
          attributes: [
            [fn("DATE", col("dataAgendamento")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            dataAgendamento: { [Op.between]: [mesIni, mesFim] },
            status: "concluido",
          },
          group: [fn("DATE", col("dataAgendamento"))],
          raw: true,
        }),
        // Movimentos de caixa – entradas por dia
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            data: { [Op.between]: [mesIni, mesFim] },
            tipo: "entrada",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Compras pagas por dia (via dataPagamento)
        Entrada.findAll({
          attributes: [
            ["dataPagamento", "dia"],
            [fn("SUM", col("valorTotal")), "total"],
          ],
          where: {
            dataPagamento: { [Op.between]: [mesIni, mesFim] },
            situacao: "pago",
          },
          group: ["dataPagamento"],
          raw: true,
        }),
        // Movimentos de caixa – saídas por dia
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            data: { [Op.between]: [mesIni, mesFim] },
            tipo: "saida",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
      ]);

    // Indexar resultados por string de data YYYY-MM-DD
    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = toNum(r.total);
        return m;
      }, {});

    const idxVendas = idx(vendasDia);
    const idxAgend = idx(agendDia);
    const idxMovEnt = idx(movEntDia);
    const idxCompras = idx(comprasDia);
    const idxMovSai = idx(movSaiDia);

    // Montar array de dias com saldo acumulado
    let saldoAcumulado = 0;
    const dias = [];
    for (let d = 1; d <= totalDias; d++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const entradas =
        (idxVendas[dataStr] || 0) +
        (idxAgend[dataStr] || 0) +
        (idxMovEnt[dataStr] || 0);
      const saidas = (idxCompras[dataStr] || 0) + (idxMovSai[dataStr] || 0);
      const saldoDia = entradas - saidas;
      saldoAcumulado += saldoDia;

      dias.push({
        dia: d,
        dataStr,
        entradas,
        saidas,
        saldo: saldoDia,
        saldoAcumulado,
      });
    }

    return res.json({ mes, ano, dias });
  } catch (err) {
    console.error("[painel-financeiro/calendario] Erro:", err.message);
    return res
      .status(500)
      .json({ error: "Erro ao buscar dados do calendário" });
  }
});

// ── ENDPOINT 3: Dados dos Gráficos ────────────────────────────────────────────
/**
 * GET /api/painel-financeiro/grafico?mes=3&ano=2026
 * Retorna séries de dados para os dois gráficos:
 *   - Saldo de contas (acumulado real) e Saldo previsto (contas a pagar futuras deduzidas)
 *   - A receber (pendentes) e A pagar (concluídas não pagas) por dia
 */
router.get("/grafico", async (req, res) => {
  try {
    const hoje = new Date();
    const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
    const ano = parseInt(req.query.ano) || hoje.getFullYear();

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    const { inicio: mesIni, fim: mesFim } = limitesMes(ano, mes);
    const totalDias = new Date(ano, mes, 0).getDate();

    // Buscar entradas e saídas por dia (reutiliza a mesma lógica do calendário)
    const [
      vendasDia,
      agendDia,
      movEntDia,
      comprasDia,
      movSaiDia,
      recDia,
      pagDia,
    ] = await Promise.all([
      Venda.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          data: { [Op.between]: [mesIni, mesFim] },
          status: { [Op.in]: ["pago", "parcial"] },
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      Agendamento.findAll({
        attributes: [
          [fn("DATE", col("dataAgendamento")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          dataAgendamento: { [Op.between]: [mesIni, mesFim] },
          status: "concluido",
        },
        group: [fn("DATE", col("dataAgendamento"))],
        raw: true,
      }),
      MovimentoCaixa.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: { data: { [Op.between]: [mesIni, mesFim] }, tipo: "entrada" },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      Entrada.findAll({
        attributes: [
          ["dataPagamento", "dia"],
          [fn("SUM", col("valorTotal")), "total"],
        ],
        where: {
          dataPagamento: { [Op.between]: [mesIni, mesFim] },
          situacao: "pago",
        },
        group: ["dataPagamento"],
        raw: true,
      }),
      MovimentoCaixa.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("valor")), "total"],
        ],
        where: { data: { [Op.between]: [mesIni, mesFim] }, tipo: "saida" },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      // A receber (vendas pendentes/parciais) por dia
      Venda.findAll({
        attributes: [
          [fn("DATE", col("data")), "dia"],
          [fn("SUM", col("totalPago")), "total"],
        ],
        where: {
          data: { [Op.between]: [mesIni, mesFim] },
          status: { [Op.in]: ["pendente", "parcial"] },
        },
        group: [fn("DATE", col("data"))],
        raw: true,
      }),
      // A pagar (entradas concluídas não pagas) por vencimento
      Entrada.findAll({
        attributes: [
          ["dataPagamento", "dia"],
          [fn("SUM", col("valorTotal")), "total"],
        ],
        where: {
          dataPagamento: { [Op.between]: [mesIni, mesFim] },
          situacao: "concluido",
        },
        group: ["dataPagamento"],
        raw: true,
      }),
    ]);

    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = toNum(r.total);
        return m;
      }, {});

    const iV = idx(vendasDia),
      iA = idx(agendDia),
      iME = idx(movEntDia);
    const iC = idx(comprasDia),
      iMS = idx(movSaiDia);
    const iR = idx(recDia),
      iP = idx(pagDia);

    const labels = [],
      saldoContas = [],
      saldoPrevisto = [],
      aReceber = [],
      aPagar = [];
    let acum = 0,
      acumPrev = 0;

    for (let d = 1; d <= totalDias; d++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const label = `${String(d).padStart(2, "0")}/${String(mes).padStart(2, "0")}`;

      const entradas =
        (iV[dataStr] || 0) + (iA[dataStr] || 0) + (iME[dataStr] || 0);
      const saidas = (iC[dataStr] || 0) + (iMS[dataStr] || 0);
      acum += entradas - saidas;

      // Saldo previsto considera também contas a receber e a pagar futuras
      const prevEntrada = iR[dataStr] || 0;
      const prevSaida = iP[dataStr] || 0;
      acumPrev += entradas - saidas + prevEntrada - prevSaida;

      labels.push(label);
      saldoContas.push(parseFloat(acum.toFixed(2)));
      saldoPrevisto.push(parseFloat(acumPrev.toFixed(2)));
      aReceber.push(parseFloat(((iR[dataStr] || 0) + entradas).toFixed(2)));
      aPagar.push(parseFloat(((iP[dataStr] || 0) + saidas).toFixed(2)));
    }

    return res.json({ labels, saldoContas, saldoPrevisto, aReceber, aPagar });
  } catch (err) {
    console.error("[painel-financeiro/grafico] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar dados dos gráficos" });
  }
});

// ── ENDPOINT 4: Fluxo de Caixa ────────────────────────────────────────────────
/**
 * GET /api/painel-financeiro/fluxo-caixa
 * Query params:
 *   periodo    = 'mensal' | 'semanal' | 'diario'  (default: mensal)
 *   mes        = 1-12    (default: mês atual)
 *   ano        = YYYY    (default: ano atual)
 *   semana     = 0..53   (usada no período semanal; 0 = semana atual)
 *   dataRef    = 'YYYY-MM-DD' (usada no período diário)
 *
 * Retorna colunas e linhas com:
 *   SALDO INICIAL, ENTRADAS (oper, financ, outras), SAÍDAS (custo, despesa, invest, outras),
 *   SALDO DO PERÍODO, SALDO FINAL
 */
router.get("/fluxo-caixa", async (req, res) => {
  try {
    const hoje = new Date();
    const periodo = ["mensal", "semanal", "diario"].includes(req.query.periodo)
      ? req.query.periodo
      : "mensal";
    const mes = parseInt(req.query.mes) || hoje.getMonth() + 1;
    const ano = parseInt(req.query.ano) || hoje.getFullYear();

    if (mes < 1 || mes > 12 || ano < 2000 || ano > 2100) {
      return res.status(400).json({ error: "Parâmetros inválidos" });
    }

    // Determinar colunas (datas) conforme período
    let colunas = [];

    if (periodo === "mensal") {
      // Uma coluna por dia do mês
      const totalDias = new Date(ano, mes, 0).getDate();
      for (let d = 1; d <= totalDias; d++) {
        const dt = new Date(ano, mes - 1, d);
        colunas.push({
          dataStr: `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          label: fmtData(dt),
          diaSemana: nomeDiaSemana(dt),
        });
      }
    } else if (periodo === "semanal") {
      // Semana contendo o primeiro dia do mês selecionado (ou data atual)
      const dataRef = req.query.dataRef
        ? new Date(req.query.dataRef)
        : new Date(ano, mes - 1, 1);
      const { inicio } = semanaContendo(dataRef);
      for (let i = 0; i < 7; i++) {
        const dt = new Date(inicio);
        dt.setDate(inicio.getDate() + i);
        colunas.push({
          dataStr: dt.toISOString().slice(0, 10),
          label: fmtData(dt),
          diaSemana: nomeDiaSemana(dt),
        });
      }
    } else {
      // Diário: uma única coluna
      const dataRef = req.query.dataRef ? new Date(req.query.dataRef) : hoje;
      const dt = new Date(
        dataRef.getFullYear(),
        dataRef.getMonth(),
        dataRef.getDate(),
      );
      colunas.push({
        dataStr: dt.toISOString().slice(0, 10),
        label: fmtData(dt),
        diaSemana: nomeDiaSemana(dt),
      });
    }

    if (colunas.length === 0) {
      return res.json({ colunas: [], linhas: {} });
    }

    const dataIni = new Date(`${colunas[0].dataStr}T00:00:00`);
    const dataFim = new Date(`${colunas[colunas.length - 1].dataStr}T23:59:59`);

    // ── Buscar dados por dia ──────────────────────────────────────────────────
    const [vendasDia, agendDia, movEntDia, comprasDia, movSaiDia] =
      await Promise.all([
        // Receitas Operacionais: vendas pagas
        Venda.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            data: { [Op.between]: [dataIni, dataFim] },
            status: { [Op.in]: ["pago", "parcial"] },
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Receitas Operacionais: agendamentos concluídos
        Agendamento.findAll({
          attributes: [
            [fn("DATE", col("dataAgendamento")), "dia"],
            [fn("SUM", col("totalPago")), "total"],
          ],
          where: {
            dataAgendamento: { [Op.between]: [dataIni, dataFim] },
            status: "concluido",
          },
          group: [fn("DATE", col("dataAgendamento"))],
          raw: true,
        }),
        // Outras entradas: movimentos de caixa (entrada)
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: {
            data: { [Op.between]: [dataIni, dataFim] },
            tipo: "entrada",
          },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
        // Saídas (custos): compras pagas por dia
        Entrada.findAll({
          attributes: [
            ["dataPagamento", "dia"],
            [fn("SUM", col("valorTotal")), "total"],
          ],
          where: {
            dataPagamento: { [Op.between]: [dataIni, dataFim] },
            situacao: "pago",
          },
          group: ["dataPagamento"],
          raw: true,
        }),
        // Despesas: movimentos de caixa (saída)
        MovimentoCaixa.findAll({
          attributes: [
            [fn("DATE", col("data")), "dia"],
            [fn("SUM", col("valor")), "total"],
          ],
          where: { data: { [Op.between]: [dataIni, dataFim] }, tipo: "saida" },
          group: [fn("DATE", col("data"))],
          raw: true,
        }),
      ]);

    // Calcular saldo inicial (acumulado ANTES do primeiro dia do período)
    const dataAntesDoPeriodo = new Date(dataIni);
    dataAntesDoPeriodo.setDate(dataAntesDoPeriodo.getDate() - 1);
    const entAntes = await somaEntradas(new Date(0), dataAntesDoPeriodo);
    const saiAntes = await somaSaidas(new Date(0), dataAntesDoPeriodo);
    const saldoBase = entAntes - saiAntes;

    const idx = (arr) =>
      arr.reduce((m, r) => {
        const key = r.dia ? String(r.dia).slice(0, 10) : null;
        if (key) m[key] = toNum(r.total);
        return m;
      }, {});

    const iV = idx(vendasDia),
      iA = idx(agendDia),
      iME = idx(movEntDia);
    const iC = idx(comprasDia),
      iMS = idx(movSaiDia);

    // Construir linhas da tabela
    const linhas = {
      saldoInicial: [],
      receitasOperacionais: [],
      receitasFinanceiras: [], // sem fonte específica separada por ora (retorna zeros)
      outrasEntradas: [],
      entradas: [],
      custosOperacionais: [],
      despesasOperacionais: [],
      investimentos: [], // ainda sem fonte específica
      outrasSaidas: [],
      saidas: [],
      saldoPeriodo: [],
      saldoFinal: [],
    };

    let saldoAcum = saldoBase;

    for (const col of colunas) {
      const d = col.dataStr;

      const recOper = (iV[d] || 0) + (iA[d] || 0);
      const recFinanc = 0; // Receitas financeiras – extensívell no futuro
      const outrasEnt = iME[d] || 0;
      const totalEnt = recOper + recFinanc + outrasEnt;

      const custos = iC[d] || 0;
      const despesas = iMS[d] || 0;
      const invest = 0; // Investimentos – extensível no futuro
      const outrasSai = 0;
      const totalSai = custos + despesas + invest + outrasSai;

      const saldoPeriodo = totalEnt - totalSai;
      const saldoFinal = saldoAcum + saldoPeriodo;

      linhas.saldoInicial.push(parseFloat(saldoAcum.toFixed(2)));
      linhas.receitasOperacionais.push(parseFloat(recOper.toFixed(2)));
      linhas.receitasFinanceiras.push(0);
      linhas.outrasEntradas.push(parseFloat(outrasEnt.toFixed(2)));
      linhas.entradas.push(parseFloat(totalEnt.toFixed(2)));
      linhas.custosOperacionais.push(parseFloat(custos.toFixed(2)));
      linhas.despesasOperacionais.push(parseFloat(despesas.toFixed(2)));
      linhas.investimentos.push(0);
      linhas.outrasSaidas.push(0);
      linhas.saidas.push(parseFloat(totalSai.toFixed(2)));
      linhas.saldoPeriodo.push(parseFloat(saldoPeriodo.toFixed(2)));
      linhas.saldoFinal.push(parseFloat(saldoFinal.toFixed(2)));

      saldoAcum = saldoFinal;
    }

    return res.json({ colunas, linhas });
  } catch (err) {
    console.error("[painel-financeiro/fluxo-caixa] Erro:", err.message);
    return res.status(500).json({ error: "Erro ao buscar fluxo de caixa" });
  }
});

module.exports = router;
