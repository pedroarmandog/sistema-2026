// Seed para criar admin padrão (pedro / @Pedropro14)
const { Admin } = require("../models");

async function criarAdminInicial() {
  try {
    const adminExistente = await Admin.findOne({
      where: { email: "pedro@pethub.com" },
    });
    if (!adminExistente) {
      console.log("📝 Criando admin inicial do painel...");
      await Admin.create({
        nome: "Pedro",
        sobrenome: "Admin",
        email: "pedro@pethub.com",
        senha: "@Pedropro14", // será hasheado pelo hook beforeCreate
        cpf: "00000000000",
        telefone: "00000000000",
        ativo: true,
      });
      console.log("✅ Admin inicial do painel criado (pedro@pethub.com)");
    } else {
      console.log("ℹ️  Admin inicial do painel já existe");
    }
  } catch (error) {
    console.error("❌ Erro ao criar admin inicial do painel:", error.message);
  }
}

module.exports = criarAdminInicial;
