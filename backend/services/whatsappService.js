/**
 * WhatsApp Service
 * ----------------
 * Gerencia a conexão com o WhatsApp via whatsapp-web.js.
 * - Suporte a múltiplas empresas (SaaS) usando empresaId como chave.
 * - Sessões persistidas no sistema de arquivos (LocalAuth) + status no banco.
 * - Emite eventos para o frontend via Server-Sent Events (SSE).
 * - Anti-spam: delay aleatório entre envios + limite por minuto.
 */

// Não forçar variáveis de ambiente aqui — respeitar o que o ambiente fornece

const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const util = require("util");

// Debug: identificar qual arquivo foi carregado e PID do processo
console.log(
  `[WhatsApp] carregado: ${__filename} pid=${process.pid} NODE_ENV=${process.env.NODE_ENV || "(undef)"} CHROME_PATH=${process.env.CHROME_PATH || "(undef)"}`,
);

// Mapa de clientes WhatsApp por empresaId
const clientsMap = new Map();

// Mapa de listeners SSE por empresaId: Set de res (response objects)
const sseListeners = new Map();

// Controle de retry automático após auth_failure (evita loop infinito)
const retryCount = new Map(); // empresaId -> number
const MAX_AUTO_RETRY = 1;

// Contador anti-spam: mensagens enviadas no último minuto
const spamCounter = new Map(); // empresaId -> { count, resetAt }
const MAX_MSG_POR_MINUTO = 10;
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 10000;

// Diretório para armazenar sessões locais (LocalAuth)
const SESSION_DIR = path.join(__dirname, "../../tmp/whatsapp-sessions");

// (fragment removido — validação será feita no fluxo de inicialização do cliente)

/**
 * Retorna o diretório de sessão no disco para uma empresa, se existir.
 */
