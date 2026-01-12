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

// ========================================
// FUNCIONALIDADES DOS ORÇAMENTOS
// ========================================

class OrcamentosManager {
    constructor() {
        console.log('🏗️ Inicializando OrcamentosManager...');
        this.orcamentos = [];
        this.filtroStatus = 'pendentes';
        this.filtrosPeriodo = {
            inicio: '06/10/2025',
            fim: '05/11/2025'
        };
        this.init();
        console.log('✅ OrcamentosManager construído com sucesso');
    }

    init() {
        this.configurarEventos();
        this.carregarOrcamentos();
        this.renderizarTabela();
    }

    configurarEventos() {
        // Botão Novo Orçamento
        const btnNovoOrcamento = document.querySelector('.btn-novo-orcamento');
        if (btnNovoOrcamento) {
            btnNovoOrcamento.addEventListener('click', () => this.novoOrcamento());
        }

        // Filtros de status
        const statusRadios = document.querySelectorAll('input[name="status"]');
        statusRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.filtroStatus = e.target.value;
                this.aplicarFiltros();
            });
        });

        // Botão pesquisar
        const btnPesquisar = document.querySelector('.btn-pesquisar');
        if (btnPesquisar) {
            btnPesquisar.addEventListener('click', () => this.pesquisar());
        }

        // Input de pesquisa (Enter)
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.pesquisar();
                }
            });
        }

        // Items per page
        const itemsPerPage = document.querySelector('.items-per-page');
        if (itemsPerPage) {
            itemsPerPage.addEventListener('change', () => this.renderizarTabela());
        }

        // Botão Mais Filtros
        const btnMaisFiltros = document.getElementById('btnMaisFiltros');
        const maisFiltrosMenu = document.getElementById('maisFiltrosMenu');
        if (btnMaisFiltros && maisFiltrosMenu) {
            btnMaisFiltros.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMaisFiltros();
            });
        }

        // Botão Pesquisar Filtros
        const btnPesquisarFiltros = document.querySelector('.btn-pesquisar-filtros');
        if (btnPesquisarFiltros) {
            btnPesquisarFiltros.addEventListener('click', () => this.aplicarFiltrosAvancados());
        }

        // Botão Cancelar Filtros
        const btnCancelarFiltros = document.querySelector('.btn-cancelar-filtros');
        if (btnCancelarFiltros) {
            btnCancelarFiltros.addEventListener('click', () => this.fecharMaisFiltros());
        }

        // Fechar menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (!btnMaisFiltros?.contains(e.target) && !maisFiltrosMenu?.contains(e.target)) {
                this.fecharMaisFiltros();
            }
        });
    }

    carregarOrcamentos() {
        // Dados de exemplo - em um sistema real, estes viriam de uma API
        this.orcamentos = [
            {
                id: 'ORC-001',
                cliente: 'João Silva',
                emissao: '01/11/2025',
                valor: 'R$ 250,00',
                situacao: 'pendentes'
            },
            {
                id: 'ORC-002',
                cliente: 'Maria Santos',
                emissao: '03/11/2025',
                valor: 'R$ 180,00',
                situacao: 'finalizados'
            },
            {
                id: 'ORC-003',
                cliente: 'Pedro Costa',
                emissao: '05/11/2025',
                valor: 'R$ 320,00',
                situacao: 'pendentes'
            }
        ];
    }

    aplicarFiltros() {
        this.renderizarTabela();
    }

    pesquisar() {
        const searchInput = document.querySelector('.search-input');
        const termo = searchInput ? searchInput.value.toLowerCase() : '';
        
        if (termo) {
            console.log(`🔍 Pesquisando por: ${termo}`);
            // Implementar lógica de pesquisa
        }
        
        this.renderizarTabela();
    }

    renderizarTabela() {
        console.log('📊 Renderizando tabela de orçamentos...');
        const tbody = document.getElementById('orcamentosTableBody');
        const emptyState = document.getElementById('emptyState');
        
        console.log('🔍 Elementos encontrados:', {
            tbody: !!tbody,
            emptyState: !!emptyState,
            orcamentos: this.orcamentos.length,
            filtroStatus: this.filtroStatus
        });
        
        if (!tbody || !emptyState) {
            console.error('❌ Elementos da tabela não encontrados!');
            return;
        }

        // Filtrar orçamentos baseado no status selecionado
        const orcamentosFiltrados = this.orcamentos.filter(orc => 
            this.filtroStatus === 'todos' || orc.situacao === this.filtroStatus
        );

        console.log(`📋 Orçamentos filtrados: ${orcamentosFiltrados.length}`);

        if (orcamentosFiltrados.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            this.atualizarPaginacao(0);
            console.log('📭 Exibindo estado vazio');
            return;
        }

        emptyState.style.display = 'none';
        
        // Renderizar linhas da tabela
        tbody.innerHTML = orcamentosFiltrados.map(orc => `
            <tr onclick="orcamentosManager.verDetalhes('${orc.id}')" style="cursor: pointer;">
                <td>${orc.id}</td>
                <td>${orc.cliente}</td>
                <td>${orc.emissao}</td>
                <td>${orc.valor}</td>
                <td>
                    <span class="status-badge status-${orc.situacao}">
                        ${this.formatarSituacao(orc.situacao)}
                    </span>
                </td>
            </tr>
        `).join('');

        console.log('✅ Tabela renderizada com sucesso');
        this.atualizarPaginacao(orcamentosFiltrados.length);
    }

    formatarSituacao(situacao) {
        const situacoes = {
            'pendentes': 'Pendente',
            'finalizados': 'Finalizado',
            'faturados': 'Faturado',
            'cancelados': 'Cancelado'
        };
        return situacoes[situacao] || situacao;
    }

    atualizarPaginacao(total) {
        const paginationText = document.querySelector('.pagination-text');
        if (paginationText) {
            const itemsPerPage = document.querySelector('.items-per-page')?.value || 50;
            paginationText.textContent = `${total} of ${total}`;
        }
    }

    novoOrcamento() {
        console.log('🆕 Criar novo orçamento');
        alert('Funcionalidade: Novo Orçamento\n\nEsta tela será implementada para criar novos orçamentos.');
    }

    verDetalhes(id) {
        console.log(`👁️ Ver detalhes do orçamento: ${id}`);
        alert(`Funcionalidade: Ver Detalhes\n\nOrçamento: ${id}\n\nEsta tela será implementada para mostrar/editar detalhes do orçamento.`);
    }

    // Funções do menu "Mais Filtros"
    toggleMaisFiltros() {
        const maisFiltrosMenu = document.getElementById('maisFiltrosMenu');
        if (maisFiltrosMenu) {
            const isOpen = maisFiltrosMenu.classList.contains('open');
            if (isOpen) {
                this.fecharMaisFiltros();
            } else {
                this.abrirMaisFiltros();
            }
        }
    }

    abrirMaisFiltros() {
        const maisFiltrosMenu = document.getElementById('maisFiltrosMenu');
        if (maisFiltrosMenu) {
            maisFiltrosMenu.classList.add('open');
            console.log('📋 Menu Mais Filtros aberto');
        }
    }

    fecharMaisFiltros() {
        const maisFiltrosMenu = document.getElementById('maisFiltrosMenu');
        if (maisFiltrosMenu) {
            maisFiltrosMenu.classList.remove('open');
            console.log('📋 Menu Mais Filtros fechado');
        }
    }

    aplicarFiltrosAvancados() {
        console.log('🔍 Aplicando filtros avançados...');
        
        // Pegar valores dos filtros
        const profissional = document.querySelector('.filtro-select')?.value || '';
        
        console.log('Filtros aplicados:', {
            profissional: profissional || 'Todos'
        });
        
        // Aplicar filtros e fechar menu
        this.renderizarTabela();
        this.fecharMaisFiltros();
        
        // Feedback visual
        this.mostrarNotificacao('Filtros aplicados com sucesso!', 'success');
    }

    mostrarNotificacao(mensagem, tipo = 'info') {
        // Criar notificação temporária
        const notificacao = document.createElement('div');
        notificacao.className = `notification ${tipo}`;
        notificacao.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${mensagem}</span>
        `;
        
        document.body.appendChild(notificacao);
        
        // Remover após 3 segundos
        setTimeout(() => {
            notificacao.remove();
        }, 3000);
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, inicializando orçamentos...');
    
    // Aguardar um pouco para garantir que outros elementos carregaram
    setTimeout(() => {
        window.orcamentosManager = new OrcamentosManager();
        console.log('✅ OrcamentosManager inicializado');
        
        // Forçar renderização inicial
        setTimeout(() => {
            if (window.orcamentosManager) {
                window.orcamentosManager.renderizarTabela();
                console.log('✅ Tabela renderizada');
            }
        }, 100);
    }, 300);
});

