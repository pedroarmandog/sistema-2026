const { Venda } = require("../models/Venda");
const { Op } = require("sequelize");
const Produto = require("../models/Produto");
const { Profissional } = require("../models/Profissional");
const { Cliente } = require("../models/Cliente");

// Listar todas as vendas
exports.listarVendas = async (req, res) => {
  try {
    const { caixaId, dataInicio, dataFim } = req.query;

    // Construir filtros dinâmicos
    const where = {};

    // Filtro obrigatório por empresa
    if (req.user?.empresaId) {
      where.empresa_id = req.user.empresaId;
    }

    // Filtro por data
    if (dataInicio && dataFim) {
      where.data = {
        [Op.between]: [
          new Date(dataInicio + " 00:00:00"),
          new Date(dataFim + " 23:59:59"),
        ],
      };
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 1000);
    const offset = parseInt(req.query.offset, 10) || 0;
    const vendas = await Venda.findAll({
      attributes: [
        "id",
        "data",
        "totalPago",
        "total",
        "cliente",
        "caixaId",
        "status",
        "empresa_id",
      ],
      where,
      order: [["data", "DESC"]],
      limit,
      offset,
    });

    res.json({ vendas });
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    res.status(500).json({ erro: "Erro ao listar vendas" });
  }
};

// Buscar venda por ID
exports.buscarVenda = async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id);
    if (!venda) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }
    res.json(venda);
  } catch (error) {
    console.error("Erro ao buscar venda:", error);
    res.status(500).json({ erro: "Erro ao buscar venda" });
  }
};

// Criar venda
exports.criarVenda = async (req, res) => {
  try {
    const dados = { ...req.body };

    // --- Enriquecer itens com produto.id e perfilComissao via nome ---
    if (Array.isArray(dados.itens) && dados.itens.length > 0) {
      // Coletar nomes sem id para fazer lookup em lote
      const nomesSemId = [
        ...new Set(
          dados.itens
            .filter((it) => !(it.produto && it.produto.id))
            .map((it) =>
              (
                (it.produto && it.produto.nome) ||
                it.nome ||
                it.descricao ||
                ""
              ).trim(),
            )
            .filter(Boolean),
        ),
      ];

      let mapaProdNome = {};
      if (nomesSemId.length > 0) {
        const prods = await Produto.findAll({
          where: { nome: { [Op.in]: nomesSemId } },
          attributes: ["id", "nome", "perfilComissao", "tipo"],
        }).catch(() => []);
        prods.forEach((p) => {
          // indexar por nome lowercase para busca case-insensitive
          mapaProdNome[p.nome.trim().toLowerCase()] = p;
        });
      }

      dados.itens = dados.itens.map((item) => {
        const prod = item.produto || {};
        if (prod.id) return item; // já tem id, não altera

        const nomeProd = (
          prod.nome ||
          item.nome ||
          item.descricao ||
          ""
        ).trim();
        const prodDB = mapaProdNome[nomeProd.toLowerCase()];
        if (!prodDB) return item;

        return {
          ...item,
          produto: {
            ...prod,
            id: prodDB.id,
            tipo: prod.tipo || prodDB.tipo || null,
            perfilComissao:
              prodDB.perfilComissao || prod.perfilComissao || null,
          },
          perfilComissao: prodDB.perfilComissao || item.perfilComissao || null,
        };
      });
    }

    // --- Resolver profissionalId pelo nome se não vier preenchido ---
    if (!dados.profissionalId && dados.profissional) {
      const prof = await Profissional.findOne({
        where: { nome: dados.profissional.trim() },
        attributes: ["id"],
      }).catch(() => null);
      if (prof) dados.profissionalId = prof.id;
    }

    // --- Resolver clienteId pelo nome se não vier preenchido ---
    if (!dados.clienteId && dados.cliente) {
      const cli = await Cliente.findOne({
        where: { nome: dados.cliente.trim() },
        attributes: ["id"],
      }).catch(() => null);
      if (cli) dados.clienteId = cli.id;
    }

    const venda = await Venda.create({
      ...dados,
      empresa_id: req.user?.empresaId || null,
    });
    res.status(201).json(venda);
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    res.status(500).json({ erro: "Erro ao criar venda" });
  }
};

// Atualizar venda
exports.atualizarVenda = async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id);
    if (!venda) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }
    await venda.update(req.body);
    res.json(venda);
  } catch (error) {
    console.error("Erro ao atualizar venda:", error);
    res.status(500).json({ erro: "Erro ao atualizar venda" });
  }
};

// Deletar venda
exports.deletarVenda = async (req, res) => {
  try {
    const venda = await Venda.findByPk(req.params.id);
    if (!venda) {
      return res.status(404).json({ erro: "Venda não encontrada" });
    }
    await venda.destroy();
    res.json({ mensagem: "Venda deletada com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar venda:", error);
    res.status(500).json({ erro: "Erro ao deletar venda" });
  }
};
