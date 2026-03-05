// Script para a página de perfil do pet
console.log("ðŸ¶ pet-details.js carregado");
// Chart instance (when using Chart.js)
let pesoChart = null;

document.addEventListener("DOMContentLoaded", function () {
  // Remover overlays/modais residuais que possam ter ficado abertos por outros scripts
  clearGlobalModalOverlays();
  const urlParams = new URLSearchParams(window.location.search);
  const petId = urlParams.get("pet_id") || urlParams.get("id");
  const clienteId = urlParams.get("cliente_id");

  if (!petId) {
    mostrarErro("ID do pet não especificado");
    return;
  }

  carregarPet(petId, clienteId);

  // Botões
  const btnBack = document.getElementById("btnBack");
  if (btnBack)
    btnBack.addEventListener("click", () => {
      // voltar para a página de detalhes do cliente se disponível
      if (clienteId) {
        window.location.href = `../client-details.html?id=${encodeURIComponent(clienteId)}`;
      } else {
        window.history.back();
      }
    });

  const btnEdit = document.getElementById("btnEdit");
  if (btnEdit)
    btnEdit.addEventListener("click", () => {
      // redirecionar para edição (mantendo cliente_id se houver)
      const q = clienteId
        ? `?pet_id=${encodeURIComponent(petId)}&cliente_id=${encodeURIComponent(clienteId)}`
        : `?pet_id=${encodeURIComponent(petId)}`;
      // usar caminho relativo (arquivo `cadastro-pet.html` está na mesma pasta)
      window.location.href = `cadastro-pet.html${q}`;
    });

  // Inativar/excluir pet (hard delete) - botão ao lado de Editar
  const btnInativar = document.getElementById("btnInativar");
  if (btnInativar)
    btnInativar.addEventListener("click", (ev) => {
      // Abrir modal de confirmação antes de inativar
      ev.preventDefault();
      showConfirmDeleteModal();
    });

  // Funções para controlar o modal de confirmação
  function showConfirmDeleteModal() {
    const modal = document.getElementById("confirmDeleteModal");
    if (!modal) return;
    // usar flex para respeitar as regras de centralização definidas em CSS (.modal { display:flex; align-items:center; justify-content:center })
    modal.style.display = "flex";
    try {
      document.body.style.overflow = "hidden";
    } catch (e) {}
    // ligar handler do botão confirmar (evitar múltiplos binds)
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    if (confirmBtn) {
      // apontar para a função global que realiza a inativação
      confirmBtn.onclick = confirmarInativacao;
    }
    if (nomeCliente) {
      applyClientText(nomeCliente, idCliente);
    } else {
      // Tentar extrair nome já presente no DOM (ex.: "510 - Davi Miguel Santos")
      try {
        const raw = (clientEl.textContent || "").trim();
        const m = raw.match(/^\s*\d+\s*-\s*(.+)$/);
        if (m && m[1]) {
          applyClientText(m[1].trim(), idCliente || "");
        } else if (raw && raw !== "Cliente:" && raw !== "—") {
          // se houver algum texto diferente, usar como nome
          applyClientText(raw, idCliente || "");
        } else if (idCliente) {
          // Se não temos nome no DOM, tentar buscar pelo id
          applyClientText("Carregando...", idCliente);
          (async function fetchClientNameIfMissing(id) {
            try {
              let resp = null;
              try {
                resp = await fetch(`/api/clientes/${encodeURIComponent(id)}`);
              } catch (e) {
                resp = null;
              }
              if (!resp || !resp.ok) {
                try {
                  resp = await fetch(
                    `${location.protocol}//localhost:3000/api/clientes/${encodeURIComponent(id)}`,
                  );
                } catch (e) {
                  resp = null;
                }
              }
              if (resp && resp.ok) {
                const json = await resp.json();
                const c = json && (json.cliente || json || json.data);
                const nome =
                  (c && (c.nome || c.name || c.fullName || c.nome_completo)) ||
                  null;
                if (nome) {
                  applyClientText(nome, id);
                  return;
                }
              }
            } catch (e) {
              /* ignore */
            }
            applyClientText(`ID ${id}`, id);
          })(idCliente);
        } else {
          applyClientText(null, "");
        }
      } catch (e) {
        applyClientText(null, "");
      }
    }
  }
  // Exportar funções para escopo global para suportar onclick inline do HTML
  try {
    window.showConfirmDeleteModal = showConfirmDeleteModal;
    window.closeConfirmDeleteModal = closeConfirmDeleteModal;
  } catch (e) {}

  // Inicializar sistema de abas local (ativação e comportamento)
  const tabButtons = document.querySelectorAll(".tab");
  function activateTab(name) {
    // remover active de todas
    document
      .querySelectorAll(".tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    const btn = document.querySelector(`.tab[data-tab="${name}"]`);
    if (btn) btn.classList.add("active");
    const content = document.getElementById(name);
    if (content) content.classList.add("active");
    // Mostrar/ocultar ações do topo (ex.: vacinas) de acordo com a aba ativa
    try {
      const tabsActions = document.getElementById("tabsActions");
      if (tabsActions) {
        // mostrar ações para vacinas, vermifugos e antiparasitarios
        tabsActions.style.display =
          name === "vacinas" ||
          name === "vermifugos" ||
          name === "antiparasitarios"
            ? "flex"
            : "none";
        // exibir apenas o bloco correspondente (se existir)
        Array.from(tabsActions.children).forEach((child) => {
          try {
            const cls = child.className || "";
            if (
              name === "vermifugos" &&
              cls.indexOf("vermifugos-actions") !== -1
            )
              child.style.display = "flex";
            else if (
              name === "antiparasitarios" &&
              cls.indexOf("antiparasitarios-actions") !== -1
            )
              child.style.display = "flex";
            else if (
              name === "vacinas" &&
              cls.indexOf("vacinas-actions") !== -1
            )
              child.style.display = "flex";
            else child.style.display = "none";
          } catch (e) {
            child.style.display = "none";
          }
        });
      }
    } catch (e) {
      /* ignore */
    }
  }

  // Conectar botões do tabsActions (barra de abas) ao modal correto
  const _wireTabsActionsBtn = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.onclick = fn;
  };
  _wireTabsActionsBtn("btnAdd_vacinas", () => _abrirModalVacina(petId));
  _wireTabsActionsBtn("btnAdd_vermifugos", () => _abrirModalVermifugo(petId));
  _wireTabsActionsBtn("btnAdd_antiparasitarios", () =>
    _abrirModalAntiparasitario(petId),
  );

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const name = btn.getAttribute("data-tab");
      activateTab(name);
      // Carregar dinamicamente recursos suportados sem sair da página
      if (name === "vacinas") {
        loadResourceIntoTab("vacinas", petId, clienteId, [
          { key: "data_aplicacao", label: "Data aplicação" },
          { key: "produto", label: "Produto" },
          { key: "lote", label: "Lote" },
          { key: "dose", label: "Dose" },
          { key: "data_renovacao", label: "Renovação" },
          { key: "profissional", label: "Profissional" },
        ]);
      } else if (name === "vermifugos") {
        loadResourceIntoTab("vermifugos", petId, clienteId, [
          { key: "data_aplicacao", label: "Data aplicação" },
          { key: "produto", label: "Produto" },
          { key: "lote", label: "Lote" },
          { key: "dose", label: "Dose" },
          { key: "periodicidade", label: "Periodicidade" },
          { key: "data_renovacao", label: "Data renovação" },
        ]);
      } else if (name === "antiparasitarios") {
        loadResourceIntoTab("antiparasitarios", petId, clienteId, [
          { key: "data_aplicacao", label: "Data aplicação" },
          { key: "produto", label: "Produto" },
          { key: "lote", label: "Lote" },
          { key: "dose", label: "Dose" },
          { key: "periodicidade", label: "Periodicidade" },
          { key: "data_renovacao", label: "Data renovação" },
        ]);
      } else if (name === "documentos") {
        loadDocumentosIntoTab(petId);
      }
    });
  });

  // Inicializar controles do Histórico (pills e ações)
  function initHistoricoControls() {
    const pills = document.querySelectorAll(".pill-button");
    if (!pills || pills.length === 0) return;
    // definir default (Todos)
    pills.forEach((p) => p.classList.remove("active"));
    const defaultPill = document.querySelector(
      '.pill-button[data-historico-type="todos"]',
    );
    if (defaultPill) defaultPill.classList.add("active");

    pills.forEach((p) => {
      p.addEventListener("click", () => {
        pills.forEach((x) => x.classList.remove("active"));
        p.classList.add("active");
        const tipo = p.getAttribute("data-historico-type");
        _filtrarHistoricoGrupos(tipo);
      });
    });
  }

  // chamar uma vez ao carregar a página para garantir que controles existam
  initHistoricoControls();

  /* ======= Histórico: modal de filtros ======= */
  function initHistoricoFilterModal() {
    const btnFilter = document.getElementById("btnHistoricoFilter");
    const modal = document.getElementById("historicoFilterModal");
    const ok = document.getElementById("hf-ok");
    const cancel = document.getElementById("hf-cancel");
    const selectAll = document.getElementById("hf-select-all");
    const clear = document.getElementById("hf-clear");

    if (btnFilter)
      btnFilter.addEventListener("click", (e) => {
        e.preventDefault();
        showHistoricoFilterModal();
      });
    if (cancel)
      cancel.addEventListener("click", (e) => {
        e.preventDefault();
        closeHistoricoFilterModal();
      });
    if (selectAll)
      selectAll.addEventListener("click", (e) => {
        e.preventDefault();
        document
          .querySelectorAll(".hf-item")
          .forEach((cb) => (cb.checked = true));
      });
    if (clear)
      clear.addEventListener("click", (e) => {
        e.preventDefault();
        document
          .querySelectorAll(".hf-item")
          .forEach((cb) => (cb.checked = false));
      });
    if (ok)
      ok.addEventListener("click", (e) => {
        e.preventDefault();
        applyHistoricoModalSelection();
      });

    // fechar com ESC
    document.addEventListener("keydown", function onEsc(e) {
      if (e.key === "Escape") {
        const m = document.getElementById("historicoFilterModal");
        if (m && m.style.display !== "none") closeHistoricoFilterModal();
      }
    });
  }

  const historicoSelectedFilters = new Set([
    "banhos",
    "tosas",
    "proc-esteticos",
    "consultas",
    "procedimentos",
    "exames",
    "receitas",
    "vacinas",
    "vermifugos",
    "antiparasitas",
  ]);

  function showHistoricoFilterModal() {
    const modal = document.getElementById("historicoFilterModal");
    if (!modal) return;
    // setar checkboxes conforme estado atual
    document.querySelectorAll(".hf-item").forEach((cb) => {
      try {
        cb.checked = historicoSelectedFilters.has(cb.value);
      } catch (e) {}
    });
    modal.style.display = "flex";
  }

  function closeHistoricoFilterModal() {
    const modal = document.getElementById("historicoFilterModal");
    if (!modal) return;
    modal.style.display = "none";
  }

  function applyHistoricoModalSelection() {
    const checked = Array.from(document.querySelectorAll(".hf-item"))
      .filter((cb) => cb.checked)
      .map((cb) => cb.value);
    historicoSelectedFilters.clear();
    checked.forEach((v) => historicoSelectedFilters.add(v));
    // aplicar filtro visualmente (se os itens tiverem data-tipo)
    applyHistoricoFilters(checked);
    closeHistoricoFilterModal();
  }

  function applyHistoricoFilters(filtersArray) {
    console.log("Aplicando filtros historico:", filtersArray);
    // procurar itens do histórico no DOM e filtrar por data-tipo se presente
    const items = document.querySelectorAll("#historico .historico-item");
    if (!items || items.length === 0) return;
    items.forEach((it) => {
      const tipo = it.getAttribute("data-tipo");
      if (!tipo) {
        // se não houver marcação de tipo, mantemos visível
        it.style.display = "";
      } else {
        if (filtersArray.includes(tipo)) it.style.display = "";
        else it.style.display = "none";
      }
    });
  }

  // inicializar modal de filtros
  initHistoricoFilterModal();
  // inicializar handlers para ações na barra de abas (ex.: vacinas)
  initTabsActions();
  // inicializar controles do gráfico de peso (modal e renderização)
  initPesoControls();
});

