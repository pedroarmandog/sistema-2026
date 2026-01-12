// =============================================
// SISTEMA GLOBAL DE NOVO ATENDIMENTO
// Funciona em todas as páginas do sistema
// =============================================

console.log('🌐 Sistema Global de Novo Atendimento carregado!');

// =============================================
// FUNÇÃO GLOBAL: Novo Atendimento
// =============================================
function novoAtendimento() {
    console.log('🎯 Novo Atendimento chamado - Página atual:', window.location.pathname);
    
    // Verificar se estamos na página de agendamentos
    const paginaAtual = window.location.pathname;
    const isAgendamentos = paginaAtual.includes('agendamentos-novo.html') || 
                          paginaAtual.includes('agendamentos.html');
    
    if (isAgendamentos) {
        // Se já estamos na página de agendamentos, abrir o modal diretamente
        console.log('✅ Já na página de agendamentos - abrindo modal...');
        abrirNovoAgendamentoModal();
    } else {
        // Se estamos em outra página, redirecionar
        console.log('🔄 Redirecionando para página de agendamentos...');
        
        // Salvar flag para abrir modal após redirecionamento
        sessionStorage.setItem('abrirNovoAgendamento', 'true');
        
        // Redirecionar para agendamentos
        window.location.href = 'agendamentos-novo.html';
    }
}

