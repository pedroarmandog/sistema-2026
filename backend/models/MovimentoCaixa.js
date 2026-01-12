const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('petshop', 'root', '@Pedropro14', {
    host: 'localhost',
    dialect: 'mysql'
});

const MovimentoCaixa = sequelize.define('MovimentoCaixa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tipo: {
        type: DataTypes.ENUM('entrada', 'saida'),
        allowNull: false
    },
    observacao: {
        type: DataTypes.STRING,
        allowNull: true
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    data: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    caixaId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'movimentos_caixa',
    timestamps: true
});

module.exports = { MovimentoCaixa, sequelize };
