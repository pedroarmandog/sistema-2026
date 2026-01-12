// ============================================
// Área de Marketing - Envio Automático de Mensagens
// --------------------------------------------
// Este módulo é responsável por:
// - Cadastrar números de telefone de clientes (WhatsApp ou SMS);
// - Configurar lembretes automáticos (ex: agendamentos, promoções);
// - Enviar mensagens automáticas via API (ex: Twilio, WhatsApp Business);
// - Exibir status de envio (enviado, falhou, pendente);
// ============================================

console.log('Sistema de Marketing carregado!');

// Configurações globais
const marketingConfig = {
    apiUrl: 'http://localhost:3000/api',
    phoneNumber: '5527999104837',
    messageTypes: {
        AGENDAMENTO: 'agendamento',
        PET_PRONTO: 'pet_pronto',
        VENDA_PRODUTOS: 'venda_produtos',
        PLANO_BANHOS: 'plano_banhos'
    }
};

// Estado das mensagens
let mensagensAtivas = [];
let mensagensInativas = [];

// Inicialização específica do Marketing
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando funcionalidades específicas do Marketing...');
    
    // Configurar funcionalidades imediatamente
    inicializarMarketing();
});

function inicializarMarketing() {
    console.log('Configurando Marketing...');
    
    // Configurar dropdown "Início Rápido" específico do Marketing
    configurarDropdownInicioRapido();
    
    // Carregar mensagens
    carregarMensagens();
    
    // Configurar eventos específicos do marketing
    configurarEventosMarketing();
    
    // Verificar status das mensagens a cada 30 segundos
    setInterval(verificarStatusMensagens, 30000);
    
    // Inicializar dashboard se necessário
    if (typeof loadDashboardData === 'function') {
        loadDashboardData();
    }
}

function configurarDropdownInicioRapido() {
    // Verificar se já foi configurado para evitar duplicação
    if (window.dropdownConfigurado) {
        console.log('Dropdown já configurado pelo Dashboard, pulando...');
        return;
    }
    
    console.log('Configurando dropdown Início Rápido no Marketing...');
    
    const dropdownBtn = document.getElementById('inicioRapidoBtn');
    const dropdown = document.querySelector('.dropdown');
    
    console.log('Elementos encontrados:', {
        dropdownBtn: !!dropdownBtn,
        dropdown: !!dropdown,
        dropdownClasses: dropdown ? dropdown.className : 'N/A'
    });
    
    if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Clique no botão Início Rápido detectado! (Marketing)');
            
            const wasOpen = dropdown.classList.contains('open');
            dropdown.classList.toggle('open');
            
            console.log('Estado anterior:', wasOpen ? 'aberto' : 'fechado');
            console.log('Estado atual:', dropdown.classList.contains('open') ? 'aberto' : 'fechado');
            console.log('Classes do dropdown:', dropdown.className);
        });
        
        // Fechar dropdown ao clicar fora
        document.addEventListener('click', function(e) {
            if (!dropdown.contains(e.target)) {
                if (dropdown.classList.contains('open')) {
                    console.log('Fechando dropdown (clique fora)');
                    dropdown.classList.remove('open');
                }
            }
        });
        
        // Marcar como configurado
        window.dropdownConfigurado = true;
        console.log('Dropdown Início Rápido configurado com sucesso no Marketing');
    } else {
        console.error('ERRO: Elementos do dropdown Início Rápido não encontrados no Marketing:', {
            dropdownBtn: !!dropdownBtn,
            dropdown: !!dropdown
        });
    }
}

// ============================================
// GERENCIAMENTO DE NÚMEROS DE TELEFONE
// ============================================

function cadastrarNumero(cliente, numero) {
    console.log('Cadastrando número:', { cliente, numero });
    
    const dadosCliente = {
        id: cliente.id,
        nome: cliente.nome,
        telefone: numero,
        whatsapp: true,
        ativo: true,
        dataCadastro: new Date().toISOString()
    };
    
    return fetch(`${marketingConfig.apiUrl}/clientes/${cliente.id}/telefone`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosCliente)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Número cadastrado com sucesso:', data);
        return data;
    })
    .catch(error => {
        console.error('Erro ao cadastrar número:', error);
        throw error;
    });
}

// ============================================
// ENVIO DE MENSAGENS AUTOMÁTICAS
// ============================================

