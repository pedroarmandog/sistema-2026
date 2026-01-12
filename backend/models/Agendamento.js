const { Sequelize, DataTypes } = require('sequelize')
const sequelize = new Sequelize('petshop', 'root', '@Pedropro14', {
    host: 'localhost',
    dialect: 'mysql'
})

const Agendamento = sequelize.define('Agendamento', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    dataAgendamento: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Data e hora do agendamento'
    },
    horario: {
        type: DataTypes.TIME,
        allowNull: false,
        comment: 'Horário do agendamento (formato HH:MM)'
    },
    servico: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Tipo de serviço (consulta, banho, vacina, etc.)'
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Observações sobre o agendamento'
    },
    profissional: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Nome do profissional responsável'
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Valor do serviço'
    },
    status: {
        type: DataTypes.ENUM('agendado', 'checkin', 'pronto', 'concluido', 'cancelado'),
        allowNull: false,
        defaultValue: 'agendado',
        comment: 'Status do agendamento'
    },
    petId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pets',
            key: 'id'
        },
        comment: 'ID do pet relacionado'
    }
}, {
    tableName: 'agendamentos',
    timestamps: true,
    indexes: [
        {
            fields: ['dataAgendamento']
        },
        {
            fields: ['status']
        },
        {
            fields: ['petId']
        }
    ]
})

module.exports = { Agendamento }