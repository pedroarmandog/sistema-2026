// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log("🚀 menu.js carregado (snippet do dashboard)");

function detectarIDsDuplicados() {
  const idsParaVerificar = [
    "clienteMenuItem",
    "clienteSubmenu",
    "itemMenuItem",
    "itemSubmenu",
    "petMenuItem",
    "petSubmenu",
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "financeiroMenuItem",
    "financeiroSubmenu",
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "painelMenuItem",
    "painelSubmenu",
    "comprasMenuItem",
    "comprasSubmenu",
  ];

  let problemas = [];
  idsParaVerificar.forEach((id) => {
    const elementos = document.querySelectorAll(`#${id}`);
    if (elementos.length > 1) {
      problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
      console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
    }
  });

  if (problemas.length > 0) {
    console.error("🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:");
    problemas.forEach((p) => console.error(`   - ${p}`));
    return false;
  }

  console.log("✅ Verificação de IDs: Nenhum duplicado encontrado");
  return true;
}

function configurarDropdownInicioRapido() {
  if (window.dropdownConfigurado) return;
  const dropdownBtn = document.getElementById("inicioRapidoBtn");
  const dropdown = document.querySelector(".dropdown");
  if (dropdownBtn && dropdown) {
    dropdownBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      const wasOpen = dropdown.classList.contains("open");
      dropdown.classList.toggle("open");
    });

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target)) {
        if (dropdown.classList.contains("open"))
          dropdown.classList.remove("open");
      }
    });

    window.dropdownConfigurado = true;
  }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
  try {
    const estadoSubmenus = JSON.parse(
      localStorage.getItem("estadoSubmenus") || "{}",
    );
    estadoSubmenus[submenuId] = isOpen;
    localStorage.setItem("estadoSubmenus", JSON.stringify(estadoSubmenus));
  } catch (error) {
    console.error(error);
  }
}

function obterEstadoSubmenu(submenuId) {
  try {
    return (
      JSON.parse(localStorage.getItem("estadoSubmenus") || "{}")[submenuId] ||
      false
    );
  } catch (e) {
    return false;
  }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
  const menuItems = document.querySelectorAll(`#${menuItemId}`);
  const submenus = document.querySelectorAll(`#${submenuId}`);
  if (menuItems.length > 1) {
    for (let i = 1; i < menuItems.length; i++) {
      const duplicateElement = menuItems[i].closest(".nav-item-with-submenu");
      if (duplicateElement) duplicateElement.remove();
    }
  }
  if (submenus.length > 1) {
    for (let i = 1; i < submenus.length; i++) submenus[i].remove();
  }

  const menuItem = document.getElementById(menuItemId);
  const submenu = document.getElementById(submenuId);
  const menuContainer = menuItem?.parentElement;
  if (menuItem && submenu && menuContainer) {
    if (menuItem.getAttribute("data-listener-added")) return;
    menuItem.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (e.target.closest(".submenu-item")) return;
      fecharOutrosSubmenus(submenuName);
      const isNowOpen = !menuContainer.classList.contains("open");
      menuContainer.classList.toggle("open");
      submenu.classList.toggle("open");
      salvarEstadoSubmenu(submenuName, isNowOpen);
    });

    const submenuItems = submenu.querySelectorAll(".submenu-item[href]");
    submenuItems.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        setTimeout(() => {
          menuContainer.classList.remove("open");
          submenu.classList.remove("open");
          salvarEstadoSubmenu(submenuName, false);
        }, 150);
      }),
    );
    const submenuItemsSemHref = submenu.querySelectorAll(
      ".submenu-item:not([href])",
    );
    submenuItemsSemHref.forEach((item) =>
      item.addEventListener("click", function (e) {
        e.stopPropagation();
        menuContainer.classList.remove("open");
        submenu.classList.remove("open");
        salvarEstadoSubmenu(submenuName, false);
      }),
    );

    menuItem.setAttribute("data-listener-added", "true");
  }
}

function fecharOutrosSubmenus(submenuAtual) {
  const todosSubmenus = [
    { container: "clienteMenuItem", submenu: "clienteSubmenu", id: "cliente" },
    { container: "itemMenuItem", submenu: "itemSubmenu", id: "item" },
    { container: "petMenuItem", submenu: "petSubmenu", id: "pet" },
    {
      container: "atendimentoMenuItem",
      submenu: "atendimentoSubmenu",
      id: "atendimento",
    },
    {
      container: "financeiroMenuItem",
      submenu: "financeiroSubmenu",
      id: "financeiro",
    },
    {
      container: "configuracaoMenuItem",
      submenu: "configuracaoSubmenu",
      id: "configuracao",
    },
    { container: "painelMenuItem", submenu: "painelSubmenu", id: "painel" },
    { container: "comprasMenuItem", submenu: "comprasSubmenu", id: "compras" },
  ];
  todosSubmenus.forEach(({ container, submenu, id }) => {
    if (id !== submenuAtual) {
      const containerElement =
        document.getElementById(container)?.parentElement;
      const submenuElement = document.getElementById(submenu);
      if (containerElement && submenuElement) {
        if (containerElement.classList.contains("open")) {
          containerElement.classList.remove("open");
          submenuElement.classList.remove("open");
          salvarEstadoSubmenu(id, false);
        }
      }
    }
  });
}

function limparEstadoSubmenus() {
  try {
    localStorage.removeItem("estadoSubmenus");
  } catch (e) {}
}

function destacarSecaoAtiva() {
  const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
  const mapeamentoPaginas = {
    "clientes.html": "clienteMenuItem",
    "novo-cliente.html": "clienteMenuItem",
    "grupos-clientes.html": "clienteMenuItem",
    "meus-clientes.html": "clienteMenuItem",
    "meus-itens.html": "itemMenuItem",
    "novo-item.html": "itemMenuItem",
    "agrupamento.html": "itemMenuItem",
    "marca.html": "itemMenuItem",
    "unidade.html": "itemMenuItem",
    "descontos-item.html": "itemMenuItem",
    "comissao.html": "itemMenuItem",
    "etiquetas.html": "itemMenuItem",
    "tributacao.html": "itemMenuItem",
    "estoque.html": "itemMenuItem",
    "clinica.html": "itemMenuItem",
    "manutencao-produtos.html": "itemMenuItem",
    "controle-validade.html": "itemMenuItem",
    "agendamentos-novo.html": "atendimentoMenuItem",
    "agendamentos.html": "atendimentoMenuItem",
    "minha-agenda.html": "atendimentoMenuItem",
    "meus-pets.html": "petMenuItem",
    "novo-pet.html": "petMenuItem",
    "dashboard.html": "dashboard",
  };
  const itemParaDestacar = mapeamentoPaginas[paginaAtual];
  if (itemParaDestacar && itemParaDestacar !== "dashboard") {
    const menuItem = document.getElementById(itemParaDestacar);
    if (menuItem) {
      document
        .querySelectorAll(".nav-item")
        .forEach((item) => item.classList.remove("active"));
      menuItem.classList.add("active");
    }
  }
}

