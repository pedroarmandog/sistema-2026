/**
 * Marketing Controller
 * ----------------------
 * Gerencia todas as operações do módulo de Marketing/WhatsApp:
 * - Conexão WhatsApp (QR Code, status, desconexão)
 * - CRUD de mensagens automáticas
 * - Ativação/desativação com configuração de envio
 * - Upload de imagens para mensagens
 * - Histórico de envios e logs
 * - Server-Sent Events (SSE) para atualizações em tempo real
 */

const path = require("path");
const fs = require("fs");
const whatsappService = require("../services/whatsappService");

// ──────────────────────────────────────────────
// Mensagens padrão do sistema (seed inicial)
// ──────────────────────────────────────────────
const MENSAGENS_PADRAO = [
  {
    tipo: "boas_vindas",
    titulo: "Boas-vindas para novos clientes que possuem pets",
    conteudo:
      "Olá {nome_tutor}, seja bem-vindo(a) à {nome_empresa}! 🐾\n\nEstamos felizes em cuidar do {nome_pet}. Pode contar com a gente!\n\nAté breve! 😊",
    icone: "fa-hand-wave",
    descricaoMarketing:
      "Ao ativar esta mensagem, você fortalece a relação desde o primeiro contato, proporcionando uma experiência acolhedora e personalizada.",
    configuracaoEnvio: null,
    ativo: false,
  },
  {
    tipo: "lembrete_agendamento",
    titulo: "Lembrete de Agendamento de Serviço",
    conteudo:
      "🐾 Olá {nome_tutor}!\n\nLembramos que {nome_pet} tem um agendamento marcado para {data_agendamento} às {hora_agendamento}.\n\n📍 Local: {nome_empresa}\n💼 Serviço: {servico}\n\nAté breve! 🐕❤️",
    icone: "fa-calendar",
    descricaoMarketing:
      "Reduza faltas e melhoredra a experiência do cliente com lembretes automáticos de agendamento.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "pet_pronto",
    titulo: "Aviso que o pet está pronto",
    conteudo:
      "🎉 Boa notícia, {nome_tutor}!\n\n{nome_pet} está prontinho e te esperando aqui na {nome_empresa}! 🐾✨\n\nPode vir buscar quando quiser. Estamos aqui até às 18h.\n\nObrigado pela confiança! 💙",
    icone: "fa-check-circle",
    descricaoMarketing:
      "Notifique automaticamente quando o pet estiver pronto para ser buscado.",
    configuracaoEnvio: null,
    ativo: true,
  },
  {
    tipo: "lembrete_produtos",
    titulo: "Lembrete de Oportunidade de Venda para Produtos",
    conteudo:
      "🛍️ Olá {nome_tutor}!\n\nNotamos que está na hora de renovar alguns produtos para {nome_pet}!\n\n🦴 Ração\n🧴 Shampoo\n💊 Suplementos\n\nTemos ofertas especiais! Que tal dar uma passadinha? 😊",
    icone: "fa-shopping-bag",
    descricaoMarketing:
      "Incentive compras recorrentes lembrando os tutores de renovar produtos essenciais.",
    configuracaoEnvio: null,
    ativo: false,
  },
  {
    tipo: "plano_banhos_concluido",
    titulo: "Ciclo do plano de banhos por Consumo foi concluído",
    conteudo:
      "🛁 Olá {nome_tutor}!\n\nO plano de banhos de {nome_pet} foi concluído!\n\nPara manter {nome_pet} sempre limpinho e cheiroso, que tal renovar o plano?\n\n💆 Benefícios: desconto, prioridade e muito carinho!\n\nEntre em contato conosco! 🐾💙",
    icone: "fa-bath",
    descricaoMarketing:
      "Notifique automaticamente quando o ciclo de banhos for concluído para facilitar a renovação.",
    configuracaoEnvio: null,
    ativo: false,
  },
  {
    tipo: "aniversario_pet",
    titulo: "Felicitações aos Pets Aniversariantes",
    conteudo:
      "Oi {nome_tutor},\n\nHoje é um dia especial, pois é o aniversário de um pet muito querido 💚\n\n{nome_pet}\nQueremos desejar um aniversário cheio de alegrias e lambidas! 🎂🐾\nQue este dia seja repleto de brincadeiras, petiscos deliciosos e muito carinho. Agradecemos por permitir que façamos parte da sua vida. 🐾❤️\n\nFeliz Aniversário 🎉🐾\n{nome_pet}",
    icone: "fa-birthday-cake",
    descricaoMarketing:
      "Parabenize os pets em seu aniversário — uma ação personalizada que aumenta o vínculo emocional.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "aniversario_tutor",
    titulo: "Felicitações aos Tutores Aniversariantes",
    conteudo:
      "🎂 Olá {nome_tutor}!\n\nHoje é o seu dia especial e não podíamos deixar passar!\n\nA equipe da {nome_empresa} deseja a você um feliz aniversário repleto de alegrias, saúde e muitos momentos com {nome_pet}! 🐾❤️\n\nFeliz Aniversário! 🎉",
    icone: "fa-user-birthday",
    descricaoMarketing:
      "Surpreenda os tutores em seu aniversário para fortalecer o relacionamento.",
    configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "vacinas_vencendo",
    titulo: "Produto a receber vencido",
    conteudo:
      "💉 Oi {nome_tutor}!\n\nPassando para avisar que a vacina de {nome_pet} está próxima do vencimento!\n\nNão esqueça de agendar na {nome_empresa} para manter {nome_pet} protegido. 🐾\n\nEntre em contato! 😊",
    icone: "fa-syringe",
    descricaoMarketing:
      "Mantenha os clientes informados sobre vacinas vencendo para garantir visitas regulares.",
    configuracaoEnvio: { tipo: "dias_antes", valor: 7, hora: "09:00" },
    ativo: false,
  },
  {
    tipo: "pet_liberado_portal",
    titulo: "Pet está liberado",
    conteudo:
      "✅ Olá {nome_tutor}!\n\n{nome_pet} está liberado e pode ser acessado no Portal Meu Pet!\n\nAcesse agora mesmo para ver todas as informações do seu pet. 🐾\n\nCom carinho, {nome_empresa}",
    icone: "fa-unlock",
    descricaoMarketing:
      "Notifique quando o pet for liberado no portal digital, eliminando contatos manuais.",
    configuracaoEnvio: null,
    ativo: false,
  },
  {
    tipo: "primeiro_banho",
    titulo: "Mensagem de pós-atendimento para primeiros banhos",
    conteudo:
      "🐾 Olá {nome_tutor}!\n\nFoi um prazer receber {nome_pet} pelo primeiro banho hoje!\n\nEsperamos que {nome_pet} tenha adorado. Sua satisfação é nossa prioridade. 😊\n\nFicamos à disposição!\n{nome_empresa} ❤️",
    icone: "fa-star",
    descricaoMarketing:
      "Fortaleça o relacionamento após o primeiro atendimento com uma mensagem de pós-serviço personalizada.",
    configuracaoEnvio: null,
    ativo: true,
  },
  {
    tipo: "programas_fidelidade",
    titulo: "Boas vindas para novos clientes que possuem pets",
    conteudo:
      "🎁 Olá {nome_tutor}!\n\nVocê está no caminho certo! {nome_pet} já acumulou pontos suficientes para ganhar um benefício especial.\n\nVenha resgatar na {nome_empresa}! 🐾\n\nAté logo! 😊",
    icone: "fa-gift",
    descricaoMarketing:
      "Incentive a fidelização comunicando benefícios do programa de pontos.",
    configuracaoEnvio: null,
    ativo: false,
  },
];

