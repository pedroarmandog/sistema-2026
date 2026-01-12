const express = require('express');
const router = express.Router();
const vendaController = require('../controllers/vendaController');

router.get('/', vendaController.listarVendas);
router.get('/:id', vendaController.buscarVenda);
router.post('/', vendaController.criarVenda);
router.put('/:id', vendaController.atualizarVenda);
router.delete('/:id', vendaController.deletarVenda);

module.exports = router;