// Inicialização
document.addEventListener("DOMContentLoaded", function () {
  detectarIDsDuplicados();
  limparEstadoSubmenus();

  const menuToggle = document.querySelector(".menu-toggle");
  const sidebar = document.querySelector(".sidebar");
  const mainContent = document.querySelector(".main-content");
  if (menuToggle && sidebar && mainContent) {
    if (!menuToggle.hasAttribute("data-toggle-configured")) {
      menuToggle.setAttribute("data-toggle-configured", "true");
      menuToggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle("collapsed");
        mainContent.classList.toggle("sidebar-collapsed");
      });
    }
  }

  document.addEventListener("click", function (e) {
    if (window.innerWidth <= 768) {
      if (
        sidebar &&
        mainContent &&
        !sidebar.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        sidebar.classList.add("collapsed");
        mainContent.classList.add("sidebar-collapsed");
      }
    }
  });

  configurarDropdownInicioRapido();
  configurarPersistenciaSubmenu("clienteMenuItem", "clienteSubmenu", "cliente");
  configurarPersistenciaSubmenu("itemMenuItem", "itemSubmenu", "item");
  configurarPersistenciaSubmenu("painelMenuItem", "painelSubmenu", "painel");
  configurarPersistenciaSubmenu("petMenuItem", "petSubmenu", "pet");
  configurarPersistenciaSubmenu(
    "atendimentoMenuItem",
    "atendimentoSubmenu",
    "atendimento",
  );
  configurarPersistenciaSubmenu(
    "financeiroMenuItem",
    "financeiroSubmenu",
    "financeiro",
  );
  configurarPersistenciaSubmenu(
    "configuracaoMenuItem",
    "configuracaoSubmenu",
    "configuracao",
  );
  configurarPersistenciaSubmenu("comprasMenuItem", "comprasSubmenu", "compras");
  destacarSecaoAtiva();
});

// Funções de navegação rápida (shims)
function novoAtendimento() {
  window.location.href = "/agendamentos-novo.html";
  closeDropdown();
}
function novoPet() {
  window.location.href = "/pets/cadastro-pet.html";
  closeDropdown();
}
function novoCliente() {
  window.location.href = "/clientes.html";
  closeDropdown();
}
function novoContrato() {
  window.location.href = "/contrato-novo.html";
  closeDropdown();
}
function novaVenda() {
  window.location.href = "/venda-nova.html";
  closeDropdown();
}
function novaContaPagar() {
  window.location.href = "/contas-pagar-nova.html";
  closeDropdown();
}
function closeDropdown() {
  const dropdown = document.querySelector(".dropdown");
  if (dropdown) dropdown.classList.remove("open");
}

// Configurar submenu lateral para Caixa
function configurarSubmenuLateralCaixa() {
  console.log("🔍 Iniciando configuração do submenu lateral Caixa...");

  const caixaSubmenuItem = document.getElementById("caixaSubmenuItem");
  const caixaLateralSubmenu = document.getElementById("caixaLateralSubmenu");
  const submenuItemWithLateral = document.querySelector(
    ".submenu-item-with-lateral",
  );

  console.log("🔍 Elementos encontrados:");
  console.log("- caixaSubmenuItem:", caixaSubmenuItem);
  console.log("- caixaLateralSubmenu:", caixaLateralSubmenu);
  console.log("- submenuItemWithLateral:", submenuItemWithLateral);

  if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
    console.log("✅ Configurando submenu lateral do Caixa...");

    let isSubmenuVisible = false;

    // Função para mostrar submenu
    const showSubmenu = () => {
      console.log("📤 Mostrando submenu lateral");
      caixaLateralSubmenu.style.opacity = "1";
      caixaLateralSubmenu.style.visibility = "visible";
      caixaLateralSubmenu.style.transform = "translateX(0)";
      isSubmenuVisible = true;
    };

    // Função para esconder submenu
    const hideSubmenu = () => {
      console.log("📥 Escondendo submenu lateral");
      caixaLateralSubmenu.style.opacity = "0";
      caixaLateralSubmenu.style.visibility = "hidden";
      caixaLateralSubmenu.style.transform = "translateX(-10px)";
      isSubmenuVisible = false;
    };

    // Configurar hover no container principal
    submenuItemWithLateral.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no container do Caixa");
      showSubmenu();
    });

    submenuItemWithLateral.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do container do Caixa");
      setTimeout(hideSubmenu, 100);
    });

    // Configurar hover no submenu lateral
    caixaLateralSubmenu.addEventListener("mouseenter", function () {
      console.log("🎯 Mouse entrou no submenu lateral");
      showSubmenu();
    });

    caixaLateralSubmenu.addEventListener("mouseleave", function () {
      console.log("🎯 Mouse saiu do submenu lateral");
      hideSubmenu();
    });

    // Adicionar event listeners para os itens do submenu lateral
    const lateralItems = caixaLateralSubmenu.querySelectorAll(
      ".lateral-submenu-item",
    );
    console.log(
      `🔍 Encontrados ${lateralItems.length} itens no submenu lateral`,
    );

    lateralItems.forEach((item, index) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const texto = this.textContent.trim();
        console.log(`🚀 Clique em: ${texto}`);

        // Aqui você pode adicionar navegação específica para cada item
        switch (texto) {
          case "Abertura/Fechamento":
            alert("Navegando para Abertura/Fechamento de Caixa");
            // window.location.href = '/caixa/abertura-fechamento.html';
            break;
          case "Suprimento/Sangria":
            alert("Navegando para Suprimento/Sangria");
            // window.location.href = '/caixa/suprimento-sangria.html';
            break;
          case "Rel. Demonstrativo de caixa":
            alert("Navegando para Relatório Demonstrativo de Caixa");
            // window.location.href = '/caixa/relatorio-demonstrativo.html';
            break;
        }

        hideSubmenu();
      });

      console.log(
        `✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`,
      );
    });

    console.log("✅ Submenu lateral do Caixa configurado com sucesso!");
  } else {
    console.error("❌ Elementos do submenu lateral Caixa não encontrados");
    console.log(
      "- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML",
    );
    console.log(
      "- Verifique se a classe .submenu-item-with-lateral existe no HTML",
    );
  }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener("DOMContentLoaded", function () {
  // Aguardar um pouco para garantir que outros elementos carregaram
  setTimeout(() => {
    configurarSubmenuLateralCaixa();
  }, 200);
});

