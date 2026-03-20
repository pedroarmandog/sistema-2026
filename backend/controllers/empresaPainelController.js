const { EmpresaPainel, PagamentoPainel, Empresa, Usuario, sequelize } = require("../models");
const { Op } = require("sequelize");

// GET /api/admin/empresas — listar todas
async function listar(req, res) {
  try {
    const { status, busca, ordenar } = req.query;
    const where = {};

    if (status && ["ATIVO", "VENCIDO", "BLOQUEADO"].includes(status)) {
      where.status = status;
    }

    if (busca) {
      where[Op.or] = [
        { nome_fantasia: { [Op.like]: `%${busca}%` } },
        { cnpj: { [Op.like]: `%${busca}%` } },
      ];
    }

    const order = [];
    if (ordenar === "vencimento") {
      order.push(["data_vencimento", "ASC"]);
    } else if (ordenar === "nome") {
      order.push(["nome_fantasia", "ASC"]);
    } else {
      order.push(["createdAt", "DESC"]);
    }

    const empresas = await EmpresaPainel.findAll({ where, order });
    return res.json(empresas);
  } catch (err) {
    console.error("[admin/empresas] Erro ao listar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/empresas/:id — detalhes
async function detalhes(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id, {
      include: [
        {
          model: PagamentoPainel,
          as: "pagamentos",
          order: [["data_pagamento", "DESC"]],
        },
      ],
    });
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }
    return res.json(empresa);
  } catch (err) {
    console.error("[admin/empresas] Erro ao buscar detalhes:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas — criar
async function criar(req, res) {
  try {
    const {
      nome_fantasia,
      cnpj,
      cep,
      endereco,
      email,
      telefone,
      valor_mensalidade,
      data_vencimento,
    } = req.body;

    if (!nome_fantasia || !cnpj || !valor_mensalidade || !data_vencimento) {
      return res
        .status(400)
        .json({
          error:
            "Campos obrigatórios: nome_fantasia, cnpj, valor_mensalidade, data_vencimento",
        });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      return res.status(400).json({ error: "CNPJ inválido" });
    }

    const existente = await EmpresaPainel.findOne({
      where: { cnpj: cnpjLimpo },
    });
    if (existente) {
      return res.status(409).json({ error: "CNPJ já cadastrado" });
    }

    const empresa = await EmpresaPainel.create({
      nome_fantasia,
      cnpj: cnpjLimpo,
      cep,
      endereco,
      email,
      telefone,
      valor_mensalidade,
      data_vencimento,
      data_adesao: new Date(),
      status: "ATIVO",
    });

    return res.status(201).json(empresa);
  } catch (err) {
    console.error("[admin/empresas] Erro ao criar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// PUT /api/admin/empresas/:id — atualizar
async function atualizar(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const camposPermitidos = [
      "nome_fantasia",
      "cep",
      "endereco",
      "email",
      "telefone",
      "foto",
      "valor_mensalidade",
      "data_vencimento",
    ];
    const dados = {};
    for (const campo of camposPermitidos) {
      if (req.body[campo] !== undefined) {
        dados[campo] = req.body[campo];
      }
    }

    await empresa.update(dados);
    return res.json(empresa);
  } catch (err) {
    console.error("[admin/empresas] Erro ao atualizar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/bloquear
async function bloquear(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    await empresa.update({ status: "BLOQUEADO" });
    return res.json({ message: "Empresa bloqueada com sucesso", empresa });
  } catch (err) {
    console.error("[admin/empresas] Erro ao bloquear:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/reativar
async function reativar(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    // Calcular nova data de vencimento (30 dias a partir de hoje)
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);
    const dataVencimento = novaData.toISOString().split("T")[0];

    await empresa.update({ status: "ATIVO", data_vencimento: dataVencimento });

    // Registrar pagamento
    await PagamentoPainel.create({
      empresa_id: empresa.id,
      valor: empresa.valor_mensalidade,
      data_pagamento: new Date().toISOString().split("T")[0],
      status: "PAGO",
      observacao: "Reativação pelo painel admin",
    });

    return res.json({ message: "Empresa reativada com sucesso", empresa });
  } catch (err) {
    console.error("[admin/empresas] Erro ao reativar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// DELETE /api/admin/empresas/:id
async function excluir(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    await empresa.destroy();
    return res.json({ message: "Empresa excluída com sucesso" });
  } catch (err) {
    console.error("[admin/empresas] Erro ao excluir:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/dashboard — resumo geral
async function dashboard(req, res) {
  try {
    const total = await EmpresaPainel.count();
    const ativas = await EmpresaPainel.count({ where: { status: "ATIVO" } });
    const vencidas = await EmpresaPainel.count({
      where: { status: "VENCIDO" },
    });
    const bloqueadas = await EmpresaPainel.count({
      where: { status: "BLOQUEADO" },
    });

    // Faturamento mensal = soma das mensalidades das empresas ativas
    const faturamento = await EmpresaPainel.sum("valor_mensalidade", {
      where: { status: "ATIVO" },
    });

    return res.json({
      total,
      ativas,
      vencidas,
      bloqueadas,
      faturamento_mensal: faturamento || 0,
    });
  } catch (err) {
    console.error("[admin/dashboard] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// GET /api/admin/faturamento — dados da aba faturamento
async function faturamento(req, res) {
  try {
    // Empresas ativas com valor
    const empresas = await EmpresaPainel.findAll({
      where: { status: "ATIVO" },
      attributes: [
        "id",
        "nome_fantasia",
        "cnpj",
        "valor_mensalidade",
        "data_vencimento",
      ],
      order: [["nome_fantasia", "ASC"]],
    });

    const totalMensal = empresas.reduce(
      (acc, e) => acc + parseFloat(e.valor_mensalidade || 0),
      0,
    );

    // Histórico de pagamentos
    const pagamentos = await PagamentoPainel.findAll({
      include: [
        {
          model: EmpresaPainel,
          as: "empresa",
          attributes: ["nome_fantasia", "cnpj"],
        },
      ],
      order: [["data_pagamento", "DESC"]],
      limit: 100,
    });

    return res.json({ totalMensal, empresas, pagamentos });
  } catch (err) {
    console.error("[admin/faturamento] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/:id/pagamento — registrar pagamento manual
async function registrarPagamento(req, res) {
  try {
    const empresa = await EmpresaPainel.findByPk(req.params.id);
    if (!empresa) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }

    const { valor, observacao } = req.body;

    const pagamento = await PagamentoPainel.create({
      empresa_id: empresa.id,
      valor: valor || empresa.valor_mensalidade,
      data_pagamento: new Date().toISOString().split("T")[0],
      status: "PAGO",
      observacao: observacao || "Pagamento registrado manualmente",
    });

    // Atualizar vencimento (+30 dias)
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 30);
    await empresa.update({
      status: "ATIVO",
      data_vencimento: novaData.toISOString().split("T")[0],
    });

    return res.status(201).json({ pagamento, empresa });
  } catch (err) {
    console.error("[admin/pagamento] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// Verificação de vencimentos (chamado pelo cron)
async function verificarVencimentos() {
  try {
    const hoje = new Date().toISOString().split("T")[0];
    const ontem = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Empresas vencidas hoje → marcar como VENCIDO
    await EmpresaPainel.update(
      { status: "VENCIDO" },
      { where: { data_vencimento: hoje, status: "ATIVO" } },
    );

    // Empresas com vencimento anterior a hoje → BLOQUEADO
    await EmpresaPainel.update(
      { status: "BLOQUEADO" },
      {
        where: {
          data_vencimento: { [Op.lt]: hoje },
          status: { [Op.in]: ["ATIVO", "VENCIDO"] },
        },
      },
    );

    console.log(`[cron] Verificação de vencimentos concluída em ${hoje}`);
  } catch (err) {
    console.error("[cron] Erro ao verificar vencimentos:", err);
  }
}

// GET /api/admin/empresas/:id/status — verificar status (usado pelo sistema do cliente)
async function verificarStatus(req, res) {
  try {
    const { cnpj } = req.query;
    if (!cnpj) {
      return res.status(400).json({ error: "CNPJ é obrigatório" });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    const empresa = await EmpresaPainel.findOne({ where: { cnpj: cnpjLimpo } });

    if (!empresa) {
      return res.json({ status: "ATIVO" }); // Se não está no painel, assume ativo
    }

    return res.json({
      status: empresa.status,
      data_vencimento: empresa.data_vencimento,
      nome_fantasia: empresa.nome_fantasia,
    });
  } catch (err) {
    console.error("[admin/status] Erro:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

// POST /api/admin/empresas/completa — criar empresa + usuário + integração
async function criarCompleta(req, res) {
  const t = await sequelize.transaction();
  try {
    const {
      razao_social,
      nome_fantasia,
      cnpj,
      cep,
      endereco,
      email,
      telefone,
      valor_mensalidade,
      data_inicio,
      intervalo_dias,
      usuario_nome,
      usuario_email,
      usuario_senha,
    } = req.body;

    // Validações
    if (!nome_fantasia || !cnpj || !valor_mensalidade || !data_inicio || !intervalo_dias) {
      await t.rollback();
      return res.status(400).json({
        error: "Campos obrigatórios: nome_fantasia, cnpj, valor_mensalidade, data_inicio, intervalo_dias",
      });
    }
    if (!usuario_nome || !usuario_email || !usuario_senha) {
      await t.rollback();
      return res.status(400).json({
        error: "Campos obrigatórios do usuário: usuario_nome, usuario_email, usuario_senha",
      });
    }
    if (usuario_senha.length < 6) {
      await t.rollback();
      return res.status(400).json({ error: "A senha deve ter no mínimo 6 caracteres" });
    }

    const cnpjLimpo = cnpj.replace(/\D/g, "");
    if (cnpjLimpo.length !== 14) {
      await t.rollback();
      return res.status(400).json({ error: "CNPJ inválido" });
    }

    // Verificar CNPJ duplicado
    const existente = await EmpresaPainel.findOne({ where: { cnpj: cnpjLimpo }, transaction: t });
    if (existente) {
      await t.rollback();
      return res.status(409).json({ error: "CNPJ já cadastrado no painel" });
    }

    // Verificar email do usuario duplicado
    const usuarioExistente = await Usuario.findOne({ where: { usuario: usuario_email }, transaction: t });
    if (usuarioExistente) {
      await t.rollback();
      return res.status(409).json({ error: "E-mail de usuário já cadastrado" });
    }

    // Calcular próxima cobrança
    const dias = parseInt(intervalo_dias, 10) || 30;
    const dataInicio = new Date(data_inicio + "T00:00:00");
    const proximaCobranca = new Date(dataInicio);
    proximaCobranca.setDate(proximaCobranca.getDate() + dias);
    const dataVencimento = proximaCobranca.toISOString().split("T")[0];

    // Logo (upload via multer)
    let logoPath = null;
    if (req.file) {
      logoPath = "/uploads/logos-empresas/" + req.file.filename;
    }

    // 1. Criar na tabela empresas_painel
    const empresaPainel = await EmpresaPainel.create({
      razao_social: razao_social || nome_fantasia,
      nome_fantasia,
      cnpj: cnpjLimpo,
      cep,
      endereco,
      email,
      telefone,
      logo: logoPath,
      data_adesao: data_inicio,
      status: "ATIVO",
      valor_mensalidade,
      data_vencimento: dataVencimento,
      intervalo_dias: dias,
      proxima_cobranca: dataVencimento,
    }, { transaction: t });

    // 2. Criar na tabela empresas (sistema PetHub)
    const empresaSistema = await Empresa.create({
      nome: nome_fantasia,
      razaoSocial: razao_social || nome_fantasia,
      cnpj: cnpjLimpo,
      telefone,
      email,
      endereco: endereco ? { rua: endereco, cep } : null,
      logo: logoPath,
      ativa: true,
    }, { transaction: t });

    // 3. Criar usuário vinculado à empresa
    const usuario = await Usuario.create({
      nome: usuario_nome,
      usuario: usuario_email,
      senha: usuario_senha, // bcrypt hook vai hashear automaticamente
      grupoUsuario: "admin",
      ativo: true,
      permissoes: [],
      empresas: [empresaSistema.id],
    }, { transaction: t });

    await t.commit();

    return res.status(201).json({
      message: "Empresa e usuário criados com sucesso!",
      empresaPainel,
      empresaSistema: { id: empresaSistema.id, nome: empresaSistema.nome },
      usuario: { id: usuario.id, nome: usuario.nome, usuario: usuario.usuario },
    });
  } catch (err) {
    await t.rollback();
    console.error("[admin/empresas/completa] Erro ao criar:", err);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
}

module.exports = {
  listar,
  detalhes,
  criar,
  criarCompleta,
  atualizar,
  bloquear,
  reativar,
  excluir,
  dashboard,
  faturamento,
  registrarPagamento,
  verificarVencimentos,
  verificarStatus,
};
