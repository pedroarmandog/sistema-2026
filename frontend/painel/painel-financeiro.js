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

/* ========================================
   PAINEL FINANCEIRO - FUNCIONALIDADES
   ======================================== */

// Estado global do painel financeiro
const painelFinanceiroState = {
    mesAtual: new Date(2025, 10, 1), // Novembro de 2025
    dadosReceber: {
        hoje: 295.42,
        essaSemana: 2047.79,
        proximaSemana: 2444.17,
        esseMes: 6364.59,
        proximoMes: 2367.39,
        atrasado: 35335.62,
        geral: 42853.63
    },
    dadosPagar: {
        hoje: 0,
        essaSemana: 0,
        proximaSemana: 0,
        esseMes: 0,
        proximoMes: 0,
        atrasado: 0,
        geral: 0
    },
    eventosMes: [] // Será preenchido via API
};

// Instâncias dos gráficos
let graficoSaldos = null;
let graficoReceberPagar = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Painel Financeiro inicializado');
    
    // Configurar abas
    configurarAbas();
    
    // Renderizar calendário
    renderizarCalendario();
    
    // Inicializar gráficos com delay para garantir que Chart.js está carregado
    setTimeout(() => {
        inicializarGraficos();
    }, 500);
    
    // Atualizar painéis laterais
    atualizarPaineisLaterais();
    
    // Configurar eventos
    configurarEventos();
});

/* ========================================
   CONFIGURAÇÃO DE ABAS
   ======================================== */
function configurarAbas() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remover active de todos
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Adicionar active ao clicado
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/* ========================================
   NAVEGAÇÃO DO CALENDÁRIO
   ======================================== */
function configurarEventos() {
    // Navegação de meses
    document.getElementById('btnMesAnterior').addEventListener('click', function() {
        painelFinanceiroState.mesAtual.setMonth(painelFinanceiroState.mesAtual.getMonth() - 1);
        renderizarCalendario();
        atualizarGraficos();
    });
    
    document.getElementById('btnProximoMes').addEventListener('click', function() {
        painelFinanceiroState.mesAtual.setMonth(painelFinanceiroState.mesAtual.getMonth() + 1);
        renderizarCalendario();
        atualizarGraficos();
    });
    
    // Botão atualizar
    document.getElementById('btnAtualizar').addEventListener('click', function() {
        carregarDadosAPI();
    });
}

/* ========================================
   RENDERIZAÇÃO DO CALENDÁRIO
   ======================================== */
function renderizarCalendario() {
    const mesAno = painelFinanceiroState.mesAtual;
    const ano = mesAno.getFullYear();
    const mes = mesAno.getMonth();
    
    // Atualizar cabeçalho
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    document.getElementById('mesAnoCalendario').textContent = `${meses[mes]} de ${ano}`;
    
    // Calcular dias do mês
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const totalDias = ultimoDia.getDate();
    const diaSemanaInicio = primeiroDia.getDay();
    
    // Dias do mês anterior
    const mesAnterior = new Date(ano, mes, 0);
    const diasMesAnterior = mesAnterior.getDate();
    
    // Container dos dias
    const container = document.getElementById('calendarioDays');
    container.innerHTML = '';
    
    // Dias do mês anterior (para preencher a primeira semana)
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
        const dia = diasMesAnterior - i;
        const diaElement = criarDiaCalendario(dia, true, mes - 1, ano);
        container.appendChild(diaElement);
    }
    
    // Dias do mês atual
    for (let dia = 1; dia <= totalDias; dia++) {
        const diaElement = criarDiaCalendario(dia, false, mes, ano);
        container.appendChild(diaElement);
    }
    
    // Dias do próximo mês (para completar a grade)
    const totalCelulas = container.children.length;
    const celulasNecessarias = Math.ceil(totalCelulas / 7) * 7;
    const diasProximoMes = celulasNecessarias - totalCelulas;
    
    for (let dia = 1; dia <= diasProximoMes; dia++) {
        const diaElement = criarDiaCalendario(dia, true, mes + 1, ano);
        container.appendChild(diaElement);
    }
}