// ==================== PAGAMENTOS ====================

let todosDocumentos = []; // entradas não pagas
let todosHistorico = []; // entradas com situacao='pago'
let filteredDocumentos = [];
let tabAtiva = "documentos";
let fornecedoresCache = [];
let documentosSelecionados = [];

// ---------- LOAD DATA ----------
async function carregarDocumentos() {
  try {
    const res = await fetch("/api/entrada/manual");
    if (!res.ok) throw new Error("status " + res.status);
    let data = await res.json();
    if (!Array.isArray(data)) {
      if (data && Array.isArray(data.rows)) data = data.rows;
      else if (data && Array.isArray(data.data)) data = data.data;
      else data = [];
    }
    todosDocumentos = data.filter((e) => {
      const s = (e.situacao || "").toLowerCase();
      // Mostrar entradas concluídas (estoque recebido, pagamento pendente)
      // e também qualquer status diferente de pago/excluido/pendente (para compatibilidade)
      return (
        s !== "pago" && s !== "excluido" && s !== "pendente" && s !== "ignorada"
      );
    });
    // Fallback: se não há entradas 'concluido', mostrar também as 'pendente' para não ficar vazio
    if (todosDocumentos.length === 0) {
      todosDocumentos = data.filter((e) => {
        const s = (e.situacao || "").toLowerCase();
        return s !== "pago" && s !== "excluido" && s !== "ignorada";
      });
    }
    todosHistorico = data.filter(
      (e) => (e.situacao || "").toLowerCase() === "pago",
    );
    filteredDocumentos = [...todosDocumentos];
    renderizarTabela();
  } catch (e) {
    console.error("Erro ao carregar documentos:", e);
  }
}

async function carregarFornecedores() {
  try {
    const res = await fetch("/api/fornecedores?limit=500");
    if (!res.ok) return;
    const data = await res.json();
    fornecedoresCache = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn("Erro carregarFornecedores:", e);
  }
}

// ---------- BANNER TOTAIS ----------
function atualizarBannerTotais() {
  const banner = document.getElementById("bannerTotais");
  if (!banner) return;
  if (!documentosSelecionados.length) {
    banner.style.display = "none";
    return;
  }
  const sel = todosDocumentos.filter((d) =>
    documentosSelecionados.includes(String(d.id)),
  );
  const totalBruto = sel.reduce(
    (s, d) => s + Number(d.valorTotal || d.totalProdutos || 0),
    0,
  );
  banner.style.display = "flex";
  banner.innerHTML = `
    <div class="banner-total-item"><span>Total Bruto</span><strong>${totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
    <div class="banner-total-item"><span>Total Multa</span><strong>0,00</strong></div>
    <div class="banner-total-item"><span>Total Juros</span><strong>0,00</strong></div>
    <div class="banner-total-item"><span>Total Líquido</span><strong>${totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
    <div class="banner-total-item"><span>Total Desconto</span><strong>0,00</strong></div>
    <div class="banner-total-item banner-total-pagar"><span>Total a Pagar</span><strong>${totalBruto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></div>
  `;
}

