const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authUser } = require("../middleware/authUser");
const rateLimit = require("../middleware/rateLimit");

// Todas as rotas do dashboard requerem autenticação
router.use(authUser);
// NOTE: removido rateLimit global do dashboard para evitar 429 quando o frontend faz múltiplas chamadas paralelas.
// Aplicar rate limiting apenas em rotas críticas (ex: login) ou em endpoints específicos quando necessário.

// Rota para produtos com estoque baixo
router.get("/produtos-estoque-baixo", dashboardController.produtosEstoqueBaixo);

// Rota consolidada: resumo do dashboard (clientes, agendamentos, vendas, ticket)
router.get("/resumo", dashboardController.resumo);

// Rota para aniversariantes (pets e clientes)
router.get("/aniversariantes", dashboardController.aniversariantes);

// Rota para oportunidades de venda
router.get("/oportunidades-venda", dashboardController.oportunidadesVenda);

// Rota para Taxi Dog do dia
router.get("/leva-traz", dashboardController.levaTraz);

// Rota para produtos próximos do vencimento
router.get("/produtos-vencimento", dashboardController.produtosVencimento);

// Rota para contagem de vendas realizadas hoje
router.get("/vendas-hoje", dashboardController.vendasHoje);

// Rota para ticket médio das vendas (dia)
router.get("/ticket-medio", dashboardController.ticketMedio);

// Rota para periódicos (serviços a renovar nos próximos 7 dias)
router.get("/periodicos", dashboardController.periodicos);

// Rota para contas a pagar vencendo hoje
router.get("/contas-a-pagar-hoje", dashboardController.contasAPagarHoje);

// Rota para indicadores do atendimento (agendados, checkin, prontos)
router.get(
  "/indicadores-atendimento",
  dashboardController.indicadoresAtendimento,
);

module.exports = router;
