const express = require('express');
const router = express.Router();
const controller = require('../controllers/fornecedorController');

router.get('/', controller.getAllFornecedores);
router.get('/:id', controller.getFornecedorById);
router.post('/', controller.createFornecedor);
router.put('/:id', controller.updateFornecedor);
router.delete('/:id', controller.deleteFornecedor);

module.exports = router;
