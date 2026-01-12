const { Agendamento } = require('../models/Agendamento')
const Pet = require('../models/Pet')
const { Cliente } = require('../models/Cliente')

exports.createAgendamento = async (req, res) => {
    try {
        const { data, servico, petId } = req.body
        
        const agendamento = await Agendamento.create({ 
            data, 
            servico, 
            PetId: petId 
        })
        res.json(agendamento)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Erro ao criar agendamento'})
    }
}

exports.getAgendamentos = async (req, res) => {
    try {
        const { data } = req.query;
        let whereCondition = {};

        // Se uma data específica for fornecida, filtrar por ela
        if (data) {
            const dataInicio = new Date(data);
            const dataFim = new Date(data);
            dataFim.setDate(dataFim.getDate() + 1);

            whereCondition.dataAgendamento = {
                [require('sequelize').Op.gte]: dataInicio,
                [require('sequelize').Op.lt]: dataFim
            };
        }

        const agendamentos = await Agendamento.findAll({
            where: whereCondition,
            include: [{
                model: Pet,
                attributes: ['nome', 'tipo', 'raca'],
                include: [{
                    model: Cliente,
                    attributes: ['nome', 'email', 'telefone']
                }]
            }],
            order: [['dataAgendamento', 'ASC'], ['horario', 'ASC']]
        });

        // Transformar os dados para o formato esperado pelo frontend
        const agendamentosFormatados = agendamentos.map(agendamento => ({
            id: agendamento.id,
            horario: agendamento.horario,
            petNome: agendamento.Pet?.nome || 'N/A',
            clienteNome: agendamento.Pet?.Cliente?.nome || 'N/A',
            servico: agendamento.servico,
            profissional: agendamento.profissional,
            valor: agendamento.valor,
            status: agendamento.status,
            observacoes: agendamento.observacoes,
            dataAgendamento: agendamento.dataAgendamento
        }));

        res.json(agendamentosFormatados);
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Erro ao buscar agendamentos'})
    }
}