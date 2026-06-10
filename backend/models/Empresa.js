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
      inscricaoEstadual: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      inscricaoMunicipal: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      credenciamento: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      regime: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefone2: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      telefonePlantao: {
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
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
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