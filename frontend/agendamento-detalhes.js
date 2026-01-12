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
    });
    
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
        
        // Preenche observações
        const observacoes = document.getElementById('observacoes');
        if (observacoes) observacoes.value = agendamento.observacoes || '';
        
        // Preenche o serviço na tabela
        const servicoDesc = document.querySelector('.col-descricao');
        if (servicoDesc && agendamento.servico) {
            servicoDesc.textContent = agendamento.servico;
        }
        
        // Preenche profissional
        const profissionalCell = document.querySelector('.col-profissional');
        if (profissionalCell && agendamento.profissional) {
            profissionalCell.textContent = agendamento.profissional;
        }
        
        // Preenche horário
        const horarioCell = document.querySelector('.col-horario');
        if (horarioCell && agendamento.horario) {
            horarioCell.textContent = agendamento.horario;
        }
        
        // Preenche valores
        const valor = parseFloat(agendamento.valor) || 0;
        
        const totalGeral = document.getElementById('totalGeral');
        if (totalGeral) totalGeral.textContent = formatarMoeda(valor);
        
        const totalPendente = document.getElementById('totalPendente');
        if (totalPendente) totalPendente.textContent = formatarMoeda(valor);
        
        const amount = document.querySelector('.amount');
        if (amount) amount.textContent = formatarMoeda(valor);
        
        // Preenche valor unitário e total na tabela
        const unitarioCell = document.querySelector('.col-unitario');
        if (unitarioCell) unitarioCell.textContent = formatarMoeda(valor);
        
        const totalCell = document.querySelector('.col-total');
        if (totalCell) totalCell.textContent = formatarMoeda(valor);
        
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
    switch(status) {
        case 'agendado':
            selectElement.style.background = '#4CAF50';
            break;
        case 'check-in':
            selectElement.style.background = '#007bff';
            break;
        case 'confirmado':
            selectElement.style.background = '#2196F3';
            break;
        case 'em-atendimento':
            selectElement.style.background = '#FF9800';
            break;
        case 'finalizado':
            selectElement.style.background = '#9C27B0';
            break;
        case 'cancelado':
            selectElement.style.background = '#F44336';
            break;
        default:
            selectElement.style.background = '#007bff';
    }
}

// Função para finalizar cobrança e fazer checkout
async function finalizarCobranca() {
    if (!agendamentoAtual) {
        alert('Nenhum agendamento carregado');
        return;
    }
    
    if (!confirm('Deseja finalizar a cobrança e fazer o check-out deste agendamento?')) {
        return;
    }
    
    try {
        // Atualiza status para "concluido" (check-out)
        const response = await fetch(`/api/agendamentos/${agendamentoAtual.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'concluido' })
        });
        
        if (response.ok) {
            console.log('✅ Check-out realizado com sucesso');
            alert('Check-out realizado com sucesso!');
            
            // Atualiza o select visual
            const statusSelect = document.getElementById('statusSelect');
            if (statusSelect) {
                statusSelect.value = 'concluido';
                atualizarClasseStatus(statusSelect);
            }
            
            // Atualiza objeto local
            agendamentoAtual.status = 'concluido';
            
            // Redireciona de volta para a lista após 1 segundo
            setTimeout(() => {
                window.location.href = 'agendamentos-novo.html';
            }, 1000);
        } else {
            const error = await response.json();
            alert('Erro ao finalizar cobrança: ' + (error.message || 'Erro desconhecido'));
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
            body: JSON.stringify({ status: novoStatus })
        });
        
        if (response.ok) {
            console.log('✅ Status atualizado na API');
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
            body: JSON.stringify({ observacoes: novasObservacoes })
        });
        
        if (response.ok) {
            console.log('✅ Observações atualizadas na API');
        } else {
            console.warn('⚠️ Erro ao salvar na API, salvando apenas no localStorage');
        }
        
        // Atualiza no localStorage
        atualizarLocalStorage();
        console.log('📝 Observações salvas');
        
    } catch (error) {
        console.error('Erro ao salvar observações:', error);
        atualizarLocalStorage();
    }
}

// Função para voltar à lista de agendamentos
function voltarParaLista() {
    window.location.href = 'agendamentos-novo.html';
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
            { label: 'Cancelado', value: 'cancelado', dot: '#495057' }
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

                    // Atualizar o badge localmente
                    statusBadge.textContent = opt.label;
                    statusBadge.className = `status-badge status-${opt.value}`;
                    
                    // Atualizar agendamentoAtual
                    if (agendamentoAtual) {
                        agendamentoAtual.status = opt.value;
                    }

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
    
    console.log('✅ Dropdown de status configurado');
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
    
    // Configura listener para observações com debounce
    const observacoesText = document.getElementById('observacoes');
    if (observacoesText) {
        let timeoutObservacoes;
        observacoesText.addEventListener('input', function() {
            clearTimeout(timeoutObservacoes);
            timeoutObservacoes = setTimeout(salvarObservacoes, 1500); // Salva após 1.5s sem digitação
        });
    }
    
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
            
            // Atualizar status do agendamento
            const statusElement = document.querySelector('.status-badge');
            if (statusElement && agendamento.status) {
                statusElement.className = `status-badge status-${agendamento.status}`;
                statusElement.textContent = agendamento.statusTexto || agendamento.status;
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
