/**
 * Marketing Routes
 * ----------------
 * Rotas do módulo de Marketing/WhatsApp.
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const marketingController = require("../controllers/marketingController");

// Configurar multer para upload de imagens de marketing
const uploadDir = path.join(__dirname, "../../uploads/marketing");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `msg_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = /jpeg|jpg|png|gif|webp/;
    const extOk = tiposPermitidos.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimeOk = tiposPermitidos.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error("Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)"));
  },
});

// ── WhatsApp ──────────────────────────────────────
router.get("/whatsapp/status", marketingController.statusWhatsapp);
router.get("/whatsapp/qr-status", marketingController.obterQRStatus); // polling QR
router.post("/whatsapp/conectar", marketingController.conectarWhatsapp);
router.post("/whatsapp/desconectar", marketingController.desconectarWhatsapp);
router.get("/whatsapp/eventos", marketingController.eventoSSE); // SSE

// ── Mensagens Automáticas ─────────────────────────
router.get("/mensagens", marketingController.listarMensagens);
router.get("/mensagens/:id", marketingController.obterMensagem);
router.put(
  "/mensagens/:id",
  upload.single("imagem"),
  marketingController.atualizarMensagem,
);
router.post("/mensagens/:id/ativar", marketingController.ativarMensagem);
router.post("/mensagens/:id/desativar", marketingController.desativarMensagem);
router.post(
  "/mensagens/:id/upload-imagem",
  upload.single("imagem"),
  marketingController.uploadImagem,
);

// ── Envios e Logs ─────────────────────────────────
router.get("/envios", marketingController.listarEnvios);
router.get("/logs", marketingController.listarLogs);
router.get("/estatisticas", marketingController.estatisticas);

module.exports = router;