function enviarMensagemAutomatica(cliente, mensagem) {
    console.log('Enviando mensagem automática:', { cliente, mensagem });
    
    const dadosMensagem = {
        clienteId: cliente.id,
        telefone: cliente.telefone,
        tipo: mensagem.tipo,
        conteudo: mensagem.texto,
        agendamento: mensagem.agendamento || null,
        tentativas: 0,
        status: 'pendente',
        dataEnvio: new Date().toISOString()
    };
    
    return fetch(`${marketingConfig.apiUrl}/marketing/enviar-mensagem`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosMensagem)
    })
    .then(response => response.json())
    .then(data => {
        console.log('Mensagem enviada:', data);
        atualizarStatusMensagem(data.id, data.status);
        return data;
    })
    .catch(error => {
        console.error('Erro ao enviar mensagem:', error);
        atualizarStatusMensagem(dadosMensagem.id, 'falhou');
        throw error;
    });
}

// ============================================
// TEMPLATES DE MENSAGENS
// ============================================

const templatesMessages = {
    [marketingConfig.messageTypes.AGENDAMENTO]: {
        titulo: 'Lembrete de Agendamento de Serviço',
        texto: `🐾 Olá {nomeCliente}! 

Lembramos que {nomePet} tem um agendamento marcado para {dataAgendamento} às {horaAgendamento}.

📍 Local: Pet Cria
🕐 Horário: {horaAgendamento}
💼 Serviço: {tipoServico}

Até breve! 🐕❤️`,
        ativo: true
    },
    
    [marketingConfig.messageTypes.PET_PRONTO]: {
        titulo: 'Aviso que o pet está pronto',
        texto: `🎉 Boa notícia, {nomeCliente}! 

{nomePet} está prontinho e te esperando aqui na Pet Cria! 🐾✨

Pode vir buscar quando quiser. Estamos aqui até às 18h.

Obrigado pela confiança! 💙`,
        ativo: false
    },
    
    [marketingConfig.messageTypes.VENDA_PRODUTOS]: {
        titulo: 'Lembrete de Oportunidade de Venda para Produtos',
        texto: `🛍️ Olá {nomeCliente}! 

Notamos que está na hora de renovar alguns produtos para {nomePet}!

🦴 Ração
🧴 Shampoo
💊 Suplementos

Temos ofertas especiais hoje! Que tal dar uma passadinha? 😊`,
        ativo: false
    },
    
    [marketingConfig.messageTypes.PLANO_BANHOS]: {
        titulo: 'Ciclo do plano de banhos por Consumo foi concluído',
        texto: `🛁 Olá {nomeCliente}! 

O plano de banhos de {nomePet} foi concluído! 

Para manter {nomePet} sempre limpinho e cheiroso, que tal renovar o plano?

💆‍♀️ Benefícios: desconto, prioridade e muito carinho!

Entre em contato conosco! 🐾💙`,
        ativo: false
    }
};

// ============================================
// GERENCIAMENTO DE STATUS
// ============================================

function atualizarStatusMensagem(mensagemId, novoStatus) {
    console.log(`Atualizando status da mensagem ${mensagemId} para: ${novoStatus}`);
    
    const elementoStatus = document.querySelector(`[data-mensagem-id="${mensagemId}"]`);
    if (elementoStatus) {
        elementoStatus.className = `message-status ${novoStatus}`;
        
        let icone = 'fas fa-clock';
        let texto = 'Pendente';
        
        switch (novoStatus) {
            case 'enviado':
                icone = 'fas fa-check-circle';
                texto = 'Enviado com sucesso!';
                break;
            case 'falhou':
                icone = 'fas fa-exclamation-circle';
                texto = 'Falha no envio!';
                break;
            case 'pendente':
                icone = 'fas fa-clock';
                texto = 'Aguardando envio...';
                break;
        }
        
        elementoStatus.innerHTML = `<i class="${icone}"></i><span>${texto}</span>`;
    }
}

// ============================================
// INTERFACE E EVENTOS
// ============================================

function carregarMensagens() {
    console.log('Carregando mensagens...');
    
    mensagensAtivas = [
        {
            id: 1,
            tipo: marketingConfig.messageTypes.AGENDAMENTO,
            titulo: templatesMessages[marketingConfig.messageTypes.AGENDAMENTO].titulo,
            status: 'ativo',
            tentativasNaoEnviadas: 2
        }
    ];
    
    mensagensInativas = Object.keys(templatesMessages)
        .filter(tipo => !templatesMessages[tipo].ativo)
        .map((tipo, index) => ({
            id: index + 2,
            tipo: tipo,
            titulo: templatesMessages[tipo].titulo,
            status: 'inativo'
        }));
    
    atualizarInterface();
}

