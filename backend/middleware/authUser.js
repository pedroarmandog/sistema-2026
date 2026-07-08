const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET =
  process.env.JWT_USER_SECRET || "pethub_user_secret_2026_!@#$%";
const JWT_EXPIRES_IN = "30d"; // JWT de longa duração — a validade real é controlada por ultima_atividade no DB (8h de inatividade)

// Cache simples em memória para usuários e status de empresa
const USER_CACHE = new Map(); // key: userId -> { user, expiresAt }
const USER_CACHE_TTL = Number(process.env.USER_CACHE_TTL_MS) || 10 * 1000; // 10s default (reduzido de 60s para garantir sincronização)

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
 *   - String JSON:       "[3]" ou "[{\"id\":\"1\"}]"  (caso Sequelize não auto-parse)
 */
function extractEmpresaId(empresas) {
  // Tolerância: se vier como string JSON, tentar parsear
  if (typeof empresas === "string") {
    try {
      empresas = JSON.parse(empresas);
    } catch (e) {
      return null;
    }
  }
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

        // Construir usuário baseado no token
        let resolvedEmpresaId = decoded.empresaId || null;

        // Se empresaId ausente no JWT (token antigo ou usuário sem empresa no array),
        // buscar direto no DB uma vez — resultado é cacheado por 60s
        if (!resolvedEmpresaId) {
          try {
            const { Usuario } = require("../models");
            const u = await Usuario.findByPk(userId, {
              attributes: ["empresas", "empresa_id"],
            });
            if (u) {
              resolvedEmpresaId =
                (u.empresa_id ? Number(u.empresa_id) : null) ||
                extractEmpresaId(Array.isArray(u.empresas) ? u.empresas : []);
            }
          } catch (dbErr) {
            console.warn(
              `[authUser] falha ao buscar empresaId do usuario=${userId}:`,
              dbErr && dbErr.message,
            );
          }
        }

        const userFromToken = {
          id: userId,
          empresaId: resolvedEmpresaId,
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

        // Verificar inatividade de 8h: se ultima_atividade > 8h → sessão expirada.
        // Executado apenas no cache miss (máximo 1x a cada 60s por usuário).
        const _INATIVIDADE_MAX_MS = 8 * 60 * 60 * 1000;
        try {
          const _tHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");
          const { SessaoAtiva } = require("../models");
          // Buscar sessão pelo token — ativo ou não — para distinguir os casos
          const _sessaoCheck = await SessaoAtiva.findOne({
            where: { token_hash: _tHash },
            attributes: ["id", "ativo", "ultima_atividade"],
          });
          if (_sessaoCheck) {
            if (!_sessaoCheck.ativo) {
              // Admin encerrou explicitamente (ativo=false) → forçar novo login
              USER_CACHE.delete(userId);
              return res.status(401).json({
                mensagem: "Sessão encerrada.",
                encerrado: true,
              });
            }
            // Sessão ativa — verificar inatividade de 8h
            if (_sessaoCheck.ultima_atividade) {
              const _inativoMs =
                Date.now() - new Date(_sessaoCheck.ultima_atividade).getTime();
              if (_inativoMs > _INATIVIDADE_MAX_MS) {
                await SessaoAtiva.update(
                  { ativo: false },
                  { where: { id: _sessaoCheck.id } },
                );
                USER_CACHE.delete(userId);
                return res.status(401).json({
                  mensagem: "Sessão expirada por inatividade.",
                  expirado: true,
                });
              }
            }
          }
          // Sem registro no DB = sessão anterior ao rastreamento — JWT válido, deixar passar
        } catch (_inativErr) {
          // Não bloquear em caso de falha na verificação de inatividade
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
    // cookie legado presente; proceder com busca direta
    try {
      const { sequelize: seq } = require("../models");
      const { QueryTypes } = require("sequelize");
      // Query raw: inclui empresa_id que não está no modelo Sequelize de Usuário
      const rows = await seq.query(
        "SELECT id, grupoUsuario, empresas, empresa_id, ativo FROM usuarios WHERE id = :id LIMIT 1",
        {
          replacements: { id: parseInt(usuarioLegadoId) },
          type: QueryTypes.SELECT,
        },
      );
      const usuario = rows && rows[0];
      if (usuario && usuario.ativo) {
        let empresas = [];
        try {
          empresas =
            typeof usuario.empresas === "string"
              ? JSON.parse(usuario.empresas)
              : Array.isArray(usuario.empresas)
                ? usuario.empresas
                : [];
        } catch (_) {}
        const empresaId =
          (usuario.empresa_id ? Number(usuario.empresa_id) : null) ||
          extractEmpresaId(empresas);
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

/**
 * Remove um usuário do cache de autenticação.
 * Chamar ao encerrar sessões externamente (admin) para forçar re-verificação imediata.
 */
function invalidateUserCache(userId) {
  if (userId) USER_CACHE.delete(Number(userId));
}

module.exports = {
  authUser,
  gerarTokenUsuario,
  isEmpresaBloqueada,
  extractEmpresaId,
  invalidateUserCache,
  JWT_SECRET,
};
