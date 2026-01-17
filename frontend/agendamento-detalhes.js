// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log('🚀 menu.js carregado (snippet do dashboard)');

function detectarIDsDuplicados() {
    const idsParaVerificar = [
        'clienteMenuItem', 'clienteSubmenu',
        'itemMenuItem', 'itemSubmenu',
        'petMenuItem', 'petSubmenu', 
        'atendimentoMenuItem', 'atendimentoSubmenu',
        'financeiroMenuItem', 'financeiroSubmenu',
        'configuracaoMenuItem', 'configuracaoSubmenu',
        'painelMenuItem', 'painelSubmenu',
        'comprasMenuItem', 'comprasSubmenu'
    ];
    
    let problemas = [];
    idsParaVerificar.forEach(id => {
        const elementos = document.querySelectorAll(`#${id}`);
        if (elementos.length > 1) {
            problemas.push(`ID '${id}' duplicado ${elementos.length} vezes`);
            console.warn(`⚠️  ID DUPLICADO: ${id} (${elementos.length} elementos)`);
        }

    // Modal de edição de um serviço/servico dentro do agendamento
    function openEditServiceModal(itemEl){
        try {
            console.log('[openEditServiceModal] called for itemEl:', itemEl);
            // limpar modal anterior se existir (forçar re-criação)
            try { const prev = document.getElementById('modalEditarServicoOverlay'); if (prev && prev.parentNode) prev.remove(); } catch(e){}

            const currentName = itemEl.querySelector('.service-name')?.textContent || '';
            const currentQtd = itemEl.querySelector('.col-qtd')?.textContent || '1';
            const currentUnit = itemEl.querySelector('.col-unitario')?.textContent || '0,00';

            const overlay = document.createElement('div');
            overlay.id = 'modalEditarServicoOverlay';
            overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1600000;';

            const modal = document.createElement('div');
            modal.id = 'modalEditarServico';
            modal.style.cssText = 'width:560px;max-width:96%;background:white;border-radius:8px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:hidden;font-family:inherit;z-index:1600001;';
            modal.innerHTML = `
                <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
                    <strong>Editar Item</strong>
                    <button id="fecharModalEditarServico" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:#666">✕</button>
                </div>
                <div style="padding:16px;">
                    <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Produto/Serviço</label>
                    <input id="editServiceInput" type="text" placeholder="Clique para selecionar..." value="${escapeHtmlUnsafe(currentName)}" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;margin-bottom:8px;box-sizing:border-box;" autocomplete="off">
                    <div id="editServiceResults" style="max-height:220px;overflow:auto;border:1px solid #f1f5f9;border-radius:6px;display:none;margin-bottom:8px;"></div>

                    <div style="display:flex;gap:8px;margin-top:8px;">
                        <div style="flex:1">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Quantidade</label>
                            <input id="editServiceQtd" type="number" value="${escapeHtmlUnsafe(currentQtd)}" min="1" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;">
                        </div>
                        <div style="flex:1">
                            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Valor unitário</label>
                            <input id="editServiceValor" type="text" value="${escapeHtmlUnsafe(currentUnit)}" style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;">
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
                        <button id="btnCancelarEditarServico" class="btn" style="background:#6c757d;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
                        <button id="btnSalvarEditarServico" class="btn" style="background:#28a745;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Salvar</button>
                    </div>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            // impedir scroll do body enquanto modal aberto
            try { document.body.style.overflow = 'hidden'; } catch(e){}

            const input = document.getElementById('editServiceInput');
            const results = document.getElementById('editServiceResults');

            // search helpers
            let controller = null;
            const doSearch = (async (q) => {
                const qq = (q||'').trim();
                if (!qq) { results.style.display='none'; results.innerHTML=''; return; }
                try { if (controller) controller.abort(); } catch(e){}
                controller = new AbortController();
                const signal = controller.signal;
                try {
                    results.innerHTML = '<div style="padding:10px;color:#666">Carregando...</div>'; results.style.display='block';
                    const res = await fetch('/api/itens?q=' + encodeURIComponent(qq) + '&limit=40', { signal, credentials: 'include' });
                    if (!res.ok) { results.innerHTML = '<div style="padding:10px;color:#666">Erro na busca</div>'; return; }
                    const data = await res.json();
                    const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
                    if (!items || items.length === 0) { results.innerHTML = '<div style="padding:10px;color:#666">Nenhum serviço encontrado</div>'; return; }
                    const frag = document.createDocumentFragment();
                    items.slice(0,40).forEach(it => {
                        const div = document.createElement('div');
                        div.style.cssText = 'padding:10px;border-bottom:1px solid #f6f6f6;cursor:pointer;';
                        div.textContent = (it.nome || it.titulo || it.descricao || '') + (it.preco ? (' — ' + formatarMoeda(Number(String(it.preco).replace(',','.')))) : '');
                        div.addEventListener('click', () => {
                            // preencher campos com o item selecionado
                            input.value = it.nome || it.titulo || it.descricao || '';
                            input.setAttribute('data-selected-id', String(it.id));
                            input.setAttribute('data-selected-valor', String(it.preco || it.venda || it.valor || 0));
                            results.style.display = 'none';
                            document.getElementById('editServiceValor').value = (it.preco || it.venda || it.valor || 0).toString().replace('.',',');
                        });
                        frag.appendChild(div);
                    });
                    results.innerHTML = '';
                    results.appendChild(frag);
                    results.style.display = 'block';
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    console.warn('Erro na busca edit modal', err);
                    results.innerHTML = '<div style="padding:10px;color:#666">Erro na busca</div>';
                }
            });

            const deb = (function(){let t; return function(fn,ms){ clearTimeout(t); t=setTimeout(fn,ms||250); }; })();
            input.addEventListener('input', function(){ deb(()=>doSearch(input.value)); input.removeAttribute('data-selected-id'); input.removeAttribute('data-selected-valor'); });
            input.addEventListener('focus', function(){ if (input.value) deb(()=>doSearch(input.value)); });

            document.getElementById('btnCancelarEditarServico').addEventListener('click', close);
            document.getElementById('fecharModalEditarServico').addEventListener('click', close);

            async function onSave(){
                try {
                    const selId = input.getAttribute('data-selected-id');
                    const nome = input.value.trim();
                    const qtd = parseInt(document.getElementById('editServiceQtd').value) || 1;
                    const rawValor = (document.getElementById('editServiceValor').value || '').toString().replace(',','.');
                    const valorUnit = parseFloat(rawValor) || 0;
                    const total = qtd * valorUnit;

                    // atualizar DOM do item
                    const nameEl = itemEl.querySelector('.service-name'); if (nameEl) nameEl.textContent = nome;
                    const qtdEl = itemEl.querySelector('.col-qtd'); if (qtdEl) qtdEl.textContent = String(qtd);
                    const unitEl = itemEl.querySelector('.col-unitario'); if (unitEl) unitEl.textContent = formatarMoeda(valorUnit);
                    const totalEl = itemEl.querySelector('.col-total'); if (totalEl) totalEl.textContent = formatarMoeda(total);

                    // atualizar agendamentoAtual.servicos (atualizar o item existente, não criar duplicata)
                    try {
                        // construir objeto atualizado
                        const updatedObj = { id: selId || itemEl.dataset.serviceId || Date.now(), nome: nome, quantidade: qtd, unitario: valorUnit, valor: valorUnit, total: total };

                        // Caso legado: agendamento possui apenas string concatenada em __existingServicosString ou servico
                        const hasLegacyString = !!(agendamentoAtual && (agendamentoAtual.servico || agendamentoAtual.__existingServicosString));

                        // garantir array base
                        if (!Array.isArray(agendamentoAtual.servicos)) agendamentoAtual.servicos = Array.isArray(agendamentoAtual.__existingServicosArray) ? agendamentoAtual.__existingServicosArray.slice() : [];

                        let replaced = false;

                        // Se o item DOM é um item legado (dataset.serviceId === 'legacy') ou o agendamento só tinha string
                        if ((itemEl.dataset.serviceId === 'legacy' || (!agendamentoAtual.servicos.length && hasLegacyString))) {
                            // substituir o comportamento: remover o legado e criar o array com o novo objeto
                            agendamentoAtual.servicos = [updatedObj];
                            replaced = true;
                        }

                        // tentar localizar por data-service-id
                        if (!replaced) {
                            const sid = itemEl.dataset.serviceId;
                            if (sid) {
                                for (let i = 0; i < agendamentoAtual.servicos.length; i++) {
                                    if (String(agendamentoAtual.servicos[i].id) === String(sid)) {
                                        agendamentoAtual.servicos[i] = Object.assign({}, agendamentoAtual.servicos[i], updatedObj);
                                        replaced = true; break;
                                    }
                                }
                            }
                        }

                        // se ainda não encontrou, tentar localizar entre os serviços existentes originalmente carregados do servidor
                        // (útil quando o DOM/element dataset foi modificado e o item original está em __existingServicosArray)
                        if (!replaced && Array.isArray(agendamentoAtual.__existingServicosArray) && currentName) {
                            for (let i = 0; i < agendamentoAtual.__existingServicosArray.length; i++) {
                                const orig = agendamentoAtual.__existingServicosArray[i];
                                if (!orig) continue;
                                if (String(orig.nome || '').trim() === String(currentName || '').trim()) {
                                    // localizar índice correspondente no agendamentoAtual.servicos por id (se existir) ou por nome
                                    const targetId = orig.id;
                                    let replacedIdx = -1;
                                    if (targetId !== undefined && targetId !== null) {
                                        replacedIdx = agendamentoAtual.servicos.findIndex(x => String(x.id) === String(targetId));
                                    }
                                    if (replacedIdx === -1) {
                                        replacedIdx = agendamentoAtual.servicos.findIndex(x => String(x.nome || '').trim() === String(currentName || '').trim());
                                    }
                                    if (replacedIdx !== -1) {
                                        agendamentoAtual.servicos[replacedIdx] = Object.assign({}, agendamentoAtual.servicos[replacedIdx], updatedObj);
                                        replaced = true; break;
                                    }
                                }
                            }
                        }

                        // fallback: localizar por nome antiga
                        if (!replaced && currentName) {
                            for (let i = 0; i < agendamentoAtual.servicos.length; i++) {
                                if (String(agendamentoAtual.servicos[i].nome || '').trim() === String(currentName || '').trim()) {
                                    agendamentoAtual.servicos[i] = Object.assign({}, agendamentoAtual.servicos[i], updatedObj);
                                    replaced = true; break;
                                }
                            }
                        }

                        // fallback por posição DOM
                        if (!replaced) {
                            try {
                                const category = document.querySelector('.category-section');
                                if (category) {
                                    const nodes = Array.from(category.querySelectorAll('.service-item'));
                                    const idx = nodes.indexOf(itemEl);
                                    if (idx >= 0) {
                                        if (idx < agendamentoAtual.servicos.length) {
                                            agendamentoAtual.servicos[idx] = updatedObj; replaced = true;
                                        }
                                    }
                                }
                            } catch (e) { /* ignore */ }
                        }

                        if (!replaced) agendamentoAtual.servicos.push(updatedObj);

                        // garantir que o elemento DOM tenha o serviceId atualizado
                        try { itemEl.dataset.serviceId = String(updatedObj.id); } catch(e){}

                        // se havia string legado, atualizar também agendamentoAtual.servico para refletir novo nome
                        try {
                            if (hasLegacyString) {
                                agendamentoAtual.servico = updatedObj.nome;
                                agendamentoAtual.__existingServicosString = updatedObj.nome;
                            }
                        } catch(e){}
                    } catch(e){ console.warn('Erro atualizando agendamentoAtual.servicos no editar', e); }

                    // deduplicar possíveis itens DOM com o mesmo nome antigo (garantir que substituímos a linha clicada)
                    try {
                        const category = document.querySelector('.category-section');
                        if (category && currentName) {
                            const nodes = Array.from(category.querySelectorAll('.service-item'));
                            nodes.forEach(n => {
                                if (n === itemEl) return;
                                const nm = n.querySelector('.service-name')?.textContent || '';
                                if (String(nm || '').trim() === String(currentName || '').trim()) {
                                    n.remove();
                                }
                            });
                        }
                    } catch(e) { /* ignore */ }

                    // garantir que agendamentoAtual.servicos não tenha duplicatas (prefere id, fallback por nome)
                    try {
                        if (!Array.isArray(agendamentoAtual.servicos)) agendamentoAtual.servicos = Array.isArray(agendamentoAtual.__existingServicosArray) ? agendamentoAtual.__existingServicosArray.slice() : [];
                        const seen = new Set();
                        const dedup = [];
                        for (const it of agendamentoAtual.servicos) {
                            const key = (it && it.id) ? String(it.id) : (String(it.nome||'') + '::' + String(it.unitario||''));
                            if (seen.has(key)) continue;
                            seen.add(key);
                            dedup.push(it);
                        }
                        agendamentoAtual.servicos = dedup;
                    } catch(e){ console.warn('Erro deduplicando agendamentoAtual.servicos', e); }

                    // persistir e recalcular
                    await recalcAndPersistServicos();
                    close();
                } catch(e){ console.error('Erro ao salvar edição de item', e); }
            }

            document.getElementById('btnSalvarEditarServico').addEventListener('click', onSave);

            function close(){ try{ overlay.remove(); document.body.style.overflow = ''; }catch(e){} }
            } catch(e){ console.warn('openEditServiceModal error', e); }
        }
        // expor globalmente para que handlers fora desta função possam chamar
        try { window.openEditServiceModal = openEditServiceModal; } catch(e){}
    });
    
    // Modal de confirmação reutilizável (estilo do sistema)
    if (typeof window.showConfirmModal === 'undefined') {
        window.showConfirmModal = function(message){
            return new Promise((resolve)=>{
                try {
                    try { const prev = document.getElementById('confirmModalOverlay'); if (prev && prev.parentNode) prev.remove(); } catch(e){}
                    const overlay = document.createElement('div');
                    overlay.id = 'confirmModalOverlay';
                    overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1600000;';

                    const modal = document.createElement('div');
                    modal.style.cssText = 'width:420px;max-width:94%;background:white;border-radius:8px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:hidden;font-family:inherit;z-index:1600001;';
                    modal.innerHTML = `
                        <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
                            <strong>Confirmação</strong>
                        </div>
                        <div style="padding:16px;color:#222">${escapeHtmlUnsafe(message)}</div>
                        <div style="padding:12px 16px 18px;display:flex;justify-content:flex-end;gap:8px;">
                            <button id="confirmCancel" class="btn" style="background:#6c757d;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
                            <button id="confirmOk" class="btn" style="background:#dc3545;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Excluir</button>
                        </div>
                    `;

                    overlay.appendChild(modal);
                    document.body.appendChild(overlay);
                    try{ document.body.style.overflow = 'hidden'; } catch(e){}

                    function cleanup(){ try{ overlay.remove(); document.body.style.overflow = ''; } catch(e){} }

                    document.getElementById('confirmCancel').addEventListener('click', function(){ cleanup(); resolve(false); });
                    document.getElementById('confirmOk').addEventListener('click', function(){ cleanup(); resolve(true); });
                    overlay.addEventListener('click', function(ev){ if (ev.target === overlay) { cleanup(); resolve(false); } });
                } catch (e) { console.warn('showConfirmModal error', e); resolve(false); }
            });
        };
    }

    if (problemas.length > 0) {
        console.error('🚨 PROBLEMAS DE IDs DUPLICADOS DETECTADOS:');
        problemas.forEach(p => console.error(`   - ${p}`));
        return false;
    }
    
    console.log('✅ Verificação de IDs: Nenhum duplicado encontrado');
    return true;
}

function configurarDropdownInicioRapido() {
    if (window.dropdownConfigurado) return;
    const dropdownBtn = document.getElementById('inicioRapidoBtn');
    const dropdown = document.querySelector('.dropdown');
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            const wasOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open');
        });

        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                if (dropdown.classList.contains('open')) dropdown.classList.remove('open');
            }
        });

        window.dropdownConfigurado = true;
    }
}

// Profissionais cache + seletor
let _profissionaisCache = null;
async function ensureProfissionaisLoaded(){
    if (Array.isArray(_profissionaisCache)) return _profissionaisCache;
    try {
        const resp = await fetch('/api/profissionais', { credentials: 'include' });
        if (!resp.ok) throw new Error('Status ' + resp.status);
        const data = await resp.json();
        _profissionaisCache = Array.isArray(data) ? data : [];
    } catch(e){ console.warn('Erro carregando profissionais', e); _profissionaisCache = []; }
    return _profissionaisCache;
}

function openProfessionalSelector(anchorEl){
    try {
        // fechar qualquer dropdown existente
        const prev = document.getElementById('professionalDropdownOverlay'); if (prev) prev.remove();
        const overlay = document.createElement('div');
        overlay.id = 'professionalDropdownOverlay';
        overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:1600002;';

        const box = document.createElement('div');
        box.style.cssText = 'position:absolute;min-width:240px;max-width:380px;max-height:320px;overflow:auto;background:#fff;border:1px solid #e6e9ee;border-radius:8px;box-shadow:0 10px 30px rgba(2,16,26,0.08);padding:8px;';
        // posicionar próximo ao anchor: alinhar à mesma linha/caixa do elemento
        const rect = anchorEl.getBoundingClientRect();
        // colocar temporariamente fora da tela para medir
        box.style.left = '0px';
        box.style.top = '0px';
        // anexar overlay e box ao DOM antes de medir
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        const boxRect = box.getBoundingClientRect();
        const SHIFT_X = 15; // deslocar levemente para a esquerda
        let left = rect.left + window.scrollX - SHIFT_X;
        let top = rect.top + window.scrollY + Math.round((rect.height - boxRect.height) / 2);
        // ajustar para não ultrapassar viewport
        if (left + boxRect.width > window.scrollX + window.innerWidth - 8) left = window.scrollX + window.innerWidth - boxRect.width - 8;
        if (left < 8) left = 8;
        if (top + boxRect.height > window.scrollY + window.innerHeight - 8) top = window.scrollY + window.innerHeight - boxRect.height - 8;
        if (top < 8) top = 8;
        box.style.left = left + 'px';
        box.style.top = top + 'px';
        box.innerHTML = `<div style="padding:8px"><input id="profSearchInput" placeholder="Pesquisar profissional..." style="width:100%;padding:8px;border:1px solid #e6e9ee;border-radius:6px;box-sizing:border-box;"></div><div id="profListContainer" style="max-height:240px;overflow:auto;padding:4px;"></div>`;

        overlay.addEventListener('click', function(ev){ if (ev.target === overlay) overlay.remove(); });

        const container = document.getElementById('profListContainer');
        const input = document.getElementById('profSearchInput');

        function renderList(q){
            const ql = (q||'').toLowerCase().trim();
            container.innerHTML = '';
            const list = Array.isArray(_profissionaisCache) ? _profissionaisCache : [];
            const filtered = list.filter(p => !ql || (String(p.nome||'').toLowerCase().includes(ql)) ).slice(0,80);
            if (filtered.length === 0) { container.innerHTML = '<div style="padding:8px;color:#666">Nenhum profissional encontrado</div>'; return; }
            const frag = document.createDocumentFragment();
            filtered.forEach(p => {
                const row = document.createElement('div');
                row.style.cssText = 'padding:8px;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:8px;';
                row.innerHTML = `<div style="flex:1">${escapeHtmlUnsafe(p.nome||'')}<div style="font-size:12px;color:#888">${escapeHtmlUnsafe(p.cargo||'')}</div></div>`;
                row.addEventListener('click', async function(){
                    try {
                        // atualizar agendamentoAtual.profissional e persistir
                        const nome = p.nome || '';
                        if (agendamentoAtual && agendamentoAtual.id) {
                            const payload = { profissional: nome };
                            console.log('Atualizando profissional via PUT', payload);
                            const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, { method: 'PUT', credentials: 'include', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                            if (resp.ok) {
                                const updated = await resp.json().catch(()=>null);
                                if (updated) {
                                    agendamentoAtual.profissional = updated.profissional || nome;
                                } else {
                                    agendamentoAtual.profissional = nome;
                                }
                            } else {
                                agendamentoAtual.profissional = nome;
                            }
                        }
                        // atualizar UI
                        try { const profSidebar = document.querySelector('.professional-section .professional-content'); if (profSidebar) { profSidebar.querySelectorAll('.prof-name').forEach(el => el.textContent = nome); } const infoProf = document.querySelector('.info-row:nth-child(2) .info-value'); if (infoProf) infoProf.textContent = nome; document.querySelectorAll('.category-section .col-profissional, .service-item .col-profissional').forEach(el => { el.textContent = nome; }); } catch(e){}
                        // notificar outras páginas/modulos que o agendamento foi atualizado
                        try { window.dispatchEvent(new CustomEvent('agendamento-updated', { detail: { id: agendamentoAtual.id, profissional: nome } })); } catch(e){}
                    } catch(e){ console.warn('Erro ao setar profissional', e); }
                    overlay.remove();
                });
                frag.appendChild(row);
            });
            container.appendChild(frag);
        }

        input.addEventListener('input', function(){ renderList(input.value); });
        // carregar cache e renderizar
        ensureProfissionaisLoaded().then(()=>renderList(''));
        setTimeout(()=>input.focus(),50);
    } catch(e){ console.warn('openProfessionalSelector error', e); }
}

function salvarEstadoSubmenu(submenuId, isOpen) {
    try {
        const estadoSubmenus = JSON.parse(localStorage.getItem('estadoSubmenus') || '{}');
        estadoSubmenus[submenuId] = isOpen;
        localStorage.setItem('estadoSubmenus', JSON.stringify(estadoSubmenus));
    } catch (error) { console.error(error); }
}

function obterEstadoSubmenu(submenuId) {
    try { return JSON.parse(localStorage.getItem('estadoSubmenus') || '{}')[submenuId] || false; } catch (e) { return false; }
}

function configurarPersistenciaSubmenu(menuItemId, submenuId, submenuName) {
    const menuItems = document.querySelectorAll(`#${menuItemId}`);
    const submenus = document.querySelectorAll(`#${submenuId}`);
    if (menuItems.length > 1) {
        for (let i = 1; i < menuItems.length; i++) {
            const duplicateElement = menuItems[i].closest('.nav-item-with-submenu');
            if (duplicateElement) duplicateElement.remove();
        }
    }
    if (submenus.length > 1) { for (let i = 1; i < submenus.length; i++) submenus[i].remove(); }

    const menuItem = document.getElementById(menuItemId);
    const submenu = document.getElementById(submenuId);
    const menuContainer = menuItem?.parentElement;
    if (menuItem && submenu && menuContainer) {
        if (menuItem.getAttribute('data-listener-added')) return;
        menuItem.addEventListener('click', function(e) {
            e.preventDefault(); e.stopPropagation();
            if (e.target.closest('.submenu-item')) return;
            fecharOutrosSubmenus(submenuName);
            const isNowOpen = !menuContainer.classList.contains('open');
            menuContainer.classList.toggle('open');
            submenu.classList.toggle('open');
            salvarEstadoSubmenu(submenuName, isNowOpen);
        });

        const submenuItems = submenu.querySelectorAll('.submenu-item[href]');
        submenuItems.forEach(item => item.addEventListener('click', function(e) { e.stopPropagation(); setTimeout(()=>{ menuContainer.classList.remove('open'); submenu.classList.remove('open'); salvarEstadoSubmenu(submenuName, false); }, 150); }));
        const submenuItemsSemHref = submenu.querySelectorAll('.submenu-item:not([href])');
        submenuItemsSemHref.forEach(item => item.addEventListener('click', function(e) { e.stopPropagation(); menuContainer.classList.remove('open'); submenu.classList.remove('open'); salvarEstadoSubmenu(submenuName, false); }));

        menuItem.setAttribute('data-listener-added', 'true');
    }
}

function fecharOutrosSubmenus(submenuAtual) {
    const todosSubmenus = [
        { container: 'clienteMenuItem', submenu: 'clienteSubmenu', id: 'cliente' },
        { container: 'itemMenuItem', submenu: 'itemSubmenu', id: 'item' },
        { container: 'petMenuItem', submenu: 'petSubmenu', id: 'pet' },
        { container: 'atendimentoMenuItem', submenu: 'atendimentoSubmenu', id: 'atendimento' },
        { container: 'financeiroMenuItem', submenu: 'financeiroSubmenu', id: 'financeiro' },
        { container: 'configuracaoMenuItem', submenu: 'configuracaoSubmenu', id: 'configuracao' },
        { container: 'painelMenuItem', submenu: 'painelSubmenu', id: 'painel' },
        { container: 'comprasMenuItem', submenu: 'comprasSubmenu', id: 'compras' }
    ];
    todosSubmenus.forEach(({ container, submenu, id }) => {
        if (id !== submenuAtual) {
            const containerElement = document.getElementById(container)?.parentElement;
            const submenuElement = document.getElementById(submenu);
            if (containerElement && submenuElement) {
                if (containerElement.classList.contains('open')) { containerElement.classList.remove('open'); submenuElement.classList.remove('open'); salvarEstadoSubmenu(id, false); }
            }
        }
    });
}

function limparEstadoSubmenus() { try { localStorage.removeItem('estadoSubmenus'); } catch(e){} }

function destacarSecaoAtiva() {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    const mapeamentoPaginas = {
        'clientes.html': 'clienteMenuItem', 'novo-cliente.html': 'clienteMenuItem', 'grupos-clientes.html': 'clienteMenuItem', 'meus-clientes.html': 'clienteMenuItem',
        'meus-itens.html': 'itemMenuItem', 'novo-item.html': 'itemMenuItem', 'agrupamento.html': 'itemMenuItem', 'marca.html': 'itemMenuItem', 'unidade.html': 'itemMenuItem', 'descontos-item.html': 'itemMenuItem', 'comissao.html': 'itemMenuItem', 'etiquetas.html': 'itemMenuItem', 'tributacao.html': 'itemMenuItem', 'estoque.html': 'itemMenuItem', 'clinica.html': 'itemMenuItem', 'manutencao-produtos.html': 'itemMenuItem', 'controle-validade.html': 'itemMenuItem',
        'agendamentos-novo.html': 'atendimentoMenuItem', 'agendamentos.html': 'atendimentoMenuItem', 'minha-agenda.html': 'atendimentoMenuItem',
        'meus-pets.html': 'petMenuItem', 'novo-pet.html': 'petMenuItem', 'dashboard.html': 'dashboard'
    };
    const itemParaDestacar = mapeamentoPaginas[paginaAtual];
    if (itemParaDestacar && itemParaDestacar !== 'dashboard') {
        const menuItem = document.getElementById(itemParaDestacar);
        if (menuItem) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            menuItem.classList.add('active');
        }
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    detectarIDsDuplicados();
    limparEstadoSubmenus();

    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    if (menuToggle && sidebar && mainContent) {
        if (!menuToggle.hasAttribute('data-toggle-configured')) {
            menuToggle.setAttribute('data-toggle-configured', 'true');
            menuToggle.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); sidebar.classList.toggle('collapsed'); mainContent.classList.toggle('sidebar-collapsed'); });
        }
    }

    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            if (sidebar && mainContent && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.add('collapsed'); mainContent.classList.add('sidebar-collapsed');
            }
        }
    });

    configurarDropdownInicioRapido();
    configurarPersistenciaSubmenu('clienteMenuItem', 'clienteSubmenu', 'cliente');
    configurarPersistenciaSubmenu('itemMenuItem', 'itemSubmenu', 'item');
    configurarPersistenciaSubmenu('painelMenuItem', 'painelSubmenu', 'painel');
    configurarPersistenciaSubmenu('petMenuItem', 'petSubmenu', 'pet');
    configurarPersistenciaSubmenu('atendimentoMenuItem', 'atendimentoSubmenu', 'atendimento');
    configurarPersistenciaSubmenu('financeiroMenuItem', 'financeiroSubmenu', 'financeiro');
    configurarPersistenciaSubmenu('configuracaoMenuItem', 'configuracaoSubmenu', 'configuracao');
    configurarPersistenciaSubmenu('comprasMenuItem', 'comprasSubmenu', 'compras');
    destacarSecaoAtiva();
});

