const { Comissao } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const comissoes = await Comissao.findAll({
            order: [['perfilProduto', 'ASC'], ['perfilVendedor', 'ASC']]
        });
        res.json(comissoes);
    } catch (error) {
        console.error('Erro ao buscar comissões:', error);
        res.status(500).json({ error: 'Erro ao buscar comissões' });
    }
};

exports.getById = async (req, res) => {
    try {
        const comissao = await Comissao.findByPk(req.params.id);
        if (!comissao) {
            return res.status(404).json({ error: 'Comissão não encontrada' });
        }
        res.json(comissao);
    } catch (error) {
        console.error('Erro ao buscar comissão:', error);
        res.status(500).json({ error: 'Erro ao buscar comissão' });
    }
};

exports.create = async (req, res) => {
    try {
        const comissao = await Comissao.create(req.body);
        res.status(201).json(comissao);
    } catch (error) {
        console.error('Erro ao criar comissão:', error);
        res.status(500).json({ error: 'Erro ao criar comissão' });
    }
};

exports.update = async (req, res) => {
    try {
        const comissao = await Comissao.findByPk(req.params.id);
        if (!comissao) {
            return res.status(404).json({ error: 'Comissão não encontrada' });
        }
        await comissao.update(req.body);
        res.json(comissao);
    } catch (error) {
        console.error('Erro ao atualizar comissão:', error);
        res.status(500).json({ error: 'Erro ao atualizar comissão' });
    }
};

exports.delete = async (req, res) => {
    try {
        const comissao = await Comissao.findByPk(req.params.id);
        if (!comissao) {
            return res.status(404).json({ error: 'Comissão não encontrada' });
        }
        await comissao.destroy();
        res.json({ message: 'Comissão deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar comissão:', error);
        res.status(500).json({ error: 'Erro ao deletar comissão' });
    }
};
