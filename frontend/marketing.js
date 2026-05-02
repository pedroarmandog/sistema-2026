// ============================================
// Marketing.js — Módulo de Mensagens Automáticas via WhatsApp
// --------------------------------------------
// Dados 100% persistidos no banco (MySQL).
// SEM localStorage.
// Comunicação em tempo real via Server-Sent Events (SSE).
// ============================================

console.log("[Marketing] Módulo carregado");

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONFIGURAÇÕES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VPS_URL = window.VPS_URL || "https://api.pethubflow.com.br";
const API = VPS_URL + "/api/marketing";

// Obter empresaId do usuário logado (cookie → API → empresas[0])
let EMPRESA_ID = 1; // fallback
let _empresaIdPromise = (async function detectarEmpresaId() {
  try {
    const ca = document.cookie.split(";");
    let usuarioId = null;
    for (const c of ca) {
      const t = c.trim();
      if (t.startsWith("usuarioLogadoId=")) {
        usuarioId = t.substring("usuarioLogadoId=".length);
        break;
      }
    }
    if (!usuarioId) return;
    const r = await fetch(VPS_URL + "/api/usuarios/" + usuarioId);
    if (!r.ok) return;
    const u = await r.json();
    if (!u?.empresas?.length) return;
    const e = u.empresas[0];
    const id =
      typeof e === "number"
        ? e
        : typeof e === "string"
          ? parseInt(e, 10)
          : e?.id || e?.ID || null;
    if (id) {
      EMPRESA_ID = id;
      console.log("[Marketing] empresaId detectado:", EMPRESA_ID);
    }
  } catch (_) {}
})();

// Estado em memória (espelho do banco — não é fonte da verdade)
let _mensagens = []; // array de MensagemAutomatica vinda da API
let _sseSource = null; // EventSource para atualizaÃ§Ãµes em tempo real
let _modalMsgAtualId = null; // ID da mensagem sendo editada/ativada
let _imagemArquivo = null; // Arquivo de imagem selecionado no modal

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INICIALIZAÃ‡ÃƒO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
document.addEventListener("DOMContentLoaded", function () {
  console.log("[Marketing] DOMContentLoaded â€” inicializando...");
  inicializarMarketing();
});

async function inicializarMarketing() {
  // Aguardar detecção do empresaId antes de buscar status/mensagens
  await _empresaIdPromise;
  carregarStatusWhatsapp();
  carregarMensagens();
  conectarSSE();
  iniciarMonitorFilaPendente();
}

// ──────────────────────────────────────────────────
// FILA PENDENTE — alerta + controles manuais
// ──────────────────────────────────────────────────
let _filaPendenteInterval = null;

function iniciarMonitorFilaPendente() {
  verificarFilaPendente();
  _filaPendenteInterval = setInterval(verificarFilaPendente, 15000); // a cada 15s

  // Botões
  const btnUm = document.getElementById("btnFilaEnviarUm");
  const btnTodos = document.getElementById("btnFilaEnviarTodos");
  const btnCancelar = document.getElementById("btnFilaCancelarTodos");

  if (btnUm) btnUm.addEventListener("click", filaEnviarUm);
  if (btnTodos) btnTodos.addEventListener("click", filaEnviarTodos);
  if (btnCancelar) btnCancelar.addEventListener("click", filaCancelarTodos);
}

async function verificarFilaPendente() {
  try {
    const res = await fetch(`${API}/fila-pendente`);
    if (!res.ok) return;
    const data = await res.json();
    const alerta = document.getElementById("filaPendenteAlerta");
    const msg = document.getElementById("filaPendenteMensagem");
    if (!alerta || !msg) return;

    if (data.total > 0) {
      alerta.style.display = "block";
      msg.textContent = `${data.total} mensagem(ns) pendente(s) na fila aguardando envio`;
    } else {
      alerta.style.display = "none";
    }
  } catch (e) {
    // silencioso
  }
}