function criarDiaCalendario(dia, outroMes, mes, ano) {
    const diaDiv = document.createElement('div');
    diaDiv.className = 'calendario-day';
    if (outroMes) {
        diaDiv.classList.add('other-month');
    }
    
    // Número do dia
    const numeroDiv = document.createElement('span');
    numeroDiv.className = 'day-number';
    numeroDiv.textContent = dia;
    diaDiv.appendChild(numeroDiv);
    
    // Container de eventos
    const eventosDiv = document.createElement('div');
    eventosDiv.className = 'day-events';
    
    // Buscar eventos para este dia (simular com dados de exemplo)
    const eventos = buscarEventosDia(dia, mes, ano);
    eventos.forEach(evento => {
        const chip = document.createElement('div');
        chip.className = `event-chip ${evento.tipo}`;
        
        const label = document.createElement('span');
        label.className = 'event-chip-label';
        label.textContent = evento.label;
        chip.appendChild(label);
        
        const valor = document.createElement('span');
        valor.className = 'event-chip-valor';
        valor.textContent = evento.valor;
        chip.appendChild(valor);
        
        eventosDiv.appendChild(chip);
    });
    
    diaDiv.appendChild(eventosDiv);
    
    return diaDiv;
}

/**
 * Busca eventos para um dia específico
 * NOTA: Esta função deve ser conectada à API futuramente
 * Por enquanto, retorna dados de exemplo baseados na imagem
 */
function buscarEventosDia(dia, mes, ano) {
    const eventos = [];
    
    // Dados de exemplo conforme a imagem (novembro 2025)
    if (mes === 10 && ano === 2025) { // Novembro
        // Adicionar "Saldo Final" para alguns dias
        const diasComSaldo = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30];
        
        if (diasComSaldo.includes(dia)) {
            const saldos = {
                1: '15.819,24', 2: '15.819,24', 3: '15.898,24', 4: '16.368,24',
                5: '16.663,66', 6: '17.042,06', 7: '17.202,06', 8: '17.202,06',
                9: '17.526,86', 10: '18.195,92', 11: '18.747,94', 12: '18.987,54',
                13: '19.393,88', 14: '19.646,23', 15: '19.646,23', 16: '19.646,23',
                17: '20.052,03', 18: '20.368,83', 19: '20.568,83', 20: '20.677,12',
                21: '20.785,82', 22: '20.785,82', 23: '20.785,62', 24: '20.865,91',
                25: '20.865,91', 26: '20.952,78', 27: '21.400,06', 28: '21.518,86',
                29: '21.518,86', 30: '21.518,86'
            };
            
            eventos.push({
                tipo: 'saldo',
                label: 'Saldo Final',
                valor: `R$ ${saldos[dia] || '0,00'}`
            });
        }
        
        // Adicionar eventos específicos de exemplo
        const eventosEspecificos = {
            2: [{ tipo: 'cartao', label: 'Cartão (2)', valor: 'R$ 183,15' }],
            3: [{ tipo: 'cartao', label: 'Cartão (3)', valor: 'R$ 114,71' }],
            4: [{ tipo: 'crediario', label: 'Crediário (1)', valor: 'R$ 240,00' }],
            5: [
                { tipo: 'cartao', label: 'Cartão (6)', valor: 'R$ 676,08' },
                { tipo: 'cartao', label: 'Cartão (3)', valor: 'R$ 295,42' }
            ],
            6: [{ tipo: 'crediario', label: 'Crediário (1)', valor: 'R$ 220,00' }],
            7: [
                { tipo: 'crediario', label: 'Crediário (1)', valor: 'R$ 160,00' },
                { tipo: 'cartao', label: 'Cartão (1)', valor: 'R$ 158,40' }
            ],
            9: [{ tipo: 'crediario', label: 'Crediário (2)', valor: 'R$ 326,80' }],
            10: [{ tipo: 'cartao', label: 'Cartão (8)', valor: 'R$ 667,06' }],
            11: [{ tipo: 'cartao', label: 'Cartão (6)', valor: 'R$ 552,02' }],
            12: [
                { tipo: 'crediario', label: 'Crediário (1)', valor: 'R$ 200,00' },
                { tipo: 'cartao', label: 'Cartão (1)', valor: 'R$ 39,60' }
            ],
            13: [
                { tipo: 'cartao', label: 'Cartão (3)', valor: 'R$ 370,70' },
                { tipo: 'cartao', label: 'Cartão (1)', valor: 'R$ 35,64' }
            ],
            14: [{ tipo: 'cartao', label: 'Cartão (3)', valor: 'R$ 252,35' }],
            16: [{ tipo: 'cartao', label: 'Cartão (4)', valor: 'R$ 405,80' }],
            17: [{ tipo: 'cartao', label: 'Cartão (4)', valor: 'R$ 316,80' }],
            19: [{ tipo: 'cartao', label: 'Cartão (3)', valor: 'R$ 308,29' }],
            20: [{ tipo: 'cartao', label: 'Cartão (2)', valor: 'R$ 108,70' }],
            23: [{ tipo: 'cartao', label: 'Cartão (2)', valor: 'R$ 80,09' }],
            26: [
                { tipo: 'cartao', label: 'Cartão (1)', valor: 'R$ 86,87' },
                { tipo: 'cartao', label: 'Cartão (5)', valor: 'R$ 447,28' }
            ],
            27: [{ tipo: 'cartao', label: 'Cartão (1)', valor: 'R$ 118,80' }]
        };
        
        if (eventosEspecificos[dia]) {
            eventos.push(...eventosEspecificos[dia]);
        }
    }
    
    return eventos;
}

