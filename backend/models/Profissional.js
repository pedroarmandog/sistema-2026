const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('petshop', 'root', '@Pedropro14', {
    host: 'localhost',
    dialect: 'mysql'
});

const Profissional = sequelize.define('Profissional', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    codigo: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    nome: {
        type: DataTypes.STRING,
        allowNull: false
    },
    telefone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    especialidade: {
        type: DataTypes.STRING,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('ativo', 'inativo'),
        allowNull: false,
        defaultValue: 'ativo'
    },
    cpf: {
        type: DataTypes.STRING,
        allowNull: true
    },
    crmv: {
        type: DataTypes.STRING,
        allowNull: true
    },
    comissao: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    }
}, {
    tableName: 'profissionais',
    timestamps: true
});

module.exports = { Profissional, sequelize };
