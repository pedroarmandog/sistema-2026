const { Usuario, Empresa } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Login de usuário
exports.login = async (req, res) => {
    try {
        const { usuario, senha } = req.body;
        
        console.log('🔐 Tentativa de login:', usuario);
        console.log('📦 Dados recebidos:', { usuario, senha: senha ? '***' : 'vazio' });
        
        // Validar dados
        if (!usuario || !senha) {
            console.log('⚠️  Dados incompletos na tentativa de login');
            return res.status(400).json({ mensagem: 'Usuário/Email e senha são obrigatórios' });
        }
        
        // Verificar se é um email (contém @)
        const isEmail = usuario.includes('@');
        
        let usuarioEncontrado = null;
        let loginViaEmpresa = false;
        
        if (isEmail) {
            // Buscar empresa pelo email
            console.log('🏢 Tentando login via email da empresa:', usuario);
            const empresa = await Empresa.findOne({
                where: { email: usuario }
            });
            
            if (empresa) {
                console.log('✅ Empresa encontrada:', empresa.nome);
                // Buscar qualquer usuário ativo
                usuarioEncontrado = await Usuario.findOne({
                    where: { ativo: true },
                    order: [['id', 'ASC']]
                });
                
                if (usuarioEncontrado) {
                    loginViaEmpresa = true;
                    console.log('✅ Usando primeiro usuário ativo:', usuarioEncontrado.nome);
                }
            } else {
                console.log('⚠️  Empresa não encontrada com email:', usuario);
            }
        } else {
            // Buscar usuário pelo nome de usuário
            console.log('👤 Tentando login via nome de usuário:', usuario);
            usuarioEncontrado = await Usuario.findOne({
                where: { usuario: usuario }
            });
        }
        
        if (!usuarioEncontrado) {
            console.log('⚠️  Usuário/Email não encontrado:', usuario);
            return res.status(401).json({ mensagem: 'Usuário/Email ou senha inválidos' });
        }
        
        // Verificar se usuário está ativo
        if (!usuarioEncontrado.ativo) {
            console.log('⚠️  Usuário inativo:', usuarioEncontrado.usuario);
            return res.status(401).json({ mensagem: 'Usuário inativo. Entre em contato com o administrador.' });
        }
        
        // Verificar senha
        let senhaValida = false;
        
        console.log('🔍 Verificando senha para usuário:', usuarioEncontrado.usuario);
        console.log('🔍 Hash armazenado no banco:', usuarioEncontrado.senha ? usuarioEncontrado.senha.substring(0, 20) + '...' : 'VAZIO');
        
        // Comparar senha com hash do banco
        try {
            senhaValida = await bcrypt.compare(senha, usuarioEncontrado.senha);
            console.log('🔑 Comparação de senha hash:', senhaValida);
        } catch (bcryptError) {
            console.error('❌ Erro ao comparar senha:', bcryptError);
            senhaValida = false;
        }
        
        if (!senhaValida) {
            console.log('⚠️  Senha inválida');
            return res.status(401).json({ mensagem: 'Usuário/Email ou senha inválidos' });
        }
        
        console.log('✅ Login bem-sucedido para usuário:', usuarioEncontrado.nome);
        
        // Remover senha antes de retornar
        const usuarioData = usuarioEncontrado.toJSON();
        delete usuarioData.senha;
        
        console.log('📤 Enviando resposta:', { id: usuarioData.id, nome: usuarioData.nome });
        
        return res.status(200).json(usuarioData);
        
    } catch (error) {
        console.error('❌ Erro ao fazer login:', error);
        console.error('Stack trace:', error.stack);
        return res.status(500).json({ mensagem: 'Erro ao fazer login', erro: error.message });
    }
};

// Listar todos os usuários
exports.listarUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            order: [['nome', 'ASC']],
            attributes: { exclude: ['senha'] } // Não retornar senha na listagem
        });
        res.json(usuarios);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ erro: 'Erro ao listar usuários' });
    }
};

