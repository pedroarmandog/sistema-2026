/**
 * Routes: Produto Lembrete Recorrente
 * ------------------------------------
 * Endpoints para gerenciar lembretes automáticos de produtos recorrentes.
 * Montado em: /api/produto-lembrete
 */

const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const controller = require("../controllers/produtoLembreteController");

// Aplicar autenticação em todas as rotas
router.use(authUser);

// ── Config por cliente (GET/POST separado do form de cliente) ──
router.get("/config-cliente/:clienteId", controller.getConfigCliente);
router.post("/config-cliente/:clienteId", controller.saveConfigCliente);

// Listar todos os lembretes da empresa
router.get("/", controller.listarLembretes);

// Estatísticas para o painel de marketing
router.get("/estatisticas", controller.estatisticas);

// Listar lembretes de um cliente específico
router.get("/cliente/:clienteId", controller.listarPorCliente);

// Criar ou atualizar lembrete
router.post("/", controller.criarOuAtualizar);

// Atualizar status (ativar/pausar)
router.patch("/:id", controller.atualizarStatus);

// Desativar/cancelar lembrete
router.delete("/:id", controller.desativar);

module.exports = router;
