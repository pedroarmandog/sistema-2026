const { Empresa } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Listar todas as empresas
exports.listarEmpresas = async (req, res) => {
    try {
        const empresas = await Empresa.findAll({
            order: [['nome', 'ASC']]
        });
        res.json(empresas);
    } catch (error) {
        console.error('Erro ao listar empresas:', error);
        res.status(500).json({ erro: 'Erro ao listar empresas' });
    }
};

// Buscar empresa por ID
exports.buscarEmpresa = async (req, res) => {
    try {
        const empresa = await Empresa.findByPk(req.params.id);
        if (!empresa) {
            return res.status(404).json({ erro: 'Empresa não encontrada' });
        }
        res.json(empresa);
    } catch (error) {
        console.error('Erro ao buscar empresa:', error);
        res.status(500).json({ erro: 'Erro ao buscar empresa' });
    }
};

// Criar empresa
exports.criarEmpresa = async (req, res) => {
    try {
        const dados = req.body;
        
        // Se veio logo em base64, salvar como arquivo
        if (dados.logo && dados.logo.startsWith('data:image')) {
            const base64Data = dados.logo.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const fileName = `empresa_${timestamp}.png`;
            const uploadPath = path.join(__dirname, '../../uploads', fileName);
            
            // Criar diretório uploads se não existir
            const uploadsDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Salvar arquivo
            fs.writeFileSync(uploadPath, buffer);
            
            // Substituir base64 pelo nome do arquivo
            dados.logo = fileName;
        }
        
        const empresa = await Empresa.create(dados);
        res.status(201).json(empresa);
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ erro: 'Erro ao criar empresa' });
    }
};

// Atualizar empresa
exports.atualizarEmpresa = async (req, res) => {
    try {
        const empresa = await Empresa.findByPk(req.params.id);
        if (!empresa) {
            return res.status(404).json({ erro: 'Empresa não encontrada' });
        }
        
        const dados = req.body;
        
        // Se veio logo em base64, salvar como arquivo
        if (dados.logo && dados.logo.startsWith('data:image')) {
            const base64Data = dados.logo.replace(/^data:image\/\w+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            
            // Gerar nome único para o arquivo
            const timestamp = Date.now();
            const fileName = `empresa_${timestamp}.png`;
            const uploadPath = path.join(__dirname, '../../uploads', fileName);
            
            // Criar diretório uploads se não existir
            const uploadsDir = path.join(__dirname, '../../uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            // Deletar logo antiga se existir
            if (empresa.logo && empresa.logo !== '') {
                const oldPath = path.join(__dirname, '../../uploads', empresa.logo);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            }
            
            // Salvar novo arquivo
            fs.writeFileSync(uploadPath, buffer);
            
            // Substituir base64 pelo nome do arquivo
            dados.logo = fileName;
        }
        
        await empresa.update(dados);
        res.json(empresa);
    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        res.status(500).json({ erro: 'Erro ao atualizar empresa' });
    }
};

// Deletar empresa
exports.deletarEmpresa = async (req, res) => {
    try {
        const empresa = await Empresa.findByPk(req.params.id);
        if (!empresa) {
            return res.status(404).json({ erro: 'Empresa não encontrada' });
        }
        
        // Deletar logo se existir
        if (empresa.logo && empresa.logo !== '') {
            const logoPath = path.join(__dirname, '../../uploads', empresa.logo);
            if (fs.existsSync(logoPath)) {
                fs.unlinkSync(logoPath);
            }
        }
        
        await empresa.destroy();
        res.json({ mensagem: 'Empresa deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar empresa:', error);
        res.status(500).json({ erro: 'Erro ao deletar empresa' });
    }
};
