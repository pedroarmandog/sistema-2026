/**
 * WhatsApp Service
 * ----------------
 * Gerencia a conexão com o WhatsApp via whatsapp-web.js.
 * - Suporte a múltiplas empresas (SaaS) usando empresaId como chave.
 * - Sessões persistidas no sistema de arquivos (LocalAuth) + status no banco.
 * - Emite eventos para o frontend via Server-Sent Events (SSE).
 * - Anti-spam: delay aleatório entre envios + limite por minuto.
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");

// Mapa de clientes WhatsApp por empresaId
const clientsMap = new Map();

// Mapa de listeners SSE por empresaId: Set de res (response objects)
const sseListeners = new Map();

// Contador anti-spam: mensagens enviadas no último minuto
const spamCounter = new Map(); // empresaId -> { count, resetAt }

const MAX_MSG_POR_MINUTO = 10;
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 10000;

// Diretório para armazenar sessões locais
const SESSION_DIR = path.join(__dirname, "../../tmp/whatsapp-sessions");

/**
 * Retorna delay aleatório entre MIN_DELAY_MS e MAX_DELAY_MS
 */
function delayAleatorio() {
  return new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1)) +
        MIN_DELAY_MS,
    ),
  );
}

/**
 * Verifica e incrementa contador anti-spam.
 * @returns {boolean} true se pode enviar, false se limite atingido
 */
function verificarAntiSpam(empresaId) {
  const agora = Date.now();
  const chave = String(empresaId);
  const atual = spamCounter.get(chave);

  if (!atual || agora > atual.resetAt) {
    spamCounter.set(chave, { count: 1, resetAt: agora + 60000 });
    return true;
  }

  if (atual.count >= MAX_MSG_POR_MINUTO) {
    return false;
  }

  atual.count++;
  return true;
}

/**
 * Emite evento SSE para todos os listeners de uma empresa.
 */
function emitirSSE(empresaId, evento, dados) {
  const listeners = sseListeners.get(String(empresaId));
  if (!listeners || listeners.size === 0) return;

  const payload = `data: ${JSON.stringify({ evento, ...dados })}\n\n`;

  for (const res of listeners) {
    try {
      res.write(payload);
    } catch (e) {
      listeners.delete(res);
    }
  }
}

/**
 * Adiciona listener SSE para uma empresa.
 */
function adicionarListenerSSE(empresaId, res) {
  const chave = String(empresaId);
  if (!sseListeners.has(chave)) {
    sseListeners.set(chave, new Set());
  }
  sseListeners.get(chave).add(res);

  // Remover listener quando a conexão fechar
  res.on("close", () => {
    const set = sseListeners.get(chave);
    if (set) set.delete(res);
  });
}

/**
 * Mata processos Chrome/Chromium headless zumbis do Puppeteer.
/**
 * Mata SOMENTE processos Chrome headless do Puppeteer.
 * Identificados pelo argumento --disable-dev-shm-usage, exclusivo da nossa config.
 * NÃO afeta o Chrome do usuário (que não usa essa flag).
 */
function matarChromeZumbis() {
  try {
    if (process.platform === "win32") {
      // Filtra apenas Chrome com --disable-dev-shm-usage (flag exclusiva do Puppeteer headless)
      // Isso NÃO afeta o Chrome normal do usuário
      spawnSync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Get-WmiObject Win32_Process -Filter \"name='chrome.exe'\" | Where-Object { $_.CommandLine -like '*disable-dev-shm-usage*' } | ForEach-Object { $_.Terminate() } | Out-Null",
        ],
        { stdio: "ignore" },
      );
    } else {
      spawnSync(
        "sh",
        ["-c", "pkill -f 'chrome.*disable-dev-shm-usage' || true"],
        { stdio: "ignore" },
      );
    }
    console.log("[WhatsApp] Chrome Puppeteer zumbis eliminados (se havia).");
  } catch (_) {
    // silencioso
  }
}

/**
 * Inicializa o cliente WhatsApp para uma empresa.
 * Se já existir cliente conectado, retorna o existente.
 */
