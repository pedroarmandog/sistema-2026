const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("petshop", "pethub", "PetHub@123", {
  host: "localhost",
  dialect: "mysql",
});

const Venda = sequelize.define(
  "Venda",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    data: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    cliente: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    clienteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    profissional: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profissionalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    itens: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    totais: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {},
    },
    pagamentos: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    totalPago: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "pendente", // pendente, parcial, pago, cancelado
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "vendas",
    timestamps: true,
  },
);

module.exports = { Venda, sequelize };
