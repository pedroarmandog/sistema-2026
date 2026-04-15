// =============================================
// CLIENT DETAILS JAVASCRIPT - PET CRIA
// =============================================

let clienteAtual = null;

// Inicialização da página
document.addEventListener("DOMContentLoaded", function () {
  console.log("🔍 Inicializando página de detalhes do cliente...");

  // Obter ID do cliente da URL
  const urlParams = new URLSearchParams(window.location.search);
  const clienteId = urlParams.get("id");

  console.log("🆔 ID do cliente obtido da URL:", clienteId);

  if (clienteId) {
    carregarDetalhesCliente(clienteId);
  } else {
    console.error("❌ ID do cliente não encontrado na URL");
    mostrarErro("ID do cliente não especificado");
  }

  // Inicializar tabs
  inicializarTabs();

  // Inicializar seções expandíveis
  inicializarSecoesExpandiveis();
});

// Quando o usuário volta via seta/bfcache, recarregar pets sem recarregar a página toda
window.addEventListener("pageshow", function (e) {
  if (e.persisted) {
    const clienteId = new URLSearchParams(window.location.search).get("id");
    if (clienteId) recarregarPets(clienteId);
  }
});

async function recarregarPets(clienteId) {
  try {
    const resp = await fetch(`/api/pets?cliente_id=${clienteId}`);
    if (resp.ok) {
      const json = await resp.json();
      if (json.success && Array.isArray(json.pets)) {
        renderPets(json.pets);
      }
    }
  } catch (e) {
    /* silencioso */
  }
}

// =============================================
// CARREGAMENTO DE DADOS
// =============================================

async function carregarDetalhesCliente(clienteId) {
  try {
    console.log("🔍 Carregando cliente ID:", clienteId);

    mostrarCarregamento();

    // Fazer a requisição
    console.log(
      "� Fazendo requisição para:",
      `http://72.60.244.46:3000/api/clientes/${clienteId}`,
    );
    const response = await fetch(
      `http://72.60.244.46:3000/api/clientes/${clienteId}`,
    );
    console.log("📡 Response status:", response.status);
    console.log("📡 Response ok:", response.ok);

    const data = await response.json();
    console.log("📄 Response data completa:", data);

    if (response.ok && data.success && data.cliente) {
      clienteAtual = data.cliente;
      console.log("✅ Cliente definido:", clienteAtual);

      preencherDetalhesCliente(clienteAtual);
      console.log("✅ Detalhes do cliente carregados e preenchidos");
    } else {
      console.error("❌ Erro na resposta:", data);
      throw new Error(data.error || "Erro ao carregar cliente");
    }
  } catch (error) {
    console.error("❌ Erro ao carregar detalhes do cliente:", error);
    mostrarErro("Erro ao carregar os detalhes do cliente: " + error.message);
  } finally {
    esconderCarregamento();
  }
}