async function inicializarCliente(empresaId) {
  const chave = String(empresaId);

  // Se já existe e está pronto, retornar
  if (clientsMap.has(chave)) {
    const existente = clientsMap.get(chave);
    if (existente.status === "conectado") {
      return { status: "ja_conectado" };
    }
    if (existente.status === "aguardando_qr") {
      return { status: "aguardando_qr" };
    }
    // Destruir cliente antigo antes de recriar
    try {
      await existente.client.destroy();
    } catch (_) {}
    clientsMap.delete(chave);
  }

  // Garantir diretório de sessões
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  // Obter caminho do Chromium correto
  let executablePath;
  try {
    executablePath = require("puppeteer").executablePath();
  } catch (_) {
    executablePath = undefined;
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `empresa_${chave}`,
      dataPath: SESSION_DIR,
    }),
    puppeteer: {
      headless: true,
      executablePath,
      handleSIGINT: false,
      handleSIGTERM: false,
      handleSIGHUP: false,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
      ],
    },
  });

  // Estado local do cliente
  const estado = {
    client,
    status: "inicializando",
    qrBase64: null,
    numero: null,
  };

  clientsMap.set(chave, estado);

  // Evento: QR Code gerado
  client.on("qr", async (qr) => {
    console.log(`[WhatsApp][empresa:${chave}] QR Code gerado`);
    estado.status = "aguardando_qr";

    // Converter QR para imagem base64
    try {
      const qrBase64 = await QRCode.toDataURL(qr);
      estado.qrBase64 = qrBase64;

      // Salvar status no banco
      await atualizarStatusNoBanco(chave, "aguardando_qr", null);

      // Emitir para frontend via SSE
      emitirSSE(chave, "qr", { qrBase64 });
    } catch (err) {
      console.error("[WhatsApp] Erro ao gerar QR base64:", err.message);
    }
  });

  // Evento: Auth failure
  client.on("auth_failure", (msg) => {
    console.error(`[WhatsApp][empresa:${chave}] Falha de autenticação:`, msg);
    estado.status = "erro";
    emitirSSE(chave, "erro", { mensagem: `Falha de autenticação: ${msg}` });
    clientsMap.delete(chave);
  });

  // Evento: Mudança de estado (CONFLICT, UNLAUNCHED, etc)
  client.on("change_state", (state) => {
    console.log(`[WhatsApp][empresa:${chave}] Mudança de estado:`, state);
  });

  // Evento: Autenticado
  client.on("authenticated", () => {
    console.log(`[WhatsApp][empresa:${chave}] Autenticado com sucesso`);
    estado.status = "autenticado";
  });

  // Evento: Pronto (conectado)
  client.on("ready", async () => {
    console.log(`[WhatsApp][empresa:${chave}] Cliente pronto e conectado`);
    estado.status = "conectado";
    estado.qrBase64 = null;

    try {
      const info = client.info;
      const numero = info && info.wid ? info.wid.user : null;
      estado.numero = numero;

      await atualizarStatusNoBanco(chave, "conectado", numero);
      emitirSSE(chave, "conectado", { numero });

      // Registrar log
      await registrarLog(
        chave,
        null,
        "conectado",
        { numero },
        `WhatsApp conectado: ${numero}`,
      );
    } catch (err) {
      console.error("[WhatsApp] Erro no evento ready:", err.message);
    }
  });

  // Evento: Desconectado
  client.on("disconnected", async (reason) => {
    console.warn(`[WhatsApp][empresa:${chave}] Desconectado: ${reason}`);
    estado.status = "desconectado";
    estado.qrBase64 = null;
    estado.numero = null;

    await atualizarStatusNoBanco(chave, "desconectado", null);
    emitirSSE(chave, "desconectado", { motivo: reason });
    await registrarLog(
      chave,
      null,
      "desconectado",
      { reason },
      `WhatsApp desconectado: ${reason}`,
    );

    clientsMap.delete(chave);
  });

  // Inicializar cliente (abre o browser)
  client.initialize().catch((err) => {
    const msg = err && err.message ? err.message : String(err);
    // TargetCloseError é normal durante a navegação pós-auth — apenas logar
    if (
      msg.includes("Target closed") ||
      msg.includes("TargetCloseError") ||
      msg.includes("Session closed") ||
      msg.includes("Protocol error")
    ) {
      console.warn(
        `[WhatsApp][empresa:${chave}] Transição de página (normal):`,
        msg,
      );
      return;
    }
    console.error(`[WhatsApp][empresa:${chave}] Erro ao inicializar:`, msg);
    estado.status = "erro";
    emitirSSE(chave, "erro", { mensagem: msg });
    clientsMap.delete(chave);
  });

  return { status: "inicializando" };
}

/**
 * Obtém o status atual da sessão de uma empresa.
 */