// ---------- RENDER ----------
function fmtData(iso) {
  if (!iso) return "-";
  try {
    const p = iso.split("T")[0].split("-");
    return `${p[2]}/${p[1]}/${p[0]}`;
  } catch (e) {
    return iso;
  }
}
function fmtVal(v) {
  return isNaN(parseFloat(v))
    ? "0,00"
    : parseFloat(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function vencClass(iso) {
  if (!iso) return "";
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const d = new Date(iso + "T00:00:00");
    if (d < hoje) return "venc-atrasado";
    if (d.toDateString() === hoje.toDateString()) return "venc-hoje";
  } catch (e) {}
  return "";
}

function renderizarTabela() {
  const tbody = document.getElementById("tabelaPagamentosBody");
  if (!tbody) return;
  const dados = tabAtiva === "historico" ? todosHistorico : filteredDocumentos;
  if (!dados || dados.length === 0) {
    const msg =
      tabAtiva === "historico"
        ? "Nenhum histórico de pagamento encontrado"
        : "Nenhum documento a pagar encontrado";
    tbody.innerHTML = `<tr class="empty-state"><td colspan="12"><div class="empty-message"><i class="fas fa-inbox"></i><p>${msg}</p></div></td></tr>`;
    return;
  }
  const isHistorico = tabAtiva === "historico";
  tbody.innerHTML = dados
    .map((doc) => {
      const saldo = Number(doc.valorTotal || doc.totalProdutos || 0);
      const venc = doc.dataEntrada || doc.dataEmissao || "";
      return `<tr class="${vencClass(venc)}">
      <td>${isHistorico ? "" : `<input type="checkbox" class="checkbox-documento" data-id="${doc.id}">`}</td>
      <td>${doc.numero ? doc.numero + "/1" : "-"}</td>
      <td>${fmtData(doc.dataEmissao)}</td>
      <td>${fmtData(venc)}</td>
      <td>${doc.fornecedor || "-"}</td>
      <td>${doc.numero ? "N. " + doc.numero + "/1" : "-"}</td>
      <td>${fmtVal(saldo)}</td>
      <td>0,00</td>
      <td>0,00</td>
      <td>0,00</td>
      <td><strong>${fmtVal(saldo)}</strong></td>
      <td><button class="btn-opcoes-doc" onclick="abrirOpcoesDocumento('${doc.id}')"><i class="fas fa-ellipsis-v"></i></button></td>
    </tr>`;
    })
    .join("");
  configurarCheckboxes();
}

// ---------- CHECKBOXES ----------
function configurarCheckboxes() {
  const selectAll = document.getElementById("checkboxSelectAll");
  const cbs = document.querySelectorAll(".checkbox-documento");
  cbs.forEach((cb) => {
    cb.addEventListener("change", function () {
      const id = String(this.dataset.id);
      if (this.checked) {
        if (!documentosSelecionados.includes(id))
          documentosSelecionados.push(id);
      } else
        documentosSelecionados = documentosSelecionados.filter((x) => x !== id);
      if (selectAll)
        selectAll.checked = Array.from(cbs).every((c) => c.checked);
      atualizarBannerTotais();
    });
  });
  if (selectAll) {
    selectAll.addEventListener("change", function () {
      cbs.forEach((cb) => {
        cb.checked = this.checked;
        const id = String(cb.dataset.id);
        if (this.checked) {
          if (!documentosSelecionados.includes(id))
            documentosSelecionados.push(id);
        }
      });
      if (!this.checked) documentosSelecionados = [];
      atualizarBannerTotais();
    });
  }
}

// ---------- FORNECEDOR AUTOCOMPLETE ----------
function configurarFornecedorAutocomplete() {
  const input = document.getElementById("filtroFornecedor");
  const dropdown = document.getElementById("fornecedorDropdownList");
  if (!input || !dropdown) return;

  function mostrarDropdown(itens) {
    dropdown.innerHTML = "";
    if (!itens || !itens.length) {
      dropdown.style.display = "none";
      return;
    }
    itens.forEach((f) => {
      const item = document.createElement("div");
      item.className = "forn-dd-item";
      item.textContent = f.nome || f.razaoSocial || "-";
      item.addEventListener("click", () => {
        input.value = f.nome || f.razaoSocial || "";
        dropdown.style.display = "none";
        aplicarFiltros();
      });
      dropdown.appendChild(item);
    });
    dropdown.style.display = "block";
  }

  input.addEventListener("focus", () => {
    const q = input.value.trim().toLowerCase();
    const fil = q
      ? fornecedoresCache.filter((f) =>
          (f.nome || "").toLowerCase().includes(q),
        )
      : fornecedoresCache;
    mostrarDropdown(fil.slice(0, 60));
  });
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const fil = q
      ? fornecedoresCache.filter((f) =>
          (f.nome || "").toLowerCase().includes(q),
        )
      : fornecedoresCache;
    mostrarDropdown(fil.slice(0, 60));
    aplicarFiltros();
  });
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target))
      dropdown.style.display = "none";
  });
}

// ---------- FILTERS ----------
function aplicarFiltros() {
  const fornecedor = (document.getElementById("filtroFornecedor")?.value || "")
    .trim()
    .toLowerCase();
  const documento = (document.getElementById("filtroDocumento")?.value || "")
    .trim()
    .toLowerCase();
  const nota = (document.getElementById("filtroNota")?.value || "")
    .trim()
    .toLowerCase();
  const valor = (document.getElementById("filtroValor")?.value || "").trim();
  const dataVenc = (
    document.getElementById("filtroDataVencimento")?.value || ""
  ).trim();
  const previsao = document.getElementById("filtroPrevisao")?.value || "todos";

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dMais7 = new Date(hoje);
  dMais7.setDate(hoje.getDate() + 7);
  const dMais30 = new Date(hoje);
  dMais30.setDate(hoje.getDate() + 30);

  filteredDocumentos = todosDocumentos.filter((doc) => {
    if (
      fornecedor &&
      !(doc.fornecedor || "").toLowerCase().includes(fornecedor)
    )
      return false;
    if (
      documento &&
      !String(doc.numero || "")
        .toLowerCase()
        .includes(documento)
    )
      return false;
    if (
      nota &&
      !String(doc.numero || "")
        .toLowerCase()
        .includes(nota)
    )
      return false;
    if (valor) {
      const vf = parseFloat(valor.replace(",", "."));
      if (
        !isNaN(vf) &&
        Math.abs(Number(doc.valorTotal || doc.totalProdutos || 0) - vf) > 0.01
      )
        return false;
    }
    const vencISO = doc.dataEntrada || doc.dataEmissao || "";
    if (dataVenc && vencISO && vencISO.split("T")[0] !== dataVenc) return false;
    if (previsao !== "todos" && vencISO) {
      try {
        const d = new Date(vencISO + "T00:00:00");
        if (previsao === "atrasado" && d >= hoje) return false;
        if (previsao === "hoje" && d.toDateString() !== hoje.toDateString())
          return false;
        if (previsao === "proximos7" && (d < hoje || d > dMais7)) return false;
        if (previsao === "proximos30" && (d < hoje || d > dMais30))
          return false;
      } catch (e) {}
    }
    return true;
  });

  documentosSelecionados = [];
  atualizarBannerTotais();
  renderizarTabela();
}

// ---------- TOAST ----------
function mostrarToastPF(msg, tipo) {
  const cor = tipo === "error" ? "#d32f2f" : "#2e7d32";
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:28px;right:28px;background:${cor};color:#fff;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:600;z-index:999999;box-shadow:0 4px 14px rgba(0,0,0,0.25);opacity:0;transition:opacity 0.3s;`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => {
    t.style.opacity = "1";
  });
  setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, 3200);
}

