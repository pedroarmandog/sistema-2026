const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authUser } = require("../middleware/authUser");

// Todas as rotas do dashboard requerem autenticação
router.use(authUser);

// Rota para produtos com estoque baixo
router.get("/produtos-estoque-baixo", dashboardController.produtosEstoqueBaixo);

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

module.exports = router;
