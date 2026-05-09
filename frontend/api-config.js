/**
 * Configuração centralizada da URL da API
 * Altere apenas aqui para mudar o endereço do backend em todo o frontend.
 */

// URL da VPS onde o backend Node.js está rodando.
const VPS_URL = "https://api.pethubflow.com.br";

// Detectar se o frontend está sendo servido pelo domínio público (Hostinger)
// ou diretamente pelo backend (IP, localhost, etc.).
// Quando servido pelo domínio público, as chamadas de API precisam ir para o
// subdomínio da VPS (origem diferente). Caso contrário, usar same-origin ("") para
// garantir que os cookies HttpOnly sejam enviados corretamente.
const _hostname = window.location.hostname;
const _isFrontendDomain =
  _hostname === "pethubflow.com.br" || _hostname === "www.pethubflow.com.br";

const _resolvedVpsUrl = _isFrontendDomain ? VPS_URL : "";

// Expõe globalmente para que outros scripts possam usar.
window.VPS_URL = _resolvedVpsUrl;
window.API_URL = _resolvedVpsUrl;
