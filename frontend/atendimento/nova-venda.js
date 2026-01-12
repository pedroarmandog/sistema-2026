// Copiado de frontend/dashboard.js - funcionalidades do menu e header

console.log('🚀 menu.js carregado (snippet do dashboard)');

function detectarIDsDuplicados() {
    const idsParaVerificar = [
        'clienteMenuItem', 'clienteSubmenu',
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
        inicializarNovaVenda();
    }, 200);
});

/* ========================================
   NOVA VENDA - FUNCIONALIDADES
   ======================================== */

// Variáveis globais para Nova Venda
let itensVenda = [];
let totais = {
    bruto: 0,
    desconto: 0,
    acrescimo: 0,
    final: 0
};

function inicializarNovaVenda() {
    console.log('🛒 Inicializando Nova Venda...');
    
    // Elementos do formulário
    const quantidade = document.getElementById('quantidade');
    const valorUnitario = document.getElementById('valorUnitario');
    const descontoPercent = document.getElementById('descontoPercent');
    const totalValue = document.querySelector('.total-value');
    const btnAdicionar = document.getElementById('adicionarItem');
    
    // Função para calcular total do item (global para ser acessível)
    window.calcularTotalItem = function() {
        const qtd = parseFloat(quantidade.value) || 0;
        const valor = parseFloat(valorUnitario.value.replace(',', '.')) || 0;
        const desc = parseFloat(descontoPercent.value) || 0;
        
        let total = qtd * valor;
        
        if (desc > 0) {
            total = total - (total * desc / 100);
        }
        
        totalValue.textContent = total.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        
        return total;
    };
    
    // Função para atualizar totais gerais
    function atualizarTotaisGerais() {
        totais.bruto = itensVenda.reduce((sum, item) => sum + item.totalBruto, 0);
        totais.final = itensVenda.reduce((sum, item) => sum + item.totalFinal, 0);
        totais.desconto = totais.bruto - totais.final;
        
        // Atualizar elementos na tela
        document.querySelector('.total-item:nth-child(1) .valor').textContent = 
            `R$ ${totais.bruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        document.querySelector('.total-item:nth-child(2) .valor').textContent = 
            totais.desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        document.querySelector('.total-item:nth-child(4) .valor').textContent = 
            `R$ ${totais.final.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
    
    // Função para adicionar item à lista
    // Função para adicionar item à lista
    async function adicionarItem() {
        const qtd = parseFloat(quantidade.value) || 0;
        const valor = parseFloat(valorUnitario.value.replace(',', '.')) || 0;
        const desc = parseFloat(descontoPercent.value) || 0;
        const produtoNome = document.getElementById('pesquisarProduto').value;
        
        console.log('➕ Tentando adicionar item:', { qtd, valor, desc, produtoNome });
        
        if (qtd <= 0 || valor <= 0) {
            mostrarNotificacao('error', 'Por favor, informe quantidade e valor válidos.');
            return;
        }
        
        if (!produtoNome.trim()) {
            mostrarNotificacao('error', 'Por favor, informe o nome do produto.');
            return;
        }
        
        // Validar estoque do produto
        const produtosSistema = await carregarProdutosDoSistema();
        const produtoEncontrado = produtosSistema.find(p => p.nome === produtoNome);
        
        if (produtoEncontrado) {
            // Verificar se é produto físico (não é serviço ou plano)
            if (produtoEncontrado.tipo === 'produto') {
                const estoqueDisponivel = produtoEncontrado.estoqueAtual || 0;
                const permiteNegativo = !!produtoEncontrado.permiteEstoqueNegativo;

                // Se não permitir estoque negativo, aplicar validações rígidas
                if (!permiteNegativo) {
                    if (estoqueDisponivel <= 0) {
                        mostrarNotificacao('warning', 'Quantidade informada não disponível no estoque');
                        return;
                    }

                    if (qtd > estoqueDisponivel) {
                        mostrarNotificacao('warning', `Quantidade informada (${qtd}) não disponível no estoque. Disponível: ${estoqueDisponivel} unidades`);
                        return;
                    }
                } else {
                    // Permite estoque negativo: não bloquear a venda mesmo que estoque esteja zerado ou negativo
                    // Contudo, validar quantidade positiva
                    if (qtd <= 0) {
                        mostrarNotificacao('warning', 'Quantidade informada deve ser maior que zero');
                        return;
                    }
                }
            }
        }
        
        const totalBruto = qtd * valor;
        const totalFinal = calcularTotalItem();
        
        const item = {
            id: Date.now(),
            produto: produtoEncontrado || { nome: produtoNome, id: null },
            quantidade: qtd,
            valorUnitario: valor,
            desconto: desc,
            totalBruto: totalBruto,
            totalFinal: totalFinal
        };
        
        console.log('📦 Item criado:', item);
        console.log('📋 Array antes:', itensVenda.length, 'itens');
        
        itensVenda.push(item);
        
        console.log('📋 Array depois:', itensVenda.length, 'itens');
        console.log('🎨 Renderizando...');
        
        renderizarItens();
        limparFormulario();
        atualizarTotaisGerais();
        
        mostrarNotificacao('success', `${produtoNome} adicionado com sucesso!`);
        console.log('✅ Item adicionado com sucesso!');
    }
    
    // Função para renderizar lista de itens
    function renderizarItens() {
        console.log('🎨 renderizarItens() chamada. Total de itens:', itensVenda.length);
        
        const listaItens = document.querySelector('.itens-lista');
        
        if (!listaItens) {
            console.error('❌ Elemento .itens-lista não encontrado!');
            return;
        }
        
        if (itensVenda.length === 0) {
            listaItens.innerHTML = `
                <div style="color: #999; text-align: center; padding: 20px;">
                    <i class="fas fa-box" style="font-size: 48px; margin-bottom: 16px; display: block; opacity: 0.3;"></i>
                    Nenhum item adicionado ainda
                </div>
            `;
            console.log('📭 Nenhum item para renderizar');
            return;
        }

        console.log('📦 Renderizando', itensVenda.length, 'itens...');
        
        const itensHTML = itensVenda.map((item, index) => {
            console.log(`  Item ${index + 1}:`, item);
            return `
            <div class="item-adicionado" data-id="${item.id}">
                <div class="item-numero">${index + 1}</div>
                <div class="item-content">
                    <div class="item-produto">${item.produto.nome || item.produto}</div>
                    <div class="item-info">
                        ${item.quantidade} UN x ${item.valorUnitario.toLocaleString('pt-BR', { 
                            style: 'currency', 
                            currency: 'BRL' 
                        })}
                    </div>
                </div>
                <div class="item-total-valor">
                    ${item.totalFinal.toLocaleString('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                    })}
                </div>
                <button class="item-remover" onclick="removerItem(${item.id})" title="Remover item">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        }).join('');

        listaItens.innerHTML = itensHTML;
        console.log('✅ Itens renderizados com sucesso!');
    }
    
    // Função para limpar formulário
    function limparFormulario() {
        document.getElementById('pesquisarProduto').value = '';
        quantidade.value = '1';
        valorUnitario.value = '';
        descontoPercent.value = '';
        totalValue.textContent = '0,00';
    }
    
    // Função para remover item (exposta globalmente)
    window.removerItem = function(id) {
        const itemRemovido = itensVenda.find(item => item.id === id);
        if (itemRemovido) {
            itensVenda = itensVenda.filter(item => item.id !== id);
            renderizarItens();
            atualizarTotaisGerais();
            mostrarNotificacao('info', 'Produto removido com sucesso');
            console.log('🗑️ Item removido:', itemRemovido.produto);
        }
    };
    
    // Event listeners
    if (quantidade) {
        quantidade.addEventListener('input', calcularTotalItem);
        // Adicionar validação de estoque em tempo real
        quantidade.addEventListener('input', function() {
            validarEstoqueEmTempoReal();
        });
    }
    if (valorUnitario) {
        valorUnitario.addEventListener('input', function() {
            calcularTotalItem();
            // Calcular porcentagem quando valor unitário mudar
            calcularPorcentagemDesconto();
        });
        valorUnitario.addEventListener('blur', function() {
            // Formatar valor ao sair do campo
            const valor = parseFloat(this.value.replace(',', '.')) || 0;
            this.value = valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        });
    }
    if (descontoPercent) {
        descontoPercent.addEventListener('input', calcularTotalItem);
        // Quando sair do campo de porcentagem ou pressionar Enter
        descontoPercent.addEventListener('blur', calcularValorFinalComDesconto);
        descontoPercent.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                calcularValorFinalComDesconto();
                this.blur(); // Remove foco do campo
            }
        });
    }
    if (btnAdicionar) btnAdicionar.addEventListener('click', adicionarItem);
    
    // Adicionar evento Enter para todos os campos do formulário de item
    const camposFormulario = [
        'pesquisarProduto',
        'quantidade', 
        'valorUnitario',
        'descontoPercent'
    ];
    
    camposFormulario.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Enter pressionado no campo:', campoId);
                    adicionarItem();
                }
            });
        }
    });
    
    console.log('✅ Event listeners de Enter configurados');
    
    // Função para calcular porcentagem de desconto baseada no valor original vs atual
    function calcularPorcentagemDesconto() {
        const produtoNome = document.getElementById('pesquisarProduto').value.trim();
        if (!produtoNome) return;
        
        const produtosSistema = carregarProdutosDoSistema();
        const produtoEncontrado = produtosSistema.find(p => 
            p.nome.toLowerCase() === produtoNome.toLowerCase()
        );
        
        if (produtoEncontrado) {
            const precoOriginal = produtoEncontrado.preco;
            const valorAtual = parseFloat(document.getElementById('valorUnitario').value.replace(',', '.')) || 0;
            
            if (precoOriginal > 0 && valorAtual > 0 && valorAtual !== precoOriginal) {
                // Calcular porcentagem de diferença
                const percentual = ((precoOriginal - valorAtual) / precoOriginal) * 100;
                
                // Atualizar campo de porcentagem automaticamente
                document.getElementById('descontoPercent').value = Math.abs(percentual).toFixed(2);
                
                // Mostrar indicador visual se é desconto ou acréscimo
                const descontoField = document.getElementById('descontoPercent');
                if (percentual > 0) {
                    // É desconto (valor atual menor que original)
                    descontoField.style.color = '#28a745'; // Verde para desconto
                    descontoField.title = `Desconto de ${percentual.toFixed(2)}% em relação ao preço original (R$ ${precoOriginal.toFixed(2)})`;
                } else {
                    // É acréscimo (valor atual maior que original) 
                    descontoField.style.color = '#ffc107'; // Amarelo para acréscimo
                    descontoField.title = `Acréscimo de ${Math.abs(percentual).toFixed(2)}% em relação ao preço original (R$ ${precoOriginal.toFixed(2)})`;
                }
                
                // Atualizar total
                calcularTotalItem();
                
                console.log(`📊 Preço original: R$ ${precoOriginal.toFixed(2)} | Preço atual: R$ ${valorAtual.toFixed(2)} | Diferença: ${percentual.toFixed(2)}%`);
            } else {
                // Limpar porcentagem se valores forem iguais
                document.getElementById('descontoPercent').value = '';
                document.getElementById('descontoPercent').style.color = '';
                document.getElementById('descontoPercent').title = '';
            }
        }
    }
    
    // Função para calcular valor final quando porcentagem for aplicada
    function calcularValorFinalComDesconto() {
        const produtoNome = document.getElementById('pesquisarProduto').value.trim();
        const percentualDesconto = parseFloat(document.getElementById('descontoPercent').value) || 0;
        
        if (!produtoNome || percentualDesconto === 0) return;
        
        const produtosSistema = carregarProdutosDoSistema();
        const produtoEncontrado = produtosSistema.find(p => 
            p.nome.toLowerCase() === produtoNome.toLowerCase()
        );
        
        if (produtoEncontrado) {
            const precoOriginal = produtoEncontrado.preco;
            
            // Calcular novo valor com desconto/acréscimo aplicado
            let valorFinal;
            const descontoField = document.getElementById('descontoPercent');
            
            // Verificar se é desconto ou acréscimo baseado na cor do campo
            if (descontoField.style.color === 'rgb(40, 167, 69)' || !descontoField.style.color) {
                // Verde = desconto ou campo neutro = assumir desconto
                valorFinal = precoOriginal - (precoOriginal * percentualDesconto / 100);
            } else {
                // Amarelo = acréscimo
                valorFinal = precoOriginal + (precoOriginal * percentualDesconto / 100);
            }
            
            // Garantir que valor final seja positivo
            valorFinal = Math.max(0, valorFinal);
            
            // Atualizar campo valor unitário
            document.getElementById('valorUnitario').value = valorFinal.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
            });
            
            // Atualizar total
            calcularTotalItem();
            
            // Feedback visual no campo de desconto
            descontoField.style.backgroundColor = '#f0f8f0';
            setTimeout(() => {
                descontoField.style.backgroundColor = '';
            }, 1000);
            
            console.log(`💰 ${percentualDesconto}% aplicado | Preço original: R$ ${precoOriginal.toFixed(2)} | Valor final: R$ ${valorFinal.toFixed(2)}`);
        } else {
            // Se produto não encontrado, aplicar desconto no valor atual
            const valorAtual = parseFloat(document.getElementById('valorUnitario').value.replace(',', '.')) || 0;
            if (valorAtual > 0) {
                const valorComDesconto = valorAtual - (valorAtual * percentualDesconto / 100);
                const valorFinal = Math.max(0, valorComDesconto);
                
                document.getElementById('valorUnitario').value = valorFinal.toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                });
                
                calcularTotalItem();
                console.log(`💰 Desconto aplicado no valor atual: ${percentualDesconto}% | R$ ${valorAtual.toFixed(2)} → R$ ${valorFinal.toFixed(2)}`);
            }
        }
    }
    
    // Função para validar estoque em tempo real
    function validarEstoqueEmTempoReal() {
        const qtd = parseFloat(document.getElementById('quantidade').value) || 0;
        const produtoNome = document.getElementById('pesquisarProduto').value;
        
        if (!produtoNome.trim() || qtd === 0) return;
        
        const produtosSistema = carregarProdutosDoSistema();
        const produtoEncontrado = produtosSistema.find(p => p.nome === produtoNome);
        
        if (produtoEncontrado && produtoEncontrado.tipo === 'produto') {
            const estoqueDisponivel = produtoEncontrado.estoqueAtual || 0;
            const quantidadeField = document.getElementById('quantidade');
            
            if (qtd > estoqueDisponivel) {
                // Destacar campo em vermelho
                quantidadeField.style.borderColor = '#dc3545';
                quantidadeField.style.backgroundColor = '#fff5f5';
                
                // Remover destaque após 3 segundos
                setTimeout(() => {
                    quantidadeField.style.borderColor = '';
                    quantidadeField.style.backgroundColor = '';
                }, 3000);
            } else {
                // Remover qualquer destaque de erro
                quantidadeField.style.borderColor = '';
                quantidadeField.style.backgroundColor = '';
            }
        }
    }
    
    // Configurar Enter no campo de produto
    const pesquisarProduto = document.getElementById('pesquisarProduto');
    if (pesquisarProduto) {
        pesquisarProduto.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarItem();
            }
        });
        
        // Configurar dropdown de produtos
        pesquisarProduto.addEventListener('input', debounce(buscarProdutos, 300));
        pesquisarProduto.addEventListener('focus', function() {
            if (pesquisarProduto.value.trim().length > 0) {
                buscarProdutos();
            }
        });
        
        // Navegação por teclado no dropdown
        pesquisarProduto.addEventListener('keydown', function(e) {
            const dropdown = document.getElementById('produtosDropdown');
            const items = dropdown.querySelectorAll('.produto-item');
            let selectedIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));
            
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selectedIndex < items.length - 1) {
                    if (selectedIndex >= 0) items[selectedIndex].classList.remove('selected');
                    selectedIndex++;
                    items[selectedIndex].classList.add('selected');
                    items[selectedIndex].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedIndex > 0) {
                    items[selectedIndex].classList.remove('selected');
                    selectedIndex--;
                    items[selectedIndex].classList.add('selected');
                    items[selectedIndex].scrollIntoView({ block: 'nearest' });
                }
            } else if (e.key === 'Enter' && selectedIndex >= 0) {
                e.preventDefault();
                items[selectedIndex].click();
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('produtosDropdown');
            const searchContainer = document.querySelector('.search-produto');
            if (!searchContainer.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }
    
    // Botões de ação
    const btnFinalizar = document.querySelector('.btn-finalizar');
    const btnNova = document.querySelector('.btn-nova');
    
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', async function() {
            if (itensVenda.length === 0) {
                mostrarNotificacao('warning', 'Adicione pelo menos um item para finalizar a venda.');
                return;
            }
            
            // Verificar se o caixa está aberto
            try {
                const response = await fetch('http://localhost:3000/api/caixas/aberto');
                const caixa = await response.json();
                
                if (!caixa || caixa.aberto !== true) {
                    mostrarNotificacaoAmarela('Caixa Fechado - Abra o caixa para realizar vendas');
                    return;
                }
            } catch (error) {
                console.error('Erro ao verificar status do caixa:', error);
                mostrarNotificacaoAmarela('Não foi possível verificar o status do caixa');
                return;
            }
            
            // Cliente é opcional - pode finalizar sem selecionar cliente
            
            // Abrir modal de pagamento
            abrirModalPagamento();
        });
    }
    
    if (btnNova) {
        btnNova.addEventListener('click', function() {
            if (itensVenda.length > 0) {
                if (!confirm('Deseja iniciar uma nova venda? Os dados atuais serão perdidos.')) {
                    return;
                }
            }
            
            // Resetar tudo
            itensVenda = [];
            totais = { bruto: 0, desconto: 0, acrescimo: 0, final: 0 };
            
            // Limpar campos
            limparFormulario();
            document.getElementById('pesquisarCliente').value = '';
            document.getElementById('pesquisarProfissional').value = '';
            document.querySelectorAll('.pagamento-section input').forEach(input => input.value = '');
            document.getElementById('observacoes').value = '';
            
            // Atualizar displays
            renderizarItens();
            atualizarTotaisGerais();
            
            console.log('🆕 Nova venda iniciada');
        });
    }
    
    // Inicializar com estado limpo
    renderizarItens();
    atualizarTotaisGerais();
    
    console.log('✅ Nova Venda inicializada com sucesso!');
}

// ========================================
// FUNCIONALIDADE DO DROPDOWN DE PRODUTOS
// ========================================

// Função para debounce (evitar muitas requisições)
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// Função para carregar produtos do sistema (via API)
async function carregarProdutosDoSistema() {
    console.log('🔍 Carregando produtos do sistema...');
    
    try {
        // Tentar carregar produtos da API
        console.log('📡 Buscando produtos da API...');
        const produtosSistema = await ApiClient.getProdutos();
        console.log('📦 Resposta da API:', produtosSistema);
        
        // Verificar se a resposta é válida
        if (Array.isArray(produtosSistema) && produtosSistema.length > 0) {
            console.log('✅ Produtos carregados da API:', produtosSistema.length);
            
            // Normalizar dados para garantir que todas as propriedades existem
            return produtosSistema.map(p => ({
                id: p.id || '',
                nome: p.nome || 'Sem nome',
                categoria: p.categoria || 'Sem categoria',
                tipo: p.tipo || 'produto',
                preco: parseFloat(p.preco) || 0,
                estoqueAtual: parseInt(p.estoqueAtual) || 0,
                finalidade: p.finalidade || '',
                marca: p.marca || '',
                // normalizar flag permiteEstoqueNegativo (aceita 'sim'/'nao', true/false)
                permiteEstoqueNegativo: (function(v){ try { if (v===true) return true; const s = (v||'').toString().toLowerCase(); return (s === 'sim' || s === 'true' || s === '1'); } catch(e){ return false; } })(p.permiteEstoqueNegativo)
            }));
        }
        
        console.log('⚠️ API retornou vazio ou inválido, usando fallback');
        
    } catch (error) {
        console.error('❌ Erro ao carregar produtos da API:', error);
        console.log('🔄 Usando produtos de fallback');
    }
    
    // Produtos de fallback (sempre disponível em caso de erro)
    const produtosFallback = [
            {
                id: 1,
                nome: 'PA HIGIENICA CARA DE GATO AZUL',
                categoria: 'Higiene',
                tipo: 'produto',
                preco: 3.00,
                estoqueAtual: 0
            },
            {
                id: 2,
                nome: 'BUTOX P CE 25 - 20ML',
                categoria: 'Farmácia',
                tipo: 'produto',
                preco: 7.00,
                estoqueAtual: 40
            },
            {
                id: 3,
                nome: 'Ganadol Pomada Anti-infecciosa e Cicatrizante 50g',
                categoria: 'Farmácia',
                tipo: 'produto',
                preco: 40.00,
                estoqueAtual: 27
            },
            {
                id: 4,
                nome: 'THUYA AVÍCOLA SIMÕES ORAL 20ML',
                categoria: 'Farmácia',
                tipo: 'produto',
                preco: 10.00,
                estoqueAtual: 5
            },
            {
                id: 5,
                nome: 'GOLDEN ADULTO RAÇA PEQ FRANGO E ARROZ 15KG',
                categoria: 'Rações',
                tipo: 'produto',
                preco: 131.00,
                estoqueAtual: 4
            },
            {
                id: 6,
                nome: 'GOLDEN COOKIE FILHOTE 400G',
                categoria: 'Ossos e Petiscos',
                tipo: 'produto',
                preco: 13.00,
                estoqueAtual: 0
            },
            {
                id: 7,
                nome: 'Ração N&D Prime Cordeiro e Blueberry Cães Adultos',
                categoria: 'Rações',
                tipo: 'produto',
                preco: 314.99,
                estoqueAtual: 15
            },
            {
                id: 8,
                nome: 'GOLDEN GATO CASTRADO SALMAO 10,1KG',
                categoria: 'Rações',
                tipo: 'produto',
                preco: 126.00,
                estoqueAtual: 4
            },
            {
                id: 9,
                nome: 'GOLDEN GATO FILHOTE FRANGO 1KG',
                categoria: 'Rações',
                tipo: 'produto',
                preco: 22.00,
                estoqueAtual: 0
            },
            {
                id: 10,
                nome: 'Banho e Tosa - Cães Pequeno Porte',
                categoria: 'Serviços',
                tipo: 'servico',
                preco: 50.00,
                estoqueAtual: 0
            },
            {
                id: 11,
                nome: 'Consulta Veterinária',
                categoria: 'Serviços',
                tipo: 'servico',
                preco: 120.00,
                estoqueAtual: 0
            },
            {
                id: 12,
                nome: 'Plano Mensal - Banho Ilimitado',
                categoria: 'Planos',
                tipo: 'plano',
                preco: 199.90,
            estoqueAtual: 0
        }
    ];
    
    console.log('✅ Retornando produtos de fallback:', produtosFallback.length);
    return produtosFallback;
}// Função para buscar produtos
async function buscarProdutos() {
    console.log('🔍 buscarProdutos() iniciado');
    const termoPesquisa = document.getElementById('pesquisarProduto').value.trim();
    const dropdown = document.getElementById('produtosDropdown');
    
    console.log('🔤 Termo de pesquisa:', termoPesquisa);
    
    if (termoPesquisa.length < 1) {
        dropdown.style.display = 'none';
        return;
    }
    
    // Mostrar loading
    dropdown.innerHTML = '<div class="loading" style="padding: 15px; text-align: center; color: #666;">Carregando produtos...</div>';
    dropdown.style.display = 'block';
    
    try {
        // Carregar produtos do sistema
        console.log('📦 Chamando carregarProdutosDoSistema()...');
        const produtosSistema = await carregarProdutosDoSistema();
        console.log('✅ Produtos recebidos:', produtosSistema.length);
        
        // Filtrar produtos baseado no termo de pesquisa (com proteção contra undefined)
        const produtosFiltrados = produtosSistema.filter(produto => {
            if (!produto) return false;
            
            const nome = (produto.nome || '').toLowerCase();
            const id = String(produto.id || '');
            const categoria = (produto.categoria || '').toLowerCase();
            const tipo = (produto.tipo || '').toLowerCase();
            const termo = termoPesquisa.toLowerCase();
            
            return nome.includes(termo) ||
                   id.includes(termoPesquisa) ||
                   categoria.includes(termo) ||
                   tipo.includes(termo);
        });
        
        console.log('🎯 Produtos filtrados:', produtosFiltrados.length);
        
        if (produtosFiltrados.length === 0) {
            dropdown.innerHTML = '<div class="produto-item"><div class="produto-nome">Nenhum produto encontrado</div></div>';
            dropdown.style.display = 'block';
            return;
        }
        
        // Função para destacar o termo pesquisado
        function destacarTermo(texto, termo) {
            if (!termo) return texto;
            const regex = new RegExp(`(${termo})`, 'gi');
            return texto.replace(regex, '<strong>$1</strong>');
        }
        
        // Função para determinar cor do estoque
        function getEstoqueClass(produto) {
            const estoque = produto.estoqueAtual || 0;
            if (produto.tipo === 'servico' || produto.tipo === 'plano') {
                return 'estoque-disponivel'; // Serviços sempre disponíveis
            }
            if (estoque === 0) return 'estoque-indisponivel';
            if (estoque <= 2) return 'estoque-baixo';
            return 'estoque-disponivel';
        }
        
        // Função para exibir texto do estoque
        function getEstoqueTexto(produto) {
            if (produto.tipo === 'servico' || produto.tipo === 'plano') {
                return 'Disponível';
            }
            const estoque = produto.estoqueAtual || 0;
            return estoque + ' UN';
        }
        
        // Renderizar produtos no dropdown
        dropdown.innerHTML = produtosFiltrados.map(produto => {
            const nome = produto.nome || 'Sem nome';
            const id = produto.id || '';
            const tipo = produto.tipo || 'produto';
            const preco = parseFloat(produto.preco) || 0;
            const categoria = produto.categoria || 'Sem categoria';
            const estoqueAtual = parseInt(produto.estoqueAtual) || 0;
            
            const tipoCapitalizado = tipo.charAt(0).toUpperCase() + tipo.slice(1);
            
            return `
                <div class="produto-item" onclick="selecionarProduto('${id}')">
                    <div class="produto-nome">${destacarTermo(nome, termoPesquisa)}</div>
                    <div class="produto-info">
                        <div class="produto-codigo">ID: ${id} | ${destacarTermo(tipoCapitalizado, termoPesquisa)}</div>
                        <div class="produto-preco">R$ ${preco.toFixed(2)}</div>
                    </div>
                    <div class="produto-info">
                        <div class="produto-categoria">${destacarTermo(categoria, termoPesquisa)}</div>
                        <div class="produto-estoque ${getEstoqueClass(produto)}">
                            ${getEstoqueTexto(produto)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        dropdown.style.display = 'block';
        console.log('✅ Dropdown renderizado com sucesso');
        
    } catch (error) {
        console.error('❌ Erro em buscarProdutos:', error);
        dropdown.innerHTML = '<div class="produto-item"><div class="produto-nome" style="color: red;">Erro ao carregar produtos</div></div>';
        dropdown.style.display = 'block';
    }
}

// Função para selecionar um produto do dropdown
async function selecionarProduto(produtoId) {
    console.log('🎯 Selecionando produto ID:', produtoId);
    
    const produtosSistema = await carregarProdutosDoSistema();
    const produto = produtosSistema.find(p => String(p.id) === String(produtoId));
    
    if (!produto) {
        console.error('❌ Produto não encontrado:', produtoId);
        mostrarNotificacao('error', 'Produto não encontrado');
        return;
    }
    
    console.log('✅ Produto encontrado:', produto);
    
    // Preencher campos do formulário
    document.getElementById('pesquisarProduto').value = produto.nome;
    document.getElementById('valorUnitario').value = produto.preco.toFixed(2);
    
    // Limpar campo de desconto ao selecionar novo produto
    document.getElementById('descontoPercent').value = '';
    
    // Fechar dropdown
    document.getElementById('produtosDropdown').style.display = 'none';
    
    // Calcular total
    calcularTotalItem();
    
    // Focar no campo quantidade para facilitar o workflow
    document.getElementById('quantidade').focus();
    document.getElementById('quantidade').select();
    
    console.log('✅ Produto selecionado:', produto.nome, 'R$', produto.preco);
}

// ========================================
// SISTEMA DE NOTIFICAÇÕES
// ========================================

// Função para mostrar notificação
function mostrarNotificacao(tipo, mensagem) {
    // Remover notificações existentes
    const notificacoesExistentes = document.querySelectorAll('.notification');
    notificacoesExistentes.forEach(notif => notif.remove());
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${tipo}`;
    
    // Definir ícone baseado no tipo
    let icone = '';
    switch(tipo) {
        case 'success':
            icone = 'fas fa-check-circle';
            break;
        case 'error':
            icone = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icone = 'fas fa-exclamation-triangle';
            break;
        case 'info':
            icone = 'fas fa-info-circle';
            break;
        default:
            icone = 'fas fa-info-circle';
    }
    
    notification.innerHTML = `
        <i class="${icone}"></i>
        <span>${mensagem}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Adicionar ao body
    document.body.appendChild(notification);
    
    // Auto-remover após 4 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }
    }, 4000);
}

// Adicionar animação de saída ao CSS (via JavaScript)
if (!document.getElementById('notification-animations')) {
    const style = document.createElement('style');
    style.id = 'notification-animations';
    style.textContent = `
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }

        .notification {
            position: fixed !important;
            top: 18px !important;
            right: 18px !important;
            z-index: 999999 !important;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 8px 20px rgba(0,0,0,0.12);
            font-family: Arial, Helvetica, sans-serif;
            color: #333;
            min-width: 260px;
            max-width: 420px;
            cursor: default;
            animation: none;
        }

        .notification i { font-size: 18px; }
        .notification span { flex: 1; font-size: 14px; }
        .notification .notification-close { background: transparent; border: none; color: inherit; cursor: pointer; }

        .notification-success { background: linear-gradient(180deg,#e6fbf0,#d9f7ea); color: #155724; border: 1px solid #c3efd8; }
        .notification-error { background: linear-gradient(180deg,#ffe6e6,#ffd9d9); color: #7a1212; border: 1px solid #ffcfcf; }
        .notification-info { background: linear-gradient(180deg,#e8f2ff,#dceaff); color: #0b3b66; border: 1px solid #cfe0ff; }
        .notification-warning { background: linear-gradient(180deg,#fffbea,#fff3cd); color: #6b4f00; border: 1px solid #f0de7a; }
    `;
    document.head.appendChild(style);
}

// ========================================
// SISTEMA DE BUSCA DE CLIENTES E PROFISSIONAIS
// ========================================

// Variáveis globais para controle
let clienteSelecionado = null;
let profissionalSelecionado = null;

// Helper: fetch com timeout usando AbortController (copiado de clientes.js)
function fetchWithTimeout(resource, options = {}, timeout = 4000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const finalOpts = Object.assign({}, options, { signal: controller.signal });
    return fetch(resource, finalOpts).finally(() => clearTimeout(id));
}

// Função para carregar clientes da API real (modelo copiado de clientes.js)
async function carregarClientesDoSistema() {
    console.log('🔍 INÍCIO carregarClientesDoSistema (nova-venda)...');
    
    try {
        console.log('📡 Fazendo fetch para API de clientes...');
        // Usar fetch com timeout e tentar localhost como preferência, depois fallback
        let response = null;
        try {
            response = await fetchWithTimeout('http://localhost:3000/api/clientes', {}, 3000);
        } catch (err) {
            console.warn('⚠️ Fallback para rota relativa por timeout/erro', err && err.message);
            try {
                response = await fetchWithTimeout('/api/clientes', {}, 2500);
            } catch (err2) {
                throw err2;
            }
        }
        
        console.log('📡 Response status:', response && response.status);
        if (!response || !response.ok) {
            throw new Error(`HTTP error! status: ${response ? response.status : 'no-response'}`);
        }
        
        const data = await response.json();
        console.log('📄 Dados recebidos da API:', data);
        
        // A API retorna {success: true, clientes: [...]}
        if (data.success && Array.isArray(data.clientes)) {
            console.log('🎯 Clientes carregados da API:', data.clientes.length);
            return data.clientes;
        } else {
            console.error('❌ Formato de resposta inválido:', data);
            throw new Error('Formato de resposta inválido');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar clientes da API:', error);
        
        // Fallback para dados mock apenas em caso de erro
        console.log('🔄 Usando dados mock como fallback...');
        const clientesMock = [
            {
                id: 1,
                codigo: '001',
                nome: 'João Silva',
                telefone: '(11) 99999-8888',
                email: 'joao@email.com',
                endereco: 'Rua A, 123'
            },
            {
                id: 2,
                codigo: '002', 
                nome: 'Maria Santos',
                telefone: '(11) 88888-7777',
                email: 'maria@email.com',
                endereco: 'Av. B, 456'
            },
            {
                id: 3,
                codigo: '003',
                nome: 'Pedro Costa',
                telefone: '(11) 77777-6666',
                email: 'pedro@email.com',
                endereco: 'Rua C, 789'
            },
            {
                id: 4,
                codigo: '004',
                nome: 'Ana Oliveira',
                telefone: '(11) 66666-5555',
                email: 'ana@email.com',
                endereco: 'Av. D, 321'
            },
            {
                id: 5,
                codigo: '005',
                nome: 'Carlos Souza',
                telefone: '(11) 55555-4444',
                email: 'carlos@email.com',
                endereco: 'Rua E, 654'
            }
        ];
        console.log('📋 Usando dados mock de clientes:', clientesMock.length);
        return clientesMock;
    }
}// Função para carregar profissionais do sistema
// TODO: Criar endpoint /api/profissionais no backend
async function carregarProfissionaisDoSistema() {
    try {
        // Por enquanto, usar dados mock (futuramente: await ApiClient.getProfissionais())
        let profissionaisSistema = [];
        
        // Profissionais de fallback (dados mock)
        if (profissionaisSistema.length === 0) {
            profissionaisSistema = [
                {
                    id: 1,
                    codigo: '1035',
                    nome: 'Juninho Play',
                    telefone: '(11) 5555-4444',
                    especialidade: 'Veterinário',
                    status: 'ativo'
                },
                {
                    id: 2,
                    codigo: '759',
                    nome: 'Pedro Armando',
                    telefone: '(11) 4444-3333',
                    especialidade: 'Auxiliar Veterinário',
                    status: 'ativo'
                }
            ];
        }
        
        return profissionaisSistema;
    } catch (error) {
        console.error('Erro ao carregar profissionais:', error);
        return [];
    }
}

// Função para filtrar e exibir clientes
async function buscarClientes(termo) {
    const dropdown = document.getElementById('clientesDropdown');
    
    if (!termo.trim()) {
        dropdown.style.display = 'none';
        return;
    }
    
    // Mostrar loading
    dropdown.innerHTML = '<div class="loading">Carregando clientes...</div>';
    dropdown.style.display = 'block';
    
    try {
        // Carregar clientes
        const clientes = await carregarClientesDoSistema();
        console.log('🔍 Buscando clientes com termo:', termo, 'Total:', clientes.length);
        
        // Filtrar clientes
        const clientesFiltrados = clientes.filter(cliente => 
            cliente.nome.toLowerCase().includes(termo.toLowerCase()) ||
            cliente.telefone.includes(termo) ||
            String(cliente.codigo).includes(termo) ||
            (cliente.email && cliente.email.toLowerCase().includes(termo.toLowerCase()))
        );
        
        console.log('📋 Clientes filtrados:', clientesFiltrados.length);
        
        // Renderizar dropdown
        if (clientesFiltrados.length > 0) {
            dropdown.innerHTML = clientesFiltrados.map(cliente => `
                <div class="cliente-item" onclick="selecionarCliente(${cliente.id})">
                    <span class="nome">${cliente.nome}</span>
                    <span class="detalhes">${cliente.telefone} • Cód: ${cliente.codigo}</span>
                </div>
            `).join('');
            dropdown.style.display = 'block';
        } else {
            dropdown.innerHTML = '<div class="no-results">Nenhum cliente encontrado</div>';
            dropdown.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Erro ao buscar clientes:', error);
        dropdown.innerHTML = '<div class="no-results">Erro ao carregar clientes</div>';
        dropdown.style.display = 'block';
    }
}

// Função para filtrar e exibir profissionais
async function buscarProfissionais(termo) {
    const dropdown = document.getElementById('profissionaisDropdown');
    
    if (!termo.trim()) {
        dropdown.style.display = 'none';
        return;
    }
    
    // Mostrar loading
    dropdown.innerHTML = '<div class="loading">Carregando profissionais...</div>';
    dropdown.style.display = 'block';
    
    try {
        // Carregar profissionais
        const profissionais = carregarProfissionaisDoSistema();
        console.log('🔍 Buscando profissionais com termo:', termo, 'Total:', profissionais.length);
        
        // Filtrar profissionais ativos
        const profissionaisFiltrados = profissionais.filter(profissional => 
            (profissional.status === 'ativo' || profissional.status === 'Ativo' || !profissional.status) &&
            (profissional.nome.toLowerCase().includes(termo.toLowerCase()) ||
            String(profissional.codigo).includes(termo) ||
            (profissional.especialidade && profissional.especialidade.toLowerCase().includes(termo.toLowerCase())))
        );
        
        console.log('📋 Profissionais filtrados:', profissionaisFiltrados.length);
        
        // Renderizar dropdown
        if (profissionaisFiltrados.length > 0) {
            dropdown.innerHTML = profissionaisFiltrados.map(profissional => `
                <div class="profissional-item" onclick="selecionarProfissional('${profissional.codigo}')">
                    <span class="nome">${profissional.nome}</span>
                    <span class="detalhes">${profissional.especialidade || profissional.telefone || 'Profissional'} • Cód: ${profissional.codigo}</span>
                </div>
            `).join('');
            dropdown.style.display = 'block';
        } else {
            dropdown.innerHTML = '<div class="no-results">Nenhum profissional encontrado</div>';
            dropdown.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ Erro ao buscar profissionais:', error);
        dropdown.innerHTML = '<div class="no-results">Erro ao carregar profissionais</div>';
        dropdown.style.display = 'block';
    }
}

// Função para selecionar um cliente
async function selecionarCliente(clienteId) {
    try {
        const clientes = await carregarClientesDoSistema();
        const cliente = clientes.find(c => c.id === clienteId);
        
        if (cliente) {
            clienteSelecionado = cliente;
            
            // Atualizar campo de pesquisa
            const inputCliente = document.getElementById('pesquisarCliente');
            inputCliente.value = cliente.nome;
            
            // Mostrar cliente selecionado
            const clienteSelecionadoDiv = document.getElementById('clienteSelecionado');
            clienteSelecionadoDiv.querySelector('.cliente-nome').textContent = cliente.nome;
            clienteSelecionadoDiv.querySelector('.cliente-detalhes').textContent = `${cliente.telefone} • Cód: ${cliente.codigo}`;
            clienteSelecionadoDiv.style.display = 'flex';
            
            // Ocultar dropdown
            document.getElementById('clientesDropdown').style.display = 'none';
            
            console.log('✅ Cliente selecionado:', cliente);
        } else {
            console.error('❌ Cliente não encontrado:', clienteId);
        }
    } catch (error) {
        console.error('❌ Erro ao selecionar cliente:', error);
    }
}

// Função para selecionar um profissional
function selecionarProfissional(profissionalCodigo) {
    const profissionais = carregarProfissionaisDoSistema();
    const profissional = profissionais.find(p => p.id === profissionalCodigo || p.codigo === profissionalCodigo || String(p.codigo) === String(profissionalCodigo));
    
    if (profissional) {
        profissionalSelecionado = profissional;
        
        // Atualizar campo de pesquisa
        const inputProfissional = document.getElementById('pesquisarProfissional');
        inputProfissional.value = profissional.nome;
        
        // Mostrar profissional selecionado
        const profissionalSelecionadoDiv = document.getElementById('profissionalSelecionado');
        profissionalSelecionadoDiv.querySelector('.profissional-nome').textContent = profissional.nome;
        profissionalSelecionadoDiv.querySelector('.profissional-detalhes').textContent = `${profissional.especialidade || 'Profissional'} • Cód: ${profissional.codigo}`;
        profissionalSelecionadoDiv.style.display = 'flex';
        
        // Ocultar dropdown
        document.getElementById('profissionaisDropdown').style.display = 'none';
        
        console.log('✅ Profissional selecionado:', profissional);
    }
}

// Função para remover cliente selecionado
function removerClienteSelecionado() {
    clienteSelecionado = null;
    document.getElementById('pesquisarCliente').value = '';
    document.getElementById('clienteSelecionado').style.display = 'none';
    console.log('🗑️ Cliente removido da venda');
}

// Função para remover profissional selecionado
function removerProfissionalSelecionado() {
    profissionalSelecionado = null;
    document.getElementById('pesquisarProfissional').value = '';
    document.getElementById('profissionalSelecionado').style.display = 'none';
    console.log('🗑️ Profissional removido da venda');
}

// Configurar eventos dos campos de busca
function configurarBuscaClientesProfissionais() {
    const inputCliente = document.getElementById('pesquisarCliente');
    const inputProfissional = document.getElementById('pesquisarProfissional');
    
    if (inputCliente) {
        console.log('✅ Configurando busca de clientes');
        
        // Evento de digitação para clientes
        inputCliente.addEventListener('input', debounce(async function() {
            const termo = this.value;
            console.log('🔍 Digitando termo cliente:', termo);
            await buscarClientes(termo);
            
            // Se limpar o campo, remover seleção
            if (!termo.trim() && clienteSelecionado) {
                removerClienteSelecionado();
            }
        }, 300));
        
        // Evento de foco
        inputCliente.addEventListener('focus', async function() {
            if (this.value && !clienteSelecionado) {
                await buscarClientes(this.value);
            }
        });
        
        // Evento de clique para mostrar dropdown se há valor
        inputCliente.addEventListener('click', async function() {
            if (this.value.length >= 1) {
                await buscarClientes(this.value);
            }
        });
    }
    
    if (inputProfissional) {
        console.log('✅ Configurando busca de profissionais');
        
        // Evento de digitação para profissionais
        inputProfissional.addEventListener('input', debounce(async function() {
            const termo = this.value;
            console.log('🔍 Digitando termo profissional:', termo);
            await buscarProfissionais(termo);
            
            // Se limpar o campo, remover seleção
            if (!termo.trim() && profissionalSelecionado) {
                removerProfissionalSelecionado();
            }
        }, 300));
        
        // Evento de foco
        inputProfissional.addEventListener('focus', async function() {
            if (this.value && !profissionalSelecionado) {
                await buscarProfissionais(this.value);
            }
        });
        
        // Evento de clique para mostrar dropdown se há valor
        inputProfissional.addEventListener('click', async function() {
            if (this.value.length >= 1) {
                await buscarProfissionais(this.value);
            }
        });
    }
    
    // Fechar dropdowns ao clicar fora
    document.addEventListener('click', function(e) {
        const clientesDropdown = document.getElementById('clientesDropdown');
        const profissionaisDropdown = document.getElementById('profissionaisDropdown');
        const searchCliente = document.querySelector('.search-cliente');
        const searchProfissional = document.querySelector('.search-profissional');
        
        if (searchCliente && !searchCliente.contains(e.target)) {
            clientesDropdown.style.display = 'none';
        }
        
        if (searchProfissional && !searchProfissional.contains(e.target)) {
            profissionaisDropdown.style.display = 'none';
        }
    });
    
    console.log('✅ Sistema de busca de clientes e profissionais configurado');
}

// Exportar dados selecionados para uso na finalização da venda
function obterDadosVenda() {
    return {
        cliente: clienteSelecionado,
        profissional: profissionalSelecionado,
        itens: itensVenda,
        totais: totais,
        observacoes: document.getElementById('observacoes').value
    };
}

// Atualizar a função de finalização da venda para incluir cliente e profissional
async function finalizarVendaComDados() {
    if (itensVenda.length === 0) {
        mostrarNotificacao('warning', 'Adicione pelo menos um item para finalizar a venda.');
        return;
    }
    
    // Verificar se o caixa está aberto
    try {
        const response = await fetch('http://localhost:3000/api/caixas/aberto');
        const caixa = await response.json();
        
        if (!caixa || caixa.aberto !== true) {
            mostrarNotificacaoAmarela('Caixa Fechado - Abra o caixa para realizar vendas');
            return;
        }
    } catch (error) {
        console.error('Erro ao verificar status do caixa:', error);
        mostrarNotificacaoAmarela('Não foi possível verificar o status do caixa');
        return;
    }
    
    // Cliente é opcional - pode finalizar sem selecionar cliente
    
    // Abrir modal de pagamento em vez do alert
    abrirModalPagamento();
}

// Função para mostrar notificação amarela de aviso
function mostrarNotificacaoAmarela(mensagem) {
    // Remover notificação existente
    const existente = document.querySelector('.notificacao-caixa-fechado');
    if (existente) {
        existente.remove();
    }

    // Criar notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'notificacao-caixa-fechado';
    notificacao.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <span>${mensagem}</span>
    `;

    // Estilos inline
    notificacao.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: linear-gradient(135deg, #fff9e6, #fffaed);
        color: #856404;
        padding: 14px 20px;
        border-radius: 8px;
        border-left: 4px solid #ffc107;
        box-shadow: 0 4px 16px rgba(255, 193, 7, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        min-width: 320px;
    `;

    document.body.appendChild(notificacao);

    // Remover após 5 segundos
    setTimeout(() => {
        notificacao.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notificacao.remove(), 300);
    }, 5000);
}

// Inicializar sistema completo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando sistema de busca...');
    configurarBuscaClientesProfissionais();
    
    // Substituir a função de finalização existente
    const btnFinalizar = document.querySelector('.btn-finalizar');
    if (btnFinalizar) {
        btnFinalizar.removeEventListener('click', arguments.callee);
        btnFinalizar.addEventListener('click', finalizarVendaComDados);
    }
    
    // Configurar cálculo automático dos totais com condições de pagamento
    configurarCalculoTotaisAutomatico();
    
    // Forçar configuração após um pequeno delay para garantir que todos os elementos estejam carregados
    setTimeout(() => {
        console.log('🔄 Re-configurando cálculo automático após delay...');
        configurarCalculoTotaisAutomatico();
    }, 1000);
});

// Sistema de cálculo automático dos totais com condições de pagamento
function configurarCalculoTotaisAutomatico() {
    console.log('🧮 Configurando cálculo automático dos totais...');
    
    // Aguardar um pouco para garantir que DOM está pronto
    const tentarConfigurar = () => {
        // Elementos dos campos de condição de pagamento
        const acrescimoPercent = document.getElementById('acrescimoPercent');
        const acrescimoValor = document.getElementById('acrescimoValor');
        const descontoGeralPercent = document.getElementById('descontoGeralPercent');
        const descontoGeralValor = document.getElementById('descontoGeralValor');
        const arredondamento = document.getElementById('arredondamento');
        
        console.log('🔍 Elementos encontrados:', {
            acrescimoPercent: !!acrescimoPercent,
            acrescimoValor: !!acrescimoValor,
            descontoGeralPercent: !!descontoGeralPercent,
            descontoGeralValor: !!descontoGeralValor,
            arredondamento: !!arredondamento
        });
        
        if (!acrescimoPercent || !acrescimoValor || !descontoGeralPercent || !descontoGeralValor || !arredondamento) {
            console.warn('⚠️ Alguns campos de condição de pagamento não foram encontrados');
            console.log('IDs esperados: acrescimoPercent, acrescimoValor, descontoGeralPercent, descontoGeralValor, arredondamento');
            return false;
        }
        
        // Remover listeners antigos se existirem
        const removerListenersAntigos = (elemento) => {
            const clone = elemento.cloneNode(true);
            elemento.parentNode.replaceChild(clone, elemento);
            return clone;
        };
        
        const acrescimoPercentLimpo = removerListenersAntigos(acrescimoPercent);
        const acrescimoValorLimpo = removerListenersAntigos(acrescimoValor);
        const descontoGeralPercentLimpo = removerListenersAntigos(descontoGeralPercent);
        const descontoGeralValorLimpo = removerListenersAntigos(descontoGeralValor);
        const arredondamentoLimpo = removerListenersAntigos(arredondamento);
        
        // Configurar eventos de input para cálculo automático
        acrescimoPercentLimpo.addEventListener('input', function() {
            console.log('📝 Acréscimo % alterado:', this.value);
            // Se preencheu %, limpar valor R$
            if (this.value.trim()) {
                document.getElementById('acrescimoValor').value = '';
            }
            calcularTotaisComCondicoesPagamento();
        });
        
        acrescimoValorLimpo.addEventListener('input', function() {
            console.log('📝 Acréscimo R$ alterado:', this.value);
            // Se preencheu R$, limpar %
            if (this.value.trim()) {
                document.getElementById('acrescimoPercent').value = '';
            }
            calcularTotaisComCondicoesPagamento();
        });
        
        descontoGeralPercentLimpo.addEventListener('input', function() {
            console.log('📝 Desconto % alterado:', this.value);
            // Se preencheu %, limpar valor R$
            if (this.value.trim()) {
                document.getElementById('descontoGeralValor').value = '';
            }
            calcularTotaisComCondicoesPagamento();
        });
        
        descontoGeralValorLimpo.addEventListener('input', function() {
            console.log('📝 Desconto R$ alterado:', this.value);
            // Se preencheu R$, limpar %
            if (this.value.trim()) {
                document.getElementById('descontoGeralPercent').value = '';
            }
            calcularTotaisComCondicoesPagamento();
        });
        
        arredondamentoLimpo.addEventListener('input', function() {
            console.log('📝 Arredondamento alterado:', this.value);
            calcularTotaisComCondicoesPagamento();
        });
        
        console.log('✅ Cálculo automático configurado para condições de pagamento');
        return true;
    };
    
    // Tentar configurar imediatamente
    if (tentarConfigurar()) {
        return;
    }
    
    // Se não conseguiu, tentar novamente após 500ms
    setTimeout(() => {
        console.log('🔄 Tentando configurar novamente...');
        tentarConfigurar();
    }, 500);
}

// Função para calcular totais com condições de pagamento
function calcularTotaisComCondicoesPagamento() {
    console.log('💰 INÍCIO do cálculo de totais com condições de pagamento...');
    
    try {
        // Obter valores atuais dos campos
        const acrescimoPercentInput = document.getElementById('acrescimoPercent');
        const acrescimoValorInput = document.getElementById('acrescimoValor');
        const descontoGeralPercentInput = document.getElementById('descontoGeralPercent');
        const descontoGeralValorInput = document.getElementById('descontoGeralValor');
        const arredondamentoInput = document.getElementById('arredondamento');
        
        if (!acrescimoPercentInput || !acrescimoValorInput || !descontoGeralPercentInput || !descontoGeralValorInput || !arredondamentoInput) {
            console.error('❌ Elementos de input não encontrados');
            return;
        }
        
        const acrescimoPercent = parseFloat(acrescimoPercentInput.value) || 0;
        const acrescimoValor = parseFloat(acrescimoValorInput.value.replace(',', '.')) || 0;
        const descontoGeralPercent = parseFloat(descontoGeralPercentInput.value) || 0;
        const descontoGeralValor = parseFloat(descontoGeralValorInput.value.replace(',', '.')) || 0;
        const arredondamentoValor = parseFloat(arredondamentoInput.value.replace(',', '.')) || 0;
        
        console.log('📊 Valores dos campos:', {
            acrescimoPercent,
            acrescimoValor,
            descontoGeralPercent,
            descontoGeralValor,
            arredondamentoValor
        });
        
        // Calcular total bruto dos itens
        let totalBruto = 0;
        if (window.itensVenda && window.itensVenda.length > 0) {
            totalBruto = window.itensVenda.reduce((sum, item) => {
                const itemTotal = item.totalFinal || item.totalBruto || item.total || 0;
                console.log('🛒 Item:', item.nome || 'Sem nome', 'Total:', itemTotal);
                return sum + itemTotal;
            }, 0);
        } else {
            // Se não há itens ainda, tentar pegar do total atual na tela
            const totalBrutoElement = document.querySelector('.total-item:nth-child(1) .valor');
            if (totalBrutoElement) {
                const totalBrutoTexto = totalBrutoElement.textContent.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
                totalBruto = parseFloat(totalBrutoTexto) || 0;
                console.log('🔍 Total bruto obtido da tela:', totalBruto);
            }
        }
        
        console.log('💰 Total bruto calculado:', totalBruto);
        
        // Aplicar acréscimos
        let valorAcrescimo = 0;
        if (acrescimoPercent > 0) {
            valorAcrescimo = totalBruto * (acrescimoPercent / 100);
            console.log('📈 Acréscimo %:', acrescimoPercent, '% =', valorAcrescimo);
        } else if (acrescimoValor > 0) {
            valorAcrescimo = acrescimoValor;
            console.log('📈 Acréscimo R$:', valorAcrescimo);
        }
        
        // Aplicar descontos
        let valorDesconto = 0;
        if (descontoGeralPercent > 0) {
            valorDesconto = totalBruto * (descontoGeralPercent / 100);
            console.log('📉 Desconto %:', descontoGeralPercent, '% =', valorDesconto);
        } else if (descontoGeralValor > 0) {
            valorDesconto = descontoGeralValor;
            console.log('📉 Desconto R$:', valorDesconto);
        }
        
        // Calcular total final
        let totalFinal = totalBruto + valorAcrescimo - valorDesconto + arredondamentoValor;
        
        // Garantir que não seja negativo
        if (totalFinal < 0) {
            totalFinal = 0;
        }
        
        console.log('🎯 RESULTADO FINAL:', {
            totalBruto,
            valorAcrescimo,
            valorDesconto,
            arredondamentoValor,
            totalFinal
        });
        
        // Atualizar elementos na tela
        atualizarElementosTotais(totalBruto, valorDesconto, valorAcrescimo, totalFinal);
        
    } catch (error) {
        console.error('❌ Erro ao calcular totais:', error);
    }
}

// Função para atualizar elementos visuais dos totais
function atualizarElementosTotais(totalBruto, valorDesconto, valorAcrescimo, totalFinal) {
    try {
        // Total Bruto
        const elementoTotalBruto = document.querySelector('.total-item:nth-child(1) .valor');
        if (elementoTotalBruto) {
            elementoTotalBruto.textContent = `R$ ${totalBruto.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            })}`;
        }
        
        // Desconto R$
        const elementoDesconto = document.querySelector('.total-item:nth-child(2) .valor');
        if (elementoDesconto) {
            elementoDesconto.textContent = valorDesconto.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
        }
        
        // Acréscimo R$
        const elementoAcrescimo = document.querySelector('.total-item:nth-child(3) .valor');
        if (elementoAcrescimo) {
            elementoAcrescimo.textContent = valorAcrescimo.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            });
        }
        
        // Total da Venda
        const elementoTotalVenda = document.querySelector('.total-item.total-venda .valor');
        if (elementoTotalVenda) {
            elementoTotalVenda.textContent = `R$ ${totalFinal.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            })}`;
        }
        
        console.log('✅ Elementos visuais atualizados com novos totais');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar elementos visuais:', error);
    }
}

// Sobrescrever função original de atualizar totais para incluir condições de pagamento
const atualizarTotaisGeraisOriginal = window.atualizarTotaisGerais;
window.atualizarTotaisGerais = function() {
    // Chamar função original primeiro
    if (typeof atualizarTotaisGeraisOriginal === 'function') {
        atualizarTotaisGeraisOriginal();
    }
    
    // Depois aplicar condições de pagamento
    calcularTotaisComCondicoesPagamento();
};

// Função de teste manual para debugar (use no console)
window.testarCalculoTotais = function() {
    console.log('🧪 TESTE MANUAL DO CÁLCULO DE TOTAIS');
    console.log('📋 Verificando elementos:');
    
    const elementos = {
        acrescimoPercent: document.getElementById('acrescimoPercent'),
        acrescimoValor: document.getElementById('acrescimoValor'),
        descontoGeralPercent: document.getElementById('descontoGeralPercent'),
        descontoGeralValor: document.getElementById('descontoGeralValor'),
        arredondamento: document.getElementById('arredondamento')
    };
    
    Object.keys(elementos).forEach(key => {
        const elemento = elementos[key];
        console.log(`${key}:`, elemento ? '✅ Encontrado' : '❌ Não encontrado');
        if (elemento) {
            console.log(`   Valor atual: "${elemento.value}"`);
        }
    });
    
    console.log('🎯 Executando cálculo...');
    calcularTotaisComCondicoesPagamento();
    
    return elementos;
};

console.log('🔧 Função de teste disponível: testarCalculoTotais()');

// =============================================
// MODAL DE PAGAMENTO
// =============================================

function abrirModalPagamento() {
    console.log('💳 Abrindo modal de pagamento...');
    
    // Calcular total da venda atual
    const totalVenda = totais.final;
    
    if (totalVenda <= 0) {
        alert('Valor da venda deve ser maior que zero.');
        return;
    }
    
    // REMOVER MODAL ANTERIOR SE EXISTIR
    const modalAnterior = document.getElementById('modalPagamento');
    if (modalAnterior) {
        modalAnterior.remove();
    }
    
    const overlayAnterior = document.getElementById('overlayPagamento');
    if (overlayAnterior) {
        overlayAnterior.remove();
    }
    
    // CRIAR OVERLAY
    const overlay = document.createElement('div');
    overlay.id = 'overlayPagamento';
    overlay.style.cssText = `
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
    
    // CRIAR MODAL
    const modal = document.createElement('div');
    modal.id = 'modalPagamento';
    modal.innerHTML = `
        <div style="background: #2c5aa0; color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 10px 10px 0 0;">
            <h3 style="margin: 0; font-size: 20px;">
                <i class="fas fa-credit-card"></i> Pagamento
            </h3>
            <button id="fecharModalPagamento" style="background: transparent; border: none; color: white; font-size: 20px; cursor: pointer;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <div style="padding: 25px;">
            
            <!-- Resumo da Venda -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2c5aa0;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: 600; color: #333;">Total:</span>
                    <span id="totalModalPagamento" style="font-size: 24px; font-weight: 700; color: #2c5aa0;">${totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <span style="color: #666;">Total Pago:</span>
                    <span id="totalPagoModal" style="font-weight: 600; color: #28a745;">R$ 0,00</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #666;">Falta:</span>
                    <span id="faltaModal" style="font-weight: 600; color: #dc3545;">${totalVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            </div>
            
            <!-- Formas de Pagamento -->
            <h4 style="margin-bottom: 15px; color: #333;">Formas de Pagamento *</h4>
            
            <div id="formasPagamento" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                <button type="button" class="forma-pagamento" data-forma="dinheiro" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.3s ease;">
                    <i class="fas fa-money-bill-wave" style="font-size: 20px; color: #28a745;"></i>
                    <span style="font-weight: 600; color: #333; font-size: 12px;">Dinheiro</span>
                </button>
                
                <button type="button" class="forma-pagamento" data-forma="debito" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.3s ease;">
                    <i class="fas fa-credit-card" style="font-size: 20px; color: #6f42c1;"></i>
                    <span style="font-weight: 600; color: #333; font-size: 12px;">Débito</span>
                </button>
                
                <button type="button" class="forma-pagamento" data-forma="credito" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.3s ease;">
                    <i class="fas fa-credit-card" style="font-size: 20px; color: #007bff;"></i>
                    <span style="font-weight: 600; color: #333; font-size: 12px;">Crédito</span>
                </button>
                
                <button type="button" class="forma-pagamento" data-forma="pix" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.3s ease;">
                    <i class="fab fa-pix" style="font-size: 20px; color: #00c4a3;"></i>
                    <span style="font-weight: 600; color: #333; font-size: 12px;">Pix</span>
                </button>
                
                <button type="button" class="forma-pagamento" data-forma="crediario" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.3s ease;">
                    <i class="fas fa-calendar-alt" style="font-size: 20px; color: #fd7e14;"></i>
                    <span style="font-weight: 600; color: #333; font-size: 12px;">Crediário</span>
                </button>
                
                <button type="button" class="forma-pagamento-desabilitada" data-forma="cheque" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: #f5f5f5; cursor: not-allowed; display: flex; flex-direction: column; align-items: center; gap: 6px; opacity: 0.5;" disabled>
                    <i class="fas fa-money-check" style="font-size: 20px; color: #999;"></i>
                    <span style="font-weight: 600; color: #999; font-size: 12px;">Cheque</span>
                    <small style="font-size: 10px; color: #666;">(Indisponível)</small>
                </button>
                
                <button type="button" class="forma-pagamento" data-forma="haver" style="padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; background: white; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; transition: all 0.3s ease;">
                    <i class="fas fa-handshake" style="font-size: 20px; color: #e83e8c;"></i>
                    <span style="font-weight: 600; color: #333; font-size: 12px;">Haver</span>
                </button>
            </div>
            
            <!-- Campos específicos para cada forma de pagamento -->
            <div id="camposEspecificos" style="margin-bottom: 20px; display: none;">
                
                <!-- Dinheiro -->
                <div id="campos-dinheiro" class="campos-forma" style="display: none;">
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                            <input type="number" id="valor-dinheiro" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none;">
                        </div>
                    </div>
                </div>
                
                <!-- Débito -->
                <div id="campos-debito" class="campos-forma" style="display: none;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Operadora</label>
                            <input type="text" id="operadora-debito" placeholder="Operadora" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">N° NSU</label>
                            <input type="text" id="nsu-debito" placeholder="NSU" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                        <input type="number" id="valor-debito" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none;">
                    </div>
                </div>
                
                <!-- Crédito -->
                <div id="campos-credito" class="campos-forma" style="display: none;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Operadora</label>
                            <input type="text" id="operadora-credito" placeholder="Operadora" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">N° NSU</label>
                            <input type="text" id="nsu-credito" placeholder="NSU" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">N° Parc. *</label>
                            <input type="number" id="parcelas-credito" value="1" min="1" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                    </div>
                    <div style="margin-top: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                        <input type="number" id="valor-credito" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none;">
                    </div>
                </div>
                
                <!-- Pix -->
                <div id="campos-pix" class="campos-forma" style="display: none;">
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Chave PIX *</label>
                            <input type="text" id="chave-pix" placeholder="Chave PIX" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                            <input type="number" id="valor-pix" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none;">
                        </div>
                    </div>
                </div>
                
                <!-- Crediário -->
                <div id="campos-crediario" class="campos-forma" style="display: none;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                            <input type="number" id="valor-crediario" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">N° Parc. *</label>
                            <input type="number" id="parcelas-crediario" value="1" min="1" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Intervalo de dias *</label>
                            <input type="number" id="intervalo-crediario" value="30" min="1" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Venc. 1ª parc. *</label>
                            <input type="date" id="vencimento-crediario" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                        </div>
                    </div>
                </div>
                
                <!-- Cheque -->
                <div id="campos-cheque" class="campos-forma" style="display: none;">
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                            <input type="number" id="valor-cheque" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none;">
                        </div>
                    </div>
                </div>
                
                <!-- Haver -->
                <div id="campos-haver" class="campos-forma" style="display: none;">
                    <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #007bff;">
                        <div style="display: flex; justify-content: between; align-items: center;">
                            <span style="font-weight: 600; color: #333;">Saldo em Haver:</span>
                            <span id="saldo-haver" style="font-size: 18px; font-weight: 700; color: #007bff;">R$ 0,00</span>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Valor *</label>
                        <input type="number" id="valor-haver" placeholder="0,00" step="0.01" min="0" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none;">
                    </div>
                </div>
                
                <button type="button" id="adicionarPagamento" style="margin-top: 15px; padding: 12px 25px; border: none; border-radius: 8px; background: #28a745; color: white; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                    <i class="fas fa-plus"></i> Adicionar Pagamento
                </button>
            </div>
            
            <!-- Caixa/Conta -->
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Caixa/Conta</label>
                <select id="caixaContaModal" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 14px; outline: none;">
                    <option value="Frente de caixa nº 2 - 13/06/2025">Frente de caixa nº 2 - 13/06/2025</option>
                </select>
            </div>
            
            <!-- Botões -->
            <div style="display: flex; gap: 15px; justify-content: flex-end;">
                <button type="button" id="cancelarModalPagamento" style="padding: 12px 25px; border: 2px solid #6c757d; border-radius: 8px; cursor: pointer; font-weight: 600; background: white; color: #6c757d; transition: all 0.3s ease;">
                    Cancelar
                </button>
                <button type="button" id="finalizarPagamento" style="padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; background: #28a745; color: white; transition: all 0.3s ease;">
                    <i class="fas fa-check"></i> OK
                </button>
            </div>
        </div>
    `;
    
    modal.style.cssText = `
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -70%) scale(0.8) !important;
        width: 95% !important;
        max-width: 800px !important;
        height: auto !important;
        background: white !important;
        z-index: 999999 !important;
        box-shadow: 0 20px 60px rgba(0,0,0,0) !important;
        border-radius: 15px !important;
        overflow: visible !important;
        border: 3px solid #2c5aa0 !important;
        opacity: 0 !important;
        transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
    `;
    
    // ADICIONAR AO DOM
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // ANIMAR ENTRADA
    requestAnimationFrame(() => {
        overlay.style.opacity = '0';
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -70%) scale(0.8)';
        
        setTimeout(() => {
            overlay.style.background = 'rgba(0,0,0,0.7)';
            overlay.style.opacity = '1';
            
            setTimeout(() => {
                modal.style.opacity = '1';
                modal.style.transform = 'translate(-50%, -50%) scale(1)';
                modal.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';
            }, 150);
        }, 50);
    });
    
    // CONFIGURAR FUNCIONALIDADES
    configurarModalPagamento(modal, overlay, totalVenda);
}

function configurarModalPagamento(modal, overlay, totalVenda) {
    let formaSelecionada = null;
    let totalPago = 0;
    let pagamentosEfetuados = [];
    
    // Função para fechar modal
    function fecharModal() {
        modal.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 1, 1)';
        overlay.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 1, 1)';
        
        modal.style.opacity = '0';
        modal.style.transform = 'translate(-50%, -30%) scale(0.9)';
        modal.style.boxShadow = '0 5px 20px rgba(0,0,0,0.1)';
        
        setTimeout(() => {
            overlay.style.opacity = '0';
            overlay.style.background = 'rgba(0,0,0,0)';
        }, 100);
        
        setTimeout(() => {
            if (modal.parentNode) modal.remove();
            if (overlay.parentNode) overlay.remove();
            document.body.style.overflow = 'auto';
        }, 300);
    }
    
    // Atualizar totais
    function atualizarTotais() {
        const falta = totalVenda - totalPago;
        document.getElementById('totalPagoModal').textContent = totalPago.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('faltaModal').textContent = falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        if (falta <= 0) {
            document.getElementById('faltaModal').style.color = '#28a745';
        } else {
            document.getElementById('faltaModal').style.color = '#dc3545';
        }
    }
    
    // Event listeners
    document.getElementById('fecharModalPagamento').addEventListener('click', fecharModal);
    document.getElementById('cancelarModalPagamento').addEventListener('click', fecharModal);
    overlay.addEventListener('click', fecharModal);
    
    // Formas de pagamento
    const formasPagamento = modal.querySelectorAll('.forma-pagamento');
    formasPagamento.forEach(forma => {
        forma.addEventListener('click', function() {
            // Resetar outras formas
            formasPagamento.forEach(f => {
                f.style.borderColor = '#e0e0e0';
                f.style.background = 'white';
            });
            
            // Selecionar forma atual
            forma.style.borderColor = '#2c5aa0';
            forma.style.background = '#f8f9fa';
            
            formaSelecionada = forma.dataset.forma;
            
            // Esconder todos os campos específicos
            document.querySelectorAll('.campos-forma').forEach(campo => {
                campo.style.display = 'none';
            });
            
            // Mostrar container de campos específicos
            document.getElementById('camposEspecificos').style.display = 'block';
            
            // Mostrar campos específicos da forma selecionada e preencher valor total
            mostrarCamposFormaPagamento(formaSelecionada, totalVenda);
        });
    });
    
    // Função para mostrar campos específicos de cada forma de pagamento
    function mostrarCamposFormaPagamento(forma, valorTotal) {
        const campoAtual = document.getElementById(`campos-${forma}`);
        if (campoAtual) {
            campoAtual.style.display = 'block';
            
            // Preencher valor total automaticamente
            const campoValor = campoAtual.querySelector('input[id^="valor-"]');
            if (campoValor) {
                campoValor.value = valorTotal.toFixed(2);
            }
            
            // Configurações específicas por forma de pagamento
            switch(forma) {
                case 'crediario':
                    configurarCrediario();
                    break;
                case 'haver':
                    configurarHaver();
                    break;
                case 'credito':
                    // Parcelas já vem com 1 preenchido
                    break;
                case 'pix':
                    // Carregar chave PIX salva e focar no campo
                    setTimeout(() => {
                        const chaveSalva = localStorage.getItem('chavePix');
                        if (chaveSalva) {
                            document.getElementById('chave-pix').value = chaveSalva;
                        }
                        document.getElementById('chave-pix').focus();
                    }, 100);
                    break;
            }
        }
    }
    
    // Configurar Crediário
    function configurarCrediario() {
        const intervaloInput = document.getElementById('intervalo-crediario');
        const vencimentoInput = document.getElementById('vencimento-crediario');
        
        // Calcular data inicial (30 dias a partir de hoje)
        const hoje = new Date();
        const primeiroVencimento = new Date(hoje);
        primeiroVencimento.setDate(hoje.getDate() + parseInt(intervaloInput.value));
        
        vencimentoInput.value = primeiroVencimento.toISOString().split('T')[0];
        
        // Atualizar data quando intervalo mudar
        intervaloInput.addEventListener('input', function() {
            const novoVencimento = new Date(hoje);
            novoVencimento.setDate(hoje.getDate() + parseInt(this.value));
            vencimentoInput.value = novoVencimento.toISOString().split('T')[0];
        });
    }
    
    // Configurar Haver
    async function configurarHaver() {
        // Obter cliente atual
        const clienteAtual = document.getElementById('pesquisarCliente').value;
        
        // Simular saldo de haver (aqui você integraria com sua API)
        const saldoHaver = await obterSaldoHaver(clienteAtual);
        
        document.getElementById('saldo-haver').textContent = saldoHaver.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const valorHaverInput = document.getElementById('valor-haver');
        
        // Limitar valor máximo ao saldo disponível
        valorHaverInput.max = saldoHaver;
        
        // Configurar validação em tempo real
        valorHaverInput.addEventListener('input', function() {
            const valor = parseFloat(this.value) || 0;
            if (valor > saldoHaver) {
                this.value = saldoHaver.toFixed(2);
                alert(`Valor não pode ser maior que o saldo disponível (${saldoHaver.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);
            }
        });
        
        // Enter para usar valor total disponível
        valorHaverInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const valorRestante = totalVenda - totalPago;
                const valorUsar = Math.min(saldoHaver, valorRestante);
                this.value = valorUsar.toFixed(2);
            }
        });
    }
    
    // Simular obtenção de saldo haver (substitua pela sua API real)
    async function obterSaldoHaver(cliente) {
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Se não há cliente, retornar saldo zero
        if (!cliente || !cliente.trim()) {
            return 0.00;
        }
        
        // Retornar saldo simulado (aqui você faria a consulta real)
        const saldosSimulados = {
            'Karoline': 150.00,
            'Pedro': 89.50,
            'João': 0.00,
            'Maria': 234.75
        };
        
        const clienteNome = cliente.split(' - ')[0] || cliente;
        return saldosSimulados[clienteNome] || 0.00;
    }
    
    // Obter dados específicos da forma de pagamento
    function obterDadosFormaPagamento(forma) {
        let dadosPagamento = {
            forma: forma,
            timestamp: new Date()
        };
        
        switch(forma) {
            case 'dinheiro':
                const valorDinheiro = parseFloat(document.getElementById('valor-dinheiro').value) || 0;
                if (valorDinheiro <= 0) {
                    alert('Digite um valor válido para dinheiro.');
                    return null;
                }
                dadosPagamento.valor = valorDinheiro;
                break;
                
            case 'debito':
                const valorDebito = parseFloat(document.getElementById('valor-debito').value) || 0;
                if (valorDebito <= 0) {
                    alert('Digite um valor válido para débito.');
                    return null;
                }
                dadosPagamento.valor = valorDebito;
                dadosPagamento.operadora = document.getElementById('operadora-debito').value;
                dadosPagamento.nsu = document.getElementById('nsu-debito').value;
                break;
                
            case 'credito':
                const valorCredito = parseFloat(document.getElementById('valor-credito').value) || 0;
                const parcelas = parseInt(document.getElementById('parcelas-credito').value) || 1;
                if (valorCredito <= 0) {
                    alert('Digite um valor válido para crédito.');
                    return null;
                }
                if (parcelas < 1) {
                    alert('Número de parcelas deve ser pelo menos 1.');
                    return null;
                }
                dadosPagamento.valor = valorCredito;
                dadosPagamento.operadora = document.getElementById('operadora-credito').value;
                dadosPagamento.nsu = document.getElementById('nsu-credito').value;
                dadosPagamento.parcelas = parcelas;
                break;
                
            case 'pix':
                const valorPix = parseFloat(document.getElementById('valor-pix').value) || 0;
                const chavePix = document.getElementById('chave-pix').value.trim();
                if (valorPix <= 0) {
                    alert('Digite um valor válido para PIX.');
                    return null;
                }
                if (!chavePix) {
                    alert('Digite uma chave PIX válida.');
                    return null;
                }
                // Salvar chave PIX para próximas vendas
                localStorage.setItem('chavePix', chavePix);
                dadosPagamento.valor = valorPix;
                dadosPagamento.chavePix = chavePix;
                break;
                
            case 'crediario':
                const valorCrediario = parseFloat(document.getElementById('valor-crediario').value) || 0;
                const parcelasCrediario = parseInt(document.getElementById('parcelas-crediario').value) || 1;
                const intervalo = parseInt(document.getElementById('intervalo-crediario').value) || 30;
                const vencimento = document.getElementById('vencimento-crediario').value;
                
                if (valorCrediario <= 0) {
                    alert('Digite um valor válido para crediário.');
                    return null;
                }
                if (!vencimento) {
                    alert('Selecione a data de vencimento da primeira parcela.');
                    return null;
                }
                
                dadosPagamento.valor = valorCrediario;
                dadosPagamento.parcelas = parcelasCrediario;
                dadosPagamento.intervalo = intervalo;
                dadosPagamento.primeiroVencimento = vencimento;
                break;
                
            case 'cheque':
                const valorCheque = parseFloat(document.getElementById('valor-cheque').value) || 0;
                if (valorCheque <= 0) {
                    alert('Digite um valor válido para cheque.');
                    return null;
                }
                dadosPagamento.valor = valorCheque;
                break;
                
            case 'haver':
                const valorHaver = parseFloat(document.getElementById('valor-haver').value) || 0;
                if (valorHaver <= 0) {
                    alert('Digite um valor válido para haver.');
                    return null;
                }
                dadosPagamento.valor = valorHaver;
                break;
                
            default:
                alert('Forma de pagamento não reconhecida.');
                return null;
        }
        
        return dadosPagamento;
    }
    
    // Adicionar pagamento
    document.getElementById('adicionarPagamento').addEventListener('click', function() {
        if (!formaSelecionada) {
            alert('Selecione uma forma de pagamento.');
            return;
        }
        
        const dadosPagamento = obterDadosFormaPagamento(formaSelecionada);
        
        if (!dadosPagamento) return;
        
        const valor = dadosPagamento.valor;
        
        if (!formaSelecionada) {
            alert('Selecione uma forma de pagamento.');
            return;
        }
        
        if (valor <= 0) {
            alert('Digite um valor válido.');
            return;
        }
        
        const faltante = totalVenda - totalPago;
        if (valor > faltante) {
            if (!confirm(`Valor informado é maior que o restante (${faltante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Continuar?`)) {
                return;
            }
        }
        
        // Adicionar pagamento
        pagamentosEfetuados.push(dadosPagamento);
        
        totalPago += valor;
        atualizarTotais();
        
        // Resetar campos específicos
        document.querySelectorAll('.campos-forma input').forEach(input => {
            if (input.type === 'number' && input.id.startsWith('valor-')) {
                input.value = '';
            } else if (input.id === 'parcelas-credito' || input.id === 'parcelas-crediario') {
                input.value = '1';
            } else if (input.id === 'intervalo-crediario') {
                input.value = '30';
            } else {
                input.value = '';
            }
        });
        
        // Esconder campos específicos
        document.getElementById('camposEspecificos').style.display = 'none';
        document.querySelectorAll('.campos-forma').forEach(campo => {
            campo.style.display = 'none';
        });
        
        formaSelecionada = null;
        
        // Resetar formas
        formasPagamento.forEach(f => {
            f.style.borderColor = '#e0e0e0';
            f.style.background = 'white';
        });
        
        console.log('💳 Pagamento adicionado:', dadosPagamento);
    });
    
    // Finalizar pagamento
    document.getElementById('finalizarPagamento').addEventListener('click', async function() {
        // Verificar se existe pelo menos um pagamento efetuado OU uma forma selecionada com dados válidos
        let temPagamentoValido = pagamentosEfetuados.length > 0;
        
        if (!temPagamentoValido && formaSelecionada) {
            // Verificar se há dados válidos na forma selecionada
            const dadosPagamento = obterDadosFormaPagamento(formaSelecionada);
            if (dadosPagamento && dadosPagamento.valor > 0) {
                // Adicionar automaticamente antes de finalizar
                const valor = dadosPagamento.valor;
                const faltante = totalVenda - totalPago;
                
                if (valor > faltante) {
                    if (!confirm(`Valor informado é maior que o restante (${faltante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}). Continuar?`)) {
                        return;
                    }
                }
                
                pagamentosEfetuados.push(dadosPagamento);
                totalPago += valor;
                atualizarTotais();
                temPagamentoValido = true;
                
                console.log('💳 Pagamento adicionado automaticamente antes da finalização:', dadosPagamento);
            }
        }
        
        if (!temPagamentoValido) {
            mostrarNotificacao('warning', 'Adicione pelo menos uma forma de pagamento.');
            return;
        }
        
        const falta = totalVenda - totalPago;
        if (falta > 0) {
            if (!confirm(`Ainda falta ${falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Finalizar mesmo assim?`)) {
                return;
            }
        }
        
        // Salvar venda
        // Preferir enviar o objeto selecionado (com id) quando disponível
        const dadosVenda = {
            timestamp: new Date().toISOString(),
            cliente: clienteSelecionado ? clienteSelecionado.nome : document.getElementById('pesquisarCliente').value,
            clienteId: clienteSelecionado ? clienteSelecionado.id : null,
            profissional: profissionalSelecionado ? profissionalSelecionado.nome : document.getElementById('pesquisarProfissional').value,
            profissionalId: profissionalSelecionado ? profissionalSelecionado.id : null,
            itens: [...itensVenda],
            totais: { ...totais },
            pagamentos: [...pagamentosEfetuados],
            totalPago: totalPago,
            status: falta <= 0 ? 'pago' : 'parcial'
        };
        
        // Salvar venda via API
        const vendaSalva = await ApiClient.criarVenda(dadosVenda);
        
        console.log('✅ Venda finalizada e salva no banco:', vendaSalva);
        
        // Atualizar estoque após venda
        atualizarEstoque(dadosVenda.itens);
        
        fecharModal();
        
        // Mostrar confirmação sutil
        mostrarNotificacao('success', 'Venda realizada com sucesso!');
        
        // Limpar formulário
        limparFormulario();
    });
}