// Funções de navegação rápida (shims)
function novoAtendimento(){ window.location.href = '/agendamentos-novo.html'; closeDropdown(); }
function novoPet(){ window.location.href = '/pets/cadastro-pet.html'; closeDropdown(); }
function novoCliente(){ window.location.href = '/clientes.html'; closeDropdown(); }
function novoContrato(){ window.location.href = '/contrato-novo.html'; closeDropdown(); }
function novaVenda(){ window.location.href = '/venda-nova.html'; closeDropdown(); }
function novaContaPagar(){ window.location.href = '/contas-pagar-nova.html'; closeDropdown(); }
function closeDropdown(){ const dropdown = document.querySelector('.dropdown'); if (dropdown) dropdown.classList.remove('open'); }

// Configurar submenu lateral para Caixa
function configurarSubmenuLateralCaixa() {
    console.log('🔍 Iniciando configuração do submenu lateral Caixa...');
    
    const caixaSubmenuItem = document.getElementById('caixaSubmenuItem');
    const caixaLateralSubmenu = document.getElementById('caixaLateralSubmenu');
    const submenuItemWithLateral = document.querySelector('.submenu-item-with-lateral');
    
    console.log('🔍 Elementos encontrados:');
    console.log('- caixaSubmenuItem:', caixaSubmenuItem);
    console.log('- caixaLateralSubmenu:', caixaLateralSubmenu);
    console.log('- submenuItemWithLateral:', submenuItemWithLateral);
    
    if (caixaSubmenuItem && caixaLateralSubmenu && submenuItemWithLateral) {
        console.log('✅ Configurando submenu lateral do Caixa...');
        
        let isSubmenuVisible = false;
        
        // Função para mostrar submenu
        const showSubmenu = () => {
            console.log('📤 Mostrando submenu lateral');
            caixaLateralSubmenu.style.opacity = '1';
            caixaLateralSubmenu.style.visibility = 'visible';
            caixaLateralSubmenu.style.transform = 'translateX(0)';
            isSubmenuVisible = true;
        };
        
        // Função para esconder submenu
        const hideSubmenu = () => {
            console.log('📥 Escondendo submenu lateral');
            caixaLateralSubmenu.style.opacity = '0';
            caixaLateralSubmenu.style.visibility = 'hidden';
            caixaLateralSubmenu.style.transform = 'translateX(-10px)';
            isSubmenuVisible = false;
        };
        
        // Configurar hover no container principal
        submenuItemWithLateral.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entrou no container do Caixa');
            showSubmenu();
        });
        
        submenuItemWithLateral.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse saiu do container do Caixa');
            setTimeout(hideSubmenu, 100);
        });
        
        // Configurar hover no submenu lateral
        caixaLateralSubmenu.addEventListener('mouseenter', function() {
            console.log('🎯 Mouse entrou no submenu lateral');
            showSubmenu();
        });
        
        caixaLateralSubmenu.addEventListener('mouseleave', function() {
            console.log('🎯 Mouse saiu do submenu lateral');
            hideSubmenu();
        });
        
        // Adicionar event listeners para os itens do submenu lateral
        const lateralItems = caixaLateralSubmenu.querySelectorAll('.lateral-submenu-item');
        console.log(`🔍 Encontrados ${lateralItems.length} itens no submenu lateral`);
        
        lateralItems.forEach((item, index) => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const texto = this.textContent.trim();
                console.log(`🚀 Clique em: ${texto}`);
                
                // Aqui você pode adicionar navegação específica para cada item
                switch(texto) {
                    case 'Abertura/Fechamento':
                        alert('Navegando para Abertura/Fechamento de Caixa');
                        // window.location.href = '/caixa/abertura-fechamento.html';
                        break;
                    case 'Suprimento/Sangria':
                        alert('Navegando para Suprimento/Sangria');
                        // window.location.href = '/caixa/suprimento-sangria.html';
                        break;
                    case 'Rel. Demonstrativo de caixa':
                        alert('Navegando para Relatório Demonstrativo de Caixa');
                        // window.location.href = '/caixa/relatorio-demonstrativo.html';
                        break;
                }
                
                hideSubmenu();
            });
            
            console.log(`✅ Configurado evento click para item ${index + 1}: ${item.textContent.trim()}`);
        });
        
        console.log('✅ Submenu lateral do Caixa configurado com sucesso!');
    } else {
        console.error('❌ Elementos do submenu lateral Caixa não encontrados');
        console.log('- Verifique se os IDs caixaSubmenuItem e caixaLateralSubmenu existem no HTML');
        console.log('- Verifique se a classe .submenu-item-with-lateral existe no HTML');
    }
}