function initTabsActions() {
  // ligar botões que estão na linha das abas (MAIS VACINAS / PERIÓDICOS)
  // vacinas
  const btnMaisVacinas = document.getElementById("btnAdd_vacinas");
  if (btnMaisVacinas)
    btnMaisVacinas.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      const clienteId = urlParams.get("cliente_id");
      const q = clienteId
        ? `?pet_id=${encodeURIComponent(petId)}&cliente_id=${encodeURIComponent(clienteId)}`
        : `?pet_id=${encodeURIComponent(petId)}`;
      window.location.href = `vacinas-cadastro.html${q}`;
    });
  const btnPeriodicos = document.getElementById("btnPeriodicos");
  if (btnPeriodicos)
    btnPeriodicos.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarNotificacao(
        'Ação "Periódicos" (Vacinas) ainda não implementada.',
        "info",
      );
    });

  // vermifugos
  const btnMaisVermifugos = document.getElementById("btnAdd_vermifugos");
  if (btnMaisVermifugos)
    btnMaisVermifugos.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      const clienteId = urlParams.get("cliente_id");
      const q = clienteId
        ? `?pet_id=${encodeURIComponent(petId)}&cliente_id=${encodeURIComponent(clienteId)}`
        : `?pet_id=${encodeURIComponent(petId)}`;
      window.location.href = `vermifugos-cadastro.html${q}`;
    });
  const btnPeriodicosV = document.getElementById("btnPeriodicos_vermifugos");
  if (btnPeriodicosV)
    btnPeriodicosV.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarNotificacao(
        'Ação "Periódicos" (Vermífugos) ainda não implementada.',
        "info",
      );
    });

  // antiparasitarios
  const btnMaisAntip = document.getElementById("btnAdd_antiparasitarios");
  if (btnMaisAntip)
    btnMaisAntip.addEventListener("click", () => {
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      const clienteId = urlParams.get("cliente_id");
      const q = clienteId
        ? `?pet_id=${encodeURIComponent(petId)}&cliente_id=${encodeURIComponent(clienteId)}`
        : `?pet_id=${encodeURIComponent(petId)}`;
      window.location.href = `antiparasitarios-cadastro.html${q}`;
    });
  const btnPeriodicosA = document.getElementById(
    "btnPeriodicos_antiparasitarios",
  );
  if (btnPeriodicosA)
    btnPeriodicosA.addEventListener("click", (e) => {
      e.preventDefault();
      mostrarNotificacao(
        'Ação "Periódicos" (Antiparasitários) ainda não implementada.',
        "info",
      );
    });
}

// Função para carregar apenas a área de Histórico
async function loadHistoricoIntoTab(petId) {
  const historicoTab = document.getElementById("historico");
  if (!historicoTab) return;

  // Obter ou criar wrapper dinâmico (após os controles fixos)
  let listWrapper = document.getElementById("hist-dynamic-list");
  if (!listWrapper) {
    listWrapper = document.createElement("div");
    listWrapper.id = "hist-dynamic-list";
    const controls = historicoTab.querySelector(".historico-controls");
    if (controls && controls.parentNode) {
      controls.parentNode.insertBefore(listWrapper, controls.nextSibling);
    } else {
      historicoTab.appendChild(listWrapper);
    }
  }
  // Remover card legado se existir
  const legacyCard = historicoTab.querySelector(".card");
  if (legacyCard) legacyCard.remove();

  listWrapper.innerHTML = `<div class="hist-loading"><i class="fas fa-circle-notch fa-spin"></i>&nbsp;Carregando...</div>`;

  // Buscar do backend
  let resp = null;
  try {
    resp = await fetch(`/api/pets/${encodeURIComponent(petId)}/historico`);
  } catch (e) {
    resp = null;
  }
  if (!resp || !resp.ok) {
    try {
      resp = await fetch(
        `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}/historico`,
      );
    } catch (e) {
      resp = null;
    }
  }

  let items = [];
  if (resp && resp.ok) {
    try {
      const json = await resp.json();
      items =
        (json && (json.historico || json.data || json.items || json)) || [];
      if (!Array.isArray(items)) items = [items];
    } catch (e) {
      items = [];
    }
  }

  if (!items || items.length === 0) {
    listWrapper.innerHTML = `<div class="hist-empty"><i class="fas fa-folder-open"></i><p>Não há histórico registrado</p></div>`;
    return;
  }

  // Agrupar por agendamento_id mantendo a ordem
  const groupsMap = new Map();
  items.forEach((it) => {
    const gid = it.agendamento_id || "avulso";
    if (!groupsMap.has(gid))
      groupsMap.set(gid, {
        id: gid,
        data: it.data,
        horario: it.horario,
        itens: [],
      });
    groupsMap.get(gid).itens.push(it);
  });

  const iconTipo = {
    vacinas: "fa-syringe",
    vermifugos: "fa-pills",
    antiparasitas: "fa-bug",
    consultas: "fa-stethoscope",
    exames: "fa-flask",
    receitas: "fa-file-medical",
    banhos: "fa-shower",
    tosas: "fa-cut",
    procedimentos: "fa-scissors",
  };

  function _relDate(dateStr) {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dd = new Date(d);
      dd.setHours(0, 0, 0, 0);
      const diff = Math.round((hoje - dd) / 86400000);
      if (diff === 0) return "hoje";
      if (diff === 1) return "ontem";
      if (diff < 30) return `há ${diff} dias`;
      const m = Math.round(diff / 30);
      if (m < 12) return m === 1 ? "há um mês" : `há ${m} meses`;
      const a = Math.round(diff / 365);
      return a === 1 ? "há um ano" : `há ${a} anos`;
    } catch (e) {
      return "";
    }
  }

  let html = "";
  groupsMap.forEach((group) => {
    const gid = group.id;
    const dataFmt = formatarData(group.data);
    const rel = _relDate(group.data);
    const categorias = [
      ...new Set(group.itens.map((i) => i.categoria || "estetico")),
    ];
    const catAttr = categorias.join(" ");

    const servicosHtml = group.itens
      .map((it) => {
        const cat = it.categoria || "estetico";
        const tipo = it.tipo || "procedimentos";
        const icon =
          iconTipo[tipo] ||
          (cat === "clinico" ? "fa-stethoscope" : "fa-scissors");
        const hora = it.horario || group.horario || "";
        const horaLabel = hora ? ` às ${hora}` : "";
        return `
                <div class="hist-service-card categoria-${cat}">
                    <div class="hist-service-icon"><i class="fas ${icon}"></i></div>
                    <div class="hist-service-info">
                        <div class="hist-service-name">${it.servico || "-"}</div>
                        <div class="hist-service-pro"><i class="fas fa-user-md"></i> ${it.profissional || "-"}</div>
                        <div class="hist-service-time"><i class="fas fa-clock"></i> ${dataFmt}${horaLabel}${rel ? ` <span class="hist-rel-small">(${rel})</span>` : ""}</div>
                    </div>
                </div>`;
      })
      .join("");

    const href =
      gid !== "avulso" ? `../agendamento-detalhes.html?id=${gid}` : "#";
    html += `
            <div class="hist-group" data-categoria="${catAttr}" onclick="if('${href}'!=='#') window.location.href='${href}'">
                <div class="hist-group-header">
                    <span class="hist-group-title">
                        <span class="hist-atend-label">ATENDIMENTO</span>
                        <strong class="atend-id">${gid !== "avulso" ? gid : "-"}</strong>
                        <span class="hist-sep">·</span>
                        <span class="hist-date">${dataFmt}</span>
                        ${rel ? `<span class="hist-rel">- ${rel}</span>` : ""}
                    </span>
                    <i class="fas fa-chevron-right hist-chevron"></i>
                </div>
                <div class="hist-group-body">${servicosHtml}</div>
            </div>`;
  });

  listWrapper.innerHTML = html;

  // Reaplicar filtro de pill ativo
  const activePill = document.querySelector(
    "#historico .pill-button.active[data-historico-type]",
  );
  if (activePill)
    _filtrarHistoricoGrupos(activePill.getAttribute("data-historico-type"));
}

