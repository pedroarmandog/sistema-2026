const express = require("express");
const router = express.Router();
const petController = require("../controllers/petController");
const multer = require("multer");
const { Agendamento } = require("../models");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Helper: parsear campo servicos (string JSON ou array)
function parseServicos(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  return [];
}

// Rotas para pets
router.post("/", petController.createPet); // Criar pet
router.get("/", petController.getAllPets); // Listar todos os pets

// GET /api/pets/:id/vacinas — vacinas aplicadas ao pet (extraídas dos agendamentos)
router.get("/:id/vacinas", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const vacinas = [];
    agendamentos.forEach((ag) => {
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (meta.tipoEspecial === "vacina") {
          vacinas.push({
            agendamento_id: ag.id,
            data_aplicacao: meta.dataAplic || ag.dataAgendamento || null,
            vacina: s.nome || meta.nome || "-",
            produto: s.nome || meta.nome || "-",
            lote: meta.lote || "-",
            dose: meta.dose || "-",
            data_renovacao: meta.renovacao || meta.proximaDose || "-",
            profissional: s.profissional || ag.profissional || "-",
          });
        }
      });
    });
    return res.json({ vacinas });
  } catch (e) {
    console.error("Erro GET /pets/:id/vacinas:", e);
    return res.status(500).json({ error: "Erro ao buscar vacinas" });
  }
});

// GET /api/pets/:id/vermifugos
router.get("/:id/vermifugos", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const vermifugos = [];
    agendamentos.forEach((ag) => {
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (meta.tipoEspecial === "vermifugo") {
          vermifugos.push({
            agendamento_id: ag.id,
            data_aplicacao: meta.dataAplic || ag.dataAgendamento || null,
            produto: s.nome || meta.nome || "-",
            lote: meta.lote || "-",
            dose: meta.dose || "-",
            periodicidade: meta.proximaDose || "-",
            data_renovacao: meta.renovacao || "-",
            profissional: s.profissional || ag.profissional || "-",
          });
        }
      });
    });
    return res.json({ vermifugos });
  } catch (e) {
    console.error("Erro GET /pets/:id/vermifugos:", e);
    return res.status(500).json({ error: "Erro ao buscar vermifugos" });
  }
});

// GET /api/pets/:id/antiparasitarios
router.get("/:id/antiparasitarios", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const antiparasitarios = [];
    agendamentos.forEach((ag) => {
      parseServicos(ag.servicos).forEach((s) => {
        const meta = s.meta || {};
        if (meta.tipoEspecial === "antiparasitario") {
          antiparasitarios.push({
            agendamento_id: ag.id,
            data_aplicacao: meta.dataAplic || ag.dataAgendamento || null,
            produto: s.nome || meta.nome || "-",
            lote: meta.lote || "-",
            dose: meta.dose || "-",
            periodicidade: meta.proximaDose || "-",
            data_renovacao: meta.renovacao || "-",
            profissional: s.profissional || ag.profissional || "-",
          });
        }
      });
    });
    return res.json({ antiparasitarios });
  } catch (e) {
    console.error("Erro GET /pets/:id/antiparasitarios:", e);
    return res.status(500).json({ error: "Erro ao buscar antiparasitários" });
  }
});

// GET /api/pets/:id/historico — histórico clínico e estético do pet
// GET /api/pets/:id/documentos — todos os anexos do prontuário de todos os agendamentos do pet
router.get("/:id/documentos", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const documentos = [];

    agendamentos.forEach((ag) => {
      let prontuario = ag.prontuario;
      if (!prontuario) return;
      if (typeof prontuario === "string") {
        try {
          prontuario = JSON.parse(prontuario);
        } catch (e) {
          return;
        }
      }
      if (!Array.isArray(prontuario)) return;

      prontuario.forEach((registro) => {
        if (registro.tipo !== "anexar") return;
        const arquivos = registro.arquivos;
        if (!Array.isArray(arquivos) || arquivos.length === 0) return;
        arquivos.forEach((f) => {
          documentos.push({
            id: f.id || null,
            name: f.name || f.nome || "Arquivo",
            url: f.url,
            type: f.type || f.mimetype || "",
            size: f.size || null,
            agendamento_id: ag.id,
            data: ag.dataAgendamento,
          });
        });
      });
    });

    return res.json({ documentos });
  } catch (e) {
    console.error("Erro GET /pets/:id/documentos:", e);
    return res.status(500).json({ error: "Erro ao buscar documentos" });
  }
});