function obterStatus(empresaId) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);

  if (!estado) return { status: "desconectado", numero: null, qrBase64: null };

  return {
    status: estado.status,
    numero: estado.numero,
    qrBase64: estado.status === "aguardando_qr" ? estado.qrBase64 : null,
  };
}

/**
 * Desconecta o WhatsApp de uma empresa.
 */
async function desconectar(empresaId) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);

  if (!estado) return;

  try {
    await estado.client.logout();
    await estado.client.destroy();
  } catch (_) {}

  clientsMap.delete(chave);
  await atualizarStatusNoBanco(chave, "desconectado", null);
  emitirSSE(chave, "desconectado", { motivo: "logout_manual" });
}

/**
 * Envia uma mensagem de texto (com delay anti-spam).
 * @param {string} empresaId
 * @param {string} telefone - formato: 5527999104837
 * @param {string} texto
 * @param {string|null} imagemPath - caminho absoluto da imagem (opcional)
 * @returns {{ sucesso: boolean, erro?: string }}
 */
async function enviarMensagem(empresaId, telefone, texto, imagemPath = null) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);

  if (!estado || estado.status !== "conectado") {
    return { sucesso: false, erro: "WhatsApp não está conectado" };
  }

  // Verificar anti-spam
  if (!verificarAntiSpam(chave)) {
    return {
      sucesso: false,
      erro: "Limite de mensagens por minuto atingido (anti-spam)",
    };
  }

  // Delay aleatório (simula comportamento humano)
  await delayAleatorio();

  // Gerar variantes do número (com e sem nono dígito) para fallback
  const numerosParaTentar = gerarVariantesNumero(telefone);

  for (const numeroFormatado of numerosParaTentar) {
    try {
      console.log(`[WhatsApp] Tentando enviar para ${numeroFormatado}...`);

      if (imagemPath && fs.existsSync(imagemPath)) {
        const { MessageMedia } = require("whatsapp-web.js");
        const media = MessageMedia.fromFilePath(imagemPath);
        await estado.client.sendMessage(numeroFormatado, media, {
          caption: texto,
        });
      } else {
        await estado.client.sendMessage(numeroFormatado, texto);
      }

      console.log(`[WhatsApp] ✅ Mensagem enviada para ${numeroFormatado}`);
      return { sucesso: true };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`[WhatsApp] Falha com ${numeroFormatado}: ${msg}`);
      // Se for o último número da lista, retornar erro
      if (numeroFormatado === numerosParaTentar[numerosParaTentar.length - 1]) {
        console.error(
          `[WhatsApp] Todas as variantes falharam para ${telefone}`,
        );
        return { sucesso: false, erro: msg };
      }
      // Senão, tentar próxima variante
    }
  }

  return { sucesso: false, erro: "Não foi possível enviar a mensagem" };
}

/**
 * Gera variantes de um número brasileiro para tentar o envio.
 * O WhatsApp usa formatos diferentes dependendo da operadora/região.
 * Retorna array de números formatados para tentar em ordem.
 */
function gerarVariantesNumero(telefone) {
  let limpo = String(telefone).replace(/\D/g, "");

  // Adicionar código do país se não tiver
  if (!limpo.startsWith("55")) {
    limpo = "55" + limpo;
  }

  const variantes = new Set();

  // Número principal
  variantes.add(`${limpo}@c.us`);

  // Lógica do nono dígito para Brasil: 55 + DDD(2) + número
  // Ex: 5531984730333 → ddd=31, numero=984730333 (9 dígitos com 9)
  //     5531 84730333 → ddd=31, numero=84730333 (8 dígitos sem 9)
  if (limpo.startsWith("55") && limpo.length === 13) {
    // 13 dígitos = 55 + DDD + 9 dígitos (com nono) → criar variante sem nono
    const semNono = limpo.substring(0, 4) + limpo.substring(5); // remove o 9
    variantes.add(`${semNono}@c.us`);
  } else if (limpo.startsWith("55") && limpo.length === 12) {
    // 12 dígitos = 55 + DDD + 8 dígitos (sem nono) → criar variante com nono
    const comNono = limpo.substring(0, 4) + "9" + limpo.substring(4);
    variantes.add(`${comNono}@c.us`);
  }

  return [...variantes];
}

/**
 * Formata número de telefone para o formato WhatsApp (@c.us).
 */
function formatarNumero(telefone) {
  // Remove tudo que não é dígito
  let limpo = String(telefone).replace(/\D/g, "");
  if (!limpo.startsWith("55")) limpo = "55" + limpo;
  return `${limpo}@c.us`;
}

/**
 * Substitui variáveis dinâmicas no template.
 */