function _filtrarHistoricoGrupos(tipo) {
  const grupos = document.querySelectorAll("#historico .hist-group");
  grupos.forEach((g) => {
    if (!tipo || tipo === "todos") {
      g.style.display = "";
      return;
    }
    const cats = (g.getAttribute("data-categoria") || "").split(" ");
    g.style.display = cats.includes(tipo) ? "" : "none";
  });
}

// ======= DOCUMENTOS =======
async function loadDocumentosIntoTab(petId) {
  const wrapper = document.getElementById("docs-dynamic-list");
  if (!wrapper) return;

  wrapper.innerHTML = `<div class="hist-loading"><i class="fas fa-circle-notch fa-spin"></i>&nbsp;Carregando...</div>`;

  let resp = null;
  try {
    resp = await fetch(`/api/pets/${encodeURIComponent(petId)}/documentos`);
  } catch (e) {
    resp = null;
  }
  if (!resp || !resp.ok) {
    try {
      resp = await fetch(
        `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}/documentos`,
      );
    } catch (e) {
      resp = null;
    }
  }

  let docs = [];
  if (resp && resp.ok) {
    try {
      const json = await resp.json();
      docs = json.documentos || json.data || json || [];
    } catch (e) {
      docs = [];
    }
  }

  if (!docs || docs.length === 0) {
    wrapper.innerHTML = `<div class="hist-empty"><i class="fas fa-folder-open"></i><p>Nenhum documento anexado</p></div>`;
    return;
  }

  // Agrupar por agendamento_id
  const groupsMap = new Map();
  docs.forEach((d) => {
    const gid = d.agendamento_id || "avulso";
    if (!groupsMap.has(gid))
      groupsMap.set(gid, { id: gid, data: d.data, files: [] });
    groupsMap.get(gid).files.push(d);
  });

  function fileIcon(type) {
    const t = (type || "").toLowerCase();
    if (t.startsWith("image/"))
      return { cls: "fa-file-image", color: "#3b82f6" };
    if (t === "application/pdf")
      return { cls: "fa-file-pdf", color: "#ef4444" };
    if (t.includes("word") || t.includes("document"))
      return { cls: "fa-file-word", color: "#2563eb" };
    if (t.includes("excel") || t.includes("spreadsheet"))
      return { cls: "fa-file-excel", color: "#16a34a" };
    return { cls: "fa-file-alt", color: "#6b7280" };
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  let html = "";
  groupsMap.forEach((group) => {
    const gid = group.id;
    const dataFmt = formatarData(group.data);
    const agendHref =
      gid !== "avulso" ? `../agendamento-detalhes.html?id=${gid}` : "#";

    const filesHtml = group.files
      .map((f) => {
        const { cls, color } = fileIcon(f.type);
        const sizeLabel = formatSize(f.size);
        const isImage = (f.type || "").startsWith("image/");
        const isPdf = f.type === "application/pdf";
        const previewAttr = isImage || isPdf ? `data-preview="${f.url}"` : "";
        return `
                <div class="doc-card" ${previewAttr} onclick="_abrirDoc('${f.url}','${f.type || ""}')" title="Clique para visualizar">
                    <div class="doc-card-icon" style="--doc-color:${color}">
                        <i class="fas ${cls}"></i>
                    </div>
                    <div class="doc-card-info">
                        <div class="doc-card-name">${f.name}</div>
                        ${sizeLabel ? `<div class="doc-card-meta">${sizeLabel}</div>` : ""}
                    </div>
                    <i class="fas fa-external-link-alt doc-card-open"></i>
                </div>`;
      })
      .join("");

    html += `
            <div class="docs-group">
                <div class="docs-group-header">
                    <span class="docs-group-label">ATENDIMENTO <strong>${gid !== "avulso" ? gid : "-"}</strong></span>
                    <span class="docs-group-date">${dataFmt}</span>
                    <a href="${agendHref}" class="docs-group-link" onclick="event.stopPropagation()"><i class="fas fa-arrow-right"></i> Ver atendimento</a>
                </div>
                <div class="docs-group-files">${filesHtml}</div>
            </div>`;
  });

  // Verificar se imagem pode ser exibida inline
  wrapper.innerHTML = html;
}

function _abrirDoc(url, type) {
  window.open(url, "_blank");
}

// Wire do botão de refresh para atualizar apenas a área de histórico
document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  const petId = urlParams.get("pet_id") || urlParams.get("id");
  const btn = document.getElementById("btnHistoricoRefresh");
  if (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      if (!petId) return;
      loadHistoricoIntoTab(petId).catch((err) => {
        console.error("Erro ao atualizar histórico:", err);
        mostrarNotificacao("Falha ao atualizar histórico", "error");
      });
    });
  }
  // opcional: carregar historico automaticamente quando a aba for ativada
  const historicoTabBtn = document.querySelector('.tab[data-tab="historico"]');
  if (historicoTabBtn) {
    historicoTabBtn.addEventListener("click", () => {
      if (petId) loadHistoricoIntoTab(petId).catch(() => {});
    });
  }
});

async function carregarPet(petId, clienteId) {
  try {
    // Tentar primeiro o endpoint relativo (quando a aplicação é servida pelo mesmo host)
    let resp;
    try {
      resp = await fetch(`/api/pets/${encodeURIComponent(petId)}`);
    } catch (err) {
      // falha de rede ao tentar relativo — será tratado abaixo
      resp = null;
    }

    // Se não obteve resposta OK, tentar o backend padrão (localhost:3000) — útil quando usando Live Server (porta 5500)
    if (!resp || !resp.ok) {
      try {
        resp = await fetch(
          `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}`,
        );
      } catch (err) {
        resp = null;
      }
    }

    if (!resp || !resp.ok) {
      const statusText = resp ? `status ${resp.status}` : "sem resposta";
      throw new Error("Falha ao buscar pet (" + statusText + ")");
    }

    const json = await resp.json();
    const pet = (json && (json.pet || json)) || {};
    if (!pet) throw new Error("Pet não encontrado");

    renderPet(pet, clienteId);
  } catch (e) {
    console.error("Erro ao carregar pet:", e);
    mostrarErro("Erro ao carregar os dados do pet.");
  }
}

