const { Sequelize, DataTypes } = require('sequelize');

// Mesma conexão simples usada em ImpressoraConfig
const sequelize = new Sequelize('petshop', 'root', '@Pedropro14', {
    host: 'localhost',
    dialect: 'mysql'
});

const ModeloEtiquetaConfig = sequelize.define('ModeloEtiquetaConfig', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    modelo: { type: DataTypes.STRING(255), allowNull: false },
    usuario: { type: DataTypes.STRING(128), allowNull: true }
}, {
    tableName: 'modelo_etiqueta_config',
    timestamps: true
});

module.exports = ModeloEtiquetaConfig;