// Buscar usuário por ID
exports.buscarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        // Remover senha antes de retornar
        const usuarioData = usuario.toJSON();
        delete usuarioData.senha;
        
        res.json(usuarioData);
    } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        res.status(500).json({ erro: 'Erro ao buscar usuário' });
    }
};

// Criar usuário
exports.criarUsuario = async (req, res) => {
    try {
        const dados = req.body;
        
        console.log('📝 Dados recebidos para criar usuário:', JSON.stringify(dados, null, 2));
        
        // Verificar se usuário já existe
        const usuarioExistente = await Usuario.findOne({
            where: { usuario: dados.usuario }
        });
        
        if (usuarioExistente) {
            console.log('⚠️  Usuário já existe:', dados.usuario);
            return res.status(400).json({ erro: 'Nome de usuário já existe' });
        }
        
        // Criar usuário
        console.log('➕ Criando novo usuário...');
        const novoUsuario = await Usuario.create(dados);
        console.log('✅ Usuário criado com sucesso:', novoUsuario.id);
        
        // Remover senha antes de retornar
        const usuarioData = novoUsuario.toJSON();
        delete usuarioData.senha;
        
        res.status(201).json(usuarioData);
    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        console.error('Stack trace:', error.stack);
        console.error('Mensagem de erro:', error.message);
        if (error.errors) {
            console.error('Erros de validação:', error.errors.map(e => ({ field: e.path, message: e.message })));
        }
        res.status(500).json({ 
            erro: 'Erro ao criar usuário',
            detalhes: error.message,
            validacao: error.errors ? error.errors.map(e => ({ field: e.path, message: e.message })) : null
        });
    }
};

// Atualizar usuário
exports.atualizarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        const dados = req.body;
        
        console.log('📦 Dados recebidos para atualização:', { ...dados, senha: dados.senha ? '***' : 'não fornecida' });
        
        // A senha será criptografada automaticamente pelo hook beforeUpdate do model
        // Se não foi fornecida senha, remover do objeto para não atualizar
        if (!dados.senha || !dados.senha.trim()) {
            console.log('⚠️ Nenhuma senha fornecida, mantendo senha atual');
            delete dados.senha;
        } else {
            console.log('🔐 Nova senha será criptografada pelo model hook');
        }
        
        // Se o nome de usuário mudou, verificar se não existe outro com o mesmo nome
        if (dados.usuario && dados.usuario !== usuario.usuario) {
            const usuarioExistente = await Usuario.findOne({
                where: { 
                    usuario: dados.usuario,
                    id: { [Op.ne]: req.params.id }
                }
            });
            
            if (usuarioExistente) {
                return res.status(400).json({ erro: 'Nome de usuário já existe' });
            }
        }
        
        // Atualizar usuário
        await usuario.update(dados);
        
        // Remover senha antes de retornar
        const usuarioData = usuario.toJSON();
        delete usuarioData.senha;
        
        res.json(usuarioData);
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        res.status(500).json({ erro: 'Erro ao atualizar usuário' });
    }
};

// Deletar usuário
exports.deletarUsuario = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id);
        
        if (!usuario) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        await usuario.destroy();
        res.json({ mensagem: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ erro: 'Erro ao deletar usuário' });
    }
};

// Validar senha do usuário
exports.validarSenha = async (req, res) => {
    try {
        const { usuarioId, senha } = req.body;
        
        console.log('🔐 Validando senha para usuário ID:', usuarioId);
        
        if (!usuarioId || !senha) {
            return res.status(400).json({ erro: 'ID do usuário e senha são obrigatórios', valida: false });
        }
        
        const usuario = await Usuario.findByPk(usuarioId);
        
        if (!usuario) {
            console.log('⚠️  Usuário não encontrado:', usuarioId);
            return res.status(404).json({ erro: 'Usuário não encontrado', valida: false });
        }
        
        // Comparar senha
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        
        console.log('🔑 Senha válida:', senhaValida);
        
        return res.status(200).json({ valida: senhaValida });
        
    } catch (error) {
        console.error('❌ Erro ao validar senha:', error);
        return res.status(500).json({ erro: 'Erro ao validar senha', valida: false });
    }
};
