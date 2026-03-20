// ═══════════════════════════════════════
// ADMIN DASHBOARD JS - PetHub
// ═══════════════════════════════════════

const API = window.location.origin + "/api/admin";
let empresaSelecionada = null;

// ── Cookies ─────────────────────────
function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEQ) === 0)
      return decodeURIComponent(c.substring(nameEQ.length));
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

// ── Auth ────────────────────────────
function getToken() {
  return getCookie("admin_token");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

// Verificar autenticação
(function checkAuth() {
  if (!getToken()) {
    window.location.href = "/painel-admin/admin-login.html";
    return;
  }
  // Carregar nome do admin
  const nome = getCookie("admin_nome");
  if (nome) {
    document.getElementById("adminName").textContent = nome;
  }
  init();
})();

// ── Notificação ─────────────────────
function showNotification(message, type = "success") {
  const existing = document.querySelector(".notification-toast");
  if (existing) existing.remove();
  const iconMap = {
    success: "check-circle",
    error: "exclamation-circle",
    warning: "exclamation-triangle",
  };
  const el = document.createElement("div");
  el.className = `notification-toast notification-${type}`;
  el.innerHTML = `
        <div class="notif-icon"><i class="fas fa-${iconMap[type] || "info-circle"}"></i></div>
        <div class="notif-msg">${message}</div>
        <button class="notif-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ── Formatar ────────────────────────
function formatarDinheiro(valor) {
  return parseFloat(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "-";
  const d = new Date(data + "T00:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatarCnpj(cnpj) {
  if (!cnpj) return "-";
  const c = cnpj.replace(/\D/g, "");
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

// ── Tabs ────────────────────────────
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", function () {
    document
      .querySelectorAll(".tab-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("tab-" + this.dataset.tab).classList.add("active");

    // Carregar dados da aba
    if (this.dataset.tab === "dashboard") carregarDashboard();
    if (this.dataset.tab === "empresas") carregarEmpresas();
    if (this.dataset.tab === "faturamento") carregarFaturamento();
  });
});

// ── Profile Dropdown ────────────────
document.getElementById("adminProfile").addEventListener("click", function (e) {
  e.stopPropagation();
  document.getElementById("profileDropdown").classList.toggle("show");
});
document.addEventListener("click", () => {
  document.getElementById("profileDropdown").classList.remove("show");
});
document.getElementById("btnLogout").addEventListener("click", function (e) {
  e.preventDefault();
  deleteCookie("admin_token");
  deleteCookie("admin_nome");
  deleteCookie("admin_id");
  window.location.href = "/painel-admin/admin-login.html";
});
document
  .getElementById("btnVerPerfil")
  .addEventListener("click", async function (e) {
    e.preventDefault();
    try {
      const resp = await fetch(`${API}/perfil`, { headers: authHeaders() });
      if (resp.status === 401) {
        logout();
        return;
      }
      const admin = await resp.json();
      showNotification(
        `${admin.nome} ${admin.sobrenome} — ${admin.email}`,
        "success",
      );
    } catch {
      showNotification("Erro ao carregar perfil", "error");
    }
  });

function logout() {
  deleteCookie("admin_token");
  deleteCookie("admin_nome");
  deleteCookie("admin_id");
  window.location.href = "/painel-admin/admin-login.html";
}

// ═══════ DASHBOARD ═══════
async function carregarDashboard() {
  try {
    const resp = await fetch(`${API}/dashboard`, { headers: authHeaders() });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();

    document.getElementById("totalEmpresas").textContent = data.total;
    document.getElementById("totalAtivas").textContent = data.ativas;
    document.getElementById("totalVencidas").textContent = data.vencidas;
    document.getElementById("totalBloqueadas").textContent = data.bloqueadas;
    document.getElementById("faturamentoMensal").textContent = formatarDinheiro(
      data.faturamento_mensal,
    );
  } catch (err) {
    console.error("Erro ao carregar dashboard:", err);
  }

  // Tabela resumo
  try {
    const resp = await fetch(`${API}/empresas`, { headers: authHeaders() });
    if (resp.status === 401) return;
    const empresas = await resp.json();
    const tbody = document.getElementById("dashTableBody");
    tbody.innerHTML = "";

    if (!empresas.length) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align:center;color:#aaa;padding:30px;">Nenhuma empresa cadastrada</td></tr>';
      return;
    }

    empresas.forEach((emp) => {
      const tr = document.createElement("tr");
      tr.addEventListener("click", () => abrirModalEmpresa(emp.id));
      tr.innerHTML = `
                <td><strong>${emp.nome_fantasia}</strong></td>
                <td>${formatarCnpj(emp.cnpj)}</td>
                <td><span class="status-badge status-${emp.status}">${emp.status}</span></td>
                <td>${formatarData(emp.data_vencimento)}</td>
                <td>${formatarDinheiro(emp.valor_mensalidade)}</td>
            `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Erro ao carregar empresas resumo:", err);
  }
}

// ═══════ EMPRESAS ═══════
async function carregarEmpresas() {
  const busca = document.getElementById("buscaEmpresa").value.trim();
  const status = document.getElementById("filtroStatus").value;
  const ordenar = document.getElementById("filtroOrdem").value;

  const params = new URLSearchParams();
  if (busca) params.set("busca", busca);
  if (status) params.set("status", status);
  if (ordenar) params.set("ordenar", ordenar);

  try {
    const resp = await fetch(`${API}/empresas?${params}`, {
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const empresas = await resp.json();

    const tbody = document.getElementById("empresasTableBody");
    const empty = document.getElementById("empresasEmpty");
    tbody.innerHTML = "";

    if (!empresas.length) {
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";

    empresas.forEach((emp) => {
      const tr = document.createElement("tr");
      tr.addEventListener("click", (e) => {
        if (e.target.closest(".btn-action")) return;
        abrirModalEmpresa(emp.id);
      });

      const hoje = new Date().toISOString().split("T")[0];
      const vencHoje =
        emp.data_vencimento === hoje
          ? ' <span style="color:#d97706;font-weight:600;">(Vence hoje!)</span>'
          : "";

      tr.innerHTML = `
                <td><strong>${emp.nome_fantasia}</strong></td>
                <td>${formatarCnpj(emp.cnpj)}</td>
                <td>${formatarData(emp.data_adesao)}</td>
                <td><span class="status-badge status-${emp.status}">${emp.status}</span></td>
                <td>${formatarData(emp.data_vencimento)}${vencHoje}</td>
                <td>${formatarDinheiro(emp.valor_mensalidade)}</td>
                <td>
                    ${emp.status !== "ATIVO" ? `<button class="btn-action reativar" data-id="${emp.id}" title="Reativar"><i class="fas fa-play"></i></button>` : ""}
                    ${emp.status !== "BLOQUEADO" ? `<button class="btn-action bloquear" data-id="${emp.id}" title="Bloquear"><i class="fas fa-ban"></i></button>` : ""}
                </td>
            `;
      tbody.appendChild(tr);
    });

    // Eventos dos botões de ação inline
    document.querySelectorAll(".btn-action.reativar").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        reativarEmpresa(btn.dataset.id);
      });
    });
    document.querySelectorAll(".btn-action.bloquear").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        bloquearEmpresa(btn.dataset.id);
      });
    });
  } catch (err) {
    console.error("Erro ao carregar empresas:", err);
  }
}

// Filtros
document
  .getElementById("buscaEmpresa")
  .addEventListener("input", debounce(carregarEmpresas, 400));
document
  .getElementById("filtroStatus")
  .addEventListener("change", carregarEmpresas);
document
  .getElementById("filtroOrdem")
  .addEventListener("change", carregarEmpresas);

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ═══════ MODAL EMPRESA ═══════
async function abrirModalEmpresa(id) {
  try {
    const resp = await fetch(`${API}/empresas/${id}`, {
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const emp = await resp.json();
    empresaSelecionada = emp;

    document.getElementById("modalNome").textContent = emp.nome_fantasia;
    document.getElementById("modalCnpj").textContent = formatarCnpj(emp.cnpj);
    document.getElementById("modalCep").textContent = emp.cep || "-";
    document.getElementById("modalEndereco").textContent = emp.endereco || "-";
    document.getElementById("modalEmail").textContent = emp.email || "-";
    document.getElementById("modalTelefone").textContent = emp.telefone || "-";
    document.getElementById("modalAdesao").textContent = formatarData(
      emp.data_adesao,
    );
    document.getElementById("modalVencimento").textContent = formatarData(
      emp.data_vencimento,
    );
    document.getElementById("modalMensalidade").textContent = formatarDinheiro(
      emp.valor_mensalidade,
    );

    // Status
    const statusEl = document.getElementById("modalStatus");
    statusEl.textContent = emp.status;
    statusEl.className = `modal-status status-badge status-${emp.status}`;

    // Foto
    const fotoEl = document.getElementById("modalFoto");
    if (emp.foto) {
      fotoEl.innerHTML = `<img src="${emp.foto}" alt="${emp.nome_fantasia}">`;
    } else {
      fotoEl.innerHTML = '<i class="fas fa-building"></i>';
    }

    // Pagamentos
    const pagContainer = document.getElementById("modalPagamentosBody");
    if (emp.pagamentos && emp.pagamentos.length) {
      pagContainer.innerHTML = emp.pagamentos
        .map(
          (p) => `
                <div class="pag-item">
                    <span class="pag-data">${formatarData(p.data_pagamento)}</span>
                    <span>${p.observacao || "-"}</span>
                    <span class="pag-valor">${formatarDinheiro(p.valor)}</span>
                </div>
            `,
        )
        .join("");
    } else {
      pagContainer.innerHTML =
        '<p style="color:#aaa;font-size:13px;text-align:center;">Nenhum pagamento registrado</p>';
    }

    document.getElementById("modalEmpresa").classList.add("show");
  } catch (err) {
    showNotification("Erro ao carregar detalhes", "error");
  }
}

// Fechar modal
document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("modalEmpresa").classList.remove("show");
});
document.getElementById("modalEmpresa").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});

// Botões do modal
document.getElementById("btnReativar").addEventListener("click", async () => {
  if (!empresaSelecionada) return;
  await reativarEmpresa(empresaSelecionada.id);
  document.getElementById("modalEmpresa").classList.remove("show");
});

document.getElementById("btnBloquear").addEventListener("click", async () => {
  if (!empresaSelecionada) return;
  await bloquearEmpresa(empresaSelecionada.id);
  document.getElementById("modalEmpresa").classList.remove("show");
});

document.getElementById("btnPagamento").addEventListener("click", async () => {
  if (!empresaSelecionada) return;
  await registrarPagamento(empresaSelecionada.id);
  document.getElementById("modalEmpresa").classList.remove("show");
});

// ═══════ AÇÕES ═══════
async function reativarEmpresa(id) {
  if (
    !confirm(
      "Reativar esta empresa? Uma nova data de vencimento será definida (30 dias).",
    )
  )
    return;
  try {
    const resp = await fetch(`${API}/empresas/${id}/reativar`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    if (resp.ok) {
      showNotification("Empresa reativada com sucesso!", "success");
      refreshAll();
    } else {
      showNotification(data.error || "Erro ao reativar", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

async function bloquearEmpresa(id) {
  if (!confirm("Bloquear esta empresa? O sistema dela ficará inacessível."))
    return;
  try {
    const resp = await fetch(`${API}/empresas/${id}/bloquear`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    if (resp.ok) {
      showNotification("Empresa bloqueada", "warning");
      refreshAll();
    } else {
      showNotification(data.error || "Erro ao bloquear", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

async function registrarPagamento(id) {
  if (!confirm("Registrar pagamento para esta empresa?")) return;
  try {
    const resp = await fetch(`${API}/empresas/${id}/pagamento`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({}),
    });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();
    if (resp.ok) {
      showNotification("Pagamento registrado com sucesso!", "success");
      refreshAll();
    } else {
      showNotification(data.error || "Erro ao registrar pagamento", "error");
    }
  } catch {
    showNotification("Erro de conexão", "error");
  }
}

// ═══════ ADICIONAR EMPRESA (COMPLETO) ═══════
document.getElementById("btnNovaEmpresa").addEventListener("click", () => {
  document.getElementById("formNovaEmpresa").reset();
  document.getElementById("logoPreview").style.display = "none";
  document.getElementById("uploadPlaceholder").style.display = "flex";
  // Data de início = hoje
  document.getElementById("novaDataInicio").value = new Date()
    .toISOString()
    .split("T")[0];
  calcularProximaCobranca();
  document.getElementById("modalNovaEmpresa").classList.add("show");
});
document.getElementById("modalNovaClose").addEventListener("click", () => {
  document.getElementById("modalNovaEmpresa").classList.remove("show");
});
document.getElementById("btnCancelarNova").addEventListener("click", () => {
  document.getElementById("modalNovaEmpresa").classList.remove("show");
});
document.getElementById("modalNovaEmpresa").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove("show");
});

// Toggle senha
document
  .getElementById("toggleNovaSenha")
  .addEventListener("click", function () {
    const input = document.getElementById("novaUsuarioSenha");
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    this.classList.toggle("fa-eye");
    this.classList.toggle("fa-eye-slash");
  });

// Upload de logo
const uploadArea = document.getElementById("uploadArea");
const logoInput = document.getElementById("novaLogo");
const logoPreview = document.getElementById("logoPreview");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");

uploadArea.addEventListener("click", () => logoInput.click());
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.classList.add("drag-over");
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.classList.remove("drag-over");
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  if (e.dataTransfer.files.length) {
    logoInput.files = e.dataTransfer.files;
    mostrarPreviewLogo(e.dataTransfer.files[0]);
  }
});
logoInput.addEventListener("change", (e) => {
  if (e.target.files.length) {
    mostrarPreviewLogo(e.target.files[0]);
  }
});

function mostrarPreviewLogo(file) {
  if (!file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    logoPreview.src = e.target.result;
    logoPreview.style.display = "block";
    uploadPlaceholder.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// Cálculo automático da próxima cobrança
function calcularProximaCobranca() {
  const dataInicio = document.getElementById("novaDataInicio").value;
  const intervalo = parseInt(
    document.getElementById("novaIntervaloDias").value,
    10,
  );
  if (dataInicio && intervalo > 0) {
    const d = new Date(dataInicio + "T00:00:00");
    d.setDate(d.getDate() + intervalo);
    document.getElementById("novaProximaCobranca").value =
      d.toLocaleDateString("pt-BR");
  } else {
    document.getElementById("novaProximaCobranca").value = "";
  }
  // Hint do intervalo
  const hint = document.getElementById("intervaloHint");
  if (intervalo === 1) hint.textContent = "Cobrança diária";
  else if (intervalo === 7) hint.textContent = "Cobrança semanal";
  else if (intervalo === 15) hint.textContent = "Cobrança quinzenal";
  else if (intervalo === 30)
    hint.textContent = "Cobrança mensal (a cada 30 dias)";
  else if (intervalo === 60) hint.textContent = "Cobrança bimestral";
  else if (intervalo === 90) hint.textContent = "Cobrança trimestral";
  else if (intervalo > 0)
    hint.textContent = `Cobrança a cada ${intervalo} dias`;
  else hint.textContent = "";
}

document
  .getElementById("novaDataInicio")
  .addEventListener("change", calcularProximaCobranca);
document
  .getElementById("novaIntervaloDias")
  .addEventListener("input", calcularProximaCobranca);

// Máscara CNPJ
document.getElementById("novaCnpj").addEventListener("input", function (e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 14) v = v.slice(0, 14);
  v = v.replace(/(\d{2})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1.$2");
  v = v.replace(/(\d{3})(\d)/, "$1/$2");
  v = v.replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  e.target.value = v;
});

document.getElementById("novaCep").addEventListener("input", function (e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  e.target.value = v;
});

document.getElementById("novaTelefone").addEventListener("input", function (e) {
  let v = e.target.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  v = v.replace(/(\d{2})(\d)/, "($1) $2");
  v = v.replace(/(\d{5})(\d)/, "$1-$2");
  e.target.value = v;
});

// Submissão via FormData (suporte a upload)
document
  .getElementById("formNovaEmpresa")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const btn = document.getElementById("btnSalvarEmpresa");
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';

    const formData = new FormData();
    formData.append(
      "razao_social",
      document.getElementById("novaRazaoSocial").value.trim(),
    );
    formData.append(
      "nome_fantasia",
      document.getElementById("novaNome").value.trim(),
    );
    formData.append("cnpj", document.getElementById("novaCnpj").value.trim());
    formData.append("cep", document.getElementById("novaCep").value.trim());
    formData.append(
      "endereco",
      document.getElementById("novaEndereco").value.trim(),
    );
    formData.append("email", document.getElementById("novaEmail").value.trim());
    formData.append(
      "telefone",
      document.getElementById("novaTelefone").value.trim(),
    );
    formData.append(
      "valor_mensalidade",
      document.getElementById("novaValor").value,
    );
    formData.append(
      "data_inicio",
      document.getElementById("novaDataInicio").value,
    );
    formData.append(
      "intervalo_dias",
      document.getElementById("novaIntervaloDias").value,
    );
    formData.append(
      "usuario_nome",
      document.getElementById("novaUsuarioNome").value.trim(),
    );
    formData.append(
      "usuario_email",
      document.getElementById("novaUsuarioEmail").value.trim(),
    );
    formData.append(
      "usuario_senha",
      document.getElementById("novaUsuarioSenha").value,
    );

    const logoFile = document.getElementById("novaLogo").files[0];
    if (logoFile) {
      formData.append("logo", logoFile);
    }

    try {
      const resp = await fetch(`${API}/empresas/completa`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      if (resp.status === 401) {
        logout();
        return;
      }
      const data = await resp.json();

      if (resp.ok) {
        showNotification("Empresa e usuário criados com sucesso!", "success");
        document.getElementById("modalNovaEmpresa").classList.remove("show");
        refreshAll();
      } else {
        showNotification(data.error || "Erro ao criar empresa", "error");
      }
    } catch {
      showNotification("Erro de conexão", "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-save"></i> Cadastrar Empresa';
    }
  });

// ═══════ FATURAMENTO ═══════
async function carregarFaturamento() {
  try {
    const resp = await fetch(`${API}/faturamento`, { headers: authHeaders() });
    if (resp.status === 401) {
      logout();
      return;
    }
    const data = await resp.json();

    document.getElementById("fatTotalMensal").textContent = formatarDinheiro(
      data.totalMensal,
    );

    // Tabela empresas
    const tbody = document.getElementById("fatEmpresasBody");
    tbody.innerHTML = "";
    if (data.empresas && data.empresas.length) {
      data.empresas.forEach((emp) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td><strong>${emp.nome_fantasia}</strong></td>
                    <td>${formatarCnpj(emp.cnpj)}</td>
                    <td>${formatarDinheiro(emp.valor_mensalidade)}</td>
                    <td>${formatarData(emp.data_vencimento)}</td>
                `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:#aaa;padding:30px;">Nenhuma empresa ativa</td></tr>';
    }

    // Histórico
    const histBody = document.getElementById("fatHistoricoBody");
    const histEmpty = document.getElementById("fatHistoricoEmpty");
    histBody.innerHTML = "";

    if (data.pagamentos && data.pagamentos.length) {
      histEmpty.style.display = "none";
      data.pagamentos.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
                    <td>${formatarData(p.data_pagamento)}</td>
                    <td>${p.empresa ? p.empresa.nome_fantasia : "-"}</td>
                    <td>${formatarDinheiro(p.valor)}</td>
                    <td><span class="status-badge status-ATIVO">${p.status}</span></td>
                    <td>${p.observacao || "-"}</td>
                `;
        histBody.appendChild(tr);
      });
    } else {
      histEmpty.style.display = "block";
    }
  } catch (err) {
    console.error("Erro ao carregar faturamento:", err);
  }
}

// ═══════ REFRESH ═══════
function refreshAll() {
  const activeTab = document.querySelector(".tab-btn.active");
  if (!activeTab) return;
  const tab = activeTab.dataset.tab;
  if (tab === "dashboard") carregarDashboard();
  if (tab === "empresas") carregarEmpresas();
  if (tab === "faturamento") carregarFaturamento();
}

// ═══════ INIT ═══════
async function init() {
  carregarDashboard();
}
