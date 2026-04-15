const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('petshop', 'pethub', 'PetHub@123', {
    host: '72.60.244.46',
    dialect: 'mysql'
});

const PerfilCliente = sequelize.define('PerfilCliente', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    descricao: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    fixo: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: null
    },
    maximo: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: null
    },
    gerente: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: null
    }
}, {
    tableName: 'perfis_cliente',
    timestamps: true
});

module.exports = PerfilCliente;
