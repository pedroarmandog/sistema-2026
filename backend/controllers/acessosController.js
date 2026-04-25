const { EmpresaPainel, SessaoAtiva, sequelize } = require("../models");
const { Op } = require("sequelize");

// Tempo máximo de inatividade para considerar sessão expirada (30 minutos)
const SESSAO_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Limpa sessões expiradas (sem atividade há mais de 30 min)
 */
async function limparSessoesExpiradas() {
  const limite = new Date(Date.now() - SESSAO_TIMEOUT_MS);
  await SessaoAtiva.update(
    { ativo: false },
    {
      where: {
        ativo: true,
        ultima_atividade: { [Op.lt]: limite },
      },
    },
  );
}

/**
 * Lista acessos de todas as empresas (admin)
 */
const listarAcessos = async (req, res) => {
  try {
    await limparSessoesExpiradas();

    const empresas = await EmpresaPainel.findAll({
      attributes: ["id", "nome_fantasia", "cnpj", "status", "limite_acessos"],
      order: [["nome_fantasia", "ASC"]],
    });

    // Contar sessões ativas por empresa
    const sessoesCount = await SessaoAtiva.findAll({
      attributes: [
        "empresa_id",
        [sequelize.fn("COUNT", sequelize.col("id")), "total_ativas"],
      ],
      where: { ativo: true },
      group: ["empresa_id"],
    });

    const sessoesMap = {};
    sessoesCount.forEach((s) => {
      sessoesMap[s.empresa_id] = parseInt(s.getDataValue("total_ativas"));
    });

    const resultado = empresas.map((emp) => ({
      id: emp.id,
      nome_fantasia: emp.nome_fantasia,
      cnpj: emp.cnpj,
      status: emp.status,
      limite_acessos: emp.limite_acessos,
      acessos_em_uso: sessoesMap[emp.id] || 0,
    }));

    res.json(resultado);
  } catch (error) {
    console.error("Erro ao listar acessos:", error);
    res.status(500).json({ error: "Erro ao listar acessos" });
  }
};

/**
 * Detalhes de acessos de uma empresa
 */
const detalhesAcessos = async (req, res) => {
  try {
    await limparSessoesExpiradas();

    const empresa = await EmpresaPainel.findByPk(req.params.id, {
      attributes: ["id", "nome_fantasia", "cnpj", "status", "limite_acessos"],
    });

    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const sessoes = await SessaoAtiva.findAll({
      where: { empresa_id: empresa.id, ativo: true },
      attributes: [
        "id",
        "usuario_id",
        "ip_address",
        "user_agent",
        "data_login",
        "ultima_atividade",
      ],
      order: [["data_login", "DESC"]],
    });

    // Buscar nomes dos usuários
    const { Usuario } = require("../models");
    const usuarioIds = sessoes.map((s) => s.usuario_id);
    let usuarios = [];
    if (usuarioIds.length > 0) {
      usuarios = await Usuario.findAll({
        where: { id: { [Op.in]: usuarioIds } },
        attributes: ["id", "nome", "usuario"],
      });
    }
    const usrMap = {};
    usuarios.forEach((u) => {
      usrMap[u.id] = { nome: u.nome, usuario: u.usuario };
    });

    const sessoesDetalhadas = sessoes.map((s) => ({
      id: s.id,
      usuario_id: s.usuario_id,
      usuario_nome: usrMap[s.usuario_id]?.nome || "Desconhecido",
      usuario_login: usrMap[s.usuario_id]?.usuario || "-",
      ip_address: s.ip_address,
      user_agent: s.user_agent,
      data_login: s.data_login,
      ultima_atividade: s.ultima_atividade,
    }));

    res.json({
      empresa: {
        id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj,
        status: empresa.status,
        limite_acessos: empresa.limite_acessos,
      },
      acessos_em_uso: sessoesDetalhadas.length,
      sessoes: sessoesDetalhadas,
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes de acessos:", error);
    res.status(500).json({ error: "Erro ao buscar detalhes" });
  }
};

/**
 * Atualizar limite de acessos de uma empresa
 */
const atualizarLimite = async (req, res) => {
  try {
    const { limite_acessos } = req.body;

    if (!limite_acessos || limite_acessos < 1 || limite_acessos > 100) {
      return res.status(400).json({ error: "Limite deve ser entre 1 e 100" });
    }

    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    empresa.limite_acessos = parseInt(limite_acessos);
    await empresa.save();

    res.json({
      message: "Limite atualizado com sucesso",
      limite_acessos: empresa.limite_acessos,
    });
  } catch (error) {
    console.error("Erro ao atualizar limite:", error);
    res.status(500).json({ error: "Erro ao atualizar limite" });
  }
};

/**
 * Encerrar uma sessão específica (admin)
 */
const encerrarSessao = async (req, res) => {
  try {
    const sessao = await SessaoAtiva.findByPk(req.params.sessaoId);
    if (!sessao) {
      return res.status(404).json({ error: "Sessão não encontrada" });
    }

    sessao.ativo = false;
    await sessao.save();

    res.json({ message: "Sessão encerrada com sucesso" });
  } catch (error) {
    console.error("Erro ao encerrar sessão:", error);
    res.status(500).json({ error: "Erro ao encerrar sessão" });
  }
};

/**
 * Encerrar todas as sessões de uma empresa (admin)
 */
const encerrarTodasSessoes = async (req, res) => {
  try {
    const { id } = req.params;

    await SessaoAtiva.update(
      { ativo: false },
      { where: { empresa_id: id, ativo: true } },
    );

    res.json({ message: "Todas as sessões foram encerradas" });
  } catch (error) {
    console.error("Erro ao encerrar sessões:", error);
    res.status(500).json({ error: "Erro ao encerrar sessões" });
  }
};

/**
 * Verifica acessos da empresa e retorna info para o login.
 * Nunca bloqueia — se over limit, retorna IDs das sessões mais antigas para derrubar.
 */
async function verificarLimiteAcessos(empresaId) {
  if (!empresaId)
    return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };

  try {
    await limparSessoesExpiradas();

    // Buscar empresa no painel via CNPJ
    const { Empresa } = require("../models");
    const empresa = await Empresa.findByPk(empresaId, {
      attributes: ["cnpj"],
    });
    if (!empresa || !empresa.cnpj) {
      return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };
    }

    const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
    const empresaPainel = await EmpresaPainel.findOne({
      where: { cnpj: cnpjLimpo },
      attributes: ["id", "limite_acessos"],
    });

    if (!empresaPainel) {
      return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };
    }

    const sessoesAtivas = await SessaoAtiva.findAll({
      where: { empresa_id: empresaPainel.id, ativo: true },
      attributes: ["id", "token_hash", "data_login", "ultima_atividade"],
      order: [["ultima_atividade", "ASC"]], // derrubar as menos recentemente ativas
    });

    const totalAtivas = sessoesAtivas.length;
    // Se já está no limite ou acima, precisamos derrubar as mais antigas para abrir 1 vaga
    let sessoesDerrubar = [];
    if (totalAtivas >= empresaPainel.limite_acessos) {
      const quantasDerrubar = totalAtivas - empresaPainel.limite_acessos + 1;
      sessoesDerrubar = sessoesAtivas.slice(0, quantasDerrubar).map((s) => ({
        id: s.id,
        token_hash: s.token_hash,
      }));
    }

    return {
      permitido: true, // sempre permite — derruba a mais antiga se necessário
      ativas: totalAtivas,
      limite: empresaPainel.limite_acessos,
      empresaPainelId: empresaPainel.id,
      sessoesDerrubar,
    };
  } catch (e) {
    console.warn("[acessos] Erro ao verificar limite:", e && e.message);
    return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };
  }
}