// Adicionar configuração do submenu lateral ao DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que outros elementos carregaram
    setTimeout(() => {
        configurarSubmenuLateralCaixa();
    }, 200);
});

// ===== FUNCIONALIDADES DA PÁGINA DE DETALHES DO AGENDAMENTO =====

// Variável para armazenar os dados do agendamento atual
let agendamentoAtual = null;

// Função para carregar os dados do agendamento
async function carregarAgendamento() {
    try {
        // Pega o ID do agendamento da URL
        const urlParams = new URLSearchParams(window.location.search);
        const agendamentoId = urlParams.get('id');
        
        console.log('🔍 ID do agendamento da URL:', agendamentoId);
        
        if (!agendamentoId) {
            console.error('ID do agendamento não encontrado na URL');
            alert('ID do agendamento não encontrado na URL');
            return;
        }
        
        // Buscar diretamente da API
        // Mostrar placeholders nos itens para evitar flash de conteúdo antigo
        try { showItemsPlaceholder(); } catch (e) { /* ignore */ }

        console.log(`📡 Buscando agendamento ${agendamentoId} da API...`);
        const response = await fetch(`/api/agendamentos/${agendamentoId}`);
        
        if (!response.ok) {
            throw new Error(`Erro ao carregar agendamento: ${response.status} ${response.statusText}`);
        }
        
        agendamentoAtual = await response.json();
        console.log('✅ Agendamento carregado da API:', agendamentoAtual);
        
        preencherDadosAgendamento(agendamentoAtual);
        
    } catch (error) {
        console.error('❌ Erro ao carregar agendamento:', error);
        alert('Erro ao carregar dados do agendamento: ' + error.message);
    }
}

// Função para carregar dados de exemplo (fallback)
function carregarDadosExemplo() {
    agendamentoAtual = {
        id: 12734,
        Pet: { nome: 'Scott - Shih-tzu', idade: '3 anos', peso: 'Informar peso' },
        Cliente: { nome: '29 - Claudio', telefone: '(11) 99999-9999' },
        dataAgendamento: '2025-11-05T09:00:00',
        checkin: '2025-11-05T11:25:00',
        status: 'check-in',
        estadia: '5 dias',
        box: '-',
        servicos: [
            {
                id: 1,
                nome: 'Banho - Assinatura',
                contrato: '#695',
                horario: '09:00',
                data: '05/Nov',
                profissional: 'Mariana',
                quantidade: 1,
                unitario: '-',
                desconto: '-',
                total: '-'
            },
            {
                id: 2,
                nome: 'Tosa Raspada - Porte Pequeno',
                horario: '17:08',
                data: '05/Nov',
                profissional: 'Mariana',
                quantidade: 1,
                unitario: '120,90',
                desconto: '17,287%',
                total: '100,00'
            }
        ],
        observacoes: 'Atendimento.',
        total: 100.00,
        pendente: 100.00
    };
    
    preencherDadosAgendamento(agendamentoAtual);
    console.log('📝 Dados de exemplo carregados:', agendamentoAtual);
}