function preencherDetalhesCliente(cliente) {
  console.log("📝 Iniciando preenchimento dos detalhes:", cliente);

  // Helper para preencher elemento com segurança
  function preencherElemento(id, valor, valorPadrao = "---") {
    try {
      const elemento = document.getElementById(id);
      if (elemento) {
        const valorFinal = valor || valorPadrao;
        elemento.textContent = valorFinal;
        console.log(`✅ ${id}: ${valorFinal}`);
      } else {
        console.warn(`⚠️ Elemento não encontrado: ${id}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao preencher elemento ${id}:`, error);
    }
  }

  // Preenchimento básico primeiro
  preencherElemento("clienteNome", cliente.nome);
  preencherElemento("clienteNomeHeader", cliente.nome);
  preencherElemento("clienteId", cliente.id);
  preencherElemento("clienteTelefone", cliente.telefone);

  console.log("📝 Preenchimento básico concluído");

  try {
    // Endereço
    const endereco = formatarEndereco(cliente);
    preencherElemento("clienteEndereco", endereco, "Sem Endereço, S/N");
    console.log("📍 Endereço formatado:", endereco);
  } catch (error) {
    console.error("❌ Erro ao formatar endereço:", error);
  }

  try {
    // Avatar
    const avatar = document.getElementById("clienteAvatar");
    if (avatar) {
      if (cliente.imagem_perfil) {
        avatar.innerHTML = `<img src="http://72.60.244.46:3000/uploads/${cliente.imagem_perfil}" alt="${cliente.nome}">`;
      } else {
        const iniciais = cliente.nome
          .split(" ")
          .map((n) => n[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();
        avatar.innerHTML = iniciais;
        console.log("👤 Avatar com iniciais:", iniciais);
      }
    }
  } catch (error) {
    console.error("❌ Erro ao configurar avatar:", error);
  }

  // Outros detalhes
  preencherElemento("clienteCpf", cliente.cpf);
  preencherElemento("clienteRg", cliente.rg);

  try {
    preencherElemento(
      "clienteDataNascimento",
      formatarData(cliente.data_nascimento),
    );
  } catch (error) {
    console.error("❌ Erro ao formatar data:", error);
    preencherElemento("clienteDataNascimento", cliente.data_nascimento);
  }

  preencherElemento(
    "clienteIdade",
    cliente.idade ? `${cliente.idade} anos` : null,
  );
  preencherElemento("clienteSexo", cliente.sexo);
  preencherElemento("clienteCep", cliente.cep);
  preencherElemento("clienteEmail", cliente.email);

  try {
    preencherElemento(
      "clienteLimiteCredito",
      formatarMoeda(cliente.limite_credito),
    );
  } catch (error) {
    console.error("❌ Erro ao formatar moeda:", error);
    preencherElemento("clienteLimiteCredito", cliente.limite_credito);
  }

  preencherElemento("clienteGrupo", cliente.grupo_cliente);
  preencherElemento("clientePerfilDesconto", cliente.perfil_desconto);
  preencherElemento("clienteComoConheceu", cliente.como_nos_conheceu);
  preencherElemento("clienteProximidade", cliente.proximidade);
  preencherElemento("clienteObservacoes", cliente.observacoes);
  preencherElemento("clienteStatusText", cliente.ativo ? "Sim" : "Não");

  // Status toggle
  try {
    const statusElement = document.getElementById("statusCliente");
    if (statusElement) {
      statusElement.checked = cliente.ativo;
      console.log("✅ Status toggle configurado:", cliente.ativo);
    }
  } catch (error) {
    console.error("❌ Erro ao configurar status:", error);
  }

  // Título da página
  document.title = `PetHub - ${cliente.nome}`;

  console.log("✅ Preenchimento de detalhes concluído com sucesso");
  // Renderizar pets: primeiro tentamos usar os pets embutidos na resposta do cliente
  try {
    if (
      cliente.pets &&
      Array.isArray(cliente.pets) &&
      cliente.pets.length > 0
    ) {
      renderPets(cliente.pets);
    } else {
      renderPets([]);
      // Fallback: buscar via endpoint /api/pets?cliente_id=
      (async () => {
        try {
          const resp = await fetch(`/api/pets?cliente_id=${cliente.id}`);
          if (resp.ok) {
            const json = await resp.json();
            if (json.success && Array.isArray(json.pets)) {
              console.log(
                "🔁 Pets carregados via /api/pets:",
                json.pets.length,
              );
              renderPets(json.pets);
            }
          }
        } catch (e) {
          console.warn("⚠️ Falha ao buscar pets via API alternativa:", e);
        }
      })();
    }
  } catch (err) {
    console.error("❌ Erro ao renderizar pets:", err);
  }
}

// =============================================
// FUNÇÕES DE FORMATAÇÃO
// =============================================

function formatarEndereco(cliente) {
  const partes = [];

  if (cliente.endereco) partes.push(cliente.endereco);
  if (cliente.numero) partes.push(cliente.numero);
  if (partes.length === 0) return "Sem Endereço, S/N";

  return partes.join(", ");
}

function formatarData(data) {
  if (!data) return "---";

  const date = new Date(data);
  return date.toLocaleDateString("pt-BR");
}

// Formatar data e hora em horário de Brasília
function formatarDataHora(data) {
  if (!data) return "";
  try {
    const d = new Date(data);
    return d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (e) {
    return String(data);
  }
}

function formatarMoeda(valor) {
  if (!valor && valor !== 0) return "0,00";

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

// =============================================
// SISTEMA DE TABS
// =============================================

function inicializarTabs() {
  const tabButtons = document.querySelectorAll(".tab-btn");

  tabButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const tabId = this.getAttribute("data-tab");
      // Se for a aba 'haver', abrir conteúdo inline em vez de modal
      if (tabId === "haver") {
        showHaverInline();
        return;
      }
      // Se for a aba 'crediario', abrir conteúdo inline estilo haver
      if (tabId === "crediario") {
        showCrediarioInline();
        return;
      }
      if (tabId === "historico") {
        showHistoricoInline();
        return;
      }
      switchTab(tabId);
    });
  });
}

// Mostrar o conteúdo de haver inline dentro da área de tabs (aba 'haver')
function showHaverInline() {
  const container = document.getElementById("haver-tab");
  if (!container) return;

  // Construir HTML básico: header com saldo + botões e tabela
  container.innerHTML = `
        <div class="card" style="padding:16px; margin:0 0 16px 0;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                <div>
                    <div style="font-size:14px; color:#6b7280">Saldo em haver</div>
                    <div id="haverSaldoInline" style="font-size:20px; font-weight:600; margin-top:6px">0,00</div>
                </div>
                <div style="display:flex; gap:8px;">
                    <button id="btnFecharHaverInline" class="btn btn-secondary">Fechar</button>
                    <button id="btnNovoAdiantamentoInline" class="btn btn-primary">Novo Adiantamento</button>
                </div>
            </div>
        </div>

        <div class="card" style="padding:0;">
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#f9fafb; color:#374151;">
                    <tr>
                        <th style="padding:10px; text-align:left">ID</th>
                        <th style="padding:10px; text-align:left">Data / Hora</th>
                        <th style="padding:10px; text-align:left">Operação</th>
                        <th style="padding:10px; text-align:left">Tipo movimento</th>
                        <th style="padding:10px; text-align:right">Valor</th>
                        <th style="padding:10px; text-align:right">Saldo</th>
                    </tr>
                </thead>
                <tbody id="haverTableBodyInline"></tbody>
            </table>
        </div>
    `;

  // Preencher saldo
  const saldoEl = document.getElementById("haverSaldoInline");
  let saldo = "0,00";
  try {
    if (clienteAtual) {
      saldo = formatarMoeda(
        clienteAtual.saldo_haver ||
          clienteAtual.saldo ||
          clienteAtual.haver ||
          0,
      );
    }
  } catch (e) {
    console.warn("Erro ao obter saldo haver", e);
  }
  if (saldoEl) saldoEl.textContent = saldo;

  // Preencher tabela de movimentos
  const tbody = document.getElementById("haverTableBodyInline");
  if (tbody) {
    tbody.innerHTML = "";
    let movimentos = [];
    if (clienteAtual) {
      movimentos =
        clienteAtual.haver_movimentos ||
        clienteAtual.movimentos_haver ||
        clienteAtual.movimentos ||
        [];
    }

    if (!Array.isArray(movimentos) || movimentos.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="6" style="padding:12px; color:#6b7280;">Nenhum movimento encontrado</td>';
      tbody.appendChild(tr);
    } else {
      movimentos.forEach((mov) => {
        const tr = document.createElement("tr");
        const dataHora = formatarDataHora(
          mov.data_hora || mov.created_at || mov.data || "",
        );
        const operacao = mov.operacao || mov.descricao || mov.tipo || "";
        const tipo = mov.tipo_movimento || mov.tipo_mov || mov.categoria || "";
        const valor = mov.valor != null ? formatarMoeda(mov.valor) : "";
        const saldoLinha = mov.saldo != null ? formatarMoeda(mov.saldo) : "";

        tr.innerHTML = `
                    <td style="padding:10px">${mov.id || ""}</td>
                    <td style="padding:10px">${dataHora}</td>
                    <td style="padding:10px">${operacao}</td>
                    <td style="padding:10px">${tipo}</td>
                    <td style="padding:10px; text-align:right">${valor}</td>
                    <td style="padding:10px; text-align:right">${saldoLinha}</td>
                `;
        tbody.appendChild(tr);
      });
    }
  }

  // configurar botões
  const btnFechar = document.getElementById("btnFecharHaverInline");
  if (btnFechar) btnFechar.onclick = () => switchTab("detalhes");

  const novoBtn = document.getElementById("btnNovoAdiantamentoInline");
  if (novoBtn) {
    novoBtn.onclick = function () {
      console.log("Novo adiantamento (inline) clicado");
      // comportamento padrão: abrir formulário de adiantamento (não implementado)
    };
  }

  // Ativar a aba haver
  switchTab("haver");
}

// Mostrar conteúdo do crediário inline com mesmo estilo do haver
function showCrediarioInline() {
  const container = document.getElementById("crediario-tab");
  if (!container) return;

  // Estrutura com dois cards lado a lado (Em aberto / Recebimentos)
  container.innerHTML = `
        <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:16px;">
            <div class="card" style="flex:1 1 320px; padding:12px;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:36px; height:36px; border-radius:6px; background:#fee2e2; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v6" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12H4" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div>
                            <div style="font-weight:600;">Em aberto</div>
                            <div style="font-size:13px; color:#6b7280; margin-top:6px">Cliente não possui crediário em aberto!</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn btn-ghost" title="Compartilhar">🔗</button>
                        <input type="checkbox" title="Marcar" />
                    </div>
                </div>
            </div>

            <div class="card" style="flex:1 1 320px; padding:12px;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:36px; height:36px; border-radius:6px; background:#ecfdf5; display:flex; align-items:center; justify-content:center;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17l-5-5" stroke="#10b981" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                        </div>
                        <div>
                            <div style="font-weight:600;">Recebimentos</div>
                            <div style="font-size:13px; color:#6b7280; margin-top:6px">Cliente não possui recebimentos!</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <button class="btn btn-ghost" title="Compartilhar">🔗</button>
                        <input type="checkbox" title="Marcar" />
                    </div>
                </div>
            </div>
        </div>
    `;

  // Ativar a aba crediario
  switchTab("crediario");
}

// Mostrar histórico inline com seletor de período e calendário duplo
function showHistoricoInline() {
  const container = document.getElementById("historico-tab");
  if (!container) return;

  // Estado de datas (inicialmente últimos 30 dias)
  const today = new Date();
  const defaultEnd = today;
  const defaultStart = new Date();
  defaultStart.setDate(today.getDate() - 30);

  let periodStart = defaultStart;
  let periodEnd = defaultEnd;

  function formatDateShort(d) {
    if (!d) return "---";
    const dt = new Date(d);
    return dt.toLocaleDateString("pt-BR");
  }

  container.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <div style="font-size:13px; color:var(--text-secondary);">Período:</div>
                <button id="periodDisplay" class="btn btn-ghost" style="padding:6px 10px; border-radius:6px;">${formatDateShort(periodStart)} - ${formatDateShort(periodEnd)}</button>
                <button id="btnAtualizarHistorico" class="btn btn-primary">⟳ Atualizar</button>
            </div>
        </div>

        <div class="card" style="padding:0;">
            <table style="width:100%; border-collapse:collapse;">
                <thead style="background:#f9fafb; color:#374151;">
                    <tr>
                        <th style="padding:10px; text-align:left">Data/Hora</th>
                        <th style="padding:10px; text-align:left">Tipo</th>
                        <th style="padding:10px; text-align:left">Total</th>
                        <th style="padding:10px; text-align:left">Pago</th>
                        <th style="padding:10px; text-align:left">Crediário</th>
                        <th style="padding:10px; text-align:left">Saldo Devedor</th>
                        <th style="padding:10px; text-align:left">Saldo Haver</th>
                    </tr>
                </thead>
                <tbody id="historicoTableBody"></tbody>
            </table>
        </div>
    `;

  const periodBtn = document.getElementById("periodDisplay");
  if (periodBtn) {
    periodBtn.addEventListener("click", (e) => {
      openRangeCalendarPopup(
        e.currentTarget,
        periodStart,
        periodEnd,
        (s, f) => {
          periodStart = s;
          periodEnd = f;
          periodBtn.textContent = `${formatDateShort(periodStart)} - ${formatDateShort(periodEnd)}`;
        },
      );
    });
  }

  const atualizarBtn = document.getElementById("btnAtualizarHistorico");
  if (atualizarBtn) {
    atualizarBtn.addEventListener("click", () => {
      // carregar dados do backend conforme período (placeholder)
      carregarHistoricoPeriodo(periodStart, periodEnd);
    });
  }

  // preencher tabela inicialmente com placeholder
  carregarHistoricoPeriodo(periodStart, periodEnd);

  switchTab("historico");
}

function carregarHistoricoPeriodo(startDate, endDate) {
  const tbody = document.getElementById("historicoTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Placeholder: obter movimentos do clienteAtual filtrando por data se possível
  let movimentos =
    clienteAtual && clienteAtual.historico ? clienteAtual.historico : [];

  // Filtrar por período (se movimento possuir data)
  try {
    const s = new Date(startDate).setHours(0, 0, 0, 0);
    const e = new Date(endDate).setHours(23, 59, 59, 999);
    movimentos = movimentos.filter((m) => {
      const dt = new Date(m.data_hora || m.data || m.created_at);
      return !isNaN(dt) && dt >= s && dt <= e;
    });
  } catch (err) {
    console.warn("Falha ao filtrar histórico por período", err);
  }

  if (!Array.isArray(movimentos) || movimentos.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="7" style="padding:12px; color:#6b7280;">Nenhum registro encontrado para o período selecionado</td>';
    tbody.appendChild(tr);
    return;
  }

  movimentos.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td style="padding:10px">${formatarDataHora(m.data_hora || m.created_at || m.data || "")}</td>
            <td style="padding:10px">${m.tipo || m.operacao || ""}</td>
            <td style="padding:10px">${m.total != null ? formatarMoeda(m.total) : ""}</td>
            <td style="padding:10px">${m.pago != null ? formatarMoeda(m.pago) : ""}</td>
            <td style="padding:10px">${m.crediario != null ? formatarMoeda(m.crediario) : ""}</td>
            <td style="padding:10px">${m.saldo_devedor != null ? formatarMoeda(m.saldo_devedor) : ""}</td>
            <td style="padding:10px">${m.saldo_haver != null ? formatarMoeda(m.saldo_haver) : ""}</td>
        `;
    tbody.appendChild(tr);
  });
}

