const jwt = require("jsonwebtoken");

// Chave secreta para JWT — em produção usar variável de ambiente
const JWT_SECRET = process.env.JWT_SECRET || "pethub_admin_secret_2026_!@#$%";
const JWT_EXPIRES_IN = "24h";

// Token fixo para acesso à página de cadastro de admin
const CADASTRO_TOKEN =
  process.env.CADASTRO_TOKEN || "pethub-cadastro-admin-2026";

// Middleware de autenticação para rotas do painel admin
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.adminId = decoded.id;
    req.adminEmail = decoded.email;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// Middleware para validar token de cadastro
function validarTokenCadastro(req, res, next) {
  const token = req.query.token || req.body.token;
  if (!token || token !== CADASTRO_TOKEN) {
    return res
      .status(403)
      .json({ error: "Acesso negado. Token de cadastro inválido." });
  }
  next();
}

// Gerar token JWT
function gerarToken(admin) {
  return jwt.sign(
    { id: admin.id, email: admin.email, nome: admin.nome },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

module.exports = {
  authAdmin,
  validarTokenCadastro,
  gerarToken,
  JWT_SECRET,
  CADASTRO_TOKEN,
};