function renderPet(pet, clienteId) {
  // Note: avatar image/fallback handled via localStorage + photo controls
  // manter elemento petAvatar como fallback (ex.: ícone paw) — atualizamos a foto mais abaixo

  // Nome e cliente
  const nameEl = document.getElementById("petName");
  if (nameEl) nameEl.textContent = pet.nome || "—";

  const clientEl = document.getElementById("petClient");
  if (clientEl) {
    console.debug(
      "renderPet: clientEl initial text=",
      clientEl.textContent && clientEl.textContent.trim(),
    );
    // Tentar extrair o nome do cliente a partir de vários campos comuns
    const nomeCliente =
      (pet &&
        ((pet.Cliente && pet.Cliente.nome) ||
          pet.cliente_nome ||
          pet.cliente ||
          pet.owner_name ||
          pet.nome_cliente ||
          pet.clienteName)) ||
      null;
    const idCliente =
      (pet && ((pet.Cliente && pet.Cliente.id) || pet.cliente_id)) ||
      clienteId ||
      "";

    function applyClientText(name, id) {
      console.debug("applyClientText:", { name, id });
      try {
        const tag = (clientEl.tagName || "").toLowerCase();
        if (tag === "a") {
          clientEl.href = `../client-details.html?id=${encodeURIComponent(id || "")}`;
          clientEl.textContent = name || "—";
        } else {
          clientEl.innerHTML = `Cliente: <a href="../client-details.html?id=${encodeURIComponent(id || "")}">${name || "—"}</a>`;
        }
      } catch (e) {
        try {
          clientEl.textContent = name || "—";
        } catch (ee) {}
      }
    }

    if (nomeCliente) {
      applyClientText(nomeCliente, idCliente);
    } else {
      // Tentar extrair nome já presente no DOM (ex.: "510 - Davi Miguel Santos" ou apenas "Davi Miguel Santos")
      try {
        const raw = (clientEl.textContent || "").trim();
        let parsedName = null;
        const m = raw.match(/^\s*\d+\s*-\s*(.+)$/);
        if (m && m[1]) parsedName = m[1].trim();
        else if (raw && raw !== "Cliente:" && raw !== "—") parsedName = raw;

        if (parsedName) {
          applyClientText(parsedName, idCliente);
        } else if (idCliente) {
          // Se não temos nome, tentar buscar do backend o nome do cliente por id (não bloqueante)
          applyClientText("Carregando...", idCliente);
          (async function fetchClientNameIfMissing(id) {
            try {
              let resp = null;
              try {
                resp = await fetch(`/api/clientes/${encodeURIComponent(id)}`);
              } catch (e) {
                resp = null;
              }
              if (!resp || !resp.ok) {
                try {
                  resp = await fetch(
                    `${location.protocol}//localhost:3000/api/clientes/${encodeURIComponent(id)}`,
                  );
                } catch (e) {
                  resp = null;
                }
              }
              if (resp && resp.ok) {
                const json = await resp.json();
                const c = json && (json.cliente || json || json.data);
                const nome =
                  (c && (c.nome || c.name || c.fullName || c.nome_completo)) ||
                  null;
                if (nome) {
                  applyClientText(nome, id);
                  return;
                }
              }
            } catch (e) {
              /* ignore */
            }
            // fallback: mostrar apenas o id
            applyClientText(`ID ${id}`, id);
          })(idCliente);
        } else {
          applyClientText(null, "");
        }
      } catch (e) {
        applyClientText(null, "");
      }
    }
  }

  // Tags
  const tagsContainer = document.getElementById("petTags");
  if (tagsContainer) {
    tagsContainer.innerHTML = "";
    const tagsArr = parseTags(pet.tags);
    if (tagsArr.length > 0) {
      const div = document.createElement("div");
      div.className = "tags-text";
      div.textContent = tagsArr.join(", ");
      tagsContainer.appendChild(div);
    } else {
      tagsContainer.textContent = "—";
    }
  }

  // Detalhes
  setText("petId", pet.id);
  setText("petEspecie", pet.especie || pet.raca || "—");
  setText("petRaca", pet.raca || pet.especie || "—");
  setText("petGenero", pet.genero || "—");
  setText("petDataNascimento", formatarData(pet.data_nascimento));
  setText("petIdade", calcularIdadePet(pet.data_nascimento));
  setText("petPorte", pet.porte || "—");
  setText("petPelagem", pet.pelagem || "—");
  setText("petChip", pet.chip || "—");
  setText("petAlimentacao", pet.alimentacao || "—");

  const ativoToggle = document.getElementById("petAtivoToggle");
  if (ativoToggle) {
    try {
      ativoToggle.checked = !!pet.ativo;
    } catch (e) {}
  }
  setText("petAtivo", pet.ativo ? "Sim" : "Não");
  setText("petObservacao", pet.observacao || pet.observacoes || "—");

  // Alergias - suportar array ou string
  const rawAlerg =
    pet.alergias || pet.alergia || pet.reacoes_alergicas || pet.alergias_list;
  let alergiasText = "—";
  if (rawAlerg) {
    if (Array.isArray(rawAlerg)) alergiasText = rawAlerg.join(", ");
    else if (typeof rawAlerg === "string") {
      const t = rawAlerg.trim();
      if (t.startsWith("[")) {
        try {
          const parsed = JSON.parse(t);
          if (Array.isArray(parsed)) alergiasText = parsed.join(", ");
          else alergiasText = parsed;
        } catch (e) {
          alergiasText = t;
        }
      } else {
        alergiasText = t;
      }
    } else {
      alergiasText = String(rawAlerg);
    }
  }
  setText("petAlergias", alergiasText);

  // Carregar foto persistida (se houver) para este pet
  try {
    const img = document.getElementById("petPhotoImg");
    const fallback = document.getElementById("petAvatar");
    const key = pet && pet.id ? `pet_${pet.id}_photo` : null;
    if (key) {
      const dataUrl = localStorage.getItem(key);
      if (dataUrl && img) {
        img.src = dataUrl;
        img.style.display = "block";
        if (fallback) fallback.style.display = "none";
      } else {
        if (img) img.style.display = "none";
        if (fallback) fallback.style.display = "flex";
      }
    }
  } catch (e) {
    /* ignore */
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value == null ? "—" : value;
}

function parseTags(tags) {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    const t = tags.trim();
    if (t.startsWith("[")) {
      try {
        return JSON.parse(t);
      } catch (e) {
        /* fallback */
      }
    }
    // CSV
    return t
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function formatarData(data) {
  if (!data) return "—";
  try {
    let d;
    if (typeof data === "string") {
      // YYYY-MM-DD → interpretar como data local (evita UTC offset de -1 dia no Brasil)
      const soData = data.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (soData) {
        d = new Date(
          Number(soData[1]),
          Number(soData[2]) - 1,
          Number(soData[3]),
        );
      } else {
        d = new Date(data);
      }
    } else {
      d = new Date(data);
    }
    if (isNaN(d)) return data;
    return d.toLocaleDateString("pt-BR");
  } catch (e) {
    return data;
  }
}

// Parseia uma string YYYY-MM-DD como data no fuso local (evita o problema de interpretação como UTC)
function parseDateLocal(dateStr) {
  if (!dateStr) return new Date(dateStr);
  if (typeof dateStr === "string") {
    // formato esperado do input date: YYYY-MM-DD
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      return new Date(y, mo, d);
    }
  }
  return new Date(dateStr);
}

function calcularIdadePet(dataNascimento) {
  if (!dataNascimento) return "—";
  // suportar DD/MM/YYYY ou ISO
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
  if (isNaN(nascimento)) return "—";

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

function mostrarErro(msg) {
  // Mostrar erro via toast
  showToast(msg || "Erro", "error", 4500);
}

// Remove elementos de overlay/modal que possam ter ficado abertos por outros módulos
function clearGlobalModalOverlays() {
  try {
    const selectors = [
      ".modal-overlay",
      ".modal-backdrop",
      ".overlay",
      ".swal-overlay",
      "#exitConfirmModal",
    ];
    selectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        // tentar remover classe show e esconder/remover o elemento
        try {
          el.classList.remove("show");
        } catch (e) {}
        try {
          el.style.display = "none";
        } catch (e) {}
        // remover do DOM para garantir que não fique sombreando
        try {
          if (el.parentNode) el.parentNode.removeChild(el);
        } catch (e) {}
      });
    });
    // remover possível classe no body que aplica overlay
    try {
      document.body.classList.remove("modal-open");
    } catch (e) {}
    try {
      document.body.style.overflow = "";
    } catch (e) {}
  } catch (e) {
    console.warn("clearGlobalModalOverlays erro", e);
  }
}

// Função que chama o backend para marcar o pet como inativo (soft delete)
async function inativarPet(petId) {
  if (!petId) throw new Error("petId ausente");
  const payload = { ativo: false };
  // tentar relativo
  let resp = null;
  try {
    resp = await fetch(`/api/pets/${encodeURIComponent(petId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    resp = null;
  }

  if (!resp || !resp.ok) {
    // tentar backend padrão
    try {
      resp = await fetch(
        `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    } catch (e) {
      resp = null;
    }
  }

  if (!resp) throw new Error("Sem resposta do servidor");
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(
      text && text.length ? text : "Erro do servidor: " + (resp.status || ""),
    );
  }
  return true;
}

// Tenta excluir o pet (DELETE). Se o backend não permitir, recorre a inativação (PUT {ativo:false}).
async function inativarOuExcluirPet(petId) {
  if (!petId) throw new Error("ID do pet ausente");

  // Primeiro: tentar DELETE
  try {
    let resp = null;
    try {
      resp = await fetch(`/api/pets/${encodeURIComponent(petId)}`, {
        method: "DELETE",
      });
    } catch (e) {
      resp = null;
    }

    if (!resp || !resp.ok) {
      try {
        resp = await fetch(
          `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}`,
          { method: "DELETE" },
        );
      } catch (e) {
        resp = null;
      }
    }

    if (resp && resp.ok) return true; // excluído com sucesso

    // Se DELETE não for permitido (405) ou endpoint não existir (404), tentar inativar via PUT
    if (
      resp &&
      (resp.status === 405 || resp.status === 404 || resp.status === 400)
    ) {
      // fallback para inativação
      await inativarPet(petId);
      return true;
    }

    // Caso não tenhamos resposta ou esteja com outro erro, tentar fazer PUT como fallback de último recurso
    try {
      await inativarPet(petId);
      return true;
    } catch (e) {
      // propagar erro original se possível
      const msg = resp
        ? `Erro ao excluir (status ${resp.status})`
        : "Sem resposta ao tentar excluir";
      throw new Error(msg + (e && e.message ? ": " + e.message : ""));
    }
  } catch (e) {
    // propagar qualquer erro
    throw e;
  }
}

// Fechar modal de confirmação (utilizado também pelo onclick inline do HTML)
function closeConfirmDeleteModal() {
  const modal = document.getElementById("confirmDeleteModal");
  if (modal) {
    modal.style.display = "none";
  }
  try {
    document.body.style.overflow = "auto";
  } catch (e) {}
}

// Função acionada quando o usuário confirma a inativação
async function confirmarInativacao() {
  const btn = document.getElementById("confirmDeleteBtn");
  try {
    if (btn) btn.disabled = true;
    const petIdEl = document.getElementById("petId");
    const petId = petIdEl
      ? (petIdEl.textContent || petIdEl.innerText || "").trim()
      : null;
    if (!petId) {
      showToast("ID do pet não encontrado", "error");
      closeConfirmDeleteModal();
      return;
    }
    await inativarOuExcluirPet(petId);
    // mostrar notificação no estilo do sistema (mais visível)
    try {
      mostrarNotificacao("Pet inativado com sucesso", "success");
    } catch (e) {
      showToast("Pet inativado com sucesso", "success");
    }
    closeConfirmDeleteModal();
    // redirecionar para a página do cliente (se disponível) para não mostrar mais a ficha do pet
    const params = new URLSearchParams(window.location.search);
    const clienteIdLocal =
      params.get("cliente_id") ||
      params.get("clienteId") ||
      params.get("cliente") ||
      params.get("cid");
    if (clienteIdLocal) {
      setTimeout(() => {
        try {
          window.location.href = `../client-details.html?id=${encodeURIComponent(clienteIdLocal)}`;
        } catch (e) {
          window.history.back();
        }
      }, 700);
    } else {
      // fallback: voltar no histórico
      setTimeout(() => {
        try {
          window.history.back();
        } catch (e) {
          location.href = "../clientes.html";
        }
      }, 700);
    }
  } catch (e) {
    console.error("Erro ao inativar pet:", e);
    showToast(
      "Erro ao inativar pet: " + (e && e.message ? e.message : ""),
      "error",
      5000,
    );
    if (btn) btn.disabled = false;
  }
}

// Expor as funções globalmente (por segurança, caso HTML use onclick inline)
try {
  window.closeConfirmDeleteModal = closeConfirmDeleteModal;
  window.confirmarInativacao = confirmarInativacao;
} catch (e) {}

// Toast helper
function showToast(message, type = "info", timeout = 3000) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const t = document.createElement("div");
  t.className = `toast ${type}`;
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  // escolha de ícone simples
  icon.innerHTML = type === "success" ? "âœ“" : type === "error" ? "!" : "ðŸ”";
  const txt = document.createElement("div");
  txt.className = "toast-text";
  txt.textContent = message;
  const close = document.createElement("button");
  close.className = "toast-close";
  close.innerHTML = "×";
  close.addEventListener("click", () => {
    if (t.parentNode) t.parentNode.removeChild(t);
  });

  t.appendChild(icon);
  t.appendChild(txt);
  t.appendChild(close);
  container.appendChild(t);

  if (timeout > 0) {
    setTimeout(() => {
      try {
        t.remove();
      } catch (e) {}
    }, timeout);
  }
  return t;
}

