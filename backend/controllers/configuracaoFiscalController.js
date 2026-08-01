"use strict";

const ConfiguracaoFiscal = require("../models/ConfiguracaoFiscal");
const { FiscalServiceFactory } = require("../services/fiscal");

/**
 * configuracaoFiscalController
 *
 * Gerencia as configurações fiscais por empresa.
 * Rota: /api/fiscal/configuracao
 *
 * SEGURANÇA:
 *   Os campos certificado_digital, senha_certificado_hash e token_api
 *   são retornados MASCARADOS nas respostas GET (não expõe dados sensíveis).
 *   A escrita desses campos é aceita mas deve passar por criptografia
 *   antes de persistir (implementar quando integração for ativada).
 */

// Campos sensíveis que NÃO devem ser retornados nas respostas GET
const CAMPOS_SENSIVEIS = [
  "certificado_digital",
  "senha_certificado_hash",
  "token_api",
];

function mascarar(config) {
  if (!config) return null;
  const obj = config.toJSON ? config.toJSON() : { ...config };
  for (const campo of CAMPOS_SENSIVEIS) {
    if (obj[campo]) obj[campo] = "***";
  }
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fiscal/configuracao
// Retorna a configuração fiscal da empresa do usuário logado
// ─────────────────────────────────────────────────────────────────────────────

async function getConfiguracao(req, res) {
  try {
    const empresa_id = req.user.empresaId;

    let config = await ConfiguracaoFiscal.findOne({ where: { empresa_id } });

    if (!config) {
      // Retorna defaults sem criar registro — empresa ainda não configurou
      return res.json({
        configurado: false,
        empresa_id,
        ambiente: "homologacao",
        modo_emissao: "manual",
        emitir_nfe: false,
        emitir_nfce: false,
        emitir_nfse: false,
        provedores_disponiveis: FiscalServiceFactory.provedoresDisponiveis(),
      });
    }

    return res.json({
      configurado: true,
      ...mascarar(config),
      provedores_disponiveis: FiscalServiceFactory.provedoresDisponiveis(),
    });
  } catch (err) {
    console.error("[fiscal/configuracao] GET:", err);
    return res.status(500).json({ erro: "Erro ao buscar configuração fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fiscal/configuracao
// Cria ou atualiza a configuração fiscal da empresa (upsert)
// ─────────────────────────────────────────────────────────────────────────────

async function salvarConfiguracao(req, res) {
  try {
    const empresa_id = req.user.empresaId;
    const dados = { ...req.body, empresa_id };

    // Remover campos que não devem ser gravados diretamente sem criptografia
    // (proteção enquanto criptografia não está implementada)
    // Quando a criptografia for implementada, remover este bloco
    delete dados.id;
    delete dados.createdAt;
    delete dados.updatedAt;

    const [config, criado] = await ConfiguracaoFiscal.findOrCreate({
      where: { empresa_id },
      defaults: dados,
    });

    if (!criado) {
      await config.update(dados);
    }

    return res.json({
      sucesso: true,
      mensagem: criado
        ? "Configuração fiscal criada"
        : "Configuração fiscal atualizada",
      config: mascarar(config),
    });
  } catch (err) {
    console.error("[fiscal/configuracao] POST:", err);
    return res.status(500).json({ erro: "Erro ao salvar configuração fiscal" });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fiscal/configuracao/provedores
// Lista provedores disponíveis
// ─────────────────────────────────────────────────────────────────────────────

async function listarProvedores(req, res) {
  return res.json({
    provedores: FiscalServiceFactory.provedoresDisponiveis(),
  });
}

module.exports = {
  getConfiguracao,
  salvarConfiguracao,
  listarProvedores,
};
