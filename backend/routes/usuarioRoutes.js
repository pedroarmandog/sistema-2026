const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const usuarioController = require("../controllers/usuarioController");
const { authUser, JWT_SECRET } = require("../middleware/authUser");
const jwt = require("jsonwebtoken");
const {
  encerrarSessaoPorToken,
  verificarSessaoAtiva,
  atualizarAtividade,
  registrarSessao,
  verificarLimiteAcessos,
} = require("../controllers/acessosController");

// Rota de login
router.post("/login", usuarioController.login);

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
    const ativa = await verificarSessaoAtiva(tokenHash);
    if (ativa) {
      // Atualizar última atividade para manter sessão viva
      try {
        await atualizarAtividade(tokenHash);
      } catch (e) {}
      return res.json({ ativa: true, motivo: null });
    }
    // Se não encontrou sessão no DB, verificar se o JWT ainda é válido.
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(
        `[sessao-ativa] token JWT válido para usuario=${decoded.id} (sem sessão DB)`,
      );
      // Não recriar sessão automaticamente aqui — sinalizar que o JWT é válido
      // O frontend pode chamar /api/usuarios/start-session explicitamente quando desejar.
      return res.json({ ativa: true, motivo: "jwt_valid_no_db" });
    } catch (e) {
      console.log(`[sessao-ativa] jwt.verify falhou: ${e && e.message}`);
      return res.json({ ativa: false, motivo: "sessao_encerrada" });
    }
  } catch (e) {
    console.error("[sessao-ativa] Erro ao verificar sessão:", e && e.message);
    return res.json({ ativa: false, motivo: "erro" });
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

    // Se a sessão já existe, apenas atualizar atividade
    const existe = await verificarSessaoAtiva(tokenHash);
    if (existe) {
      try {
        await atualizarAtividade(tokenHash);
      } catch (e) {}
      return res.json({
        ativa: true,
        created: false,
        motivo: "already_active",
      });
    }

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

// Rota de logout — limpa o cookie JWT e encerra sessão ativa
router.post("/logout", async (req, res) => {
  // Encerrar sessão ativa no banco
  const token =
    req.cookies?.pethub_token ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null);
  if (token) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await encerrarSessaoPorToken(tokenHash);
  }
  res.clearCookie("pethub_token", { path: "/" });
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