// Notificação no mesmo estilo do novo-cliente.js (notification + icon + close)
function mostrarNotificacao(mensagem, tipo = "info") {
  // remover notificação anterior
  const anterior = document.querySelector(".notification");
  if (anterior) anterior.remove();

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
    default:
      icone = "fas fa-info-circle";
  }

  notificacao.innerHTML = `
        <i class="${icone}"></i>
        <span>${mensagem}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

  document.body.appendChild(notificacao);

  // auto remover após 5 segundos
  setTimeout(() => {
    if (notificacao.parentElement) notificacao.remove();
  }, 5000);
}

// ----------------------------
// Carregar vacinas inline na aba #vacinas
// ----------------------------
async function loadVacinasIntoTab(petId, clienteId) {
  // Wrapper para o carregador genérico
  return loadResourceIntoTab("vacinas", petId, clienteId, [
    { key: "data_aplicacao", label: "Data aplicação" },
    { key: "produto", label: "Produto" },
    { key: "lote", label: "Lote" },
    { key: "dose", label: "Dose" },
    { key: "data_renovacao", label: "Renovação" },
    { key: "profissional", label: "Profissional" },
  ]);
}

// Função genérica para carregar recursos (vacinas, vermifugos, antiparasitarios)
async function loadResourceIntoTab(resourceId, petId, clienteId, columns) {
  const container = document.getElementById(resourceId);
  if (!container) return;

  // Montar cabeçalho da tabela baseado em columns
  const headersHtml = columns.map((c) => `<th>${c.label}</th>`).join("");

  // Personalizar cabeçalho para vacinas (dois controles) ou usar botão padrão
  const headerTitle =
    columns[0].label === "Data aplicação" && resourceId === "vacinas"
      ? "Vacinas aplicadas"
      : columns[0].label;
  let headerRightHtml = `<div><button id="btnAdd_${resourceId}" class="btn btn-primary">Adicionar</button></div>`;

  container.innerHTML = `
        <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center">
                <h3>${headerTitle}</h3>
                ${headerRightHtml}
            </div>
            <div class="card-body">
                <div class="table-wrap">
                    <table class="data-table" id="table_${resourceId}">
                        <thead><tr>${headersHtml}</tr></thead>
                        <tbody></tbody>
                    </table>
                    <div class="table-empty" id="empty_${resourceId}">Carregando...</div>
                </div>
            </div>
        </div>
    `;

  const tbody = container.querySelector(`#table_${resourceId} tbody`);
  const empty = container.querySelector(`#empty_${resourceId}`);

  try {
    let resp = null;
    try {
      resp = await fetch(
        `/api/pets/${encodeURIComponent(petId)}/${resourceId}`,
      );
    } catch (e) {
      resp = null;
    }
    if (!resp || !resp.ok) {
      try {
        resp = await fetch(
          `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}/${resourceId}`,
        );
      } catch (e) {
        resp = null;
      }
    }

    let items = [];
    if (resp && resp.ok) {
      const json = await resp.json();
      items = (json && (json[resourceId] || json.data || json)) || [];
    } else {
      // fallback para pet.<resourceId>
      try {
        let pr = null;
        try {
          pr = await fetch(`/api/pets/${encodeURIComponent(petId)}`);
        } catch (e) {
          pr = null;
        }
        if (!pr || !pr.ok) {
          try {
            pr = await fetch(
              `${location.protocol}//localhost:3000/api/pets/${encodeURIComponent(petId)}`,
            );
          } catch (e) {
            pr = null;
          }
        }
        if (pr && pr.ok) {
          const pj = await pr.json();
          const pet = pj && (pj.pet || pj);
          if (pet && pet[resourceId]) items = pet[resourceId];
        }
      } catch (e) {
        /* ignore */
      }
    }

    // Registrar clique no botão DENTRO do container (evita conflito com IDs duplicados no tabsActions)
    const btnAddCard = container.querySelector(`[id="btnAdd_${resourceId}"]`);
    if (btnAddCard) {
      btnAddCard.onclick = () => {
        if (resourceId === "vacinas") {
          _abrirModalVacina(petId);
        } else if (resourceId === "vermifugos") {
          _abrirModalVermifugo(petId);
        } else if (resourceId === "antiparasitarios") {
          _abrirModalAntiparasitario(petId);
        } else {
          const q = clienteId
            ? `?pet_id=${encodeURIComponent(petId)}&cliente_id=${encodeURIComponent(clienteId)}`
            : `?pet_id=${encodeURIComponent(petId)}`;
          window.location.href = `${resourceId}-cadastro.html${q}`;
        }
      };
    }

    if (!items || items.length === 0) {
      empty.textContent = "Nenhuma informação registrada";
      return;
    }

    empty.style.display = "none";
    tbody.innerHTML = "";
    const dateKeys = new Set([
      "data_aplicacao",
      "data_renovacao",
      "dataAplic",
      "renovacao",
      "data_nascimento",
      "data",
      "periodicidade",
    ]);
    items.forEach((it) => {
      const tr = document.createElement("tr");
      const rowHtml = columns
        .map((c) => {
          const val = it[c.key];
          if (val == null || val === "") return "<td>-</td>";
          const display = dateKeys.has(c.key) ? formatarData(val) : val;
          return `<td>${display}</td>`;
        })
        .join("");
      tr.innerHTML = rowHtml;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.warn("Erro ao carregar resource", resourceId, e);
    empty.textContent = "Erro ao carregar dados";
  }
}

/* ====== Gráfico de peso: controle do modal, persistência e renderização ====== */
function initPesoControls() {
  const btn = document.getElementById("btnAddPeso");
  const modal = document.getElementById("pesoModal");
  const btnCancel = document.getElementById("pesoCancel");
  const btnSave = document.getElementById("pesoSave");
  const btnShowChart = document.getElementById("btnShowChart");
  const btnShowList = document.getElementById("btnShowList");

  if (btn)
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openPesoModal();
    });

  // alternar entre gráfico e lista
  if (btnShowList)
    btnShowList.addEventListener("click", (e) => {
      e.preventDefault();
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      showListView(petId);
    });
  if (btnShowChart)
    btnShowChart.addEventListener("click", (e) => {
      e.preventDefault();
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      showChartView(petId);
    });

  if (btnCancel)
    btnCancel.addEventListener("click", (e) => {
      e.preventDefault();
      closePesoModal();
    });
  if (btnSave)
    btnSave.addEventListener("click", (e) => {
      e.preventDefault();
      savePesoFromModal();
    });

  // setar data padrão como hoje
  const dateInput = document.getElementById("pesoData");
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);

  // renderizar gráfico na carga (usando petId da query string se disponível)
  const urlParams = new URLSearchParams(window.location.search);
  const petId = urlParams.get("pet_id") || urlParams.get("id");
  if (petId) renderPesoChart(petId);
  if (petId) renderPesoList(petId);
}

function openPesoModal() {
  const modal = document.getElementById("pesoModal");
  const dateInput = document.getElementById("pesoData");
  const kgInput = document.getElementById("pesoKg");
  if (!modal) return;
  // abrir em modo novo por padrão: limpar possível modo de edição
  try {
    delete modal.dataset.editIndex;
  } catch (e) {}
  if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
  if (kgInput) {
    kgInput.value = "";
    try {
      kgInput.focus();
    } catch (e) {}
  }
  modal.style.display = "flex";
}

function closePesoModal() {
  const modal = document.getElementById("pesoModal");
  if (!modal) return;
  modal.style.display = "none";
}

function savePesoFromModal() {
  const dateInput = document.getElementById("pesoData");
  const kgInput = document.getElementById("pesoKg");
  const urlParams = new URLSearchParams(window.location.search);
  const petId = urlParams.get("pet_id") || urlParams.get("id");
  if (!petId) {
    mostrarNotificacao("ID do pet ausente", "error");
    return;
  }
  if (!dateInput || !kgInput) return;
  const date = dateInput.value;
  const kg = parseFloat(kgInput.value);
  if (!date) {
    mostrarNotificacao("Informe a data", "error");
    return;
  }
  if (!kg || isNaN(kg) || kg <= 0) {
    mostrarNotificacao("Informe um peso válido", "error");
    return;
  }

  const key = `pet_${petId}_pesos`;
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    arr = [];
  }
  const modal = document.getElementById("pesoModal");
  const editIndex =
    modal && modal.dataset && modal.dataset.editIndex != null
      ? Number(modal.dataset.editIndex)
      : null;
  if (editIndex != null && !isNaN(editIndex)) {
    // atualizar item existente
    if (editIndex >= 0 && editIndex < arr.length) {
      arr[editIndex] = { date: date, peso: Number(kg.toFixed(2)) };
    } else {
      // fallback: push
      arr.push({ date: date, peso: Number(kg.toFixed(2)) });
    }
    try {
      delete modal.dataset.editIndex;
    } catch (e) {}
  } else {
    // adicionar novo
    arr.push({ date: date, peso: Number(kg.toFixed(2)) });
  }
  // ordenar por data asc (usar parseDateLocal para evitar shift de fuso)
  arr = arr.sort((a, b) => parseDateLocal(a.date) - parseDateLocal(b.date));
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (e) {
    console.error("Falha ao salvar peso", e);
  }

  closePesoModal();
  mostrarNotificacao("Peso salvo", "success");
  // atualizar gráfico
  renderPesoChart(petId);
  renderPesoList(petId);
}

