const express = require('express')
const router = express.Router()
const clienteController = require('../controllers/clienteController')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
})

const upload = multer({ storage })

// Rotas para clientes
router.post('/', upload.single('imagem_perfil'), clienteController.createCliente)
router.get('/', clienteController.getAllClientes)
router.get('/:id', clienteController.getClienteById)
router.put('/:id', upload.single('imagem_perfil'), clienteController.updateCliente)
router.delete('/:id', clienteController.deleteCliente)

module.exports = router