/* ========================================
   PAINÉIS LATERAIS - ATUALIZAÇÃO
   ======================================== */
function atualizarPaineisLaterais() {
    const { dadosReceber, dadosPagar } = painelFinanceiroState;
    
    // Atualizar Contas a Receber
    document.getElementById('receberHoje').textContent = formatarValor(dadosReceber.hoje);
    document.getElementById('receberSemana').textContent = formatarValor(dadosReceber.essaSemana);
    document.getElementById('receberProximaSemana').textContent = formatarValor(dadosReceber.proximaSemana);
    document.getElementById('receberMes').textContent = formatarValor(dadosReceber.esseMes);
    document.getElementById('receberProximoMes').textContent = formatarValor(dadosReceber.proximoMes);
    document.getElementById('receberAtrasado').textContent = formatarValor(dadosReceber.atrasado);
    document.getElementById('receberGeral').textContent = formatarValor(dadosReceber.geral);
    
    // Atualizar Contas a Pagar
    document.getElementById('pagarHoje').textContent = formatarValor(dadosPagar.hoje);
    document.getElementById('pagarSemana').textContent = formatarValor(dadosPagar.essaSemana);
    document.getElementById('pagarProximaSemana').textContent = formatarValor(dadosPagar.proximaSemana);
    document.getElementById('pagarMes').textContent = formatarValor(dadosPagar.esseMes);
    document.getElementById('pagarProximoMes').textContent = formatarValor(dadosPagar.proximoMes);
    document.getElementById('pagarAtrasado').textContent = formatarValor(dadosPagar.atrasado);
    document.getElementById('pagarGeral').textContent = formatarValor(dadosPagar.geral);
}

