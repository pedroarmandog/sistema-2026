const { EmpresaPainel, SessaoAtiva, sequelize } = require("../models");
const { Op } = require("sequelize");

// Tempo máximo de inatividade para considerar sessão expirada (3 minutos).
// O polling do frontend chama sessao-ativa a cada 8s quando logado,
// mantendo ultima_atividade atualizada. Quando o usuário sai/desloga,
// o polling para e a sessão expira em até 3 minutos automaticamente.
const SESSAO_TIMEOUT_MS = 3 * 60 * 1000;

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
      limit: 1000,
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
      limit: 1000,
    });

    // Buscar nomes dos usuários
    const { Usuario } = require("../models");
    const usuarioIds = sessoes.map((s) => s.usuario_id);
    let usuarios = [];
    if (usuarioIds.length > 0) {
      usuarios = await Usuario.findAll({
        where: { id: { [Op.in]: usuarioIds } },
        attributes: ["id", "nome", "usuario"],
        limit: Math.max(1000, usuarioIds.length || 1000),
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
 * Atualizar limite de acessos de uma empresa.
 * Ao reduzir o limite, encerra imediatamente as sessões excedentes (mais antigas).
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

    const novoLimite = parseInt(limite_acessos);
    empresa.limite_acessos = novoLimite;
    await empresa.save();

    // Encerrar sessões excedentes imediatamente ao reduzir o limite
    let sessoesEncerradas = 0;
    try {
      // Limpar expiradas antes de contar
      await limparSessoesExpiradas();

      const sessoesAtivas = await SessaoAtiva.findAll({
        where: { empresa_id: empresa.id, ativo: true },
        attributes: ["id"],
        order: [["ultima_atividade", "ASC"]], // derruba as menos recentes primeiro
        limit: 2000,
      });

      if (sessoesAtivas.length > novoLimite) {
        const quantasRemover = sessoesAtivas.length - novoLimite;
        const idsRemover = sessoesAtivas
          .slice(0, quantasRemover)
          .map((s) => s.id);

        await SessaoAtiva.update(
          { ativo: false },
          { where: { id: { [Op.in]: idsRemover } } },
        );
        sessoesEncerradas = idsRemover.length;
        console.log(
          `[acessos/limite] empresa=${empresa.id} novo_limite=${novoLimite} encerradas=${sessoesEncerradas} sessões excedentes`,
        );
      }
    } catch (e) {
      console.warn(
        "[acessos/limite] falha ao encerrar sessões excedentes:",
        e && e.message,
      );
    }

    res.json({
      message: "Limite atualizado com sucesso",
      limite_acessos: empresa.limite_acessos,
      sessoes_encerradas: sessoesEncerradas,
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
    const { Empresa, Op: OpModel } = require("../models");
    const empresa = await Empresa.findByPk(empresaId, {
      attributes: ["cnpj"],
    });

    let empresaPainel = null;

    if (empresa && empresa.cnpj) {
      const cnpjLimpo = empresa.cnpj.replace(/\D/g, "");
      // SQL nativo que limpa pontuação dos dois lados para garantir o match
      // independente do formato armazenado (com ou sem pontuação)
      const rows = await sequelize.query(
        `SELECT id, limite_acessos FROM empresas_painel
         WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj,'.',''),'/',''),'-',''),' ','') = :cnpjLimpo
         LIMIT 1`,
        {
          replacements: { cnpjLimpo },
          type: sequelize.constructor.QueryTypes.SELECT,
        },
      );
      if (rows && rows.length > 0) {
        empresaPainel = rows[0];
      }
    }

    if (!empresaPainel) {
      console.log(
        `[acessos] verificarLimiteAcessos: EmpresaPainel não encontrada para empresaId=${empresaId} cnpj='${empresa?.cnpj || "?"}'`,
      );
      return { permitido: true, ativas: 0, limite: 999, sessoesDerrubar: [] };
    }

    const sessoesAtivas = await SessaoAtiva.findAll({
      where: { empresa_id: empresaPainel.id, ativo: true },
      attributes: ["id", "token_hash", "data_login", "ultima_atividade"],
      order: [["ultima_atividade", "ASC"]], // derrubar as menos recentemente ativas
      limit: 2000,
    });

    const totalAtivas = sessoesAtivas.length;
    // Só pré-derrubar se JÁ estiver ACIMA do limite (não apenas no limite).
    // O caso de estar exatamente no limite (totalAtivas == limite) é tratado
    // pelo enforcement em registrarSessao após criar a nova sessão.
    let sessoesDerrubar = [];
    if (totalAtivas > empresaPainel.limite_acessos) {
      const quantasDerrubar = totalAtivas - empresaPainel.limite_acessos;
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
    const ativa = !!sessao;
    console.log(
      `[acessos] verificarSessaoAtiva token=${tokenHash?.substring(0, 10)} ativa=${ativa}`,
    );
    return ativa;
  } catch (e) {
    return true; // em caso de erro, não desconectar
  }
}

/**
 * Registra uma nova sessão ativa (chamado após login bem-sucedido)
 * Fluxo seguro: cria/atualiza a sessão PRIMEIRO, depois derruba as excedentes.
 * Isso elimina a condição de corrida do modelo antigo (verificar → terminar → registrar).
 */
async function registrarSessao(
  usuarioId,
  empresaPainelId,
  tokenHash,
  ip,
  userAgent,
) {
  try {
    // Salvar ID da sessão atual para NUNCA removê-la no enforcement
    let minhaSessaoId = null;

    // DEDUPLICAÇÃO POR USUÁRIO:
    // Fechar todas as sessões ativas do mesmo usuário que usem UM TOKEN DIFERENTE.
    // Isso evita que múltiplos logins no mesmo dispositivo acumulem sessões:
    //   login 1 → sessão A, login 2 → fecha A, cria B, login 3 → fecha B, cria C...
    // Sessões de OUTROS usuários da mesma empresa não são afetadas.
    if (usuarioId) {
      try {
        const [qtdFechadas] = await SessaoAtiva.update(
          { ativo: false },
          {
            where: {
              usuario_id: usuarioId,
              ativo: true,
              token_hash: { [Op.ne]: tokenHash }, // preserva o token atual (idempotência)
            },
          },
        );
        if (qtdFechadas > 0) {
          console.log(
            `[acessos] deduplicação: ${qtdFechadas} sessão(ões) anterior(es) fechada(s) para usuario=${usuarioId}`,
          );
        }
      } catch (dedupErr) {
        console.warn(
          "[acessos] falha ao fechar sessões anteriores do usuário:",
          dedupErr && dedupErr.message,
        );
      }
    }

    // Evitar duplicatas: se já existir uma sessão com o mesmo token, apenas atualizar
    const existente = await SessaoAtiva.findOne({
      where: { token_hash: tokenHash },
    });
    if (existente) {
      console.log(
        `[acessos] atualizando sessão existente token=${tokenHash.substring(0, 10)} usuario=${usuarioId} empresa=${empresaPainelId}`,
      );
      await existente.update({
        usuario_id: usuarioId,
        empresa_id: empresaPainelId || existente.empresa_id,
        ip_address: ip || existente.ip_address,
        user_agent: userAgent
          ? userAgent.substring(0, 500)
          : existente.user_agent,
        ultima_atividade: new Date(),
        ativo: true,
      });
      minhaSessaoId = existente.id;
      console.log(
        `[acessos] sessão atualizada token=${tokenHash.substring(0, 10)} id=${minhaSessaoId}`,
      );
    } else {
      console.log(
        `[acessos] criando nova sessão token=${tokenHash.substring(0, 10)} usuario=${usuarioId} empresa=${empresaPainelId} ip=${ip}`,
      );
      const nova = await SessaoAtiva.create({
        usuario_id: usuarioId,
        empresa_id: empresaPainelId,
        token_hash: tokenHash,
        ip_address: ip || null,
        user_agent: userAgent ? userAgent.substring(0, 500) : null,
        data_login: new Date(),
        ultima_atividade: new Date(),
        ativo: true,
      });
      minhaSessaoId = nova.id;
      console.log(`[acessos] nova sessão criada id=${minhaSessaoId}`);
    }

    // Enforçar limite DEPOIS de registrar.
    // IMPORTANTE: excluir a sessão atual (minhaSessaoId) da busca — ela JAMAIS pode ser removida.
    // Isso resolve o race condition onde o middleware atualiza ultima_atividade de sessões antigas
    // durante o login, tornando-as "mais recentes" que a nova sessão.
    if (empresaPainelId && minhaSessaoId) {
      try {
        const empresaPainelRec = await EmpresaPainel.findByPk(empresaPainelId, {
          attributes: ["id", "limite_acessos"],
        });
        if (empresaPainelRec && empresaPainelRec.limite_acessos) {
          const limite = empresaPainelRec.limite_acessos;
          // Buscar OUTRAS sessões ativas (excluindo a atual)
          const outrasAtivas = await SessaoAtiva.findAll({
            where: {
              empresa_id: empresaPainelId,
              ativo: true,
              id: { [Op.ne]: minhaSessaoId }, // nunca remover a sessão atual
            },
            attributes: ["id", "ultima_atividade"],
            order: [["ultima_atividade", "ASC"]], // mais antigas primeiro
            limit: 2000,
          });
          // Se as outras sessões já atingem ou excedem o limite, remover as mais antigas
          if (outrasAtivas.length >= limite) {
            const excesso = outrasAtivas.length - limite + 1;
            const idsRemover = outrasAtivas.slice(0, excesso).map((s) => s.id);
            await SessaoAtiva.update(
              { ativo: false },
              { where: { id: { [Op.in]: idsRemover } } },
            );
            console.log(
              `[acessos] limite=${limite} enforçado: ${idsRemover.length} sessão(ões) antiga(s) derrubada(s) para empresa_painel=${empresaPainelId} (sessão atual id=${minhaSessaoId} preservada)`,
            );
          }
        }
      } catch (limiteErr) {
        console.warn(
          "[acessos] falha ao enforçar limite após registrar sessão:",
          limiteErr && limiteErr.message,
        );
      }
    }
  } catch (e) {
    console.warn("[acessos] Erro ao registrar sessão:", e && e.message);
  }
}

/**
 * Encerra sessão ativa pelo hash do token (chamado no logout)
 */
async function encerrarSessaoPorToken(tokenHash) {
  try {
    console.log(
      `[acessos] encerrando sessão token=${tokenHash?.substring(0, 10)}`,
    );
    const [count] = await SessaoAtiva.update(
      { ativo: false },
      { where: { token_hash: tokenHash, ativo: true } },
    );
    console.log(
      `[acessos] encerradas ${count || 0} sessão(ões) para token=${tokenHash?.substring(0, 10)}`,
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