function getSessionDirForEmpresa(empresaId) {
  const chave = String(empresaId);
  const candidates = [
    path.join(SESSION_DIR, `empresa_${chave}`),
    path.join(SESSION_DIR, `session-empresa_${chave}`),
    path.join(SESSION_DIR, `empresa-${chave}`),
  ];
  return (
    candidates.find((d) => fs.existsSync(d)) ||
    path.join(SESSION_DIR, `empresa_${chave}`)
  );
}

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
    if (
      existente.status === "inicializando" ||
      existente.status === "autenticado"
    ) {
      // Verificar se o browser ainda está vivo; se travou, limpar e recriar
      let browserVivo = false;
      try {
        const browser = existente.client && existente.client.pupBrowser;
        browserVivo = browser && browser.isConnected();
      } catch (_) {}
      if (browserVivo) {
        return { status: existente.status };
      }
      // Browser morto ou nunca iniciou — limpar e recriar
      console.warn(
        `[WhatsApp][${chave}] Status "${existente.status}" mas browser morto. Recriando...`,
      );
    }
    // Destruir cliente antigo antes de recriar
    try {
      await existente.client.destroy();
    } catch (_) {}
    clientsMap.delete(chave);
  }

  // Garantir diretório de sessões
  fs.mkdirSync(SESSION_DIR, { recursive: true });

  // Remover SingletonLock de Chrome zumbi (se existir) para evitar erro "browser is already running"
  const possibleSessionDirs = [
    path.join(SESSION_DIR, `session-empresa_${chave}`),
    path.join(SESSION_DIR, `empresa_${chave}`),
  ];
  for (const d of possibleSessionDirs) {
    const lockFile = path.join(d, "SingletonLock");
    try {
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
        console.log(`[WhatsApp][${chave}] Removido SingletonLock zumbi`);
      }
    } catch (_) {}
  }

  // Obter caminho do Chromium correto (debug detalhado)
  // Prioridade (segura): 1) CHROME_PATH (somente se existir e for executável)
  // 2) detector local (puppeteerLauncher) 3) binário do sistema (usr/bin...)
  // 4) puppeteer.executablePath() (somente se existir e for executável)
  let executablePath = undefined;
  let selectedFrom = null;
  let envPath = process.env.CHROME_PATH || null;
  let launcherPath = null;
  let puppeteerPath = null;
  try {
    // 1) CHROME_PATH — validar existência e permissão de execução
    if (envPath) {
      try {
        fs.accessSync(envPath, fs.constants.X_OK);
        executablePath = envPath;
        selectedFrom = "env";
      } catch (err) {
        console.warn(
          `[WhatsApp][${chave}] CHROME_PATH definido (${envPath}) mas não é executável/visível — ignorando. ${err && err.message}`,
        );
        envPath = null;
        // Remover variável de ambiente obsoleta para evitar que bibliotecas
        // dependentes (ex: whatsapp-web.js) leiam um caminho inválido no require-time
        try {
          if (process.env.CHROME_PATH) {
            delete process.env.CHROME_PATH;
            console.log(
              `[WhatsApp][${chave}] process.env.CHROME_PATH inválido removido`,
            );
          }
        } catch (_) {}
      }
    }

    // 2) Detector local (puppeteerLauncher)
    if (!executablePath) {
      try {
        const launcher = require("./puppeteerLauncher");
        launcherPath = launcher.findChromePath();
        if (launcherPath) {
          try {
            fs.accessSync(launcherPath, fs.constants.X_OK);
            executablePath = launcherPath;
            selectedFrom = "launcher";
          } catch (err) {
            console.warn(
              `[WhatsApp][${chave}] Launcher detectou ${launcherPath} mas não é executável — ignorando. ${err && err.message}`,
            );
            launcherPath = null;
          }
        }
      } catch (err) {
        launcherPath = null;
      }
    }

    // 3) Preferir binário do sistema (caso o launcher não tenha retornado)
    if (!executablePath) {
      const systemCandidates = [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium-browser",
        "/usr/bin/chromium",
        "/snap/bin/chromium",
      ];
      for (const p of systemCandidates) {
        try {
          fs.accessSync(p, fs.constants.X_OK);
          executablePath = p;
          selectedFrom = "system";
          break;
        } catch (_) {
          // ignorar candidatos não executáveis
        }
      }
    }

    // 4) Por fim, tentar puppeteer.executablePath() (somente se for executável)
    if (!executablePath) {
      try {
        const p = require("puppeteer");
        if (typeof p.executablePath === "function") {
          puppeteerPath = p.executablePath();
          try {
            if (puppeteerPath) {
              fs.accessSync(puppeteerPath, fs.constants.X_OK);
              executablePath = puppeteerPath;
              selectedFrom = "puppeteer";
            }
          } catch (_) {
            puppeteerPath = null;
          }
        }
      } catch (err) {
        puppeteerPath = null;
      }
    }
  } catch (e) {
    executablePath = undefined;
    selectedFrom = null;
  }

  // Verificação final: testar se o binário realmente pode ser executado (ex: --version)
  try {
    if (executablePath) {
      try {
        const check = spawnSync(executablePath, ["--version"], {
          encoding: "utf8",
          timeout: 3000,
        });
        if (check.error || check.status !== 0) {
          console.warn(
            `[WhatsApp][${chave}] Falha no teste do binário ${executablePath}: ${check.error ? check.error.message : check.stderr || check.stdout}`,
          );
          executablePath = undefined;
          selectedFrom = null;
        } else {
          console.log(
            `[WhatsApp][${chave}] Exec test ok: ${check.stdout || check.stderr}`,
          );
        }
      } catch (err) {
        console.warn(
          `[WhatsApp][${chave}] Erro ao testar executável ${executablePath}: ${err && err.message}`,
        );
        executablePath = undefined;
        selectedFrom = null;
      }
    }
  } catch (_) {}

  // Mostrar debug de caminhos candidatos
  try {
    const resolvedWhatsApp = require.resolve("whatsapp-web.js");
    console.log(
      `[WhatsApp][${chave}] execPath debug -> env:${envPath} launcher:${launcherPath} puppeteer:${puppeteerPath} selected:${executablePath || "(nenhum)"} source:${selectedFrom} whatsappModule:${resolvedWhatsApp}`,
    );
  } catch (_) {
    console.log(
      `[WhatsApp][${chave}] execPath debug -> env:${envPath} launcher:${launcherPath} puppeteer:${puppeteerPath} selected:${executablePath || "(nenhum)"} source:${selectedFrom}`,
    );
  }

  // Forçar fallback para /usr/bin/google-chrome se nenhum executável válido foi encontrado
  if (!executablePath) {
    try {
      const fallback = "/usr/bin/google-chrome";
      if (fs.existsSync(fallback)) {
        try {
          const checkFallback = spawnSync(fallback, ["--version"], {
            encoding: "utf8",
            timeout: 3000,
          });
          if (!checkFallback.error && checkFallback.status === 0) {
            executablePath = fallback;
            selectedFrom = "forced-google-chrome";
            console.log(
              `[WhatsApp][${chave}] Forçando fallback executablePath -> ${fallback}`,
            );
          } else {
            console.warn(
              `[WhatsApp][${chave}] Fallback ${fallback} presente mas falhou no teste: ${checkFallback.error ? checkFallback.error.message : checkFallback.stderr || checkFallback.stdout}`,
            );
          }
        } catch (e) {
          // silencioso
        }
      }
    } catch (_) {}
  }

  // Disparador (chave "disp_X") abre Chrome visível; marketing automático roda headless
  const isDisparador = chave.startsWith("disp_");

  const puppeteerOptions = {
    headless: !isDisparador,

    // ✅ Usa o caminho que você calculou acima
    executablePath: executablePath || undefined,

    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ],
  };

  console.log(
    `[WhatsApp][${chave}] puppeteerOptions: ${util.inspect(puppeteerOptions, {
      depth: 2,
    })}`,
  );

  // Requerir whatsapp-web.js APÓS garantir CHROME_PATH/executablePath
  try {
    if (executablePath) {
      process.env.CHROME_PATH = executablePath;
    } else {
      // Garantir que não deixamos uma CHROME_PATH inválida no ambiente
      try {
        if (process.env.CHROME_PATH) {
          delete process.env.CHROME_PATH;
          console.log(
            `[WhatsApp][${chave}] Nenhum executável válido encontrado — CHROME_PATH ambiente removido`,
          );
        }
      } catch (_) {}
    }
  } catch (_) {}
  const { Client, LocalAuth } = require("whatsapp-web.js");

  // Criar o cliente WhatsApp com as opções do Puppeteer
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `empresa_${chave}`,
      dataPath: SESSION_DIR,
    }),
    puppeteer: puppeteerOptions,
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

  // Evento: Auth failure — sessão expirada ou corrompida
  client.on("auth_failure", async (msg) => {
    console.error(`[WhatsApp][empresa:${chave}] Falha de autenticação:`, msg);
    estado.status = "erro";
    clientsMap.delete(chave);

    // Destruir cliente antigo
    try {
      await client.destroy();
    } catch (_) {}

    // Limpar sessão corrompida do disco para forçar novo QR
    const sessDir = limparSessaoDoDisco(chave);
    console.log(
      `[WhatsApp][empresa:${chave}] Sessão inválida deletada: ${sessDir}`,
    );
    await atualizarStatusNoBanco(chave, "desconectado", null);

    // Auto-retry UMA vez (gera QR novo limpo)
    const retries = retryCount.get(chave) || 0;
    if (retries < MAX_AUTO_RETRY) {
      retryCount.set(chave, retries + 1);
      console.log(
        `[WhatsApp][empresa:${chave}] Sessão inválida, recriando conexão (retry ${retries + 1})...`,
      );
      emitirSSE(chave, "status", {
        status: "inicializando",
        mensagem: "Sessão expirada. Gerando novo QR Code...",
      });
      inicializarCliente(empresaId).catch((e) => {
        console.error(
          `[WhatsApp][empresa:${chave}] Falha no auto-retry:`,
          e.message,
        );
        emitirSSE(chave, "erro", {
          mensagem: "Falha ao reconectar. Tente novamente.",
        });
      });
    } else {
      console.warn(
        `[WhatsApp][empresa:${chave}] Max auto-retries atingido. Aguardando ação manual.`,
      );
      retryCount.delete(chave);
      emitirSSE(chave, "erro", {
        mensagem: "Sessão expirada. Clique em conectar novamente.",
      });
    }
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
    retryCount.delete(chave); // Reset retry counter on success

    try {
      const info = client.info;
      const numero = info && info.wid ? info.wid.user : null;
      estado.numero = numero;

      await atualizarStatusNoBanco(chave, "conectado", numero);
      emitirSSE(chave, "conectado", { numero });

      // Fechar abas extras (about:blank) que o Puppeteer abre
      try {
        const browser = client.pupBrowser;
        // debug: inspecionar processo do browser lançado
        try {
          if (browser && typeof browser.process === "function") {
            const proc = browser.process();
            console.log(
              `[WhatsApp][${chave}] Browser process spawnfile: ${(proc && (proc.spawnfile || proc.spawnpath || proc.execPath)) || "(unknown)"} args: ${proc && proc.spawnargs ? proc.spawnargs.join(" ") : "(none)"}`,
            );
          }
        } catch (e) {
          console.log(
            `[WhatsApp][${chave}] Debug: falha ao inspecionar browser.process(): ${e && e.message}`,
          );
        }
        if (browser) {
          const pages = await browser.pages();
          for (const page of pages) {
            const url = page.url();
            if (url === "about:blank" || url === "chrome://newtab/") {
              await page.close().catch(() => {});
            }
          }
        }
      } catch (_) {}

      // Registrar log
      await registrarLog(
        chave,
        null,
        "conectado",
        { numero },
        `WhatsApp conectado: ${numero}`,
      );
      // Salvar informações da sessão (caminho em disco) no banco para reuso
      try {
        const sessDir = getSessionDirForEmpresa(chave);
        await salvarSessionInfoNoBanco(chave, { sessionDir: sessDir });
      } catch (e) {
        console.warn(
          "[WhatsApp] falha ao salvar session info no DB",
          e && e.message,
        );
      }
    } catch (err) {
      console.error("[WhatsApp] Erro no evento ready:", err.message);
    }
  });

  // Evento: Desconectado
  client.on("disconnected", async (reason) => {
    console.warn(`[WhatsApp][empresa:${chave}] Desconectado: ${reason}`);
    // Ignorar se já foi limpo (ex: reinicialização automática após detached frame)
    const atual = clientsMap.get(chave);
    if (!atual || atual.client !== client) {
      console.log(
        `[WhatsApp][empresa:${chave}] Evento disconnected ignorado (cliente já substituído).`,
      );
      return;
    }
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
  console.log(
    `[WhatsApp][empresa:${chave}] Iniciando browser Puppeteer (headless: ${!isDisparador})...`,
  );
  client
    .initialize()
    .then(() => {
      console.log(
        `[WhatsApp][empresa:${chave}] initialize() resolveu com sucesso`,
      );
    })
    .catch((err) => {
      const msg = err && err.message ? err.message : String(err);
      console.error(`[WhatsApp][empresa:${chave}] initialize() catch: ${msg}`);
      // TargetCloseError / frame detached é normal durante a navegação pós-auth — apenas logar
      if (
        msg.includes("Target closed") ||
        msg.includes("TargetCloseError") ||
        msg.includes("Session closed") ||
        msg.includes("Protocol error") ||
        msg.includes("detached Frame") ||
        msg.includes("Navigating frame") ||
        msg.includes("frame was detached") ||
        msg.includes("Execution context was destroyed")
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

  // Timeout de segurança: se não conectar em 90s, limpar para evitar Chrome zumbi
  setTimeout(async () => {
    const atual = clientsMap.get(chave);
    if (atual && atual === estado && atual.status !== "conectado") {
      console.warn(
        `[WhatsApp][empresa:${chave}] Timeout de 90s — status ainda "${atual.status}". Limpando...`,
      );
      try {
        await client.destroy();
      } catch (_) {}
      clientsMap.delete(chave);
      await atualizarStatusNoBanco(chave, "desconectado", null);
      // Notificar frontend via SSE que deu timeout
      emitirSSE(chave, "erro", {
        mensagem: "Timeout: não foi possível conectar. Tente novamente.",
      });
    }
  }, 90000);

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
 * Remove os arquivos de sessão do disco para uma empresa.
 * Usado quando a sessão está corrompida/expirada.
 * @returns {string|null} caminho removido, ou null se não encontrou
 */
function limparSessaoDoDisco(empresaId) {
  const chave = String(empresaId);
  const candidates = [
    path.join(SESSION_DIR, `session-empresa_${chave}`),
    path.join(SESSION_DIR, `empresa_${chave}`),
    path.join(SESSION_DIR, `empresa-${chave}`),
  ];

  for (const d of candidates) {
    if (fs.existsSync(d)) {
      try {
        fs.rmSync(d, { recursive: true, force: true });
        console.log(`[WhatsApp][${chave}] Sessão removida do disco: ${d}`);
        return d;
      } catch (err) {
        console.warn(
          `[WhatsApp][${chave}] Falha ao remover ${d}:`,
          err.message,
        );
      }
    }
  }
  return null;
}

/**
 * Limpa completamente a sessão de uma empresa (memória + disco + banco).
 * Usado para forçar nova conexão quando a sessão está corrompida.
 */
async function limparSessao(empresaId) {
  const chave = String(empresaId);

  // 1. Destruir cliente em memória
  const estado = clientsMap.get(chave);
  if (estado) {
    try {
      await estado.client.destroy();
    } catch (_) {}
    clientsMap.delete(chave);
  }

  // 2. Remover arquivos de sessão do disco
  const removido = limparSessaoDoDisco(chave);

  // 3. Atualizar banco para desconectado
  await atualizarStatusNoBanco(chave, "desconectado", null);

  // 4. Resetar retry counter
  retryCount.delete(chave);

  console.log(
    `[WhatsApp][${chave}] Sessão completamente limpa. Removido: ${removido || "nenhum arquivo"}`,
  );
  return { limpo: true, sessaoRemovida: removido };
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
        const ext = path.extname(imagemPath).toLowerCase();
        const mimeTypes = {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".webp": "image/webp",
        };
        const mime = mimeTypes[ext] || null;
        let media;
        if (mime) {
          // Forçar mime type correto para enviar como foto (não documento)
          const data = fs.readFileSync(imagemPath).toString("base64");
          media = new MessageMedia(mime, data, path.basename(imagemPath));
        } else {
          media = MessageMedia.fromFilePath(imagemPath);
        }
        await estado.client.sendMessage(numeroFormatado, media, {
          caption: texto,
          sendMediaAsSticker: false,
        });
      } else {
        await estado.client.sendMessage(numeroFormatado, texto);
      }

      console.log(`[WhatsApp] ✅ Mensagem enviada para {numeroFormatado}`);
      return { sucesso: true };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      console.warn(`[WhatsApp] Falha com ${numeroFormatado}: ${msg}`);

      // Erros fatais de sessão — a sessão está irrecuperável (frame morto).
      // Destruir e reinicializar automaticamente.
      if (
        msg.includes("detached Frame") ||
        msg.includes("Execution context was destroyed") ||
        msg.includes("Target closed") ||
        msg.includes("Session closed")
      ) {
        console.warn(
          `[WhatsApp] Sessão quebrada para empresa ${chave}, reinicializando...`,
        );
        // Remover listeners do cliente antigo para evitar que o evento "disconnected"
        // atualize o banco para "desconectado" enquanto reinicializamos
        try {
          estado.client.removeAllListeners("disconnected");
        } catch (_) {}
        // Limpar da memória (mas NÃO atualizar banco — vamos reconectar)
        estado.status = "reinicializando";
        try {
          await estado.client.destroy();
        } catch (_) {}
        clientsMap.delete(chave);
        // Reinicializar em background (não bloqueia o retorno)
        // A sessão LocalAuth em disco permite reconectar sem QR
        inicializarCliente(empresaId).catch((e) =>
          console.error(
            `[WhatsApp] Falha ao reinicializar empresa ${chave}:`,
            e.message,
          ),
        );
        return {
          sucesso: false,
          erro: "Sessão WhatsApp reinicializando automaticamente. Envio será retentado.",
        };
      }

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
    "{produto}": variaveis.produto || "",
    "{data_renovacao}":
      variaveis.dataRenovacao || variaveis.data_renovacao || "",
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
    const chaveStr = String(empresaId);
    const isDisp = chaveStr.startsWith("disp_");
    const numericId = isDisp
      ? Number(chaveStr.replace("disp_", ""))
      : Number(empresaId);

    if (isDisp) {
      // Disparador: buscar instância pelo ID direto
      const session = await WhatsappSession.findByPk(numericId);
      if (session) {
        await session.update({
          status,
          numero: numero || session.numero,
          ultimaConexao:
            status === "conectado" ? new Date() : session.ultimaConexao,
        });
      }
    } else {
      // Sistema principal: buscar por empresaId
      const [session] = await WhatsappSession.findOrCreate({
        where: { empresaId: numericId },
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
    }
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
    const chaveStr = String(empresaId);
    const numericId = chaveStr.startsWith("disp_")
      ? Number(chaveStr.replace("disp_", ""))
      : Number(empresaId);
    await LogEnvio.create({
      empresaId: numericId || 0,
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

async function salvarSessionInfoNoBanco(empresaId, info) {
  try {
    const { WhatsappSession } = require("../models");
    const chaveStr = String(empresaId);
    const isDisp = chaveStr.startsWith("disp_");
    const numericId = isDisp
      ? Number(chaveStr.replace("disp_", ""))
      : Number(empresaId);

    let sess;
    if (isDisp) {
      sess = await WhatsappSession.findByPk(numericId);
    } else {
      sess = await WhatsappSession.findOne({ where: { empresaId: numericId } });
    }
    if (!sess) return;
    await sess.update({ sessionData: JSON.stringify(info) });
  } catch (err) {
    console.warn(
      "[WhatsApp] Aviso: não foi possível salvar sessionData no banco:",
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

    // Buscar todas as sessões de marketing (não apenas "conectado" — podem ter crashado como "desconectado")
    // Se existe sessão em disco, vale a pena tentar reconectar
    const { Op } = require("sequelize");
    // Buscar sessões de marketing que estavam CONECTADAS antes do restart
    // Só tenta reconectar se já tinha auth válida (evita gerar QR code headless sem ninguém ver)
    const sessoes = await WhatsappSession.findAll({
      where: {
        [Op.or]: [{ nome: null }, { nome: "" }],
        empresaId: { [Op.gt]: 0 },
        status: "conectado",
      },
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
      // LocalAuth cria a pasta com o clientId dentro de SESSION_DIR, por exemplo
      // SESSION_DIR/empresa_<chave>. Manter compatibilidade com variações antigas.
      const candidateDirs = [
        path.join(SESSION_DIR, `empresa_${chave}`),
        path.join(SESSION_DIR, `session-empresa_${chave}`),
        path.join(SESSION_DIR, `empresa-${chave}`),
      ];

      const sessDir = candidateDirs.find((d) => fs.existsSync(d));
      if (!sessDir) {
        console.warn(
          `[WhatsApp] Arquivos de sessão não encontrados para empresa ${chave}, pulando. Searched: ${candidateDirs.join(", ")}`,
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

/**
 * Verifica se o cliente WhatsApp está conectado em memória
 * E se o browser Puppeteer ainda está aberto.
 */
function isConectado(empresaId) {
  const chave = String(empresaId);
  const estado = clientsMap.get(chave);
  if (!estado || estado.status !== "conectado") return false;

  // Verificar se o browser Puppeteer ainda está vivo
  try {
    const browser = estado.client.pupBrowser;
    if (browser && !browser.isConnected()) {
      console.warn(
        `[WhatsApp][${chave}] Browser Puppeteer fechado. Limpando sessão.`,
      );
      estado.status = "desconectado";
      clientsMap.delete(chave);
      return false;
    }
  } catch (_) {
    // Se não conseguir verificar, assume que está ok
  }

  return true;
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
  isConectado,
  limparSessao,
  limparSessaoDoDisco,
};
