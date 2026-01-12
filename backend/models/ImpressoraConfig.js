const { Sequelize, DataTypes } = require('sequelize');

// Conexão simples (mesma DB usada por outros modelos neste projeto)
const sequelize = new Sequelize('petshop', 'root', '@Pedropro14', {
    host: 'localhost',
    dialect: 'mysql'
});

const ImpressoraConfig = sequelize.define('ImpressoraConfig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo: { type: DataTypes.STRING(64), allowNull: false },
    usuario: { type: DataTypes.STRING(128), allowNull: true }
}, {
    tableName: 'impressora_config',
    timestamps: true
});

module.exports = ImpressoraConfig;
