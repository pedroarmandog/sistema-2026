const { Admin } = require("../models");
const { gerarToken, CADASTRO_TOKEN } = require("../middleware/authAdmin");

// POST /api/admin/login
async function login(req, res) {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    if (!admin.ativo) {
      return res.status(403).json({ error: "Conta desativada" });
    }

    const senhaValida = await admin.validarSenha(senha);
    if (!senhaValida) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = gerarToken(admin);
    const adminData = admin.toJSON();
    delete adminData.senha;

    return res.json({ token, admin: adminData });
  } catch (err) {
    console.error("[admin/login] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/cadastro — requer token de cadastro
async function cadastro(req, res) {
  try {
    const { nome, sobrenome, cpf, telefone, email, senha } = req.body;

    // Validações
    if (!nome || !sobrenome || !cpf || !telefone || !email || !senha) {
      return res
        .status(400)
        .json({ error: "Todos os campos são obrigatórios" });
    }

    if (senha.length < 6) {
      return res
        .status(400)
        .json({ error: "A senha deve ter pelo menos 6 caracteres" });
    }

    // CPF simples — só dígitos
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) {
      return res.status(400).json({ error: "CPF inválido" });
    }

    // Verificar duplicatas
    const existente = await Admin.findOne({ where: { email } });
    if (existente) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    const cpfExistente = await Admin.findOne({ where: { cpf: cpfLimpo } });
    if (cpfExistente) {
      return res.status(409).json({ error: "CPF já cadastrado" });
    }

    const admin = await Admin.create({
      nome,
      sobrenome,
      cpf: cpfLimpo,
      telefone,
      email,
      senha,
    });

    const adminData = admin.toJSON();
    delete adminData.senha;

    return res
      .status(201)
      .json({ message: "Admin cadastrado com sucesso", admin: adminData });
  } catch (err) {
    console.error("[admin/cadastro] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/perfil — dados do admin logado
async function perfil(req, res) {
  try {
    const admin = await Admin.findByPk(req.adminId, {
      attributes: { exclude: ["senha"] },
    });
    if (!admin) {
      return res.status(404).json({ error: "Admin não encontrado" });
    }
    return res.json(admin);
  } catch (err) {
    console.error("[admin/perfil] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/cadastro-token — verifica se o token de cadastro é válido
async function verificarTokenCadastro(req, res) {
  const { token } = req.query;
  if (token === CADASTRO_TOKEN) {
    return res.json({ valido: true });
  }
  return res.status(403).json({ valido: false, error: "Token inválido" });
}

module.exports = { login, cadastro, perfil, verificarTokenCadastro };
