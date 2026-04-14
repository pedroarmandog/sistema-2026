const path = require("path");
const fs = require("fs");
const {
  EmpresaPainel,
  Empresa,
  Usuario,
  BackupEmpresa,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");

const BACKUP_DIR = path.join(__dirname, "../../backups");
const MAX_BACKUP_DIAS = 7;

// Garantir que a pasta de backups existe
function garantirDiretorio(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Obtém todos os modelos que possuem campo empresa_id
 * (excluindo modelos administrativos como BackupEmpresa, AdminImpersonationToken, PagamentoPainel)
 */
function getModelsComEmpresaId() {
  const allModels = require("../models");
  const excluir = [
    "BackupEmpresa",
    "AdminImpersonationToken",
    "PagamentoPainel",
    "sequelize",
  ];
  const result = [];
  for (const key of Object.keys(allModels)) {
    if (excluir.includes(key)) continue;
    const m = allModels[key];
    if (
      m &&
      m.rawAttributes &&
      Object.prototype.hasOwnProperty.call(m.rawAttributes, "empresa_id")
    ) {
      result.push({ name: key, model: m });
    }
  }
  return result;
}

/**
 * Encontra o ID da empresa no sistema (tabela empresas) pelo CNPJ da empresaPainel
 */
async function getEmpresaSistemaId(empresaPainel) {
  const cnpj = empresaPainel.cnpj
    ? empresaPainel.cnpj.replace(/\D/g, "")
    : null;
  if (!cnpj) return null;
  const empresa = await Empresa.findOne({ where: { cnpj } });
  return empresa ? empresa.id : null;
}

/**
 * Busca os usuários vinculados a uma empresa
 */
async function getUsuariosEmpresa(empresaSistemaId) {
  if (!empresaSistemaId) return [];
  try {
    const target = JSON.stringify(empresaSistemaId);
    const [rows] = await sequelize.query(
      "SELECT * FROM usuarios WHERE JSON_CONTAINS(empresas, ?)",
      { replacements: [target] },
    );
    return rows;
  } catch (e) {
    console.warn("[backup] Erro ao buscar usuários:", e && e.message);
    return [];
  }
}

/**
 * Realiza backup completo de uma empresa
 */
async function realizarBackupEmpresa(empresaPainelId) {
  const empresaPainel = await EmpresaPainel.findByPk(empresaPainelId);
  if (!empresaPainel) {
    throw new Error(`Empresa painel ${empresaPainelId} não encontrada`);
  }

  const empresaSistemaId = await getEmpresaSistemaId(empresaPainel);

  // Data de referência = ontem
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  const dataRef = ontem.toISOString().split("T")[0];

  // Verificar se já existe backup para esta data
  const existente = await BackupEmpresa.findOne({
    where: {
      empresa_painel_id: empresaPainelId,
      data_referencia: dataRef,
    },
  });
  if (existente) {
    console.log(
      `[backup] Backup já existe para empresa ${empresaPainelId} data ${dataRef}`,
    );
    return existente;
  }

  const models = getModelsComEmpresaId();
  const backupData = {
    meta: {
      empresa_painel_id: empresaPainelId,
      empresa_sistema_id: empresaSistemaId,
      data_referencia: dataRef,
      criado_em: new Date().toISOString(),
      nome_empresa: empresaPainel.nome_fantasia,
    },
    empresa_painel: empresaPainel.toJSON(),
    empresa_sistema: null,
    usuarios: [],
    tabelas: {},
  };

  let tabelasSalvas = 0;
  let registrosTotais = 0;

  // Backup dos dados da empresa no sistema
  if (empresaSistemaId) {
    const empresaSistema = await Empresa.findByPk(empresaSistemaId);
    if (empresaSistema) {
      backupData.empresa_sistema = empresaSistema.toJSON();
    }

    // Backup dos usuários
    backupData.usuarios = await getUsuariosEmpresa(empresaSistemaId);
    if (backupData.usuarios.length > 0) {
      registrosTotais += backupData.usuarios.length;
      tabelasSalvas++;
    }

    // Backup de cada tabela com empresa_id
    for (const entry of models) {
      try {
        const rows = await entry.model.findAll({
          where: { empresa_id: empresaSistemaId },
          raw: true,
        });
        if (rows.length > 0) {
          backupData.tabelas[entry.name] = rows;
          tabelasSalvas++;
          registrosTotais += rows.length;
        }
      } catch (e) {
        console.warn(
          `[backup] Erro ao exportar ${entry.name}:`,
          e && e.message,
        );
      }
    }
  }

  // Salvar arquivo
  const empresaDir = path.join(BACKUP_DIR, String(empresaPainelId));
  garantirDiretorio(empresaDir);
  const filePath = path.join(empresaDir, `${dataRef}.json`);
  const jsonStr = JSON.stringify(backupData, null, 2);
  fs.writeFileSync(filePath, jsonStr, "utf-8");
  const tamanho = Buffer.byteLength(jsonStr, "utf-8");

  // Registrar no banco
  const registro = await BackupEmpresa.create({
    empresa_painel_id: empresaPainelId,
    empresa_sistema_id: empresaSistemaId,
    data_referencia: dataRef,
    caminho_arquivo: filePath,
    tamanho_bytes: tamanho,
    tabelas_salvas: tabelasSalvas,
    registros_totais: registrosTotais,
    status: "COMPLETO",
  });

  console.log(
    `[backup] ✅ Backup empresa ${empresaPainel.nome_fantasia} (${dataRef}): ${tabelasSalvas} tabelas, ${registrosTotais} registros, ${(tamanho / 1024).toFixed(1)}KB`,
  );

  return registro;
}

/**
 * Remove backups mais antigos que 7 dias para uma empresa
 */
async function limparBackupsAntigos(empresaPainelId) {
  const limite = new Date();
  limite.setDate(limite.getDate() - MAX_BACKUP_DIAS);
  const dataLimite = limite.toISOString().split("T")[0];

  const antigos = await BackupEmpresa.findAll({
    where: {
      empresa_painel_id: empresaPainelId,
      data_referencia: { [Op.lt]: dataLimite },
    },
  });

  for (const backup of antigos) {
    // Remover arquivo do disco
    try {
      if (fs.existsSync(backup.caminho_arquivo)) {
        fs.unlinkSync(backup.caminho_arquivo);
      }
    } catch (e) {
      console.warn(
        `[backup] Erro ao remover arquivo ${backup.caminho_arquivo}:`,
        e && e.message,
      );
    }
    await backup.destroy();
  }

  if (antigos.length > 0) {
    console.log(
      `[backup] 🗑️ Removidos ${antigos.length} backups antigos da empresa ${empresaPainelId}`,
    );
  }
}

/**
 * Executa backup de TODAS as empresas (chamado pelo cron)
 */
async function executarBackupGeral() {
  console.log("[backup] ═══ Iniciando backup diário de todas as empresas ═══");
  const empresas = await EmpresaPainel.findAll();
  let sucesso = 0;
  let erros = 0;

  for (const emp of empresas) {
    try {
      await realizarBackupEmpresa(emp.id);
      await limparBackupsAntigos(emp.id);
      sucesso++;
    } catch (err) {
      erros++;
      console.error(
        `[backup] ❌ Erro no backup de ${emp.nome_fantasia}:`,
        err && err.message,
      );
    }
  }

  console.log(
    `[backup] ═══ Backup diário concluído: ${sucesso} OK, ${erros} erros ═══`,
  );
  return { sucesso, erros, total: empresas.length };
}

/**
 * Restaura o backup de uma empresa para uma data específica
 */
async function restaurarBackup(empresaPainelId, dataReferencia) {
  // Buscar registro do backup
  const backupReg = await BackupEmpresa.findOne({
    where: {
      empresa_painel_id: empresaPainelId,
      data_referencia: dataReferencia,
      status: { [Op.ne]: "ERRO" },
    },
  });

  if (!backupReg) {
    throw new Error("Backup não encontrado para esta data");
  }

  // Ler arquivo do backup
  if (!fs.existsSync(backupReg.caminho_arquivo)) {
    throw new Error("Arquivo de backup não encontrado no disco");
  }

  const jsonStr = fs.readFileSync(backupReg.caminho_arquivo, "utf-8");
  const backupData = JSON.parse(jsonStr);

  const empresaPainel = await EmpresaPainel.findByPk(empresaPainelId);
  if (!empresaPainel) {
    throw new Error("Empresa não encontrada");
  }

  const empresaSistemaId = await getEmpresaSistemaId(empresaPainel);
  if (!empresaSistemaId) {
    throw new Error("Empresa do sistema não encontrada pelo CNPJ");
  }

  const t = await sequelize.transaction();
  try {
    const models = getModelsComEmpresaId();

    // Ordem para deletar (filhos primeiro)
    const preferred = [
      "Agendamento",
      "Venda",
      "Comissao",
      "PerfilComissao",
      "Entrada",
      "Saida",
      "Caixa",
      "Produto",
      "Profissional",
      "Fornecedor",
      "Pet",
      "Cliente",
    ];

    const ordered = [
      ...preferred.map((n) => models.find((x) => x.name === n)).filter(Boolean),
      ...models.filter((x) => !preferred.includes(x.name)),
    ];

    // 1. Deletar todos os dados atuais da empresa
    for (const entry of ordered) {
      try {
        await entry.model.destroy({
          where: { empresa_id: empresaSistemaId },
          transaction: t,
          force: true,
        });
      } catch (e) {
        console.warn(`[restore] Erro ao limpar ${entry.name}:`, e && e.message);
      }
    }

    // 2. Restaurar dados da empresa (tabela empresas)
    if (backupData.empresa_sistema) {
      const empData = { ...backupData.empresa_sistema };
      delete empData.id;
      delete empData.createdAt;
      delete empData.updatedAt;
      await Empresa.update(empData, {
        where: { id: empresaSistemaId },
        transaction: t,
      });
    }

    // 3. Restaurar dados de cada tabela (ordem inversa — pais primeiro)
    const insertOrder = [...ordered].reverse();

    for (const entry of insertOrder) {
      const rows = backupData.tabelas[entry.name];
      if (!rows || rows.length === 0) continue;

      try {
        // Remover campos auto-gerados e ajustar empresa_id
        const cleaned = rows.map((row) => {
          const r = { ...row };
          delete r.id;
          r.empresa_id = empresaSistemaId;
          return r;
        });

        await entry.model.bulkCreate(cleaned, {
          transaction: t,
          ignoreDuplicates: true,
        });
        console.log(
          `[restore] ✅ ${entry.name}: ${cleaned.length} registros restaurados`,
        );
      } catch (e) {
        console.warn(
          `[restore] ⚠️ Erro ao restaurar ${entry.name}:`,
          e && e.message,
        );
      }
    }

    // 4. Restaurar usuários
    if (backupData.usuarios && backupData.usuarios.length > 0) {
      for (const u of backupData.usuarios) {
        try {
          const existing = await Usuario.findByPk(u.id, { transaction: t });
          if (existing) {
            // Atualizar campos relevantes (não a senha, que já está hasheada)
            await sequelize.query(
              `UPDATE usuarios SET nome = ?, grupoUsuario = ?, ativo = ?, permissoes = ?, empresas = ? WHERE id = ?`,
              {
                replacements: [
                  u.nome,
                  u.grupoUsuario,
                  u.ativo ? 1 : 0,
                  typeof u.permissoes === "string"
                    ? u.permissoes
                    : JSON.stringify(u.permissoes || []),
                  typeof u.empresas === "string"
                    ? u.empresas
                    : JSON.stringify(u.empresas || []),
                  u.id,
                ],
                transaction: t,
              },
            );
          }
        } catch (e) {
          console.warn(
            `[restore] ⚠️ Erro ao restaurar usuário ${u.id}:`,
            e && e.message,
          );
        }
      }
    }

    await t.commit();

    // Marcar backup como restaurado
    backupReg.status = "RESTAURADO";
    backupReg.observacao = `Restaurado em ${new Date().toISOString()}`;
    await backupReg.save();

    console.log(
      `[restore] ✅ Restauração completa para empresa ${empresaPainel.nome_fantasia} (data: ${dataReferencia})`,
    );

    return {
      success: true,
      message: `Dados restaurados para ${dataReferencia}`,
      tabelas: Object.keys(backupData.tabelas).length,
      registros: backupReg.registros_totais,
    };
  } catch (err) {
    await t.rollback();
    console.error("[restore] ❌ Erro na restauração:", err);
    throw err;
  }
}

/**
 * Lista backups disponíveis para uma empresa
 */
async function listarBackups(empresaPainelId) {
  return BackupEmpresa.findAll({
    where: { empresa_painel_id: empresaPainelId },
    order: [["data_referencia", "DESC"]],
    attributes: [
      "id",
      "data_referencia",
      "tamanho_bytes",
      "tabelas_salvas",
      "registros_totais",
      "status",
      "createdAt",
    ],
  });
}

/**
 * Lista backups de todas as empresas (resumo)
 */
async function listarBackupsGeral() {
  const empresas = await EmpresaPainel.findAll({
    attributes: ["id", "nome_fantasia", "cnpj", "status"],
    order: [["nome_fantasia", "ASC"]],
  });

  const result = [];

  for (const emp of empresas) {
    const backups = await BackupEmpresa.findAll({
      where: { empresa_painel_id: emp.id },
      order: [["data_referencia", "DESC"]],
      attributes: [
        "id",
        "data_referencia",
        "tamanho_bytes",
        "tabelas_salvas",
        "registros_totais",
        "status",
        "createdAt",
      ],
    });

    result.push({
      empresa: {
        id: emp.id,
        nome: emp.nome_fantasia,
        cnpj: emp.cnpj,
        status: emp.status,
      },
      backups: backups.map((b) => b.toJSON()),
      ultimo_backup: backups.length > 0 ? backups[0].data_referencia : null,
      total_backups: backups.length,
    });
  }

  return result;
}

module.exports = {
  realizarBackupEmpresa,
  limparBackupsAntigos,
  executarBackupGeral,
  restaurarBackup,
  listarBackups,
  listarBackupsGeral,
  BACKUP_DIR,
};