// =============================================
// FUNÇÃO: Abrir Modal de Novo Agendamento
// =============================================
function abrirNovoAgendamentoModal() {
    console.log('🚀 Abrindo modal de Novo Agendamento...');
    
    // REMOVER MODAL ANTERIOR SE EXISTIR
    const modalAnterior = document.getElementById('novoSidebarFuncional');
    if (modalAnterior) {
        modalAnterior.remove();
    }
    
    const overlayAnterior = document.getElementById('novoOverlayFuncional');
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
    // CRIAR OVERLAY NOVO
    const novoOverlay = document.createElement('div');
    novoOverlay.id = 'novoOverlayFuncional';
    novoOverlay.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background: rgba(0,0,0,0) !important;
        z-index: 999998 !important;
        opacity: 0 !important;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    `;
    
    // CRIAR MODAL NOVO COMPLETAMENTE
    const novoModal = document.createElement('div');
    novoModal.id = 'novoSidebarFuncional';
    novoModal.innerHTML = `
        <div style="background: #2c5aa0; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 10px 10px 0 0;">
            <h3 style="margin: 0; font-size: 20px;">
                <i class="fas fa-calendar-plus"></i> Novo Agendamento
            </h3>
            <button id="fecharNovoModal" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 30px; max-height: 70vh; overflow-y: auto;">
            <form id="formNovoAgendamento" autocomplete="off">
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; transition: color 0.2s ease;">Pet/Cliente *</label>
                    <input type="text" name="petClienteGlobal_input" autocomplete="off" id="petClienteGlobal" placeholder="Digite o nome do pet ou cliente..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;" 
                        onfocus="this.style.borderColor='#2c5aa0'; this.style.boxShadow='0 0 0 3px rgba(44, 90, 160, 0.1)'; this.style.transform='translateY(-1px)'"
                        onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'" required>
                </div>
                
                <div style="margin-bottom: 20px; position: relative;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333; transition: color 0.2s ease;">Serviço/Produto *</label>
                    <input type="text" id="servicoGlobal" autocomplete="off" placeholder="Digite o serviço ou produto..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;" 
                        onfocus="this.style.borderColor='#2c5aa0'; this.style.boxShadow='0 0 0 3px rgba(44, 90, 160, 0.1)'; this.style.transform='translateY(-1px)'"
                        onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'" required>
                    <!-- Container para resultados (será preenchido dinamicamente) -->
                    <div id="resultados-servico-global" style="position: absolute; left: 0; right: 0; top: calc(100% + 6px); background: white; border: 1px solid #e0e0e0; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-height: 240px; overflow: auto; border-radius: 6px; display: none; z-index: 1000002;"></div>
                </div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                    <div style="flex: 1; position: relative;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Data</label>
                        <input type="text" id="dataGlobal" placeholder="Selecione uma data" readonly style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none; background: white;" 
                            onclick="toggleCalendario()"
                            onfocus="this.style.borderColor='#2c5aa0'; this.style.boxShadow='0 0 0 3px rgba(44, 90, 160, 0.1)'; this.style.transform='translateY(-1px)'"
                            onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                        <i class="fas fa-calendar-alt" style="position: absolute; right: 15px; top: 42px; color: #666; pointer-events: none;"></i>
                        
                        <!-- Calendário Flutuante -->
                        <div id="calendarioFlutuante" style="display: none; position: absolute; top: 100%; left: 0; z-index: 1000000; background: white; border: 2px solid #2c5aa0; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 20px; width: 320px; margin-top: 5px;">
                            <!-- Header do Calendário -->
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                                <button type="button" id="btnMesAnterior" style="background: none; border: none; font-size: 18px; color: #2c5aa0; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                                    <i class="fas fa-chevron-left"></i>
                                </button>
                                <h4 id="mesAnoCalendario" style="margin: 0; color: #2c5aa0; font-size: 16px; font-weight: 600;"></h4>
                                <button type="button" id="btnMesProximo" style="background: none; border: none; font-size: 18px; color: #2c5aa0; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                                    <i class="fas fa-chevron-right"></i>
                                </button>
                            </div>
                            
                            <!-- Dias da Semana -->
                            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 10px;">
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Dom</div>
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Seg</div>
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Ter</div>
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Qua</div>
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Qui</div>
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Sex</div>
                                <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Sáb</div>
                            </div>
                            
                            <!-- Grid dos Dias -->
                            <div id="diasCalendario" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;"></div>
                            
                            <!-- Rodapé -->
                            <div style="margin-top: 15px; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
                                <button type="button" onclick="selecionarHoje()" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                                    Hoje
                                </button>
                            </div>
                        </div>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Hora</label>
                        <input type="time" id="horaGlobal" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); outline: none;"
                            onfocus="this.style.borderColor='#2c5aa0'; this.style.boxShadow='0 0 0 3px rgba(44, 90, 160, 0.1)'; this.style.transform='translateY(-1px)'"
                            onblur="this.style.borderColor='#ddd'; this.style.boxShadow='none'; this.style.transform='translateY(0)'">
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Profissional</label>
                    <select id="profissionalGlobal" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px;">
                        <option value="">Selecione um profissional</option>
                        <option value="Maria Júlia">Maria Júlia</option>
                        <option value="Carlos Silva">Carlos Silva</option>
                        <option value="Ana Costa">Ana Costa</option>
                        <option value="Pedro Santos">Pedro Santos</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Observações</label>
                    <textarea id="observacoesGlobal" rows="4" placeholder="Observações sobre o agendamento..." style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; resize: vertical;"></textarea>
                </div>
                
                <div style="display: flex; gap: 15px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <button type="button" id="cancelarNovoModal" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #6c757d; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1);" 
                        onmouseover="this.style.transform='scale(1.05) translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(108, 117, 125, 0.3)'; this.style.background='#5a6268'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.background='#6c757d'">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="button" id="salvarAgendamento" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #28a745; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1);"
                        onmouseover="this.style.transform='scale(1.05) translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(40, 167, 69, 0.3)'; this.style.background='#218838'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.background='#28a745'">
                        <i class="fas fa-save"></i> Salvar
                    </button>
                    <button type="button" id="salvarEIr" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #2c5aa0; color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transform: scale(1);"
                        onmouseover="this.style.transform='scale(1.05) translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(44, 90, 160, 0.3)'; this.style.background='#1e3a5f'"
                        onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='none'; this.style.background='#2c5aa0'">
                        <i class="fas fa-save"></i> <i class="fas fa-arrow-right"></i> Salvar e Ir
                    </button>
                </div>
            </form>
        </div>
    `;
    
    novoModal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -70%) scale(0.8) !important;
        width: 90% !important;
        max-width: 800px !important;
        max-height: 90vh !important;
        background: white !important;
        z-index: 999999 !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0) !important;
        border-radius: 15px !important;
        overflow: hidden !important;
        border: 3px solid #2c5aa0 !important;
        opacity: 0 !important;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    `;
    
    // ADICIONAR AO DOM
    document.body.appendChild(novoOverlay);
    document.body.appendChild(novoModal);
    document.body.style.overflow = 'hidden';
    
    // ANIMAR ENTRADA DO MODAL (fluido e suave)
    requestAnimationFrame(() => {
        // Primeiro frame: preparar elementos
        novoOverlay.style.opacity = '0';
        novoModal.style.opacity = '0';
        novoModal.style.transform = 'translate(-50%, -70%) scale(0.8)';
        
        setTimeout(() => {
            // Animar overlay
            novoOverlay.style.background = 'rgba(0,0,0,0.7)';
            novoOverlay.style.opacity = '1';
            
            // Animar modal com delay para efeito cascata
            setTimeout(() => {
                novoModal.style.opacity = '1';
                novoModal.style.transform = 'translate(-50%, -50%) scale(1)';
                novoModal.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';
            }, 150);
        }, 50);
    });
    
    // ADICIONAR EVENT LISTENERS
    function fecharModal() {
        // Animar saída (mais rápida que entrada)
        novoModal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 1, 1)';
        novoOverlay.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 1, 1)';
        
        // Animar modal saindo
        novoModal.style.opacity = '0';
        novoModal.style.transform = 'translate(-50%, -30%) scale(0.9)';
        novoModal.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
        
        // Animar overlay saindo
        setTimeout(() => {
            novoOverlay.style.opacity = '0';
            novoOverlay.style.background = 'rgba(0,0,0,0)';
        }, 100);
        
        // Remover elementos após animação
        setTimeout(() => {
            if (novoModal.parentNode) novoModal.remove();
            if (novoOverlay.parentNode) novoOverlay.remove();
            document.body.style.overflow = '';
            // Garantir que overlays residuais sejam removidos
            garantirRemoverOverlays();
        }, 350);
    }
    
    document.getElementById('fecharNovoModal').onclick = fecharModal;
    document.getElementById('cancelarNovoModal').onclick = fecharModal;
    novoOverlay.onclick = fecharModal;

    // Segurança: garantir remoção de outros overlays que possam permanecer
    function garantirRemoverOverlays() {
        // Remover elementos com classe comum 'modal-overlay'
        try {
            const extras = document.querySelectorAll('.modal-overlay');
            extras.forEach(el => {
                if (el && el.parentNode) el.remove();
            });
        } catch (e) { /* ignore */ }

        // Remover qualquer overlay com z-index muito alto que possa cobrir a tela
        try {
            const all = Array.from(document.body.children || []);
            all.forEach(el => {
                try {
                    const z = window.getComputedStyle(el).zIndex;
                    if (z && Number(z) >= 10000) {
                        if (el && el.parentNode) el.remove();
                    }
                } catch(e){}
            });
        } catch(e){}
    }
    
    // Helper de notificação (usa showNotification se disponível)
    function notify(message, type = 'success'){
        try{
            if(typeof showNotification === 'function'){
                showNotification(message, type);
                return;
            }
        }catch(e){ console.debug('notify: showNotification falhou', e); }

        // Fallback mínimo: criar um toast simples no canto superior direito
        try{
            const n = document.createElement('div');
            n.className = 'patch-toast patch-toast-' + (type || 'info');
            n.innerHTML = `<span>${message}</span>`;
            const styleId = 'patch-toast-styles';
            if(!document.getElementById(styleId)){
                const s = document.createElement('style');
                s.id = styleId;
                s.textContent = `
                    .patch-toast{position:fixed;top:20px;right:20px;padding:12px 16px;border-radius:8px;color:#063;z-index:4000;box-shadow:0 6px 18px rgba(2,6,23,0.08);font-weight:600}
                    .patch-toast-success{background:#d1fae5;color:#064e3b}
                    .patch-toast-info{background:#dbeafe;color:#0f172a}
                `;
                document.head.appendChild(s);
            }
            document.body.appendChild(n);
            setTimeout(()=>{ n.style.opacity='0'; n.style.transition='opacity 0.3s ease'; setTimeout(()=>n.remove(),350); }, 3500);
        }catch(e){ try{ console.log(message);}catch(_){} }
    }

    // Event listeners para os botões de ação
    document.getElementById('salvarAgendamento').onclick = function() {
        console.log('💾 Salvando agendamento...');
        const dados = coletarDadosFormulario();
        if (validarFormulario(dados)) {
            (async () => {
                try {
                    // preparar payload para API
                    const petId = (document.getElementById('petClienteGlobal') || {}).getAttribute && (document.getElementById('petClienteGlobal').getAttribute('data-selected-pet-id') || document.getElementById('petClienteGlobal').dataset.selectedPetId || '');
                    const servicoSelectedId = (document.getElementById('servicoGlobal') || {}).getAttribute && (document.getElementById('servicoGlobal').getAttribute('data-selected-id') || document.getElementById('servicoGlobal').dataset.selectedId || '');
                    const objAg = criarObjetoAgendamento(dados);

                    // converter data dd/mm/yyyy para YYYY-MM-DD
                    function formatDateForAPI(br){
                        if (!br) return '';
                        const parts = br.split('/');
                        if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                        return br; // assume já em formato ISO
                    }

                    const payload = {
                        data: formatDateForAPI(dados.data),
                        hora: dados.hora || '',
                        petId: petId || dados.petId || '',
                        servico: dados.servico || (servicoSelectedId ? `#${servicoSelectedId}` : ''),
                        observacoes: dados.observacoes || '',
                        profissional: dados.profissional || '',
                        valor: objAg.valor || 0
                    };

                    if (!payload.petId) {
                        alert('Selecione um Pet válido nas sugestões (clique no resultado).');
                        return;
                    }

                    // chamar API
                    let resp;
                    try {
                        resp = await tryFetchAny('/api/agendamentos');
                        // tryFetchAny returns a Response for GET; for POST we call fetch directly
                    } catch(e) { /* ignore */ }

                    // usar fetch com origem correta
                    let postResp;
                    try {
                        const origin = window.location.origin;
                        const url = '/api/agendamentos';
                        postResp = await fetch((origin + url), {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                    } catch(e){
                        console.error('[novo-atendimento-global] Erro ao chamar API /api/agendamentos', e);
                        alert('Erro ao salvar agendamento (falha na conexão). Veja o console.');
                        return;
                    }

                    if (!postResp || !postResp.ok) {
                        const text = await (postResp ? postResp.text() : Promise.resolve(''));
                        console.error('API /api/agendamentos retornou erro:', postResp && postResp.status, text);
                        try {
                            const j = postResp && postResp.json ? await postResp.json() : null;
                            alert('Erro ao salvar: ' + (j && j.error ? j.error : (postResp.statusText || 'Erro desconhecido')));
                        } catch(e){ alert('Erro ao salvar agendamento. Veja o console.'); }
                        return;
                    }

                    const created = await postResp.json();
                    console.log('🔁 Agendamento criado via API:', created);

                    // adaptar para o formato esperado pelo DOM
                    const agObj = {
                        id: created.id || Date.now(),
                        horario: created.horario || objAg.horario || dados.hora || '',
                        petNome: created.petNome || objAg.petNome || '',
                        clienteNome: created.clienteNome || objAg.clienteNome || '',
                        servico: created.servico || objAg.servico || dados.servico || '',
                        profissional: created.profissional || objAg.profissional || dados.profissional || '',
                        valor: created.valor || objAg.valor || 0,
                        status: created.status || 'agendado',
                        statusTexto: (created.status && created.statusTexto) ? created.statusTexto : 'Agendado',
                        dataAgendamento: created.dataAgendamento || formatDateForAPI(dados.data)
                    };

                    adicionarAgendamentoAoDOM(agObj);
                    notify('Agendamento confirmado com sucesso!', 'success');
                    fecharModal();
                } catch (err) {
                    console.error('Erro ao salvar agendamento via API:', err);
                    alert('Erro ao salvar agendamento. Veja o console para detalhes.');
                }
            })();
        }
    };
    
    document.getElementById('salvarEIr').onclick = async function() {
        console.log('💾➡️ Salvando e redirecionando...');
        const dados = coletarDadosFormulario();
        if (validarFormulario(dados)) {
            try {
                // Preparar payload para API
                const petInput = document.getElementById('petClienteGlobal');
                const petId = petInput?.getAttribute('data-selected-pet-id') || petInput?.dataset?.selectedPetId || '';
                
                if (!petId) {
                    alert('Por favor, selecione um Pet válido nas sugestões (clique no resultado).');
                    return;
                }

                // Converter data DD/MM/YYYY para YYYY-MM-DD
                function formatDateForAPI(br){
                    if (!br) return '';
                    const parts = br.split('/');
                    if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
                    return br;
                }

                const payload = {
                    data: formatDateForAPI(dados.data),
                    hora: dados.hora || '',
                    petId: petId,
                    servico: dados.servico || '',
                    observacoes: dados.observacoes || '',
                    profissional: dados.profissional || '',
                    valor: 0
                };

                // Chamar API
                const response = await fetch('/api/agendamentos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.status === 409) {
                    const j = await response.json();
                    alert('Não foi possível salvar: ' + (j?.error || j?.message || 'Conflito de horário.'));
                    return;
                }

                if (!response.ok) {
                    const j = await response.json();
                    alert('Erro ao salvar: ' + (j?.error || j?.message || response.statusText));
                    return;
                }

                const created = await response.json();
                console.log('✅ Agendamento salvo na API:', created);

                // Recarregar do servidor
                if (window.agendamentosManager && typeof window.agendamentosManager.loadAgendamentos === 'function') {
                    await window.agendamentosManager.loadAgendamentos();
                }

                notify('Agendamento confirmado e salvo no servidor!', 'success');
                fecharModal();
            } catch (err) {
                console.error('❌ Erro ao salvar:', err);
                alert('Erro ao salvar agendamento. Veja o console para detalhes.');
            }
        }
    };
    
    // Focar no primeiro campo
    setTimeout(() => {
        document.getElementById('petClienteGlobal').focus();
    }, 100);
    
    console.log('✅ Modal de Novo Agendamento criado e exibido!');

    // Configurar busca/auto-complete para o campo Pet/Cliente dentro deste modal
    try {
        setupPetClienteGlobalSearch();
    } catch (err) {
        console.log('[novo-atendimento-global] setupPetClienteGlobalSearch falhou', err);
    }
    // Fallback: garantir binding direto caso setupPetClienteGlobalSearch não anexe (debug + robustez)
    try {
        const inputFallback = document.getElementById('petClienteGlobal');
        if (inputFallback) {
            console.log('[novo-atendimento-global] aplicando fallback de binding no input petClienteGlobal');
            const evt = new InputEvent('input');
            // Debounced local handler
            let t = null;
            inputFallback.addEventListener('input', function(e){
                clearTimeout(t);
                t = setTimeout(async () => {
                    try {
                        const q = (inputFallback.value || '').trim();
                        if (!q) return;
                        console.log('[novo-atendimento-global][fallback] buscando por', q);
                        const { pets } = await searchPetsClientesGlobal(q);
                        // create/find results container
                        let resultsContainer = document.getElementById('resultados-pet-cliente-global');
                        if (!resultsContainer) {
                            resultsContainer = document.createElement('div');
                            resultsContainer.id = 'resultados-pet-cliente-global';
                            resultsContainer.style.cssText = 'position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 1200000; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 18px rgba(15,23,42,0.12); max-height: 280px; overflow: auto; display: none;';
                            const wrapper = inputFallback.parentElement || document.body;
                            wrapper.style.position = wrapper.style.position || 'relative';
                            wrapper.appendChild(resultsContainer);
                        }
                        displaySearchResultsGlobal(pets, resultsContainer, inputFallback);
                    } catch (e) { console.warn('[novo-atendimento-global][fallback] erro na busca', e); }
                }, 250);
            });
            // trigger initial input event to initialize
            inputFallback.dispatchEvent(evt);
        }
    } catch (e) { console.log('[novo-atendimento-global] fallback binding falhou', e); }
    try {
        setupServicoGlobalSearch();
    } catch (err) {
        console.debug('[novo-atendimento-global] setupServicoGlobalSearch falhou', err);
    }
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================
function coletarDadosFormulario() {
    return {
        petCliente: document.getElementById('petClienteGlobal').value,
        servico: document.getElementById('servicoGlobal').value,
        data: document.getElementById('dataGlobal').value,
        hora: document.getElementById('horaGlobal').value,
        profissional: document.getElementById('profissionalGlobal').value,
        observacoes: document.getElementById('observacoesGlobal').value
    };
}

function validarFormulario(dados) {
    if (!dados.petCliente || !dados.servico) {
        alert('Por favor, preencha os campos obrigatórios: Pet/Cliente e Serviço');
        return false;
    }
    return true;
}

function criarObjetoAgendamento(dados) {
    // Extrair nome do pet e cliente do campo combinado
    const petClienteTexto = dados.petCliente || '';
    let petNome = '';
    let clienteNome = '';
    
    if (petClienteTexto.includes(' — ')) {
        const partes = petClienteTexto.split(' — ');
        petNome = partes[0] || '';
        clienteNome = partes[1] || '';
    } else if (petClienteTexto.includes(' - ')) {
        const partes = petClienteTexto.split(' - ');
        petNome = partes[0] || '';
        clienteNome = partes[1] || '';
    } else if (petClienteTexto.includes('(')) {
        petNome = petClienteTexto.split('(')[0].trim();
        clienteNome = petClienteTexto.split('(')[1]?.replace(')', '').trim() || '';
    } else {
        // Se não conseguir separar, assume que é só o pet
        petNome = petClienteTexto;
        clienteNome = '';
    }
    
    // Tentar obter valor do serviço selecionado
    let valor = 0;
    try {
        const servicoInput = document.getElementById('servicoGlobal');
        const selectedId = servicoInput?.getAttribute('data-selected-id');
        if (selectedId) {
            const meusItens = getMeusItensFromStorage();
            const item = meusItens.find(x => String(x.id) === String(selectedId));
            if (item) {
                const preco = item.preco || item.venda || item.valor || 0;
                valor = Number(String(preco).replace(',', '.')) || 0;
            }
        }
    } catch (e) {
        console.debug('Erro ao obter valor do serviço:', e);
    }
    
    return {
        id: Date.now(),
        horario: dados.hora || '',
        petNome: petNome,
        clienteNome: clienteNome,
        servico: dados.servico || '',
        profissional: dados.profissional || '',
        valor: valor,
        status: 'agendado',
        statusTexto: 'Agendado'
    };
}

function adicionarAgendamentoAoDOM(agendamento) {
    const tableBody = document.getElementById('agendamentosTableBody');
    if (!tableBody) {
        console.log('❌ Elemento agendamentosTableBody não encontrado');
        return;
    }

    // Remover empty-state se existir
    const emptyState = tableBody.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Inserir diretamente no DOM com estrutura completa (mesma do renderAgendamentos)
    try {
        const status = agendamento.status || 'agendado';
        const statusClassMap = {
            'agendado': 'agendado',
            'checkin': 'check-in',
            'pronto': 'pronto',
            'concluido': 'check-out',
            'cancelado': 'cancelado'
        };
        const statusClass = statusClassMap[status] || status;
        const statusTexto = agendamento.statusTexto || (status === 'agendado' ? 'Agendado' : status);
        
        const html = `
            <div class="agendamento-row" data-agendamento-id="${escapeHtmlUnsafe(agendamento.id || '')}" data-status="${escapeHtmlUnsafe(status)}">
                <div class="agendamento-controls">
                    <label class="checkbox-label">
                        <input type="checkbox" value="${escapeHtmlUnsafe(agendamento.id || '')}">
                        <span class="checkmark"></span>
                    </label>
                </div>
                <div class="agendamento-columns">
                    <div class="agendamento-horario">${escapeHtmlUnsafe(agendamento.horario || '')}</div>
                    <div class="agendamento-pet-cliente">
                        <strong>${escapeHtmlUnsafe(agendamento.petNome || '')}</strong><br>
                        <small>${escapeHtmlUnsafe(agendamento.clienteNome || '')}</small>
                    </div>
                    <div class="agendamento-detalhes">${escapeHtmlUnsafe(agendamento.servico || '')}</div>
                    <div class="agendamento-profissional">${escapeHtmlUnsafe(agendamento.profissional || '-')}</div>
                    <div class="agendamento-valor">${formatCurrencyBR(agendamento.valor || 0)}</div>
                    <div class="agendamento-situacao">
                        <span class="status-badge status-${statusClass}">
                            ${escapeHtmlUnsafe(statusTexto)}
                        </span>
                    </div>
                    <div class="agendamento-actions">
                        <button class="action-icon" title="Localização" onclick="if(window.agendamentosManager){agendamentosManager.showLocation(${agendamento.id})}">
                            <i class="fas fa-map-marker-alt"></i>
                        </button>
                        <button class="action-icon" title="Compartilhar" onclick="if(window.agendamentosManager){agendamentosManager.shareAgendamento(${agendamento.id})}">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button class="action-icon" title="Mais opções" onclick="if(window.agendamentosManager){agendamentosManager.showMoreOptions(${agendamento.id}, event)}">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        // inserir no topo
        tableBody.insertAdjacentHTML('afterbegin', html);
        console.log('✅ Agendamento inserido no DOM:', agendamento.id);
        
        // Configurar clique na row para navegação
        const row = tableBody.querySelector(`[data-agendamento-id="${agendamento.id}"]`);
        if (row && window.agendamentosManager) {
            row.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox' || e.target.closest('.checkbox-label')) return;
                window.location.href = `agendamento-detalhes.html?id=${agendamento.id}`;
            });
            row.style.cursor = 'pointer';
            row.addEventListener('mouseenter', () => { row.style.backgroundColor = '#f8f9fa'; });
            row.addEventListener('mouseleave', () => { row.style.backgroundColor = ''; });
        }
    } catch (e) {
        console.error('❌ Erro ao inserir agendamento no DOM:', e);
    }
}

function salvarAgendamentoTemporario(agendamento) {
    try {
        const agendamentos = JSON.parse(sessionStorage.getItem('agendamentos_temp') || '[]');
        agendamentos.unshift(agendamento);
        sessionStorage.setItem('agendamentos_temp', JSON.stringify(agendamentos));
        console.log('✅ Agendamento salvo temporariamente');
    } catch (e) {
        console.error('❌ Erro ao salvar agendamento temporário:', e);
    }
}

function carregarAgendamentosTemporarios() {
    try {
        const agendamentos = JSON.parse(sessionStorage.getItem('agendamentos_temp') || '[]');
        if (agendamentos.length > 0) {
            agendamentos.forEach(agendamento => {
                adicionarAgendamentoAoDOM(agendamento);
            });
            // Limpar após carregar
            sessionStorage.removeItem('agendamentos_temp');
            console.log('✅ Agendamentos temporários carregados');
        }
    } catch (e) {
        console.error('❌ Erro ao carregar agendamentos temporários:', e);
    }
}

// TODO: Agendamentos devem ser salvos diretamente na API via ApiClient.criarAgendamento()
// Não usar localStorage para agendamentos_persistidos
// function salvarAgendamentoNoLocalStorage(agendamento) { ... }

// TODO: Carregar agendamentos da API via ApiClient.getAgendamentos()
// Esta função deve ser substituída por uma chamada à API
// localStorage não deve ser usado para agendamentos_persistidos
function carregarAgendamentosPersistidos() {
    console.warn('⚠️ carregarAgendamentosPersistidos() DEPRECATED - usar ApiClient.getAgendamentos()');
    return; // Função desabilitada
    
    /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        const tableBody = document.getElementById('agendamentosTableBody');
        if (!tableBody) return;

        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        if (agendamentos.length > 0) {
            // Ordenar agendamentos por horário (mais cedo primeiro)
            agendamentos.sort(function(a, b) {
                const horarioA = a.horario || '00:00';
                const horarioB = b.horario || '00:00';
                return horarioA.localeCompare(horarioB);
            });

            // Limpar mensagem de vazio se existir
            const emptyState = tableBody.querySelector('.empty-state');
            if (emptyState) {
                tableBody.innerHTML = '';
            }

            // Renderizar cada agendamento
            agendamentos.forEach(agendamento => {
                const status = agendamento.status || 'agendado';
                const statusTexto = agendamento.statusTexto || 'Agendado';
                
                const agendamentoHtml = `
                    <div class="agendamento-row" data-agendamento-id="${agendamento.id}">
                        <div class="agendamento-controls">
                            <label class="checkbox-label">
                                <input type="checkbox" value="${agendamento.id}">
                                <span class="checkmark"></span>
                            </label>
                        </div>
                        <div class="agendamento-columns">
                            <div class="agendamento-horario">${agendamento.horario}</div>
                            <div class="agendamento-pet-cliente">
                                <strong>${agendamento.petNome}</strong><br>
                                <small>${agendamento.clienteNome}</small>
                            </div>
                            <div class="agendamento-detalhes">${agendamento.servico}</div>
                            <div class="agendamento-profissional">${agendamento.profissional || '-'}</div>
                            <div class="agendamento-valor">${formatCurrencyBR(agendamento.valor)}</div>
                            <div class="agendamento-situacao">
                                <div class="status-dropdown" data-agendamento-id="${agendamento.id}">
                                    <button class="status-button status-${status}" onclick="toggleStatusDropdown('${agendamento.id}')">
                                        <span class="status-dot"></span>
                                        <span class="status-text">${statusTexto}</span>
                                        <i class="fas fa-chevron-down status-arrow"></i>
                                    </button>
                                    <div class="status-menu" id="statusMenu_${agendamento.id}">
                                        <div class="status-option status-agendado" onclick="alterarStatus('${agendamento.id}', 'agendado', 'Agendado')">
                                            <span class="status-dot"></span>
                                            <span>Agendado</span>
                                        </div>
                                        <div class="status-option status-checkin" onclick="alterarStatus('${agendamento.id}', 'checkin', 'Check-in')">
                                            <span class="status-dot"></span>
                                            <span>Check-in</span>
                                        </div>
                        <div class="status-option status-pronto" onclick="alterarStatus('${agendamento.id}', 'pronto', 'Pronto')">
                            <span class="status-dot"></span>
                            <span>Pronto</span>
                        </div>
                        <div class="status-option status-checkout" onclick="alterarStatus('${agendamento.id}', 'checkout', 'Check-out')">
                            <span class="status-dot"></span>
                            <span>Check-out</span>
                        </div>
                        <div class="status-option status-cancelado" onclick="alterarStatus('${agendamento.id}', 'cancelado', 'Cancelado')">
                            <span class="status-dot"></span>
                            <span>Cancelado</span>
                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                tableBody.insertAdjacentHTML('beforeend', agendamentoHtml);
            });
            console.log('✅ Agendamentos persistidos carregados:', agendamentos.length);
        }
    } catch (e) {
        console.error('❌ Erro ao carregar agendamentos persistidos:', e);
    }
    */
}

