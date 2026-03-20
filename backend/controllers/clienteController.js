const { Cliente, Pet, Venda } = require("../models");
// Usando importação centralizada do models/index.js com as associações configuradas

exports.createCliente = async (req, res) => {
  try {
    const {
      nome,
      cpf,
      rg,
      data_nascimento,
      sexo,
      telefone,
      email,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      limite_credito,
      grupo_cliente,
      perfil_desconto,
      como_nos_conheceu,
      observacoes,
      proximidade,
      ativo,
      telefones_adicionais,
      emails_adicionais,
    } = req.body;

    const imagem_perfil = req.file ? req.file.filename : null;

    // Processar telefones e emails adicionais
    let telefonesAdicionaisArray = null;
    let emailsAdicionaisArray = null;

    if (telefones_adicionais) {
      try {
        telefonesAdicionaisArray =
          typeof telefones_adicionais === "string"
            ? JSON.parse(telefones_adicionais)
            : telefones_adicionais;
      } catch (e) {
        console.log("Erro ao processar telefones_adicionais:", e);
      }
    }

    if (emails_adicionais) {
      try {
        emailsAdicionaisArray =
          typeof emails_adicionais === "string"
            ? JSON.parse(emails_adicionais)
            : emails_adicionais;
      } catch (e) {
        console.log("Erro ao processar emails_adicionais:", e);
      }
    }

    // Calcular idade se data_nascimento foi fornecida
    let idade = null;
    if (data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(data_nascimento);
      idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade--;
      }
    }

    const cliente = await Cliente.create({
      nome,
      cpf,
      rg,
      data_nascimento,
      idade,
      sexo,
      telefone,
      email,
      telefones_adicionais: telefonesAdicionaisArray,
      emails_adicionais: emailsAdicionaisArray,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      limite_credito,
      grupo_cliente,
      perfil_desconto,
      como_nos_conheceu,
      observacoes,
      proximidade,
      ativo,
      imagem_perfil,
      empresa_id: req.user?.empresaId || null,
    });

    res.status(201).json({
      success: true,
      message: "Cliente criado com sucesso",
      cliente: cliente,
    });

    // Nota: boas_vindas é disparado no cadastro do primeiro pet (petController)
  } catch (err) {
    console.error("Erro ao criar cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao criar o cliente",
      details: err.message,
    });
  }
};

exports.getAllClientes = async (req, res) => {
  try {
    const { search } = req.query;
    let whereClause = {};

    if (search) {
      const { Op } = require("sequelize");
      whereClause = {
        [Op.or]: [
          { nome: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
          { telefone: { [Op.like]: `%${search}%` } },
          { cpf: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    // Filtro obrigatório por empresa
    if (req.user?.empresaId) {
      whereClause.empresa_id = req.user.empresaId;
    }

    const clientes = await Cliente.findAll({
      where: whereClause,
      attributes: [
        "id",
        "nome",
        "email",
        "telefone",
        "cpf",
        "cidade",
        "ativo",
        "createdAt",
        "grupo_cliente",
        "imagem_perfil",
        "data_nascimento",
      ],
      order: [["createdAt", "DESC"]], // Ordenar por data de criação (mais recente primeiro)
    });

    res.json({
      success: true,
      clientes: clientes,
    });
  } catch (err) {
    console.error("Erro ao buscar clientes:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar os clientes",
    });
  }
};

exports.getClienteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar cliente incluindo pets relacionados e vendas (histórico)
    const cliente = await Cliente.findByPk(id, {
      include: [
        {
          model: Pet,
          as: "pets",
          // Incluir tags para que a UI de client-details possa renderizá-las
          attributes: [
            "id",
            "nome",
            "raca",
            "genero",
            "data_nascimento",
            "porte",
            "pelagem",
            "chip",
            "pedigree_rg",
            "alergias",
            "observacao",
            "tags",
            "ativo",
          ],
        },
        {
          model: Venda,
          as: "vendas",
          attributes: [
            "id",
            "data",
            "totais",
            "totalPago",
            "status",
            "createdAt",
          ],
          required: false,
        },
      ],
      order: [[{ model: Venda, as: "vendas" }, "data", "DESC"]],
    });

    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: "Cliente não encontrado",
      });
    }

    // Enriquecer retorno com propriedade 'historico' esperada pelo frontend
    let clienteObj = cliente.get ? cliente.get({ plain: true }) : cliente;
    clienteObj.historico = (clienteObj.vendas || []).map((v) => ({
      id: v.id,
      data_hora: v.data,
      tipo: "Venda",
      total:
        v.totais && v.totais.final
          ? v.totais.final
          : (v.totais && v.totais.total) || null,
      pago: v.totalPago || null,
      status: v.status,
    }));

    res.json({
      success: true,
      cliente: clienteObj,
    });
  } catch (err) {
    console.error("Erro ao buscar cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar o cliente",
    });
  }
};

exports.updateCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Processar telefones e emails adicionais
    if (updates.telefones_adicionais) {
      try {
        updates.telefones_adicionais =
          typeof updates.telefones_adicionais === "string"
            ? JSON.parse(updates.telefones_adicionais)
            : updates.telefones_adicionais;
      } catch (e) {
        console.log(
          "Erro ao processar telefones_adicionais na atualização:",
          e,
        );
      }
    }

    if (updates.emails_adicionais) {
      try {
        updates.emails_adicionais =
          typeof updates.emails_adicionais === "string"
            ? JSON.parse(updates.emails_adicionais)
            : updates.emails_adicionais;
      } catch (e) {
        console.log("Erro ao processar emails_adicionais na atualização:", e);
      }
    }

    // Recalcular idade se data_nascimento foi atualizada
    if (updates.data_nascimento) {
      const hoje = new Date();
      const nascimento = new Date(updates.data_nascimento);
      updates.idade = hoje.getFullYear() - nascimento.getFullYear();
      const mes = hoje.getMonth() - nascimento.getMonth();
      if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        updates.idade--;
      }
    }

    const [updatedRows] = await Cliente.update(updates, {
      where: {
        id: id,
        ...(req.user?.empresaId ? { empresa_id: req.user.empresaId } : {}),
      },
    });

    if (updatedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "Cliente não encontrado",
      });
    }

    const clienteAtualizado = await Cliente.findByPk(id);

    res.json({
      success: true,
      message: "Cliente atualizado com sucesso",
      cliente: clienteAtualizado,
    });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao atualizar o cliente",
    });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o cliente existe e pertence à empresa
    const cliente = await Cliente.findOne({
      where: {
        id,
        ...(req.user?.empresaId ? { empresa_id: req.user.empresaId } : {}),
      },
    });
    if (!cliente) {
      return res.status(404).json({
        success: false,
        error: "Cliente não encontrado",
      });
    }

    // Deletar o cliente
    await cliente.destroy();

    res.json({
      success: true,
      message: "Cliente excluído com sucesso",
    });
  } catch (err) {
    console.error("Erro ao excluir cliente:", err);
    res.status(500).json({
      success: false,
      error: "Erro ao excluir o cliente",
    });
  }
};
