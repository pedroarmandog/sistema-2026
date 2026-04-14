const jwt = require("jsonwebtoken");

const JWT_SECRET =
  process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
const JWT_EXPIRES_IN = "8h";

/**
 * Verifica se a empresa do usuário está BLOQUEADA na tabela empresas_painel.
 * Retorna true se bloqueada, false caso contrário.
 */
async function isEmpresaBloqueada(empresaId) {
  if (!empresaId) return false;
  try {
    const { Empresa, EmpresaPainel } = require("../models");
    const empresa = await Empresa.findByPk(empresaId, { attributes: ["cnpj"] });
    if (!empresa || !empresa.cnpj) return false;
    const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
    if (!cnpjLimpo) return false;
    const painel = await EmpresaPainel.findOne({
      where: { cnpj: cnpjLimpo },
      attributes: ["status"],
    });
    return painel && painel.status === "BLOQUEADO";
  } catch (e) {
    console.warn("[authUser] Erro ao verificar bloqueio:", e && e.message);
    return false;
  }
}

/**
 * Normaliza o campo `empresas` do usuário para retornar apenas o ID numérico.
 * Aceita dois formatos:
 *   - Array de números:  [3]
 *   - Array de objetos:  [{ id: "1", nome: "..." }]  (formato legado)
 */
function extractEmpresaId(empresas) {
  if (!Array.isArray(empresas) || empresas.length === 0) return null;
  const first = empresas[0];
  if (typeof first === "number") return first;
  if (typeof first === "string") return parseInt(first, 10) || null;
  if (typeof first === "object" && first !== null) {
    const raw = first.id !== undefined ? first.id : first.empresaId;
    return raw != null ? parseInt(raw, 10) || null : null;
  }
  return null;
}

/**
 * Middleware de autenticação para rotas de usuário (multi-tenant).
 * Lê o token JWT do cookie `pethub_token` ou do header Authorization.
 * Fallback: usa o cookie legado `usuarioLogadoId` consultando o banco.
 * Popula req.user = { id, empresaId, grupoUsuario }
 */
async function authUser(req, res, next) {
  // 1. Tentar JWT (novo fluxo)
  const tokenFromCookie = req.cookies?.pethub_token;
  const tokenFromHeader =
    req.headers &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
  const token = tokenFromCookie || tokenFromHeader;
  const tokenSource = tokenFromCookie
    ? "cookie:pethub_token"
    : tokenFromHeader
      ? "header:Authorization"
      : null;

  if (token) {
    console.log(
      `[authUser] token encontrado via ${tokenSource} (len=${String(token).length})`,
    );
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(
        `[authUser] token decodificado: id=${decoded.id} empresaId=${decoded.empresaId} grupoUsuario=${decoded.grupoUsuario}`,
      );
      // Verificar se empresa está bloqueada
      if (await isEmpresaBloqueada(decoded.empresaId)) {
        console.log(`[authUser] empresa ${decoded.empresaId} bloqueada`);
        return res.status(403).json({
          mensagem: "Sistema bloqueado. Entre em contato com o suporte.",
          bloqueado: true,
        });
      }
      req.user = {
        id: decoded.id,
        empresaId: decoded.empresaId,
        grupoUsuario: decoded.grupoUsuario,
      };
      return next();
    } catch (err) {
      console.log(`[authUser] falha ao verificar token: ${err && err.message}`);
      // token inválido/expirado — continua para fallback
    }
  } else {
    console.log(
      "[authUser] nenhum token JWT encontrado, tentando fallback usuarioLogadoId",
    );
  }

  // 2. Fallback: cookie legado usuarioLogadoId (sessão anterior ao JWT)
  const usuarioLegadoId = req.cookies?.usuarioLogadoId;
  if (usuarioLegadoId) {
    console.log(
      `[authUser] cookie usuarioLogadoId presente: ${usuarioLegadoId}`,
    );
    try {
      const { Usuario } = require("../models");
      const usuario = await Usuario.findByPk(parseInt(usuarioLegadoId), {
        attributes: ["id", "grupoUsuario", "empresas", "ativo"],
      });
      if (usuario && usuario.ativo) {
        console.log(
          `[authUser] encontrado usuario legado: id=${usuario.id} grupo=${usuario.grupoUsuario} empresas=${JSON.stringify(usuario.empresas)}`,
        );
        const empresas = Array.isArray(usuario.empresas)
          ? usuario.empresas
          : [];
        const empresaId = extractEmpresaId(empresas);
        // Verificar se empresa está bloqueada
        if (await isEmpresaBloqueada(empresaId)) {
          console.log(`[authUser] empresa ${empresaId} bloqueada (fallback)`);
          return res.status(403).json({
            mensagem: "Sistema bloqueado. Entre em contato com o suporte.",
            bloqueado: true,
          });
        }
        req.user = {
          id: usuario.id,
          empresaId,
          grupoUsuario: usuario.grupoUsuario,
        };
        // Renovar o JWT para que próximas requisições usem o fluxo novo
        const novoToken = gerarTokenUsuario(usuario.toJSON());
        console.log(
          `[authUser] renovando pethub_token para usuario ${usuario.id}`,
        );
        res.cookie("pethub_token", novoToken, {
          httpOnly: true,
          sameSite: "Lax",
          maxAge: 8 * 60 * 60 * 1000,
          path: "/",
        });
        return next();
      }
    } catch (e) {
      console.log(
        `[authUser] fallback usuarioLegado falhou: ${e && e.message}`,
      );
      // fallback falhou, retornar 401
    }
  } else {
    console.log("[authUser] cookie usuarioLogadoId ausente");
  }

  return res.status(401).json({ mensagem: "Não autenticado. Faça login." });
}

/**
 * Gera um JWT para o usuário autenticado.
 */
function gerarTokenUsuario(usuario) {
  const empresaId = extractEmpresaId(
    Array.isArray(usuario.empresas) ? usuario.empresas : [],
  );

  return jwt.sign(
    {
      id: usuario.id,
      empresaId,
      grupoUsuario: usuario.grupoUsuario,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN },
  );
}

module.exports = {
  authUser,
  gerarTokenUsuario,
  isEmpresaBloqueada,
  extractEmpresaId,
  JWT_SECRET,
};
