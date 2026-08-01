"use strict";

const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/authUser");
const {
  getConfiguracao,
  salvarConfiguracao,
  listarProvedores,
} = require("../controllers/configuracaoFiscalController");

/**
 * Rotas: /api/fiscal
 *
 * Gerencia configuração fiscal e operações de apoio à Central Fiscal.
 * Todas as rotas exigem autenticação (authUser).
 */

router.use(authUser);

// Configuração fiscal da empresa
router.get("/configuracao", getConfiguracao);
router.post("/configuracao", salvarConfiguracao);

// Provedores disponíveis
router.get("/provedores", listarProvedores);

module.exports = router;
