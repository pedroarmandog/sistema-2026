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
   FUNCIONALIDADES ESPECÍFICAS DA POSIÇÃO DE CAIXA
   ======================================== */

// Dados da posição de caixa
const posicaoCaixaData = {
    receita: {
        caixaCofre: 0.00,
        frenteCaixa: 0.00,
        chequeVista: 0.00,
        chequePreDatado: 0.00,
        cartaoReceber: 0.00,
        crediario: 0.00,
        estoqueCusto: 0.00
    },
    despesa: {
        saldoClientes: 0.00,
        contasPagar: 0.00,
        chequePagar: 0.00
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Posição de Caixa inicializada');
    
    // Calcular e exibir os valores
    atualizarPosicaoCaixa();
    
    // Simular atualização automática (se necessário)
    // setInterval(atualizarPosicaoCaixa, 30000); // Atualizar a cada 30 segundos
});

function calcularSubtotais() {
    const data = posicaoCaixaData;
    
    // Subtotal 1 - Total em Dinheiro
    const subtotal1 = data.receita.caixaCofre + data.receita.frenteCaixa;
    
    // Subtotal 2 - Total em Cheque
    const subtotal2 = data.receita.chequeVista + data.receita.chequePreDatado;
    
    // Saldo de Caixa (sub1 + sub2)
    const saldoCaixa = subtotal1 + subtotal2;
    
    // Subtotal 3 - Total a Receber
    const subtotal3 = data.receita.cartaoReceber + data.receita.crediario;
    
    // Subtotal 4 - Total de Receita
    const subtotal4 = saldoCaixa + subtotal3 + data.receita.estoqueCusto;
    
    // Subtotal 5 - Total de Despesas
    const subtotal5 = data.despesa.saldoClientes + data.despesa.contasPagar + data.despesa.chequePagar;
    
    // Resultado (sub4 - sub5)
    const resultado = subtotal4 - subtotal5;
    
    return {
        subtotal1,
        subtotal2,
        saldoCaixa,
        subtotal3,
        subtotal4,
        subtotal5,
        resultado
    };
}

function formatarValor(valor) {
    return valor.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function atualizarPosicaoCaixa() {
    const data = posicaoCaixaData;
    const subtotais = calcularSubtotais();
    
    // Atualizar valores na interface
    const linhasItem = document.querySelectorAll('.linha-item');
    
    linhasItem.forEach(linha => {
        const label = linha.querySelector('.item-label');
        const valorElement = linha.querySelector('.item-valor');
        
        if (!label || !valorElement) return;
        
        const labelText = label.textContent.trim();
        
        // Receita
        if (labelText.includes('CAIXA COFRE')) {
            valorElement.textContent = formatarValor(data.receita.caixaCofre);
        } else if (labelText.includes('Frente de caixa')) {
            valorElement.textContent = formatarValor(data.receita.frenteCaixa);
        } else if (labelText.includes('Subtotal 1')) {
            valorElement.textContent = formatarValor(subtotais.subtotal1) + ' =';
        } else if (labelText.includes('Cheque a vista')) {
            valorElement.textContent = formatarValor(data.receita.chequeVista);
        } else if (labelText.includes('Cheque pré datado')) {
            valorElement.textContent = formatarValor(data.receita.chequePreDatado);
        } else if (labelText.includes('Subtotal 2')) {
            valorElement.textContent = formatarValor(subtotais.subtotal2) + ' =';
        } else if (labelText.includes('Saldo de Caixa')) {
            valorElement.textContent = formatarValor(subtotais.saldoCaixa);
        } else if (labelText.includes('Cartão a Receber')) {
            valorElement.textContent = formatarValor(data.receita.cartaoReceber);
        } else if (labelText.includes('Crediário')) {
            valorElement.textContent = formatarValor(data.receita.crediario);
        } else if (labelText.includes('Subtotal 3')) {
            valorElement.textContent = formatarValor(subtotais.subtotal3) + ' =';
        } else if (labelText.includes('Estoque a preço')) {
            valorElement.textContent = formatarValor(data.receita.estoqueCusto);
        } else if (labelText.includes('Subtotal 4')) {
            valorElement.textContent = formatarValor(subtotais.subtotal4);
        }
        // Despesa
        else if (labelText.includes('Saldo em haver')) {
            valorElement.textContent = formatarValor(data.despesa.saldoClientes);
        } else if (labelText.includes('Contas a pagar')) {
            valorElement.textContent = formatarValor(data.despesa.contasPagar);
        } else if (labelText.includes('Cheque próprio')) {
            valorElement.textContent = formatarValor(data.despesa.chequePagar);
        } else if (labelText.includes('Subtotal 5')) {
            valorElement.textContent = formatarValor(subtotais.subtotal5);
        }
        // Resultado
        else if (labelText.includes('Resultado')) {
            valorElement.textContent = formatarValor(subtotais.resultado);
            
            // Aplicar cor baseada no resultado
            if (subtotais.resultado > 0) {
                valorElement.style.color = '#2ecc71'; // Verde para positivo
            } else if (subtotais.resultado < 0) {
                valorElement.style.color = '#e74c3c'; // Vermelho para negativo
            } else {
                valorElement.style.color = 'var(--text-primary)'; // Neutro para zero
            }
        }
    });
    
    console.log('💰 Posição de Caixa atualizada:', {
        receita: subtotais.subtotal4,
        despesa: subtotais.subtotal5,
        resultado: subtotais.resultado
    });
}

// Função para atualizar dados (pode ser chamada via API)
function atualizarDados(novosDados) {
    if (novosDados.receita) {
        Object.assign(posicaoCaixaData.receita, novosDados.receita);
    }
    
    if (novosDados.despesa) {
        Object.assign(posicaoCaixaData.despesa, novosDados.despesa);
    }
    
    atualizarPosicaoCaixa();
    mostrarNotificacao('Dados atualizados com sucesso!', 'success');
}

// Função para carregar dados do servidor (exemplo)
async function carregarDadosServidor() {
    try {
        // Aqui você faria a requisição para sua API
        // const response = await fetch('/api/posicao-caixa');
        // const dados = await response.json();
        // atualizarDados(dados);
        
        console.log('📡 Carregando dados do servidor...');
        // Por enquanto, mantém os valores zerados
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        mostrarNotificacao('Erro ao carregar dados do servidor', 'error');
    }
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    // Criar elemento de notificação
    const notificacao = document.createElement('div');
    notificacao.className = 'notification';
    
    // Definir ícone e cor baseado no tipo
    let icone = 'fa-info-circle';
    let cor = 'var(--primary-color)';
    
    if (tipo === 'success') {
        icone = 'fa-check-circle';
        cor = 'var(--turquoise)';
    } else if (tipo === 'error') {
        icone = 'fa-exclamation-circle';
        cor = 'var(--red)';
    } else if (tipo === 'warning') {
        icone = 'fa-exclamation-triangle';
        cor = 'var(--orange)';
    }
    
    notificacao.innerHTML = `
        <i class="fas ${icone}" style="color: ${cor}; font-size: 20px;"></i>
        <span>${mensagem}</span>
    `;
    
    notificacao.style.backgroundColor = 'var(--bg-card)';
    notificacao.style.color = 'var(--text-primary)';
    notificacao.style.border = `1px solid ${cor}`;
    
    document.body.appendChild(notificacao);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notificacao.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notificacao);
        }, 300);
    }, 3000);
}

// Animação de saída para notificação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Exportar funções para uso global (se necessário)
window.posicaoCaixa = {
    atualizarDados,
    carregarDadosServidor,
    atualizarPosicaoCaixa
};