function substituirVariaveis(template, variaveis) {
  let resultado = template;

  const mapa = {
    "{nome_tutor}": variaveis.nomeTutor || variaveis.nome_tutor || "",
    "{nome_pet}": variaveis.nomePet || variaveis.nome_pet || "",
    "{data_agendamento}":
      variaveis.dataAgendamento || variaveis.data_agendamento || "",
    "{hora_agendamento}":
      variaveis.horaAgendamento || variaveis.hora_agendamento || "",
    "{servico}": variaveis.servico || "",
    "{nome_empresa}":
      variaveis.nomeEmpresa || variaveis.nome_empresa || "PetHub",
    // suporte ao formato legado do frontend
    "{nometutor}": variaveis.nomeTutor || variaveis.nome_tutor || "",
    "{nomepet}": variaveis.nomePet || variaveis.nome_pet || "",
  };

  for (const [chave, valor] of Object.entries(mapa)) {
    resultado = resultado.split(chave).join(valor);
  }

  return resultado;
}

// ──────────────────────────────────────────────────────────────
// Helpers de banco (lazy require para evitar dependência circular)
// ──────────────────────────────────────────────────────────────

async function atualizarStatusNoBanco(empresaId, status, numero) {
  try {
    const { WhatsappSession } = require("../models");
    const [session] = await WhatsappSession.findOrCreate({
      where: { empresaId: Number(empresaId) },
      defaults: {
        status,
        numero,
        ultimaConexao: status === "conectado" ? new Date() : null,
      },
    });

    await session.update({
      status,
      numero: numero || session.numero,
      ultimaConexao:
        status === "conectado" ? new Date() : session.ultimaConexao,
    });
  } catch (err) {
    console.warn(
      "[WhatsApp] Aviso: não foi possível atualizar status no banco:",
      err.message,
    );
  }
}

async function registrarLog(empresaId, envioId, evento, detalhes, mensagem) {
  try {
    const { LogEnvio } = require("../models");
    await LogEnvio.create({
      empresaId: Number(empresaId),
      envioAgendadoId: envioId || null,
      evento,
      detalhes,
      mensagem,
    });
  } catch (err) {
    console.warn(
      "[WhatsApp] Aviso: não foi possível registrar log:",
      err.message,
    );
  }
}

/**
 * Reconecta automaticamente sessões que estavam ativas antes do servidor reiniciar.
 * Usa os arquivos de sessão salvos em disco pelo LocalAuth.
 * Chamado uma vez no startup do servidor.
 */
async function reconectarSessoesAtivas() {
  try {
    const { WhatsappSession } = require("../models");

    // Matar Chrome zumbis de restartes anteriores antes de reconectar
    matarChromeZumbis();
    // Aguardar um pouco para o SO liberar locks nos arquivos de sessão
    await new Promise((r) => setTimeout(r, 1500));

    // Buscar todas as sessões que estavam conectadas
    const sessoes = await WhatsappSession.findAll({
      where: { status: "conectado" },
    });

    if (sessoes.length === 0) {
      console.log("[WhatsApp] Nenhuma sessão ativa para reconectar.");
      return;
    }

    console.log(
      `[WhatsApp] Reconectando ${sessoes.length} sessão(ões) ativa(s)...`,
    );

    for (const sessao of sessoes) {
      const chave = String(sessao.empresaId);
      // Verificar se os arquivos de sessão existem em disco
      const sessDir = path.join(SESSION_DIR, `session-empresa_${chave}`);
      if (!fs.existsSync(sessDir)) {
        console.warn(
          `[WhatsApp] Arquivos de sessão não encontrados para empresa ${chave}, pulando.`,
        );
        await atualizarStatusNoBanco(chave, "desconectado", null);
        continue;
      }

      console.log(
        `[WhatsApp] Auto-reconectando empresa ${chave} (usando sessão salva)...`,
      );
      // Não aguardar — inicializa em background para não travar o startup
      inicializarCliente(chave).catch((err) => {
        console.warn(
          `[WhatsApp] Falha ao reconectar empresa ${chave}:`,
          err.message,
        );
      });
    }
  } catch (err) {
    console.warn("[WhatsApp] Erro ao reconectar sessões ativas:", err.message);
  }
}

module.exports = {
  inicializarCliente,
  obterStatus,
  desconectar,
  enviarMensagem,
  substituirVariaveis,
  adicionarListenerSSE,
  emitirSSE,
  registrarLog,
  reconectarSessoesAtivas,
};
