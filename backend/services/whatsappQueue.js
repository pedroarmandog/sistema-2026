/**
 * WhatsApp Queue Service (node-cron)
 * -----------------------------------
 * Processa a fila de envios agendados no banco de dados.
 * Executa a cada minuto verificando mensagens pendentes.
 *
 * Regras anti-spam:
 * - Delay aleatório entre envios (3s a 10s)
 * - Máximo de 10 mensagens por minuto por empresa
 * - Máximo de 3 tentativas por envio
 */

const cron = require("node-cron");
const whatsappService = require("./whatsappService");

const MAX_TENTATIVAS = 3;
let cronJob = null;
let processando = false;

/**
 * Inicia o agendador de mensagens.
 * Deve ser chamado uma única vez na inicialização do servidor.
 */
function iniciarAgendador() {
  if (cronJob) {
    console.log("[Queue] Agendador já está rodando");
    return;
  }

  // Executa a cada minuto
  cronJob = cron.schedule("* * * * *", async () => {
    if (processando) {
      console.log("[Queue] Ciclo anterior ainda em andamento, pulando...");
      return;
    }

    processando = true;
    try {
      await processarFila();
    } catch (err) {
      console.error("[Queue] Erro no ciclo de processamento:", err.message);
    } finally {
      processando = false;
    }
  });

  console.log(
    "✅ [Queue] Agendador de mensagens WhatsApp iniciado (executa a cada minuto)",
  );
}

/**
 * Processa todos os envios pendentes que já passaram da data agendada.
 */
async function processarFila() {
  const { EnvioAgendado, LogEnvio } = require("../models");
  const { Op } = require("sequelize");

  const agora = new Date();

  // Recuperar envios presos em "enviando" há mais de 5 minutos
  const cincoMinAtras = new Date(agora.getTime() - 5 * 60 * 1000);
  await EnvioAgendado.update(
    { status: "pendente" },
    {
      where: {
        status: "enviando",
        updatedAt: { [Op.lt]: cincoMinAtras },
      },
    },
  ).catch(() => {});

  // Buscar envios pendentes com dataAgendada <= agora
  const pendentes = await EnvioAgendado.findAll({
    where: {
      status: "pendente",
      dataAgendada: { [Op.lte]: agora },
      tentativas: { [Op.lt]: MAX_TENTATIVAS },
    },
    order: [["dataAgendada", "ASC"]],
    limit: 20, // processar no máximo 20 por ciclo
  });

  if (pendentes.length === 0) return;

  console.log(
    `[Queue] ${pendentes.length} envio(s) pendente(s) para processar`,
  );

  // Tentar reconexão uma única vez por empresa (não por envio)
  const empresasVerificadas = new Set();

  for (const envio of pendentes) {
    const empId = String(envio.empresaId || 1);
    if (!empresasVerificadas.has(empId)) {
      empresasVerificadas.add(empId);
      await tentarReconectar(empId);
    }
    await processarEnvio(envio, LogEnvio);
  }
}

/**
 * Tenta reconectar o WhatsApp de uma empresa (chamado 1x por empresa por ciclo).
 */
async function tentarReconectar(empresaId) {
  if (whatsappService.isConectado(empresaId)) return;

  const fs = require("fs");
  const path = require("path");
  const SESSION_DIR = path.join(__dirname, "../../tmp/whatsapp-sessions");
  const sessionDir = [
    path.join(SESSION_DIR, `session-empresa_${empresaId}`),
    path.join(SESSION_DIR, `empresa_${empresaId}`),
  ].find((d) => fs.existsSync(d));

  if (!sessionDir) {
    console.warn(
      `[Queue] WhatsApp empresa ${empresaId} nunca foi conectado. Conecte pelo painel de Marketing.`,
    );
    return;
  }

  try {
    const status = whatsappService.obterStatus(empresaId);
    if (
      !status ||
      status.status === "desconectado" ||
      status.status === "erro"
    ) {
      console.log(
        `[Queue] Tentando reconectar empresa ${empresaId} automaticamente...`,
      );
      const r = await whatsappService.inicializarCliente(empresaId);
      if (
        r.status === "inicializando" ||
        r.status === "autenticado" ||
        r.status === "ja_conectado"
      ) {
        let tentativas = 0;
        while (tentativas < 30) {
          await new Promise((res) => setTimeout(res, 2000));
          if (whatsappService.isConectado(empresaId)) break;
          tentativas++;
        }
      }
    }
  } catch (e) {
    console.warn(
      `[Queue] Falha ao reconectar empresa ${empresaId}:`,
      e.message,
    );
  }
}

/**
 * Processa um único envio da fila.
 */