function formatarValor(valor) {
    return `R$ ${valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

/* ========================================
   GRÁFICOS - CHART.JS
   ======================================== */
function inicializarGraficos() {
    console.log('🎨 Inicializando gráficos...');
    
    const canvasSaldos = document.getElementById('graficoSaldos');
    const canvasReceberPagar = document.getElementById('graficoReceberPagar');
    
    if (!canvasSaldos || !canvasReceberPagar) {
        console.error('❌ Canvas dos gráficos não encontrados!');
        return;
    }
    
    console.log('✅ Canvas encontrados, criando gráficos...');
    
    // Gráfico de Saldos (linha)
    const ctxSaldos = canvasSaldos.getContext('2d');
    graficoSaldos = new Chart(ctxSaldos, {
        type: 'line',
        data: {
            labels: gerarLabelsGrafico(),
            datasets: [
                {
                    label: 'Saldo de contas',
                    data: gerarDadosSaldoContas(),
                    borderColor: '#3A7CA5',
                    backgroundColor: 'rgba(58, 124, 165, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                },
                {
                    label: 'Saldo previsto',
                    data: gerarDadosSaldoPrevisto(),
                    borderColor: '#B0BEC5',
                    backgroundColor: 'rgba(176, 190, 197, 0.1)',
                    tension: 0.4,
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: '#f0f0f0'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: '#f0f0f0'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('pt-BR');
                        },
                        font: {
                            size: 10
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
    
    console.log('✅ Gráfico de Saldos criado com sucesso!');
    
    // Gráfico de Receber/Pagar (barras)
    const ctxReceberPagar = canvasReceberPagar.getContext('2d');
    graficoReceberPagar = new Chart(ctxReceberPagar, {
        type: 'bar',
        data: {
            labels: gerarLabelsGrafico(),
            datasets: [
                {
                    label: 'A receber',
                    data: gerarDadosReceber(),
                    backgroundColor: '#71B27F',
                    borderRadius: 4,
                    barThickness: 'flex',
                    maxBarThickness: 20
                },
                {
                    label: 'A pagar',
                    data: gerarDadosPagar(),
                    backgroundColor: '#D66A6A',
                    borderRadius: 4,
                    barThickness: 'flex',
                    maxBarThickness: 20
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 3,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: '#f0f0f0'
                    },
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('pt-BR');
                        },
                        font: {
                            size: 10
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Gráfico de Receber/Pagar criado com sucesso!');
    console.log('✅ Todos os gráficos inicializados!');
}

/**
 * Gera labels para os gráficos (dias do mês)
 * NOTA: Ajustar conforme necessidade da API
 */
function gerarLabelsGrafico() {
    const labels = [];
    for (let i = 1; i <= 30; i++) {
        labels.push(`${String(i).padStart(2, '0')}/11`);
    }
    return labels;
}

/**
 * Gera dados de exemplo para Saldo de Contas
 * NOTA: Substituir por dados reais da API
 */
function gerarDadosSaldoContas() {
    // Retorna dados zerados - será preenchido pela API
    return Array(30).fill(0);
}

/**
 * Gera dados de exemplo para Saldo Previsto
 * NOTA: Substituir por dados reais da API
 */
function gerarDadosSaldoPrevisto() {
    // Retorna dados zerados - será preenchido pela API
    return Array(30).fill(0);
}

/**
 * Gera dados de exemplo para A Receber
 * NOTA: Substituir por dados reais da API
 */
function gerarDadosReceber() {
    // Retorna dados zerados - será preenchido pela API
    return Array(30).fill(0);
}

/**
 * Gera dados de exemplo para A Pagar
 * NOTA: Substituir por dados reais da API
 */
function gerarDadosPagar() {
    // Retorna dados zerados - será preenchido pela API
    return Array(30).fill(0);
}

/**
 * Atualiza os gráficos com novos dados
 * Chamada quando o mês é alterado ou dados são recarregados
 */
function atualizarGraficos() {
    if (graficoSaldos) {
        graficoSaldos.data.labels = gerarLabelsGrafico();
        graficoSaldos.data.datasets[0].data = gerarDadosSaldoContas();
        graficoSaldos.data.datasets[1].data = gerarDadosSaldoPrevisto();
        graficoSaldos.update();
    }
    
    if (graficoReceberPagar) {
        graficoReceberPagar.data.labels = gerarLabelsGrafico();
        graficoReceberPagar.data.datasets[0].data = gerarDadosReceber();
        graficoReceberPagar.data.datasets[1].data = gerarDadosPagar();
        graficoReceberPagar.update();
    }
}

/* ========================================
   INTEGRAÇÃO COM API (PREPARADO)
   ======================================== */

/**
 * Carrega dados do servidor via API
 * NOTA: Implementar chamadas reais à API quando o backend estiver pronto
 */
async function carregarDadosAPI() {
    try {
        console.log('📡 Carregando dados da API...');
        
        // Exemplo de como será a integração:
        // const response = await fetch('/api/painel-financeiro/posicao-atual', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         mes: painelFinanceiroState.mesAtual.getMonth() + 1,
        //         ano: painelFinanceiroState.mesAtual.getFullYear()
        //     })
        // });
        // const dados = await response.json();
        
        // Atualizar estado com dados da API
        // painelFinanceiroState.dadosReceber = dados.receber;
        // painelFinanceiroState.dadosPagar = dados.pagar;
        // painelFinanceiroState.eventosMes = dados.eventos;
        
        // Atualizar interface
        renderizarCalendario();
        atualizarPaineisLaterais();
        atualizarGraficos();
        
        mostrarNotificacao('Dados atualizados com sucesso!', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados da API:', error);
        mostrarNotificacao('Erro ao carregar dados do servidor', 'error');
    }
}

/**
 * Carrega eventos do calendário para um mês específico
 * NOTA: Conectar à API quando disponível
 */
async function carregarEventosCalendario(mes, ano) {
    try {
        // const response = await fetch(`/api/painel-financeiro/eventos?mes=${mes}&ano=${ano}`);
        // const eventos = await response.json();
        // return eventos;
        
        return []; // Retorna vazio até conectar à API
    } catch (error) {
        console.error('❌ Erro ao carregar eventos do calendário:', error);
        return [];
    }
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = 'notification';
    
    let icone = 'fa-info-circle';
    let cor = 'var(--primary-color)';
    
    if (tipo === 'success') {
        icone = 'fa-check-circle';
        cor = 'var(--turquoise)';
    } else if (tipo === 'error') {
        icone = 'fa-exclamation-circle';
        cor = 'var(--red)';
    }
    
    notificacao.innerHTML = `
        <i class="fas ${icone}" style="color: ${cor}; font-size: 20px;"></i>
        <span>${mensagem}</span>
    `;
    
    notificacao.style.backgroundColor = 'var(--bg-card)';
    notificacao.style.color = 'var(--text-primary)';
    notificacao.style.border = `1px solid ${cor}`;
    
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => document.body.removeChild(notificacao), 300);
    }, 3000);
}

// API global para controle externo
window.painelFinanceiro = {
    carregarDadosAPI,
    atualizarPaineisLaterais,
    renderizarCalendario,
    atualizarGraficos
};

/* ========================================
   FLUXO DE CAIXA - FUNCIONALIDADES
   ======================================== */

/**
 * Configuração dos filtros do Fluxo de Caixa
 */
function configurarFluxoCaixa() {
    console.log('🔄 Configurando Fluxo de Caixa...');
    
    // Botão Download CSV
    const btnDownload = document.getElementById('btnDownloadCSV');
    if (btnDownload) {
        btnDownload.addEventListener('click', function() {
            exportarFluxoCaixaCSV();
        });
    }
    
    // Event listeners para os filtros
    const filtros = ['fluxoPeriodo', 'fluxoData', 'fluxoVisualizacao', 'fluxoEmpresa', 'fluxoCentro'];
    filtros.forEach(filtroId => {
        const filtro = document.getElementById(filtroId);
        if (filtro) {
            filtro.addEventListener('change', function() {
                atualizarFluxoCaixa();
            });
        }
    });
}

/**
 * Atualiza a tabela de Fluxo de Caixa com base nos filtros
 * NOTA: Esta função deve ser conectada à API futuramente
 */
function atualizarFluxoCaixa() {
    console.log('📊 Atualizando Fluxo de Caixa...');
    
    // Coletar valores dos filtros
    const filtros = {
        periodo: document.getElementById('fluxoPeriodo')?.value,
        data: document.getElementById('fluxoData')?.value,
        visualizacao: document.getElementById('fluxoVisualizacao')?.value,
        empresa: document.getElementById('fluxoEmpresa')?.value,
        centro: document.getElementById('fluxoCentro')?.value
    };
    
    console.log('Filtros aplicados:', filtros);
    
    // Aqui você faria a chamada à API para buscar os dados
    // Exemplo:
    // const dados = await fetch('/api/fluxo-caixa', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(filtros)
    // });
    
    // Por enquanto, apenas log
    mostrarNotificacao('Filtros atualizados', 'info');
}

/**
 * Exporta a tabela de Fluxo de Caixa para CSV
 * NOTA: Esta função deve ser conectada à API futuramente
 */
function exportarFluxoCaixaCSV() {
    console.log('📥 Exportando Fluxo de Caixa para CSV...');
    
    // Coletar dados da tabela
    const tabela = document.getElementById('fluxoTabela');
    if (!tabela) {
        console.error('Tabela não encontrada');
        return;
    }
    
    let csv = [];
    
    // Cabeçalhos
    const headers = [];
    tabela.querySelectorAll('thead th').forEach(th => {
        headers.push(th.textContent.replace(/\n/g, ' ').trim());
    });
    csv.push(headers.join(','));
    
    // Linhas
    tabela.querySelectorAll('tbody tr').forEach(tr => {
        const row = [];
        tr.querySelectorAll('td').forEach(td => {
            row.push(td.textContent.trim());
        });
        csv.push(row.join(','));
    });
    
    // Criar arquivo CSV
    const csvContent = csv.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `fluxo_caixa_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('CSV exportado com sucesso!', 'success');
}

