const express = require('express')
const router = express.Router()
const petController = require('../controllers/petController')
const multer = require('multer')

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
})

const upload = multer({ storage })

// Rotas para pets
router.post('/', petController.createPet) // Criar pet
router.get('/', petController.getAllPets) // Listar todos os pets
router.get('/:id', petController.getPetById) // Buscar pet por ID
router.put('/:id', petController.updatePet) // Atualizar pet
router.delete('/:id', petController.deletePet) // Excluir pet

module.exports = router