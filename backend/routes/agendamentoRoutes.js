const express = require('express');
const router = express.Router();
const { Agendamento, Pet, Cliente } = require('../models');
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

        const agendamento = await Agendamento.findByPk(id);
        if (!agendamento) {
            return res.status(404).json({ error: 'Agendamento não encontrado' });
        }

        // Preparar dados para atualização
        const updateData = {};
        
        if (data && hora) {
            updateData.dataAgendamento = new Date(`${data}T${hora}:00`);
            updateData.horario = hora;
        }
        
        if (petId) updateData.petId = petId;
        if (servico) updateData.servico = servico;
        // Se o cliente enviar um array estruturado de serviços, persista também no campo JSON
        if (servicos && Array.isArray(servicos)) {
            // Mesclar com o que já existe no banco para evitar perda de dados
            try {
                const existing = Array.isArray(agendamento.servicos) ? agendamento.servicos : [];
                const combined = existing.concat(servicos);
                // Deduplicar por id ou por conteúdo serializado quando id ausente
                const seen = new Map();
                for (const it of combined) {
                    try {
                        const key = (it && (it.id !== undefined && it.id !== null)) ? String(it.id) : JSON.stringify(it);
                        if (!seen.has(key)) seen.set(key, it);
                    } catch (e) {
                        // fallback: use index-based key
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
        console.error('Erro ao atualizar agendamento:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
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

module.exports = router;