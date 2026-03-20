const { Sequelize, DataTypes } = require("sequelize");

// Usar mesma configuração que outros modelos (local MySQL petshop)
const sequelize = new Sequelize("petshop", "root", "@Pedropro14", {
  host: "localhost",
  dialect: "mysql",
});

const Produto = sequelize.define(
  "Produto",
  {
    id: {
      type: DataTypes.STRING(64),
      primaryKey: true,
      allowNull: false,
    },
    nome: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },
    codigo: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    tipo: {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: "produto",
    },
    finalidade: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    categoria: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    centroResultado: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    marca: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    unidade: {
      type: DataTypes.STRING(32),
      allowNull: true,
      defaultValue: "UN",
    },
    agrupamento: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    perfilComissao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    curva: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    custoBase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    margem: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0,
    },
    preco: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    ultimoPrecoAlterado: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    estoqueAtual: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    estoqueMinimo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    estoqueIdeal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    perfilDesconto: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    fornecedores: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    composicao: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Campos clínicos/medicinais adicionais esperados pelo frontend
    controlado: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    principioAtivo: {
      type: DataTypes.STRING(256),
      allowNull: true,
    },
    formaFarmaceutica: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    apresentacao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    viaAdministracao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    tipoFarmacia: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    perfilValidade: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    validade: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    diasOportunidadeVenda: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    apresentacoesDiferentes: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    empresa: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    permiteEstoqueNegativo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "nao",
    },
    localizacao: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    fatorCompra: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    atendimento: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    percentualMargem: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: true,
      defaultValue: 0,
    },
    reaisMargem: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
    },
    // Campos específicos de serviço/plano
    diasOportunidadeVendaServico: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    duracaoHoras: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    duracaoMinutos: {
      type: DataTypes.STRING(16),
      allowNull: true,
    },
    situacaoTributariaECF: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    impostoISS: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    tipoPlano: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    textoContrato: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    ncm: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    cest: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    codigosBarras: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    codigoBarras: {
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    imagem: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
    },
    ativo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      defaultValue: "sim",
    },
    empresa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    tableName: "itens",
    timestamps: true,
  },
);

module.exports = Produto;
