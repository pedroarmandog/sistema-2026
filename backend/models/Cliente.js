const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("petshop", "pethub", "PetHub@123", {
  host: "localhost",
  dialect: "mysql",
});

const Cliente = sequelize.define(
  "Cliente",
  {
    // Dados Pessoais
    nome: { type: DataTypes.STRING, allowNull: false },
    cpf: { type: DataTypes.STRING },
    rg: { type: DataTypes.STRING },
    data_nascimento: { type: DataTypes.DATE },
    idade: { type: DataTypes.INTEGER },
    sexo: { type: DataTypes.ENUM("Masculino", "Feminino") },

    // Contato
    telefone: { type: DataTypes.STRING, allowNull: false },
    telefones_adicionais: { type: DataTypes.JSON },
    email: { type: DataTypes.STRING },
    emails_adicionais: { type: DataTypes.JSON },

    // Endereço
    cep: { type: DataTypes.STRING },
    endereco: { type: DataTypes.STRING },
    numero: { type: DataTypes.STRING },
    complemento: { type: DataTypes.STRING },
    bairro: { type: DataTypes.STRING },
    cidade: { type: DataTypes.STRING },
    estado: { type: DataTypes.STRING },

    // Informações Comerciais
    limite_credito: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.0 },
    grupo_cliente: { type: DataTypes.STRING },
    perfil_desconto: { type: DataTypes.STRING },
    ativo: { type: DataTypes.BOOLEAN, defaultValue: true },
    empresa_id: { type: DataTypes.INTEGER, allowNull: true },

    // Informações Adicionais
    como_nos_conheceu: { type: DataTypes.STRING },
    observacoes: { type: DataTypes.TEXT },
    proximidade: { type: DataTypes.STRING },

    // Imagem
    imagem_perfil: { type: DataTypes.STRING },
  },
  {
    // Definir índices de forma controlada
    indexes: [
      {
        unique: true,
        fields: ["cpf"],
        name: "clientes_cpf_unique",
      },
      {
        unique: true,
        fields: ["email"],
        name: "clientes_email_unique",
      },
      {
        fields: ["nome"],
        name: "clientes_nome_index",
      },
      {
        fields: ["ativo"],
        name: "clientes_ativo_index",
      },
    ],
  },
);

module.exports = { Cliente, sequelize };
