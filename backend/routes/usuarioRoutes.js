const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuarioController');

// Rota de login
router.post('/login', usuarioController.login);

// Rota de validação de senha
router.post('/validar-senha', usuarioController.validarSenha);

// Rotas de usuários
router.get('/', usuarioController.listarUsuarios);
router.get('/:id', usuarioController.buscarUsuario);
router.post('/', usuarioController.criarUsuario);
router.put('/:id', usuarioController.atualizarUsuario);
router.delete('/:id', usuarioController.deletarUsuario);

module.exports = router;