function excluirAgendamento(agendamentoId) {
    // TODO: Usar ApiClient.deletarAgendamento(agendamentoId) ao invés de localStorage
    console.warn('⚠️ excluirAgendamento() DEPRECATED - usar ApiClient.deletarAgendamento()');
    
    /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        // Remover do localStorage
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const agendamentosFiltrados = agendamentos.filter(ag => ag.id != agendamentoId);
        localStorage.setItem('agendamentos_persistidos', JSON.stringify(agendamentosFiltrados));

        // Remover do DOM
        const agendamentoElement = document.querySelector(`[data-agendamento-id="${agendamentoId}"]`);
        if (agendamentoElement) {
            agendamentoElement.remove();
        }

        // Verificar se lista ficou vazia
        const tableBody = document.getElementById('agendamentosTableBody');
        if (tableBody && tableBody.children.length === 0) {
            tableBody.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>Não encontramos agendamentos, revise os filtros</h3>
                    <p>Tente ajustar os filtros ou criar um novo agendamento</p>
                    <button class="btn-primary" onclick="novoAtendimento()">
                        <i class="fas fa-plus"></i>
                        Novo Agendamento
                    </button>
                </div>
            `;
        }

        console.log('✅ Agendamento excluído');
    } catch (e) {
        console.error('❌ Erro ao excluir agendamento:', e);
    }
    */
}

function excluirAgendamentosSelecionados() {
    try {
        const checkboxes = document.querySelectorAll('#agendamentosTableBody input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            alert('Selecione pelo menos um agendamento para excluir.');
            return;
        }

        if (confirm(`Tem certeza que deseja excluir ${checkboxes.length} agendamento(s) selecionado(s)?`)) {
            checkboxes.forEach(checkbox => {
                excluirAgendamento(checkbox.value);
            });
            
            // Limpar seleção do checkbox principal
            const selectAll = document.getElementById('selectAll');
            if (selectAll) {
                selectAll.checked = false;
            }
            
            // Esconder botão de exclusão
            const btnExcluir = document.getElementById('excluirSelecionados');
            if (btnExcluir) {
                btnExcluir.style.display = 'none';
            }
        }
    } catch (e) {
        console.error('❌ Erro ao excluir agendamentos selecionados:', e);
    }
}

function setupCheckboxHandlers() {
    // Handler para o checkbox "Selecionar Todos"
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
        selectAll.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll('#agendamentosTableBody input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
            toggleExcluirButton();
        });
    }

    // Observer para novos checkboxes adicionados dinamicamente
    const tableBody = document.getElementById('agendamentosTableBody');
    if (tableBody) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.querySelector) {
                            const checkbox = node.querySelector('input[type="checkbox"]');
                            if (checkbox) {
                                checkbox.addEventListener('change', toggleExcluirButton);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(tableBody, {
            childList: true,
            subtree: true
        });
    }
}

function toggleExcluirButton() {
    const checkboxes = document.querySelectorAll('#agendamentosTableBody input[type="checkbox"]:checked');
    const btnExcluir = document.getElementById('excluirSelecionados');
    
    if (btnExcluir) {
        btnExcluir.style.display = checkboxes.length > 0 ? 'inline-block' : 'none';
    }
}

// Funções do Dropdown de Status
function toggleStatusDropdown(agendamentoId) {
    // Fechar outros dropdowns abertos
    document.querySelectorAll('.status-menu').forEach(menu => {
        if (menu.id !== `statusMenu_${agendamentoId}`) {
            menu.style.display = 'none';
        }
    });

    // Toggle do dropdown clicado
    const menu = document.getElementById(`statusMenu_${agendamentoId}`);
    if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    }
}

function alterarStatus(agendamentoId, novoStatus, novoTexto) {
    // TODO: Usar ApiClient.atualizarAgendamento(agendamentoId, { status: novoStatus }) ao invés de localStorage
    console.warn('⚠️ alterarStatus() usa localStorage - migrar para ApiClient.atualizarAgendamento()');
    
    /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        // Atualizar no localStorage
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const agendamentoIndex = agendamentos.findIndex(ag => ag.id == agendamentoId);
        
        if (agendamentoIndex !== -1) {
            agendamentos[agendamentoIndex].status = novoStatus;
            agendamentos[agendamentoIndex].statusTexto = novoTexto;
            localStorage.setItem('agendamentos_persistidos', JSON.stringify(agendamentos));
        }

        // Atualizar no DOM
        const statusButton = document.querySelector(`[data-agendamento-id="${agendamentoId}"] .status-button`);
        if (statusButton) {
            // Remover classes de status antigas
            statusButton.className = 'status-button';
            // Adicionar nova classe de status
            statusButton.classList.add(`status-${novoStatus}`);
            // Atualizar texto
            statusButton.querySelector('.status-text').textContent = novoTexto;
        }

        // Fechar o dropdown
        const menu = document.getElementById(`statusMenu_${agendamentoId}`);
        if (menu) {
            menu.style.display = 'none';
        }

        console.log(`✅ Status alterado para: ${novoTexto}`);
    } catch (e) {
        console.error('❌ Erro ao alterar status:', e);
    }
    */
}

// Fechar dropdowns ao clicar fora
document.addEventListener('click', function(event) {
    if (!event.target.closest('.status-dropdown')) {
        document.querySelectorAll('.status-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// Função para navegar para detalhes do agendamento
function verDetalhesAgendamento(agendamentoId) {
    // TODO: Buscar agendamento da API via ApiClient.getAgendamento(agendamentoId)
    // localStorage.setItem('agendamento_atual') é aceitável para navegação temporária (UI state)
    console.warn('⚠️ verDetalhesAgendamento() usa localStorage para busca - migrar para API');
    
    /* CÓDIGO ANTIGO - REMOVER APÓS IMPLEMENTAÇÃO DA API
    try {
        // Buscar dados do agendamento no localStorage
        const agendamentos = JSON.parse(localStorage.getItem('agendamentos_persistidos') || '[]');
        const agendamento = agendamentos.find(ag => ag.id == agendamentoId);
        
        if (agendamento) {
            // Salvar dados do agendamento atual para a página de detalhes
            localStorage.setItem('agendamento_atual', JSON.stringify(agendamento));
            
            // Redirecionar para página de detalhes
            window.location.href = 'agendamento-detalhes.html';
            
            console.log('✅ Redirecionando para detalhes do agendamento:', agendamentoId);
        } else {
            console.error('❌ Agendamento não encontrado:', agendamentoId);
            alert('Agendamento não encontrado!');
        }
    } catch (e) {
        console.error('❌ Erro ao carregar detalhes do agendamento:', e);
        alert('Erro ao carregar detalhes do agendamento!');
    }
    */
}

// Configurar cliques nos agendamentos para navegação
function configurarCliqueAgendamentos() {
    document.addEventListener('click', function(event) {
        // Verificar se o clique foi em um agendamento (mas não em checkbox, botão de status, etc.)
        const agendamentoRow = event.target.closest('.agendamento-row');
        
        if (agendamentoRow && !event.target.closest('.agendamento-controls') && 
            !event.target.closest('.status-dropdown') && !event.target.closest('button')) {
            
            const agendamentoId = agendamentoRow.dataset.agendamentoId;
            if (agendamentoId) {
                verDetalhesAgendamento(agendamentoId);
            }
        }
    });
}

// ================================
// LIVE SEARCH: Pet/Cliente (global modal)
// ================================
function escapeHtmlUnsafe(str){
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function normalizeClienteValue(v){
    try{
        if (v == null) return '';
        if (typeof v === 'string') return v;
        if (typeof v === 'number') return String(v);
        if (typeof v === 'object'){
            return v.nome || v.name || v.nome_cliente || v.clienteNome || v.fullName || ((v.firstName && v.lastName) ? (v.firstName + ' ' + v.lastName) : '') || JSON.stringify(v);
        }
        return String(v);
    }catch(e){ return String(v || ''); }
}

function debounce(fn, wait){
    let t = null;
    return function(...args){
        clearTimeout(t);
        t = setTimeout(()=> fn.apply(this, args), wait);
    };
}

// tenta várias URLs base para contornar execução via live-server (:5500) vs backend em outra porta
async function tryFetchAny(path) {
    const origin = window.location.origin;
    const baseCandidates = [ '', origin, 'http://127.0.0.1:3000', 'http://localhost:3000', 'http://127.0.0.1:8080', 'http://localhost:8080' ];
    let lastErr = null;
    for (const base of baseCandidates) {
        // montar URL absoluta: se base é '' e path absolute (startsWith '/'), use origin + path
        let url = path;
        try {
            if (base === '') {
                url = path.startsWith('/') ? (origin + path) : path;
            } else {
                // se base já contém origin, concatenar
                url = base.endsWith('/') ? (base.slice(0, -1) + path) : (base + path);
            }
            const resp = await fetch(url, { credentials: 'include' });
            if (resp && resp.ok) return resp;
            lastErr = new Error(`HTTP ${resp.status} from ${url}`);
        } catch (e) {
            lastErr = e;
        }
    }
    throw lastErr;
}

function setupPetClienteGlobalSearch(){
    const input = document.getElementById('petClienteGlobal');
    console.log('[novo-atendimento-global] setupPetClienteGlobalSearch init, input?', !!input);
    if (!input) return;

    // iniciar prefetch dos dados do sistema (cache global) — não bloqueante
    try { initGlobalPetsCache(); } catch(e) { console.log('[novo-atendimento-global] initGlobalPetsCache erro', e); }

    // container para resultados
    let resultsContainer = document.getElementById('resultados-pet-cliente-global');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'resultados-pet-cliente-global';
        resultsContainer.style.cssText = 'position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 1200000; background: white; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 18px rgba(15,23,42,0.12); max-height: 280px; overflow: auto; display: none;';
        // colocar dentro do container do input
        const wrapper = input.parentElement || document.body;
        wrapper.style.position = wrapper.style.position || 'relative';
        wrapper.appendChild(resultsContainer);
    }

    // ensure browser-autocomplete is off
    try {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
    } catch(e){}

    const doSearch = debounce(async function(){
        const q = (input.value || '').toString().trim();
        console.log('[novo-atendimento-global] input event, value=', q);
        if (q.length < 1) { resultsContainer.style.display = 'none'; resultsContainer.innerHTML = ''; return; }
        console.log('[novo-atendimento-global] procurando por', q);
        try {
            const { pets } = await searchPetsClientesGlobal(q);
            console.log('[novo-atendimento-global] search returned', (pets && pets.length) || 0);
            displaySearchResultsGlobal(pets, resultsContainer, input);
        } catch (err) {
            console.warn('[novo-atendimento-global] erro na busca global', err);
        }
    }, 250);

    input.addEventListener('input', doSearch);

    // esconder ao clicar fora
    document.addEventListener('click', function(ev){
        if (!resultsContainer) return;
        if (!resultsContainer.contains(ev.target) && ev.target !== input) {
            resultsContainer.style.display = 'none';
        }
    });
}

async function searchPetsClientesGlobal(query){
    const q = query.toLowerCase();
    console.log('[novo-atendimento-global] searchPetsClientesGlobal called with', q);
    // 0) usar cache global se já pré-carregado
    try {
        if (window.__globalPetsCache && Array.isArray(window.__globalPetsCache) && window.__globalPetsCache.length > 0) {
            console.log('[novo-atendimento-global] usando cache global, items=', window.__globalPetsCache.length);
            const pets = window.__globalPetsCache.filter(p => {
                const nome = String(p.nome || '').toLowerCase();
                const cliente = String(normalizeClienteValue(p.cliente) || '').toLowerCase();
                return nome.includes(q) || cliente.includes(q);
            });
            return { pets };
        }
    } catch(e){ /* ignore */ }

    // 1) tentar usar dados carregados em _meusPetsData (quando disponível)
    try {
        if (typeof _meusPetsData !== 'undefined' && Array.isArray(_meusPetsData) && _meusPetsData.length > 0) {
            console.log('[novo-atendimento-global] usando _meusPetsData local, itens=', _meusPetsData.length);
            const pets = _meusPetsData.filter(p => {
                const nome = String(p.nome || p.pet || p.nome_pet || '').toLowerCase();
                const cliente = String(normalizeClienteValue(p.cliente || p.nome_cliente || p.owner || p.clienteNome || '')).toLowerCase();
                return nome.includes(q) || cliente.includes(q);
            }).map(p => ({
                id: p.id || p.codigo || p.pet_id || p._id || '',
                nome: p.nome || p.pet || p.nome_pet || '',
                cliente: normalizeClienteValue(p.cliente || p.nome_cliente || p.owner || p.clienteNome || ''),
                clienteId: p.clienteId || p.cliente_id || p.codigo_cliente || p.codigo || ''
            }));
            return { pets };
        }
    } catch(e){ console.log('[novo-atendimento-global] _meusPetsData check falhou', e); }
    // 2) tentar API backend e popular cache global para buscas subsequentes
    try {
        // tentar carregar pets e clientes para montar uma lista completa
        const [petsResp, clientsResp] = await Promise.allSettled([
            tryFetchAny('/api/pets'),
            tryFetchAny('/api/clientes')
        ]);

        let petsArr = [];
        let clientsArr = [];

        if (petsResp.status === 'fulfilled' && petsResp.value && petsResp.value.ok) {
            const json = await petsResp.value.json();
            petsArr = Array.isArray(json) ? json : (json.pets || json.data || []);
        }
        if (clientsResp.status === 'fulfilled' && clientsResp.value && clientsResp.value.ok) {
            const json = await clientsResp.value.json();
            clientsArr = Array.isArray(json) ? json : (json.clientes || json.data || []);
        }

        // montar mapa de clientes por id (tentando várias chaves)
        const clientsMap = {};
        (clientsArr || []).forEach(c => {
            const id = c.id || c.codigo || c.cliente_id || c._id;
            if (id !== undefined) clientsMap[String(id)] = c;
        });

        const mapped = (petsArr || []).map(p => {
            const clienteId = p.cliente_id || p.cliente || p.clienteId || p.tutor_id || p.codigo_cliente || '';
            const cli = clientsMap[String(clienteId)] || {};
            const rawCliente = p.cliente || p.nome_cliente || cli.nome || cli.nome_cliente || cli || '';
            return {
                id: p.id || p.codigo || p.pet_id || p._id || '',
                nome: p.nome || p.pet || p.nome_pet || '',
                cliente: normalizeClienteValue(rawCliente),
                clienteId: clienteId || (cli.id || cli.codigo || '')
            };
        });

        // salvar em cache global para futuras buscas
        if (Array.isArray(mapped) && mapped.length > 0) {
            try { window.__globalPetsCache = mapped; } catch(e){}
            const pets = mapped.filter(p => {
                const nome = String(p.nome || '').toLowerCase();
                const cliente = String(p.cliente || '').toLowerCase();
                return nome.includes(q) || cliente.includes(q);
            });
            return { pets };
        }
    } catch(e){ console.log('[novo-atendimento-global] fetch /api endpoints falhou', e && e.message); }

    // 3) fallback: se não houver dados reais, retornar lista vazia (não mostrar sugestões amostrais)
    return { pets: [] };
}
    // ================================
    // LIVE SEARCH: Serviço/Produto (global modal)
    // TODO: Usar ApiClient.getItens() ao invés de localStorage
    // ================================
    // Carrega meus itens (serviços/produtos) da API e mantém cache em window.__meusItensCache
    function getMeusItensFromStorage(){
        // Retornar cache se disponível (sincrono). Em background garantimos carregar a partir da API.
        try { ensureMeusItensLoaded(); } catch(e) { /* ignora */ }
        return Array.isArray(window.__meusItensCache) ? window.__meusItensCache : [];
    }

    async function ensureMeusItensLoaded(){
        try {
            if (Array.isArray(window.__meusItensCache) && window.__meusItensCache.length > 0) return window.__meusItensCache;
            if (window.__meusItensCacheLoading) return window.__meusItensCacheLoading;

            // iniciar carregamento e guardar promise para evitar chamadas duplicadas
            const p = (async () => {
                try {
                    // Preferir função global existente (frontend/item/novo-produto.js exporta `getMeusItensFromAPI`)
                    if (typeof window.getMeusItensFromAPI === 'function') {
                        const r = await window.getMeusItensFromAPI();
                        window.__meusItensCache = Array.isArray(r) ? r : [];
                        return window.__meusItensCache;
                    }

                    // Tentar ApiClient se disponível
                    if (typeof ApiClient !== 'undefined' && typeof ApiClient.getProdutos === 'function') {
                        try {
                            const produtos = await ApiClient.getProdutos();
                            window.__meusItensCache = Array.isArray(produtos) ? produtos : [];
                            return window.__meusItensCache;
                        } catch(e) { /* continua para fallback */ }
                    }

                    // Fallback: tentar endpoints REST comuns
                    const candidates = ['/api/produtos','/api/itens','/api/produtos/meus','/api/meus-itens','/api/items','/api/items/produtos'];
                    for (const url of candidates) {
                        try {
                            const resp = await tryFetchAny(url);
                            if (resp && resp.ok) {
                                const j = await resp.json();
                                const arr = Array.isArray(j) ? j : (j.produtos || j.itens || j.data || j.items || j.produtos_lista || []);
                                window.__meusItensCache = Array.isArray(arr) ? arr : [];
                                return window.__meusItensCache;
                            }
                        } catch(e) { /* next */ }
                    }

                    // último recurso: cache vazio
                    window.__meusItensCache = [];
                    return window.__meusItensCache;
                } finally {
                    try { delete window.__meusItensFromAPI_loading; } catch(e){}
                }
            })();

            window.__meusItensCacheLoading = p;
            const res = await p;
            try { delete window.__meusItensCacheLoading; } catch(e){}
            return res;
        } catch(e){ console.debug('[novo-atendimento-global] ensureMeusItensLoaded falhou', e); window.__meusItensCache = []; return window.__meusItensCache; }
    }

    function formatCurrencyBR(val){
        const n = Number(val);
        if (isNaN(n)) return String(val || '');
        return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function setupServicoGlobalSearch(){
        const input = document.getElementById('servicoGlobal');
        const container = document.getElementById('resultados-servico-global');
        if(!input || !container) return;

        // garantir wrapper relative (já definido no HTML, mas reforçar)
        try{ input.parentNode.style.position = input.parentNode.style.position || 'relative'; } catch(e){}

        function getPriceFromObj(o){
            if(!o) return '';
            // prioridade: campo 'preco' se definido
            if (o.preco !== undefined && o.preco !== null && o.preco !== '') {
                const n = Number(String(o.preco).toString().replace(',', '.'));
                if (!isNaN(n)) return formatCurrencyBR(n);
            }
            const candidates = ['venda','preço','price','valor','valor_venda','sale_price','price_venda','venda_preco','valorUnitario','valor_unitario','price_value'];
            for(const k of candidates){
                if(o[k] !== undefined && o[k] !== null && o[k] !== ''){
                    const n = Number(String(o[k]).replace(',', '.'));
                    if(!isNaN(n)) return formatCurrencyBR(n);
                    return String(o[k]);
                }
            }
            // checar possíveis campos gerados por forms: 'venda' dentro de objetos aninhados
            if (o.precos && Array.isArray(o.precos) && o.precos.length > 0) {
                const p = o.precos[0];
                const n = Number(String(p).replace(',', '.'));
                if(!isNaN(n)) return formatCurrencyBR(n);
            }
            return '';
        }

        function renderResults(items){
            if(!items || items.length === 0){
                container.innerHTML = '<div style="padding:12px;color:#666">Nenhum serviço encontrado</div>';
                container.style.display = 'block';
                return;
            }

            const html = items.map(obj => {
                const nome = escapeHtmlUnsafe(obj.nome || obj.titulo || '');
                const venda = getPriceFromObj(obj);
                const tipo = escapeHtmlUnsafe(String(obj.tipo || ''));
                return `
                    <div class="resultado-servico-item" data-id="${escapeHtmlUnsafe(obj.id)}" style="padding:12px 14px; border-bottom:1px solid #f6f6f6; cursor:pointer;">
                        <div style="font-weight:700; color:#222; margin-bottom:4px;">${nome}</div>
                        <div style="font-size:13px; color:#2c8a5a;">Preço: R$ ${venda} <span style="color:#999;margin-left:8px">| ${tipo}</span></div>
                    </div>`;
            }).join('');

            container.innerHTML = html;
            container.style.display = 'block';

            // attach click handlers
            Array.from(container.querySelectorAll('.resultado-servico-item')).forEach(el => {
                el.onclick = async function(){
                        const id = this.getAttribute('data-id');
                        try { await ensureMeusItensLoaded(); } catch(e){}
                        const all = Array.isArray(window.__meusItensCache) ? window.__meusItensCache : [];
                        const obj = all.find(x => String(x.id) === String(id));
                        if(obj){
                            input.value = obj.nome || obj.titulo || obj.name || '';
                            input.setAttribute('data-selected-id', String(obj.id));
                        } else {
                            // fallback: set visible text
                            input.value = this.textContent.trim();
                            input.removeAttribute('data-selected-id');
                        }
                    // esconder e evitar reabrir imediatamente por causa do focus handler
                    container.style.display = 'none';
                    container.innerHTML = '';
                    try{ input.dataset.skipOpen = '1'; } catch(e){}
                    // manter foco no input mas evitar que o evento focus reabra o dropdown
                    try{ input.focus(); } catch(e){}
                    setTimeout(()=>{ try{ delete input.dataset.skipOpen; } catch(e){} }, 400);
                };
            });
        }

        const doSearch = debounce(async function(query){
            const q = (query || '').trim();
            if(!q){
                container.style.display = 'none';
                return;
            }
            // garantir que os itens estejam carregados (pode ser carregamento em background)
            try { await ensureMeusItensLoaded(); } catch(e) { /* ignore */ }
            const all = Array.isArray(window.__meusItensCache) ? window.__meusItensCache : [];
            const qq = q.toLowerCase();
            // buscar em nome/titulo apenas; limitar resultados
            const filtered = (all||[]).filter(it => {
                const nome = String(it.nome || it.titulo || it.name || '').toLowerCase();
                const tipo = String(it.tipo || it.category || it.categoria || '').toLowerCase();
                // aceitar itens que sejam serviços (tipo/categoria contém 'serv')
                const isService = tipo.indexOf('serv') !== -1 || (String(it.categoria||'')||'').toLowerCase().indexOf('serv') !== -1 || String(it.tipo||'').toLowerCase().indexOf('serv') !== -1;
                return nome.includes(qq) && isService;
            }).slice(0, 40);
            renderResults(filtered);
        }, 250);

        input.addEventListener('input', function(e){
            const v = e.target.value || '';
            doSearch(v);
        });

        // Garantir pré-carregamento dos meus itens e reexecutar a busca quando o carregamento finalizar
        try {
            ensureMeusItensLoaded().then(() => {
                try {
                    const v = (input.value || '').trim();
                    if (v.length > 0) doSearch(v);
                } catch(e) {}
            }).catch(() => {});
        } catch(e) { /* ignore */ }

        input.addEventListener('focus', function(e){
            // se acabamos de selecionar, não reabrir o dropdown imediatamente
            if(input.dataset && input.dataset.skipOpen) {
                return;
            }
            if(e.target.value && e.target.value.trim().length > 0){
                doSearch(e.target.value.trim());
            }
        });

        // fechar ao perder foco (com pequeno delay para clique funcionar)
        input.addEventListener('blur', function(){
            setTimeout(() => { try{ container.style.display = 'none'; } catch(e){} }, 180);
        });
    }

    // Inicializa (em background) cache global de pets/clientes a ser usada nas buscas
    async function initGlobalPetsCache(){
    try {
        if (window.__globalPetsCache && Array.isArray(window.__globalPetsCache) && window.__globalPetsCache.length > 0) return window.__globalPetsCache;
        // tentar carregar dos endpoints
    const [petsResp, clientsResp] = await Promise.allSettled([ tryFetchAny('/api/pets'), tryFetchAny('/api/clientes') ]);
        let petsArr = [];
        let clientsArr = [];
        if (petsResp.status === 'fulfilled' && petsResp.value && petsResp.value.ok) {
            const json = await petsResp.value.json();
            petsArr = Array.isArray(json) ? json : (json.pets || json.data || []);
        }
        if (clientsResp.status === 'fulfilled' && clientsResp.value && clientsResp.value.ok) {
            const json = await clientsResp.value.json();
            clientsArr = Array.isArray(json) ? json : (json.clientes || json.data || []);
        }

        const clientsMap = {};
        (clientsArr || []).forEach(c => {
            const id = c.id || c.codigo || c.cliente_id || c._id;
            if (id !== undefined) clientsMap[String(id)] = c;
        });

        const mapped = (petsArr || []).map(p => {
            const clienteId = p.cliente_id || p.cliente || p.clienteId || p.tutor_id || p.codigo_cliente || '';
            const cli = clientsMap[String(clienteId)] || {};
            const rawCliente = p.cliente || p.nome_cliente || cli.nome || cli.nome_cliente || cli || '';
            return {
                id: p.id || p.codigo || p.pet_id || p._id || '',
                nome: p.nome || p.pet || p.nome_pet || '',
                cliente: normalizeClienteValue(rawCliente),
                clienteId: clienteId || (cli.id || cli.codigo || '')
            };
        });

        if (Array.isArray(mapped) && mapped.length > 0) {
            try { window.__globalPetsCache = mapped; } catch(e){}
            console.debug('[novo-atendimento-global] initGlobalPetsCache carregou', mapped.length);
            return mapped;
        }
    } catch(e){ console.debug('[novo-atendimento-global] initGlobalPetsCache falhou', e && e.message); }
    return [];
}

function displaySearchResultsGlobal(pets, container, input){
    container.innerHTML = '';
    if (!pets || pets.length === 0) { container.style.display = 'none'; return; }
    pets.slice(0, 8).forEach(p => {
        const item = document.createElement('div');
        item.className = 'search-result-item-global';
        item.style.cssText = 'padding:10px 12px; border-bottom: 1px solid #f1f5f9; cursor: pointer;';
        const top = document.createElement('div'); top.style.fontWeight = '700'; top.style.color = '#0f172a'; top.innerHTML = escapeHtmlUnsafe(p.nome || '—');
        const bottom = document.createElement('div'); bottom.style.fontSize = '12px'; bottom.style.color = '#475569';
        const clienteName = normalizeClienteValue(p.cliente);
        bottom.innerHTML = escapeHtmlUnsafe((clienteName ? clienteName : '') + (p.clienteId ? (' • Código: ' + p.clienteId) : ''));
        item.appendChild(top); item.appendChild(bottom);
        item.addEventListener('click', function(){
            const clienteName = normalizeClienteValue(p.cliente);
            input.value = (p.nome || '') + (clienteName ? (' — ' + clienteName) : '');
            // opcional: armazenar id em atributo para envio posterior
            input.setAttribute('data-selected-pet-id', p.id || '');
            container.style.display = 'none';
        });
        container.appendChild(item);
    });
    container.style.display = 'block';
}

// =============================================
// AUTO-EXECUÇÃO: Verificar se deve abrir modal
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 Página carregada - verificando flags...');
    
    // Carregar agendamentos temporários se estivermos na página de agendamentos
    const tableBody = document.getElementById('agendamentosTableBody');
    if (tableBody) {
        console.log('📋 Página de agendamentos detectada - carregando temporários...');
        carregarAgendamentosTemporarios();
    }
    
    // Verificar se deve abrir o modal automaticamente
    if (sessionStorage.getItem('abrirNovoAgendamento') === 'true') {
        console.log('🔔 Flag encontrada - abrindo modal automaticamente...');
        sessionStorage.removeItem('abrirNovoAgendamento');
        
        // Aguardar um pouco para garantir que a página carregou
        setTimeout(() => {
            abrirNovoAgendamentoModal();
        }, 500);
    }
});

// =============================================
// COMPATIBILIDADE: Sobrescrever função antiga
// =============================================
if (typeof window.abrirNovoAgendamento !== 'undefined') {
    window.abrirNovoAgendamento = abrirNovoAgendamentoModal;
}

// Exportar para escopo global
window.novoAtendimento = novoAtendimento;
window.abrirNovoAgendamentoModal = abrirNovoAgendamentoModal;

// =============================================
// SISTEMA DE CALENDÁRIO BRASILEIRO (encapsulado)
// =============================================

;(function(){
    // Variáveis do calendário, isoladas no closure para evitar conflitos globais
    let calendarioAtual = new Date();
    let dataSelecionada = null;

    // Função para toggle do calendário (exposta globalmente)
    window.toggleCalendario = function() {
        const calendario = document.getElementById('calendarioFlutuante');
        if (!calendario) return;
        if (calendario.style.display === 'none' || !calendario.style.display) {
            mostrarCalendario();
        } else {
            esconderCalendario();
        }
    }

    // Função para mostrar calendário
    function mostrarCalendario() {
        const calendario = document.getElementById('calendarioFlutuante');
        if (!calendario) return;
        calendario.style.display = 'block';
        calendario.style.opacity = '0';
        calendario.style.transform = 'translateY(-10px)';

        // Configurar calendário para o mês atual (Brasília)
        const agora = new Date();
        const brasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        calendarioAtual = new Date(brasilia.getFullYear(), brasilia.getMonth(), 1);

        renderizarCalendario();

        // Animação de entrada
        setTimeout(() => {
            calendario.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            calendario.style.opacity = '1';
            calendario.style.transform = 'translateY(0)';
        }, 10);

        // Fechar calendário ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', fecharCalendarioFora);
        }, 100);
    }

    // Função para esconder calendário
    function esconderCalendario() {
        const calendario = document.getElementById('calendarioFlutuante');
        if (!calendario) return;
        calendario.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        calendario.style.opacity = '0';
        calendario.style.transform = 'translateY(-10px)';

        setTimeout(() => {
            calendario.style.display = 'none';
        }, 200);

        document.removeEventListener('click', fecharCalendarioFora);
    }

    // Fechar calendário ao clicar fora
    function fecharCalendarioFora(e) {
        const calendario = document.getElementById('calendarioFlutuante');
        const inputData = document.getElementById('dataGlobal');
        if (!calendario || !inputData) return;
        if (!calendario.contains(e.target) && e.target !== inputData) {
            esconderCalendario();
        }
    }

    // Função para renderizar o calendário
    function renderizarCalendario() {
        const mesAno = document.getElementById('mesAnoCalendario');
        const diasGrid = document.getElementById('diasCalendario');
        if (!mesAno || !diasGrid) return;

        // Meses em português
        const meses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];

        // Atualizar header
        mesAno.textContent = `${meses[calendarioAtual.getMonth()]} ${calendarioAtual.getFullYear()}`;

        // Limpar grid
        diasGrid.innerHTML = '';

        // Primeiro dia do mês e último dia
        const primeiroDia = new Date(calendarioAtual.getFullYear(), calendarioAtual.getMonth(), 1);
        const ultimoDia = new Date(calendarioAtual.getFullYear(), calendarioAtual.getMonth() + 1, 0);

        // Dia da semana que começa o mês (0 = domingo)
        const inicioDaSemana = primeiroDia.getDay();

        // Data atual para highlight
        const hoje = new Date();
        const hojeBrasilia = new Date(hoje.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

        // Adicionar dias vazios no início
        for (let i = 0; i < inicioDaSemana; i++) {
            const diaVazio = document.createElement('div');
            diaVazio.style.cssText = 'height: 35px;';
            diasGrid.appendChild(diaVazio);
        }

        // Adicionar todos os dias do mês
        for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
            const diaElemento = document.createElement('div');
            diaElemento.textContent = dia;
            diaElemento.style.cssText = `
                height: 35px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                border-radius: 6px;
                font-size: 14px;
                transition: all 0.2s ease;
                user-select: none;
            `;

            // Verificar se é hoje
            const dataAtual = new Date(calendarioAtual.getFullYear(), calendarioAtual.getMonth(), dia);
            const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();

            if (ehHoje) {
                diaElemento.style.background = '#2c5aa0';
                diaElemento.style.color = 'white';
                diaElemento.style.fontWeight = '600';
            } else {
                diaElemento.style.color = '#333';
            }

            // Verificar se está selecionado
            if (dataSelecionada && dataAtual.toDateString() === dataSelecionada.toDateString()) {
                diaElemento.style.background = '#28a745';
                diaElemento.style.color = 'white';
                diaElemento.style.fontWeight = '600';
            }

            // Hover effect
            diaElemento.addEventListener('mouseenter', function() {
                if (!ehHoje && (!dataSelecionada || dataAtual.toDateString() !== dataSelecionada.toDateString())) {
                    this.style.background = '#f0f8ff';
                    this.style.color = '#2c5aa0';
                }
            });

            diaElemento.addEventListener('mouseleave', function() {
                if (!ehHoje && (!dataSelecionada || dataAtual.toDateString() !== dataSelecionada.toDateString())) {
                    this.style.background = 'transparent';
                    this.style.color = '#333';
                }
            });

            // Click event
            diaElemento.addEventListener('click', function() {
                selecionarData(dataAtual);
            });

            diasGrid.appendChild(diaElemento);
        }

        // Event listeners para navegação
        const btnAnt = document.getElementById('btnMesAnterior');
        const btnProx = document.getElementById('btnMesProximo');
        if (btnAnt) btnAnt.onclick = function() {
            calendarioAtual.setMonth(calendarioAtual.getMonth() - 1);
            renderizarCalendario();
        };
        if (btnProx) btnProx.onclick = function() {
            calendarioAtual.setMonth(calendarioAtual.getMonth() + 1);
            renderizarCalendario();
        };
    }

    // Função para selecionar uma data
    function selecionarData(data) {
        dataSelecionada = new Date(data);

        // Formatar data para brasileiro
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = data.getFullYear();

        const input = document.getElementById('dataGlobal');
        if (input) input.value = `${dia}/${mes}/${ano}`;

        esconderCalendario();
        renderizarCalendario(); // Re-renderizar para mostrar seleção
    }

    // Função para selecionar hoje (exposta globalmente)
    window.selecionarHoje = function() {
        const hoje = new Date();
        const hojeBrasilia = new Date(hoje.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        selecionarData(hojeBrasilia);
    }

})();

// =============================================
// CALENDÁRIO SIDEBAR (WIDGET INDEPENDENTE)
// =============================================

// Função para abrir calendário sidebar
window.abrirCalendarioSidebar = function() {
    console.log('📅 Abrindo calendário sidebar...');
    
    // Remover sidebar anterior se existir
    const sidebarAnterior = document.getElementById('calendarioSidebarWidget');
    if (sidebarAnterior) {
        sidebarAnterior.remove();
    }
    
    const overlayAnterior = document.getElementById('calendarioOverlayWidget');
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
    // Criar overlay
    const overlay = document.createElement('div');
    overlay.id = 'calendarioOverlayWidget';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999998;
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // Criar sidebar do calendário
    const sidebar = document.createElement('div');
    sidebar.id = 'calendarioSidebarWidget';
    sidebar.style.cssText = `
        position: fixed;
        top: 0;
        right: -400px;
        width: 400px;
        height: 100vh;
        background: white;
        z-index: 999999;
        box-shadow: -5px 0 20px rgba(0,0,0,0.1);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
    `;
    
    // HTML da sidebar
    sidebar.innerHTML = `
        <div style="padding: 25px; border-bottom: 1px solid #eee; background: linear-gradient(135deg, #2c5aa0 0%, #1e3a5f 100%); color: white;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
                    <i class="fas fa-calendar-alt" style="margin-right: 10px;"></i>
                    Calendário
                </h3>
                <button onclick="fecharCalendarioSidebar()" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 5px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='none'">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div style="font-size: 14px; opacity: 0.9;">
                Selecione uma data para navegar
            </div>
        </div>
        
        <div style="flex: 1; padding: 30px; overflow-y: auto;">
            <!-- Data Selecionada -->
            <div id="dataSelecionadaWidget" style="background: #f8f9fa; border: 2px solid #e9ecef; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <div style="font-size: 14px; color: #666; margin-bottom: 5px;">Data Selecionada</div>
                <div id="dataExibicaoWidget" style="font-size: 24px; font-weight: 600; color: #2c5aa0;">Nenhuma data selecionada</div>
            </div>
            
            <!-- Calendário -->
            <div style="background: white; border: 2px solid #2c5aa0; border-radius: 12px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <!-- Header do Calendário -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <button type="button" id="btnMesAnteriorWidget" style="background: none; border: none; font-size: 18px; color: #2c5aa0; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <h4 id="mesAnoCalendarioWidget" style="margin: 0; color: #2c5aa0; font-size: 16px; font-weight: 600;"></h4>
                    <button type="button" id="btnMesProximoWidget" style="background: none; border: none; font-size: 18px; color: #2c5aa0; cursor: pointer; padding: 8px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
                
                <!-- Dias da Semana -->
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-bottom: 10px;">
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Dom</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Seg</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Ter</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Qua</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Qui</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Sex</div>
                    <div style="text-align: center; padding: 8px 0; font-size: 12px; font-weight: 600; color: #666;">Sáb</div>
                </div>
                
                <!-- Grid dos Dias -->
                <div id="diasCalendarioWidget" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;"></div>
                
                <!-- Botões de Ação -->
                <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                    <button type="button" onclick="selecionarHojeWidget()" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                        <i class="fas fa-calendar-day"></i> Hoje
                    </button>
                    <button type="button" onclick="limparSelecaoWidget()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                        <i class="fas fa-eraser"></i> Limpar
                    </button>
                </div>
            </div>
            
            <!-- Ações Rápidas -->
            <div style="margin-top: 25px;">
                <h4 style="margin-bottom: 15px; color: #2c5aa0; font-size: 16px;">
                    <i class="fas fa-bolt"></i> Ações Rápidas
                </h4>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="novoAtendimento()" style="background: #2c5aa0; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#1e3a5f'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='#2c5aa0'; this.style.transform='translateY(0)'">
                        <i class="fas fa-calendar-plus"></i>
                        Novo Atendimento
                    </button>
                    <button onclick="window.location.href='agendamentos-novo.html'" style="background: #17a2b8; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; gap: 10px;" onmouseover="this.style.background='#138496'; this.style.transform='translateY(-2px)'" onmouseout="this.style.background='#17a2b8'; this.style.transform='translateY(0)'">
                        <i class="fas fa-calendar-alt"></i>
                        Ver Agenda
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(overlay);
    document.body.appendChild(sidebar);
    
    // Animação de entrada
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        sidebar.style.right = '0px';
    });
    
    // Inicializar calendário widget
    inicializarCalendarioWidget();
    
    // Fechar ao clicar no overlay
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            fecharCalendarioSidebar();
        }
    });
}

