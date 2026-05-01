const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET =
  process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
const JWT_EXPIRES_IN = "8h";

// Cache simples em memória para usuários e status de empresa
const USER_CACHE = new Map(); // key: userId -> { user, expiresAt }
const USER_CACHE_TTL = Number(process.env.USER_CACHE_TTL_MS) || 60 * 1000; // 60s default

const EMPRESA_BLOCKED_CACHE = new Map(); // key: empresaId -> { blocked, expiresAt }
const EMPRESA_CACHE_TTL =
  Number(process.env.EMPRESA_CACHE_TTL_MS) || 5 * 60 * 1000; // 5min default

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
  // Por compatibilidade com o frontend, o header não é obrigatório por padrão.
  // Para forçar header, setar REQUIRE_AUTH_HEADER=1 no .env
  const REQUIRE_HEADER = process.env.REQUIRE_AUTH_HEADER === "1";
  const tokenFromHeader =
    req.headers &&
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;
  const tokenFromCookie = req.cookies?.pethub_token || null;

  if (REQUIRE_HEADER && !tokenFromHeader) {
    return res
      .status(401)
      .json({ mensagem: "Token (Authorization Bearer) obrigatório" });
  }

  const token = tokenFromHeader || tokenFromCookie;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      const userId = decoded && decoded.id ? Number(decoded.id) : null;
      if (!userId) {
        if (REQUIRE_HEADER)
          return res.status(401).json({ mensagem: "Token inválido" });
        // continuar para fallback
      } else {
        const now = Date.now();
        // Checar cache de usuário
        const cached = USER_CACHE.get(userId);
        if (cached && cached.expiresAt > now) {
          req.user = cached.user;
          // Atualizar atividade em background
          try {
            const tokenHash = crypto
              .createHash("sha256")
              .update(token)
              .digest("hex");
            const {
              atualizarAtividade,
            } = require("../controllers/acessosController");
            atualizarAtividade(tokenHash);
          } catch (_) {}
          return next();
        }

        // Construir usuário baseado no token (fluxo rápido, sem DB)
        const userFromToken = {
          id: userId,
          empresaId: decoded.empresaId || null,
          grupoUsuario: decoded.grupoUsuario || null,
        };

        // Verificação crítica: empresa bloqueada (usar cache para reduzir queries)
        const empresaId = userFromToken.empresaId;
        if (empresaId) {
          const eb = EMPRESA_BLOCKED_CACHE.get(String(empresaId));
          if (eb && eb.expiresAt > now) {
            if (eb.blocked) {
              return res
                .status(403)
                .json({ mensagem: "Sistema bloqueado.", bloqueado: true });
            }
          } else {
            try {
              const blocked = await isEmpresaBloqueada(empresaId);
              EMPRESA_BLOCKED_CACHE.set(String(empresaId), {
                blocked,
                expiresAt: now + EMPRESA_CACHE_TTL,
              });
              if (blocked)
                return res
                  .status(403)
                  .json({ mensagem: "Sistema bloqueado.", bloqueado: true });
            } catch (e) {
              // Em caso de erro ao verificar bloqueio, logar e permitir (evitar negar serviço por falha de DB)
              console.warn(
                `[authUser] falha ao verificar bloqueio da empresa ${empresaId}: ${e && e.message}`,
              );
            }
          }
        }

        // Cachear resultado e seguir
        USER_CACHE.set(userId, {
          user: userFromToken,
          expiresAt: now + USER_CACHE_TTL,
        });
        req.user = userFromToken;
        try {
          const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
          const {
            atualizarAtividade,
          } = require("../controllers/acessosController");
          atualizarAtividade(tokenHash);
        } catch (_) {}
        return next();
      }
    } catch (err) {
      if (REQUIRE_HEADER) {
        return res.status(401).json({ mensagem: "Token inválido ou expirado" });
      }
      // token inválido/expirado — continua para fallback quando header não for obrigatório
    }
  }

  // 2. Fallback: cookie legado usuarioLogadoId (sessão anterior ao JWT)
  const usuarioLegadoId = req.cookies?.usuarioLogadoId;
  if (usuarioLegadoId) {
    // cookie legado presente; proceder com busca direta (cache pode ser aplicado)
    try {
      const { Usuario } = require("../models");
      const usuario = await Usuario.findByPk(parseInt(usuarioLegadoId), {
        attributes: ["id", "grupoUsuario", "empresas", "ativo"],
      });
      if (usuario && usuario.ativo) {
        // usuario legado encontrado
        const empresas = Array.isArray(usuario.empresas)
          ? usuario.empresas
          : [];
        const empresaId = extractEmpresaId(empresas);
        // Verificar se empresa está bloqueada
        if (await isEmpresaBloqueada(empresaId)) {
          console.warn(`[authUser] empresa ${empresaId} bloqueada (fallback)`);
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
        // NÃO renovar JWT aqui — gerar token deve acontecer apenas no login
        // sucesso
        return next();
      }
    } catch (e) {
      console.warn(
        `[authUser] fallback usuarioLegado falhou: ${e && e.message}`,
      );
      // fallback falhou, retornar 401
    }
  } else {
    // cookie legado ausente
  }

  return res.status(401).json({ mensagem: "Não autenticado. Faça login." });
}

/**
 * Gera um JWT para o usuário autenticado.
 */
function gerarTokenUsuario(usuario) {
  // Preferir campo `empresa_id` quando disponível (compatibilidade com migração)
  let empresaId = null;
  if (usuario && (usuario.empresa_id || usuario.empresaId)) {
    empresaId = Number(usuario.empresa_id || usuario.empresaId) || null;
  }
  if (!empresaId) {
    empresaId = extractEmpresaId(
      Array.isArray(usuario.empresas) ? usuario.empresas : [],
    );
  }

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
