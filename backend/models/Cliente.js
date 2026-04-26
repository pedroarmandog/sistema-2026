const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});
const { Sequelize, DataTypes } = require("sequelize");

// Carregar configuração de conexão do ambiente (fallbacks mantidos)
const dbName = process.env.DB_NAME || process.env.DATABASE_NAME || "petshop";
const dbUser = process.env.DB_USER || process.env.DATABASE_USER || "pethub";
const dbPassword =
  process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || "PetHub@123";
const dbHost = process.env.DB_HOST || process.env.DATABASE_HOST || "localhost";
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

// ------------------------------------------------------------
// Singleton Sequelize (única fonte de verdade para conexões DB)
// - Garante que `new Sequelize()` ocorra apenas aqui.
// - Configura pool controlado para evitar excesso de conexões.
// - Adiciona logging de queries e instrumentação básica de conexões.
// ------------------------------------------------------------

// Reusar instância global se houver (proteção contra múltiplos requires)
if (!global.__SEQUELIZE_SINGLETON__) {
  // logging customizado: registra queries e tempo de execução
  const dbLogger = (sql, timing) => {
    try {
      if (typeof timing === "number") {
        console.log(`[DB QUERY] [${timing}ms] ${sql}`);
      } else {
        console.log(`[DB QUERY] ${sql}`);
      }
    } catch (e) {
      console.log("[DB QUERY] (log falhou)");
    }
  };

  const sequelizeInstance = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: "mysql",
    dialectModule: require("mysql2"),
    // Pool obrigatório conforme pedido
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    // Habilita benchmark para receber tempo no logger
    benchmark: true,
    logging: dbLogger,
  });

  // Instrumentação simples para acompanhar conexões ativas
  try {
    const mgr = sequelizeInstance.connectionManager;
    if (mgr && mgr.getConnection && mgr.releaseConnection) {
      let _activeConnections = 0;
      const origGet = mgr.getConnection.bind(mgr);
      const origRelease = mgr.releaseConnection.bind(mgr);

      mgr.getConnection = async function (options) {
        const conn = await origGet(options);
        _activeConnections++;
        console.log(
          `[DB] connection acquired. Active connections: ${_activeConnections}`,
        );
        return conn;
      };

      mgr.releaseConnection = async function (connection) {
        try {
          await origRelease(connection);
        } finally {
          _activeConnections = Math.max(0, _activeConnections - 1);
          console.log(
            `[DB] connection released. Active connections: ${_activeConnections}`,
          );
        }
      };
    }
  } catch (e) {
    console.warn(
      "[DB] Falha ao instrumentar connectionManager:",
      e && e.message,
    );
  }

  // Guardar no global para reutilização segura
  global.__SEQUELIZE_SINGLETON__ = {
    sequelize: sequelizeInstance,
  };
}

const sequelize = global.__SEQUELIZE_SINGLETON__.sequelize;

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