function limparFormulario() {
    // Limpar itens
    itensVenda.length = 0;
    
    // Resetar cliente e profissional selecionados
    clienteSelecionado = null;
    profissionalSelecionado = null;
    
    // Esconder displays de cliente/profissional selecionados
    const clienteSelecionadoDiv = document.getElementById('clienteSelecionado');
    if (clienteSelecionadoDiv) {
        clienteSelecionadoDiv.style.display = 'none';
    }
    
    const profissionalSelecionadoDiv = document.getElementById('profissionalSelecionado');
    if (profissionalSelecionadoDiv) {
        profissionalSelecionadoDiv.style.display = 'none';
    }
    
    // Limpar campos
    document.getElementById('pesquisarCliente').value = '';
    document.getElementById('pesquisarProfissional').value = '';
    document.getElementById('pesquisarProduto').value = '';
    document.getElementById('quantidade').value = '1';
    document.getElementById('valorUnitario').value = '';
    document.getElementById('desconto').value = '0';
    document.getElementById('acrescimo').value = '0';
    
    // Limpar campos específicos do produto se existirem
    const observacaoField = document.getElementById('observacao');
    if (observacaoField) observacaoField.value = '';
    
    const observacoesField = document.getElementById('observacoes');
    if (observacoesField) observacoesField.value = '';
    
    // Limpar campos de condições de pagamento
    const descontoPercent = document.getElementById('descontoPercent');
    if (descontoPercent) descontoPercent.value = '0';
    
    const acrescimoPercent = document.getElementById('acrescimoPercent');
    if (acrescimoPercent) acrescimoPercent.value = '0';
    
    // Resetar totais
    totais = {
        bruto: 0,
        desconto: 0,
        acrescimo: 0,
        final: 0
    };
    
    // Atualizar display
    atualizarTotais();
    renderizarItens();
    
    console.log('🧹 Formulário limpo - Pronto para nova venda');
}

// Função para atualizar estoque após venda (usando API)
async function atualizarEstoque(itensVendidos) {
    console.log('📦 Atualizando estoque via API...', itensVendidos);
    
    try {
        // Atualizar estoque de cada item vendido
        for (const itemVendido of itensVendidos) {
            const produtoId = itemVendido.produto.id;
            const quantidadeVendida = itemVendido.quantidade;
            
            // Reduzir estoque via API (operação 'reduzir')
            await ApiClient.atualizarEstoque(
                produtoId, 
                quantidadeVendida, 
                'reduzir', 
                new Date().toISOString()
            );
            
            console.log(`✅ Estoque reduzido via API: ${itemVendido.produto.nome} - Qtd: ${quantidadeVendida}`);
        }
        
        console.log('✅ Todos os estoques atualizados via API');
        
    } catch (error) {
        console.error('❌ Erro ao atualizar estoque via API:', error);
        alert('Erro ao atualizar estoque: ' + error.message);
    }
}

