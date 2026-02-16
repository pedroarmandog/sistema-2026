const express = require('express');
const router = express.Router();
const { Agendamento, Pet, Cliente, Empresa } = require('../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

// GET /api/agendamentos - Listar agendamentos
router.get('/', async (req, res) => {
    try {
        const { data, status, petCliente, profissional } = req.query;
        
        console.log('🔍 GET /api/agendamentos - Params:', { data, status, petCliente, profissional });
        
        const whereClause = {};
        
        // Filtro por data - usar intervalo com offset -03:00 para evitar
        // discrepâncias de timezone/UTC ao armazenar timestamps.
        if (data) {
            try {
                const start = new Date(`${data}T00:00:00-03:00`);
                const next = new Date(start);
                next.setDate(start.getDate() + 1);
                whereClause.dataAgendamento = {
                    [Op.gte]: start,
                    [Op.lt]: next
                };
                console.log('📅 Filtro de data aplicado (range):', start.toISOString(), next.toISOString());
            } catch (e) {
                console.warn('⚠️ Erro ao aplicar filtro de data como range, fallback para DATE():', e);
                const { Sequelize } = require('sequelize');
                whereClause[Op.and] = [
                    Sequelize.where(
                        Sequelize.fn('DATE', Sequelize.col('dataAgendamento')),
                        '=',
                        data
                    )
                ];
            }
        }
        
        // Filtro por status
        if (status && Array.isArray(status) && status.length > 0) {
            whereClause.status = {
                [Op.in]: status
            };
        }

        const agendamentos = await Agendamento.findAll({
            where: whereClause,
            include: [
                {
                    model: Pet,
                    as: 'pet',
                    include: [
                        {
                            model: Cliente,
                            as: 'cliente'
                        }
                    ],
                    where: petCliente ? {
                        nome: {
                            [Op.like]: `%${petCliente}%`
                        }
                    } : undefined
                }
            ],
            order: [['dataAgendamento', 'ASC'], ['horario', 'ASC']]
        });

        // Formatando os dados para o frontend (usar aliases corretos em minúsculas)
        const agendamentosFormatted = agendamentos.map(agendamento => ({
            id: agendamento.id,
            horario: agendamento.horario,
            petNome: agendamento.pet?.nome || 'Pet não encontrado',
            clienteNome: agendamento.pet?.cliente?.nome || 'Cliente não encontrado',
            servico: agendamento.servico,
            servicos: agendamento.servicos || [],
            observacoes: agendamento.observacoes,
            petObservacao: agendamento.pet?.observacao || null,
            profissional: agendamento.profissional,
            valor: agendamento.valor,
            status: agendamento.status,
            dataAgendamento: agendamento.dataAgendamento
        }));

        res.json(agendamentosFormatted);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/agendamentos/:id - Buscar agendamento por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const agendamento = await Agendamento.findByPk(id, {
            include: [
                {
                    model: Pet,
                    as: 'pet',
                    include: [{ model: Cliente, as: 'cliente' }]
                }
            ]
        });

        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        const agendamentoFormatted = {
            id: agendamento.id,
            horario: agendamento.horario,
            petNome: agendamento.pet?.nome || 'Pet não encontrado',
            clienteNome: agendamento.pet?.cliente?.nome || 'Cliente não encontrado',
            servico: agendamento.servico,
            servicos: agendamento.servicos || [],
            observacoes: agendamento.observacoes,
            petObservacao: agendamento.pet?.observacao || null,
            profissional: agendamento.profissional,
            valor: agendamento.valor,
            status: agendamento.status,
            dataAgendamento: agendamento.dataAgendamento,
            petId: agendamento.petId,
            prontuario: agendamento.prontuario || [],
            clinicaState: agendamento.clinicaState || null,
            pagamentos: agendamento.pagamentos || [],
            totalPago: agendamento.totalPago || 0
        };

        res.json(agendamentoFormatted);
    } catch (error) {
        console.error('Erro ao buscar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// POST /api/agendamentos - Criar novo agendamento
router.post('/', async (req, res) => {
    try {
        const { data, hora, petId, servico, servicos, observacoes, profissional, valor } = req.body;

        // Validações básicas
        if (!data || !hora || !petId || !servico) {
            return res.status(400).json({ 
                error: 'Campos obrigatórios: data, hora, petId e servico' 
            });
        }

        // Verificar se o pet existe
        const pet = await Pet.findByPk(petId);
        if (!pet) {
            return res.status(404).json({ error: 'Pet não encontrado' });
        }

        // Combinar data e hora (adicionar explicitamente o offset de São Paulo)
        // Isso evita problemas de conversão de timezone que movem o dia para frente/para trás
        // quando a string é interpretada como UTC pelo engine de JS/DB.
        const dataAgendamento = new Date(`${data}T${hora}:00-03:00`);

        // Verificar conflitos de horário (mesmo PET no mesmo horário)
        // Usar intervalo (start <= dataAgendamento < next) com offset -03:00
        let conflito = null;
        try {
            const start = new Date(`${data}T00:00:00-03:00`);
            const next = new Date(start);
            next.setDate(start.getDate() + 1);
            conflito = await Agendamento.findOne({
                where: {
                    petId: petId,
                    horario: hora,
                    dataAgendamento: {
                        [Op.gte]: start,
                        [Op.lt]: next
                    },
                    status: {
                        [Op.not]: 'cancelado'
                    }
                }
            });
        } catch (e) {
            console.warn('⚠️ fallback conflito por DATE():', e);
            const { Sequelize } = require('sequelize');
            conflito = await Agendamento.findOne({
                where: {
                    petId: petId,
                    horario: hora,
                    [Op.and]: Sequelize.where(
                        Sequelize.fn('DATE', Sequelize.col('dataAgendamento')),
                        '=',
                        data
                    ),
                    status: {
                        [Op.not]: 'cancelado'
                    }
                }
            });
        }

        if (conflito) {
            return res.status(409).json({ 
                error: 'Já existe um agendamento para este pet no mesmo horário' 
            });
        }

        const novoAgendamento = await Agendamento.create({
            dataAgendamento,
            horario: hora,
            petId,
            servico,
            servicos: Array.isArray(servicos) ? servicos : (servico ? [{ nome: servico, valor: valor || 0 }] : []),
            observacoes: observacoes || '',
            profissional: profissional || '',
            valor: valor || 0,
            status: 'agendado'
        });

        // Buscar o agendamento criado com os dados relacionados
        const agendamentoCriado = await Agendamento.findByPk(novoAgendamento.id, {
            include: [
                {
                    model: Pet,
                    as: 'pet',
                    include: [{ model: Cliente, as: 'cliente' }]
                }
            ]
        });

        const agendamentoFormatted = {
            id: agendamentoCriado.id,
            horario: agendamentoCriado.horario,
            petNome: agendamentoCriado.pet?.nome || 'Pet não encontrado',
            clienteNome: agendamentoCriado.pet?.cliente?.nome || 'Cliente não encontrado',
            servico: agendamentoCriado.servico,
            observacoes: agendamentoCriado.observacoes,
            profissional: agendamentoCriado.profissional,
            valor: agendamentoCriado.valor,
            status: agendamentoCriado.status,
            dataAgendamento: agendamentoCriado.dataAgendamento
        };

        res.status(201).json(agendamentoFormatted);
    } catch (error) {
        console.error('Erro ao criar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PUT /api/agendamentos/:id - Atualizar agendamento
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, hora, petId, servico, servicos, observacoes, profissional, valor, status } = req.body;

        console.log('📥 PUT /api/agendamentos/:id - Dados recebidos:', { id, data, hora, petId, servico, observacoes, profissional, valor, status });

        const agendamento = await Agendamento.findByPk(id);
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // Preparar dados para atualização
        const updateData = {};
        
        if (data && hora) {
            // Normalizar hora: se não tem segundos, adicionar :00
            let horaNormalizada = hora;
            const partesHora = hora.split(':');
            if (partesHora.length === 2) {
                // Formato HH:MM, adicionar segundos
                horaNormalizada = `${hora}:00`;
            }
            // Se já tem 3 partes (HH:MM:SS), usar como está
            
            const dataString = `${data}T${horaNormalizada}-03:00`;
            console.log('🕐 Criando data (com offset -03:00):', dataString);
            const dataObj = new Date(dataString);
            console.log('📅 Data criada:', dataObj, 'isValid:', !isNaN(dataObj.getTime()));
            
            if (isNaN(dataObj.getTime())) {
                console.error('❌ Data inválida gerada:', { data, hora, horaNormalizada, dataString });
                return res.status(400).json({ error: 'Data ou hora inválida', details: { data, hora } });
            }
            
            updateData.dataAgendamento = dataObj;
            updateData.horario = hora;
        } else {
            console.log('⚠️ Data ou hora não fornecida, mantendo valores atuais');
        }
        
        if (petId) updateData.petId = petId;
        if (servico) updateData.servico = servico;
        // Se o cliente enviar um array estruturado de serviços, persista também no campo JSON
        if (servicos && Array.isArray(servicos)) {
            console.log('PUT /api/agendamentos/:id received servicos payload:', { id, servicosLength: servicos.length });
            // Tratar o array enviado pelo cliente como autoritativo: sobrescrever o que está no banco
            try {
                // Deduplicar apenas os itens enviados pelo cliente (por id quando disponível, fallback por JSON)
                const seen = new Map();
                for (const it of servicos) {
                    try {
                        const key = (it && (it.id !== undefined && it.id !== null)) ? String(it.id) : JSON.stringify(it);
                        if (!seen.has(key)) seen.set(key, it);
                    } catch (e) {
                        const key = JSON.stringify(it);
                        if (!seen.has(key)) seen.set(key, it);
                    }
                }
                const merged = Array.from(seen.values());
                updateData.servicos = merged;
                // atualizar campo texto concatenado para compatibilidade com views legadas
                const names = merged.map(s => s && (s.nome || s.name || s.nomeServico) ? (s.nome || s.name || s.nomeServico) : '').filter(Boolean);
                updateData.servico = names.join(', ');
            } catch (e) {
                updateData.servicos = servicos;
            }
        }
        if (observacoes !== undefined) updateData.observacoes = observacoes;
        if (profissional !== undefined) updateData.profissional = profissional;
        if (valor !== undefined) updateData.valor = valor;
        if (status) updateData.status = status;

        await agendamento.update(updateData);

        // Buscar o agendamento atualizado com os dados relacionados
        const agendamentoAtualizado = await Agendamento.findByPk(id, {
            include: [
                {
                    model: Pet,
                    as: 'pet',
                    include: [{ model: Cliente, as: 'cliente' }]
                }
            ]
        });

        const agendamentoFormatted = {
            id: agendamentoAtualizado.id,
            horario: agendamentoAtualizado.horario,
            petNome: agendamentoAtualizado.pet?.nome || 'Pet não encontrado',
            clienteNome: agendamentoAtualizado.pet?.cliente?.nome || 'Cliente não encontrado',
            servico: agendamentoAtualizado.servico,
            servicos: agendamentoAtualizado.servicos || [],
            observacoes: agendamentoAtualizado.observacoes,
            profissional: agendamentoAtualizado.profissional,
            valor: agendamentoAtualizado.valor,
            status: agendamentoAtualizado.status,
            dataAgendamento: agendamentoAtualizado.dataAgendamento
        };

        res.json(agendamentoFormatted);
    } catch (error) {
        console.error('❌ Erro ao atualizar agendamento:', error);
        console.error('Stack trace:', error.stack);
        console.error('Payload recebido:', req.body);
        res.status(500).json({ 
            error: 'Erro interno do servidor',
            message: error.message,
            details: error.stack
        });
    }
});

// DELETE /api/agendamentos/:id - Deletar agendamento (cancelar)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const agendamento = await Agendamento.findByPk(id);
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // Em vez de deletar, vamos cancelar o agendamento
        await agendamento.update({ status: 'cancelado' });

        res.json({ message: 'Agendamento cancelado com sucesso' });
    } catch (error) {
        console.error('Erro ao cancelar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PATCH /api/agendamentos/:id/status - Atualizar status e opcionalmente pagamentos
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, pagamentos, totalPago } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status é obrigatório' });
        }

        const validStatuses = ['agendado', 'checkin', 'pronto', 'concluido', 'cancelado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ 
                error: 'Status inválido. Valores aceitos: ' + validStatuses.join(', ')
            });
        }

        const agendamento = await Agendamento.findByPk(id);
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        const updatePayload = { status };
        // aceitar pagamentos opcionais e totalPago
        if (pagamentos !== undefined) {
            try {
                updatePayload.pagamentos = Array.isArray(pagamentos) ? pagamentos : JSON.parse(pagamentos);
            } catch (e) {
                updatePayload.pagamentos = pagamentos;
            }
        }

        if (totalPago !== undefined) {
            const v = parseFloat(String(totalPago).replace(',', '.')) || 0;
            updatePayload.totalPago = v;
        }

        await agendamento.update(updatePayload);

        res.json({ message: 'Status (e pagamentos) atualizados com sucesso', status, pagamentos: updatePayload.pagamentos, totalPago: updatePayload.totalPago });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// PATCH /api/agendamentos/:id/prontuario - Salvar prontuário
router.patch('/:id/prontuario', async (req, res) => {
    try {
        const { id } = req.params;
        const { prontuario, clinicaState } = req.body;

        console.log('📥 Salvando prontuário/estado clínico para agendamento:', id);
        console.log('📝 Dados prontuário:', Array.isArray(prontuario) ? `array(${prontuario.length})` : typeof prontuario);
        console.log('🧭 Dados clinicaState:', clinicaState);

        const agendamento = await Agendamento.findByPk(id);
        if (!agendamento) {
            console.error('❌ Agendamento não encontrado:', id);
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        const updatePayload = {};
        if (prontuario !== undefined) updatePayload.prontuario = prontuario;
        if (clinicaState !== undefined) updatePayload.clinicaState = clinicaState;

        await agendamento.update(updatePayload);
        console.log('✅ Prontuário/estado clínico salvo com sucesso no banco');

        res.json({ message: 'Prontuário e estado clínico salvos com sucesso', prontuario: agendamento.prontuario, clinicaState: agendamento.clinicaState });
    } catch (error) {
        console.error('Erro ao salvar prontuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// GET /api/agendamentos/:id/comprovante - Gerar PDF do comprovante
router.get('/:id/comprovante', async (req, res) => {
    try {
        const { id } = req.params;
        const PDFDocument = require('pdfkit');

        // Buscar agendamento com dados relacionados
        const agendamento = await Agendamento.findByPk(id, {
            include: [
                {
                    model: Pet,
                    as: 'pet',
                    include: [{ model: Cliente, as: 'cliente' }]
                }
            ]
        });

        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // Criar PDF para impressora de cupom (ajustado para ser um pouco mais largo)
        const mmToPt = mm => mm * 72 / 25.4;
        const RECEIPT_MM = 72; // aumentar um pouco a largura do cupom (pouquinho mais largo que 58mm)
        const receiptWidth = Math.round(mmToPt(RECEIPT_MM)); // mm para pontos
        const receiptHeight = Math.round(mmToPt(300)); // altura padrão 300mm (ajustável)
        const smallMargin = Math.round(mmToPt(2)); // 2 mm
        const doc = new PDFDocument({ size: [receiptWidth, receiptHeight], margins: { top: smallMargin, bottom: smallMargin, left: smallMargin, right: smallMargin } });
        
        // Headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=comprovante-${id}.pdf`);
        
        doc.pipe(res);

        // ===== Layout em blocos com colunas fixas e controle de Y para evitar sobreposição =====
        const left = doc.page.margins.left;
        const right = doc.page.width - doc.page.margins.right;
        const pageWidth = doc.page.width;
        const lineHeight = 12;

        // Cabeçalho: tentar usar logo da empresa (cadastro-empresa) com fallback em texto
        let logoRendered = false;
        let empresa = null;
        try {
            empresa = await Empresa.findOne({ where: { ativa: true }, order: [['id', 'ASC']] });
            let logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png');
            if (empresa && empresa.logo) {
                const candidate = path.join(__dirname, '../../uploads', empresa.logo);
                if (fs.existsSync(candidate)) logoPath = candidate;
            }

            if (fs.existsSync(logoPath)) {
                // ajustar o logo proporcionalmente à largura do cupom
                const maxLogoWidth = Math.round(pageWidth * 0.6);
                const logoWidth = Math.min(maxLogoWidth, Math.round(mmToPt(30)));
                const logoX = (pageWidth - logoWidth) / 2;
                const logoY = smallMargin + 4;
                try { doc.image(logoPath, logoX, logoY, { width: logoWidth, align: 'center' }); logoRendered = true; } catch (e) { logoRendered = false; }
                // ajustar início do conteúdo abaixo da logo — manter espaço maior para evitar sobreposição
                const logoEstimatedHeight = Math.round(logoWidth * 0.9);
                // reduzir ligeiramente o espaçamento para aproximar a razão social da logo
                var y = logoY + logoEstimatedHeight + 2;
            }
        } catch (e) {
            console.warn('Erro ao buscar logo da empresa:', e && e.message);
        }

        if (!logoRendered) {
            doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text('PET9', { align: 'center' });
            doc.fontSize(11).font('Helvetica-Bold').text('PET CRIA LTDA', { align: 'center' });
            doc.fontSize(9).font('Helvetica').text('Contato: (27)99910-4837', { align: 'center' });
            // iniciar y logo -> conteúdo; aumentar espaçamento quando não há logo real
            // aproximar um pouco (menos espaçamento) para a razão social
            var y = doc.y + 12;
        }

        // Exibir Razão Social da empresa abaixo da logo (se disponível)
        try {
            if (empresa && empresa.razaoSocial) {
                doc.fontSize(10).font('Helvetica').fillColor('#000').text(String(empresa.razaoSocial), left, y, { width: right - left, align: 'center' });
                y += lineHeight + 6;
            }
        } catch (e) { /* não bloquear geração por erro de leitura */ }

        // Dados do cliente e emissão (blocos à esquerda e direita)
        const clienteCodigo = agendamento.pet?.cliente?.codigo || '550';
        const clienteNome = agendamento.pet?.cliente?.nome || 'Rodrigo';
        const clienteTelefone = agendamento.pet?.cliente?.telefone || agendamento.pet?.cliente?.celular || '';
        const dataEmissao = new Date().toLocaleDateString('pt-BR');
        const petId = agendamento.pet?.id || '312';
        const petNome = agendamento.pet?.nome || 'Clark';

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#c00').text(`Cliente: ${clienteCodigo} - ${clienteNome}`, left, y);
        if (clienteTelefone) {
            doc.fontSize(9).font('Helvetica').fillColor('#000').text(`Contato: ${clienteTelefone}`, left, y + lineHeight);
        }

        // Avançar y para evitar sobreposição antes de imprimir Emissão/Atendimento
        const rightAreaWidth = right - left;
        const clienteLines = clienteTelefone ? 2 : 1;
        const spacingAfterCliente = clienteLines * lineHeight;
        // posicionar Emissão abaixo do nome/contato do cliente
        doc.fontSize(8).font('Helvetica').fillColor('#000').text(`Emissão: ${dataEmissao}`, left, y + spacingAfterCliente, { width: rightAreaWidth, align: 'right' });
        // manter fonte regular para 'Atendimento' logo abaixo de Emissão
        doc.fontSize(9).font('Helvetica').text(`Atendimento: ${id}`, left, y + spacingAfterCliente + lineHeight, { width: rightAreaWidth, align: 'right' });

        // Pet em nova linha, alinhado à esquerda — avançar y considerando linhas de cliente + emissão + atendimento
        y += spacingAfterCliente + lineHeight * 2 + 6;
        doc.fontSize(9).font('Helvetica').text(`Pet: ${petId} - ${petNome}`, left, y);

        // Espaçamento antes da tabela
        y += lineHeight + 6;

        // Linha pontilhada (usar dash para manter visual consistente)
        doc.save();
        doc.lineWidth(0.7);
        doc.dash(2, { space: 3 });
        doc.moveTo(left, y).lineTo(right, y).stroke();
        doc.undash();
        doc.restore();

        y += 10;

        // Definir colunas responsivas (percentuais) para caber bem no cupom
        const contentWidth = pageWidth - doc.page.margins.left - doc.page.margins.right;
        const totalColWidth = Math.round(contentWidth * 0.28);
        const unitColWidth = Math.round(contentWidth * 0.18);
        const qtyColWidth = Math.round(contentWidth * 0.12);

        const totalX = right - totalColWidth;
        const unitX = totalX - unitColWidth;
        const qtyX = unitX - qtyColWidth;
        const descX = left;

        // Cabeçalho da tabela
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
        doc.text('Descrição', descX, y, { width: qtyX - descX - 8 });
        doc.text('Qtd', qtyX, y, { width: unitX - qtyX, align: 'center' });
        doc.text('Vlr Unit', unitX, y, { width: totalX - unitX, align: 'right' });
        doc.text('Total', totalX, y, { width: right - totalX, align: 'right' });

        y += lineHeight + 6;

        // Linha divisória
        doc.save(); doc.lineWidth(0.5); doc.moveTo(left, y - 4).lineTo(right, y - 4).stroke(); doc.restore();

        // Serviços
        const servicos = agendamento.servicos || [];
        let subtotal = 0;
        doc.font('Helvetica').fontSize(9).fillColor('#000');

        for (let i = 0; i < servicos.length; i++) {
            const servico = servicos[i];
            const quantidade = parseFloat(servico.quantidade) || 1;
            const unitario = parseFloat(servico.unitario || servico.valor) || 0;
            const desconto = parseFloat(servico.desconto) || 0;
            const valorComDesconto = unitario * (1 - desconto / 100);
            const total = quantidade * valorComDesconto;
            subtotal += total;

            const descricao = servico.nome || '';

            // Verificar quebra de página
            if (y > doc.page.height - 120) {
                doc.addPage();
                y = 60;
            }

            // Descrição (pode quebrar em várias linhas)
            const descWidth = qtyX - descX - 8;
            const descHeight = doc.heightOfString(descricao, { width: descWidth });
            doc.text(descricao, descX, y, { width: descWidth });

            // Quantidade, Valor Unitário e Total alinhados nas colunas
            doc.text(String(quantidade), qtyX, y, { width: unitX - qtyX, align: 'center' });
            doc.text(`R$ ${valorComDesconto.toFixed(2)}`, unitX, y, { width: totalX - unitX, align: 'right' });
            doc.text(`R$ ${total.toFixed(2)}`, totalX, y, { width: right - totalX, align: 'right' });

            // avançar y pela maior altura entre descrição e linha simples
            y += Math.max(descHeight, lineHeight) + 6;
        }

        // Espaço antes dos totais - usar fluxo (sem x/y) e bloco exclusivo para valores
        doc.moveDown(1);

        // Linha pontilhada visual (texto) para evitar uso de coordenadas absolutas
        const dashLine = Array(Math.floor(contentWidth / 6)).fill('.').join('');
        doc.fontSize(8).fillColor('#000').text(dashLine, { align: 'center', width: contentWidth });
        doc.moveDown(0.5);

        // Bloco de totais usando largura reduzida para deslocar visualmente o bloco para a esquerda
        const desiredOffsetFromRight = Math.round(mmToPt(6)); // ~6mm
        const totalsBlockWidth = Math.max(contentWidth - desiredOffsetFromRight, totalColWidth + 12);

        doc.moveDown(0.2);
        doc.fontSize(9).font('Helvetica').fillColor('#000').text(`Subtotal: R$ ${subtotal.toFixed(2)}`, { align: 'right', width: totalsBlockWidth, lineGap: 4 });
        doc.moveDown(0.3);
        doc.fontSize(9).font('Helvetica').text(`(-) Descontos: R$ 0,00`, { align: 'right', width: totalsBlockWidth, lineGap: 4 });
        doc.moveDown(0.6);

        // Linha separadora curta antes do total
        const sepLen = Math.floor(totalsBlockWidth / 6);
        const separator = Array(sepLen).fill('-').join('');
        doc.fontSize(9).text(separator, { align: 'right', width: totalsBlockWidth });
        doc.moveDown(0.6);

        // Espaçamento e formas de pagamento centradas em bloco próprio
        y += lineHeight + 16;
        doc.fontSize(9).font('Helvetica-Bold').text('Formas de Pagamento', left, y, { width: right - left, align: 'center' });

        // Mostrar formas de pagamento salvas no agendamento, se houver
        const pagamentos = agendamento.pagamentos || [];
        if (Array.isArray(pagamentos) && pagamentos.length > 0) {
            y += lineHeight + 8;
            doc.fontSize(9).font('Helvetica').fillColor('#000');
            // helper para mapear chave da forma para rótulo legível
            const formaLabel = (f) => {
                if (!f) return '';
                const map = { dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito', pix: 'Pix', crediario: 'Crediário', cheque: 'Cheque', haver: 'Haver' };
                return map[f] || String(f);
            };

            pagamentos.forEach(p => {
                try {
                    const label = formaLabel(p.forma || p.tipo || p.method);
                    const valor = (p.valor !== undefined && p.valor !== null) ? `R$ ${Number(p.valor).toFixed(2)}` : '';
                    doc.text(label, left + 6, y, { width: (right - left) - 12, align: 'left' });
                    if (valor) doc.text(valor, left + 6, y, { width: (right - left) - 12, align: 'right' });
                    y += lineHeight + 4;
                } catch (e) { /* não bloquear drawing por item inválido */ }
            });

            y += 6;
        } else {
            // manter espaço similar quando não há pagamentos
            y += lineHeight + 12;
        }

        // Depois das formas de pagamento, desenhar a linha separadora (assim pagamentos ficam acima dela)
        doc.save(); doc.lineWidth(0.5); doc.moveTo(left, y).lineTo(right, y).stroke(); doc.restore();
        y += 8;

        // Total centralizado abaixo da linha
        doc.fontSize(10).font('Helvetica-Bold').text(`Total do(s) atendimento(s): R$ ${subtotal.toFixed(2)}`, left, y, { width: right - left, align: 'center' });

        // Linha para assinatura (aumentar espaço para ficar mais abaixo que o total)
        // Ajuste feito para afastar a assinatura do bloco de totais
        // Linha para assinatura (centralizada no cupom)
        y += 60;
        if (y > doc.page.height - 60) {
            doc.addPage({ size: [receiptWidth, receiptHeight], margins: { top: smallMargin, bottom: smallMargin, left: smallMargin, right: smallMargin } });
            y = smallMargin + 20;
        }
        const sigLineLeft = left + 12;
        const sigLineRight = right - 12;
        doc.moveTo(sigLineLeft, y).lineTo(sigLineRight, y).stroke();
        y += 6;
        doc.fontSize(9).font('Helvetica').text('Assinatura', sigLineLeft, y, { width: sigLineRight - sigLineLeft, align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Erro ao gerar comprovante:', error);
        res.status(500).json({ error: 'Erro ao gerar comprovante' });
    }
});

module.exports = router;