// ──────────────────────────────────────────────
// WhatsApp: Conexão via QR Code
// ──────────────────────────────────────────────

/**
 * GET /api/marketing/whatsapp/status
 * Retorna o status atual da conexão WhatsApp da empresa.
 */
exports.statusWhatsapp = async (req, res) => {
  const empresaId = req.query.empresaId || 1;
  const statusAtual = whatsappService.obterStatus(empresaId);

  // Buscar também do banco para casos de restart do servidor
  try {
    const { WhatsappSession } = require("../models");
    const session = await WhatsappSession.findOne({
      where: { empresaId: Number(empresaId) },
    });

    if (session) {
      // Se o cliente em memória não existe mas o banco indica conectado,
      // o status real é desconectado (servidor reiniciou)
      if (!statusAtual || statusAtual.status === "desconectado") {
        return res.json({
          status: "desconectado",
          numero: session.numero,
          ultimaConexao: session.ultimaConexao,
        });
      }
    }
  } catch (_) {}

  return res.json(statusAtual);
};

/**
 * POST /api/marketing/whatsapp/conectar
 * Inicia a conexão WhatsApp (geração do QR Code).
 */
exports.conectarWhatsapp = async (req, res) => {
  const empresaId = req.body.empresaId || 1;

  try {
    const resultado = await whatsappService.inicializarCliente(
      String(empresaId),
    );
    return res.json({ sucesso: true, resultado });
  } catch (err) {
    console.error("[Marketing] Erro ao conectar WhatsApp:", err.message);
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
};

/**
 * POST /api/marketing/whatsapp/desconectar
 * Desconecta o WhatsApp da empresa.
 */
exports.desconectarWhatsapp = async (req, res) => {
  const empresaId = req.body.empresaId || 1;

  try {
    await whatsappService.desconectar(String(empresaId));
    return res.json({ sucesso: true });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: err.message });
  }
};

