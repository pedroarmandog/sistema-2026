const express = require('express');
const router = express.Router();
const profissionalController = require('../controllers/profissionalController');

router.get('/', profissionalController.listarProfissionais);
router.get('/:id', profissionalController.buscarProfissional);
router.post('/', profissionalController.criarProfissional);
router.put('/:id', profissionalController.atualizarProfissional);
router.delete('/:id', profissionalController.deletarProfissional);

module.exports = router;
