const { Caixa } = require('../models/Caixa');
const { Op } = require('sequelize');

// Listar todos os caixas
exports.listarCaixas = async (req, res) => {
    try {
        const caixas = await Caixa.findAll({
            order: [['dataAbertura', 'DESC']]
        });
        res.json(caixas);
    } catch (error) {
        console.error('Erro ao listar caixas:', error);
        res.status(500).json({ erro: 'Erro ao listar caixas' });
    }
};

// Buscar caixa por ID
exports.buscarCaixa = async (req, res) => {
    try {
        const caixa = await Caixa.findByPk(req.params.id);
        if (!caixa) {
            return res.status(404).json({ erro: 'Caixa não encontrado' });
        }
        res.json(caixa);
    } catch (error) {
        console.error('Erro ao buscar caixa:', error);
        res.status(500).json({ erro: 'Erro ao buscar caixa' });
    }
};

// Buscar status do caixa aberto
exports.buscarCaixaAberto = async (req, res) => {
    try {
        const caixa = await Caixa.findOne({
            where: { aberto: true },
            order: [['dataAbertura', 'DESC']]
        });
        res.json(caixa || { aberto: false });
    } catch (error) {
        console.error('Erro ao buscar caixa aberto:', error);
        res.status(500).json({ erro: 'Erro ao buscar caixa aberto' });
    }
};

// Abrir caixa
exports.abrirCaixa = async (req, res) => {
    try {
        // Verificar se já existe caixa aberto
        const caixaAberto = await Caixa.findOne({ where: { aberto: true } });
        if (caixaAberto) {
            return res.status(400).json({ erro: 'Já existe um caixa aberto' });
        }

        const caixa = await Caixa.create({
            ...req.body,
            aberto: true,
            dataAbertura: new Date()
        });
        res.status(201).json(caixa);
    } catch (error) {
        console.error('Erro ao abrir caixa:', error);
        res.status(500).json({ erro: 'Erro ao abrir caixa' });
    }
};

// Fechar caixa
exports.fecharCaixa = async (req, res) => {
    try {
        const caixa = await Caixa.findByPk(req.params.id);
        if (!caixa) {
            return res.status(404).json({ erro: 'Caixa não encontrado' });
        }
        await caixa.update({
            aberto: false,
            dataFechamento: new Date(),
            saldoFinal: req.body.saldoFinal
        });
        res.json(caixa);
    } catch (error) {
        console.error('Erro ao fechar caixa:', error);
        res.status(500).json({ erro: 'Erro ao fechar caixa' });
    }
};

// Buscar caixa por número
exports.buscarCaixaPorNumero = async (req, res) => {
    try {
        const numero = req.params.numero; // Recebe como string (ex: "Caixa 01" ou "01")
        
        // Buscar com o valor exato ou formatado
        let caixa = await Caixa.findOne({
            where: { numero },
            order: [['dataAbertura', 'DESC']]
        });
        
        // Se não encontrou, tentar com "Caixa XX"
        if (!caixa && !numero.includes('Caixa')) {
            caixa = await Caixa.findOne({
                where: { numero: `Caixa ${numero}` },
                order: [['dataAbertura', 'DESC']]
            });
        }
        
        if (!caixa) {
            return res.status(404).json({ erro: 'Caixa não encontrado' });
        }
        
        res.json({ caixa });
    } catch (error) {
        console.error('Erro ao buscar caixa por número:', error);
        res.status(500).json({ erro: 'Erro ao buscar caixa por número' });
    }
};
