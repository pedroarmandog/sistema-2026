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
        
        // Filtro por data - usar SQL DATE() para ignorar timezone
        if (data) {
            const { Sequelize } = require('sequelize');
            whereClause[Op.and] = [
                Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('dataAgendamento')),
                    '=',
                    data
                )
            ];
            console.log('📅 Filtro de data aplicado:', data);
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
            petId: agendamento.petId
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

        // Combinar data e hora
        const dataAgendamento = new Date(`${data}T${hora}:00`);

        // Verificar conflitos de horário (mesmo PET no mesmo horário)
        // Permitir agendamentos diferentes ao mesmo horário para pets distintos
        const conflito = await Agendamento.findOne({
            where: {
                dataAgendamento: dataAgendamento,
                petId: petId,
                status: {
                    [Op.not]: 'cancelado'
                }
            }
        });

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
            
            const dataString = `${data}T${horaNormalizada}`;
            console.log('🕐 Criando data:', dataString);
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

// PATCH /api/agendamentos/:id/status - Atualizar apenas o status
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

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

        await agendamento.update({ status });

        res.json({ message: 'Status atualizado com sucesso', status });
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
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

        // Criar PDF
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        
        // Headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=comprovante-${id}.pdf`);
        
        doc.pipe(res);

        // ===== Layout em blocos com colunas fixas e controle de Y para evitar sobreposição =====
        const left = 50;
        const right = 545;
        const pageWidth = 595; // A4 width approx
        const lineHeight = 14;

        // Cabeçalho: tentar usar logo da empresa (cadastro-empresa) com fallback em texto
        let logoRendered = false;
        try {
            const empresa = await Empresa.findOne({ where: { ativa: true }, order: [['id', 'ASC']] });
            let logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png');
            if (empresa && empresa.logo) {
                const candidate = path.join(__dirname, '../../uploads', empresa.logo);
                if (fs.existsSync(candidate)) logoPath = candidate;
            }

            if (fs.existsSync(logoPath)) {
                const logoWidth = 90;
                const logoX = (pageWidth - logoWidth) / 2;
                const logoY = 30;
                try { doc.image(logoPath, logoX, logoY, { width: logoWidth, align: 'center' }); logoRendered = true; } catch (e) { logoRendered = false; }
                // ajustar início do conteúdo abaixo da logo
                var y = logoY + 70;
            }
        } catch (e) {
            console.warn('Erro ao buscar logo da empresa:', e && e.message);
        }

        if (!logoRendered) {
            doc.fillColor('#000').fontSize(18).font('Helvetica-Bold').text('PET9', { align: 'center' });
            doc.fontSize(11).font('Helvetica-Bold').text('PET CRIA LTDA', { align: 'center' });
            doc.fontSize(9).font('Helvetica').text('Contato: (27)99910-4837', { align: 'center' });
            // iniciar y logo -> conteúdo
            var y = doc.y + 12;
        }

        // Dados do cliente e emissão (blocos à esquerda e direita)
        const clienteCodigo = agendamento.pet?.cliente?.codigo || '550';
        const clienteNome = agendamento.pet?.cliente?.nome || 'Rodrigo';
        const clienteTelefone = agendamento.pet?.cliente?.telefone || agendamento.pet?.cliente?.celular || '';
        const dataEmissao = new Date().toLocaleDateString('pt-BR');
        const petId = agendamento.pet?.id || '312';
        const petNome = agendamento.pet?.nome || 'Clark';

        doc.fontSize(9).font('Helvetica-Bold').fillColor('#c00').text(`Cliente: ${clienteCodigo} - ${clienteNome}`, left, y);
        if (clienteTelefone) doc.fontSize(9).font('Helvetica').fillColor('#000').text(`Contato: ${clienteTelefone}`, left, y + lineHeight);

        // Emissão e Atendimento à direita, usando largura para alinhar à direita
        const rightAreaWidth = right - left;
        doc.fontSize(9).font('Helvetica').fillColor('#000').text(`Emissão: ${dataEmissao}`, left, y, { width: rightAreaWidth, align: 'right' });
        doc.fontSize(9).font('Helvetica').text(`Atendimento: ${id}`, left, y + lineHeight, { width: rightAreaWidth, align: 'right' });

        // Pet em nova linha, alinhado à esquerda
        y += (clienteTelefone ? lineHeight * 2 : lineHeight) + 6;
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

        // Definir colunas fixas
        const descX = left;
        const qtyX = 360;
        const unitX = 430;
        const totalX = 500;

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
        const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        // Linha pontilhada visual (texto) para evitar uso de coordenadas absolutas
        const dashLine = Array(Math.floor(contentWidth / 6)).fill('.').join('');
        doc.fontSize(8).fillColor('#000').text(dashLine, { align: 'center', width: contentWidth });
        doc.moveDown(0.5);

        // Bloco de totais usando largura reduzida para deslocar visualmente o bloco para a esquerda
        const desiredOffsetFromRight = 140; // ajuste visual: quanto afastar da borda direita
        const totalsBlockWidth = Math.max(contentWidth - desiredOffsetFromRight, 140);

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

        doc.fontSize(10).font('Helvetica-Bold').text(`Total do Atendimento: R$ ${subtotal.toFixed(2)}`, { align: 'right', width: totalsBlockWidth, lineGap: 6 });

        // Espaçamento e formas de pagamento centradas em bloco próprio
        y += lineHeight + 16;
        doc.fontSize(9).font('Helvetica-Bold').text('Formas de Pagamento', left, y, { width: right - left, align: 'center' });

        y += lineHeight + 20;
        doc.save(); doc.lineWidth(0.5); doc.moveTo(left, y).lineTo(right, y).stroke(); doc.restore();

        y += 24;
        doc.fontSize(10).font('Helvetica-Bold').text(`Total do(s) atendimento(s): R$ ${subtotal.toFixed(2)}`, left, y, { width: right - left, align: 'center' });

        // Linha para assinatura
        y += 40;
        doc.moveTo(220, y).lineTo(380, y).stroke();
        y += 6;
        doc.fontSize(9).font('Helvetica').text('Assinatura', 220, y, { width: 160, align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Erro ao gerar comprovante:', error);
        res.status(500).json({ error: 'Erro ao gerar comprovante' });
    }
});

module.exports = router;