function renderPesoChart(petId) {
  const key = `pet_${petId}_pesos`;
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    arr = [];
  }
  const chartWrap = document.querySelector(".peso-chart");
  if (!chartWrap) return;
  const listWrap = document.querySelector(".peso-list");
  const svg = chartWrap.querySelector("svg");
  const canvas = document.getElementById("chartPeso");
  const emptyMsg = chartWrap.querySelector(".peso-empty");

  if (!arr || arr.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    if (canvas) canvas.style.display = "none";
    if (svg) svg.style.display = "";
    if (listWrap) listWrap.style.display = "none";
    if (pesoChart) {
      try {
        pesoChart.destroy();
      } catch (e) {}
      pesoChart = null;
    }
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  // preparar dados
  const labels = arr.map((r) => {
    try {
      return parseDateLocal(r.date).toLocaleDateString("pt-BR");
    } catch (e) {
      return r.date;
    }
  });
  const dataVals = arr.map((r) => Number(r.peso));
  const minVal = Math.min(...dataVals);
  const maxVal = Math.max(...dataVals);
  const avg = dataVals.reduce((s, v) => s + v, 0) / dataVals.length;

  // usar Chart.js se disponível
  if (window.Chart && canvas) {
    // esconder svg fallback e garantir canvas visível e com altura fixa
    if (svg) svg.style.display = "none";
    canvas.style.display = "block";
    try {
      canvas.height = 240;
    } catch (e) {}
    canvas.style.height = "240px";
    if (listWrap) listWrap.style.display = "none";
    // preparar configuração
    const ctx = canvas.getContext("2d");
    const suggestedMin = Math.max(0, Math.floor(minVal - 1));
    const suggestedMax = Math.ceil(maxVal + 1);

    const cfg = {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Peso (Kg)",
            data: dataVals,
            backgroundColor: dataVals.map(() => "rgba(13,110,253,0.15)"),
            borderColor: "#0d6efd",
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: "category", // forçar categorias para evitar parsing automático como time
            grid: { display: false },
            ticks: {
              // garantir que os rótulos venham diretamente do labels array
              callback: function (value, index) {
                try {
                  return this.chart.data.labels[index];
                } catch (e) {
                  return value;
                }
              },
            },
          },
          y: {
            beginAtZero: false,
            suggestedMin: suggestedMin,
            suggestedMax: suggestedMax,
            ticks: { stepSize: 1 },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} kg`,
            },
          },
        },
      },
      plugins: [
        {
          id: "avgLine",
          afterDatasetsDraw: function (chart, args, options) {
            const dataset = chart.data.datasets[0];
            if (!dataset || !dataset.data || dataset.data.length === 0) return;
            const yScale = chart.scales.y;
            const xScale = chart.scales.x;
            const ctx2 = chart.ctx;
            const avgVal =
              dataset.data.reduce((s, v) => s + v, 0) / dataset.data.length;
            const y = yScale.getPixelForValue(avgVal);
            ctx2.save();
            ctx2.beginPath();
            ctx2.setLineDash([6, 4]);
            ctx2.strokeStyle = "#0d6efd";
            ctx2.lineWidth = 1;
            ctx2.moveTo(xScale.left, y);
            ctx2.lineTo(xScale.right, y);
            ctx2.stroke();
            ctx2.fillStyle = "#0d6efd";
            ctx2.font = "12px Inter, Arial, sans-serif";
            const label = `Média: ${avgVal.toFixed(2)} kg`;
            const textWidth = ctx2.measureText(label).width;
            ctx2.fillText(label, xScale.right - textWidth - 6, y - 6);
            ctx2.restore();
          },
        },
      ],
    };

    // Para evitar problemas de dimensionamento após alternar display, destruímos a instância anterior e recriamos
    try {
      if (pesoChart) {
        pesoChart.destroy();
        pesoChart = null;
      }
    } catch (e) {
      console.warn("Erro ao destruir pesoChart existente", e);
    }

    canvas.style.height = "240px";
    pesoChart = new Chart(ctx, cfg);
    try {
      window.pesoChart = pesoChart;
    } catch (e) {}
    return;
  }

  // fallback: mostrar svg se Chart.js não disponível
  if (svg) {
    svg.style.display = "";
    if (listWrap) listWrap.style.display = "none";
    // aqui podemos reutilizar a renderização SVG anterior (opcional)
  }
}

function renderPesoList(petId) {
  const key = `pet_${petId}_pesos`;
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    arr = [];
  }
  const listWrap = document.querySelector(".peso-list");
  const chartWrap = document.querySelector(".peso-chart");
  if (!listWrap || !chartWrap) return;
  // construir HTML simples: cada item com pill e data
  if (!arr || arr.length === 0) {
    listWrap.innerHTML =
      '<div class="peso-list-empty" style="color:#9aa0a6; padding:8px">Nenhum registro</div>';
    return;
  }
  // ordenar decrescente para mostrar mais recente primeiro
  // manter índice original para poder editar/excluir por posição
  const mapped = arr.map((it, idx) => ({ idx, date: it.date, peso: it.peso }));
  const sorted = mapped
    .slice()
    .sort((a, b) => parseDateLocal(b.date) - parseDateLocal(a.date));
  const itemsHtml = sorted
    .map((it) => {
      const d = (function (dt) {
        try {
          return parseDateLocal(dt).toLocaleDateString("pt-BR");
        } catch (e) {
          return dt;
        }
      })(it.date);
      return `<div class="peso-list-item" data-idx="${it.idx}">
            <span class="peso-pill">${Number(it.peso).toFixed(2).replace(/\.00$/, "").replace(".", ",")} kg</span>
            <span class="peso-list-text">${d}</span>
            <div class="peso-actions">
                <button class="peso-action-btn peso-edit" title="Editar" data-idx="${it.idx}"><i class="fas fa-pen"></i></button>
                <button class="peso-action-btn peso-delete" title="Excluir" data-idx="${it.idx}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    })
    .join("\n");
  listWrap.innerHTML = itemsHtml;

  // ligar handlers: excluir (sem confirmação) e editar (abrir modal)
  listWrap.querySelectorAll(".peso-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = Number(btn.getAttribute("data-idx"));
      try {
        deletePeso(petId, idx);
      } catch (err) {
        console.error(err);
      }
    });
  });
  listWrap.querySelectorAll(".peso-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const idx = Number(btn.getAttribute("data-idx"));
      try {
        editPeso(petId, idx);
      } catch (err) {
        console.error(err);
      }
    });
  });
}

function deletePeso(petId, index) {
  const key = `pet_${petId}_pesos`;
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    arr = [];
  }
  if (index == null || index < 0 || index >= arr.length) return;
  // remover o elemento
  arr.splice(index, 1);
  try {
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (e) {
    console.error("Falha ao salvar peso", e);
  }
  // atualizar visual
  renderPesoList(petId);
  renderPesoChart(petId);
}

function editPeso(petId, index) {
  const key = `pet_${petId}_pesos`;
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem(key) || "[]");
  } catch (e) {
    arr = [];
  }
  if (index == null || index < 0 || index >= arr.length) return;
  const item = arr[index];
  // abrir modal pré-preenchido para edição
  const modal = document.getElementById("pesoModal");
  const dateInput = document.getElementById("pesoData");
  const kgInput = document.getElementById("pesoKg");
  if (!modal || !dateInput || !kgInput) return;
  dateInput.value = item.date;
  kgInput.value = item.peso;
  // marcar modo edição
  modal.dataset.editIndex = String(index);
  modal.style.display = "flex";
}

function showListView(petId) {
  const chartWrap = document.querySelector(".peso-chart");
  const listWrap = document.querySelector(".peso-list");
  const canvas = document.getElementById("chartPeso");
  const svg = document.querySelector(".peso-chart svg");
  if (chartWrap) chartWrap.classList.remove("show-chart");
  if (canvas) canvas.style.display = "none";
  if (svg) svg.style.display = "none";
  if (listWrap) {
    renderPesoList(petId);
    listWrap.style.display = "block";
  }
}

function showChartView(petId) {
  const chartWrap = document.querySelector(".peso-chart");
  const listWrap = document.querySelector(".peso-list");
  const canvas = document.getElementById("chartPeso");
  const svg = document.querySelector(".peso-chart svg");
  if (listWrap) listWrap.style.display = "none";
  if (svg) svg.style.display = "";
  if (canvas) canvas.style.display = "block";
  // re-renderizar para garantir dados atualizados
  if (petId) renderPesoChart(petId);
}

/* ===== Controles de foto do pet: upload, preview e persistência em localStorage ===== */
// Reduz a resolução/qualidade da imagem antes de salvar (retorna DataURL JPEG)
function compressAndResizeImage(
  file,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.65,
) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("File missing"));
    const reader = new FileReader();
    reader.onerror = (e) => reject(e);
    reader.onload = function (evt) {
      const img = new Image();
      img.onload = function () {
        try {
          const origW = img.naturalWidth || img.width;
          const origH = img.naturalHeight || img.height;
          const ratio = Math.min(
            1,
            Math.min(maxWidth / origW, maxHeight / origH),
          );
          const targetW = Math.round(origW * ratio);
          const targetH = Math.round(origH * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d");
          // preencher fundo branco para evitar artefatos ao converter PNG com transparência para JPEG
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);
          // converter para JPEG para reduzir tamanho; usar qualidade fornecida
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (err) {
          // fallback para dataUrl original
          resolve(evt.target.result);
        }
      };
      img.onerror = function (err) {
        resolve(evt.target.result);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function initPetPhotoControls() {
  const wrapper = document.querySelector(".pet-photo-wrapper");
  const input = document.getElementById("petPhotoInput");
  const editBtn = document.getElementById("petPhotoEditBtn");
  const img = document.getElementById("petPhotoImg");
  const fallback = document.getElementById("petAvatar");
  const removeBtn = document.getElementById("petPhotoRemoveBtn");

  // abrir seletor ao clicar na wrapper
  if (wrapper) {
    wrapper.addEventListener("click", () => {
      if (input) input.click();
    });
    wrapper.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (input) input.click();
      }
    });
  }

  if (editBtn) {
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (input) input.click();
    });
  }

  if (input) {
    input.addEventListener("change", async (e) => {
      const file = input.files && input.files[0];
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        mostrarNotificacao("Selecione uma imagem válida", "error");
        return;
      }
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      if (!petId) {
        mostrarNotificacao("ID do pet ausente", "error");
        return;
      }
      try {
        // reduzir/resample e comprimir antes de salvar
        const compressedDataUrl = await compressAndResizeImage(
          file,
          1000,
          1000,
          0.65,
        );
        try {
          localStorage.setItem(`pet_${petId}_photo`, compressedDataUrl);
        } catch (err) {
          console.error("Falha ao salvar foto", err);
        }
        // atualizar UI
        if (img) {
          img.src = compressedDataUrl;
          img.style.display = "block";
        }
        if (fallback) fallback.style.display = "none";
        if (removeBtn) {
          removeBtn.style.display = "inline-block";
        }
        // marcar wrapper como tendo foto
        try {
          if (wrapper && wrapper.classList) {
            wrapper.classList.add("has-photo");
            wrapper.classList.remove("no-photo");
          }
        } catch (e) {}
        mostrarNotificacao("Foto atualizada", "success");
      } catch (err) {
        console.error("Erro ao processar imagem:", err);
        mostrarNotificacao(
          "Erro ao processar a imagem. Tente outro arquivo.",
          "error",
        );
      }
    });
  }

  // On load: aplicar foto se já existir no localStorage
  (function applySavedPhoto() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      if (!petId) return;
      const key = `pet_${petId}_photo`;
      const dataUrl = localStorage.getItem(key);
      if (dataUrl && img) {
        img.src = dataUrl;
        img.style.display = "block";
        if (fallback) fallback.style.display = "none";
        if (removeBtn) removeBtn.style.display = "inline-block";
        try {
          if (wrapper && wrapper.classList) {
            wrapper.classList.add("has-photo");
            wrapper.classList.remove("no-photo");
          }
        } catch (e) {}
      } else {
        if (img) img.style.display = "none";
        if (fallback) fallback.style.display = "flex";
        if (removeBtn) removeBtn.style.display = "none";
        try {
          if (wrapper && wrapper.classList) {
            wrapper.classList.add("no-photo");
            wrapper.classList.remove("has-photo");
          }
        } catch (e) {}
      }
    } catch (e) {
      /* ignore */
    }
  })();

  // Remover foto quando o usuário clicar no botão
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const urlParams = new URLSearchParams(window.location.search);
      const petId = urlParams.get("pet_id") || urlParams.get("id");
      if (!petId) {
        mostrarNotificacao("ID do pet ausente", "error");
        return;
      }
      const key = `pet_${petId}_photo`;
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.error("Falha ao remover foto", err);
      }
      // atualizar UI
      if (img) {
        img.src = "";
        img.style.display = "none";
      }
      if (fallback) {
        fallback.style.display = "flex";
      }
      removeBtn.style.display = "none";
      try {
        if (wrapper && wrapper.classList) {
          wrapper.classList.add("no-photo");
          wrapper.classList.remove("has-photo");
        }
      } catch (e) {}
      mostrarNotificacao("Foto removida", "success");
    });
  }
}

