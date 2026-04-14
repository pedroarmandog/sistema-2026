const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const usuarioController = require("../controllers/usuarioController");
const { authUser } = require("../middleware/authUser");
const { encerrarSessaoPorToken } = require("../controllers/acessosController");

// Rota de login
router.post("/login", usuarioController.login);

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
