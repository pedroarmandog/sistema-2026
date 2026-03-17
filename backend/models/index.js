const { Cliente } = require("./Cliente");
const Pet = require("./Pet");
const { Agendamento } = require("./Agendamento");
const { Venda } = require("./Venda");
const { Orcamento } = require("./Orcamento");
const { Caixa } = require("./Caixa");
const { MovimentoCaixa } = require("./MovimentoCaixa");
const { PagamentoCaixa } = require("./PagamentoCaixa");
const { Profissional } = require("./Profissional");
const EmpresaFactory = require("./Empresa");
const PerfilProduto = require("./PerfilProduto");
const PerfilCliente = require("./PerfilCliente");
const DescontoRelacao = require("./DescontoRelacao");
const AgrupamentoFactory = require("./Agrupamento");
const PerfilComissaoFactory = require("./PerfilComissao");
const ComissaoFactory = require("./Comissao");
const Porte = require("./Porte");
const Pelagem = require("./Pelagem");
const Raca = require("./Raca");
const Box = require("./Box");
const GrupoCliente = require("./GrupoCliente");
const Produto = require("./Produto");
const Fornecedor = require("./Fornecedor");
const Entrada = require("./Entrada");
const Saida = require("./Saida");
const PeriodicidadeFactory = require("./Periodicidade");

// Importar sequelize do Cliente para inicializar os modelos factory
const { sequelize } = require("./Cliente");
const Agrupamento = AgrupamentoFactory(sequelize);
const PerfilComissao = PerfilComissaoFactory(sequelize);
const Comissao = ComissaoFactory(sequelize);
const Empresa = EmpresaFactory(sequelize);
const Periodicidade = PeriodicidadeFactory(sequelize);
// Inicializar modelo Usuario (factory)
const UsuarioFactory = require("./Usuario");
const Usuario = UsuarioFactory(sequelize);
// Inicializar modelo UserFilter
const UserFilterFactory = require("./UserFilter");
const UserFilter = UserFilterFactory(sequelize);

// Definir associações
Cliente.hasMany(Pet, {
  foreignKey: "cliente_id",
  as: "pets",
});

Pet.belongsTo(Cliente, {
  foreignKey: "cliente_id",
  as: "cliente",
});

Pet.hasMany(Agendamento, {
  foreignKey: "petId",
  as: "agendamentos",
});

Agendamento.belongsTo(Pet, {
  foreignKey: "petId",
  as: "pet",
});

// Associação Venda ↔ Cliente
Venda.belongsTo(Cliente, {
  foreignKey: "clienteId",
  as: "Cliente",
});

Cliente.hasMany(Venda, {
  foreignKey: "clienteId",
  as: "vendas",
});

console.log("✅ Associações Cliente ↔ Pet ↔ Agendamento configuradas");
console.log("✅ Associações Cliente ↔ Venda configuradas");

// Exportar todos os modelos
module.exports = {
  Cliente,
  Pet,
  Agendamento,
  Venda,
  Orcamento,
  Caixa,
  MovimentoCaixa,
  PagamentoCaixa,
  Profissional,
  Empresa,
  PerfilProduto,
  PerfilCliente,
  DescontoRelacao,
  Agrupamento,
  PerfilComissao,
  Comissao,
  Porte,
  Pelagem,
  Raca,
  Box,
  GrupoCliente,
  Periodicidade,
  Usuario,
  UserFilter,
  Produto,
  Fornecedor,
  Entrada,
  Saida,
  sequelize,
};