// ==========================================
// MODAIS DE REGISTRO CLÍNICO (Vacina / Vermifugo / Antiparasitário)
// ==========================================

/**
 * Helper: cria overlay de modal genérico e injeta no body.
 * Retorna { overlay, form } para manipulação posterior.
 */
function _criarModalRegistro(modalId, titulo, corBtn, fieldsHtml, onSave) {
  // Remover eventual modal anterior
  const antigo = document.getElementById(modalId);
  if (antigo) antigo.remove();

  const overlay = document.createElement("div");
  overlay.id = modalId;
  overlay.style.cssText = `
        position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,.45);
    `;

  overlay.innerHTML = `
        <div style="background:#fff;border-radius:12px;width:480px;max-width:96vw;
                    box-shadow:0 8px 40px rgba(0,0,0,.22);display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:18px 24px 14px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:16px;font-weight:700;color:#111">${titulo}</span>

            </div>
            <form id="${modalId}_form" style="padding:20px 24px 8px;display:flex;flex-direction:column;gap:14px;">
                ${fieldsHtml}
            </form>
            <div style="padding:12px 24px 18px;display:flex;gap:10px;justify-content:flex-end;">
                <button type="button" id="${modalId}_cancelar"
                    style="padding:8px 20px;border-radius:8px;border:1px solid #d1d5db;background:#f9fafb;
                           color:#374151;font-size:14px;cursor:pointer;">Cancelar</button>
                <button type="button" id="${modalId}_salvar"
                    style="padding:8px 22px;border-radius:8px;border:none;background:${corBtn};
                           color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Salvar</button>
            </div>
        </div>
    `;

  document.body.appendChild(overlay);

  const fechar = () => overlay.remove();
  overlay
    .querySelector(`#${modalId}_cancelar`)
    .addEventListener("click", fechar);
  overlay
    .querySelector(`#${modalId}_salvar`)
    .addEventListener("click", () => onSave(fechar));

  return overlay;
}

/** Helper: faz fetch com fallback localhost:3000 */
async function _apiFetch(path, options) {
  try {
    const r = await fetch(path, options);
    if (r.ok) return r;
  } catch (e) {
    /* fallback */
  }
  return fetch(`${location.protocol}//localhost:3000${path}`, options);
}

/** Helper: carrega periodicidades e preenche select */
async function _carregarPeriodicidadesSelect(selectId) {
  try {
    const r = await _apiFetch("/api/periodicidades");
    if (!r.ok) return;
    const json = await r.json();
    const lista = Array.isArray(json)
      ? json
      : json.periodicidades || json.data || [];
    const sel = document.getElementById(selectId);
    if (!sel) return;
    lista.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.descricao || p.nome || "";
      opt.textContent = p.descricao || p.nome || "";
      sel.appendChild(opt);
    });
  } catch (e) {
    /* silencioso */
  }
}

/**
 * Cria um dropdown buscável de itens do estoque dentro de um container existente.
 * O container deve ter um <input id="${inputId}"> e um <div id="${listId}"> em branco.
 * Retorna { getSelected: () => { id, nome, estoque } | null }
 */
function _iniciarDropdownItens(inputId, listId, itens) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  if (!input || !list) return { getSelected: () => null };

  let selecionado = null;

  const stBase = `position:absolute;top:100%;left:0;right:0;z-index:99999;
        background:#fff;border:1px solid #d1d5db;border-top:none;border-radius:0 0 8px 8px;
        max-height:220px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.12);display:none;`;
  list.setAttribute("style", stBase);

  function renderLista(filtro) {
    list.innerHTML = "";
    const termo = (filtro || "").toLowerCase().trim();
    const filtrados = termo
      ? itens.filter((i) => (i.nome || "").toLowerCase().includes(termo))
      : itens;

    if (filtrados.length === 0) {
      list.innerHTML = `<div style="padding:10px 14px;color:#9ca3af;font-size:13px;">Nenhum item encontrado</div>`;
      list.style.display = "block";
      return;
    }

    filtrados.slice(0, 60).forEach((item) => {
      const estoque = item.estoqueAtual ?? item.estoque ?? 0;
      const semEstoque = estoque <= 0;
      const row = document.createElement("div");
      row.style.cssText = `padding:9px 14px;cursor:${semEstoque ? "not-allowed" : "pointer"};
                display:flex;justify-content:space-between;align-items:center;gap:8px;
                font-size:13px;color:${semEstoque ? "#9ca3af" : "#111"};
                border-bottom:1px solid #f3f4f6;`;
      row.innerHTML = `
                <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nome}</span>
                <span style="font-size:11px;padding:2px 8px;border-radius:12px;white-space:nowrap;
                    background:${semEstoque ? "#fee2e2" : "#dcfce7"};
                    color:${semEstoque ? "#dc2626" : "#16a34a"};">
                    Estoque: ${estoque}
                </span>`;
      row.addEventListener("mouseenter", () => {
        if (!semEstoque) row.style.background = "#f0f9ff";
      });
      row.addEventListener("mouseleave", () => {
        row.style.background = "";
      });
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        if (semEstoque) return;
        selecionado = item;
        input.value = item.nome;
        input.style.borderColor = "#10b981";
        list.style.display = "none";
      });
      list.appendChild(row);
    });
    list.style.display = "block";
  }

  input.addEventListener("focus", () => renderLista(input.value));
  input.addEventListener("input", () => {
    selecionado = null;
    input.style.borderColor = "#d1d5db";
    renderLista(input.value);
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      list.style.display = "none";
    }, 200);
  });

  return { getSelected: () => selecionado };
}

/**
 * Carrega itens do estoque da API e inicializa dropdown buscável.
 * Retorna o objeto com getSelected().
 */
async function _carregarDropdownItens(inputId, listId, categorias) {
  try {
    const r = await _apiFetch("/api/itens?limit=500");
    if (!r.ok) return { getSelected: () => null };
    const json = await r.json();
    let itens = Array.isArray(json)
      ? json
      : json.itens || json.data || json.produtos || [];
    if (categorias && categorias.length) {
      const cats = categorias.map((c) => c.toLowerCase());
      itens = itens.filter((item) => {
        const cat = (item.categoria || "").toLowerCase();
        const agrup = (item.agrupamento || "").toLowerCase();
        return cats.some((c) => cat === c || agrup === c);
      });
    }
    return _iniciarDropdownItens(inputId, listId, itens);
  } catch (e) {
    return { getSelected: () => null };
  }
}

/** Popula um <select> com profissionais da API */
async function _carregarProfissionaisSelect(selectId) {
  try {
    const r = await _apiFetch("/api/profissionais");
    if (!r.ok) return;
    const json = await r.json();
    const lista = Array.isArray(json)
      ? json
      : json.profissionais || json.data || [];
    const sel = document.getElementById(selectId);
    if (!sel) return;
    lista.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.nome || p.name || "";
      opt.textContent = p.nome || p.name || "";
      sel.appendChild(opt);
    });
  } catch (e) {
    /* silencioso */
  }
}

/** Dá baixa de 1 unidade no estoque do item, silenciosamente */
async function _baixarEstoque(itemId, itemNome) {
  try {
    await _apiFetch(`/api/itens/${itemId}/estoque`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantidade: 1,
        operacao: "reduzir",
        observacao: `Aplicação registrada via prontuário do pet`,
      }),
    });
  } catch (e) {
    console.warn(
      "Aviso: não foi possível dar baixa no estoque de",
      itemNome,
      e,
    );
  }
}

// CSS do dropdown compartilhado (injetado uma vez)
(function _injetarCssDropdown() {
  if (document.getElementById("_css_dropdown_itens")) return;
  const s = document.createElement("style");
  s.id = "_css_dropdown_itens";
  s.textContent = `
        .di-wrap { position:relative; }
        .di-wrap input:focus { border-color:#3b82f6 !important; outline:none; box-shadow:0 0 0 3px rgba(59,130,246,.12); }
    `;
  document.head.appendChild(s);
})();

