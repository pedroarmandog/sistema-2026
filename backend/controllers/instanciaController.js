const { WhatsappSession } = require("../models");
const whatsappService = require("../services/whatsappService");

// Prefixo para isolar instâncias do disparador do sistema principal de marketing
const DISP_PREFIX = "disp_";

async function criarInstancia(req, res) {
  try {
    const nome = req.body.nome && String(req.body.nome).trim();
    if (!nome)
      return res.status(400).json({ error: "Nome da instância é obrigatório" });

    // Verificar limite de 10 instâncias
    const total = await WhatsappSession.count({
      where: { nome: { [require("sequelize").Op.ne]: null } },
    });
    if (total >= 10) {
      return res
        .status(400)
        .json({ error: "Limite de 10 instâncias atingido" });
    }

    // Criar registro no banco com status aguardando_qr
    const sess = await WhatsappSession.create({
      nome,
      status: "aguardando_qr",
    });

    // Garantir que o campo empresaId aponte para o id do registro
    try {
      await sess.update({ empresaId: sess.id });
    } catch (e) {}

    // Iniciar cliente Puppeteer usando chave com prefixo para isolar do sistema principal
    try {
      whatsappService.inicializarCliente(DISP_PREFIX + sess.id);
    } catch (e) {
      console.warn("[Instancia] falha ao inicializar cliente", e && e.message);
    }

    return res.json({ success: true, instancia: sess });
  } catch (err) {
    console.error("criarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function listarInstancias(req, res) {
  try {
    // Listar apenas instâncias do disparador (que possuem nome, exceto config)
    const Op = require("sequelize").Op;
    const list = await WhatsappSession.findAll({
      where: {
        nome: {
          [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: "config_disparador" }],
        },
      },
      order: [["createdAt", "DESC"]],
    });
    // Retornar o status real do clientsMap (memória) para evitar informação desatualizada
    const result = list.map((s) => {
      const real = whatsappService.obterStatus(DISP_PREFIX + s.id);
      const json = s.toJSON();
      // Se o banco diz "conectado" mas a memória diz outra coisa, usar o status real
      if (json.status === "conectado" && real.status !== "conectado") {
        json.status =
          real.status === "desconectado" ? "desconectado" : real.status;
      }
      return json;
    });
    return res.json(result);
  } catch (err) {
    console.error("listarInstancias error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function conectarInstancia(req, res) {
  try {
    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });

    await WhatsappSession.update(
      { status: "aguardando_qr" },
      { where: { id } },
    );
    whatsappService.inicializarCliente(DISP_PREFIX + id);
    return res.json({ success: true });
  } catch (err) {
    console.error("conectarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function desconectarInstancia(req, res) {
  try {
    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });

    try {
      await whatsappService.desconectar(DISP_PREFIX + id);
    } catch (e) {}
    await WhatsappSession.update({ status: "desconectado" }, { where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("desconectarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function excluirInstancia(req, res) {
  try {
    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });

    try {
      await whatsappService.desconectar(DISP_PREFIX + id);
    } catch (e) {}
    await sess.destroy();
    return res.json({ success: true });
  } catch (err) {
    console.error("excluirInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

async function resetarInstancia(req, res) {
  try {
    const id = String(req.params.id);
    const sess = await WhatsappSession.findByPk(id);
    if (!sess)
      return res.status(404).json({ error: "Instância não encontrada" });

    const chave = DISP_PREFIX + id;
    // Destruir cliente existente
    try {
      await whatsappService.desconectar(chave);
    } catch (_) {}
    // Limpar sessão corrompida do disco
    whatsappService.limparSessaoDoDisco(chave);
    // Atualizar banco
    await WhatsappSession.update(
      { status: "aguardando_qr" },
      { where: { id } },
    );
    // Reconectar (gera QR novo)
    whatsappService.inicializarCliente(chave);
    return res.json({ success: true });
  } catch (err) {
    console.error("resetarInstancia error", err && err.message);
    return res.status(500).json({ error: err.message || "Erro interno" });
  }
}

module.exports = {
  criarInstancia,
  listarInstancias,
  conectarInstancia,
  desconectarInstancia,
  excluirInstancia,
  resetarInstancia,
  DISP_PREFIX,
};