// Abre um popup com calendário de dois meses para selecionar intervalo
function openRangeCalendarPopup(anchorEl, startDate, endDate, onChange) {
  // remover popup anterior
  const existing = document.getElementById("rangeCalendarPopup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "rangeCalendarPopup";
  popup.style.position = "absolute";
  popup.style.zIndex = 9999;
  popup.style.padding = "12px";
  popup.style.background = "var(--theme-surface)";
  popup.style.border = "1px solid var(--border-color)";
  popup.style.boxShadow = "var(--shadow-medium)";
  popup.style.borderRadius = "8px";
  popup.style.display = "flex";
  popup.style.flexDirection = "column";
  popup.style.gap = "12px";
  popup.style.minWidth = "520px";

  // position near anchor
  const rect = anchorEl.getBoundingClientRect();
  popup.style.top = rect.bottom + window.scrollY + 8 + "px";
  popup.style.left = rect.left + window.scrollX + "px";

  // selection state
  let selStart = startDate ? new Date(startDate) : null;
  let selEnd = endDate ? new Date(endDate) : null;

  // render two months: current month and next month
  const base = new Date();
  const m1 = new Date(base.getFullYear(), base.getMonth(), 1);
  const m2 = new Date(base.getFullYear(), base.getMonth() + 1, 1);

  function buildMonthView(monthDate) {
    const monthDiv = document.createElement("div");
    monthDiv.style.minWidth = "240px";
    monthDiv.style.fontFamily = "Arial, sans-serif";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.marginBottom = "8px";
    header.innerHTML = `<strong>${monthDate.toLocaleString("pt-BR", { month: "long" })}</strong> <span style="color:var(--text-secondary)">${monthDate.getFullYear()}</span>`;
    monthDiv.appendChild(header);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 1fr)";
    grid.style.gap = "4px";

    // week day headers
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    days.forEach((d) => {
      const el = document.createElement("div");
      el.style.fontSize = "12px";
      el.style.color = "var(--text-secondary)";
      el.style.textAlign = "center";
      el.textContent = d;
      grid.appendChild(el);
    });

    const firstDay = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1,
    ).getDay();
    const daysInMonth = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0,
    ).getDate();

    // empty cells
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement("div");
      grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const day = document.createElement("button");
      day.textContent = String(d);
      day.style.padding = "8px";
      day.style.border = "none";
      day.style.borderRadius = "6px";
      day.style.background = "transparent";
      day.style.cursor = "pointer";
      const curDate = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        d,
      );

      function updateDayStyles() {
        day.style.background = "transparent";
        day.style.color = "inherit";
        try {
          if (selStart && selEnd) {
            const s = new Date(selStart).setHours(0, 0, 0, 0);
            const e = new Date(selEnd).setHours(23, 59, 59, 999);
            const cd = new Date(curDate).getTime();
            if (cd >= s && cd <= e) {
              day.style.background = "var(--color-primary)";
              day.style.color = "white";
            }
          } else if (
            selStart &&
            curDate.toDateString() === selStart.toDateString()
          ) {
            day.style.background = "var(--color-primary)";
            day.style.color = "white";
          }
        } catch (e) {
          /* ignore */
        }
      }

      day.addEventListener("click", () => {
        if (!selStart || (selStart && selEnd)) {
          selStart = new Date(curDate);
          selEnd = null;
        } else {
          if (curDate < selStart) {
            selEnd = new Date(selStart);
            selStart = new Date(curDate);
          } else {
            selEnd = new Date(curDate);
          }
        }
        // update all day buttons
        popup.querySelectorAll("button").forEach((b) => {
          // attempt to call each button's update if present
        });
        // reflect selection visually by re-building months (simpler approach)
        popup.remove();
        openRangeCalendarPopup(anchorEl, selStart, selEnd, onChange);
      });

      updateDayStyles();
      grid.appendChild(day);
    }

    monthDiv.appendChild(grid);
    return monthDiv;
  }

  // colocar meses em uma linha e o footer abaixo (botões lado a lado)
  const monthsRow = document.createElement("div");
  monthsRow.style.display = "flex";
  monthsRow.style.gap = "12px";
  monthsRow.style.flexWrap = "nowrap";
  monthsRow.appendChild(buildMonthView(m1));
  monthsRow.appendChild(buildMonthView(m2));
  popup.appendChild(monthsRow);

  // footer with buttons (below the calendar)
  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "center";
  footer.style.gap = "12px";
  footer.style.marginTop = "12px";
  footer.style.width = "100%";
  const aplicar = document.createElement("button");
  aplicar.className = "btn btn-primary";
  aplicar.textContent = "Aplicar";
  aplicar.style.padding = "8px 18px";
  aplicar.style.minWidth = "120px";
  aplicar.style.borderRadius = "6px";
  aplicar.addEventListener("click", () => {
    if (selStart && !selEnd) selEnd = new Date(selStart);
    onChange && onChange(selStart, selEnd);
    popup.remove();
  });
  const cancelar = document.createElement("button");
  cancelar.className = "btn btn-secondary";
  cancelar.textContent = "Cancelar";
  cancelar.style.padding = "8px 18px";
  cancelar.style.minWidth = "120px";
  cancelar.style.borderRadius = "6px";
  cancelar.addEventListener("click", () => popup.remove());
  footer.appendChild(cancelar);
  footer.appendChild(aplicar);
  popup.appendChild(footer);

  document.body.appendChild(popup);

  // close on outside click
  setTimeout(() => {
    function onDocClick(e) {
      if (!popup.contains(e.target) && e.target !== anchorEl) {
        popup.remove();
        document.removeEventListener("click", onDocClick);
      }
    }
    document.addEventListener("click", onDocClick);
  }, 0);
}