// Função para preencher os dados na tela
function preencherDadosAgendamento(agendamento) {
    if (!agendamento) return;
    
    try {
        console.log('📝 Preenchendo dados:', agendamento);
        
        // Preenche informações do cabeçalho
        const titulo = document.getElementById('atendimentoTitulo');
        if (titulo) titulo.textContent = `Atendimento ${agendamento.id || ''}`;
        
        // Dados do Pet - API retorna petNome diretamente ou Pet.nome
        const petNome = document.getElementById('petNome');
        if (petNome) {
            const nomePet = agendamento.petNome || agendamento.pet?.nome || agendamento.Pet?.nome || '-';
            petNome.textContent = nomePet;
        }
        
        const petIdade = document.getElementById('petIdade');
        if (petIdade) {
            const idade = agendamento.pet?.idade || agendamento.Pet?.idade || '-';
            petIdade.textContent = idade;
        }
        
        const petPeso = document.getElementById('petPeso');
        if (petPeso) {
            const peso = agendamento.pet?.peso || agendamento.Pet?.peso || '-';
            petPeso.textContent = peso;
        }
        
        // Dados do Cliente - API retorna clienteNome diretamente ou Cliente.nome
        const clienteNome = document.getElementById('clienteNome');
        if (clienteNome) {
            const nomeCliente = agendamento.clienteNome || agendamento.pet?.cliente?.nome || agendamento.Cliente?.nome || '-';
            clienteNome.textContent = nomeCliente;
        }
        
        const boxInfo = document.getElementById('boxInfo');
        if (boxInfo) boxInfo.textContent = agendamento.box || '-';
        
        // Formata e preenche datas
        const dataAgendamento = document.getElementById('dataAgendamento');
        if (dataAgendamento) dataAgendamento.textContent = formatarDataHora(agendamento.dataAgendamento);
        
        const checkinInfo = document.getElementById('checkinInfo');
        if (checkinInfo) checkinInfo.textContent = formatarDataHora(agendamento.checkin || agendamento.dataAgendamento);
        
        const estadiaInfo = document.getElementById('estadiaInfo');
        if (estadiaInfo) estadiaInfo.textContent = agendamento.estadia || '-';
        
        // Define o status
        const statusSelect = document.getElementById('statusSelect');
        if (statusSelect) {
            statusSelect.value = agendamento.status || 'agendado';
            atualizarClasseStatus(statusSelect);
        }
        // Atualizar o badge visível para refletir o status atual
        try {
            const statusBadge = document.querySelector('.status-badge');
            if (statusBadge) {
                const s = String(agendamento.status || 'agendado').toLowerCase();
                const classMap = { 'checkin': 'check-in', 'checkout': 'check-out', 'concluido': 'check-out' };
                const statusClass = classMap[s] || s.replace(/[^a-z0-9]+/g, '-');
                const labelMap = { agendado: 'Agendado', 'check-in': 'Check-in', pronto: 'Pronto', 'check-out': 'Check-out', cancelado: 'Cancelado' };
                statusBadge.className = `status-badge status-${statusClass}`;
                statusBadge.textContent = labelMap[statusClass] || agendamento.status || 'Agendado';
            }
            try { updateServiceIcons(agendamento.status); } catch(e){}
        } catch(e) { console.warn('Erro atualizando status-badge ao preencher dados', e); }
        
        // Preenche observações
        const observacoes = document.getElementById('observacoes');
        if (observacoes) observacoes.value = agendamento.observacoes || '';
        
                // Renderiza a lista de serviços/produtos na seção "Serviços e Produtos"
                try {
                        const category = document.querySelector('.category-section');
                        if (category) {
                                // Remove itens de exemplo existentes
                                category.querySelectorAll('.service-item').forEach(n => n.remove());

                                // Normaliza possíveis fontes de dados
                                const servicosArray = Array.isArray(agendamento.servicos) ? agendamento.servicos : null;
                                // manter cópia estruturada dos serviços existentes (pode ser undefined para registros legados)
                                try { agendamento.__existingServicosArray = Array.isArray(agendamento.servicos) ? agendamento.servicos.slice() : []; } catch(e) { agendamento.__existingServicosArray = []; }
                                const nomesConcatenados = agendamento.servicosNomes || agendamento.servicos_nome || agendamento.servico || '';
                                const valorTotalAgendamento = parseFloat(agendamento.valor || agendamento.valorTotal || agendamento.total) || 0;
                                // armazenar totals/servicos originais para permitir somar novos itens posteriormente
                                try { agendamento.__existingTotal = valorTotalAgendamento; } catch(e){}
                                try { agendamento.__existingServicosString = nomesConcatenados || (agendamento.servico || ''); } catch(e){}

                                if (servicosArray && servicosArray.length > 0) {
                                        servicosArray.forEach(s => {
                                                const nome = s.nome || s.nomeServico || String(s).trim();
                                                const horario = s.horario || s.time || '';
                                                const data = s.data || s.dataServico || '';
                                                const profissional = s.profissional || s.profissionalNome || '';
                                                const qtd = s.quantidade || s.qtd || 1;
                                                const unitario = parseFloat(s.unitario || s.valor_unitario || s.valor || 0) || 0;
                                                const total = parseFloat(s.total || s.valor || unitario * qtd) || unitario * qtd;

                                                const item = document.createElement('div');
                                                item.className = 'service-item';
                                                try { if (s && (s.id !== undefined && s.id !== null)) item.dataset.serviceId = String(s.id); } catch(e){}
                                                // marcar id para ações (pode ser legacy)
                                                try { if (s && (s.id !== undefined && s.id !== null)) item.dataset.serviceId = String(s.id); } catch(e){}
                                                item.innerHTML = `
                                                        <div class="col-horario">
                                                            <i class="fas fa-clock"></i>
                                                            <div class="time-info">
                                                                <span class="time">${horario || ''}</span>
                                                                <small class="date">${data || ''}</small>
                                                            </div>
                                                        </div>
                                                        <div class="col-descricao">
                                                            <div class="service-name">${escapeHtmlUnsafe(nome)}</div>
                                                        </div>
                                                        <div class="col-profissional">${escapeHtmlUnsafe(profissional)}</div>
                                                        <div class="col-qtd">${escapeHtmlUnsafe(qtd)}</div>
                                                        <div class="col-unitario">${formatarMoeda(unitario)}</div>
                                                        <div class="col-desconto">${escapeHtmlUnsafe(s.desconto || '-')}</div>
                                                        <div class="col-total">${formatarMoeda(total)}</div>
                                                        <div class="col-acoes">
                                                            <button class="btn-item-action" title="Mais opções"><i class="fas fa-ellipsis-v"></i></button>
                                                        </div>
                                                `;
                                                category.appendChild(item);
                                        });
                                } else if (nomesConcatenados) {
                                        // Se não houver array, renderiza a string concatenada como um único item
                                        const item = document.createElement('div');
                                        item.className = 'service-item';
                                        try { item.dataset.serviceId = 'legacy'; } catch(e){}
                                        item.innerHTML = `
                                                <div class="col-horario">
                                                    <i class="fas fa-clock"></i>
                                                </div>
                                                <div class="col-descricao">
                                                    <div class="service-name">${escapeHtmlUnsafe(nomesConcatenados)}</div>
                                                </div>
                                                <div class="col-profissional">-</div>
                                                <div class="col-qtd">1</div>
                                                <div class="col-unitario">${formatarMoeda(valorTotalAgendamento)}</div>
                                                <div class="col-desconto">-</div>
                                                <div class="col-total">${formatarMoeda(valorTotalAgendamento)}</div>
                                                <div class="col-acoes">
                                                    <button class="btn-item-action" title="Mais opções"><i class="fas fa-ellipsis-v"></i></button>
                                                </div>
                                        `;
                                        category.appendChild(item);
                                }

                                // Atualiza totais laterais
                                const totalGeral = document.getElementById('totalGeral');
                                if (totalGeral) totalGeral.textContent = formatarMoeda(valorTotalAgendamento);
                                const totalPendente = document.getElementById('totalPendente');
                                if (totalPendente) totalPendente.textContent = formatarMoeda(valorTotalAgendamento);
                                const amount = document.querySelector('.amount');
                                if (amount) amount.textContent = formatarMoeda(valorTotalAgendamento);

                                // Atualiza Profissional Responsável na barra lateral (puxa da API/agendamento)
                                try {
                                    const profSection = document.querySelector('.professional-section .professional-content');
                                    if (profSection) {
                                        profSection.innerHTML = '';
                                        const profName = agendamento.profissional || agendamento.profissionalNome || (Array.isArray(agendamento.servicos) && agendamento.servicos[0] && (agendamento.servicos[0].profissional || agendamento.servicos[0].profissionalNome)) || '-';
                                        const wrapper = document.createElement('div');
                                        wrapper.className = 'prof-card';
                                        const nameEl = document.createElement('div');
                                        nameEl.className = 'prof-name';
                                        nameEl.textContent = profName;
                                        wrapper.appendChild(nameEl);
                                        // tornar selecionável para abrir dropdown de profissionais
                                        wrapper.style.cursor = 'pointer';
                                        wrapper.title = 'Clique para selecionar/trocar profissional';
                                        wrapper.addEventListener('click', function(e){
                                            e.stopPropagation();
                                            openProfessionalSelector(wrapper);
                                        });
                                        profSection.appendChild(wrapper);
                                    }
                                } catch (e) { console.warn('Erro ao preencher Profissional:', e); }
                        }
                } catch (e) {
                        console.warn('Erro ao renderizar serviços:', e);
                }
        
        // Garantir que todos os locais que exibem o profissional sejam preenchidos
        try {
            const profFromAg = agendamento.profissional || agendamento.profissionalNome || (Array.isArray(agendamento.servicos) && agendamento.servicos[0] && (agendamento.servicos[0].profissional || agendamento.servicos[0].profissionalNome)) || '-';
            // Preencher apenas as células de profissional dentro dos itens (não alterar o cabeçalho da tabela)
            document.querySelectorAll('.category-section .col-profissional, .service-item .col-profissional').forEach(el => { el.textContent = profFromAg; });
            document.querySelectorAll('.agendamento-profissional').forEach(el => { el.textContent = profFromAg; });
            const profSidebar = document.querySelector('.professional-section .professional-content');
            if (profSidebar && !profSidebar.textContent.trim()) {
                profSidebar.innerHTML = '';
                const wrapper = document.createElement('div');
                wrapper.className = 'prof-card';
                const nameEl = document.createElement('div');
                nameEl.className = 'prof-name';
                nameEl.textContent = profFromAg;
                wrapper.appendChild(nameEl);
                profSidebar.appendChild(wrapper);
            }
            const infoProf = document.querySelector('.info-row:nth-child(2) .info-value');
            if (infoProf) infoProf.textContent = profFromAg;
        } catch (e) { console.warn('Erro ao popular profissionais em múltiplos locais:', e); }

        // Atualiza ícones dos serviços conforme status
        try { updateServiceIcons(agendamento.status || agendamento.statusTexto || agendamento.status_nome); } catch(e){/* ignore */}

        console.log('✅ Dados preenchidos na tela');
    } catch (error) {
        console.error('Erro ao preencher dados:', error);
    }
}

// Função para formatar data e hora
function formatarDataHora(data) {
    if (!data) return '-';
    try {
        const date = new Date(data);
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        return data;
    }
}

// Função para formatar moeda
function formatarMoeda(valor) {
    if (typeof valor === 'number') {
        return valor.toFixed(2).replace('.', ',');
    }
    return valor || '0,00';
}

// Mostra placeholders '...' na seção de itens enquanto os dados carregam
function showItemsPlaceholder() {
        try {
                const category = document.querySelector('.category-section');
                if (!category) return;

                // Remove itens atuais e adiciona item placeholder
                category.querySelectorAll('.service-item').forEach(n => n.remove());

                const item = document.createElement('div');
                item.className = 'service-item placeholder-item';
                item.innerHTML = `
                        <div class="col-horario">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="col-descricao">
                            <div class="service-name">...</div>
                        </div>
                        <div class="col-profissional">...</div>
                        <div class="col-qtd">...</div>
                        <div class="col-unitario">...</div>
                        <div class="col-desconto">...</div>
                        <div class="col-total">...</div>
                        <div class="col-acoes"></div>
                `;

                category.appendChild(item);

                // Totais também com placeholder
                const totalGeral = document.getElementById('totalGeral'); if (totalGeral) totalGeral.textContent = '...';
                const totalPendente = document.getElementById('totalPendente'); if (totalPendente) totalPendente.textContent = '...';
                const amount = document.querySelector('.amount'); if (amount) amount.textContent = '...';
        } catch (e) { console.warn('Erro ao mostrar placeholders:', e); }
}

// Função para alternar abas
function alternarAba(aba) {
    // Remove classe active de todas as abas
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adiciona classe active na aba clicada
    const botaoAba = document.querySelector(`[onclick="alternarAba('${aba}')"]`);
    if (botaoAba) botaoAba.classList.add('active');
    
    const conteudoAba = document.getElementById(`${aba}Content`);
    if (conteudoAba) conteudoAba.classList.add('active');
    
    console.log(`📋 Aba alterada para: ${aba}`);
}

// Função para atualizar a classe CSS do status
function atualizarClasseStatus(selectElement) {
    const status = selectElement.value;
    
    // Remove todas as classes de status
    selectElement.className = 'status-select';
    
    // Adiciona classe específica baseada no status
    // normalizar possíveis variantes de valor (ex: 'checkin' vs 'check-in')
    const normalized = String(status).toLowerCase().replace(/_/g, '-');
    // limpar estilos inline anteriores
    selectElement.style.background = '';
    selectElement.style.color = '';
    selectElement.style.border = '';
    selectElement.style.boxShadow = '';

    switch(normalized) {
        case 'agendado':
            // outlined gray
            selectElement.style.background = '#ffffff';
            selectElement.style.color = '#6c757d';
            selectElement.style.border = '2px solid #6c757d';
            selectElement.style.boxShadow = 'none';
            break;
        case 'checkin':
        case 'check-in':
            // filled blue
            selectElement.style.background = '#1e88e5';
            selectElement.style.color = '#ffffff';
            selectElement.style.border = 'none';
            break;
        case 'confirmado':
            // keep confirmed as blue variant (legacy mapping)
            selectElement.style.background = '#1e88e5';
            selectElement.style.color = '#ffffff';
            selectElement.style.border = 'none';
            break;
        case 'pronto':
            // light purple
            selectElement.style.background = '#f5eafd';
            selectElement.style.color = '#8e24aa';
            selectElement.style.border = 'none';
            break;
        case 'em-atendimento':
            // treat as orange-ish
            selectElement.style.background = '#fff4e6';
            selectElement.style.color = '#ff8a00';
            selectElement.style.border = 'none';
            break;
        case 'concluido':
        case 'check-out':
        case 'checkout':
        case 'finalizado':
            // light green
            selectElement.style.background = '#edf7ee';
            selectElement.style.color = '#2e7d32';
            selectElement.style.border = 'none';
            break;
        case 'cancelado':
            // canceled: red solid
            selectElement.style.background = '#c12b2b';
            selectElement.style.color = '#ffffff';
            selectElement.style.border = 'none';
            break;
        default:
            selectElement.style.background = '#ffffff';
            selectElement.style.color = '#333';
            selectElement.style.border = '1px solid #ddd';
    }
}

// Atualiza ícones dos serviços: relógio -> check quando status for check-out/concluido
function updateServiceIcons(status) {
    try {
        const normalized = String(status || '').toLowerCase();
        const isChecked = ['concluido', 'check-out', 'checkout'].includes(normalized);
        const icons = document.querySelectorAll('.category-section .col-horario i');
        icons.forEach(i => {
            // remover classes antigas
            i.classList.remove('fa-clock');
            i.classList.remove('fa-check');
            i.classList.remove('fa-check-circle');
            if (isChecked) {
                i.classList.add('fa-check');
                i.style.color = '#2e7d32';
            } else {
                i.classList.add('fa-clock');
                i.style.color = ''; 
            }
        });
    } catch (e) { console.warn('Erro updateServiceIcons', e); }
}