// Variáveis para o calendário widget
let calendarioWidgetAtual = new Date();
let dataSelecionadaWidget = null;

// Função para fechar calendário sidebar
window.fecharCalendarioSidebar = function() {
    const sidebar = document.getElementById('calendarioSidebarWidget');
    const overlay = document.getElementById('calendarioOverlayWidget');
    
    if (sidebar && overlay) {
        sidebar.style.right = '-400px';
        overlay.style.opacity = '0';
        
        setTimeout(() => {
            sidebar.remove();
            overlay.remove();
        }, 400);
    }
}

// Função para inicializar calendário widget
function inicializarCalendarioWidget() {
    const agora = new Date();
    const brasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    calendarioWidgetAtual = new Date(brasilia.getFullYear(), brasilia.getMonth(), 1);
    
    renderizarCalendarioWidget();
}

// Função para renderizar calendário widget
function renderizarCalendarioWidget() {
    const mesAno = document.getElementById('mesAnoCalendarioWidget');
    const diasGrid = document.getElementById('diasCalendarioWidget');
    
    if (!mesAno || !diasGrid) return;
    
    // Meses em português
    const meses = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    // Atualizar header
    mesAno.textContent = `${meses[calendarioWidgetAtual.getMonth()]} ${calendarioWidgetAtual.getFullYear()}`;
    
    // Limpar grid
    diasGrid.innerHTML = '';
    
    // Primeiro dia do mês e último dia
    const primeiroDia = new Date(calendarioWidgetAtual.getFullYear(), calendarioWidgetAtual.getMonth(), 1);
    const ultimoDia = new Date(calendarioWidgetAtual.getFullYear(), calendarioWidgetAtual.getMonth() + 1, 0);
    
    // Dia da semana que começa o mês (0 = domingo)
    const inicioDaSemana = primeiroDia.getDay();
    
    // Data atual para highlight
    const hoje = new Date();
    const hojeBrasilia = new Date(hoje.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    // Adicionar dias vazios no início
    for (let i = 0; i < inicioDaSemana; i++) {
        const diaVazio = document.createElement('div');
        diaVazio.style.cssText = 'height: 40px;';
        diasGrid.appendChild(diaVazio);
    }
    
    // Adicionar todos os dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const diaElemento = document.createElement('div');
        diaElemento.textContent = dia;
        diaElemento.style.cssText = `
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
            user-select: none;
        `;
        
        // Verificar se é hoje
        const dataAtual = new Date(calendarioWidgetAtual.getFullYear(), calendarioWidgetAtual.getMonth(), dia);
        const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();
        
        if (ehHoje) {
            diaElemento.style.background = '#2c5aa0';
            diaElemento.style.color = 'white';
            diaElemento.style.fontWeight = '600';
        } else {
            diaElemento.style.color = '#333';
        }
        
        // Verificar se está selecionado
        if (dataSelecionadaWidget && dataAtual.toDateString() === dataSelecionadaWidget.toDateString()) {
            diaElemento.style.background = '#28a745';
            diaElemento.style.color = 'white';
            diaElemento.style.fontWeight = '600';
        }
        
        // Hover effect
        diaElemento.addEventListener('mouseenter', function() {
            if (!ehHoje && (!dataSelecionadaWidget || dataAtual.toDateString() !== dataSelecionadaWidget.toDateString())) {
                this.style.background = '#e3f2fd';
                this.style.color = '#2c5aa0';
                this.style.transform = 'scale(1.1)';
            }
        });
        
        diaElemento.addEventListener('mouseleave', function() {
            if (!ehHoje && (!dataSelecionadaWidget || dataAtual.toDateString() !== dataSelecionadaWidget.toDateString())) {
                this.style.background = 'transparent';
                this.style.color = '#333';
                this.style.transform = 'scale(1)';
            }
        });
        
        // Click event
        diaElemento.addEventListener('click', function() {
            selecionarDataWidget(dataAtual);
        });
        
        diasGrid.appendChild(diaElemento);
    }
    
    // Event listeners para navegação
    document.getElementById('btnMesAnteriorWidget').onclick = function() {
        calendarioWidgetAtual.setMonth(calendarioWidgetAtual.getMonth() - 1);
        renderizarCalendarioWidget();
    };
    
    document.getElementById('btnMesProximoWidget').onclick = function() {
        calendarioWidgetAtual.setMonth(calendarioWidgetAtual.getMonth() + 1);
        renderizarCalendarioWidget();
    };
}