// Mostrar modal de haver e preencher com movimentos do cliente
function showHaverModal() {
  const modal = document.getElementById("haverModal");
  if (!modal) return;

  // Preencher saldo
  const saldoEl = document.getElementById("haverSaldo");
  let saldo = "0,00";
  try {
    if (clienteAtual) {
      saldo = formatarMoeda(
        clienteAtual.saldo_haver ||
          clienteAtual.saldo ||
          clienteAtual.haver ||
          0,
      );
    }
  } catch (e) {
    console.warn("Erro ao obter saldo haver", e);
  }
  if (saldoEl) saldoEl.textContent = saldo;

  // Preencher tabela de movimentos
  const tbody = document.getElementById("haverTableBody");
  if (tbody) {
    tbody.innerHTML = "";
    let movimentos = [];
    if (clienteAtual) {
      movimentos =
        clienteAtual.haver_movimentos ||
        clienteAtual.movimentos_haver ||
        clienteAtual.movimentos ||
        [];
    }

    if (!Array.isArray(movimentos) || movimentos.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML =
        '<td colspan="6" style="padding:12px; color:#6b7280;">Nenhum movimento encontrado</td>';
      tbody.appendChild(tr);
    } else {
      movimentos.forEach((mov) => {
        const tr = document.createElement("tr");
        const dataHora = formatarDataHora(
          mov.data_hora || mov.created_at || mov.data || "",
        );
        const operacao = mov.operacao || mov.descricao || mov.tipo || "";
        const tipo = mov.tipo_movimento || mov.tipo_mov || mov.categoria || "";
        const valor = mov.valor != null ? formatarMoeda(mov.valor) : "";
        const saldoLinha = mov.saldo != null ? formatarMoeda(mov.saldo) : "";

        tr.innerHTML = `
                    <td style="padding:10px">${mov.id || ""}</td>
                    <td style="padding:10px">${dataHora}</td>
                    <td style="padding:10px">${operacao}</td>
                    <td style="padding:10px">${tipo}</td>
                    <td style="padding:10px; text-align:right">${valor}</td>
                    <td style="padding:10px; text-align:right">${saldoLinha}</td>
                `;
        tbody.appendChild(tr);
      });
    }
  }

  // mostrar modal
  modal.style.display = "flex";

  // configurar botão novo adiantamento
  const novoBtn = document.getElementById("btnNovoAdiantamento");
  if (novoBtn) {
    novoBtn.onclick = function () {
      // comportamento padrão: navegar para criação de adiantamento (página não implementada)
      // por enquanto apenas fechar o modal e log
      console.log("Novo adiantamento clicado");
      closeHaverModal();
    };
  }
}