/**
 * Verifica se uma sessão (por token_hash) ainda está ativa.
 * Usado pelo frontend para detectar desconexão.
 */
async function verificarSessaoAtiva(tokenHash) {
  try {
    const sessao = await SessaoAtiva.findOne({
      where: { token_hash: tokenHash, ativo: true },
    });
    return !!sessao;
  } catch (e) {
    return true; // em caso de erro, não desconectar
  }
}

/**
 * Registra uma nova sessão ativa (chamado após login bem-sucedido)
 */
async function registrarSessao(
  usuarioId,
  empresaPainelId,
  tokenHash,
  ip,
  userAgent,
) {
  try {
    await SessaoAtiva.create({
      usuario_id: usuarioId,
      empresa_id: empresaPainelId,
      token_hash: tokenHash,
      ip_address: ip || null,
      user_agent: userAgent ? userAgent.substring(0, 500) : null,
      data_login: new Date(),
      ultima_atividade: new Date(),
      ativo: true,
    });
  } catch (e) {
    console.warn("[acessos] Erro ao registrar sessão:", e && e.message);
  }
}

/**
 * Encerra sessão ativa pelo hash do token (chamado no logout)
 */
async function encerrarSessaoPorToken(tokenHash) {
  try {
    await SessaoAtiva.update(
      { ativo: false },
      { where: { token_hash: tokenHash, ativo: true } },
    );
  } catch (e) {
    console.warn("[acessos] Erro ao encerrar sessão:", e && e.message);
  }
}

/**
 * Atualiza última atividade de uma sessão (chamado pelo middleware)
 */
async function atualizarAtividade(tokenHash) {
  try {
    await SessaoAtiva.update(
      { ultima_atividade: new Date() },
      { where: { token_hash: tokenHash, ativo: true } },
    );
  } catch (e) {
    // Silencioso - não deve bloquear a requisição
  }
}

module.exports = {
  listarAcessos,
  detalhesAcessos,
  atualizarLimite,
  encerrarSessao,
  encerrarTodasSessoes,
  verificarLimiteAcessos,
  registrarSessao,
  encerrarSessaoPorToken,
  atualizarAtividade,
  limparSessoesExpiradas,
  verificarSessaoAtiva,
};
