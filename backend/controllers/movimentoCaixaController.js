const { MovimentoCaixa } = require('../models/MovimentoCaixa');
const { Op } = require('sequelize');

// Listar todos os movimentos
exports.listarMovimentos = async (req, res) => {
    try {
        const movimentos = await MovimentoCaixa.findAll({
            order: [['data', 'DESC']]
        });
        res.json(movimentos);
    } catch (error) {
        console.error('Erro ao listar movimentos:', error);
        res.status(500).json({ erro: 'Erro ao listar movimentos' });
    }
};

// Buscar movimento por ID
exports.buscarMovimento = async (req, res) => {
    try {
        const movimento = await MovimentoCaixa.findByPk(req.params.id);
        if (!movimento) {
            return res.status(404).json({ erro: 'Movimento não encontrado' });
        }
        res.json(movimento);
    } catch (error) {
        console.error('Erro ao buscar movimento:', error);
        res.status(500).json({ erro: 'Erro ao buscar movimento' });
    }
};

// Criar movimento
exports.criarMovimento = async (req, res) => {
    try {
        const movimento = await MovimentoCaixa.create(req.body);
        res.status(201).json(movimento);
    } catch (error) {
        console.error('Erro ao criar movimento:', error);
        res.status(500).json({ erro: 'Erro ao criar movimento' });
    }
};

// Atualizar movimento
exports.atualizarMovimento = async (req, res) => {
    try {
        const movimento = await MovimentoCaixa.findByPk(req.params.id);
        if (!movimento) {
            return res.status(404).json({ erro: 'Movimento não encontrado' });
        }
        await movimento.update(req.body);
        res.json(movimento);
    } catch (error) {
        console.error('Erro ao atualizar movimento:', error);
        res.status(500).json({ erro: 'Erro ao atualizar movimento' });
    }
};

// Deletar movimento
exports.deletarMovimento = async (req, res) => {
    try {
        const movimento = await MovimentoCaixa.findByPk(req.params.id);
        if (!movimento) {
            return res.status(404).json({ erro: 'Movimento não encontrado' });
        }
        await movimento.destroy();
        res.json({ mensagem: 'Movimento deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar movimento:', error);
        res.status(500).json({ erro: 'Erro ao deletar movimento' });
    }
};