function atualizarInterface() {
    const badgeAtivas = document.querySelector('.section-badge:not(.inactive)');
    const badgeInativas = document.querySelector('.section-badge.inactive');
    
    if (badgeAtivas) {
        badgeAtivas.textContent = `${mensagensAtivas.length} mensagens ativas`;
    }
    
    if (badgeInativas) {
        badgeInativas.textContent = `${mensagensInativas.length} mensagens inativas`;
    }
    
    const mensagensComErro = mensagensAtivas.filter(m => m.tentativasNaoEnviadas > 0);
    if (mensagensComErro.length > 0) {
        const statusElement = document.querySelector('.message-status.error span');
        if (statusElement) {
            const totalErros = mensagensComErro.reduce((sum, m) => sum + m.tentativasNaoEnviadas, 0);
            statusElement.textContent = `${totalErros} mensagens não enviadas!`;
        }
    }
}

function configurarEventosMarketing() {
    document.querySelectorAll('.inactive-message-card').forEach(card => {
        card.addEventListener('click', function() {
            const titulo = this.querySelector('.message-title').textContent;
            ativarMensagem(titulo);
        });
    });
    
    document.addEventListener('cadastrarNumero', function(event) {
        const { cliente, numero } = event.detail;
        cadastrarNumero(cliente, numero);
    });
}

function ativarMensagem(titulo) {
    console.log('Ativando mensagem:', titulo);
    
    const tipoMensagem = Object.keys(templatesMessages).find(
        tipo => templatesMessages[tipo].titulo === titulo
    );
    
    if (tipoMensagem) {
        templatesMessages[tipoMensagem].ativo = true;
        
        const mensagem = mensagensInativas.find(m => m.titulo === titulo);
        if (mensagem) {
            mensagensInativas = mensagensInativas.filter(m => m.titulo !== titulo);
            mensagem.status = 'ativo';
            mensagensAtivas.push(mensagem);
            
            atualizarInterface();
            console.log(`Mensagem "${titulo}" ativada com sucesso!`);
        }
    }
}

function verificarStatusMensagens() {
    console.log('Verificando status das mensagens...');
    
    fetch(`${marketingConfig.apiUrl}/marketing/status-mensagens`)
        .then(response => response.json())
        .then(data => {
            data.forEach(mensagem => {
                atualizarStatusMensagem(mensagem.id, mensagem.status);
            });
        })
        .catch(error => {
            console.error('Erro ao verificar status das mensagens:', error);
        });
}

// ============================================
// FUNÇÕES DO DROPDOWN INÍCIO RÁPIDO
// ============================================

function novoAtendimento() {
    console.log('Redirecionando para novo atendimento...');
    window.location.href = 'agendamentos-novo.html';
    closeDropdown();
}

function novoPet() {
    console.log('Redirecionando para novo pet...');
    alert('Funcionalidade de Novo Pet será implementada em breve!');
    closeDropdown();
}

function novoCliente() {
    console.log('Redirecionando para novo cliente...');
    window.location.href = 'novo-cliente.html';
    closeDropdown();
}

function novoContrato() {
    console.log('Novo contrato solicitado...');
    alert('Funcionalidade de Novo Contrato será implementada em breve!');
    closeDropdown();
}

function novaVenda() {
    console.log('Nova venda solicitada...');
    alert('Funcionalidade de Nova Venda será implementada em breve!');
    closeDropdown();
}

function novaContaPagar() {
    console.log('Nova conta a pagar solicitada...');
    alert('Funcionalidade de Nova Conta a Pagar será implementada em breve!');
    closeDropdown();
}

// Função para fechar dropdown
function closeDropdown() {
    const dropdown = document.querySelector('.dropdown');
    if (dropdown) {
        dropdown.classList.remove('open');
    }
}

// ============================================
// FUNÇÕES AUXILIARES PARA SIMULAÇÃO DE BACKEND
// ============================================

function loadDashboardData() {
    console.log('Carregando dados do dashboard de Marketing...');
    setTimeout(() => {
        updateStatistics();
    }, 1000);
}

function updateStatistics() {
    console.log('Atualizando estatísticas de Marketing...');
    const stats = {
        mensagensEnviadas: Math.floor(Math.random() * 100),
        clientesAtivos: Math.floor(Math.random() * 50),
        taxaSucesso: (Math.random() * 100).toFixed(1)
    };
    console.log('Estatísticas de Marketing atualizadas:', stats);
}

// ============================================
// UTILITÁRIOS
// ============================================

function formatarData(data) {
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
}

function formatarHora(hora) {
    if (typeof hora === 'string') {
        return hora;
    }
    const date = new Date(hora);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function validarNumeroTelefone(numero) {
    const numeroLimpo = numero.replace(/\D/g, '');
    const regex = /^[1-9]{2}9?[0-9]{8}$/;
    return regex.test(numeroLimpo);
}

// ============================================
// EXPORTAR FUNÇÕES PRINCIPAIS
// ============================================

window.MarketingSystem = {
    cadastrarNumero,
    enviarMensagemAutomatica,
    ativarMensagem,
    templatesMessages,
    marketingConfig
};

console.log('Sistema de Marketing inicializado com sucesso!');