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

// ==================== RECEBIMENTOS ==================== 

// Dados de exemplo para recebimentos (vazio por padrão)
let recebimentosData = [];
let documentosSelecionados = [];

// Função para alternar entre tabs
function configurarTabs() {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active de todas
            tabs.forEach(t => t.classList.remove('active'));
            // Adiciona active na clicada
            this.classList.add('active');
            
            const tabName = this.getAttribute('data-tab');
            console.log('Tab selecionada:', tabName);
            
            // Aqui você pode implementar lógica para mostrar conteúdo diferente
            if (tabName === 'documentos') {
                renderizarTabelaRecebimentos();
            } else if (tabName === 'historico') {
                mostrarHistorico();
            } else if (tabName === 'renegociacoes') {
                mostrarRenegociacoes();
            }
        });
    });
}

// Função para renderizar tabela de recebimentos
function renderizarTabelaRecebimentos() {
    const tbody = document.getElementById('tabelaRecebimentosBody');
    
    if (!recebimentosData || recebimentosData.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state">
                <td colspan="13">
                    <div class="empty-message">
                        <i class="fas fa-inbox"></i>
                        <p>Nenhum documento a receber encontrado</p>
                        <p class="empty-subtitle">Informe um cliente para visualizar os documentos</p>
                    </div>
                </td>
            </tr>
        `;
        atualizarValorReceber(0);
        return;
    }

    tbody.innerHTML = recebimentosData.map(doc => `
        <tr>
            <td><input type="checkbox" class="checkbox-documento" data-id="${doc.id}"></td>
            <td>${doc.docParc || '-'}</td>
            <td>${doc.emissao || '-'}</td>
            <td>${doc.vencimento || '-'}</td>
            <td>${doc.nota || '-'}</td>
            <td>R$ ${formatarValor(doc.bruto)}</td>
            <td>R$ ${formatarValor(doc.multa)}</td>
            <td>R$ ${formatarValor(doc.juros)}</td>
            <td>R$ ${formatarValor(doc.liquido)}</td>
            <td>${doc.descontoPerc || '0'}%</td>
            <td>R$ ${formatarValor(doc.descontoValor)}</td>
            <td><strong>R$ ${formatarValor(doc.receber)}</strong></td>
            <td>
                <button class="btn-opcoes-doc" onclick="abrirOpcoesDocumento(${doc.id})">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </td>
        </tr>
    `).join('');

    configurarCheckboxes();
    calcularTotalReceber();
}

// Função para formatar valores monetários
function formatarValor(valor) {
    if (!valor && valor !== 0) return '0,00';
    return parseFloat(valor).toFixed(2).replace('.', ',');
}

// Função para calcular total a receber
function calcularTotalReceber() {
    const total = recebimentosData.reduce((sum, doc) => sum + (doc.receber || 0), 0);
    atualizarValorReceber(total);
}

// Função para atualizar valor a receber no header
function atualizarValorReceber(valor) {
    const elemento = document.getElementById('valorReceber');
    if (elemento) {
        elemento.textContent = `R$ ${formatarValor(valor)}`;
    }
}

// Função para configurar checkboxes
function configurarCheckboxes() {
    const checkboxSelectAll = document.getElementById('checkboxSelectAll');
    const checkboxes = document.querySelectorAll('.checkbox-documento');

    if (checkboxSelectAll) {
        checkboxSelectAll.addEventListener('change', function() {
            checkboxes.forEach(cb => {
                cb.checked = this.checked;
            });
            atualizarDocumentosSelecionados();
        });
    }

    checkboxes.forEach(cb => {
        cb.addEventListener('change', function() {
            atualizarDocumentosSelecionados();
            
            // Atualizar checkbox "selecionar todos"
            const todosChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);
            if (checkboxSelectAll) {
                checkboxSelectAll.checked = todosChecked;
            }
        });
    });
}

// Função para atualizar documentos selecionados
function atualizarDocumentosSelecionados() {
    const checkboxes = document.querySelectorAll('.checkbox-documento:checked');
    documentosSelecionados = Array.from(checkboxes).map(cb => parseInt(cb.getAttribute('data-id')));
    console.log('Documentos selecionados:', documentosSelecionados);
}

// Função para pesquisar recebimentos
function realizarPesquisa() {
    const cliente = document.getElementById('filtroCliente').value;
    const documento = document.getElementById('filtroDocumento').value;
    const nota = document.getElementById('filtroNota').value;
    const dataVencimento = document.getElementById('filtroDataVencimento').value;
    const previsao = document.getElementById('filtroPrevisao').value;

    console.log('Pesquisando recebimentos...', { cliente, documento, nota, dataVencimento, previsao });

    if (!cliente.trim()) {
        alert('Por favor, informe um cliente para pesquisar.');
        return;
    }

    // Aqui você implementaria a chamada à API
    // Por enquanto, vamos manter vazio para simular a imagem
    recebimentosData = [];
    renderizarTabelaRecebimentos();
}

// Função para mostrar histórico
function mostrarHistorico() {
    const tbody = document.getElementById('tabelaRecebimentosBody');
    tbody.innerHTML = `
        <tr class="empty-state">
            <td colspan="13">
                <div class="empty-message">
                    <i class="fas fa-history"></i>
                    <p>Nenhum histórico de recebimento encontrado</p>
                </div>
            </td>
        </tr>
    `;
}

// Função para mostrar renegociações
function mostrarRenegociacoes() {
    const tbody = document.getElementById('tabelaRecebimentosBody');
    tbody.innerHTML = `
        <tr class="empty-state">
            <td colspan="13">
                <div class="empty-message">
                    <i class="fas fa-sync-alt"></i>
                    <p>Nenhuma renegociação encontrada</p>
                </div>
            </td>
        </tr>
    `;
}

// Função para abrir opções do documento
function abrirOpcoesDocumento(id) {
    console.log('Abrir opções do documento:', id);
    alert('Opções do documento serão implementadas em breve!');
}

// Função para configurar event listeners
function configurarEventListeners() {
    // Botão Pesquisar
    const btnPesquisar = document.getElementById('btnPesquisar');
    if (btnPesquisar) {
        btnPesquisar.addEventListener('click', realizarPesquisa);
    }

    // Enter nos campos de filtro
    const camposFiltro = ['filtroCliente', 'filtroDocumento', 'filtroNota'];
    camposFiltro.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) {
            campo.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    realizarPesquisa();
                }
            });
        }
    });

    // Botão Doc. Receber
    const btnDocReceber = document.getElementById('btnDocReceber');
    if (btnDocReceber) {
        btnDocReceber.addEventListener('click', function() {
            alert('Funcionalidade de criar documento a receber será implementada em breve!');
        });
    }

    // Botão Mais
    const btnMaisOpcoes = document.getElementById('btnMaisOpcoes');
    if (btnMaisOpcoes) {
        btnMaisOpcoes.addEventListener('click', function() {
            alert('Mais opções serão implementadas em breve!');
        });
    }

    // Botão Receber
    const btnReceber = document.getElementById('btnReceber');
    if (btnReceber) {
        btnReceber.addEventListener('click', function() {
            if (documentosSelecionados.length === 0) {
                alert('Selecione ao menos um documento para receber.');
                return;
            }
            alert(`Processar recebimento de ${documentosSelecionados.length} documento(s)`);
        });
    }

    // Botão Renegociar
    const btnRenegociar = document.getElementById('btnRenegociar');
    if (btnRenegociar) {
        btnRenegociar.addEventListener('click', function() {
            if (documentosSelecionados.length === 0) {
                alert('Selecione ao menos um documento para renegociar.');
                return;
            }
            alert(`Renegociar ${documentosSelecionados.length} documento(s)`);
        });
    }

    // Botão Limpar
    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', function() {
            document.getElementById('filtroCliente').value = '';
            document.getElementById('filtroDocumento').value = '';
            document.getElementById('filtroNota').value = '';
            document.getElementById('filtroDataVencimento').value = '';
            document.getElementById('filtroPrevisao').value = 'todos';
            recebimentosData = [];
            renderizarTabelaRecebimentos();
        });
    }

    // Botão Voltar
    const btnVoltar = document.getElementById('btnVoltar');
    if (btnVoltar) {
        btnVoltar.addEventListener('click', function() {
            window.history.back();
        });
    }
}

// Inicializar página
function inicializarRecebimentos() {
    configurarTabs();
    configurarEventListeners();
    renderizarTabelaRecebimentos();
}

// Aguardar carregamento da página
window.addEventListener('DOMContentLoaded', function() {
    inicializarRecebimentos();
});