// Função para finalizar cobrança e fazer checkout
async function finalizarCobranca() {
    console.log('>> finalizarCobranca invoked', agendamentoAtual && agendamentoAtual.id);
    if (!agendamentoAtual) {
        alert('Nenhum agendamento carregado');
        return;
    }
    
    // removed confirmation dialog to open payment modal directly
    
    try {
        // Calcular total do agendamento (base + itens adicionados nesta sessão)
        let baseTotal = parseFloat(agendamentoAtual.__existingTotal || agendamentoAtual.valor || agendamentoAtual.valorTotal || agendamentoAtual.total || 0) || 0;
        let addedTotal = 0;
        try {
            addedTotal = (agendamentoAtual._addedServicos || []).reduce((acc, it) => {
                const v = parseFloat(String(it.total || it.valor || it.unitario || 0).toString().replace(',', '.')) || 0;
                return acc + v;
            }, 0);
        } catch (e) { addedTotal = 0; }

        const totalVenda = baseTotal + addedTotal;

        // Abrir o modal de pagamento (reutiliza o modal de nova-venda)
        try {
            // Escuta o evento único disparado quando a venda for finalizada
            document.addEventListener('venda:finalizada', async function onVendaFinalizada(ev) {
                try {
                    // Ao confirmar que a venda foi salva, marcar o agendamento como concluído
                    const response = await fetch(`/api/agendamentos/${agendamentoAtual.id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'concluido' }),
                        credentials: 'include'
                    });

                    if (response.ok) {
                        console.log('✅ Check-out realizado após pagamento');
                        try { alert('Check-out realizado com sucesso!'); } catch(e){}

                        // Atualiza o select visual
                        const statusSelect = document.getElementById('statusSelect');
                        if (statusSelect) {
                            statusSelect.value = 'concluido';
                            atualizarClasseStatus(statusSelect);
                        }

                        // Atualiza objeto local e ícones/linhas
                        agendamentoAtual.status = 'concluido';
                        try { atualizarLinhaListaStatus(agendamentoAtual.id, 'concluido'); } catch(e){}
                        try { updateServiceIcons('concluido'); } catch(e){}

                        // Redireciona de volta para a lista após 1 segundo
                        setTimeout(() => { window.location.href = 'agendamentos-novo.html'; }, 1000);
                    } else {
                        let errText = 'Erro desconhecido';
                        try { const errJson = await response.json(); errText = errJson.message || errText; } catch(e){}
                        alert('Erro ao finalizar cobrança: ' + errText);
                    }
                } catch (err) {
                    console.error('Erro processando venda finalizada:', err);
                    alert('Erro ao processar finalização do agendamento após pagamento.');
                }
            }, { once: true });

            // Chamar modal com o total do agendamento
            try {
                if (typeof abrirModalPagamento === 'function') {
                    // Preparar seed com itens do agendamento (compatível com formatos legados)
                    let seedItens = [];
                    if (Array.isArray(agendamentoAtual.servicos) && agendamentoAtual.servicos.length > 0) {
                        seedItens = agendamentoAtual.servicos;
                    } else if (Array.isArray(agendamentoAtual.__existingServicosArray) && agendamentoAtual.__existingServicosArray.length > 0) {
                        seedItens = agendamentoAtual.__existingServicosArray;
                    } else {
                        // tentar extrair de string legada (servico / servicosNomes)
                        const nomes = agendamentoAtual.servicosNomes || agendamentoAtual.servicos_nome || agendamentoAtual.servico || agendamentoAtual.__existingServicosString || '';
                        const totalLegado = parseFloat(agendamentoAtual.__existingTotal || agendamentoAtual.valor || agendamentoAtual.valorTotal || agendamentoAtual.total) || 0;
                        if (nomes && String(nomes).trim()) {
                            seedItens = [{
                                id: 'legacy-' + (agendamentoAtual.id || Date.now()),
                                produto: { nome: String(nomes).trim(), id: null },
                                quantidade: 1,
                                valorUnitario: totalLegado,
                                totalBruto: totalLegado,
                                totalFinal: totalLegado
                            }];
                        }
                    }

                    const seed = {
                        itens: seedItens || [],
                        cliente: agendamentoAtual.cliente || agendamentoAtual.clienteNome || (document.getElementById('clienteNome') ? document.getElementById('clienteNome').textContent : ''),
                        profissional: agendamentoAtual.profissional || agendamentoAtual.profissionalNome || (document.querySelector('.professional-section .professional-content') ? document.querySelector('.professional-section .professional-content').textContent : '')
                    };
                    abrirModalPagamento(totalVenda, seed);
                } else {
                    console.warn('abrirModalPagamento não disponível');
                    alert('Não foi possível abrir o modal de pagamento.');
                }
            } catch (err) {
                console.error('Erro ao abrir modal de pagamento:', err);
                alert('Erro ao abrir modal de pagamento.');
            }
            
            // Não prosseguir aqui; o processamento do status ocorrerá quando o evento for disparado
            return;
        } catch (err) {
            console.error('Erro ao iniciar fluxo de pagamento:', err);
            alert('Erro ao iniciar fluxo de pagamento.');
            return;
        }
    } catch (error) {
        console.error('Erro ao finalizar cobrança:', error);
        alert('Erro ao finalizar cobrança. Verifique sua conexão e tente novamente.');
    }
}

// Função para salvar alterações do status
async function salvarStatus() {
    if (!agendamentoAtual) return;
    
    const statusSelect = document.getElementById('statusSelect');
    const novoStatus = statusSelect.value;
    
    try {
        // Atualiza o objeto local
        agendamentoAtual.status = novoStatus;
        
        // Tenta salvar na API
        const response = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: novoStatus }),
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('✅ Status atualizado na API');
            // Atualiza visualmente qualquer linha da lista presente nesta página
            try { atualizarLinhaListaStatus(agendamentoAtual.id, novoStatus); } catch(e){ console.warn('Não foi possível atualizar a linha da lista localmente', e); }

            // Atualizar ícones dos serviços na página de detalhes
            try { updateServiceIcons(novoStatus); } catch(e){ console.warn('Erro ao atualizar ícones após salvar status', e); }

            // Notifica outras abas/janelas via BroadcastChannel (se disponível)
            try {
                if (typeof BroadcastChannel !== 'undefined') {
                    const bc = new BroadcastChannel('agendamentos_channel');
                    bc.postMessage({ type: 'status-updated', id: agendamentoAtual.id, status: novoStatus });
                    bc.close();
                } else if (window.opener && window.opener.postMessage) {
                    window.opener.postMessage({ type: 'status-updated', id: agendamentoAtual.id, status: novoStatus }, '*');
                }
            } catch (e) { console.warn('Broadcast de status falhou', e); }
        } else {
            console.warn('⚠️ Erro ao salvar na API, salvando apenas no localStorage');
        }
        
        // Atualiza no localStorage
        atualizarLocalStorage();
        console.log(`📊 Status alterado para: ${novoStatus}`);
        
    } catch (error) {
        console.error('Erro ao salvar status:', error);
        // Atualiza apenas no localStorage em caso de erro
        atualizarLocalStorage();
    }
}

// Atualiza a linha da lista de agendamentos caso ela exista no DOM desta página
function atualizarLinhaListaStatus(id, status) {
    try {
        const row = document.querySelector(`.agendamento-row[data-agendamento-id="${id}"]`);
        if (!row) return;
        const badge = row.querySelector('.status-badge');
        if (!badge) return;

        // Mapear label para exibição
        const s = String(status || '').toLowerCase();
        const classMap = { 'checkin': 'check-in', 'check-in': 'check-in', 'checkout': 'check-out', 'check-out': 'check-out', 'concluido': 'check-out' };
        const statusClass = classMap[s] || s.replace(/[^a-z0-9]+/g, '-');

        const labelMap = { agendado: 'Agendado', 'check-in': 'Check-in', pronto: 'Pronto', 'check-out': 'Check-out', cancelado: 'Cancelado' };
        const display = labelMap[statusClass] || status;

        // Remover estilos inline antigos para aplicar CSS corretamente
        badge.removeAttribute('style');

        badge.className = `status-badge status-${statusClass}`;
        badge.textContent = display;
    } catch (e) {
        console.error('Erro ao atualizar linha de lista localmente:', e);
    }
}

// TODO: Remover função - usar ApiClient.atualizarAgendamento() ao invés de localStorage
function atualizarLocalStorage() {
    console.warn('⚠️ atualizarLocalStorage() DEPRECATED - usar ApiClient.atualizarAgendamento()');
    return; // Função desabilitada
    
    /* CÓDIGO ANTIGO - REMOVER
    if (!agendamentoAtual) return;
    
    try {
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const index = agendamentos.findIndex(ag => ag.id == agendamentoAtual.id);
        
        if (index !== -1) {
            agendamentos[index] = { ...agendamentos[index], ...agendamentoAtual };
        } else {
            agendamentos.push(agendamentoAtual);
        }
        
        localStorage.setItem('agendamentos_persistidos', JSON.stringify(agendamentos));
        console.log('💾 Dados salvos no localStorage');
    } catch (error) {
        console.error('Erro ao atualizar localStorage:', error);
    }
    */
}

// Função para salvar observações
async function salvarObservacoes() {
    if (!agendamentoAtual) return;
    
    const observacoesText = document.getElementById('observacoes');
    if (!observacoesText) return;
    
    const novasObservacoes = observacoesText.value;
    
    try {
        // Atualiza o objeto local
        agendamentoAtual.observacoes = novasObservacoes;
        
        // Tenta salvar na API
        const response = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observacoes: novasObservacoes }),
            credentials: 'include'
        });
        
        if (response.ok) {
            console.log('✅ Observações atualizadas na API');
        } else {
            console.warn('⚠️ Erro ao salvar na API, salvando apenas no localStorage');
        }
        
        // Atualiza no localStorage
        atualizarLocalStorage();
        console.log('📝 Observações salvas');
        try {
            const ev = new CustomEvent('agendamento-updated', { detail: { id: agendamentoAtual.id, observacoes: novasObservacoes } });
            window.dispatchEvent(ev);
        } catch (e) { /* ignore */ }
        
    } catch (error) {
        console.error('Erro ao salvar observações:', error);
        atualizarLocalStorage();
    }
}

// Função para voltar à lista de agendamentos
function voltarParaLista() {
    window.location.href = 'agendamentos-novo.html';
}

// Abre modal pequeno centralizado para adicionar item (produto/serviço)
function openAddItemModal() {
    // bloquear se agendamento já estiver finalizado / check-out
    try {
        const normalizedStatus = String((agendamentoAtual && agendamentoAtual.status) || '').toLowerCase().replace(/_/g,'-');
        if (['concluido','check-out','checkout','finalizado'].includes(normalizedStatus)) {
            try { if (typeof showNotification === 'function') { showNotification('Atendimento finalizado — não é possível adicionar itens.', 'error'); } else { alert('Atendimento finalizado — não é possível adicionar itens.'); } } catch(e) { try { alert('Atendimento finalizado — não é possível adicionar itens.'); } catch(_){} }
            return;
        }
    } catch(e) {}

    // evitar múltiplos modais
    if (document.getElementById('modalAdicionarItem')) return;

    const overlay = document.createElement('div');
    overlay.id = 'modalAdicionarItemOverlay';
    overlay.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:1200000;';

    const modal = document.createElement('div');
    modal.id = 'modalAdicionarItem';
    modal.style.cssText = 'width:520px;background:white;border-radius:8px;box-shadow:0 10px 40px rgba(2,16,26,0.3);overflow:hidden;font-family:inherit;';
    modal.innerHTML = `
        <div style="background:#f5f6f8;padding:12px 16px;border-bottom:1px solid #e6e9ee;display:flex;align-items:center;justify-content:space-between;">
            <strong>Adicionar Item</strong>
            <button id="fecharModalAdicionarItem" style="background:transparent;border:none;font-size:18px;cursor:pointer;color:#666">✕</button>
        </div>
        <div style="padding:16px;">
            <label style="display:block;margin-bottom:6px;font-weight:600;color:#333">Produto/Serviço *</label>
            <input id="adicionarItemInput" type="text" placeholder="Digite para buscar..." style="width:100%;padding:10px;border:1px solid #dfe6ef;border-radius:6px;margin-bottom:8px;box-sizing:border-box;">
            <div id="adicionarItemResults" style="max-height:220px;overflow:auto;border:1px solid #f1f5f9;border-radius:6px;display:none;margin-bottom:8px;"></div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                <button id="btnSalvarItem" class="btn" style="background:#28a745;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Salvar</button>
                <button id="btnFecharItem" class="btn" style="background:#c12b2b;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer">Cancelar</button>
            </div>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const input = document.getElementById('adicionarItemInput');
    const results = document.getElementById('adicionarItemResults');

    // garantir array para itens adicionados nesta sessão (não sobrescreve dados do servidor)
    if (!agendamentoAtual) agendamentoAtual = {};
    if (!Array.isArray(agendamentoAtual._addedServicos)) agendamentoAtual._addedServicos = [];

    // Busca direto via API (não usa cache no navegador). Usa AbortController para cancelar requisições pendentes.
    let __currentSearchController = null;
    const SEARCH_API_PATH = '/api/itens?q='; // endpoint que retorna itens do banco (usar ?q= para compatibilidade)
    let __loadingTimeout = null;
    let __isComposing = false;

    async function doSearch(q){
        const qq = (q||'').trim();
        if(!qq){ results.style.display='none'; results.innerHTML=''; return; }

        // cancela requisição anterior
        try { if (__currentSearchController) __currentSearchController.abort(); } catch(e){}
        __currentSearchController = new AbortController();
        const signal = __currentSearchController.signal;

        // não sobrescrever resultados imediatamente — evita piscar ao digitar rápido
        // exibe o indicador "Carregando..." apenas se a requisição demorar
        try { if (__loadingTimeout) clearTimeout(__loadingTimeout); } catch(e){}
        __loadingTimeout = setTimeout(()=>{
            try { results.innerHTML = '<div style="padding:10px;color:#666">Carregando...</div>'; results.style.display = 'block'; } catch(e){}
        }, 300);

        try {
            const url = SEARCH_API_PATH + encodeURIComponent(qq) + '&limit=20';
            const res = await fetch(url, { method: 'GET', signal, credentials: 'include' });
            if (!res.ok) {
                try { if (__loadingTimeout) clearTimeout(__loadingTimeout); } catch(e){}
                results.innerHTML = '<div style="padding:10px;color:#666">Erro ao buscar serviços</div>';
                return;
            }
            const data = await res.json();
            const items = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
            if (!items || items.length === 0) { results.innerHTML = '<div style="padding:10px;color:#666">Nenhum serviço encontrado</div>'; return; }

            // renderizar via DocumentFragment para performance
            const frag = document.createDocumentFragment();
            items.slice(0,20).forEach(it => {
                const div = document.createElement('div');
                div.className = 'resultado-add-item';
                div.setAttribute('data-id', String(it.id));
                div.style.cssText = 'padding:10px;border-bottom:1px solid #f6f6f6;cursor:pointer;';
                const title = document.createElement('div');
                title.style.fontWeight = '400'; title.style.color = '#222';
                title.textContent = it.nome || it.titulo || it.descricao || '';
                const meta = document.createElement('div');
                meta.style.fontSize = '13px'; meta.style.color = '#6b7280'; meta.style.display = 'flex'; meta.style.justifyContent = 'space-between'; meta.style.alignItems = 'center';
                const preco = it.preco || it.venda || it.valor || 0;
                const leftSpan = document.createElement('div');
                leftSpan.style.flex = '1';
                leftSpan.textContent = (it.tipo ? it.tipo + ' • ' : '');
                const priceSpan = document.createElement('div');
                priceSpan.style.fontWeight = '700'; priceSpan.style.color = '#111'; priceSpan.style.marginLeft = '8px';
                priceSpan.textContent = (preco ? ('R$ ' + formatarMoeda(Number(String(preco).replace(',','.')))) : '');
                meta.appendChild(leftSpan); meta.appendChild(priceSpan);
                div.appendChild(title); div.appendChild(meta);
                div.addEventListener('click', function(){
                    input.value = it.nome || it.titulo || '';
                    input.setAttribute('data-selected-id', String(it.id));
                    input.setAttribute('data-selected-valor', String(preco || 0));
                    results.style.display = 'none';
                });
                frag.appendChild(div);
            });
            results.innerHTML = '';
            results.appendChild(frag);
            results.style.display = 'block';
            try { if (__loadingTimeout) clearTimeout(__loadingTimeout); } catch(e){}
        } catch (err) {
            try { if (__loadingTimeout) clearTimeout(__loadingTimeout); } catch(e){}
            if (err.name === 'AbortError') return; // requisição cancelada
            console.warn('Erro na busca de itens:', err);
            results.innerHTML = '<div style="padding:10px;color:#666">Erro ao buscar serviços</div>';
        }
    }

    const deb = (function(){let t; return function(fn,ms){ clearTimeout(t); t=setTimeout(fn,ms||200); }; })();
    // Desativar autocomplete nativo
    try { input.setAttribute('autocomplete','off'); } catch(e){}
    // Lidar com composição (IME) — não buscar durante composição
    let __isComposingLocal = false;
    input.addEventListener('compositionstart', function(){ __isComposingLocal = true; });
    input.addEventListener('compositionend', function(){ __isComposingLocal = false; deb(()=>doSearch(input.value)); });

    // Chamar busca com debounce — ignorar se em composição
    input.addEventListener('input', function(e){
        if (input.hasAttribute('data-selected-id')) { input.removeAttribute('data-selected-id'); input.removeAttribute('data-selected-valor'); }
        if (__isComposingLocal) return;
        deb(()=>doSearch(input.value));
    });

    input.addEventListener('focus', function(){ if(input.value) deb(()=>doSearch(input.value), 0); });

    // Salvar item (permite adicionar múltiplos)
    document.getElementById('btnSalvarItem').addEventListener('click', async function(){
        const selId = input.getAttribute('data-selected-id');
        const nome = input.value.trim();
        const valor = Number(String(input.getAttribute('data-selected-valor')||'0').replace(',','.')) || 0;
        if(!nome || (!selId && nome.length===0)){
            try { if (window.showNotification) { window.showNotification('Por favor, selecione um serviço/produto primeiro', 'error'); } else { alert('Por favor, selecione um serviço/produto primeiro'); } } catch(e){ console.warn('notify failed', e); }
            return;
        }

        // criar objeto de serviço compatível com preencherDadosAgendamento
        const s = { id: selId || Date.now(), nome: nome, quantidade: 1, unitario: valor, valor: valor, total: valor, profissional: (agendamentoAtual && agendamentoAtual.profissional) ? agendamentoAtual.profissional : '-' };
        if(!agendamentoAtual) agendamentoAtual = {};
        if(!Array.isArray(agendamentoAtual._addedServicos)) agendamentoAtual._addedServicos = [];
        agendamentoAtual._addedServicos.push(s);

            // atualizar DOM: anexar item ao final da category-section (imediato)
            appendServiceToCategory(s);
            // marcar como já presente na lista local para evitar re-append até confirmação do servidor
            try {
                if (!Array.isArray(agendamentoAtual.servicos)) agendamentoAtual.servicos = Array.isArray(agendamentoAtual.__existingServicosArray) ? agendamentoAtual.__existingServicosArray.slice() : [];
                // adicionar ao array local imediatamente (mantendo unicidade por id)
                const exists = (agendamentoAtual.servicos || []).some(x => String(x.id) === String(s.id));
                if (!exists) agendamentoAtual.servicos.push(s);
            } catch(e) { console.warn('Erro ao atualizar agendamentoAtual.servicos localmente', e); }

        // recalcular total: soma do total já existente no agendamento (do servidor) + itens adicionados nesta sessão
        let baseTotal = parseFloat(agendamentoAtual.__existingTotal || agendamentoAtual.valor || 0) || 0;
        let addedTotal = 0;
        try {
            addedTotal = (agendamentoAtual._addedServicos||[]).reduce((acc,it)=>{
                const v = parseFloat(String(it.total || it.valor || it.unitario || 0).toString().replace(',','.')) || 0;
                return acc + v;
            }, 0);
        } catch(e){ addedTotal = 0; }
        const newTotal = baseTotal + addedTotal;

        // concatenar nomes: manter nomes já salvos no servidor e acrescentar os novos
        const existingNames = String(agendamentoAtual.__existingServicosString || agendamentoAtual.servico || '').trim();
        const addedNames = (agendamentoAtual._addedServicos||[]).map(x => x.nome).filter(Boolean);
        const nomesConcat = [existingNames].concat(addedNames).filter(Boolean).join(' • ');

        // atualizar totais no DOM imediatamente
        try { document.getElementById('totalGeral').textContent = formatarMoeda(newTotal); document.getElementById('totalPendente').textContent = formatarMoeda(newTotal); const amount = document.querySelector('.amount'); if(amount) amount.textContent = formatarMoeda(newTotal); } catch(e){}

        // Enviar atualização para o backend (PUT) para persistir o novo serviço e novo valor
        try {
            if (agendamentoAtual && agendamentoAtual.id) {
                // Montar array de serviços a ser enviado: pegar array existente do servidor (se houver)
                const existingServicos = Array.isArray(agendamentoAtual.servicos) ? agendamentoAtual.servicos.slice() : (Array.isArray(agendamentoAtual.__existingServicosArray) ? agendamentoAtual.__existingServicosArray.slice() : []);
                const toAdd = Array.isArray(agendamentoAtual._addedServicos) ? agendamentoAtual._addedServicos.slice() : [];
                // concatenar e deduplicar por id (stringified)
                const combined = existingServicos.concat(toAdd || []);
                const seen = new Set();
                const mergedServicos = combined.filter(it => {
                    const id = (it && (it.id !== undefined && it.id !== null)) ? String(it.id) : JSON.stringify(it);
                    if (seen.has(id)) return false;
                    seen.add(id);
                    return true;
                });

                const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ servico: nomesConcat, servicos: mergedServicos, valor: newTotal })
                });
                if (resp.ok) {
                    const updated = await resp.json().catch(()=>null);
                    // atualizar objeto local com o valor retornado
                    if (updated) {
                        agendamentoAtual.valor = updated.valor !== undefined ? updated.valor : newTotal;
                        agendamentoAtual.servico = updated.servico || nomesConcat;
                        agendamentoAtual.servicos = Array.isArray(updated.servicos) ? updated.servicos : mergedServicos;
                        agendamentoAtual.__existingTotal = agendamentoAtual.valor;
                        agendamentoAtual.__existingServicosString = agendamentoAtual.servico;
                        // marcar itens adicionados como persistidos
                        agendamentoAtual._addedServicos = [];
                    } else {
                        agendamentoAtual.valor = newTotal;
                        agendamentoAtual.servico = nomesConcat;
                        agendamentoAtual.servicos = mergedServicos;
                        agendamentoAtual.__existingTotal = agendamentoAtual.valor;
                        agendamentoAtual.__existingServicosString = agendamentoAtual.servico;
                        agendamentoAtual._addedServicos = [];
                    }
                    try { if (window.showNotification) window.showNotification('Item adicionado e salvo', 'success'); } catch(e){}
                } else {
                    const txt = await resp.text().catch(()=>null);
                    try { if (window.showNotification) window.showNotification('Erro ao salvar no servidor', 'error'); else alert('Erro ao salvar no servidor'); } catch(e){}
                    console.warn('PUT /api/agendamentos failed', resp.status, txt);
                }
            } else {
                // sem id do agendamento: apenas manter no frontend
                try { if (window.showNotification) window.showNotification('Item adicionado localmente (sem agendamento salvo)', 'warning'); } catch(e){}
            }
        } catch(err){
            console.error('Erro salvando item no backend', err);
            try { if (window.showNotification) window.showNotification('Erro ao salvar no servidor', 'error'); else alert('Erro ao salvar no servidor'); } catch(e){}
        }

        // limpar input para permitir adicionar outro
        input.value = '';
        input.removeAttribute('data-selected-id');
        input.removeAttribute('data-selected-valor');
        input.focus();
    });

    document.getElementById('btnFecharItem').addEventListener('click', closeModal);
    document.getElementById('fecharModalAdicionarItem').addEventListener('click', closeModal);

    function closeModal(){ try{ overlay.remove(); }catch(e){} }
}

function appendServiceToCategory(s){
        try {
                // elemento de categoria onde os itens são renderizados
                const category = document.querySelector('.category-section');
                if (!category) return;

                // montar dados do serviço recebido
                const horario = s.horario || s.time || '';
                const data = s.data || '';
                const nome = s.nome || s.nomeServico || '';
                const profissional = s.profissional || '';
                const qtd = s.quantidade || 1;
                const unitario = parseFloat(s.unitario || s.valor || 0) || 0;
                const total = parseFloat(s.total || unitario * qtd) || unitario * qtd;

                const item = document.createElement('div');
                item.className = 'service-item';
                item.innerHTML = `
                        <div class="col-horario">
                            <i class="fas fa-clock"></i>
                            <div class="time-info">
                                <span class="time">${escapeHtmlUnsafe(horario)}</span>
                                <small class="date">${escapeHtmlUnsafe(data)}</small>
                            </div>
                        </div>
                        <div class="col-descricao">
                            <div class="service-name">${escapeHtmlUnsafe(nome)}</div>
                        </div>
                        <div class="col-profissional">${escapeHtmlUnsafe(profissional)}</div>
                        <div class="col-qtd">${escapeHtmlUnsafe(qtd)}</div>
                        <div class="col-unitario">${formatarMoeda(unitario)}</div>
                        <div class="col-desconto">-</div>
                        <div class="col-total">${formatarMoeda(total)}</div>
                        <div class="col-acoes">
                            <button class="btn-item-action" title="Mais opções"><i class="fas fa-ellipsis-v"></i></button>
                        </div>
                `;

                category.appendChild(item);

                // rolar até o novo item (se a área for scrollável)
                try {
                        const scrollParent = getScrollParent(category);
                        if (scrollParent && typeof item.scrollIntoView === 'function') item.scrollIntoView({ behavior: 'smooth', block: 'end' });
                } catch (e) { /* ignore */ }
        } catch(e){ console.warn('appendServiceToCategory error', e); }
}

    // Cria/retorna o menu de ações usado por cada item (singleton)
    function getServiceItemMenu(){
        let menu = document.getElementById('serviceItemActionsMenu');
        if (menu) return menu;
        menu = document.createElement('div');
        menu.id = 'serviceItemActionsMenu';
        menu.style.cssText = 'position:absolute;z-index:1400000;background:white;border:1px solid #e6e9ee;border-radius:8px;box-shadow:0 10px 30px rgba(2,16,26,0.08);min-width:140px;padding:6px;';
        menu.innerHTML = `
            <div class="sia-row" data-action="edit" style="padding:8px 10px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;">✎ <span>Editar</span></div>
            <div class="sia-row" data-action="delete" style="padding:8px 10px;cursor:pointer;border-radius:6px;display:flex;align-items:center;gap:8px;">✖ <span>Excluir</span></div>
        `;
        document.body.appendChild(menu);

        // listener global para cliques nas opções
        menu.addEventListener('click', async function(e){
            const row = e.target.closest('.sia-row');
            if (!row) return;
            const action = row.getAttribute('data-action');
            const targetFor = menu.getAttribute('data-for');
            const itemEl = targetFor ? document.querySelector(`[data-service-id="${targetFor}"]`) : null;
            if (action === 'delete') {
                if (!itemEl) { hideServiceItemMenu(); return; }
                // confirmar via modal estilizado
                try {
                    const confirmed = await showConfirmModal('Deseja remover este item do agendamento?');
                    if (!confirmed) { hideServiceItemMenu(); return; }
                } catch(e){ hideServiceItemMenu(); return; }
                // encontrar índice no agendamentoAtual.servicos e remover
                try {
                    const sid = itemEl.dataset.serviceId;
                    if (Array.isArray(agendamentoAtual.servicos)) {
                        agendamentoAtual.servicos = agendamentoAtual.servicos.filter(x => String(x.id) !== String(sid));
                    }
                    // remover visualmente
                    itemEl.remove();
                    // recalcular totals
                    recalcAndPersistServicos();
                } catch(e){ console.warn('Erro ao excluir item', e); }
                hideServiceItemMenu();
            } else if (action === 'edit') {
                hideServiceItemMenu();
                if (!itemEl) return;
                // abrir modal de edição rico
                openEditServiceModal(itemEl);
            }
        });

        // fechar ao clicar fora
        document.addEventListener('click', function(ev){ if (!menu.contains(ev.target) && !ev.target.closest('.btn-item-action')) hideServiceItemMenu(); });

        return menu;
    }

    function hideServiceItemMenu(){
        const m = document.getElementById('serviceItemActionsMenu'); if (m) m.style.display = 'none';
    }

    function openServiceItemMenu(buttonEl, itemEl){
        try {
            const menu = getServiceItemMenu();
            // marcar para qual item está aberto (usar id)
            const sid = itemEl.dataset.serviceId || '';
            menu.setAttribute('data-for', sid);
            // posicionar próximo ao botão
            const rect = buttonEl.getBoundingClientRect();
            const left = rect.right + window.scrollX - menu.offsetWidth;
            const top = rect.bottom + window.scrollY + 8;
            menu.style.left = (left > 8 ? left : rect.left + window.scrollX) + 'px';
            menu.style.top = top + 'px';
            menu.style.display = 'block';
        } catch(e){ console.warn('openServiceItemMenu error', e); }
    }

    // Recalcula total e envia PUT para persistir `servicos` e `servico` concatenado
    async function recalcAndPersistServicos(){
        try {
            const arr = Array.isArray(agendamentoAtual.servicos) ? agendamentoAtual.servicos : [];
            const total = arr.reduce((acc,it)=>{ const v = parseFloat(String(it.total || it.valor || it.unitario || 0).toString().replace(',','.'))||0; return acc+v; }, 0);
            const names = arr.map(s => s && (s.nome||s.name||s.nomeServico) ? (s.nome||s.name||s.nomeServico) : '').filter(Boolean).join(' • ');
            // atualizar DOM dos totais
            try { document.getElementById('totalGeral').textContent = formatarMoeda(total); document.getElementById('totalPendente').textContent = formatarMoeda(total); const amount = document.querySelector('.amount'); if(amount) amount.textContent = formatarMoeda(total); } catch(e){}

            // enviar atualização para API
            if (agendamentoAtual && agendamentoAtual.id) {
                // log payload para debug
                try { console.log('PUT /api/agendamentos/' + agendamentoAtual.id + ' payload:', { servicosCount: arr.length, servicos: arr, servico: names, valor: total }); } catch(e){}
                const resp = await fetch(`/api/agendamentos/${agendamentoAtual.id}`, {
                    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ servicos: arr, servico: names, valor: total })
                });
                if (resp.ok) {
                    const updated = await resp.json().catch(()=>null);
                    if (updated) {
                        agendamentoAtual.servicos = Array.isArray(updated.servicos) ? updated.servicos : arr;
                        agendamentoAtual.servico = updated.servico || names;
                        agendamentoAtual.valor = updated.valor !== undefined ? updated.valor : total;
                    }
                } else {
                        const txt = await resp.text().catch(()=>null);
                        console.warn('recall persist failed', resp.status, txt);
                }
            }
        } catch(e){ console.warn('recalcAndPersistServicos error', e); }
    }

