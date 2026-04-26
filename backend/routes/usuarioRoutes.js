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

    // Se não encontrou sessão, NÃO recriar automaticamente aqui.
    console.log(
      `[sessao-ativa] sessão não encontrada no banco para tokenHash=${tokenHash}`,
    );
    return res.json({ ativa: false, motivo: "sessao_encerrada" });
  } catch (e) {
    console.error("[sessao-ativa] Erro ao verificar sessão:", e && e.message);
    return res.json({ ativa: false, motivo: "erro" });
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
