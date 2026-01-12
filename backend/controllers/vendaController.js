const { Venda } = require('../models/Venda');
const { Op } = require('sequelize');

// Listar todas as vendas
exports.listarVendas = async (req, res) => {
    try {
        const { caixaId, dataInicio, dataFim } = req.query;
        
        // Construir filtros dinâmicos
        const where = {};
        
        // Filtro por data
        if (dataInicio && dataFim) {
            where.data = {
                [Op.between]: [
                    new Date(dataInicio + ' 00:00:00'),
                    new Date(dataFim + ' 23:59:59')
                ]
            };
        }
        
        const vendas = await Venda.findAll({
            where,
            order: [['data', 'DESC']]
        });
        
        res.json({ vendas });
    } catch (error) {
        console.error('Erro ao listar vendas:', error);
        res.status(500).json({ erro: 'Erro ao listar vendas' });
    }
};

// Buscar venda por ID
exports.buscarVenda = async (req, res) => {
    try {
        const venda = await Venda.findByPk(req.params.id);
        if (!venda) {
            return res.status(404).json({ erro: 'Venda não encontrada' });
        }
        res.json(venda);
    } catch (error) {
        console.error('Erro ao buscar venda:', error);
        res.status(500).json({ erro: 'Erro ao buscar venda' });
    }
};

// Criar venda
exports.criarVenda = async (req, res) => {
    try {
        const venda = await Venda.create(req.body);
        res.status(201).json(venda);
    } catch (error) {
        console.error('Erro ao criar venda:', error);
        res.status(500).json({ erro: 'Erro ao criar venda' });
    }
};

// Atualizar venda
exports.atualizarVenda = async (req, res) => {
    try {
        const venda = await Venda.findByPk(req.params.id);
        if (!venda) {
            return res.status(404).json({ erro: 'Venda não encontrada' });
        }
        await venda.update(req.body);
        res.json(venda);
    } catch (error) {
        console.error('Erro ao atualizar venda:', error);
        res.status(500).json({ erro: 'Erro ao atualizar venda' });
    }
};

// Deletar venda
exports.deletarVenda = async (req, res) => {
    try {
        const venda = await Venda.findByPk(req.params.id);
        if (!venda) {
            return res.status(404).json({ erro: 'Venda não encontrada' });
        }
        await venda.destroy();
        res.json({ mensagem: 'Venda deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar venda:', error);
        res.status(500).json({ erro: 'Erro ao deletar venda' });
    }
};
