// meus-pets.js — carrega pets e clientes e renderiza a tabela
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  searchInput && searchInput.addEventListener('input', () => renderFiltered());

  document.getElementById('btnAddPet')?.addEventListener('click', () => {
    window.location.href = '/pets/cadastro-pet.html';
  });

  document.getElementById('btnExport')?.addEventListener('click', () => {
    // tenta abrir o modal de export se a função estiver disponível (versão localizada em /pets/meus-pets.js)
    try {
      if (typeof openExportDialogForPets === 'function') { openExportDialogForPets(); return; }
    } catch(e){}
    // fallback amigável sem alert bloqueador
    try { if (typeof window.mostrarNotificacao === 'function') window.mostrarNotificacao('Exportação (a implementar) — atualize a página se necessário', 'info'); else console.log('Export requested'); } catch(e){ console.log('Export requested'); }
  });

  loadData();
});

let petsList = [];
let clientsMap = {};

async function loadData() {
  try {
    // buscar pets e clientes em paralelo
    const [petsResp, clientsResp] = await Promise.all([
      fetch('/api/pets'),
      fetch('/api/clientes')
    ]);

    if (!petsResp.ok) throw new Error('Falha ao buscar pets');
    if (!clientsResp.ok) throw new Error('Falha ao buscar clientes');

    const petsData = await petsResp.json();
    const clientsData = await clientsResp.json();

    // aceitar formatos { pets: [...] } ou array direto
    petsList = Array.isArray(petsData) ? petsData : (petsData.pets || petsData.clientes || []);
    const clientsArray = Array.isArray(clientsData) ? clientsData : (clientsData.clientes || []);

    // mapear clientes por id
    clientsMap = {};
    clientsArray.forEach(c => { clientsMap[c.id] = c; });

    renderTable(petsList);
  } catch (err) {
    console.error(err);
    const tbody = document.getElementById('petsTableBody');
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#e74c3c;">Erro ao carregar dados</td></tr>`;
  }
}

function renderTable(list) {
  const tbody = document.getElementById('petsTableBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#6c757d;">Nenhum pet encontrado</td></tr>`;
    return;
  }

  const rows = list.map(pet => {
    const client = clientsMap[pet.cliente_id] || clientsMap[pet.cliente] || null;
    const clientText = client ? `${client.id} - ${client.nome || client.name}` : (pet.cliente_nome || pet.tutor || '---');
    const ativo = pet.ativo === true || pet.ativo === 1 || pet.ativo === 'true';

    return `
      <tr data-pet-id="${pet.id}">
        <td>${pet.id}</td>
        <td>${escapeHtml(pet.nome || pet.name || '---')}</td>
        <td>${escapeHtml(clientText)}</td>
        <td class="${ativo ? 'status-active' : 'status-inactive'}">${ativo ? '✓' : '×'}</td>
        <td class="action-dots"><i class="fas fa-ellipsis-v"></i></td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows;
}

function renderFiltered() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  if (!q) {
    renderTable(petsList);
    return;
  }

  const filtered = petsList.filter(p => {
    const petName = (p.nome || p.name || '').toString().toLowerCase();
    const petId = (p.id || '').toString();
    const client = clientsMap[p.cliente_id] || clientsMap[p.cliente];
    const clientName = client ? (client.nome || client.name || '') : (p.cliente_nome || '');
    return petName.includes(q) || petId.includes(q) || clientName.toLowerCase().includes(q);
  });

  renderTable(filtered);
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c]); }

// export for console testing
window.meusPets = { loadData, renderFiltered };
