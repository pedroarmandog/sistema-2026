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
  let _heartbeatFalhas = 0;
  const HEARTBEAT_INTERVAL = 60_000; // 60s — igual ao desktop
  const MAX_FALHAS_HEARTBEAT = 2; // desloga apenas após 2 falhas consecutivas

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
      _heartbeatFalhas = 0;
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

    _heartbeatFalhas = 0;
    iniciarHeartbeat();
    return _currentUser;
  }

  /**
   * Realiza o logout.
   */
  async function logout() {
    pararHeartbeat();
    _currentUser = null;
    _heartbeatFalhas = 0;
    try {
      await MobileApi.post("/api/usuarios/logout", {
        device_id: _getDeviceId(),
      });
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
   * IMPORTANTE: não desloga em 401/erro transiente.
   * Só desloga após 2 falhas CONSECUTIVAS explícitas.
   */
  function iniciarHeartbeat() {
    pararHeartbeat();
    _heartbeatFalhas = 0;
    _heartbeatTimer = setInterval(async () => {
      try {
        const resp = await MobileApi.request("/api/usuarios/heartbeat", {
          method: "POST",
          body: { device_id: _getDeviceId() },
          noAutoRedirect: true, // controlamos o redirect aqui
        });

        // Servidor sinalizou sessão encerrada (HTTP 200 com ativa:false)
        if (resp && resp.ativa === false) {
          _heartbeatFalhas++;
          console.warn(
            `[MobileAuth] Heartbeat: sessão inativa (${_heartbeatFalhas}/${MAX_FALHAS_HEARTBEAT}) motivo:`,
            resp.motivo || "desconhecido",
          );
          if (_heartbeatFalhas >= MAX_FALHAS_HEARTBEAT) {
            _heartbeatFalhas = 0;
            _handleSessaoEncerrada();
          }
        } else {
          // Sessão ativa (ou motivo "no_record"/"db_error" — manter conectado)
          _heartbeatFalhas = 0;
        }
      } catch (err) {
        if (err.status === 401) {
          // 401 do heartbeat — só deslogar após 2 falhas consecutivas
          _heartbeatFalhas++;
          console.warn(
            `[MobileAuth] Heartbeat 401 (${_heartbeatFalhas}/${MAX_FALHAS_HEARTBEAT})`,
          );
          if (_heartbeatFalhas >= MAX_FALHAS_HEARTBEAT) {
            _heartbeatFalhas = 0;
            _handleSessaoEncerrada();
          }
        } else {
          // Erro de rede/offline/5xx — NÃO conta como falha de sessão
          _heartbeatFalhas = 0;
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

  /**
   * Obtém o device_id persistente (mesmo usado no login).
   */
  function _getDeviceId() {
    try {
      return localStorage.getItem("pethub_device_id") || null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Sessão encerrada de forma confirmada — navega para login.
   */
  function _handleSessaoEncerrada() {
    pararHeartbeat();
    _currentUser = null;
    window.location.href = "/mobile/app.html?logout=1";
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