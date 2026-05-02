/**
 * Configuração centralizada da URL da API
 * Altere apenas aqui para mudar o endereço do backend em todo o frontend.
 */

// URL da VPS onde o backend Node.js está rodando.
// Altere somente este valor se o domínio/IP da VPS mudar.
const VPS_URL = "https://api.pethubflow.com.br";

// Prefer a variável global `__API_BASE__` (pode ser definida pelo backend),
// senão usar a URL da VPS.
const API_URL =
  (window.__API_BASE__ && window.__API_BASE__.toString()) || VPS_URL;

// Expõe globalmente para que outros scripts possam usar.
window.VPS_URL = VPS_URL;
window.API_URL = API_URL;
