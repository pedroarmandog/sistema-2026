/* ============================================================
   PetHub Mobile — Auth Service
   Gerenciamento de sessão, heartbeat e estado do usuário.
   Reutiliza o mesmo JWT cookie (pethub_token) do sistema desktop.
   ============================================================ */

window.MobileAuth = (function () {
  "use strict";

  // Estado em memória (NÃO usar localStorage para dados sensíveis)
  let _currentUser = null;
  let _heartbeatTimer = null;
  const HEARTBEAT_INTERVAL = 60_000; // 60s — igual ao desktop

  /**
   * Verifica se há sessão ativa no servidor.
   * @returns {Promise<{id, nome, empresaId, grupoUsuario} | null>}
   */
  async function verificarSessao() {
    try {
      // Usa noAutoRedirect para não redirecionar a página ao verificar a sessão
      const data = await MobileApi.request("/api/usuarios/me", {
        noAutoRedirect: true,
      });
      _currentUser = {
        id: data.id,
        nome: data.nome || "Usuário",
        empresaId: data.empresaId,
        grupoUsuario: data.grupoUsuario,
        empresaNome: data.empresaNome || "",
      };
      return _currentUser;
    } catch (err) {
      // Sem sessão válida — mostrar login sem redirecionar
      _currentUser = null;
      if (err.offline) console.warn("[MobileAuth] Sem conexão");
      return null;
    }
  }

  /**
   * Realiza o login.
   * Usa o mesmo endpoint do sistema desktop — sem alteração no backend.
   * @param {string} usuario
   * @param {string} senha
   * @returns {Promise<{nome, empresaId, ...}>}
   */
  async function login(usuario, senha) {
    let deviceId = null;
    try {
      deviceId = localStorage.getItem("pethub_device_id");
      if (!deviceId) {
        deviceId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36);
        localStorage.setItem("pethub_device_id", deviceId);
      }
    } catch (_) {}

    const data = await MobileApi.post("/api/usuarios/login", {
      usuario,
      senha,
      device_id: deviceId,
    });

    if (data.bloqueado) {
      window.location.href = "/painel-admin/sistema-bloqueado.html";
      return;
    }

    _currentUser = {
      id: data.id || data.usuario?.id,
      nome: data.nome || data.usuario?.nome || "Usuário",
      empresaId: data.empresaId || data.empresa_id || data.usuario?.empresaId,
      grupoUsuario: data.grupoUsuario || data.usuario?.grupoUsuario,
      empresaNome: data.empresaNome || data.empresa?.nome || "",
    };

    iniciarHeartbeat();
    return _currentUser;
  }

  /**
   * Realiza o logout.
   */
  async function logout() {
    pararHeartbeat();
    _currentUser = null;
    try {
      await MobileApi.post("/api/usuarios/logout");
    } catch (_) {
      // Ignorar erros de rede no logout
    }
    window.location.href = "/mobile/app.html?logout=1";
  }

  /**
   * Retorna o usuário atual (cache em memória).
   * @returns {{id, nome, empresaId, grupoUsuario, empresaNome} | null}
   */
  function getUsuario() {
    return _currentUser;
  }

  /**
   * Define o usuário atual (chamado após login bem-sucedido).
   */
  function setUsuario(user) {
    _currentUser = user;
  }

  /**
   * Inicia o heartbeat — mantém a sessão ativa a cada 60s.
   */
  function iniciarHeartbeat() {
    pararHeartbeat();
    _heartbeatTimer = setInterval(async () => {
      try {
        await MobileApi.post("/api/usuarios/heartbeat");
      } catch (err) {
        if (err.status === 401) {
          pararHeartbeat();
          window.location.href = "/mobile/app.html?logout=1";
        }
      }
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Para o heartbeat.
   */
  function pararHeartbeat() {
    if (_heartbeatTimer) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    }
  }

  return {
    verificarSessao,
    login,
    logout,
    getUsuario,
    setUsuario,
    iniciarHeartbeat,
    pararHeartbeat,
  };
})();