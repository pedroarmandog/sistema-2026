/* ============================================================
   PetHub Mobile — API Service
   Cliente HTTP centralizado para todas as chamadas à API.
   Reutiliza a lógica de autenticação do sistema desktop:
   - Cookies HttpOnly (JWT) enviados automaticamente via same-origin
   - Trata 401/403 com redirecionamento inteligente
   - Não faz login com URL de outra origem em cross-domain
   ============================================================ */

window.MobileApi = (function () {
  "use strict";

  // Base URL: segue a mesma lógica do api-config.js do desktop
  function getBase() {
    return window.VPS_URL || window.API_URL || "";
  }

  /**
   * Requisição genérica com tratamento de erros.
   * @param {string} endpoint  — ex: "/api/dashboard/resumo"
   * @param {object} options   — opções do fetch (method, body, etc.)
   * @returns {Promise<any>}   — JSON parsado ou throws Error
   */
  async function request(endpoint, options = {}) {
    const url = getBase() + endpoint;

    const config = {
      // Começar com options para que os defaults NÃO sobrescrevam as configurações
      // importantes como credentials e headers
      ...options,
      method: options.method || "GET",
      credentials: "include", // envia cookies HttpOnly JWT
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    };

    if (options.body && typeof options.body === "object") {
      config.body = JSON.stringify(options.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      throw Object.assign(new Error("Sem conexão com o servidor"), {
        offline: true,
        originalError: networkErr,
      });
    }

    // Extrair corpo JSON (se houver)
    let body = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        body = await response.json();
      } catch (_) {
        body = null;
      }
    }

    // Empresa bloqueada
    if (response.status === 403 && body?.bloqueado) {
      window.location.href = "/painel-admin/sistema-bloqueado.html";
      return;
    }

    // Sessão expirada / não autenticado
    if (response.status === 401) {
      const deveRedirecionar =
        !body ||
        body.encerrado === true ||
        body.expirado === true ||
        (typeof body.mensagem === "string" &&
          body.mensagem.toLowerCase().includes("autenticad"));

      // noAutoRedirect: usado em verificarSessao para não redirecionar ao checar sessão
      if (deveRedirecionar && !options.noAutoRedirect) {
        window.location.href = "/mobile/app.html?logout=1";
        return;
      }
      throw Object.assign(new Error(body?.mensagem || "Não autorizado"), {
        status: 401,
        body,
      });
    }

    if (!response.ok) {
      const msg =
        body?.mensagem ||
        body?.erro ||
        body?.error ||
        `Erro HTTP ${response.status}`;
      throw Object.assign(new Error(msg), { status: response.status, body });
    }

    return body;
  }

  /** GET simplificado */
  async function get(endpoint, params = {}) {
    const qs = Object.keys(params).length
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request(endpoint + qs);
  }

  /** POST simplificado */
  async function post(endpoint, data = {}) {
    return request(endpoint, { method: "POST", body: data });
  }

  /** PUT simplificado */
  async function put(endpoint, data = {}) {
    return request(endpoint, { method: "PUT", body: data });
  }

  /** DELETE simplificado */
  async function del(endpoint) {
    return request(endpoint, { method: "DELETE" });
  }

  return { request, get, post, put, del };
})();
