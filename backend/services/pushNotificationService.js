/* ============================================================
   PetHub — Push Notification Service
   Envia notificações Web Push para subscriptions cadastradas.
   Usa o pacote `web-push` com chaves VAPID do .env.
   
   Dependência: npm install web-push
   Gerar chaves: npx web-push generate-vapid-keys
   ============================================================ */

let webpush;
try {
  webpush = require("web-push");
} catch (err) {
  console.warn(
    "[Push] Pacote 'web-push' não instalado. Execute: npm install web-push",
  );
  webpush = null;
}

const { PushSubscription } = require("../models");
const { Op } = require("sequelize");

// ── Configurar VAPID ──────────────────────────────────────
function _configurarVAPID() {
  if (!webpush) return false;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT || "mailto:contato@pethubflow.com.br";

  if (!publicKey || !privateKey) {
    console.warn(
      "[Push] VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY não definidas no .env",
    );
    console.warn("[Push] Gere com: npx web-push generate-vapid-keys");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

// Configurar ao carregar o módulo
const _vapidConfigurado = _configurarVAPID();

// ── Payloads por evento ───────────────────────────────────
const PAYLOADS = {
  novo_agendamento: (dados) => ({
    title: "📅 Novo Agendamento",
    body: dados.petNome
      ? `${dados.petNome}${dados.horario ? " às " + dados.horario : ""}${dados.servico ? " — " + dados.servico : ""}`
      : "Um novo agendamento foi criado",
    tag: "novo_agendamento",
    data: { page: "agenda" },
  }),

  checkin_pet: (dados) => ({
    title: "🐾 Pet chegou!",
    body: dados.petNome
      ? `${dados.petNome} fez check-in${dados.horario ? " às " + dados.horario : ""}`
      : "Um pet fez check-in",
    tag: "checkin_pet",
    data: { page: "pets" },
  }),

  servico_concluido: (dados) => ({
    title: "✅ Serviço Concluído",
    body: dados.petNome
      ? `${dados.petNome} está pronto para retirada`
      : "Um serviço foi finalizado",
    tag: "servico_concluido",
    data: { page: "agenda" },
  }),

  pagamento_recebido: (dados) => ({
    title: "💰 Pagamento Recebido",
    body: dados.valor
      ? `R$ ${Number(dados.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} recebido`
      : "Um pagamento foi registrado",
    tag: "pagamento_recebido",
    data: { page: "financeiro" },
  }),

  cancelamento: (dados) => ({
    title: "❌ Agendamento Cancelado",
    body: dados.petNome
      ? `Agendamento de ${dados.petNome} foi cancelado`
      : "Um agendamento foi cancelado",
    tag: "cancelamento",
    data: { page: "agenda" },
  }),

  meta_atingida: (dados) => ({
    title: "🎯 Meta Atingida!",
    body: dados.meta
      ? `Parabéns! Meta de R$ ${Number(dados.meta).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} atingida`
      : "A meta diária foi atingida!",
    tag: "meta_atingida",
    data: { page: "financeiro" },
    requireInteraction: true,
  }),

  estoque_baixo: (dados) => ({
    title: "📦 Estoque Baixo",
    body: dados.produto
      ? `${dados.produto} está com estoque abaixo do mínimo`
      : "Produtos com estoque baixo detectados",
    tag: "estoque_baixo",
    data: { page: "dashboard" },
  }),

  novo_cliente: (dados) => ({
    title: "👤 Novo Cliente",
    body: dados.nome
      ? `${dados.nome} se cadastrou`
      : "Um novo cliente foi cadastrado",
    tag: "novo_cliente",
    data: { page: "dashboard" },
  }),
};

// ── API Pública ───────────────────────────────────────────

/**
 * Envia notificação push para todos os dispositivos de uma empresa.
 * Filtra por preferências de cada usuário.
 *
 * @param {number} empresaId
 * @param {string} evento — chave do evento (ex: "novo_agendamento")
 * @param {object} dados  — dados do evento para montar o payload
 */
async function notificarEmpresa(empresaId, evento, dados = {}) {
  if (!webpush || !_vapidConfigurado) return;
  if (!PushSubscription) return;

  let subscriptions;
  try {
    subscriptions = await PushSubscription.findAll({
      where: { empresa_id: empresaId, ativo: true },
    });
  } catch (err) {
    console.error("[Push] Erro ao buscar subscriptions:", err?.message);
    return;
  }

  if (!subscriptions.length) return;

  const payloadFactory = PAYLOADS[evento];
  if (!payloadFactory) {
    console.warn("[Push] Evento desconhecido:", evento);
    return;
  }

  const payload = payloadFactory(dados);
  const payloadStr = JSON.stringify(payload);
  const expiradas = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      // Verificar se o usuário quer este tipo de notificação
      const prefs = sub.preferencias || {};
      if (prefs[evento] === false) return;

      const subscriptionData = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };

      try {
        await webpush.sendNotification(subscriptionData, payloadStr);
        // Atualizar último uso em background (não aguardar)
        sub.update({ ultimo_uso: new Date() }).catch(() => {});
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expirada — marcar para remoção
          expiradas.push(sub.id);
        } else {
          console.error(
            `[Push] Falha ao enviar para sub ${sub.id}:`,
            err?.message,
            err?.statusCode,
          );
        }
      }
    }),
  );

  // Remover subscriptions expiradas
  if (expiradas.length) {
    await PushSubscription.update(
      { ativo: false },
      { where: { id: { [Op.in]: expiradas } } },
    ).catch(() => {});
    console.log(
      `[Push] ${expiradas.length} subscription(s) expirada(s) marcadas como inativas`,
    );
  }
}

/**
 * Envia notificação push para um usuário específico.
 * @param {number} usuarioId
 * @param {string} evento
 * @param {object} dados
 */
async function notificarUsuario(usuarioId, evento, dados = {}) {
  if (!webpush || !_vapidConfigurado) return;
  if (!PushSubscription) return;

  let subscriptions;
  try {
    subscriptions = await PushSubscription.findAll({
      where: { usuario_id: usuarioId, ativo: true },
    });
  } catch (err) {
    console.error("[Push] Erro ao buscar subscriptions:", err?.message);
    return;
  }

  if (!subscriptions.length) return;

  // Reutilizar lógica de envio
  const mockEmpresaId = subscriptions[0].empresa_id;
  await notificarEmpresa(mockEmpresaId, evento, dados);
}

/**
 * Retorna a chave pública VAPID para uso no frontend.
 * @returns {string|null}
 */
function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

module.exports = {
  notificarEmpresa,
  notificarUsuario,
  getVapidPublicKey,
};