// ---- Modal Vacina ----
function _abrirModalVacina(petId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const fields = `
        <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:13px;font-weight:600;color:#374151">Produto *</label>
            <div class="di-wrap">
                <input id="mv_nome" type="text" placeholder="Buscar vacina no estoque..."
                    autocomplete="off"
                    style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                <div id="mv_nome_list"></div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Data de aplicação</label>
                <input id="mv_dataAplic" type="date" value="${hoje}"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Dose</label>
                <input id="mv_dose" type="text" placeholder="Ex: 1 dose"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Lote</label>
                <input id="mv_lote" type="text" placeholder="Ex: A1234"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Renovação</label>
                <select id="mv_renovacao"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;">
                    <option value="">— Selecionar —</option>
                </select>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:13px;font-weight:600;color:#374151">Profissional</label>
            <select id="mv_profissional"
                style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;width:100%;">
                <option value="">— Selecionar —</option>
            </select>
        </div>
    `;

  let dropdownCtrl = { getSelected: () => null };

  _criarModalRegistro(
    "_modalVacinaPet",
    "Registrar Vacina",
    "#10b981",
    fields,
    async (fechar) => {
      const itemSel = dropdownCtrl.getSelected();
      const nomeDigitado = document.getElementById("mv_nome").value.trim();
      const nome = itemSel ? itemSel.nome : nomeDigitado;
      if (!nome) {
        mostrarNotificacao("Escolha ou informe o nome da vacina", "error");
        return;
      }
      const payload = {
        nome,
        dataAplic: document.getElementById("mv_dataAplic").value,
        dose: document.getElementById("mv_dose").value.trim(),
        lote: document.getElementById("mv_lote").value.trim(),
        renovacao: document.getElementById("mv_renovacao").value,
        profissional: document.getElementById("mv_profissional").value,
      };
      try {
        const r = await _apiFetch(`/api/pets/${petId}/vacinas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await r.json();
        if (!r.ok) {
          mostrarNotificacao(json.error || "Erro ao salvar vacina", "error");
          return;
        }
        if (itemSel && itemSel.id)
          await _baixarEstoque(itemSel.id, itemSel.nome);
        mostrarNotificacao("Vacina registrada com sucesso!", "success");
        fechar();
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get("cliente_id");
        loadResourceIntoTab("vacinas", petId, clienteId, [
          { key: "data_aplicacao", label: "Data aplicação" },
          { key: "produto", label: "Produto" },
          { key: "lote", label: "Lote" },
          { key: "dose", label: "Dose" },
          { key: "data_renovacao", label: "Renovação" },
          { key: "profissional", label: "Profissional" },
        ]);
      } catch (e) {
        mostrarNotificacao("Erro ao salvar vacina", "error");
      }
    },
  );

  // Carregar dados após o modal ser inserido no DOM
  _carregarDropdownItens("mv_nome", "mv_nome_list", ["vacina"]).then((ctrl) => {
    dropdownCtrl = ctrl;
  });
  _carregarPeriodicidadesSelect("mv_renovacao");
  _carregarProfissionaisSelect("mv_profissional");
  setTimeout(() => {
    const el = document.getElementById("mv_nome");
    if (el) el.focus();
  }, 80);
}

// ---- Modal Vermifugo ----
function _abrirModalVermifugo(petId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const fields = `
        <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:13px;font-weight:600;color:#374151">Produto *</label>
            <div class="di-wrap">
                <input id="vmf_nome" type="text" placeholder="Buscar vermífugo no estoque..."
                    autocomplete="off"
                    style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                <div id="vmf_nome_list"></div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Data de aplicação</label>
                <input id="vmf_dataAplic" type="date" value="${hoje}"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Dose</label>
                <input id="vmf_dose" type="text" placeholder="Ex: 1 comprimido"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Lote</label>
                <input id="vmf_lote" type="text" placeholder="Ex: A1234"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Renovação</label>
                <select id="vmf_renovacao"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;">
                    <option value="">— Selecionar —</option>
                </select>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:13px;font-weight:600;color:#374151">Profissional</label>
            <select id="vmf_profissional"
                style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;width:100%;">
                <option value="">— Selecionar —</option>
            </select>
        </div>
    `;

  let dropdownCtrl = { getSelected: () => null };

  _criarModalRegistro(
    "_modalVermifugoPet",
    "Registrar Vermífugo",
    "#3b82f6",
    fields,
    async (fechar) => {
      const itemSel = dropdownCtrl.getSelected();
      const nomeDigitado = document.getElementById("vmf_nome").value.trim();
      const nome = itemSel ? itemSel.nome : nomeDigitado;
      if (!nome) {
        mostrarNotificacao("Escolha ou informe o nome do produto", "error");
        return;
      }
      const payload = {
        nome,
        dataAplic: document.getElementById("vmf_dataAplic").value,
        dose: document.getElementById("vmf_dose").value.trim(),
        lote: document.getElementById("vmf_lote").value.trim(),
        renovacao: document.getElementById("vmf_renovacao").value,
        profissional: document.getElementById("vmf_profissional").value,
      };
      try {
        const r = await _apiFetch(`/api/pets/${petId}/vermifugos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await r.json();
        if (!r.ok) {
          mostrarNotificacao(json.error || "Erro ao salvar vermífugo", "error");
          return;
        }
        if (itemSel && itemSel.id)
          await _baixarEstoque(itemSel.id, itemSel.nome);
        mostrarNotificacao("Vermífugo registrado com sucesso!", "success");
        fechar();
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get("cliente_id");
        loadResourceIntoTab("vermifugos", petId, clienteId, [
          { key: "data_aplicacao", label: "Data aplicação" },
          { key: "produto", label: "Produto" },
          { key: "lote", label: "Lote" },
          { key: "dose", label: "Dose" },
          { key: "data_renovacao", label: "Renovação" },
          { key: "profissional", label: "Profissional" },
        ]);
      } catch (e) {
        mostrarNotificacao("Erro ao salvar vermífugo", "error");
      }
    },
  );

  _carregarDropdownItens("vmf_nome", "vmf_nome_list", [
    "vermífugo",
    "vermifugos",
  ]).then((ctrl) => {
    dropdownCtrl = ctrl;
  });
  _carregarPeriodicidadesSelect("vmf_renovacao");
  _carregarProfissionaisSelect("vmf_profissional");
  setTimeout(() => {
    const el = document.getElementById("vmf_nome");
    if (el) el.focus();
  }, 80);
}

// ---- Modal Antiparasitário ----
function _abrirModalAntiparasitario(petId) {
  const hoje = new Date().toISOString().slice(0, 10);
  const fields = `
        <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:13px;font-weight:600;color:#374151">Produto *</label>
            <div class="di-wrap">
                <input id="ap_nome" type="text" placeholder="Buscar antiparasitário no estoque..."
                    autocomplete="off"
                    style="width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
                <div id="ap_nome_list"></div>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Data de aplicação</label>
                <input id="ap_dataAplic" type="date" value="${hoje}"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Dose</label>
                <input id="ap_dose" type="text" placeholder="Ex: 1 pipeta"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Lote</label>
                <input id="ap_lote" type="text" placeholder="Ex: A1234"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px;">
                <label style="font-size:13px;font-weight:600;color:#374151">Renovação</label>
                <select id="ap_renovacao"
                    style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;">
                    <option value="">— Selecionar —</option>
                </select>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:13px;font-weight:600;color:#374151">Profissional</label>
            <select id="ap_profissional"
                style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:#fff;width:100%;">
                <option value="">— Selecionar —</option>
            </select>
        </div>
    `;

  let dropdownCtrl = { getSelected: () => null };

  _criarModalRegistro(
    "_modalAntiparasitarioPet",
    "Registrar Antiparasitário",
    "#f59e0b",
    fields,
    async (fechar) => {
      const itemSel = dropdownCtrl.getSelected();
      const nomeDigitado = document.getElementById("ap_nome").value.trim();
      const nome = itemSel ? itemSel.nome : nomeDigitado;
      if (!nome) {
        mostrarNotificacao("Escolha ou informe o nome do produto", "error");
        return;
      }
      const payload = {
        nome,
        dataAplic: document.getElementById("ap_dataAplic").value,
        dose: document.getElementById("ap_dose").value.trim(),
        lote: document.getElementById("ap_lote").value.trim(),
        renovacao: document.getElementById("ap_renovacao").value,
        profissional: document.getElementById("ap_profissional").value,
      };
      try {
        const r = await _apiFetch(`/api/pets/${petId}/antiparasitarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await r.json();
        if (!r.ok) {
          mostrarNotificacao(
            json.error || "Erro ao salvar antiparasitário",
            "error",
          );
          return;
        }
        if (itemSel && itemSel.id)
          await _baixarEstoque(itemSel.id, itemSel.nome);
        mostrarNotificacao(
          "Antiparasitário registrado com sucesso!",
          "success",
        );
        fechar();
        const urlParams = new URLSearchParams(window.location.search);
        const clienteId = urlParams.get("cliente_id");
        loadResourceIntoTab("antiparasitarios", petId, clienteId, [
          { key: "data_aplicacao", label: "Data aplicação" },
          { key: "produto", label: "Produto" },
          { key: "lote", label: "Lote" },
          { key: "dose", label: "Dose" },
          { key: "data_renovacao", label: "Renovação" },
          { key: "profissional", label: "Profissional" },
        ]);
      } catch (e) {
        mostrarNotificacao("Erro ao salvar antiparasitário", "error");
      }
    },
  );

  _carregarDropdownItens("ap_nome", "ap_nome_list", [
    "antiparasitário",
    "antiparasitarios",
  ]).then((ctrl) => {
    dropdownCtrl = ctrl;
  });
  _carregarPeriodicidadesSelect("ap_renovacao");
  _carregarProfissionaisSelect("ap_profissional");
  setTimeout(() => {
    const el = document.getElementById("ap_nome");
    if (el) el.focus();
  }, 80);
}

// iniciar controles de foto ao carregar DOM
document.addEventListener("DOMContentLoaded", function () {
  initPetPhotoControls();
});