router.get("/:id/historico", async (req, res) => {
  try {
    const petId = req.params.id;
    const agendamentos = await Agendamento.findAll({
      where: { petId },
      order: [["dataAgendamento", "DESC"]],
    });
    const historico = [];
    const tiposEspeciais = ["vacina", "vermifugo", "antiparasitario"];
    const tipoMap = {
      vacina: "vacinas",
      vermifugo: "vermifugos",
      antiparasitario: "antiparasitas",
    };

    agendamentos.forEach((ag) => {
      const servicos = parseServicos(ag.servicos);
      if (servicos.length === 0) {
        // agendamento sem servicos detalhados
        historico.push({
          agendamento_id: ag.id,
          data: ag.dataAgendamento,
          horario: ag.horario || null,
          servico: ag.servico || "Atendimento",
          profissional: ag.profissional || "-",
          tipo: "procedimentos",
          categoria: "estetico",
        });
        return;
      }
      servicos.forEach((s) => {
        const meta = s.meta || {};
        if (tiposEspeciais.includes(meta.tipoEspecial)) {
          historico.push({
            agendamento_id: ag.id,
            data: meta.dataAplic || ag.dataAgendamento,
            horario: ag.horario || null,
            servico: s.nome || meta.nome || meta.tipoEspecial,
            profissional: s.profissional || ag.profissional || "-",
            tipo: tipoMap[meta.tipoEspecial] || meta.tipoEspecial,
            categoria: "clinico",
          });
        } else {
          historico.push({
            agendamento_id: ag.id,
            data: ag.dataAgendamento,
            horario: ag.horario || null,
            servico: s.nome || s.servico || ag.servico || "Atendimento",
            profissional: s.profissional || ag.profissional || "-",
            tipo: "procedimentos",
            categoria: "estetico",
          });
        }
      });
    });

    return res.json({ historico });
  } catch (e) {
    console.error("Erro GET /pets/:id/historico:", e);
    return res.status(500).json({ error: "Erro ao buscar histórico" });
  }
});

// POST /api/pets/:id/vacinas — registra vacina avulsa criando agendamento
router.post("/:id/vacinas", async (req, res) => {
  try {
    const petId = req.params.id;
    const { nome, dataAplic, dose, lote, renovacao, profissional } = req.body;
    if (!nome)
      return res.status(400).json({ error: "Campo nome é obrigatório" });
    const dataAg = dataAplic ? new Date(dataAplic) : new Date();
    const servicoItem = {
      id: Date.now(),
      nome,
      quantidade: 1,
      unitario: 0,
      valor: 0,
      total: 0,
      profissional: profissional || "",
      meta: {
        tipoEspecial: "vacina",
        dataAplic: dataAplic || new Date().toISOString().slice(0, 10),
        dose: dose || "",
        lote: lote || "",
        renovacao: renovacao || "",
      },
    };
    const ag = await Agendamento.create({
      petId,
      dataAgendamento: dataAg,
      horario: "00:00",
      servico: "vacina",
      servicos: [servicoItem],
      status: "concluido",
      profissional: profissional || "",
    });
    return res.status(201).json({ success: true, agendamento_id: ag.id });
  } catch (e) {
    console.error("Erro POST /pets/:id/vacinas:", e);
    return res.status(500).json({ error: "Erro ao registrar vacina" });
  }
});

// POST /api/pets/:id/vermifugos — registra vermifugo avulso
router.post("/:id/vermifugos", async (req, res) => {
  try {
    const petId = req.params.id;
    const { nome, dataAplic, dose, lote, renovacao, profissional } = req.body;
    if (!nome)
      return res.status(400).json({ error: "Campo nome é obrigatório" });
    const dataAg = dataAplic ? new Date(dataAplic) : new Date();
    const servicoItem = {
      id: Date.now(),
      nome,
      quantidade: 1,
      unitario: 0,
      valor: 0,
      total: 0,
      profissional: profissional || "",
      meta: {
        tipoEspecial: "vermifugo",
        dataAplic: dataAplic || new Date().toISOString().slice(0, 10),
        dose: dose || "",
        lote: lote || "",
        renovacao: renovacao || "",
      },
    };
    const ag = await Agendamento.create({
      petId,
      dataAgendamento: dataAg,
      horario: "00:00",
      servico: "vermifugo",
      servicos: [servicoItem],
      status: "concluido",
      profissional: profissional || "",
    });
    return res.status(201).json({ success: true, agendamento_id: ag.id });
  } catch (e) {
    console.error("Erro POST /pets/:id/vermifugos:", e);
    return res.status(500).json({ error: "Erro ao registrar vermifugo" });
  }
});

// POST /api/pets/:id/antiparasitarios — registra antiparasitário avulso
router.post("/:id/antiparasitarios", async (req, res) => {
  try {
    const petId = req.params.id;
    const { nome, dataAplic, dose, lote, renovacao, profissional } = req.body;
    if (!nome)
      return res.status(400).json({ error: "Campo nome é obrigatório" });
    const dataAg = dataAplic ? new Date(dataAplic) : new Date();
    const servicoItem = {
      id: Date.now(),
      nome,
      quantidade: 1,
      unitario: 0,
      valor: 0,
      total: 0,
      profissional: profissional || "",
      meta: {
        tipoEspecial: "antiparasitario",
        dataAplic: dataAplic || new Date().toISOString().slice(0, 10),
        dose: dose || "",
        lote: lote || "",
        renovacao: renovacao || "",
      },
    };
    const ag = await Agendamento.create({
      petId,
      dataAgendamento: dataAg,
      horario: "00:00",
      servico: "antiparasitario",
      servicos: [servicoItem],
      status: "concluido",
      profissional: profissional || "",
    });
    return res.status(201).json({ success: true, agendamento_id: ag.id });
  } catch (e) {
    console.error("Erro POST /pets/:id/antiparasitarios:", e);
    return res.status(500).json({ error: "Erro ao registrar antiparasitário" });
  }
});

router.get("/:id", petController.getPetById); // Buscar pet por ID
router.put("/:id", petController.updatePet); // Atualizar pet
router.delete("/:id", petController.deletePet); // Excluir pet

module.exports = router;