async function filaEnviarUm() {
  const btn = document.getElementById("btnFilaEnviarUm");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  }
  try {
    const res = await fetch(`${API}/fila-pendente/enviar-um`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.enviado) {
      mostrarNotificacaoFila("Mensagem enviada com sucesso!", "sucesso");
    } else if (data.error) {
      mostrarNotificacaoFila(data.error, "erro");
    } else {
      mostrarNotificacaoFila("Nenhum envio pendente", "info");
    }
  } catch (e) {
    mostrarNotificacaoFila("Erro ao enviar mensagem", "erro");
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar 1';
  }
  verificarFilaPendente();
}

async function filaEnviarTodos() {
  const btn = document.getElementById("btnFilaEnviarTodos");
  if (!(await confirmar("Enviar todas as mensagens pendentes agora?"))) return;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
  }
  try {
    const res = await fetch(`${API}/fila-pendente/enviar-todos`, {
      method: "POST",
    });
    const data = await res.json();
    mostrarNotificacaoFila("Fila processada! Verifique os logs.", "sucesso");
  } catch (e) {
    mostrarNotificacaoFila("Erro ao processar fila", "erro");
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-forward"></i> Enviar Todos';
  }
  verificarFilaPendente();
}

async function filaCancelarTodos() {
  if (
    !(await confirmar(
      "Cancelar todos os envios pendentes? Esta ação não pode ser desfeita.",
    ))
  )
    return;
  const btn = document.getElementById("btnFilaCancelarTodos");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cancelando...';
  }
  try {
    const res = await fetch(`${API}/fila-pendente/cancelar-todos`, {
      method: "POST",
    });
    const data = await res.json();
    mostrarNotificacaoFila(
      `${data.cancelados || 0} envio(s) cancelado(s)`,
      "info",
    );
  } catch (e) {
    mostrarNotificacaoFila("Erro ao cancelar fila", "erro");
  }
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-times-circle"></i> Cancelar Todos';
  }
  verificarFilaPendente();
}