/**
 * GET /api/marketing/whatsapp/qr-status
 * Polling endpoint: retorna status atual + QR Base64 se disponível.
 * Usado como fallback confiável ao SSE.
 */
exports.obterQRStatus = (req, res) => {
  const empresaId = req.query.empresaId || 1;
  const statusAtual = whatsappService.obterStatus(String(empresaId));
  return res.json(statusAtual);
};

/**
 * GET /api/marketing/whatsapp/eventos
 * Server-Sent Events: stream de atualizações de QR Code e status.
 */
exports.eventoSSE = (req, res) => {
  const empresaId = req.query.empresaId || 1;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Enviar status inicial
  const statusAtual = whatsappService.obterStatus(empresaId);
  res.write(
    `data: ${JSON.stringify({ evento: "status_inicial", ...statusAtual })}\n\n`,
  );

  // Registrar listener SSE
  whatsappService.adicionarListenerSSE(String(empresaId), res);

  // Heartbeat a cada 30 segundos para manter a conexão viva
  const heartbeat = setInterval(() => {
    try {
      res.write(":heartbeat\n\n");
    } catch (_) {
      clearInterval(heartbeat);
    }
  }, 30000);

  req.on("close", () => clearInterval(heartbeat));
};

// ──────────────────────────────────────────────
// Mensagens Automáticas: CRUD
// ──────────────────────────────────────────────

/**
 * GET /api/marketing/mensagens
 * Lista todas as mensagens (ativas e inativas).
 */