function closeHaverModal() {
  const modal = document.getElementById("haverModal");
  if (!modal) return;
  modal.style.display = "none";
}

function switchTab(tabId) {
  // Remover active de todos os botões e conteúdos
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));

  // Ativar botão e conteúdo selecionado
  document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");
  document.getElementById(`${tabId}-tab`).classList.add("active");
}

// =============================================
// SEÇÕES EXPANDÍVEIS
// =============================================

function inicializarSecoesExpandiveis() {
  const toggles = document.querySelectorAll(".section-toggle");

  toggles.forEach((toggle) => {
    toggle.addEventListener("click", function () {
      const sectionId = this.getAttribute("onclick").match(/'([^']+)'/)[1];
      toggleSection(sectionId);
    });
  });
}

function toggleSection(sectionId) {
  const toggle = document.querySelector(`[onclick*="${sectionId}"]`);
  const content = document.getElementById(`${sectionId}-content`);

  if (content.classList.contains("open")) {
    content.classList.remove("open");
    toggle.classList.remove("open");
  } else {
    content.classList.add("open");
    toggle.classList.add("open");
  }
}

// =============================================
// AÇÕES DO CLIENTE
// =============================================

function editarCliente() {
  if (clienteAtual) {
    window.location.href = `novo-cliente.html?edit=${clienteAtual.id}`;
  }
}