// Função para selecionar data no widget
function selecionarDataWidget(data) {
    dataSelecionadaWidget = new Date(data);
    
    // Formatar data para exibição
    const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const diaSemana = diasSemana[data.getDay()];
    const dia = data.getDate();
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    
    const dataFormatada = `${diaSemana}, ${dia} de ${mes} de ${ano}`;
    
    document.getElementById('dataExibicaoWidget').textContent = dataFormatada;
    document.getElementById('dataSelecionadaWidget').style.border = '2px solid #28a745';
    document.getElementById('dataSelecionadaWidget').style.background = '#f8fff9';
    
    renderizarCalendarioWidget(); // Re-renderizar para mostrar seleção
}

// Função para selecionar hoje no widget
window.selecionarHojeWidget = function() {
    const hoje = new Date();
    const hojeBrasilia = new Date(hoje.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    selecionarDataWidget(hojeBrasilia);
}

// Função para limpar seleção no widget
window.limparSelecaoWidget = function() {
    dataSelecionadaWidget = null;
    document.getElementById('dataExibicaoWidget').textContent = 'Nenhuma data selecionada';
    document.getElementById('dataSelecionadaWidget').style.border = '2px solid #e9ecef';
    document.getElementById('dataSelecionadaWidget').style.background = '#f8f9fa';
    renderizarCalendarioWidget();
}

// =============================================
// CALENDÁRIO COMPACTO (PARA AGENDAMENTOS)
// =============================================

// Função para abrir calendário compacto
window.abrirCalendarioCompacto = function() {
    console.log('📅 Abrindo calendário compacto...');
    
    // Remover calendário anterior se existir
    const calendarioAnterior = document.getElementById('calendarioCompactoWidget');
    if (calendarioAnterior) {
        calendarioAnterior.remove();
    }
    
    // Obter posição do botão calendário
    const botaoCalendario = document.querySelector('#calendarioWidget');
    const rect = botaoCalendario.getBoundingClientRect();
    
    // Criar calendário compacto
    const calendario = document.createElement('div');
    calendario.id = 'calendarioCompactoWidget';
    calendario.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 10}px;
        left: ${rect.left}px;
        width: 280px;
        background: white;
        border: 2px solid #2c5aa0;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 999999;
        padding: 15px;
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    
    // HTML do calendário compacto
    calendario.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h4 style="margin: 0; color: #2c5aa0; font-size: 14px; font-weight: 600;">
                <i class="fas fa-calendar-alt" style="margin-right: 5px;"></i>
                Calendário
            </h4>
            <button onclick="fecharCalendarioCompacto()" style="background: none; border: none; color: #666; font-size: 16px; cursor: pointer; padding: 2px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <!-- Header do Calendário -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <button type="button" id="btnMesAnteriorCompacto" style="background: none; border: none; font-size: 14px; color: #2c5aa0; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                <i class="fas fa-chevron-left"></i>
            </button>
            <h5 id="mesAnoCalendarioCompacto" style="margin: 0; color: #2c5aa0; font-size: 13px; font-weight: 600;"></h5>
            <button type="button" id="btnMesProximoCompacto" style="background: none; border: none; font-size: 14px; color: #2c5aa0; cursor: pointer; padding: 4px; border-radius: 50%; transition: all 0.2s ease;" onmouseover="this.style.background='#f0f0f0'" onmouseout="this.style.background='none'">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
        
        <!-- Dias da Semana -->
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 5px;">
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">D</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">T</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">Q</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">Q</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
            <div style="text-align: center; padding: 4px 0; font-size: 9px; font-weight: 600; color: #666;">S</div>
        </div>
        
        <!-- Grid dos Dias -->
        <div id="diasCalendarioCompacto" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; margin-bottom: 10px;"></div>
        
        <!-- Botões -->
        <div style="display: flex; gap: 5px; justify-content: center;">
            <button type="button" onclick="selecionarHojeCompacto()" style="background: #28a745; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                Hoje
            </button>
            <button type="button" onclick="fecharCalendarioCompacto()" style="background: #6c757d; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;" onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                Fechar
            </button>
        </div>
    `;
    
    // Adicionar ao DOM
    document.body.appendChild(calendario);
    
    // Verificar se o calendário sai da tela e ajustar posição
    const calendarioRect = calendario.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Ajustar horizontalmente se sair da tela
    if (calendarioRect.right > viewportWidth) {
        const newLeft = rect.right - 280; // Alinha pela direita do botão
        calendario.style.left = `${Math.max(10, newLeft)}px`;
    }
    
    // Ajustar verticalmente se sair da tela
    if (calendarioRect.bottom > viewportHeight) {
        const newTop = rect.top - calendarioRect.height - 10; // Abre acima do botão
        calendario.style.top = `${Math.max(10, newTop)}px`;
    }
    
    // Animação de entrada
    requestAnimationFrame(() => {
        calendario.style.opacity = '1';
        calendario.style.transform = 'scale(1) translateY(0)';
    });
    
    // Inicializar calendário compacto
    inicializarCalendarioCompacto();
    
    // Fechar ao clicar fora
    setTimeout(() => {
        document.addEventListener('click', fecharCalendarioCompactoFora);
    }, 100);
}

// Variáveis para o calendário compacto
let calendarioCompactoAtual = new Date();
let dataSelecionadaCompacto = null;

// Função para fechar calendário compacto
window.fecharCalendarioCompacto = function() {
    const calendario = document.getElementById('calendarioCompactoWidget');
    
    if (calendario) {
        calendario.style.opacity = '0';
        calendario.style.transform = 'scale(0.9) translateY(-10px)';
        
        setTimeout(() => {
            calendario.remove();
        }, 300);
    }
    
    document.removeEventListener('click', fecharCalendarioCompactoFora);
}

// Fechar calendário compacto ao clicar fora
function fecharCalendarioCompactoFora(e) {
    const calendario = document.getElementById('calendarioCompactoWidget');
    const botaoCalendario = document.querySelector('#calendarioWidget');
    
    if (calendario && !calendario.contains(e.target) && e.target !== botaoCalendario && !botaoCalendario.contains(e.target)) {
        fecharCalendarioCompacto();
    }
}

// Função para inicializar calendário compacto
function inicializarCalendarioCompacto() {
    const agora = new Date();
    const brasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    calendarioCompactoAtual = new Date(brasilia.getFullYear(), brasilia.getMonth(), 1);
    
    renderizarCalendarioCompacto();
}

// Função para renderizar calendário compacto
function renderizarCalendarioCompacto() {
    const mesAno = document.getElementById('mesAnoCalendarioCompacto');
    const diasGrid = document.getElementById('diasCalendarioCompacto');
    
    if (!mesAno || !diasGrid) return;
    
    // Meses em português
    const meses = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    
    // Atualizar header
    mesAno.textContent = `${meses[calendarioCompactoAtual.getMonth()]} ${calendarioCompactoAtual.getFullYear()}`;
    
    // Limpar grid
    diasGrid.innerHTML = '';
    
    // Primeiro dia do mês e último dia
    const primeiroDia = new Date(calendarioCompactoAtual.getFullYear(), calendarioCompactoAtual.getMonth(), 1);
    const ultimoDia = new Date(calendarioCompactoAtual.getFullYear(), calendarioCompactoAtual.getMonth() + 1, 0);
    
    // Dia da semana que começa o mês (0 = domingo)
    const inicioDaSemana = primeiroDia.getDay();
    
    // Data atual para highlight
    const hoje = new Date();
    const hojeBrasilia = new Date(hoje.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    // Adicionar dias vazios no início
    for (let i = 0; i < inicioDaSemana; i++) {
        const diaVazio = document.createElement('div');
        diaVazio.style.cssText = 'height: 22px;';
        diasGrid.appendChild(diaVazio);
    }
    
    // Adicionar todos os dias do mês
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const diaElemento = document.createElement('div');
        diaElemento.textContent = dia;
        diaElemento.style.cssText = `
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
            user-select: none;
        `;
        
        // Verificar se é hoje
        const dataAtual = new Date(calendarioCompactoAtual.getFullYear(), calendarioCompactoAtual.getMonth(), dia);
        const ehHoje = dataAtual.toDateString() === hojeBrasilia.toDateString();
        
        if (ehHoje) {
            diaElemento.style.background = '#2c5aa0';
            diaElemento.style.color = 'white';
            diaElemento.style.fontWeight = '600';
        } else {
            diaElemento.style.color = '#333';
        }
        
        // Verificar se está selecionado
        if (dataSelecionadaCompacto && dataAtual.toDateString() === dataSelecionadaCompacto.toDateString()) {
            diaElemento.style.background = '#28a745';
            diaElemento.style.color = 'white';
            diaElemento.style.fontWeight = '600';
        }
        
        // Hover effect
        diaElemento.addEventListener('mouseenter', function() {
            if (!ehHoje && (!dataSelecionadaCompacto || dataAtual.toDateString() !== dataSelecionadaCompacto.toDateString())) {
                this.style.background = '#e3f2fd';
                this.style.color = '#2c5aa0';
                this.style.transform = 'scale(1.1)';
            }
        });
        
        diaElemento.addEventListener('mouseleave', function() {
            if (!ehHoje && (!dataSelecionadaCompacto || dataAtual.toDateString() !== dataSelecionadaCompacto.toDateString())) {
                this.style.background = 'transparent';
                this.style.color = '#333';
                this.style.transform = 'scale(1)';
            }
        });
        
        // Click event
        diaElemento.addEventListener('click', function() {
            selecionarDataCompacto(dataAtual);
        });
        
        diasGrid.appendChild(diaElemento);
    }
    
    // Event listeners para navegação
    document.getElementById('btnMesAnteriorCompacto').onclick = function() {
        calendarioCompactoAtual.setMonth(calendarioCompactoAtual.getMonth() - 1);
        renderizarCalendarioCompacto();
    };
    
    document.getElementById('btnMesProximoCompacto').onclick = function() {
        calendarioCompactoAtual.setMonth(calendarioCompactoAtual.getMonth() + 1);
        renderizarCalendarioCompacto();
    };
}

// Função para selecionar data no calendário compacto
function selecionarDataCompacto(data) {
    dataSelecionadaCompacto = new Date(data);
    
    // Formatar data para brasileiro
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    
    console.log(`📅 Data selecionada: ${dia}/${mes}/${ano}`);
    
    // Fechar calendário após seleção
    setTimeout(() => {
        fecharCalendarioCompacto();
    }, 300);
    
    renderizarCalendarioCompacto(); // Re-renderizar para mostrar seleção
}

// Função para selecionar hoje no calendário compacto
window.selecionarHojeCompacto = function() {
    const hoje = new Date();
    const hojeBrasilia = new Date(hoje.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    selecionarDataCompacto(hojeBrasilia);
}

console.log('🌟 Sistema Global de Novo Atendimento configurado!');