function mostrarNotificacaoFila(texto, tipo) {
  // Remover notificação anterior
  const old = document.getElementById("notifFila");
  if (old) old.remove();

  const cores = {
    sucesso: {
      bg: "#f0fff4",
      border: "#68d391",
      text: "#276749",
      icon: "fa-check-circle",
    },
    erro: {
      bg: "#fff5f5",
      border: "#fc8181",
      text: "#9b2c2c",
      icon: "fa-exclamation-circle",
    },
    info: {
      bg: "#ebf8ff",
      border: "#63b3ed",
      text: "#2b6cb0",
      icon: "fa-info-circle",
    },
  };
  const c = cores[tipo] || cores.info;

  const alerta = document.getElementById("filaPendenteAlerta");
  if (!alerta) return;

  const div = document.createElement("div");
  div.id = "notifFila";
  div.style.cssText = `margin-top: 8px; padding: 10px 14px; background: ${c.bg}; border: 1px solid ${c.border}; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${c.text}; font-weight: 500; animation: fadeIn 0.3s ease;`;
  div.innerHTML = `<i class="fas ${c.icon}"></i> ${texto}`;
  alerta.parentNode.insertBefore(div, alerta.nextSibling);

  setTimeout(() => {
    div.style.opacity = "0";
    div.style.transition = "opacity 0.3s";
    setTimeout(() => div.remove(), 300);
  }, 4000);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STATUS WHATSAPP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function carregarStatusWhatsapp() {
  try {
    const res = await fetch(`${API}/whatsapp/status?empresaId=${EMPRESA_ID}`);
    const data = await res.json();
    atualizarUIWhatsapp(data);
  } catch (err) {
    console.warn(
      "[Marketing] Não foi possível obter status WhatsApp:",
      err.message,
    );
  }
}

function atualizarUIWhatsapp(data) {
  const icon = document.getElementById("wppStatusIcon");
  const numero = document.getElementById("wppNumeroExibido");
  const label = document.getElementById("wppStatusLabel");

  if (!icon) return;

  if (data.status === "conectado") {
    icon.style.color = "#22c55e";
    numero.textContent = data.numero ? `+${data.numero}` : "Conectado";
    label.textContent = "Conectado";
    label.style.color = "#22c55e";
  } else if (data.status === "aguardando_qr") {
    icon.style.color = "#f59e0b";
    numero.textContent = "Aguardando QR Code...";
    label.textContent = "Aguardando";
    label.style.color = "#f59e0b";
  } else {
    icon.style.color = "#ccc";
    numero.textContent = "Clique para conectar WhatsApp";
    label.textContent = "Desconectado";
    label.style.color = "#999";
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SERVER-SENT EVENTS (tempo real)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function conectarSSE() {
  if (_sseSource) {
    _sseSource.close();
    _sseSource = null;
  }

  try {
    _sseSource = new EventSource(
      `${API}/whatsapp/eventos?empresaId=${EMPRESA_ID}`,
    );

    _sseSource.onmessage = function (event) {
      try {
        const data = JSON.parse(event.data);
        tratarEventoSSE(data);
      } catch (_) {}
    };

    _sseSource.onerror = function () {
      console.warn(
        "[Marketing SSE] Conexão perdida. Tentando reconectar em 10s...",
      );
      _sseSource.close();
      _sseSource = null;
      setTimeout(conectarSSE, 10000);
    };
  } catch (err) {
    console.warn("[Marketing SSE] Erro ao conectar SSE:", err.message);
  }
}

function tratarEventoSSE(data) {
  console.log("[Marketing SSE] Evento:", data.evento, data);

  switch (data.evento) {
    case "qr":
      mostrarQRCodeImagem(data.qrBase64);
      break;
    case "conectado":
      onWhatsappConectado(data);
      break;
    case "desconectado":
      onWhatsappDesconectado(data);
      break;
    case "erro":
      onWhatsappErro(data);
      break;
    case "status":
      // Status intermediário (ex: "Sessão expirada. Gerando novo QR Code...")
      if (data.status === "inicializando") {
        document.getElementById("qrStatusDesconectado").style.display = "none";
        document.getElementById("qrStatusAguardando").style.display = "block";
        document.getElementById("qrImageContainer").style.display = "none";
        document.getElementById("qrStatusConectado").style.display = "none";
      }
      break;
    case "status_inicial":
      atualizarUIWhatsapp(data);
      if (data.status === "aguardando_qr" && data.qrBase64) {
        mostrarQRCodeImagem(data.qrBase64);
      }
      break;
  }
}

function mostrarQRCodeImagem(qrBase64) {
  document.getElementById("qrStatusDesconectado").style.display = "none";
  document.getElementById("qrStatusAguardando").style.display = "none";
  document.getElementById("qrStatusConectado").style.display = "none";
  document.getElementById("qrImageContainer").style.display = "block";
  document.getElementById("qrCodeImg").src = qrBase64;
  document.getElementById("qrBtnDesconectar").style.display = "none";
}

function onWhatsappConectado(data) {
  atualizarUIWhatsapp({ status: "conectado", numero: data.numero });

  // Atualizar modal se aberto
  const modal = document.getElementById("modalQRCode");
  if (modal && modal.style.display !== "none") {
    document.getElementById("qrStatusDesconectado").style.display = "none";
    document.getElementById("qrStatusAguardando").style.display = "none";
    document.getElementById("qrImageContainer").style.display = "none";
    document.getElementById("qrStatusConectado").style.display = "block";
    document.getElementById("qrNumeroConectado").textContent = data.numero
      ? `Número: +${data.numero}`
      : "";
    document.getElementById("qrBtnDesconectar").style.display = "block";
  }
}

function onWhatsappDesconectado(data) {
  atualizarUIWhatsapp({ status: "desconectado" });
  pararPollingQR();

  const modal = document.getElementById("modalQRCode");
  if (modal && modal.style.display !== "none") {
    document.getElementById("qrStatusDesconectado").style.display = "block";
    document.getElementById("qrStatusAguardando").style.display = "none";
    document.getElementById("qrImageContainer").style.display = "none";
    document.getElementById("qrStatusConectado").style.display = "none";
    document.getElementById("qrBtnDesconectar").style.display = "none";
    document.getElementById("btnIniciarConexao").disabled = false;
    document.getElementById("btnIniciarConexao").textContent =
      "Iniciar Conexão";
  }
}

function onWhatsappErro(data) {
  console.warn("[Marketing] Erro WhatsApp:", data.mensagem);
  pararPollingQR();

  const modal = document.getElementById("modalQRCode");
  if (modal && modal.style.display !== "none") {
    document.getElementById("qrStatusAguardando").style.display = "none";
    document.getElementById("qrImageContainer").style.display = "none";
    document.getElementById("qrStatusConectado").style.display = "none";
    document.getElementById("qrStatusDesconectado").style.display = "block";
    const btn = document.getElementById("btnIniciarConexao");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fab fa-whatsapp"></i> Tentar Novamente';
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL: CONEXÃƒO WHATSAPP
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function abrirModalConexaoWhatsapp() {
  carregarStatusWhatsapp().then(() => {
    const status = whatsappStatusAtual();
    resetarModalQR();

    if (status === "conectado") {
      // Exibir tela de conectado
      document.getElementById("qrStatusConectado").style.display = "block";
      document.getElementById("qrStatusDesconectado").style.display = "none";
      document.getElementById("qrBtnDesconectar").style.display = "block";

      const num = document.getElementById("wppNumeroExibido").textContent;
      document.getElementById("qrNumeroConectado").textContent =
        `Número: ${num}`;
    }

    document.getElementById("modalQRCode").style.display = "flex";
  });
}

function whatsappStatusAtual() {
  const label = document.getElementById("wppStatusLabel");
  if (!label) return "desconectado";
  const t = label.textContent.toLowerCase();
  if (t === "conectado") return "conectado";
  if (t === "aguardando") return "aguardando_qr";
  return "desconectado";
}

function resetarModalQR() {
  document.getElementById("qrStatusDesconectado").style.display = "block";
  document.getElementById("qrStatusAguardando").style.display = "none";
  document.getElementById("qrImageContainer").style.display = "none";
  document.getElementById("qrStatusConectado").style.display = "none";
  document.getElementById("qrBtnDesconectar").style.display = "none";
  const btn = document.getElementById("btnIniciarConexao");
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fab fa-whatsapp"></i> Iniciar Conexão';
  }
}

// Variável para controlar o polling de QR
let _qrPollingTimer = null;

async function iniciarConexaoWhatsapp() {
  const btn = document.getElementById("btnIniciarConexao");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';

  document.getElementById("qrStatusDesconectado").style.display = "none";
  document.getElementById("qrStatusAguardando").style.display = "block";

  try {
    // Primeiro tenta resetar sessão (limpa corrompida se existir) e conectar
    const res = await fetch(`${API}/whatsapp/resetar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: EMPRESA_ID }),
    });
    const data = await res.json();
    console.log("[Marketing] Resposta ao conectar (via resetar):", data);

    // Iniciar polling de QR (método confiável, complementar ao SSE)
    iniciarPollingQR();
  } catch (err) {
    console.error("[Marketing] Erro ao iniciar conexão:", err.message);
    alert("Erro ao iniciar conexão WhatsApp. Verifique o servidor.");
    resetarModalQR();
  }
}

function iniciarPollingQR() {
  pararPollingQR();
  let tentativas = 0;
  const MAX_TENTATIVAS = 90; // 90 x 2s = 3 minutos

  _qrPollingTimer = setInterval(async () => {
    tentativas++;
    if (tentativas > MAX_TENTATIVAS) {
      pararPollingQR();
      console.warn("[Marketing] Timeout ao aguardar QR Code (3 min)");
      // Mostrar estado de erro em vez de ficar no spinner
      onWhatsappErro({
        mensagem: "Timeout ao aguardar QR Code. Tente novamente.",
      });
      return;
    }
    try {
      const res = await fetch(
        `${API}/whatsapp/qr-status?empresaId=${EMPRESA_ID}`,
      );
      const data = await res.json();
      console.log("[Marketing Polling] Status:", data.status);

      if (data.status === "aguardando_qr" && data.qrBase64) {
        pararPollingQR();
        mostrarQRCodeImagem(data.qrBase64);
      } else if (data.status === "conectado") {
        pararPollingQR();
        onWhatsappConectado(data);
      } else if (data.status === "erro" || data.status === "desconectado") {
        // Backend limpou (timeout, auth_failure, etc)
        // Se o status mudou para desconectado durante polling, parar e mostrar erro
        if (tentativas > 5 && data.status === "desconectado") {
          pararPollingQR();
          onWhatsappErro({ mensagem: "Conexão falhou. Tente novamente." });
        }
      }
    } catch (err) {
      console.warn("[Marketing Polling] Erro:", err.message);
    }
  }, 2000);
}

function pararPollingQR() {
  if (_qrPollingTimer) {
    clearInterval(_qrPollingTimer);
    _qrPollingTimer = null;
  }
}

async function desconectarWhatsapp() {
  if (!(await confirmar("Deseja desconectar o WhatsApp?"))) return;

  try {
    await fetch(`${API}/whatsapp/desconectar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: EMPRESA_ID }),
    });
  } catch (err) {
    console.error("[Marketing] Erro ao desconectar:", err.message);
  }

  pararPollingQR();
  fecharModal("modalQRCode");
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MENSAGENS AUTOMÃTICAS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function carregarMensagens() {
  try {
    const res = await fetch(`${API}/mensagens?empresaId=${EMPRESA_ID}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _mensagens = await res.json();
    renderizarMensagens();
  } catch (err) {
    console.error("[Marketing] Erro ao carregar mensagens:", err.message);
    document.getElementById("listaMensagensAtivas").innerHTML =
      '<div style="color:#ef4444;padding:16px;font-size:13px;">Erro ao carregar mensagens. Backend disponível?</div>';
  }
}

function renderizarMensagens() {
  const ativas = _mensagens.filter((m) => m.ativo);
  const inativas = _mensagens.filter((m) => !m.ativo);

  document.getElementById("badgeMensagensAtivas").textContent =
    `${ativas.length} mensage${ativas.length !== 1 ? "ns ativas" : "m ativa"}`;
  document.getElementById("badgeMensagensInativas").textContent =
    `${inativas.length} mensage${inativas.length !== 1 ? "ns inativas" : "m inativa"}`;

  // Renderizar ativas
  const listaAtivas = document.getElementById("listaMensagensAtivas");
  if (ativas.length === 0) {
    listaAtivas.innerHTML =
      '<div style="color:#aaa;padding:16px;font-size:13px;">Nenhuma mensagem ativa. Ative uma mensagem na lista à direita.</div>';
  } else {
    listaAtivas.innerHTML = ativas.map((m) => renderCardAtiva(m)).join("");
  }

  // Renderizar inativas
  const listaInativas = document.getElementById("listaMensagensInativas");
  if (inativas.length === 0) {
    listaInativas.innerHTML =
      '<div style="color:#aaa;padding:16px;font-size:13px;">Todas as mensagens estão ativas!</div>';
  } else {
    listaInativas.innerHTML = inativas
      .map((m) => renderCardInativa(m))
      .join("");
  }
}

function renderCardAtiva(m) {
  const config = m.configuracaoEnvio
    ? typeof m.configuracaoEnvio === "string"
      ? JSON.parse(m.configuracaoEnvio)
      : m.configuracaoEnvio
    : null;

  let configLabel = "Imediato";
  if (config) {
    if (config.dias && Array.isArray(config.dias)) {
      const hora = config.hora || "09:00";
      const dias = [...config.dias].sort((a, b) => a - b);
      const labels = dias.map((d) =>
        d === 0 ? "No dia" : `${d} dia${d > 1 ? "s" : ""} antes`,
      );
      configLabel = `${labels.join(" + ")}, às ${hora}h`;
    } else if (config.tipo === "no_dia") {
      configLabel = `No dia, às ${config.hora || "09:00"}h`;
    } else if (config.tipo === "dias_antes") {
      configLabel = `${config.valor || 1} dia(s) antes, às ${config.hora || "09:00"}h`;
    }
  }

  return `
    <div class="message-card">
        <h3 class="message-title">${escHtml(m.titulo)}</h3>
        <div class="message-schedule">
            <div class="schedule-item" style="font-size:12px;color:#666;">
                <i class="fas fa-clock" style="margin-right:4px;"></i> ${configLabel}
            </div>
        </div>
        ${m.imagemPath ? `<div style="margin-top:6px;"><img src="${escHtml(m.imagemPath)}" alt="img" style="height:48px;border-radius:4px;border:1px solid #e5e7eb;"></div>` : ""}
        <div class="card-actions">
            <button class="btn-editar" onclick="abrirModalEditar(${m.id})">
                <i class="fas fa-edit"></i> Editar
            </button>
            <button class="btn-desativar" onclick="desativarMensagem(${m.id})">
                <i class="fas fa-power-off"></i> Desativar
            </button>
        </div>
    </div>`;
}

function renderCardInativa(m) {
  return `
    <div class="inactive-message-card" onclick="abrirModalEditar(${m.id})" style="cursor:pointer;">
        <h3 class="message-title purple">${escHtml(m.titulo)}</h3>
        <p class="message-description">${escHtml(m.descricaoMarketing || "")}</p>
    </div>`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MODAL 2: EDITAR MENSAGEM
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function abrirModalEditar(id) {
  _modalMsgAtualId = id;
  _imagemArquivo = null;

  const msg = _mensagens.find((m) => m.id === id);
  if (!msg) return;

  document.getElementById("modalMsgId").value = id;
  document.getElementById("modalMsgTitulo").textContent = msg.titulo;
  document.getElementById("modalMsgConteudo").value = msg.conteudo || "";
  document.getElementById("painelVariaveis").style.display = "none";

  // Ícone
  const iconeEl = document.getElementById("modalMsgIcone");
  iconeEl.className = `fas ${msg.icone || "fa-calendar"}`;

  // Imagem existente
  if (msg.imagemPath) {
    document.getElementById("modalMsgImagemPreview").style.display = "block";
    document.getElementById("modalMsgImagemImg").src = msg.imagemPath;
    document.getElementById("modalMsgImagemNome").textContent = "";
  } else {
    document.getElementById("modalMsgImagemPreview").style.display = "none";
    document.getElementById("modalMsgImagemNome").textContent = "";
  }

  document.getElementById("modalEditarMensagem").style.display = "flex";
}

function mostrarVariaveis() {
  const p = document.getElementById("painelVariaveis");
  p.style.display = p.style.display === "none" ? "block" : "none";
}

function inserirVariavel(variavel) {
  const textarea = document.getElementById("modalMsgConteudo");
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const texto = textarea.value;
  textarea.value = texto.substring(0, start) + variavel + texto.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + variavel.length;
  textarea.focus();
}

function previewImagem(input) {
  if (input.files && input.files[0]) {
    _imagemArquivo = input.files[0];
    document.getElementById("modalMsgImagemNome").textContent =
      _imagemArquivo.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("modalMsgImagemPreview").style.display = "block";
      document.getElementById("modalMsgImagemImg").src = e.target.result;
    };
    reader.readAsDataURL(_imagemArquivo);
  }
}

function removerImagem() {
  _imagemArquivo = null;
  document.getElementById("modalMsgImagemPreview").style.display = "none";
  document.getElementById("modalMsgImagemNome").textContent = "";
  document.getElementById("modalMsgImagem").value = "";

  // Marcar para remover imagem existente (salvo ao avançar)
  const msg = _mensagens.find((m) => m.id === _modalMsgAtualId);
  if (msg) msg._removerImagem = true;
}

/**
 * Avança do Modal de Edição para o Modal de Configuração de Envio.
 * Salva o texto (e imagem se houver) antes de avançar.
 */
async function avancarParaConfiguracao() {
  const id = _modalMsgAtualId;
  const conteudo = document.getElementById("modalMsgConteudo").value.trim();

  if (!conteudo) {
    alert("O texto da mensagem não pode estar em branco.");
    return;
  }

  // Salvar texto + imagem no banco antes de avançar
  try {
    const formData = new FormData();
    formData.append("conteudo", conteudo);

    const msg = _mensagens.find((m) => m.id === id);
    if (msg) formData.append("titulo", msg.titulo);

    if (_imagemArquivo) {
      formData.append("imagem", _imagemArquivo);
    }

    const res = await fetch(`${API}/mensagens/${id}`, {
      method: "PUT",
      body: formData,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const atualizado = await res.json();

    // Atualizar estado local
    const idx = _mensagens.findIndex((m) => m.id === id);
    if (idx !== -1) _mensagens[idx] = atualizado;
  } catch (err) {
    console.error("[Marketing] Erro ao salvar mensagem:", err.message);
    alert("Erro ao salvar mensagem. Tente novamente.");
    return;
  }

  // Abrir Modal 3
  fecharModal("modalEditarMensagem");

  const msg = _mensagens.find((m) => m.id === id);
  document.getElementById("modalConfTitulo").textContent = msg
    ? msg.titulo
    : "Configurar Envio";

  // Pré-preencher configuração existente
  const config =
    msg && msg.configuracaoEnvio
      ? typeof msg.configuracaoEnvio === "string"
        ? JSON.parse(msg.configuracaoEnvio)
        : msg.configuracaoEnvio
      : null;

  // Desmarcar todos os checkboxes primeiro
  document
    .querySelectorAll('input[name="diasEnvio"]')
    .forEach((cb) => (cb.checked = false));

  if (config) {
    if (config.dias && Array.isArray(config.dias)) {
      // Novo formato: { hora, dias: [0, 1, 3] }
      for (const d of config.dias) {
        const cb = document.querySelector(
          `input[name="diasEnvio"][value="${d}"]`,
        );
        if (cb) cb.checked = true;
      }
      document.getElementById("horaEnvio").value = config.hora || "09:00";
    } else if (config.tipo === "no_dia") {
      // Formato legado
      const cb = document.querySelector('input[name="diasEnvio"][value="0"]');
      if (cb) cb.checked = true;
      document.getElementById("horaEnvio").value = config.hora || "09:00";
    } else if (config.tipo === "dias_antes") {
      // Formato legado
      const cb = document.querySelector(
        `input[name="diasEnvio"][value="${config.valor || 1}"]`,
      );
      if (cb) cb.checked = true;
      document.getElementById("horaEnvio").value = config.hora || "09:00";
    }
  } else {
    // Padrão: marcar "No dia"
    const cb = document.querySelector('input[name="diasEnvio"][value="0"]');
    if (cb) cb.checked = true;
    document.getElementById("horaEnvio").value = "09:00";
  }

  document.getElementById("modalConfigurarEnvio").style.display = "flex";
}

function atualizarOpcaoEnvio() {
  // Com checkboxes, o horário é sempre visível
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ATIVAR MENSAGEM (salva no banco)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function ativarMensagemConfirmado() {
  const id = _modalMsgAtualId;
  if (!id) return;

  const btn = document.getElementById("btnAtivarConfirmado");
  btn.disabled = true;
  btn.textContent = "Ativando...";

  // Coletar checkboxes marcados
  const checkboxes = document.querySelectorAll(
    'input[name="diasEnvio"]:checked',
  );
  const dias = Array.from(checkboxes).map((cb) => parseInt(cb.value, 10));

  if (dias.length === 0) {
    alert("Selecione pelo menos um dia para envio.");
    btn.disabled = false;
    btn.textContent = "Ativar";
    return;
  }

  const hora = document.getElementById("horaEnvio").value || "09:00";
  const configuracaoEnvio = { hora, dias };

  try {
    const res = await fetch(`${API}/mensagens/${id}/ativar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configuracaoEnvio }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    fecharModal("modalConfigurarEnvio");
    await carregarMensagens();
    mostrarToast("Mensagem ativada com sucesso!", "sucesso");
  } catch (err) {
    console.error("[Marketing] Erro ao ativar mensagem:", err.message);
    alert("Erro ao ativar mensagem. Tente novamente.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Ativar";
  }
}

async function desativarMensagem(id) {
  if (!(await confirmar("Desativar esta mensagem automática?"))) return;

  try {
    const res = await fetch(`${API}/mensagens/${id}/desativar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await carregarMensagens();
    mostrarToast("Mensagem desativada.", "info");
  } catch (err) {
    console.error("[Marketing] Erro ao desativar mensagem:", err.message);
    alert("Erro ao desativar mensagem.");
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// UTILITÁRIOS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function fecharModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
  // Parar polling de QR se o modal de conexão for fechado
  if (id === "modalQRCode") pararPollingQR();
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function mostrarToast(mensagem, tipo = "info") {
  let container = document.querySelector(".pedido-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "pedido-toast-container";
    document.body.appendChild(container);
  }

  const cores = {
    sucesso: { bg: "#d1fae5", cor: "#065f46" },
    erro: { bg: "#fee2e2", cor: "#991b1b" },
    info: { bg: "#e8f6ff", cor: "#023047" },
  };
  const { bg, cor } = cores[tipo] || cores.info;

  const toast = document.createElement("div");
  toast.className = "pedido-toast";
  toast.style.cssText = `pointer-events:auto;background:${bg};color:${cor};padding:10px 14px;border-radius:8px;
        box-shadow:0 8px 24px rgba(0,0,0,0.12);min-width:220px;max-width:380px;font-size:13px;
        opacity:0;transform:translateY(-6px) scale(0.98);transition:opacity .18s,transform .18s;`;
  toast.textContent = mensagem;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "none";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px) scale(0.98)";
    setTimeout(() => {
      try {
        toast.remove();
      } catch (_) {}
    }, 220);
  }, 4000);
}

// Fechar modal ao clicar fora
document.addEventListener("click", function (e) {
  if (e.target.classList && e.target.classList.contains("modal-overlay")) {
    fecharModal(e.target.id);
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FUNÇÕES DO DROPDOWN INÍCIO RÁPIDO
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function novoAtendimento() {
  window.location.href = "agendamentos-novo.html";
}
function novoPet() {
  window.location.href = "/pets/cadastro-pet.html";
}
function novoCliente() {
  window.location.href = "novo-cliente.html";
}
function novoContrato() {
  alert("Funcionalidade em desenvolvimento.");
}
function novaVenda() {
  window.location.href = "/atendimento/nova-venda.html";
}
function novaContaPagar() {
  alert("Funcionalidade em desenvolvimento.");
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EXPORTAR (compatibilidade com outros módulos)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.MarketingSystem = {
  carregarMensagens,
  abrirModalEditar,
  ativarMensagemConfirmado,
  desativarMensagem,
  abrirModalConexaoWhatsapp,
};

console.log("[Marketing] Sistema de Marketing inicializado com sucesso!");