exports.listarMensagens = async (req, res) => {
  const empresaId = req.query.empresaId || 1;

  try {
    const { MensagemAutomatica } = require("../models");

    let mensagens = await MensagemAutomatica.findAll({
      where: { empresaId: Number(empresaId) },
      order: [
        ["ativo", "DESC"],
        ["tipo", "ASC"],
      ],
    });

    // Se ainda não há mensagens para a empresa, fazer seed das padrões
    if (mensagens.length === 0) {
      const seeds = await MensagemAutomatica.bulkCreate(
        MENSAGENS_PADRAO.map((m) => ({ ...m, empresaId: Number(empresaId) })),
        { returning: true },
      );
      mensagens = seeds;
    }

    return res.json(mensagens);
  } catch (err) {
    console.error("[Marketing] Erro ao listar mensagens:", err.message);
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * GET /api/marketing/mensagens/:id
 * Obtém uma mensagem específica.
 */
exports.obterMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    return res.json(mensagem);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * PUT /api/marketing/mensagens/:id
 * Atualiza o conteúdo de uma mensagem.
 */
exports.atualizarMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    const { conteudo, titulo } = req.body;

    // Se teve upload de imagem
    const imagemPath = req.file
      ? path.join("/uploads/marketing", req.file.filename)
      : mensagem.imagemPath;

    await mensagem.update({ conteudo, titulo, imagemPath });

    return res.json(mensagem);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * POST /api/marketing/mensagens/:id/ativar
 * Ativa uma mensagem automática com configuração de horário.
 */
exports.ativarMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica, LogEnvio } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    const { configuracaoEnvio } = req.body;

    await mensagem.update({
      ativo: true,
      configuracaoEnvio: configuracaoEnvio || mensagem.configuracaoEnvio,
    });

    // Registrar log
    await LogEnvio.create({
      empresaId: mensagem.empresaId,
      evento: "mensagem_ativada",
      detalhes: { mensagemId: mensagem.id, tipo: mensagem.tipo },
      mensagem: `Mensagem "${mensagem.titulo}" ativada`,
    }).catch(() => {});

    return res.json({ sucesso: true, mensagem });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * POST /api/marketing/mensagens/:id/desativar
 * Desativa uma mensagem automática.
 */
exports.desativarMensagem = async (req, res) => {
  try {
    const { MensagemAutomatica, LogEnvio } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    await mensagem.update({ ativo: false });

    await LogEnvio.create({
      empresaId: mensagem.empresaId,
      evento: "mensagem_desativada",
      detalhes: { mensagemId: mensagem.id, tipo: mensagem.tipo },
      mensagem: `Mensagem "${mensagem.titulo}" desativada`,
    }).catch(() => {});

    return res.json({ sucesso: true });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * POST /api/marketing/mensagens/:id/upload-imagem
 * Upload de imagem para uma mensagem (usa multer via rota).
 */
exports.uploadImagem = async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ erro: "Nenhuma imagem enviada" });

    const { MensagemAutomatica } = require("../models");
    const mensagem = await MensagemAutomatica.findByPk(req.params.id);

    if (!mensagem)
      return res.status(404).json({ erro: "Mensagem não encontrada" });

    const imagemPath = `/uploads/marketing/${req.file.filename}`;
    await mensagem.update({ imagemPath });

    return res.json({ sucesso: true, imagemPath });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

// ──────────────────────────────────────────────
// Envios e Logs
// ──────────────────────────────────────────────

/**
 * GET /api/marketing/envios
 * Lista envios agendados com filtros opcionais.
 */
exports.listarEnvios = async (req, res) => {
  const { status, empresaId, limite = 50 } = req.query;
  const { Op } = require("sequelize");

  try {
    const { EnvioAgendado } = require("../models");
    const where = { empresaId: Number(empresaId || 1) };

    if (status) where.status = status;

    const envios = await EnvioAgendado.findAll({
      where,
      order: [["dataAgendada", "DESC"]],
      limit: Number(limite),
    });

    return res.json(envios);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * GET /api/marketing/logs
 * Lista logs de envio.
 */
exports.listarLogs = async (req, res) => {
  const { empresaId, limite = 100 } = req.query;

  try {
    const { LogEnvio } = require("../models");
    const logs = await LogEnvio.findAll({
      where: { empresaId: Number(empresaId || 1) },
      order: [["createdAt", "DESC"]],
      limit: Number(limite),
    });

    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

/**
 * GET /api/marketing/estatisticas
 * Retorna contadores de mensagens para o dashboard.
 */
exports.estatisticas = async (req, res) => {
  const empresaId = req.query.empresaId || 1;

  try {
    const { EnvioAgendado, MensagemAutomatica } = require("../models");

    const [totalAtivas, totalInativas, enviados, pendentes, erros] =
      await Promise.all([
        MensagemAutomatica.count({
          where: { empresaId: Number(empresaId), ativo: true },
        }),
        MensagemAutomatica.count({
          where: { empresaId: Number(empresaId), ativo: false },
        }),
        EnvioAgendado.count({
          where: { empresaId: Number(empresaId), status: "enviado" },
        }),
        EnvioAgendado.count({
          where: { empresaId: Number(empresaId), status: "pendente" },
        }),
        EnvioAgendado.count({
          where: { empresaId: Number(empresaId), status: "erro" },
        }),
      ]);

    return res.json({ totalAtivas, totalInativas, enviados, pendentes, erros });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
};

// ──────────────────────────────────────────────
// Trigger: Agendar envio automático
// (chamado internamente por outros controllers)
// ──────────────────────────────────────────────

/**
 * Dispara mensagem automática baseada em tipo de evento.
 * Chamado pelo clienteController, agendamentoController, etc.
 *
 * @param {string} tipo - Tipo da mensagem (ex: 'boas_vindas', 'lembrete_agendamento')
 * @param {object} variaveis - { nomeTutor, nomePet, dataAgendamento, horaAgendamento, servico }
 * @param {string} telefone - Número destino
 * @param {Date} dataAgendada - Quando enviar (null = imediato)
 * @param {object} contexto - { clienteId, petId, agendamentoId }
 * @param {number} empresaId
 */
async function dispararMensagemAutomatica(
  tipo,
  variaveis,
  telefone,
  dataAgendada,
  contexto,
  empresaId = 1,
) {
  try {
    const { MensagemAutomatica } = require("../models");
    const { agendarEnvio } = require("../services/whatsappQueue");

    // Buscar mensagem ativa do tipo
    const mensagem = await MensagemAutomatica.findOne({
      where: { tipo, ativo: true, empresaId: Number(empresaId) },
    });

    if (!mensagem) {
      console.log(
        `[Marketing] Mensagem do tipo "${tipo}" n\u00e3o est\u00e1 ativa ou n\u00e3o existe. Nenhum envio gerado.`,
      );
      return null;
    }

    if (!telefone) {
      console.warn(
        `[Marketing] Número de telefone não informado para envio do tipo "${tipo}"`,
      );
      return null;
    }

    // Substituir variáveis no template
    const nomeEmpresa = await obterNomeEmpresa(empresaId);
    const conteudoFinal = whatsappService.substituirVariaveis(
      mensagem.conteudo,
      {
        ...variaveis,
        nomeEmpresa,
      },
    );

    // Calcular data de envio baseado na configuração da mensagem
    const dataEnvio = calcularDataEnvio(
      mensagem.configuracaoEnvio,
      dataAgendada,
    );

    // Agendar envio na fila
    const envio = await agendarEnvio({
      empresaId,
      mensagemAutomaticaId: mensagem.id,
      telefone,
      conteudoFinal,
      imagemPath: mensagem.imagemPath
        ? path.join(__dirname, "../..", mensagem.imagemPath)
        : null,
      dataAgendada: dataEnvio,
      contexto,
    });

    return envio;
  } catch (err) {
    console.error(
      `[Marketing] Erro ao disparar mensagem "${tipo}":`,
      err.message,
    );
    return null;
  }
}

/**
 * Calcula a data de envio baseada na configuração da mensagem e data de referência.
 */
function calcularDataEnvio(config, dataReferencia) {
  const agora = new Date();

  if (!config || !dataReferencia) return agora;

  const ref = new Date(dataReferencia);

  if (config.tipo === "no_dia") {
    const [hora, min] = (config.hora || "09:00").split(":").map(Number);
    ref.setHours(hora, min, 0, 0);
    // Se o horário calculado já passou, disparar imediatamente
    return ref <= agora ? agora : ref;
  }

  if (config.tipo === "dias_antes") {
    const dias = Number(config.valor || 1);
    ref.setDate(ref.getDate() - dias);
    const [hora, min] = (config.hora || "09:00").split(":").map(Number);
    ref.setHours(hora, min, 0, 0);
    // Se a data calculada já passou, disparar imediatamente
    return ref <= agora ? agora : ref;
  }

  if (config.tipo === "horas_antes") {
    const horas = Number(config.valor || 1);
    ref.setHours(ref.getHours() - horas);
    return ref <= agora ? agora : ref;
  }

  return agora;
}

async function obterNomeEmpresa(empresaId) {
  try {
    const { Empresa } = require("../models");
    if (!Empresa) return "PetHub";
    const empresa = await Empresa.findByPk(empresaId);
    return empresa
      ? empresa.nomeFantasia || empresa.razaoSocial || "PetHub"
      : "PetHub";
  } catch (_) {
    return "PetHub";
  }
}

// Exportar a função para uso em outros controllers
exports.dispararMensagemAutomatica = dispararMensagemAutomatica;
