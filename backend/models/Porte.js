const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('petshop', 'pethub', 'PetHub@123', {
    host: '72.60.244.46',
    dialect: 'mysql'
});

const Porte = sequelize.define('Porte', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    descricao: {
        type: DataTypes.STRING(255),
        allowNull: true
    }
}, {
    tableName: 'portes',
    timestamps: true
});

module.exports = Porte;