/**
 * Carrega dados do Fluxo de Caixa da API
 * NOTA: Implementar quando a API estiver disponível
 */
async function carregarDadosFluxoCaixa(filtros) {
    try {
        // Exemplo de como será a integração:
        // const response = await fetch('/api/fluxo-caixa', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(filtros)
        // });
        // const dados = await response.json();
        // preencherTabelaFluxoCaixa(dados);
        
        console.log('📡 Carregando dados do Fluxo de Caixa da API...');
    } catch (error) {
        console.error('❌ Erro ao carregar dados do Fluxo de Caixa:', error);
        mostrarNotificacao('Erro ao carregar dados', 'error');
    }
}

/**
 * Preenche a tabela de Fluxo de Caixa com dados da API
 * NOTA: Implementar quando a API estiver disponível
 */
function preencherTabelaFluxoCaixa(dados) {
    console.log('📝 Preenchendo tabela com dados:', dados);
    
    // Aqui você atualizaria os valores da tabela com os dados recebidos
    // Exemplo:
    // const celulas = document.querySelectorAll('.fluxo-tabela .col-valor');
    // celulas.forEach((celula, index) => {
    //     if (dados[index]) {
    //         celula.textContent = formatarValor(dados[index]);
    //     }
    // });
}

// Inicializar configurações do Fluxo de Caixa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        configurarFluxoCaixa();
        configurarPagamentosRecebimentos();
    }, 600);
});