async function processarEnvio(envio, LogEnvio) {
  const empresaId = String(envio.empresaId || 1);

  if (!whatsappService.isConectado(empresaId)) {
    console.warn(
      `[Queue] WhatsApp não conectado para empresa ${empresaId}. Envio #${envio.id} pendente.`,
    );
    return;
  }

  // Marcar como "enviando" para evitar processamento duplicado
  await envio.update({ status: "enviando", tentativas: envio.tentativas + 1 });

  try {
    // Registrar log de início (não-crítico)
    await LogEnvio.create({
      empresaId: envio.empresaId,
      envioAgendadoId: envio.id,
      evento: "envio_iniciado",
      detalhes: {
        telefone: envio.telefoneDestino,
        tentativa: envio.tentativas,
      },
      mensagem: `Iniciando envio #${envio.id} para ${envio.telefoneDestino}`,
    }).catch(() => {});

    // Enviar mensagem
    const resultado = await whatsappService.enviarMensagem(
      empresaId,
      envio.telefoneDestino,
      envio.conteudoFinal,
      envio.imagemPath || null,
    );

    if (resultado.sucesso) {
      await envio.update({ status: "enviado", dataEnvio: new Date() });

      await LogEnvio.create({
        empresaId: envio.empresaId,
        envioAgendadoId: envio.id,
        evento: "envio_sucesso",
        detalhes: { telefone: envio.telefoneDestino },
        mensagem: `Mensagem enviada com sucesso para ${envio.telefoneDestino}`,
      }).catch(() => {});

      console.log(
        `[Queue] ✅ Envio #${envio.id} enviado para ${envio.telefoneDestino}`,
      );
    } else {
      // Verificar se deve cancelar (máximo de tentativas)
      const novoStatus =
        envio.tentativas >= MAX_TENTATIVAS ? "erro" : "pendente";

      await envio.update({
        status: novoStatus,
        erroMensagem: resultado.erro,
      });

      await LogEnvio.create({
        empresaId: envio.empresaId,
        envioAgendadoId: envio.id,
        evento: "envio_erro",
        detalhes: { telefone: envio.telefoneDestino, erro: resultado.erro },
        mensagem: `Falha no envio #${envio.id}: ${resultado.erro}`,
      }).catch(() => {});

      console.error(
        `[Queue] ❌ Falha no envio #${envio.id}: ${resultado.erro}`,
      );
    }
  } catch (err) {
    const novoStatus = envio.tentativas >= MAX_TENTATIVAS ? "erro" : "pendente";
    await envio.update({ status: novoStatus, erroMensagem: err.message });

    await LogEnvio.create({
      empresaId: envio.empresaId,
      envioAgendadoId: envio.id,
      evento: "envio_erro",
      detalhes: { erro: err.message },
      mensagem: `Exceção no envio #${envio.id}: ${err.message}`,
    }).catch(() => {});

    console.error(`[Queue] Exceção no envio #${envio.id}:`, err.message);
  }
}

/**
 * Agenda um envio imediato (ex: boas-vindas ao cadastrar cliente).
 * @param {object} params
 * @param {number} params.empresaId
 * @param {number} params.mensagemAutomaticaId
 * @param {string} params.telefone
 * @param {string} params.conteudoFinal - texto com variáveis já substituídas
 * @param {string|null} params.imagemPath
 * @param {Date} params.dataAgendada
 * @param {object} params.contexto - { clienteId, petId, agendamentoId }
 */
async function agendarEnvio(params) {
  try {
    const { EnvioAgendado } = require("../models");

    // Evitar duplicata: checar se já existe envio pendente/enviado para o mesmo contexto + mensagem
    if (params.contexto && params.mensagemAutomaticaId) {
      const { Op } = require("sequelize");
      const sequelize = require("../models").sequelize;

      // Montar WHERE incluindo o contexto (clienteId/petId/agendamentoId) para
      // permitir envios do mesmo tipo para telefones iguais de clientes diferentes.
      const whereClause = {
        mensagemAutomaticaId: params.mensagemAutomaticaId,
        telefoneDestino: String(params.telefone).replace(/\D/g, ""),
        status: { [Op.in]: ["enviado", "pendente", "enviando"] },
      };

      // Se o contexto contiver clienteId ou agendamentoId, usar para diferenciar
      const ctx =
        typeof params.contexto === "string"
          ? JSON.parse(params.contexto)
          : params.contexto;

      const conditions = [];

      if (ctx.clienteId) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.clienteId') = ${Number(ctx.clienteId)}`,
          ),
        );
      } else if (ctx.agendamentoId) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.agendamentoId') = ${Number(ctx.agendamentoId)}`,
          ),
        );
      }

      // Diferenciar envios de dias distintos (multi-day)
      if (ctx.diasAntes !== undefined && ctx.diasAntes !== null) {
        conditions.push(
          sequelize.literal(
            `JSON_EXTRACT(contexto, '$.diasAntes') = ${Number(ctx.diasAntes)}`,
          ),
        );
      }

      if (conditions.length > 0) {
        whereClause[Op.and] = conditions;
      }

      const jaExiste = await EnvioAgendado.findOne({ where: whereClause });

      if (jaExiste) {
        console.log(
          `[Queue] Envio duplicado ignorado para ${params.telefone} (mensagem #${params.mensagemAutomaticaId})`,
        );
        return null;
      }
    }

    const envio = await EnvioAgendado.create({
      empresaId: params.empresaId || 1,
      mensagemAutomaticaId: params.mensagemAutomaticaId,
      telefoneDestino: String(params.telefone).replace(/\D/g, ""),
      conteudoFinal: params.conteudoFinal,
      imagemPath: params.imagemPath || null,
      status: "pendente",
      dataAgendada: params.dataAgendada || new Date(),
      contexto: params.contexto || null,
    });

    console.log(
      `[Queue] Envio #${envio.id} agendado para ${params.telefone} em ${params.dataAgendada}`,
    );

    // Tentar processar imediatamente (sem esperar próximo ciclo da fila)
    if (envio.dataAgendada <= new Date()) {
      setImmediate(async () => {
        try {
          const { LogEnvio } = require("../models");
          await processarEnvio(envio, LogEnvio);
        } catch (e) {
          console.warn(
            `[Queue] Falha no disparo imediato #${envio.id}:`,
            e.message,
          );
        }
      });
    }

    return envio;
  } catch (err) {
    console.error("[Queue] Erro ao agendar envio:", err.message);
    return null;
  }
}

/**
 * Para o agendador (útil em testes).
 */
function pararAgendador() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Queue] Agendador parado");
  }
}

module.exports = {
  iniciarAgendador,
  agendarEnvio,
  pararAgendador,
  processarFila,
};
