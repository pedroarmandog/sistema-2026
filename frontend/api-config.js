/**
 * Configuração centralizada da URL da API
 * Altere apenas aqui para mudar o endereço do backend em todo o frontend.
 */
// Prefer a variável global `__API_BASE__` (pode ser definida pelo backend),
// senão usar a origem atual (domínio + porta). Não hardcodear IP/porta.
const API_URL =
  (window.__API_BASE__ && window.__API_BASE__.toString()) ||
  window.location.origin;
