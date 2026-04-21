const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Empresa = sequelize.define(
    "Empresa",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nome: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      razaoSocial: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      cnpj: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      endereco: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      logo: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ultimaChavePix: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      ativa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "empresas",
      timestamps: true,
    },
  );

  return Empresa;
};