/* ========================================
   PAGAMENTOS E RECEBIMENTOS - FUNCIONALIDADES
   ======================================== */

/**
 * Configuração dos filtros e funcionalidades de Pagamentos e Recebimentos
 */
function configurarPagamentosRecebimentos() {
    console.log('🔄 Configurando Pagamentos e Recebimentos...');
    
    // Filtros
    const filtroPeriodo = document.getElementById('pagRecPeriodo');
    const filtroData = document.getElementById('pagRecData');
    const filtroEmpresa = document.getElementById('pagRecEmpresa');
    
    if (filtroPeriodo) {
        filtroPeriodo.addEventListener('change', function() {
            console.log('Período alterado:', this.value);
            atualizarPagamentosRecebimentos();
        });
    }
    
    if (filtroData) {
        filtroData.addEventListener('change', function() {
            console.log('Data alterada:', this.value);
            atualizarPagamentosRecebimentos();
        });
    }
    
    if (filtroEmpresa) {
        filtroEmpresa.addEventListener('change', function() {
            console.log('Empresa alterada:', this.value);
            atualizarPagamentosRecebimentos();
        });
    }
    
    console.log('✅ Pagamentos e Recebimentos configurado com sucesso');
}

/**
 * Atualiza os dados das tabelas de Pagamentos e Recebimentos
 */
function atualizarPagamentosRecebimentos() {
    const periodo = document.getElementById('pagRecPeriodo')?.value;
    const data = document.getElementById('pagRecData')?.value;
    const empresa = document.getElementById('pagRecEmpresa')?.value;
    
    console.log('🔄 Atualizando Pagamentos e Recebimentos...', {
        periodo,
        data,
        empresa
    });
    
    // Preparado para integração com API
    // buscarDadosPagamentosRecebimentos({ periodo, data, empresa })
    //     .then(dados => {
    //         preencherTabelaPagamentos(dados.pagamentos);
    //         preencherTabelaRecebimentos(dados.recebimentos);
    //     });
}

/**
 * Buscar dados de Pagamentos e Recebimentos da API
 */
