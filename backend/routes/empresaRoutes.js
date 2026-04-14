const express = require("express");
const router = express.Router();
const empresaController = require("../controllers/empresaController");
const { authUser } = require("../middleware/authUser");

// Rotas de empresas (protegidas - cada usuário vê apenas sua empresa)
router.get("/", authUser, empresaController.listarEmpresas);
router.get("/:id", authUser, empresaController.buscarEmpresa);
// Debug route: retorna info do token e do registro de usuário (temporário)
router.get("/whoami", authUser, empresaController.whoami);
router.post("/", authUser, empresaController.criarEmpresa);
router.put("/:id", authUser, empresaController.atualizarEmpresa);
router.delete("/:id", authUser, empresaController.deletarEmpresa);

module.exports = router;
