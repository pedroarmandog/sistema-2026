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

  let ativa = await verificarSessaoAtiva(tokenHash);

  // Se não existe sessão no banco, tentar recriar a sessão se o JWT ainda for válido
  if (!ativa) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log(
        `[sessao-ativa] token válido para usuario=${decoded.id} empresaId=${decoded.empresaId}`,
      );

      // Recuperar empresaPainelId e, se possível, registrar sessão
      const limiteCheck = await verificarLimiteAcessos(decoded.empresaId);
      if (limiteCheck && limiteCheck.empresaPainelId) {
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
        // Marcar como ativa após criar
        ativa = await verificarSessaoAtiva(tokenHash);
        if (ativa) {
          try {
            await atualizarAtividade(tokenHash);
          } catch (e) {}
        }
      } else {
        console.log(
          `[sessao-ativa] não encontrou empresaPainelId para empresaId=${decoded.empresaId}`,
        );
      }
    } catch (e) {
      // token inválido/expirado — não recriar
      console.log(`[sessao-ativa] jwt.verify falhou: ${e && e.message}`);
    }
  } else {
    // Renovar última atividade para manter a sessão viva enquanto o dashboard está aberto
    try {
      await atualizarAtividade(tokenHash);
    } catch (e) {
      // silencioso
    }
  }

  res.json({ ativa, motivo: ativa ? null : "sessao_encerrada" });
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
