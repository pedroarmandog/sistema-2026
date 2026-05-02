const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");
const xml2js = require("xml2js");
const bodyParser = require("body-parser");

router.use(bodyParser.json({ limit: "10mb" }));

// Simple health route
router.get("/", (req, res) => {
  // If a chave query param is provided, return a mock lookup
  const chave = req.query && req.query.chave;
  if (chave) {
    return res.json({
      ok: true,
      module: "entrada-mercadoria",
      chave,
      nota: null,
      message: "Mock: nenhuma nota encontrada para esta chave",
    });
  }

  res.json({ ok: true, module: "entrada-mercadoria" });
});

// Endpoint: generate danfe buffer from posted nota data
router.post("/generate-danfe", async (req, res) => {
  try {
    const nota = req.body;
    const { generateDanfeBuffer } = require("../utils/danfeGenerator");
    const buffer = await generateDanfeBuffer(nota);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=danfe.pdf");
    res.send(buffer);
  } catch (err) {
    console.error("generate-danfe error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Endpoint: retornar DANFE por ID (GET /:id/danfe)
router.get("/:id/danfe", async (req, res) => {
  try {
    const id = req.params.id;
    let nota = null;

    // Tentar carregar a entrada do banco (Sequelize) quando disponível
    try {
      const modelsPath = path.join(__dirname, "..", "..", "..", "models");
      const models = require(modelsPath);
      const Entrada = models && models.Entrada ? models.Entrada : null;
      if (Entrada && typeof Entrada.findByPk === "function") {
        const row = await Entrada.findByPk(id);
        if (row) nota = typeof row.toJSON === "function" ? row.toJSON() : row;
      }
    } catch (dbErr) {
      console.warn(
        "GET /:id/danfe - falha ao buscar Entrada no DB:",
        dbErr && dbErr.message,
      );
    }

    // Se não encontrou no DB, criar um objeto mock para gerar o DANFE
    if (!nota) {
      nota = {
        fornecedorNome: "Fornecedor (não encontrado no DB)",
        numero: id,
        chave: "",
        dataEmissao: new Date().toISOString().slice(0, 10),
        valorTotal: 0,
        itens: [],
      };
    }

    const { generateDanfeBuffer } = require("../utils/danfeGenerator");
    const buffer = await generateDanfeBuffer(nota);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=danfe-${id}.pdf`);
    res.send(buffer);
  } catch (err) {
    console.error("GET /:id/danfe error", err);
    res
      .status(500)
      .send(
        "Erro ao gerar DANFE: " +
          (err && err.message ? err.message : String(err)),
      );
  }
});

// Importar XML (recebe { filename, content })
router.post("/import-xml", async (req, res) => {
  try {
    const payload = req.body;
    const filename =
      payload && payload.filename ? payload.filename : "unknown.xml";
    const content = payload && payload.content ? payload.content : "";
    const size = typeof content === "string" ? content.length : 0;
    // Tentar extrair dados do XML e persistir fornecedor no banco
    let fornecedorSaved = null;
    try {
      if (content && content.trim()) {
        const parsed = await xml2js.parseStringPromise(content, {
          explicitArray: true,
        });
        // procurar por node 'emit' contendo xNome e CNPJ
        function findEmit(obj) {
          if (!obj || typeof obj !== "object") return null;
          if (obj.emit) return obj.emit;
          for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (Array.isArray(v)) {
              for (const item of v) {
                const r = findEmit(item);
                if (r) return r;
              }
            } else if (typeof v === "object") {
              const r = findEmit(v);
              if (r) return r;
            }
          }
          return null;
        }

        const emit = findEmit(parsed);
        let nome = null;
        let cnpj = null;
        try {
          if (emit) {
            const e = Array.isArray(emit) ? emit[0] : emit;
            nome = e.xNome && e.xNome[0] ? e.xNome[0] : nome;
            cnpj = e.CNPJ && e.CNPJ[0] ? e.CNPJ[0] : cnpj;
          }
        } catch (e) {
          /* ignore */
        }

        if (nome) {
          try {
            const Fornecedor = require(
              path.join(__dirname, "..", "..", "..", "models", "Fornecedor"),
            );
            let found = null;
            if (cnpj)
              found = await Fornecedor.findOne({ where: { cnpj: cnpj } });
            if (!found)
              found = await Fornecedor.findOne({ where: { nome: nome } });
            if (!found) {
              const created = await Fornecedor.create({
                nome: nome,
                cnpj: cnpj || null,
              });
              fornecedorSaved = created;
            } else {
              fornecedorSaved = found;
            }
          } catch (err) {
            console.warn(
              "Erro ao persistir fornecedor durante import-xml:",
              err && err.message,
            );
          }
        }
      }
    } catch (errParse) {
      console.warn("import-xml parse error", errParse && errParse.message);
    }

    return res.json({
      ok: true,
      message: "XML recebido",
      filename,
      size,
      fornecedor: fornecedorSaved
        ? { id: fornecedorSaved.id, nome: fornecedorSaved.nome }
        : null,
    });
  } catch (err) {
    console.error("import-xml error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Entrada manual (recebe dados mínimos da nota e salva no banco)
router.post("/manual", async (req, res) => {
  try {
    const nota = req.body || {};

    // Tentar persistir no banco usando o modelo Sequelize Entrada
    try {
      const modelsPath = path.join(__dirname, "..", "..", "..", "models");
      const models = require(modelsPath);
      const Entrada = models && models.Entrada ? models.Entrada : null;
      const Produto = models && models.Produto ? models.Produto : null;
      const HistoricoEstoque =
        models && models.HistoricoEstoque ? models.HistoricoEstoque : null;

      if (Entrada && typeof Entrada.create === "function") {
        // Antes de persistir a entrada, garantir que o fornecedor exista no cadastro de fornecedores
        try {
          const fornecedorNome =
            nota.fornecedor ||
            nota.fornecedorNome ||
            (nota.fornecedor && nota.fornecedor.nome) ||
            null;
          const fornecedorCnpj =
            nota.fornecedorCnpj ||
            nota.cnpj ||
            (nota.fornecedor &&
              (nota.fornecedor.cnpj || nota.fornecedor.CNPJ)) ||
            null;
          if (fornecedorNome) {
            try {
              const Fornecedor = require(
                path.join(__dirname, "..", "..", "..", "models", "Fornecedor"),
              );
              let found = null;
              if (fornecedorCnpj)
                found = await Fornecedor.findOne({
                  where: { cnpj: fornecedorCnpj },
                });
              if (!found)
                found = await Fornecedor.findOne({
                  where: { nome: fornecedorNome },
                });
              if (!found) {
                found = await Fornecedor.create({
                  nome: fornecedorNome,
                  cnpj: fornecedorCnpj || null,
                });
              }
              nota.fornecedor = found.nome;
            } catch (fErr) {
              console.warn(
                "Persistência de fornecedor falhou ao criar entrada manual:",
                fErr && fErr.message,
              );
            }
          }

          const mapped = Object.assign({}, nota);
          mapped.categoriaFinanceira =
            mapped.categoriaFinanceira ||
            mapped.tipoEntrada ||
            mapped.tipo ||
            null;
          mapped.situacao = mapped.situacao || mapped.status || "pendente";
          mapped.valorTotal =
            mapped.valorTotal || mapped.valor || mapped.total || 0;

          const created = await Entrada.create({
            fornecedor: mapped.fornecedor || null,
            numero: mapped.numero || null,
            serie: mapped.serie || null,
            dataEmissao: mapped.dataEmissao || null,
            dataEntrada: mapped.dataEntrada || null,
            chaveAcesso: mapped.chaveAcesso || null,
            transportador: mapped.transportador || null,
            fretePorConta: mapped.fretePorConta || null,
            frete: mapped.frete || 0,
            itens: mapped.itens || null,
            observacao: mapped.observacao || mapped.observacoes || null,
            desconto: mapped.desconto || 0,
            seguro: mapped.seguro || 0,
            despesa: mapped.despesa || 0,
            icmsST: mapped.icmsST || 0,
            ipi: mapped.ipi || 0,
            despesaExtra: mapped.despesaExtra || 0,
            totalProdutos: mapped.totalProdutos || 0,
            valorTotal: mapped.valorTotal || 0,
            centroResultado: mapped.centroResultado || null,
            categoriaFinanceira: mapped.categoriaFinanceira || null,
            situacao: mapped.situacao || "pendente",
          });

          const saved =
            typeof created.toJSON === "function" ? created.toJSON() : created;
          saved.itens =
            saved.itens && saved.itens.length > 0
              ? saved.itens
              : mapped.itens || [];
          saved.updatedProducts = [];

          // Se finalizado/concluído, ajustar estoque (adicionar) e criar produtos novos
          const situacaoFinal = String(saved.situacao || "").toLowerCase();
          const isConcluido =
            situacaoFinal.includes("final") ||
            situacaoFinal.includes("conclui") ||
            situacaoFinal === "concluido";
          if (isConcluido && Produto) {
            const itens = Array.isArray(saved.itens) ? saved.itens : [];
            for (const it of itens) {
              try {
                const fatorVal = Number(it.fator || 1) || 1;
                const qtdEstoque = Number(it.entEstoque || 0) || 0;
                const quantidade =
                  qtdEstoque ||
                  Math.round(Number(it.quantidade || 0) * fatorVal) ||
                  0;
                if (quantidade === 0) continue;

                let prod = null;
                if (it.matchedId)
                  prod = await Produto.findByPk(String(it.matchedId));
                if (!prod && it.codigo)
                  prod = await Produto.findOne({
                    where: { codigo: String(it.codigo) },
                  });

                if (!prod) {
                  // Criar produto novo
                  const nomeItem = (
                    it.descricao ||
                    it.nome ||
                    it.xProd ||
                    ""
                  ).trim();
                  if (!nomeItem) continue;
                  try {
                    const [[rowMax]] = await Produto.sequelize.query(
                      "SELECT MAX(CAST(id AS UNSIGNED)) AS maxId FROM itens",
                    );
                    const maxId =
                      rowMax && rowMax.maxId !== null
                        ? Number(rowMax.maxId)
                        : 0;
                    prod = await Produto.create({
                      id: String((maxId || 0) + 1),
                      nome: nomeItem,
                      codigo: it.codigo || "",
                      preco: Number(it.unitario || it.preco || 0) || 0,
                      custoBase: Number(it.unitario || it.preco || 0) || 0,
                      ncm: it.ncm || it.NCM || "",
                      validade: it.validade || "",
                      estoqueAtual: quantidade,
                      fatorCompra: String(fatorVal),
                    });
                    console.log(
                      `[entrada/manual] Produto CRIADO: ${nomeItem} (id=${prod.id}) estoque=${quantidade}`,
                    );
                    if (
                      HistoricoEstoque &&
                      typeof HistoricoEstoque.create === "function"
                    ) {
                      await HistoricoEstoque.create({
                        produtoId: String(prod.id),
                        produtoNome: prod.nome,
                        dataMovimento: saved.dataEmissao || new Date(),
                        operacao: "Entrada",
                        estoqueAnterior: 0,
                        quantidade: quantidade,
                        novoEstoque: quantidade,
                        observacao: `Produto criado via entrada ${saved.id}`,
                      });
                    }
                    saved.updatedProducts.push(
                      prod.get ? prod.get({ plain: true }) : prod,
                    );
                  } catch (createErr) {
                    console.warn(
                      "Erro ao criar produto na entrada:",
                      createErr && createErr.message,
                    );
                  }
                  continue;
                }

                // Produto existente: incrementar estoque
                const atual = Number(prod.estoqueAtual) || 0;
                const novo = atual + quantidade;
                const updatedProd = await prod.update({ estoqueAtual: novo });
                console.log(
                  `[entrada/manual] Estoque ATUALIZADO: ${prod.nome} ${atual} → ${novo}`,
                );
                if (
                  HistoricoEstoque &&
                  typeof HistoricoEstoque.create === "function"
                ) {
                  await HistoricoEstoque.create({
                    produtoId: String(prod.id),
                    produtoNome: prod.nome,
                    dataMovimento: saved.dataEmissao || new Date(),
                    operacao: "Entrada",
                    estoqueAnterior: atual,
                    quantidade,
                    novoEstoque: novo,
                    observacao: `Entrada automática via nota ${saved.id}`,
                  });
                }
                saved.updatedProducts.push(
                  updatedProd.get
                    ? updatedProd.get({ plain: true })
                    : updatedProd,
                );
              } catch (e) {
                console.warn(
                  "Erro ajustando estoque (POST entrada):",
                  e && e.message,
                );
              }
            }
          }

          return res.json(saved);
        } catch (persistErr) {
          console.warn(
            "Persistência com Sequelize falhou ao criar entrada:",
            persistErr && persistErr.message,
          );
        }
      }
    } catch (persistErr) {
      console.warn(
        "Persistência com Sequelize falhou:",
        persistErr && persistErr.message,
      );
    }

    // Fallback: retornar mock se persistência não funcionar (retornar objeto direto para compatibilidade)
    const saved = Object.assign({ id: Date.now(), situacao: "pendente" }, nota);
    return res.json(saved);
  } catch (err) {
    console.error("manual entry error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Listar entradas manuais
router.get("/manual", async (req, res) => {
  try {
    const modelsPath = path.join(__dirname, "..", "..", "..", "models");
    const models = require(modelsPath);
    const { Op } = require("sequelize");
    const Entrada = models && models.Entrada ? models.Entrada : null;
    if (Entrada && typeof Entrada.findAll === "function") {
      const where = {};
      const empresaId = req.user && req.user.empresaId;
      if (empresaId) {
        where[Op.or] = [{ empresa_id: empresaId }, { empresa_id: null }];
      }
      const rows = await Entrada.findAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: 200,
      });
      return res.json(rows.map((r) => r.toJSON()));
    }
    return res.json([]);
  } catch (err) {
    console.error("GET /manual error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Atualizar entrada manual (incluindo finalização com ajuste de estoque)
router.put("/manual/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body || {};
    const modelsPath = path.join(__dirname, "..", "..", "..", "models");
    const models = require(modelsPath);
    const Entrada = models && models.Entrada ? models.Entrada : null;
    const Produto = models && models.Produto ? models.Produto : null;
    const HistoricoEstoque =
      models && models.HistoricoEstoque ? models.HistoricoEstoque : null;

    const mapped = Object.assign({}, body);
    mapped.categoriaFinanceira =
      mapped.categoriaFinanceira || mapped.tipoEntrada || mapped.tipo || null;
    mapped.observacao = mapped.observacao || mapped.observacoes || null;
    mapped.situacao = mapped.situacao || mapped.status || "pendente";
    mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
    // Só atualizar valorTotal se vier explicitamente no body — não sobrescrever com 0
    if (
      body.valorTotal !== undefined ||
      body.valor !== undefined ||
      body.total !== undefined
    ) {
      mapped.valorTotal =
        mapped.valorTotal || mapped.valor || mapped.total || 0;
    } else {
      delete mapped.valorTotal;
    }

    if (Entrada && typeof Entrada.findByPk === "function") {
      let existing = await Entrada.findByPk(id);
      let saved;
      if (existing) {
        await existing.update(mapped);
        saved = existing.toJSON();
      } else {
        const created = await Entrada.create(Object.assign({}, mapped, { id }));
        saved = created.toJSON ? created.toJSON() : created;
      }
      saved.itens =
        saved.itens && saved.itens.length > 0
          ? saved.itens
          : mapped.itens || [];
      saved.updatedProducts = [];

      // Se finalizado, ajustar estoque (adicionar)
      if (String(saved.situacao).toLowerCase().includes("final") && Produto) {
        const itens = Array.isArray(saved.itens) ? saved.itens : [];
        for (const it of itens) {
          try {
            const quantidade =
              Number(it.quantidade || it.qty || it.qtd || 0) || 0;
            if (quantidade === 0) continue;
            let prod = null;
            if (it.id) prod = await Produto.findByPk(String(it.id));
            if (!prod && it.codigo)
              prod = await Produto.findOne({
                where: { codigo: String(it.codigo) },
              });
            if (!prod) continue;
            const atual = Number(prod.estoqueAtual) || 0;
            const novo = atual + quantidade;
            const updatedProd = await prod.update({ estoqueAtual: novo });
            if (
              HistoricoEstoque &&
              typeof HistoricoEstoque.create === "function"
            ) {
              await HistoricoEstoque.create({
                produtoId: String(prod.id),
                produtoNome: prod.nome,
                dataMovimento: saved.dataEmissao || new Date(),
                operacao: "Entrada",
                estoqueAnterior: atual,
                quantidade,
                novoEstoque: novo,
                observacao: `Entrada automática via nota ${saved.id}`,
              });
            }
            saved.updatedProducts.push(
              updatedProd.get ? updatedProd.get({ plain: true }) : updatedProd,
            );
          } catch (e) {
            console.warn(
              "Erro ajustando estoque (PUT entrada):",
              e && e.message,
            );
          }
        }
      }

      return res.json(saved);
    }

    // Fallback sem DB
    return res.json(Object.assign({}, mapped, { id, updatedAt: new Date() }));
  } catch (err) {
    console.error("PUT /manual/:id error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Excluir entrada manual
router.delete("/manual/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const modelsPath = path.join(__dirname, "..", "..", "..", "models");
    const models = require(modelsPath);
    const Entrada = models && models.Entrada ? models.Entrada : null;
    if (Entrada && typeof Entrada.findByPk === "function") {
      const existing = await Entrada.findByPk(id);
      if (existing) {
        await existing.destroy();
        return res.json({ success: true });
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.error("DELETE /manual/:id error", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
