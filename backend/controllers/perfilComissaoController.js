const { PerfilComissao } = require("../models");

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.tipo) where.tipo = req.query.tipo;
    const perfis = await PerfilComissao.findAll({
      where,
      order: [["perfilVendedor", "ASC"]],
    });
    res.json(perfis);
  } catch (error) {
    console.error("Erro ao buscar perfis de comissão:", error);
    res.status(500).json({ error: "Erro ao buscar perfis de comissão" });
  }
};

exports.getById = async (req, res) => {
  try {
    const perfil = await PerfilComissao.findByPk(req.params.id);
    if (!perfil) {
      return res
        .status(404)
        .json({ error: "Perfil de comissão não encontrado" });
    }
    res.json(perfil);
  } catch (error) {
    console.error("Erro ao buscar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao buscar perfil de comissão" });
  }
};

exports.create = async (req, res) => {
  try {
    const perfil = await PerfilComissao.create(req.body);
    res.status(201).json(perfil);
  } catch (error) {
    console.error("Erro ao criar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao criar perfil de comissão" });
  }
};

exports.update = async (req, res) => {
  try {
    const perfil = await PerfilComissao.findByPk(req.params.id);
    if (!perfil) {
      return res
        .status(404)
        .json({ error: "Perfil de comissão não encontrado" });
    }
    await perfil.update(req.body);
    res.json(perfil);
  } catch (error) {
    console.error("Erro ao atualizar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao atualizar perfil de comissão" });
  }
};

exports.delete = async (req, res) => {
  try {
    const perfil = await PerfilComissao.findByPk(req.params.id);
    if (!perfil) {
      return res
        .status(404)
        .json({ error: "Perfil de comissão não encontrado" });
    }
    await perfil.destroy();
    res.json({ message: "Perfil de comissão deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar perfil de comissão:", error);
    res.status(500).json({ error: "Erro ao deletar perfil de comissão" });
  }
};