// Voltar para a lista de clientes
function voltarParaLista() {
  window.location.href = "clientes.html";
}

// Alterar status do cliente (ativo/inativo)
async function toggleStatusCliente() {
  if (!clienteAtual) return;

  const novoStatus = document.getElementById("statusCliente").checked;

  try {
    const response = await fetch(
      `http://72.60.244.46:3000/api/clientes/${clienteAtual.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ativo: novoStatus }),
      },
    );

    const data = await response.json();

    if (data.success) {
      clienteAtual.ativo = novoStatus;
      document.getElementById("clienteStatusText").textContent = novoStatus
        ? "Sim"
        : "Não";

      // Sinalizar para outras abas que houve mudança de status
      localStorage.setItem("clienteStatusUpdated", Date.now().toString());
      localStorage.setItem("lastClientChange", Date.now().toString());

      mostrarNotificacao(
        `Cliente ${novoStatus ? "ativado" : "desativado"} com sucesso!`,
        "success",
      );
    } else {
      throw new Error(data.error || "Erro ao alterar status");
    }
  } catch (error) {
    console.error("❌ Erro ao alterar status do cliente:", error);

    // Reverter o toggle
    const statusEl = document.getElementById("statusCliente");
    if (statusEl) statusEl.checked = !novoStatus;

    mostrarNotificacao("Erro ao alterar status do cliente", "error");
  }
}
// Calcular idade do pet a partir de data_nascimento (DD/MM/YYYY ou ISO)
function calcularIdadePet(dataNascimento) {
  if (!dataNascimento) return "";

  // suportar formatos DD/MM/YYYY ou ISO (YYYY-MM-DD)
  let nascimento;
  try {
    if (
      typeof dataNascimento === "string" &&
      dataNascimento.indexOf("/") !== -1
    ) {
      const parts = dataNascimento.split("/");
      if (parts.length === 3) {
        const dia = parseInt(parts[0], 10);
        const mes = parseInt(parts[1], 10) - 1;
        const ano = parseInt(parts[2], 10);
        nascimento = new Date(ano, mes, dia);
      }
    }
    if (!nascimento) nascimento = new Date(dataNascimento);
  } catch (e) {
    nascimento = new Date(dataNascimento);
  }

  if (isNaN(nascimento)) return "";

  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  let meses = hoje.getMonth() - nascimento.getMonth();

  if (meses < 0) {
    anos--;
    meses += 12;
  }

  if (hoje.getDate() < nascimento.getDate()) {
    meses--;
    if (meses < 0) {
      anos--;
      meses += 12;
    }
  }

  if (anos <= 0 && meses <= 0) return "Recém-nascido";
  if (anos <= 0) return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  if (meses <= 0) return `${anos} ${anos === 1 ? "ano" : "anos"}`;
  return `${anos} ${anos === 1 ? "ano" : "anos"} e ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

// Renderizar lista de pets na seção #petsList
function renderPets(pets) {
  const container = document.getElementById("petsList");
  if (!container) return;

  // Limpar conteúdo atual
  container.innerHTML = "";

  if (!pets || pets.length === 0) {
    container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paw"></i>
                    <p>Nenhum pet cadastrado</p>
                </div>
            `;
    return;
  }

  // Criar cards de pet — exibir apenas os ativos
  const petsAtivos = pets.filter(
    (p) =>
      p.ativo === true ||
      p.ativo === 1 ||
      p.ativo === "1" ||
      p.ativo === "true",
  );

  if (petsAtivos.length === 0) {
    container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-paw"></i>
                    <p>Nenhum pet ativo cadastrado</p>
                </div>
            `;
    return;
  }

  petsAtivos.forEach((pet) => {
    const card = document.createElement("div");
    card.className = "pet-card";
    card.style.padding = "18px";
    card.style.marginBottom = "12px";
    card.style.background = "white";
    card.style.borderRadius = "6px";
    card.style.display = "flex";
    card.style.gap = "16px";
    card.style.alignItems = "flex-start";

    const avatar = document.createElement("div");
    avatar.className = "pet-avatar";
    avatar.style.width = "44px";
    avatar.style.height = "44px";
    avatar.style.borderRadius = "50%";
    avatar.style.background = "#2c98f0";
    avatar.style.color = "white";
    avatar.style.display = "flex";
    avatar.style.alignItems = "center";
    avatar.style.justifyContent = "center";
    avatar.style.fontWeight = "700";
    avatar.style.fontSize = "18px";
    avatar.textContent = pet.nome ? pet.nome.charAt(0).toUpperCase() : "P";

    const content = document.createElement("div");
    content.style.flex = "1";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";

    const nameEl = document.createElement("div");
    nameEl.innerHTML = `<strong style="font-size:16px">${pet.nome || "Sem nome"}</strong>`;

    // Badge de estado (ex: Calmo) — opcional, placeholder
    const badge = document.createElement("div");
    badge.style.background = "#6c757d";
    badge.style.color = "white";
    badge.style.padding = "4px 8px";
    badge.style.borderRadius = "12px";
    badge.style.fontSize = "12px";
    // Mostrar badge apenas se houver um estado/label definido no pet
    const badgeText = pet.estado || pet.status || pet.label || "";
    if (badgeText) {
      badge.textContent = badgeText;
    } else {
      badge.style.display = "none";
    }

    titleRow.appendChild(nameEl);
    titleRow.appendChild(badge);

    const details = document.createElement("div");
    details.style.marginTop = "8px";
    details.style.color = "#6c757d";
    details.style.fontSize = "13px";

    const idadeText = pet.data_nascimento
      ? calcularIdadePet(pet.data_nascimento)
      : "";
    // Preparar tags: suporta array JSON ou string separada por vírgulas
    let tagsArray = [];
    if (pet.tags) {
      if (typeof pet.tags === "string") {
        const t = pet.tags.trim();
        // tentar parsear JSON se começar com [
        if (t.startsWith("[")) {
          try {
            tagsArray = JSON.parse(t);
          } catch (e) {
            tagsArray = t
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
          }
        } else {
          tagsArray = t
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        }
      } else if (Array.isArray(pet.tags)) {
        tagsArray = pet.tags;
      }
    }

    const tagsHtml =
      tagsArray.length > 0
        ? `<div style="margin-top:8px">Tags: ${tagsArray.map((tag) => `<span style=\"display:inline-block;background:#eef6ff;color:#0366d6;padding:4px 8px;border-radius:12px;font-size:12px;margin-right:6px;\">${tag}</span>`).join("")}</div>`
        : "";

    details.innerHTML = `
                <div>Espécie: ${pet.especie || pet.raca || "---"}</div>
                <div>Raça: ${pet.raca || pet.especie || "---"}</div>
                <div>Gênero: ${pet.genero || "---"}</div>
                <div>Idade: ${idadeText}</div>
                <div>Porte: ${pet.porte || "---"}</div>
                <div>Pelagem: ${pet.pelagem || "---"}</div>
                <div>Planos Contratados: </div>
                ${tagsHtml}
            `;

    content.appendChild(titleRow);
    content.appendChild(details);

    card.appendChild(avatar);
    card.appendChild(content);

    // Tornar todo o card clicável para editar o pet
    card.style.cursor = "pointer";
    card.addEventListener("click", async function () {
      try {
        const clienteIdForUrl =
          typeof clienteAtual !== "undefined" && clienteAtual && clienteAtual.id
            ? clienteAtual.id
            : "";
        const query = `?pet_id=${encodeURIComponent(pet.id)}&cliente_id=${encodeURIComponent(clienteIdForUrl)}`;

        // Candidate paths (na ordem de tentativa) para página de perfil do pet
        const candidates = [];

        // 1) Relativo à pasta atual
        candidates.push(
          window.location.origin +
            window.location.pathname.replace(/[^/]*$/, "") +
            `pets/pet-details.html${query}`,
        );
        // 2) Caminho absoluto quando frontend é servido pelo backend ou Live Server
        candidates.push(
          window.location.origin + `/pets/pet-details.html${query}`,
        );
        // 3) Alguns setups servem arquivos diretamente de /frontend
        candidates.push(
          window.location.origin + `/frontend/pets/pet-details.html${query}`,
        );
        // 4) Forçar backend (72.60.244.46:3000)
        candidates.push(
          `http://72.60.244.46:3000/pets/pet-details.html${query}`,
        );

        let found = null;
        for (const url of candidates) {
          try {
            const resp = await fetch(url, { method: "HEAD" });
            if (resp && resp.ok) {
              found = url;
              break;
            }
          } catch (e) {
            // ignorar erros e tentar próximo
          }
        }

        // Se encontrou, navega para a URL válida; senão, usa a primeira candidata (padrão)
        const target = found || candidates[1];
        window.location.href = target;
      } catch (e) {
        console.error("Erro ao redirecionar para edição do pet:", e);
        // fallback simples
        window.location.href = `/pets/cadastro-pet.html?pet_id=${pet.id}&cliente_id=${clienteAtual ? clienteAtual.id : ""}`;
      }
    });

    container.appendChild(card);
  });
}

// =============================================
// AÇÕES DE PETS E DEPENDENTES
// =============================================

function adicionarPet() {
  // Obter o ID do cliente atual da URL
  const urlParams = new URLSearchParams(window.location.search);
  const clienteId = urlParams.get("id");

  if (clienteId) {
    // Redirecionar para cadastro de pet com o cliente selecionado
    window.location.href = `pets/cadastro-pet.html?cliente_id=${clienteId}`;
  } else {
    // Se não houver ID, ir para o cadastro normal
    window.location.href = "pets/cadastro-pet.html";
  }
}

function adicionarDependente(event) {
  event.stopPropagation();
  mostrarNotificacao("Funcionalidade em desenvolvimento", "info");
}

function adicionarOportunidade(event) {
  event.stopPropagation();
  mostrarNotificacao("Funcionalidade em desenvolvimento", "info");
}

// =============================================
// ESTADOS DE INTERFACE
// =============================================

function mostrarCarregamento() {
  // Mostrar apenas o texto de carregamento nos elementos específicos
  const elementos = [
    "clienteNome",
    "clienteNomeHeader",
    "clienteTelefone",
    "clienteEndereco",
    "clienteCpf",
    "clienteEmail",
  ];

  elementos.forEach((id) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.textContent = "Carregando...";
    }
  });

  console.log("🔄 Carregando dados...");
}

function esconderCarregamento() {
  console.log("✅ Carregamento finalizado");
}

function mostrarErro(mensagem) {
  const container = document.querySelector(".client-details-container");
  container.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${mensagem}</p>
            <button onclick="window.history.back()" class="btn-primary" style="margin-top: 20px;">
                <i class="fas fa-arrow-left"></i>
                Voltar
            </button>
        </div>
    `;
}

// =============================================
// SISTEMA DE NOTIFICAÇÕES
// =============================================

function mostrarNotificacao(mensagem, tipo = "info") {
  // Remover notificação anterior se existir
  const notificacaoAnterior = document.querySelector(".notification");
  if (notificacaoAnterior) {
    notificacaoAnterior.remove();
  }

  // Criar nova notificação
  const notificacao = document.createElement("div");
  notificacao.className = `notification notification-${tipo}`;

  let icone;
  switch (tipo) {
    case "success":
      icone = "fas fa-check-circle";
      break;
    case "error":
      icone = "fas fa-exclamation-circle";
      break;
    case "info":
    default:
      icone = "fas fa-info-circle";
      break;
  }

  notificacao.innerHTML = `
        <i class="${icone}"></i>
        <span>${mensagem}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  document.body.appendChild(notificacao);

  // Remover automaticamente após 5 segundos
  setTimeout(() => {
    if (notificacao.parentElement) {
      notificacao.remove();
    }
  }, 5000);
}

console.log("📋 Client Details JavaScript carregado!");
