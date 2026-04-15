// Test dashboard controller logic directly
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
const models = require("../backend/models");
const { Produto, Agendamento, Venda, Cliente, Pet, Entrada, sequelize } =
  models;
const { Op, literal } = require("sequelize");

(async () => {
  try {
    const empresaId = 5; // from user data

    // Test 1: vendas-hoje
    console.log("\n--- vendas-hoje ---");
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const vendasCount = await Venda.count({
      where: {
        data: { [Op.gte]: hoje, [Op.lt]: amanha },
        status: { [Op.ne]: "cancelado" },
        empresa_id: empresaId,
      },
    });
    console.log("OK vendas count:", vendasCount);

    // Test 2: indicadores-atendimento
    console.log("\n--- indicadores-atendimento ---");
    const agendados = await Agendamento.count({
      where: {
        dataAgendamento: { [Op.gte]: hoje, [Op.lt]: amanha },
        status: "agendado",
        empresa_id: empresaId,
      },
    });
    console.log("OK agendados:", agendados);

    // Test 3: clientes/1
    console.log("\n--- clientes/1 ---");
    const cliente = await Cliente.findByPk(1, {
      include: [
        { model: Pet, as: "pets" },
        { model: Venda, as: "vendas", required: false },
      ],
    });
    console.log("OK cliente:", cliente?.nome || "NOT FOUND");

    // Test 4: periodicos
    console.log("\n--- periodicos ---");
    const agPeriodicos = await Agendamento.findAll({
      where: { status: "concluido", empresa_id: empresaId },
      include: [
        {
          model: Pet,
          as: "pet",
          attributes: ["id", "nome"],
          include: [
            { model: Cliente, as: "cliente", attributes: ["id", "nome"] },
          ],
        },
      ],
      limit: 5,
    });
    console.log("OK periodicos agendamentos:", agPeriodicos.length);

    // Test 5: contas-a-pagar-hoje
    console.log("\n--- contas-a-pagar ---");
    const entradas = await Entrada.findAll({
      where: {
        situacao: { [Op.in]: ["pendente", "concluido"] },
        empresa_id: empresaId,
      },
      limit: 5,
    });
    console.log("OK entradas:", entradas.length);

    // Test 6: produtos-estoque-baixo
    console.log("\n--- produtos-estoque-baixo ---");
    const condition = "(estoqueAtual = 0) OR (estoqueAtual < estoqueMinimo)";
    const prods = await Produto.findAll({
      where: { [Op.and]: [literal(condition)], empresa_id: empresaId },
      limit: 5,
    });
    console.log("OK produtos estoque baixo:", prods.length);

    console.log("\n✅ TODOS OS TESTES PASSARAM");
    process.exit(0);
  } catch (e) {
    console.error("\n❌ ERRO:", e.message);
    console.error(e.stack);
    process.exit(1);
  }
})();
