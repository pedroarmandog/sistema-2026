const { Sequelize } = require("../backend/node_modules/sequelize");
const seq = new Sequelize("petshop", "root", "@Pedropro14", {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});
seq
  .query(
    "SELECT id, nome, perfilComissao FROM itens WHERE nome LIKE '%BANHO%' OR nome LIKE '%HIDRAT%' OR nome LIKE '%ESCOVA%' ORDER BY nome",
  )
  .then(([r]) => {
    console.log("Produtos encontrados:", r.length);
    r.forEach((x) =>
      console.log(
        " id:",
        x.id,
        " nome:",
        x.nome,
        "| perfilComissao:",
        JSON.stringify(x.perfilComissao),
      ),
    );
    seq.close();
  })
  .catch((e) => {
    console.error(e.message);
    seq.close();
  });