// ---------- MODAL DE PAGAMENTO ----------
// ---------- MODAL NOVO DOCUMENTO A PAGAR ----------
function abrirModalNovoDoc() {
  const hoje = new Date().toISOString().split("T")[0];

  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:99998;opacity:0;transition:opacity 0.3s;";

  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-62%) scale(0.87);width:95%;max-width:620px;background:#fff;z-index:99999;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.25);border:2px solid #1976d2;overflow:hidden;opacity:0;transition:all 0.35s cubic-bezier(0.34,1.56,0.64,1);";

  modal.innerHTML = `
    <div style="background:#1976d2;padding:16px 22px;display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:10px;">
        <i class="fas fa-file-invoice-dollar" style="color:#fff;font-size:18px;"></i>
        <span style="color:#fff;font-size:16px;font-weight:600;">Documento a Pagar</span>
      </div>
      <button id="ndFechar" style="background:rgba(255,255,255,0.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:18px;line-height:1;display:flex;align-items:center;justify-content:center;">×</button>
    </div>

    <div style="padding:22px 26px;max-height:70vh;overflow-y:auto;">

      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Fornecedor *</label>
        <div style="position:relative;margin-top:6px;">
          <input type="text" id="ndFornecedor" autocomplete="off"
            placeholder="Informe um fornecedor ou profissional"
            style="width:100%;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='#1976d2'" onblur="setTimeout(()=>this.style.borderColor='#e0e0e0',200)">
          <div id="ndFornecedorDD" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #dce1e7;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.12);z-index:9999;max-height:180px;overflow-y:auto;"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 80px 1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Valor *</label>
          <input type="number" id="ndValor" step="0.01" min="0" placeholder="0,00"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Parcelas *</label>
          <input type="number" id="ndParcelas" value="1" min="1" step="1"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Emissão *</label>
          <input type="date" id="ndEmissao" value="${hoje}"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
        <div>
          <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Vencimento *</label>
          <input type="date" id="ndVencimento" value="${hoje}"
            style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;transition:border-color 0.2s;"
            onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'">
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <label style="font-size:12px;font-weight:600;color:#555;text-transform:uppercase;letter-spacing:.5px;">Observação</label>
        <textarea id="ndObservacao" rows="3" placeholder="Observações sobre este documento..."
          style="width:100%;margin-top:6px;padding:11px 14px;border:2px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;box-sizing:border-box;resize:vertical;font-family:inherit;transition:border-color 0.2s;"
          onfocus="this.style.borderColor='#1976d2'" onblur="this.style.borderColor='#e0e0e0'"></textarea>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:14px;border-top:1px solid #eee;">
        <button id="ndCancelar" style="padding:10px 20px;border:2px solid #9e9e9e;border-radius:8px;cursor:pointer;font-weight:600;background:#fff;color:#555;font-size:13px;">Cancelar</button>
        <button id="ndSalvar" style="padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-weight:600;background:#1976d2;color:#fff;font-size:13px;"><i class="fas fa-save"></i> Salvar</button>
        <button id="ndSalvarPagar" style="padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-weight:600;background:#2e7d32;color:#fff;font-size:13px;"><i class="fas fa-check-circle"></i> Salvar e Pagar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    setTimeout(() => {
      modal.style.opacity = "1";
      modal.style.transform = "translate(-50%,-50%) scale(1)";
    }, 60);
  });

  // Autocomplete fornecedor
  const inpForn = modal.querySelector("#ndFornecedor");
  const ddForn = modal.querySelector("#ndFornecedorDD");

  function mostrarDDForn(itens) {
    ddForn.innerHTML = "";
    if (!itens || !itens.length) {
      ddForn.style.display = "none";
      return;
    }
    itens.forEach((f) => {
      const item = document.createElement("div");
      item.className = "forn-dd-item";
      item.textContent = f.nome || f.razaoSocial || "-";
      item.addEventListener("click", () => {
        inpForn.value = f.nome || f.razaoSocial || "";
        ddForn.style.display = "none";
      });
      ddForn.appendChild(item);
    });
    ddForn.style.display = "block";
  }

  inpForn.addEventListener("focus", () => {
    const q = inpForn.value.trim().toLowerCase();
    const fil = q
      ? fornecedoresCache.filter((f) =>
          (f.nome || "").toLowerCase().includes(q),
        )
      : fornecedoresCache;
    mostrarDDForn(fil.slice(0, 60));
  });
  inpForn.addEventListener("input", () => {
    const q = inpForn.value.trim().toLowerCase();
    const fil = q
      ? fornecedoresCache.filter((f) =>
          (f.nome || "").toLowerCase().includes(q),
        )
      : fornecedoresCache;
    mostrarDDForn(fil.slice(0, 60));
  });

  function fecharModalND() {
    modal.style.opacity = "0";
    modal.style.transform = "translate(-50%,-62%) scale(0.87)";
    overlay.style.opacity = "0";
    setTimeout(() => {
      modal.remove();
      overlay.remove();
      document.body.style.overflow = "";
    }, 320);
  }

  modal.querySelector("#ndFechar").addEventListener("click", fecharModalND);
  modal.querySelector("#ndCancelar").addEventListener("click", fecharModalND);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fecharModalND();
  });

  async function coletarEValidar() {
    const fornecedor = inpForn.value.trim();
    const valor = parseFloat(modal.querySelector("#ndValor").value);
    const parcelas = parseInt(modal.querySelector("#ndParcelas").value) || 1;
    const dataEmissao = modal.querySelector("#ndEmissao").value;
    const dataVencimento = modal.querySelector("#ndVencimento").value;
    const observacao = modal.querySelector("#ndObservacao").value.trim();

    if (!fornecedor) {
      alert("Informe o fornecedor.");
      inpForn.focus();
      return null;
    }
    if (!valor || valor <= 0) {
      alert("Informe um valor válido.");
      modal.querySelector("#ndValor").focus();
      return null;
    }
    if (!dataEmissao) {
      alert("Informe a data de emissão.");
      return null;
    }
    if (!dataVencimento) {
      alert("Informe o vencimento.");
      return null;
    }

    return {
      fornecedor,
      valor,
      parcelas,
      dataEmissao,
      dataEntrada: dataVencimento,
      valorTotal: valor,
      situacao: "concluido",
      observacao: observacao || null,
      numero: "M-" + Date.now(),
    };
  }

  async function salvarDoc(payload) {
    const res = await fetch("/api/entrada/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    return await res.json();
  }

  modal.querySelector("#ndSalvar").addEventListener("click", async function () {
    const payload = await coletarEValidar();
    if (!payload) return;
    this.disabled = true;
    this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    try {
      await salvarDoc(payload);
      fecharModalND();
      await carregarDocumentos();
      mostrarToastPF("Documento criado com sucesso!");
    } catch (e) {
      alert("Erro ao salvar: " + e.message);
      this.disabled = false;
      this.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
  });

  modal
    .querySelector("#ndSalvarPagar")
    .addEventListener("click", async function () {
      const payload = await coletarEValidar();
      if (!payload) return;
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const criado = await salvarDoc(payload);
        fecharModalND();
        await carregarDocumentos();
        // Selecionar o documento recém-criado e abrir modal de pagamento
        const idCriado = String(criado.id || "");
        if (idCriado) {
          documentosSelecionados = [idCriado];
          // Garantir que o documento está em todosDocumentos (acabou de recarregar)
          atualizarBannerTotais();
          abrirModalPagamento();
        }
      } catch (e) {
        alert("Erro ao salvar: " + e.message);
        this.disabled = false;
        this.innerHTML = '<i class="fas fa-check-circle"></i> Salvar e Pagar';
      }
    });
}

// --- FIM MODAL NOVO DOCUMENTO ---

function abrirModalPagamento() {
  if (!documentosSelecionados.length) {
    mostrarToastPF("Selecione ao menos um documento para pagar.", "error");
    return;
  }
  const sel = todosDocumentos.filter((d) =>
    documentosSelecionados.includes(String(d.id)),
  );
  const total = sel.reduce(
    (s, d) => s + Number(d.valorTotal || d.totalProdutos || 0),
    0,
  );
  const fNomes = [
    ...new Set(sel.map((d) => d.fornecedor || "").filter(Boolean)),
  ].join(", ");

  const overlay = document.createElement("div");
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99998;opacity:0;transition:opacity 0.3s;";

  const modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:50%;left:50%;transform:translate(-50%,-62%) scale(0.85);width:95%;max-width:820px;background:#fff;z-index:99999;border-radius:15px;box-shadow:0 20px 60px rgba(0,0,0,0.3);border:2px solid #1976d2;overflow:hidden;opacity:0;transition:all 0.38s cubic-bezier(0.34,1.56,0.64,1);";

  modal.innerHTML = `
    <div style="padding:20px 26px 16px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <h3 style="margin:0;font-size:17px;color:#1a1a2e;">Pagamento ao Fornecedor</h3>
        <p style="margin:3px 0 0;font-size:12px;color:#666;">${fNomes}</p>
      </div>
      <button id="pfFechar" style="background:none;border:none;font-size:24px;cursor:pointer;color:#aaa;line-height:1;">×</button>
    </div>
    <div style="padding:18px 26px 22px;max-height:72vh;overflow-y:auto;">
      <div style="background:#f0f4ff;border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div><div style="font-size:11px;color:#666;margin-bottom:2px;">Total</div><div id="pfTotal" style="font-size:24px;font-weight:700;color:#1976d2;">${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>
        <div><div style="font-size:11px;color:#666;margin-bottom:2px;">Total Pago</div><div id="pfPago" style="font-size:17px;font-weight:600;color:#2e7d32;">R$ 0,00</div></div>
        <div><div style="font-size:11px;color:#666;margin-bottom:2px;">Falta</div><div id="pfFalta" style="font-size:17px;font-weight:600;color:#d32f2f;">${total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>
      </div>

      <h4 style="font-size:14px;margin-bottom:12px;color:#333;">Forma de Pagamento *</h4>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:16px;">
        <button class="pf-forma" data-forma="dinheiro" style="padding:10px 6px;border:2px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.2s;"><i class="fas fa-money-bill-wave" style="font-size:18px;color:#2e7d32;"></i><span style="font-size:11px;font-weight:600;color:#333;">Dinheiro</span></button>
        <button class="pf-forma" data-forma="debito"   style="padding:10px 6px;border:2px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.2s;"><i class="fas fa-credit-card"   style="font-size:18px;color:#6f42c1;"></i><span style="font-size:11px;font-weight:600;color:#333;">Débito</span></button>
        <button class="pf-forma" data-forma="credito"  style="padding:10px 6px;border:2px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.2s;"><i class="fas fa-credit-card"   style="font-size:18px;color:#1976d2;"></i><span style="font-size:11px;font-weight:600;color:#333;">Crédito</span></button>
        <button class="pf-forma" data-forma="pix"      style="padding:10px 6px;border:2px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.2s;"><i class="fab fa-pix"           style="font-size:18px;color:#00c4a3;"></i><span style="font-size:11px;font-weight:600;color:#333;">Pix</span></button>
        <button class="pf-forma" data-forma="transferencia" style="padding:10px 6px;border:2px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.2s;"><i class="fas fa-exchange-alt" style="font-size:18px;color:#fd7e14;"></i><span style="font-size:11px;font-weight:600;color:#333;">Transferência</span></button>
        <button class="pf-forma" data-forma="boleto"   style="padding:10px 6px;border:2px solid #e0e0e0;border-radius:8px;background:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all 0.2s;"><i class="fas fa-barcode"       style="font-size:18px;color:#6c757d;"></i><span style="font-size:11px;font-weight:600;color:#333;">Boleto</span></button>
      </div>

      <div id="pfCampos" style="display:none;background:#f8f9fa;padding:14px;border-radius:8px;margin-bottom:14px;">
        <div id="pf-c-dinheiro"      class="pf-c" style="display:none;"><label style="font-size:13px;font-weight:600;">Valor *</label><input type="number" id="pfValDinheiro"  step="0.01" min="0" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:15px;outline:none;"></div>
        <div id="pf-c-debito"        class="pf-c" style="display:none;"><div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;"><div><label style="font-size:13px;font-weight:600;">Operadora</label><input type="text" id="pfOpDebito" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div><div><label style="font-size:13px;font-weight:600;">Valor *</label><input type="number" id="pfValDebito" step="0.01" min="0" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div></div></div>
        <div id="pf-c-credito"       class="pf-c" style="display:none;"><div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;"><div><label style="font-size:13px;font-weight:600;">Operadora</label><input type="text" id="pfOpCredito" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div><div><label style="font-size:13px;font-weight:600;">Parcelas</label><input type="number" id="pfParcCredito" value="1" min="1" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div><div><label style="font-size:13px;font-weight:600;">Valor *</label><input type="number" id="pfValCredito" step="0.01" min="0" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div></div></div>
        <div id="pf-c-pix"           class="pf-c" style="display:none;"><div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;"><div><label style="font-size:13px;font-weight:600;">Chave PIX</label><input type="text" id="pfChavePix" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div><div><label style="font-size:13px;font-weight:600;">Valor *</label><input type="number" id="pfValPix" step="0.01" min="0" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:15px;outline:none;"></div></div></div>
        <div id="pf-c-transferencia" class="pf-c" style="display:none;"><div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;"><div><label style="font-size:13px;font-weight:600;">Banco/Conta</label><input type="text" id="pfBancoTr" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div><div><label style="font-size:13px;font-weight:600;">Valor *</label><input type="number" id="pfValTr" step="0.01" min="0" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:15px;outline:none;"></div></div></div>
        <div id="pf-c-boleto"        class="pf-c" style="display:none;"><div style="display:grid;grid-template-columns:2fr 1fr;gap:10px;"><div><label style="font-size:13px;font-weight:600;">Código de Barras</label><input type="text" id="pfCodBoleto" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:14px;outline:none;"></div><div><label style="font-size:13px;font-weight:600;">Valor *</label><input type="number" id="pfValBoleto" step="0.01" min="0" style="width:100%;margin-top:5px;padding:10px;border:2px solid #ddd;border-radius:7px;font-size:15px;outline:none;"></div></div></div>
        <button id="pfAdicionar" style="margin-top:12px;padding:9px 22px;border:none;border-radius:7px;background:#2e7d32;color:#fff;font-weight:600;cursor:pointer;font-size:13px;"><i class="fas fa-plus"></i> Adicionar</button>
      </div>

      <div id="pfLista" style="display:none;margin-bottom:12px;">
        <h4 style="font-size:13px;margin-bottom:6px;color:#333;">Pagamentos adicionados</h4>
        <div id="pfListaItems" style="background:#fff;padding:8px;border:1px solid #e9ecef;border-radius:7px;max-height:110px;overflow:auto;"></div>
      </div>

      <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:14px;border-top:1px solid #eee;">
        <button id="pfCancelar" style="padding:10px 22px;border:2px solid #9e9e9e;border-radius:7px;cursor:pointer;font-weight:600;background:#fff;color:#555;">Cancelar</button>
        <button id="pfFinalizar" style="padding:10px 22px;border:none;border-radius:7px;cursor:pointer;font-weight:600;background:#2e7d32;color:#fff;"><i class="fas fa-check"></i> Finalizar Pagamento</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(modal);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    setTimeout(() => {
      modal.style.opacity = "1";
      modal.style.transform = "translate(-50%,-50%) scale(1)";
    }, 60);
  });

  let formaSelecionada = null;
  let totalPago = 0;
  let pagEfetuados = [];

  function fecharModal() {
    modal.style.opacity = "0";
    modal.style.transform = "translate(-50%,-62%) scale(0.85)";
    overlay.style.opacity = "0";
    setTimeout(() => {
      modal.remove();
      overlay.remove();
      document.body.style.overflow = "";
    }, 350);
  }

  function atualizarTotaisModal() {
    const falta = Math.max(0, total - totalPago);
    document.getElementById("pfPago").textContent =
      `R$ ${totalPago.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    document.getElementById("pfFalta").textContent =
      `R$ ${falta.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
    document.getElementById("pfFalta").style.color =
      falta <= 0 ? "#2e7d32" : "#d32f2f";
  }

  function renderListaModal() {
    const lista = document.getElementById("pfLista");
    const cont = document.getElementById("pfListaItems");
    if (!lista || !cont) return;
    if (!pagEfetuados.length) {
      lista.style.display = "none";
      return;
    }
    lista.style.display = "block";
    cont.innerHTML = pagEfetuados
      .map(
        (p, i) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 4px;border-bottom:1px solid #f1f3f5;font-size:13px;">
        <span>${p.forma}${p.parcelas ? " (" + p.parcelas + "x)" : ""}</span>
        <div style="display:flex;gap:7px;align-items:center;">
          <span>R$ ${Number(p.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
          <button onclick="window.__pfRemoverPag(${i})" style="border:none;background:#ef5350;color:#fff;padding:3px 8px;border-radius:5px;cursor:pointer;font-size:11px;">Rem</button>
        </div>
      </div>`,
      )
      .join("");
  }

  window.__pfRemoverPag = function (idx) {
    pagEfetuados.splice(idx, 1);
    totalPago = pagEfetuados.reduce((s, p) => s + Number(p.valor), 0);
    atualizarTotaisModal();
    renderListaModal();
  };

  modal.querySelector("#pfFechar").addEventListener("click", fecharModal);
  modal.querySelector("#pfCancelar").addEventListener("click", fecharModal);
  overlay.addEventListener("click", fecharModal);

  // Mapa explícito: forma → ID do input de valor (evita selecionar Parcelas por engano)
  const formaValorInputId = {
    dinheiro: "pfValDinheiro",
    debito: "pfValDebito",
    credito: "pfValCredito",
    pix: "pfValPix",
    transferencia: "pfValTr",
    boleto: "pfValBoleto",
  };

  // Lê valor do campo correto conforme forma selecionada
  function lerValorForma(forma) {
    const id = formaValorInputId[forma];
    if (!id) return 0;
    return parseFloat(document.getElementById(id)?.value) || 0;
  }

  // Tenta adicionar o pagamento em andamento; retorna true se bem-sucedido
  function tentarAdicionarPagamento() {
    if (!formaSelecionada) return false;
    const valor = lerValorForma(formaSelecionada);
    if (!valor || valor <= 0) return false;
    const parcelas =
      formaSelecionada === "credito"
        ? parseInt(document.getElementById("pfParcCredito")?.value) || 1
        : null;
    pagEfetuados.push({ forma: formaSelecionada, valor, parcelas });
    totalPago += valor;
    atualizarTotaisModal();
    renderListaModal();
    return true;
  }

  modal.querySelectorAll(".pf-forma").forEach((btn) => {
    btn.addEventListener("click", function () {
      modal.querySelectorAll(".pf-forma").forEach((b) => {
        b.style.borderColor = "#e0e0e0";
        b.style.background = "#fff";
      });
      this.style.borderColor = "#1976d2";
      this.style.background = "#e3f2fd";
      formaSelecionada = this.dataset.forma;
      modal
        .querySelectorAll(".pf-c")
        .forEach((c) => (c.style.display = "none"));
      document.getElementById("pfCampos").style.display = "block";
      const campoEl = document.getElementById(`pf-c-${formaSelecionada}`);
      if (campoEl) {
        campoEl.style.display = "block";
        const restante = Math.max(0, total - totalPago);
        // Preencher somente o campo Valor usando o mapa explícito
        const valorId = formaValorInputId[formaSelecionada];
        if (valorId) {
          const inputValor = document.getElementById(valorId);
          if (inputValor) inputValor.value = restante.toFixed(2);
        }
        // Sempre resetar Parcelas para 1
        const inputParc = document.getElementById("pfParcCredito");
        if (inputParc) inputParc.value = "1";
      }
    });
  });

  modal.querySelector("#pfAdicionar").addEventListener("click", function () {
    if (!formaSelecionada) {
      alert("Selecione uma forma de pagamento.");
      return;
    }
    const valor = lerValorForma(formaSelecionada);
    if (!valor || valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }
    const parcelas =
      formaSelecionada === "credito"
        ? parseInt(document.getElementById("pfParcCredito")?.value) || 1
        : null;
    pagEfetuados.push({ forma: formaSelecionada, valor, parcelas });
    totalPago += valor;
    atualizarTotaisModal();
    renderListaModal();
  });

  modal
    .querySelector("#pfFinalizar")
    .addEventListener("click", async function () {
      // Auto-adicionar pagamento em andamento se forma selecionada e valor preenchido
      if (formaSelecionada && !pagEfetuados.length) {
        tentarAdicionarPagamento();
      }
      if (!pagEfetuados.length) {
        alert("Selecione uma forma de pagamento e informe o valor.");
        return;
      }
      this.disabled = true;
      this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
      const ids = [...documentosSelecionados];
      await Promise.all(
        ids.map((id) =>
          fetch("/api/entrada/manual/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              situacao: "pago",
              pagamentos: pagEfetuados,
              dataPagamento: new Date().toISOString().split("T")[0],
            }),
          }).catch((e) => console.error(e)),
        ),
      );
      fecharModal();
      documentosSelecionados = [];
      await carregarDocumentos();
      atualizarBannerTotais();
      mostrarToastPF("Pagamento registrado com sucesso!");
      // Mudar para aba histórico
      document
        .querySelectorAll(".tab-item")
        .forEach((t) => t.classList.remove("active"));
      const histTab = document.querySelector('.tab-item[data-tab="historico"]');
      if (histTab) {
        histTab.classList.add("active");
        tabAtiva = "historico";
        renderizarTabela();
      }
    });
}

// ---------- EXCLUIR ----------
async function excluirDocumentos() {
  if (!documentosSelecionados.length) {
    mostrarToastPF("Selecione ao menos um documento para excluir.", "error");
    return;
  }
  const confirmed = await new Promise((resolve) => {
    const ov = document.createElement("div");
    ov.style.cssText =
      "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;";
    ov.innerHTML = `<div style="background:#fff;border-radius:10px;padding:28px 24px;max-width:380px;width:90%;text-align:center;box-shadow:0 6px 24px rgba(0,0,0,0.2);">
      <div style="font-size:36px;margin-bottom:10px;">🗑️</div>
      <h3 style="margin:0 0 8px;font-size:16px;color:#b71c1c;">Excluir documento(s)?</h3>
      <p style="margin:0 0 20px;color:#555;font-size:14px;line-height:1.5;"><strong>${documentosSelecionados.length} documento(s)</strong> serão removidos permanentemente.</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        <button id="__exDocCanc" style="padding:9px 22px;border-radius:6px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;">Cancelar</button>
        <button id="__exDocOk"   style="padding:9px 22px;border-radius:6px;border:none;background:#d32f2f;color:#fff;cursor:pointer;font-weight:600;">Sim, excluir</button>
      </div></div>`;
    document.body.appendChild(ov);
    ov.querySelector("#__exDocOk").onclick = () => {
      ov.remove();
      resolve(true);
    };
    ov.querySelector("#__exDocCanc").onclick = () => {
      ov.remove();
      resolve(false);
    };
    ov.onclick = (e) => {
      if (e.target === ov) {
        ov.remove();
        resolve(false);
      }
    };
  });
  if (!confirmed) return;
  await Promise.all(
    documentosSelecionados.map((id) =>
      fetch("/api/entrada/manual/" + id, { method: "DELETE" }).catch((e) => e),
    ),
  );
  documentosSelecionados = [];
  await carregarDocumentos();
  atualizarBannerTotais();
  mostrarToastPF("Documento(s) excluído(s).");
}

function abrirOpcoesDocumento(id) {
  documentosSelecionados = [String(id)];
  atualizarBannerTotais();
  abrirModalPagamento();
}

// ---------- TABS ----------
function configurarTabs() {
  document.querySelectorAll(".tab-item").forEach((tab) => {
    tab.addEventListener("click", function () {
      document
        .querySelectorAll(".tab-item")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      tabAtiva =
        this.getAttribute("data-tab") === "historico"
          ? "historico"
          : "documentos";
      renderizarTabela();
    });
  });
}

// ---------- EVENT LISTENERS ----------
function configurarEventListeners() {
  document
    .getElementById("btnPesquisar")
    ?.addEventListener("click", aplicarFiltros);
  document
    .getElementById("filtroDataVencimento")
    ?.addEventListener("change", aplicarFiltros);
  document
    .getElementById("filtroPrevisao")
    ?.addEventListener("change", aplicarFiltros);
  ["filtroDocumento", "filtroNota", "filtroValor"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", aplicarFiltros);
    document.getElementById(id)?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") aplicarFiltros();
    });
  });
  document
    .getElementById("btnPagar")
    ?.addEventListener("click", abrirModalPagamento);
  document
    .getElementById("btnExcluir")
    ?.addEventListener("click", excluirDocumentos);
  document.getElementById("btnLimpar")?.addEventListener("click", () => {
    [
      "filtroFornecedor",
      "filtroDocumento",
      "filtroNota",
      "filtroValor",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const fp = document.getElementById("filtroPrevisao");
    if (fp) fp.value = "todos";
    const fv = document.getElementById("filtroDataVencimento");
    if (fv) fv.value = "";
    documentosSelecionados = [];
    filteredDocumentos = [...todosDocumentos];
    atualizarBannerTotais();
    renderizarTabela();
  });
  document
    .getElementById("btnVoltar")
    ?.addEventListener("click", () => window.history.back());
  document.getElementById("btnDocPagar")?.addEventListener("click", () => {
    abrirModalNovoDoc();
  });
}

// ---------- INIT ----------
async function inicializarPagamentos() {
  configurarTabs();
  configurarEventListeners();
  await Promise.all([carregarDocumentos(), carregarFornecedores()]);
  configurarFornecedorAutocomplete();
}

window.addEventListener("DOMContentLoaded", function () {
  inicializarPagamentos();
});
