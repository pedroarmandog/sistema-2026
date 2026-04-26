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
  // Simple query counter (metrics) - contar queries e logar por minuto
  if (!global.__DB_METRICS__) {
    global.__DB_METRICS__ = { qCount: 0 };
    setInterval(() => {
      try {
        console.log(
          `[DB METRICS] Queries no último minuto: ${global.__DB_METRICS__.qCount}`,
        );
      } catch (e) {}
      try {
        global.__DB_METRICS__.qCount = 0;
      } catch (e) {}
    }, 60 * 1000);
  }

  const dbLogger = (sql, timing) => {
    try {
      // incrementar contador de queries
      try {
        if (global.__DB_METRICS__) global.__DB_METRICS__.qCount++;
      } catch (e) {}

      // Tentar obter contexto da requisição (se disponível)
      let rid = "-";
      let rpath = "-";
      try {
        const requestContext = require("../services/requestContext");
        const store = requestContext.getStore
          ? requestContext.getStore()
          : null;
        if (store) {
          rid = store.requestId || rid;
          rpath = store.path || rpath;
        }
      } catch (e) {}

      // Extrair caller útil da stack (filtrar node_modules/sequelize)
      let caller = "";
      try {
        const st = new Error().stack || "";
        const lines = st.split("\n").slice(3);
        for (const l of lines) {
          if (
            !l.includes("node_modules") &&
            !l.includes("(internal") &&
            !l.includes("sequelize")
          ) {
            caller = l.trim();
            break;
          }
        }
      } catch (e) {}

      if (typeof timing === "number") {
        console.log(
          `[DB QUERY] [${timing}ms] rid=${rid} path=${rpath} caller=${caller} ${sql}`,
        );
      } else {
        console.log(
          `[DB QUERY] rid=${rid} path=${rpath} caller=${caller} ${sql}`,
        );
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
    // Pool otimizado para reduzir conexões simultâneas
    pool: {
      max: 3,
      min: 0,
      acquire: 20000,
      idle: 5000,
    },
    // Ativar benchmark apenas em desenvolvimento para ajudar no profiling
    benchmark: process.env.NODE_ENV !== "production",
    // Desabilitar logging pesado em produção
    logging: process.env.NODE_ENV === "production" ? false : dbLogger,
  });

  // Instrumentação simples para acompanhar conexões ativas (apenas logs)
  try {
    const mgr = sequelizeInstance.connectionManager;
    if (mgr && mgr.getConnection && mgr.releaseConnection) {
      let _activeConnections = 0;
      const origGet = mgr.getConnection.bind(mgr);
      const origRelease = mgr.releaseConnection.bind(mgr);
      const seenThreads = new Set();

      mgr.getConnection = async function (options) {
        const conn = await origGet(options);
        _activeConnections++;
        // tentar extrair threadId/connection id do objeto retornado (mysql2)
        let tid = "-";
        try {
          tid =
            conn.threadId ||
            conn.connection?.threadId ||
            conn._client?.threadId ||
            tid;
        } catch (e) {}

        // Logar quando um novo threadId aparecer (nova conexão física)
        try {
          if (tid !== "-" && !seenThreads.has(String(tid))) {
            seenThreads.add(String(tid));
            console.log(
              `[DB] NEW physical connection created. threadId=${tid}`,
            );
          }
        } catch (e) {}

        console.log(
          `[DB] connection acquired. Active connections: ${_activeConnections} threadId=${tid}`,
        );
        return conn;
      };

      mgr.releaseConnection = async function (connection) {
        let tid = "-";
        try {
          tid =
            connection?.threadId ||
            connection?.connection?.threadId ||
            connection?._client?.threadId ||
            tid;
        } catch (e) {}
        try {
          await origRelease(connection);
        } finally {
          _activeConnections = Math.max(0, _activeConnections - 1);
          console.log(
            `[DB] connection released. Active connections: ${_activeConnections} threadId=${tid}`,
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

  // Guardar no global para reutilização segura (singleton)
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
