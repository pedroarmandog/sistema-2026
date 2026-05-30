const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const usuarioController = require("../controllers/usuarioController");
const rateLimit = require("../middleware/rateLimit");
const { authUser, JWT_SECRET } = require("../middleware/authUser");
const jwt = require("jsonwebtoken");
const {
  encerrarSessaoPorToken,
  verificarSessaoAtiva,
  atualizarAtividade,
  registrarSessao,
  verificarLimiteAcessos,
} = require("../controllers/acessosController");

// Rota de login (limite por minuto, aplicada somente no login)
// Ajuste: windowMs=60000 (1 minuto), max=150 pedidos por minuto (configurável)
router.post(
  "/login",
  rateLimit({ windowMs: 60000, max: 150 }),
  usuarioController.login,
);

// Rota para verificar se a sessão ainda está ativa (polling do frontend)
// Importante: NÃO recriar sessões aqui — sessões devem ser criadas apenas no login.
router.get("/sessao-ativa", async (req, res) => {
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res.json({ ativa: false, motivo: "sem_token" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const { SessaoAtiva } = require("../models");

    // Buscar registro no banco independente do status
    const registroNoDb = await SessaoAtiva.findOne({
      where: { token_hash: tokenHash },
      attributes: ["id", "ativo"],
    });

    if (registroNoDb) {
      if (registroNoDb.ativo) {
        // Sessão ativa — atualizar atividade
        try {
          await atualizarAtividade(tokenHash);
        } catch (e) {}
        return res.json({ ativa: true, motivo: null });
      } else {
        // Sessão EXPLICITAMENTE encerrada (ativo=false) — não manter o usuário logado
        console.log(
          `[sessao-ativa] token encontrado com ativo=false — sessão encerrada pelo admin`,
        );
        return res.json({ ativa: false, motivo: "sessao_encerrada" });
      }
    }

    // Nenhum registro no DB — sessão nunca foi registrada (empresa sem painel, etc.)
    // Nesse caso, verificar se o JWT ainda é válido e permitir acesso
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(
        `[sessao-ativa] token JWT válido para usuario=${decoded.id} (sem registro DB — permitindo)`,
      );
      return res.json({ ativa: true, motivo: "jwt_valid_no_db" });
    } catch (e) {
      console.log(`[sessao-ativa] jwt.verify falhou: ${e && e.message}`);
      return res.json({ ativa: false, motivo: "sessao_encerrada" });
    }
  } catch (e) {
    console.error("[sessao-ativa] Erro ao verificar sessão:", e && e.message);
    // Falhar ABERTO: em erro de DB, assumir sessão válida para não desconectar o usuário
    return res.json({ ativa: true, motivo: "db_error" });
  }
});

// Rota para iniciar/reativar sessão manualmente (chamada explícita do frontend)
// Essa rota valida o JWT e, se possível, registra uma sessão no banco.
router.post("/start-session", async (req, res) => {
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (!token) {
    return res.status(401).json({ ativa: false, motivo: "sem_token" });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`[start-session] token válido para usuario=${decoded.id}`);

    // Verificar o registro no banco antes de qualquer ação
    const { SessaoAtiva: SessaoAtivaModel } = require("../models");
    const registroDb = await SessaoAtivaModel.findOne({
      where: { token_hash: tokenHash },
      attributes: ["id", "ativo"],
    });

    if (registroDb) {
      if (registroDb.ativo) {
        // Sessão ativa — apenas atualizar atividade
        try {
          await atualizarAtividade(tokenHash);
        } catch (e) {}
        return res.json({
          ativa: true,
          created: false,
          motivo: "already_active",
        });
      } else {
        // Sessão ENCERRADA pelo admin — NÃO recriar. Forçar logout.
        console.log(
          `[start-session] sessão token=${tokenHash.substring(0, 10)} está ativo=false — não recriar`,
        );
        return res.json({ ativa: false, motivo: "sessao_encerrada" });
      }
    }

    // Nenhum registro no banco — sessão ainda não foi criada (ex: primeiro acesso após deploy)
    // Tentar criar sessão no DB se houver empresaPainelId disponível
    const limiteCheck = await verificarLimiteAcessos(decoded.empresaId);
    if (!limiteCheck || !limiteCheck.empresaPainelId) {
      console.log(
        `[start-session] não criou sessão: empresaPainelId ausente para empresaId=${decoded.empresaId}`,
      );
      // JWT é válido — informar frontend que a autenticação está ok, mas não há sessão DB
      return res.json({
        ativa: true,
        created: false,
        motivo: "no_empresa_panel",
      });
    }

    // Derrubar sessões antigas se necessário
    if (limiteCheck.sessoesDerrubar && limiteCheck.sessoesDerrubar.length > 0) {
      console.log(
        `[start-session] derrubando ${limiteCheck.sessoesDerrubar.length} sessão(ões) antigas para empresaPainelId=${limiteCheck.empresaPainelId}`,
      );
      const { SessaoAtiva } = require("../models");
      for (const sessao of limiteCheck.sessoesDerrubar) {
        await SessaoAtiva.update(
          { ativo: false },
          { where: { id: sessao.id, ativo: true } },
        );
      }
    }

    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.ip ||
      "";
    const userAgent = req.headers["user-agent"] || "";

    await registrarSessao(
      decoded.id,
      limiteCheck.empresaPainelId,
      tokenHash,
      typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "",
      userAgent,
    );

    return res.json({ ativa: true, created: true });
  } catch (e) {
    console.log("[start-session] erro ao iniciar sessão:", e && e.message);
    if (
      e &&
      (e.name === "TokenExpiredError" || e.name === "JsonWebTokenError")
    ) {
      return res.status(401).json({ ativa: false, motivo: "token_invalido" });
    }
    return res.status(500).json({ ativa: false, motivo: "erro" });
  }
});

