const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresaController');

// Rotas de empresas
router.get('/', empresaController.listarEmpresas);
router.get('/:id', empresaController.buscarEmpresa);
router.post('/', empresaController.criarEmpresa);
router.put('/:id', empresaController.atualizarEmpresa);
router.delete('/:id', empresaController.deletarEmpresa);

module.exports = router;