async function buscarDadosPagamentosRecebimentos(filtros) {
    try {
        console.log('📡 Buscando dados de Pagamentos e Recebimentos:', filtros);
        
        // const response = await fetch(`/api/financeiro/pagamentos-recebimentos?${new URLSearchParams(filtros)}`);
        // const dados = await response.json();
        // return dados;
        
        // Mock de dados vazios
        return {
            pagamentos: {
                saldoInicial: Array(9).fill(0),
                novosLancamentos: Array(9).fill(0),
                multaJurosPagos: Array(9).fill(0),
                descontos: Array(9).fill(0),
                cancelamentos: Array(9).fill(0),
                pagamentos: Array(9).fill(0),
                saldoFinal: Array(9).fill(0)
            },
            recebimentos: {
                saldoInicial: Array(9).fill(0),
                novosLancamentos: Array(9).fill(0),
                multaJurosAcumulados: Array(9).fill(0),
                descontos: Array(9).fill(0),
                cancelamentos: Array(9).fill(0),
                recebimentos: Array(9).fill(0),
                saldoFinal: Array(9).fill(0)
            }
        };
    } catch (error) {
        console.error('❌ Erro ao buscar dados de Pagamentos e Recebimentos:', error);
        return null;
    }
}

/**
 * Preencher tabela de Pagamentos
 */
function preencherTabelaPagamentos(dados) {
    console.log('📝 Preenchendo tabela de Pagamentos:', dados);
    
    if (!dados) return;
    
    const tabela = document.getElementById('pagamentosTabela');
    if (!tabela) return;
    
    // Aqui você atualizaria os valores da tabela com os dados recebidos
    // Exemplo:
    // const linhas = tabela.querySelectorAll('tbody tr');
    // linhas[0].querySelectorAll('.col-valor').forEach((cel, i) => cel.textContent = formatarValor(dados.saldoInicial[i]));
    // linhas[1].querySelectorAll('.col-valor').forEach((cel, i) => cel.textContent = formatarValor(dados.novosLancamentos[i]));
    // ... e assim por diante
}

/**
 * Preencher tabela de Recebimentos
 */
function preencherTabelaRecebimentos(dados) {
    console.log('📝 Preenchendo tabela de Recebimentos:', dados);
    
    if (!dados) return;
    
    const tabela = document.getElementById('recebimentosTabela');
    if (!tabela) return;
    
    // Aqui você atualizaria os valores da tabela com os dados recebidos
    // Exemplo:
    // const linhas = tabela.querySelectorAll('tbody tr');
    // linhas[0].querySelectorAll('.col-valor').forEach((cel, i) => cel.textContent = formatarValor(dados.saldoInicial[i]));
    // linhas[1].querySelectorAll('.col-valor').forEach((cel, i) => cel.textContent = formatarValor(dados.novosLancamentos[i]));
    // ... e assim por diante
}

/**
 * Exportar dados para CSV
 */
function exportarPagamentosRecebimentosCSV() {
    console.log('📥 Exportando Pagamentos e Recebimentos para CSV...');
    
    const periodo = document.getElementById('pagRecPeriodo')?.value;
    const data = document.getElementById('pagRecData')?.value;
    
    let csv = 'Pagamentos e Recebimentos\n';
    csv += `Período: ${periodo} - Data: ${data}\n\n`;
    
    // Adicionar dados de Pagamentos
    csv += 'PAGAMENTOS\n';
    const tabelaPagamentos = document.getElementById('pagamentosTabela');
    if (tabelaPagamentos) {
        csv += extrairDadosTabelaCSV(tabelaPagamentos);
    }
    
    csv += '\n\n';
    
    // Adicionar dados de Recebimentos
    csv += 'RECEBIMENTOS\n';
    const tabelaRecebimentos = document.getElementById('recebimentosTabela');
    if (tabelaRecebimentos) {
        csv += extrairDadosTabelaCSV(tabelaRecebimentos);
    }
    
    // Download do arquivo
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `pagamentos_recebimentos_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ CSV exportado com sucesso');
}

/**
 * Extrair dados de uma tabela para formato CSV
 */
function extrairDadosTabelaCSV(tabela) {
    let csv = '';
    
    // Cabeçalhos
    const headers = tabela.querySelectorAll('thead th');
    headers.forEach((header, index) => {
        if (index > 0) csv += ';';
        csv += header.textContent.replace(/\n/g, ' ').trim();
    });
    csv += '\n';
    
    // Linhas de dados
    const linhas = tabela.querySelectorAll('tbody tr');
    linhas.forEach(linha => {
        const celulas = linha.querySelectorAll('td');
        celulas.forEach((celula, index) => {
            if (index > 0) csv += ';';
            csv += celula.textContent.trim();
        });
        csv += '\n';
    });
    
    return csv;
}