// Rota para iniciar/registrar sessão explicitamente (chamada pelo frontend após login)
// Esta rota NÃO é chamada automaticamente pelo polling — deve ser invocada apenas quando
// o cliente sabe que acabou de efetuar login ou precisa reativar uma sessão perdida.
router.post("/start-session", authUser, async (req, res) => {
  try {
    const token =
      req.cookies?.pethub_token ||
      (req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.split(" ")[1]
        : null);

    if (!token) return res.status(400).json({ error: "sem_token" });

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Se já existe sessão ativa, apenas atualizar atividade
    const ativa = await verificarSessaoAtiva(tokenHash);
    if (ativa) {
      try {
        await atualizarAtividade(tokenHash);
      } catch (e) {}
      return res.json({ ativa: true, created: false });
    }

    // Tentar registrar sessão baseada em req.user
    const usuarioId = req.user && req.user.id;
    const empresaId = req.user && req.user.empresaId;
    const limiteCheck = await verificarLimiteAcessos(empresaId);
    const empresaPainelId =
      limiteCheck && limiteCheck.empresaPainelId
        ? limiteCheck.empresaPainelId
        : null;

    const clientIp =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.ip ||
      "";
    const userAgent = req.headers["user-agent"] || "";

    await registrarSessao(
      usuarioId,
      empresaPainelId,
      tokenHash,
      typeof clientIp === "string" ? clientIp.split(",")[0].trim() : "",
      userAgent,
    );

    return res.json({ ativa: true, created: true });
  } catch (e) {
    console.error("[start-session] erro:", e && e.message);
    return res.status(500).json({ error: "erro_interno" });
  }
});

// Rota de logout — limpa o cookie JWT e encerra TODAS as sessões do usuário
router.post("/logout", async (req, res) => {
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);

  if (token) {
    const { SessaoAtiva } = require("../models");

    // Decodificar o JWT (sem verificar assinatura — é logout, não auth)
    // para obter o usuarioId e fechar TODAS as sessões dele de uma vez.
    let userId = null;
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.id) userId = Number(decoded.id);
    } catch (_) {}

    if (userId) {
      // Encerra TODAS as sessões ativas do usuário (independente do token)
      const [qtd] = await SessaoAtiva.update(
        { ativo: false },
        { where: { usuario_id: userId, ativo: true } },
      ).catch(() => [0]);
      console.log(
        `[logout] usuario=${userId} — ${qtd} sessão(ões) encerrada(s)`,
      );
    } else {
      // Fallback: fechar apenas pelo token_hash atual
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await encerrarSessaoPorToken(tokenHash);
    }
  }

  const _logoutCookieDomain = process.env.COOKIE_DOMAIN || null;
  const _logoutCookieSecure = process.env.COOKIE_SECURE === "1";
  const _clearOpts = {
    path: "/",
    httpOnly: true,
    sameSite: process.env.COOKIE_SAMESITE || "Lax",
  };
  if (_logoutCookieDomain) _clearOpts.domain = _logoutCookieDomain;
  if (_logoutCookieSecure) _clearOpts.secure = true;
  res.clearCookie("pethub_token", _clearOpts);
  res.json({ mensagem: "Logout realizado com sucesso" });
});

// Rota de validação de senha
router.post("/validar-senha", usuarioController.validarSenha);

// Rotas de usuários
router.get("/", authUser, usuarioController.listarUsuarios);
router.get("/:id", usuarioController.buscarUsuario);
router.post("/", usuarioController.criarUsuario);
router.put("/:id", usuarioController.atualizarUsuario);
router.delete("/:id", usuarioController.deletarUsuario);

module.exports = router;