// Função para adicionar item (placeholder)
function adicionarItem() {
    console.log('🔧 Função adicionar item será implementada');
    alert('Função de adicionar item será implementada em breve!');
}

// Função para encontrar o elemento scrollável pai
function getScrollParent(element) {
    if (!element) return document.documentElement;
    
    const overflowY = window.getComputedStyle(element).overflowY;
    const isScrollable = overflowY !== 'visible' && overflowY !== 'hidden';
    
    if (isScrollable && element.scrollHeight >= element.clientHeight) {
        return element;
    }
    
    return getScrollParent(element.parentElement) || document.documentElement;
}

// Setup do dropdown de status
function setupStatusDropdown() {
    const removeMenu = () => {
        document.querySelectorAll('.status-menu').forEach(m => m.remove());
        try { window._openStatusMenuForDetails = null; } catch(e){}
    };

    if (typeof window._openStatusMenuForDetails === 'undefined') {
        window._openStatusMenuForDetails = null;
    }

    // Listener para o badge de status
    const statusBadge = document.querySelector('.status-badge');
    if (!statusBadge) return;

    // Remover listener anterior se existir
    if (statusBadge._detailsStatusHandler) {
        statusBadge.removeEventListener('click', statusBadge._detailsStatusHandler);
    }
    if (statusBadge._detailsStatusKeyHandler) {
        statusBadge.removeEventListener('keydown', statusBadge._detailsStatusKeyHandler);
    }

    const handler = (e) => {
        e.stopPropagation();
        e.preventDefault();

        // Toggle: fechar se já estiver aberto
        if (window._openStatusMenuForDetails) {
            removeMenu();
            return;
        }

        // Remover menus existentes
        removeMenu();

        const agendamentoId = agendamentoAtual?.id;
        if (!agendamentoId) return;

        console.log('[StatusMenu][detalhes] Abrindo menu para agendamento', agendamentoId);

        const menu = document.createElement('div');
        menu.className = 'status-menu';
        menu.style.position = 'absolute';
        menu.style.zIndex = '99999';
        menu.style.visibility = 'hidden';
        window._openStatusMenuForDetails = true;

        const options = [
            { label: 'Agendado', value: 'agendado', dot: '#6c757d' },
            { label: 'Check-in', value: 'checkin', dot: '#1e88e5' },
            { label: 'Pronto', value: 'pronto', dot: '#7b1fa2' },
            { label: 'Check-out', value: 'concluido', dot: '#2e7d32' },
            { label: 'Cancelado', value: 'cancelado', dot: '#c12b2b' }
        ];

        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'item';
            item.innerHTML = `<span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${opt.dot};margin-right:8px;vertical-align:middle;"></span> ${opt.label}`;
            item.addEventListener('click', async (ev) => {
                ev.stopPropagation();
                try {
                    const res = await fetch(`/api/agendamentos/${agendamentoId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: opt.value }),
                        credentials: 'include'
                    });

                    if (!res.ok) {
                        const err = await res.json().catch(()=>({ error: 'Erro' }));
                        alert(err.error || 'Erro ao atualizar status');
                        removeMenu();
                        return;
                    }

                    // Atualizar o select (oculto) para manter compatibilidade
                    const statusSelectEl = document.getElementById('statusSelect');
                    if (statusSelectEl) statusSelectEl.value = opt.value;

                    // Atualizar o badge visível
                    statusBadge.textContent = opt.label;
                    statusBadge.className = `status-badge status-${opt.value}`;

                    // Atualizar agendamentoAtual
                    if (agendamentoAtual) {
                        agendamentoAtual.status = opt.value;
                    }

                    // Atualizar classes/estilos locais imediatamente
                    try { if (statusSelectEl) atualizarClasseStatus(statusSelectEl); } catch(e){console.warn('falha atualizarClasseStatus', e);} 
                    try { atualizarLinhaListaStatus(agendamentoId, opt.value); } catch(e){/* pode não existir na página */}
                    try { updateServiceIcons(opt.value); } catch(e){console.warn('falha updateServiceIcons', e);} 

                    console.log('✅ Status atualizado com sucesso');
                } catch (error) {
                    console.error('Erro ao atualizar status:', error);
                    alert('Erro ao atualizar status');
                } finally {
                    removeMenu();
                }
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);
        const rect = statusBadge.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        let left = rect.left + scrollX;
        let top = rect.bottom + scrollY + 6;
        
        // Obter dimensões do menu
        menu.style.visibility = 'hidden';
        menu.style.display = 'block';
        const menuHeight = menu.offsetHeight;
        const menuWidth = menu.offsetWidth;
        
        // Verificar espaço disponível abaixo e acima
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Se não houver espaço embaixo mas houver em cima, abrir para cima
        if (spaceBelow < menuHeight + 20 && spaceAbove > menuHeight + 20) {
            top = rect.top + scrollY - menuHeight - 6;
            console.log('📜 Menu aberto para CIMA');
        }
        
        // Ajustar posição horizontal se sair da tela
        const viewportWidth = document.documentElement.clientWidth;
        if (left + menuWidth > viewportWidth - 8) {
            left = Math.max(8, viewportWidth - menuWidth - 8);
        }
        
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = 'visible';

        const onDocClick = (ev2) => {
            if (!menu.contains(ev2.target) && ev2.target !== statusBadge) {
                removeMenu();
                document.removeEventListener('click', onDocClick);
            }
        };
        document.addEventListener('click', onDocClick);
        
        const closeOnScroll = () => {
            removeMenu();
            window.removeEventListener('scroll', closeOnScroll, true);
            window.removeEventListener('resize', closeOnScroll);
        };
        window.addEventListener('scroll', closeOnScroll, true);
        window.addEventListener('resize', closeOnScroll);
    };

    statusBadge._detailsStatusHandler = handler;
    statusBadge.addEventListener('click', handler);
    // abrir via teclado (Enter / Space)
    const keyHandler = function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(e); } };
    statusBadge._detailsStatusKeyHandler = keyHandler;
    statusBadge.addEventListener('keydown', keyHandler);
    
    console.log('✅ Dropdown de status configurado');
}

// Escuta atualizações de status vindas de outras abas/janelas e atualiza a view de detalhes
function listenForExternalStatusUpdates() {
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            const bc = new BroadcastChannel('agendamentos_channel');
            bc.onmessage = (ev) => {
                try {
                    const data = ev.data;
                    if (!data || data.type !== 'status-updated') return;
                    if (!agendamentoAtual || String(agendamentoAtual.id) !== String(data.id)) return;
                    // Aplicar novo status localmente
                    const novo = String(data.status || '').toLowerCase();
                    const statusSelect = document.getElementById('statusSelect');
                    const statusBadge = document.querySelector('.status-badge');
                    if (statusSelect) statusSelect.value = novo;
                    if (statusBadge) {
                        const classMap = { 'checkin': 'check-in', 'checkout': 'check-out', 'concluido': 'check-out' };
                        const statusClass = classMap[novo] || novo.replace(/[^a-z0-9]+/g, '-');
                        const labelMap = { agendado: 'Agendado', 'check-in': 'Check-in', pronto: 'Pronto', 'check-out': 'Check-out', cancelado: 'Cancelado' };
                        statusBadge.className = `status-badge status-${statusClass}`;
                        statusBadge.textContent = labelMap[statusClass] || data.status;
                    }
                    // atualizar objeto atual e ícones
                    if (agendamentoAtual) agendamentoAtual.status = novo;
                    try { updateServiceIcons(novo); } catch(e){}
                    console.log('[agendamento-detalhes] status atualizado via BroadcastChannel:', novo);
                } catch (e) { console.warn('Erro no listener BroadcastChannel (detalhes):', e); }
            };
        }
    } catch (e) { console.warn('BroadcastChannel não disponível (detalhes):', e); }

    // Fallback via postMessage
    try {
        window.addEventListener('message', function(ev) {
            try {
                const data = ev.data;
                if (!data || data.type !== 'status-updated') return;
                if (!agendamentoAtual || String(agendamentoAtual.id) !== String(data.id)) return;
                const novo = String(data.status || '').toLowerCase();
                const statusSelect = document.getElementById('statusSelect');
                const statusBadge = document.querySelector('.status-badge');
                if (statusSelect) statusSelect.value = novo;
                if (statusBadge) {
                    const classMap = { 'checkin': 'check-in', 'checkout': 'check-out', 'concluido': 'check-out' };
                    const statusClass = classMap[novo] || novo.replace(/[^a-z0-9]+/g, '-');
                    const labelMap = { agendado: 'Agendado', 'check-in': 'Check-in', pronto: 'Pronto', 'check-out': 'Check-out', cancelado: 'Cancelado' };
                    statusBadge.className = `status-badge status-${statusClass}`;
                    statusBadge.textContent = labelMap[statusClass] || data.status;
                }
                if (agendamentoAtual) agendamentoAtual.status = novo;
                try { updateServiceIcons(novo); } catch(e){}
                console.log('[agendamento-detalhes] status atualizado via postMessage:', novo);
            } catch (e) { /* ignore */ }
        });
    } catch (e) { /* ignore */ }
}

// Event Listeners - configuração inicial
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Inicializando página de detalhes do agendamento...');
    
    // Carrega os dados do agendamento
    carregarAgendamento();
    
    // Configura listener para mudança de status
    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect) {
        statusSelect.addEventListener('change', function() {
            atualizarClasseStatus(this);
            salvarStatus();
        });
    }

    // Escutar atualizações externas de status
    try { listenForExternalStatusUpdates(); } catch(e){ console.warn('Não foi possível ativar listener externo de status', e); }

    // Recarregar dados ao voltar ao foco/visibilidade (garante estado atual quando BroadcastChannel falhar)
    try {
        window.addEventListener('focus', () => { try { carregarAgendamento(); } catch(e){} });
        document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { try { carregarAgendamento(); } catch(e){} } });
    } catch(e) { console.warn('Não foi possível configurar listeners de foco/visibilidade', e); }
    
    // Configura listener para observações com debounce
    const observacoesText = document.getElementById('observacoes');
    if (observacoesText) {
        let timeoutObservacoes;
        observacoesText.addEventListener('input', function() {
            clearTimeout(timeoutObservacoes);
            timeoutObservacoes = setTimeout(salvarObservacoes, 1500); // Salva após 1.5s sem digitação
        });
        // Salvar também ao sair do campo
        observacoesText.addEventListener('blur', function() {
            clearTimeout(timeoutObservacoes);
            salvarObservacoes();
        });
    }

    // Botão Editar -> abrir modal de novo atendimento com dados preenchidos
    try {
        const btnEditar = document.querySelector('.btn-editar');
        if (btnEditar) {
            btnEditar.addEventListener('click', async function () {
                try {
                    const id = (agendamentoAtual && agendamentoAtual.id) || this.getAttribute('data-agendamento-id') || (new URLSearchParams(window.location.search).get('id'));
                    if (!id) return showNotification('ID do agendamento não encontrado', 'error');

                    // Buscar agendamento na API
                    const resp = await fetch(`/api/agendamentos/${id}`, { credentials: 'include' });
                    if (!resp.ok) return showNotification('Erro ao buscar agendamento', 'error');
                    const ag = await resp.json();

                    // Abrir modal global de novo agendamento
                    try { abrirNovoAgendamentoModal(); } catch(e) { console.warn('abrirNovoAgendamentoModal não disponível', e); }
                    
                    // Definir ID de edição
                    window.agendamentoEmEdicaoId = ag.id;
                    
                    // Ocultar botão "Salvar e Ir" no modo de edição
                    setTimeout(() => {
                        const btnSalvarEIr = document.getElementById('salvarEIr');
                        if (btnSalvarEIr) {
                            btnSalvarEIr.style.display = 'none';
                        }
                    }, 50);

                    // Aguarda o modal ser criado no DOM
                    setTimeout(() => {
                        try {
                            // Preencher campos básicos
                            const petInput = document.getElementById('petClienteGlobal');
                            if (petInput) {
                                petInput.value = ag.petNome || '';
                                if (ag.petId) {
                                    petInput.setAttribute('data-selected-pet-id', String(ag.petId));
                                    petInput.dataset.selectedPetId = String(ag.petId);
                                }
                            }

                            const dataInput = document.getElementById('dataGlobal');
                            if (dataInput) {
                                // Converter data para formato brasileiro DD/MM/YYYY
                                if (ag.dataAgendamento) {
                                    // Pegar apenas a parte da data (YYYY-MM-DD)
                                    const dataStr = ag.dataAgendamento.split('T')[0];
                                    const [ano, mes, dia] = dataStr.split('-');
                                    // Formato brasileiro: DD/MM/YYYY
                                    dataInput.value = `${dia}/${mes}/${ano}`;
                                } else {
                                    dataInput.value = '';
                                }
                            }

                            const horaInput = document.getElementById('horaGlobal');
                            if (horaInput) horaInput.value = ag.horario || '';

                            // Profissional - usar o input visível e remover placeholder
                            const profInput = document.getElementById('profissionalGlobalInput');
                            if (profInput) {
                                profInput.value = ag.profissional || '';
                                if (ag.profissional) {
                                    profInput.placeholder = '';
                                }
                            }
                            const profHidden = document.getElementById('profissionalGlobalId');
                            if (profHidden && ag.profissionalId) profHidden.value = ag.profissionalId;

                            const obs = document.getElementById('observacoesGlobal');
                            if (obs) obs.value = ag.observacoes || '';

                            // Preencher serviços (se existirem)
                            try {
                                const listaContainer = document.getElementById('listaServicos');
                                const servicosContainer = document.getElementById('servicosAdicionados');
                                const valorTotalElement = document.getElementById('valorTotal');
                                const servs = ag.servicos || [];
                                window.servicosAdicionados = servs.map(s => ({
                                    id: s.id || s.nome,
                                    nome: s.nome || s.description || '',
                                    valor: parseFloat(s.total || s.valor || s.unitario || 0) || 0,
                                    quantidade: parseFloat(s.quantidade) || 1,
                                    unitario: parseFloat(s.unitario || s.valor || 0) || 0,
                                    desconto: parseFloat(s.desconto) || 0
                                }));

                                if (window.servicosAdicionados.length === 0) {
                                    if (listaContainer) listaContainer.style.display = 'none';
                                } else {
                                    // Usar a função global de renderização se disponível
                                    if (typeof window.renderizarListaServicosGlobal === 'function') {
                                        window.renderizarListaServicosGlobal();
                                    } else {
                                        // Fallback: renderização inline
                                        if (listaContainer) listaContainer.style.display = 'block';
                                        if (servicosContainer && valorTotalElement) {
                                            // Calcular valor do serviço
                                            const calcValor = (s) => {
                                                const qtd = parseFloat(s.quantidade) || 1;
                                                const unit = parseFloat(s.unitario) || parseFloat(s.valor) || 0;
                                                const desc = parseFloat(s.desconto) || 0;
                                                const sub = qtd * unit;
                                                return sub - (sub * (desc / 100));
                                            };
                                            
                                            servicosContainer.innerHTML = window.servicosAdicionados.map((servico, index) => {
                                                const valorCalc = calcValor(servico);
                                                return `\
                                                <div style="background: white; border-radius: 6px; margin-bottom: 12px; padding: 12px; border: 1px solid #e0e0e0;">\
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">\
                                                        <span style="flex: 1; color: #333; font-weight: 600;">${servico.nome}</span>\
                                                        <button type="button" onclick="window.removerServicoGlobal('${servico.id}')" style="background: #dc3545; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">\
                                                            <i class="fas fa-times"></i>\
                                                        </button>\
                                                    </div>\
                                                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px;">\
                                                        <div>\
                                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Qtd. *</label>\
                                                            <input type="number" min="0.001" step="0.001" value="${servico.quantidade || 1}" \
                                                                onchange="window.atualizarServicoGlobal(${index}, 'quantidade', parseFloat(this.value) || 1)"\
                                                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                                                        </div>\
                                                        <div>\
                                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">Unitário *</label>\
                                                            <input type="number" min="0" step="0.01" value="${(servico.unitario || servico.valor || 0).toFixed(2)}" \
                                                                onchange="window.atualizarServicoGlobal(${index}, 'unitario', parseFloat(this.value) || 0)"\
                                                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                                                        </div>\
                                                        <div>\
                                                            <label style="display: block; font-size: 11px; color: #666; margin-bottom: 4px;">% Desconto</label>\
                                                            <input type="number" min="0" max="100" step="0.0001" value="${(servico.desconto || 0).toFixed(4)}" \
                                                                onchange="window.atualizarServicoGlobal(${index}, 'desconto', parseFloat(this.value) || 0)"\
                                                                style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">\
                                                        </div>\
                                                    </div>\
                                                    <div style="text-align: right; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f0f0f0;">\
                                                        <span style="color: #666; font-size: 12px;">Subtotal: </span>\
                                                        <span style="color: #28a745; font-weight: 600; font-size: 14px;">R$ ${valorCalc.toFixed(2).replace('.', ',')}</span>\
                                                    </div>\
                                                </div>`;
                                            }).join('');
                                            
                                            const total = window.servicosAdicionados.reduce((acc, s) => acc + calcValor(s), 0);
                                            valorTotalElement.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
                                        }
                                    }
                                }
                            } catch (e) { console.warn('Erro ao preencher serviços no modal', e); }

                        } catch (e) { console.error('Erro ao preencher modal de edição', e); }
                    }, 120);

                } catch (e) {
                    console.error('Erro ao abrir edição:', e);
                    showNotification('Erro ao abrir edição do agendamento', 'error');
                }
            });
        }
    } catch (e) { console.warn('Não foi possível vincular botão editar', e); }
    
    // Configura a primeira aba como ativa
    setTimeout(() => {
        alternarAba('detalhes');
    }, 100);
    
    // Carregar dados do agendamento atual
    carregarDadosAgendamento();
    
    // Configurar dropdown de status
    setTimeout(() => {
        setupStatusDropdown();
    }, 300);

    // Configurar botão + Item para abrir modal de adicionar item
    const btnAddItem = document.querySelector('.btn-add-item');
    if (btnAddItem) {
        btnAddItem.addEventListener('click', function(e){
            e.preventDefault(); e.stopPropagation();
            openAddItemModal();
        });
    }

    // Configurar botão + Imprimir para gerar comprovante em PDF
    const btnImprimirComprovante = document.querySelector('.btn-imprimir-comprovante');
    console.log('🔍 Botão Imprimir Comprovante encontrado:', !!btnImprimirComprovante);
    if (btnImprimirComprovante) {
        btnImprimirComprovante.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('🖱️ Botão Imprimir clicado!');
            try {
                const agendamentoId = new URLSearchParams(window.location.search).get('id');
                console.log('📋 Agendamento ID:', agendamentoId);
                if (!agendamentoId) {
                    return showNotification('ID do agendamento não encontrado', 'error');
                }

                showNotification('Gerando comprovante...', 'info');

                // Gerar PDF via API
                const response = await fetch(`/api/agendamentos/${agendamentoId}/comprovante`, {
                    credentials: 'include'
                });

                console.log('📡 Response status:', response.status);

                if (!response.ok) {
                    throw new Error('Erro ao gerar comprovante');
                }

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                console.log('📄 PDF gerado, abrindo modal...');
                openPdfModal(blobUrl, 'Comprovante de atendimento');
            } catch (error) {
                console.error('❌ Erro ao gerar comprovante:', error);
                showNotification('Erro ao gerar comprovante', 'error');
            }
        });
    } else {
        console.warn('⚠️ Botão .btn-imprimir-comprovante não encontrado no DOM');
    }

    // Configurar botão Importar (lateral direita) - manter funcionalidade original se houver
    const btnImport = document.querySelector('.btn-import');
    if (btnImport) {
        btnImport.addEventListener('click', function(e) {
            e.preventDefault();
            showNotification('Função de importação será implementada em breve', 'info');
        });
    }

    // Delegation: abrir menu de ações do item (Editar / Excluir)
    document.addEventListener('click', function(event){
        const btn = event.target.closest('.btn-item-action');
        if (!btn) return;
        event.stopPropagation();
        // localizar a service-item pai
        const itemEl = btn.closest('.service-item');
        if (!itemEl) return;
        openServiceItemMenu(btn, itemEl);
    });
    
    console.log('✅ Página de detalhes do agendamento inicializada');
});

// Função para carregar dados do agendamento atual
function carregarDadosAgendamento() {
    try {
        // Recuperar dados do localStorage
        const agendamentoData = localStorage.getItem('agendamento_atual');
        
        if (agendamentoData) {
            const agendamento = JSON.parse(agendamentoData);
            console.log('📋 Carregando dados do agendamento:', agendamento);
            
            // Atualizar título do atendimento
            const titulo = document.getElementById('atendimentoTitulo');
            if (titulo) {
                titulo.textContent = `Atendimento ${agendamento.id}`;
            }
            
            // Atualizar dados do pet
            const petNome = document.getElementById('petNome');
            if (petNome) {
                petNome.textContent = agendamento.petNome || 'Pet não informado';
            }
            
            // Atualizar nome do cliente
            const clienteNome = document.getElementById('clienteNome');
            if (clienteNome) {
                clienteNome.textContent = agendamento.clienteNome || 'Cliente não informado';
            }
            
            // Atualizar horário no card
            const horarioElement = document.querySelector('.info-row .info-value');
            if (horarioElement) {
                horarioElement.textContent = agendamento.horario || 'Não informado';
            }
            
            // Atualizar profissional
            const profissionalElement = document.querySelector('.info-row:nth-child(2) .info-value');
            if (profissionalElement) {
                profissionalElement.textContent = agendamento.profissional || 'Não informado';
            }
            
            // Atualizar serviço na tabela
            const servicoElement = document.querySelector('.service-item .service-details .service-name');
            if (servicoElement) {
                servicoElement.textContent = agendamento.servico || 'Serviço não informado';
            }
            
            // Atualizar valor na tabela
            const valorElement = document.querySelector('.service-item .service-details .service-price');
            if (valorElement) {
                const valor = agendamento.valor || 0;
                valorElement.textContent = formatCurrencyBR(valor);
            }
            
            // Atualizar totais
            const subtotalElement = document.getElementById('subtotal');
            const totalElement = document.getElementById('total');
            if (subtotalElement && totalElement) {
                const valor = agendamento.valor || 0;
                subtotalElement.textContent = formatCurrencyBR(valor);
                totalElement.textContent = formatCurrencyBR(valor);
            }
            
            // Atualizar status do agendamento (badge visível) e sincronizar select oculto
            const statusElement = document.querySelector('.status-badge');
            const statusSelectEl = document.getElementById('statusSelect');
            if (statusElement && agendamento.status) {
                statusElement.className = `status-badge status-${agendamento.status}`;
                statusElement.textContent = agendamento.statusTexto || agendamento.status;
                if (statusSelectEl) statusSelectEl.value = agendamento.status;
            }
            
            console.log('✅ Dados do agendamento carregados com sucesso');
        } else {
            console.log('⚠️ Nenhum agendamento encontrado no localStorage');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar dados do agendamento:', error);
    }
}

// Função auxiliar para formatar moeda (caso não exista)
function formatCurrencyBR(value) {
    if (typeof value !== 'number') {
        value = parseFloat(value) || 0;
    }
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

// Função para voltar à lista de agendamentos
function voltarParaLista() {
    window.location.href = 'agendamentos-novo.html';
}

// Função para abrir modal de PDF
function openPdfModal(blobUrl, title = 'Comprovante de atendimento') {
    // evitar duplicados
    if (document.getElementById('pdfModalOverlay')) return;

    // inserir estilos se necessário
    if (!document.getElementById('pdfModalStyles')) {
        const style = document.createElement('style');
        style.id = 'pdfModalStyles';
        style.innerHTML = `
            .pdf-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:14000}
            .pdf-modal{width:92%;max-width:1150px;height:86%;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(2,6,23,0.45);overflow:hidden;display:flex;flex-direction:column}
            .pdf-modal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #e6e9ee;background:#f7f7f8}
            .pdf-modal-title{font-weight:600;color:#222}
            .pdf-modal-toolbar{display:flex;gap:8px;align-items:center}
            .pdf-modal-iframe{flex:1;border:0;width:100%;height:100%}
            .pdf-modal-actions a, .pdf-modal-actions button{background:transparent;border:0;color:#1f2937;padding:6px 10px;border-radius:6px;cursor:pointer}
            .pdf-modal-close{background:#fff;border:1px solid #ddd;padding:6px 10px;border-radius:6px}
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'pdfModalOverlay';
    overlay.className = 'pdf-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'pdf-modal';

    const header = document.createElement('div');
    header.className = 'pdf-modal-header';
    const hTitle = document.createElement('div');
    hTitle.className = 'pdf-modal-title';
    hTitle.textContent = title;

    const toolbar = document.createElement('div');
    toolbar.className = 'pdf-modal-toolbar pdf-modal-actions';

    const viewBtn = document.createElement('a');
    viewBtn.href = '#';
    viewBtn.textContent = 'Ver em uma nova aba';
    viewBtn.onclick = function(ev){ ev.preventDefault(); window.open(blobUrl, '_blank'); };

    const closeBtn = document.createElement('button');
    closeBtn.className = 'pdf-modal-close';
    closeBtn.textContent = '✕ Fechar';
    closeBtn.onclick = function() { overlay.remove(); };

    toolbar.appendChild(viewBtn);
    toolbar.appendChild(closeBtn);

    header.appendChild(hTitle);
    header.appendChild(toolbar);

    const iframe = document.createElement('iframe');
    iframe.className = 'pdf-modal-iframe';
    iframe.src = blobUrl;

    modal.appendChild(header);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Fechar ao clicar fora do modal
    overlay.onclick = function(e) {
        if (e.target === overlay) overlay.remove();
    };
}

// Inicializar handlers de botões da sidebar direita
document.addEventListener('DOMContentLoaded', function() {
    try {
        const btnCheckout = document.querySelector('.btn-checkout');
        if (btnCheckout) {
            try { btnCheckout.removeEventListener('click', finalizarCobranca); } catch(e){}
            btnCheckout.addEventListener('click', function(ev){ ev.preventDefault(); try { finalizarCobranca(); } catch(e){ console.error('Erro ao chamar finalizarCobranca via botão', e); } });
            console.log('✔️ Handler de checkout registrado');
        } else {
            console.log('ℹ️ Botão .btn-checkout não encontrado no DOM ao inicializar.');
        }
    } catch (e) { console.warn('Erro registrando handlers da sidebar:', e); }
});
