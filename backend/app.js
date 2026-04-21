/* @ts-nocheck */
// @ts-nocheck
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});
// Garantir CHROME_PATH antes de carregar módulos que podem usar Puppeteer
try {
  if (!process.env.CHROME_PATH) {
    const fs = require("fs");
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        process.env.CHROME_PATH = p;
        // Também definir PUPPETEER_EXECUTABLE_PATH como fallback padrão
        if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
          process.env.PUPPETEER_EXECUTABLE_PATH = p;
          console.log(
            `[startup] PUPPETEER_EXECUTABLE_PATH definido para: ${p}`,
          );
        }
        console.log(`[startup] CHROME_PATH definido para: ${p}`);
        break;
      }
    }
  } else {
    console.log(
      `[startup] CHROME_PATH já definido: ${process.env.CHROME_PATH}`,
    );
  }
} catch (e) {
  console.warn(
    "[startup] Falha ao definir CHROME_PATH automaticamente:",
    e && e.message,
  );
}
// Auto-install helper: se definido, tenta instalar google-chrome-stable
// automaticamente ao iniciar quando nenhum CHROME_PATH válido for encontrado.
// USE COM CAUTELA: o script usa sudo/apt e requer acesso root.
if (!process.env.CHROME_PATH && process.env.AUTO_INSTALL_CHROME === "1") {
  try {
    console.log(
      "[startup] AUTO_INSTALL_CHROME=1 detectado — tentando instalar Google Chrome...",
    );
    const { spawnSync } = require("child_process");
    const path = require("path");
    const script = path.join(__dirname, "scripts", "install_chrome_ubuntu.sh");
    const res = spawnSync("bash", [script], { stdio: "inherit", timeout: 0 });
    if (res && res.status === 0) {
      console.log("[startup] Script de instalação finalizado com sucesso.");
      // Re-tentar detectar CHROME_PATH
      try {
        const fs = require("fs");
        const candidates = [
          "/usr/bin/google-chrome",
          "/usr/bin/google-chrome-stable",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
          "/snap/bin/chromium",
        ];
        for (const p of candidates) {
          if (fs.existsSync(p)) {
            process.env.CHROME_PATH = p;
            if (!process.env.PUPPETEER_EXECUTABLE_PATH) {
              process.env.PUPPETEER_EXECUTABLE_PATH = p;
              console.log(
                `[startup] PUPPETEER_EXECUTABLE_PATH definido para: ${p}`,
              );
            }
            console.log(`[startup] CHROME_PATH definido para: ${p}`);
            break;
          }
        }
      } catch (_) {}
    } else {
      console.warn(
        "[startup] Script de instalação terminou com status não-zero",
        res && res.status,
      );
    }
  } catch (e) {
    console.warn("[startup] Falha ao executar install script:", e && e.message);
  }
}
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { authUser } = require("./middleware/authUser");
const app = express();

const path = require("path");

// Carregar modelos e associações ANTES de qualquer outra coisa
const models = require("./models");
console.log("✅ Modelos e associações carregados");

app.use(
  cors({
    origin: function (origin, callback) {
      // Permitir requisições sem origin (ex: same-origin, curl, mobile)
      if (!origin) return callback(null, true);
      // Permitir localhost e ngrok
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("ngrok") ||
        origin.includes("ngrok-free.app")
      ) {
        return callback(null, true);
      }
      callback(null, true); // liberar para testes — restringir em produção
    },
    credentials: true,
  }),
);
app.use(bodyParser.json({ limit: "10mb" })); // aumentar limite para aceitar logos grandes
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "../uploads"))); // imagens públicas
app.use("/logos", express.static(path.join(__dirname, "../logos"))); // logos SVG do sistema

// Rota para favicon.ico (browsers buscam este path automaticamente)
app.get("/favicon.ico", (req, res) => {
  res.sendFile(
    path.join(__dirname, "../frontend/fivecon/Design sem nome (17).png"),
  );
});

// Middleware para injetar system-modal.js em todas as páginas HTML
// (garante que o override de alert/confirm/prompt carregue antes de qualquer JS)
const fs = require("fs");
app.use((req, res, next) => {
  if (!req.path.endsWith(".html")) return next();
  const filePath = path.join(__dirname, "../frontend", req.path);
  fs.readFile(filePath, "utf8", (err, html) => {
    if (err) return next(); // arquivo não encontrado, deixa express.static ou 404 tratar
    const tag =
      '<script src="/components/system-modal.js" data-system-modal="1"></script>';
    if (!html.includes("system-modal.js")) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>\n${tag}`);
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.send(html);
  });
});

// Configurar middleware para desabilitar cache de arquivos estáticos
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    setHeaders: (res, path) => {
      if (
        path.endsWith(".js") ||
        path.endsWith(".html") ||
        path.endsWith(".css")
      ) {
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  }),
); // servir arquivos estáticos do frontend

// Middleware de logging para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rotas
const clienteRoutes = require("./routes/clienteRoutes");
const petRoutes = require("./routes/petRoutes");
const agendamentoRoutes = require("./routes/agendamentoRoutes");
const servicoRoutes = require("./routes/servicoRoutes");
const relatoriosRoutes = require("./routes/relatoriosRoutes");
const disparadorRoutes = require("./routes/disparadorRoutes");
const instanciaRoutes = require("./routes/instanciaRoutes");
const itemRoutes = require("./routes/itemRoutes");
const vacinaRoutes = require("./routes/vacinaRoutes");
const centroRoutes = require("./routes/centroRoutes");
const marcasRoutes = require("./routes/marcasRoutes");
const tipoEntradasRoutes = require("./routes/tipoEntradasRoutes");
const vendaRoutes = require("./routes/vendaRoutes");
const orcamentoRoutes = require("./routes/orcamentoRoutes");
const caixaRoutes = require("./routes/caixaRoutes");
const movimentoCaixaRoutes = require("./routes/movimentoCaixaRoutes");
const posicaoCaixaRoutes = require("./routes/posicaoCaixaRoutes");
const profissionalRoutes = require("./routes/profissionalRoutes");
const empresaRoutes = require("./routes/empresaRoutes");
const perfilProdutoRoutes = require("./routes/perfilProdutoRoutes");
const perfilClienteRoutes = require("./routes/perfilClienteRoutes");
const descontoRelacaoRoutes = require("./routes/descontoRelacaoRoutes");
const agrupamentoRoutes = require("./routes/agrupamentoRoutes");
const perfilComissaoRoutes = require("./routes/perfilComissaoRoutes");
const comissaoRoutes = require("./routes/comissaoRoutes");
const porteRoutes = require("./routes/porteRoutes");
const pelagemRoutes = require("./routes/pelagemRoutes");
const racaRoutes = require("./routes/racaRoutes");
const boxRoutes = require("./routes/boxRoutes");
const grupoClienteRoutes = require("./routes/grupoClienteRoutes");
const usuarioRoutes = require("./routes/usuarioRoutes");
const userFilterRoutes = require("./routes/userFilterRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const unidadeRoutes = require("./routes/unidadeRoutes");
const fornecedorRoutes = require("./routes/fornecedorRoutes");
const categoriaFinanceiraRoutes = require("./routes/categoriaFinanceiraRoutes");
const periodicidadeRoutes = require("./routes/periodicidadeRoutes");
// Disparador de Mensagens (Marketing)
app.use("/api/disparador", disparadorRoutes);
// Instâncias de WhatsApp (Puppeteer / sessões)
app.use("/api/instancias", instanciaRoutes);
// Integrar módulo Entrada de Mercadoria (Prisma + TypeScript)
// entrada-mercadoria (compiled router)
try {
  const entradaRouter = require("./entrada-mercadoria/dist/routes/entradaRouter");
  app.use("/api/entrada", entradaRouter);
  console.log("Mounted entrada-mercadoria from dist");
} catch (err) {
  console.warn(
    "entrada-mercadoria router not found in dist. To enable, run prisma generate/migrate and ensure dist exists.",
  );
  // Fallback de desenvolvimento: expor endpoints mínimos para permitir o frontend funcionar
  console.log("⚠️ Montando stubs de /api/entrada (desenvolvimento)");
  // lista simples de entradas (memória) — não persistente
  const __DEV_ENTRADAS = [];

  app.get("/api/entrada/manual", (req, res) => {
    // retornar todas as entradas em memória
    return res.json(__DEV_ENTRADAS);
  });

  app.post("/api/entrada/manual", (req, res) => {
    try {
      const payload = req.body || {};
      // mapear campos conhecidos do frontend para os campos do modelo
      const mapped = Object.assign({}, payload);
      mapped.categoriaFinanceira =
        mapped.categoriaFinanceira || mapped.tipoEntrada || mapped.tipo || null;
      mapped.observacao = mapped.observacao || mapped.observacoes || null;
      mapped.situacao = mapped.situacao || mapped.status || "pendente";
      mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
      // mapear valor para campo do modelo
      mapped.valorTotal =
        mapped.valorTotal || mapped.valor || mapped.total || 0;
      const id = mapped.id || "sim-" + Date.now();
      const created = Object.assign({}, mapped, {
        id,
        createdAt: new Date(),
      });
      __DEV_ENTRADAS.unshift(created);
      console.log(
        "[api/entrada/manual][stub] POST payload:",
        payload,
        "=> saved:",
        created,
      );
      return res.json(created);
    } catch (e) {
      console.error("Stub POST /api/entrada/manual error", e);
      return res.status(500).json({ error: "Erro interno stub" });
    }
  });

  app.put("/api/entrada/manual/:id", (req, res) => {
    try {
      const id = req.params.id;
      const body = req.body || {};
      // mapear campos conhecidos
      const mapped = Object.assign({}, body);
      mapped.categoriaFinanceira =
        mapped.categoriaFinanceira || mapped.tipoEntrada || mapped.tipo || null;
      mapped.observacao = mapped.observacao || mapped.observacoes || null;
      mapped.situacao = mapped.situacao || mapped.status || "pendente";
      mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
      mapped.valorTotal =
        mapped.valorTotal || mapped.valor || mapped.total || 0;

      const idx = __DEV_ENTRADAS.findIndex((x) => String(x.id) === String(id));
      if (idx === -1) {
        const created = Object.assign({}, mapped, {
          id,
          updatedAt: new Date(),
        });
        __DEV_ENTRADAS.unshift(created);
        console.log(
          "[api/entrada/manual][stub] PUT create payload:",
          body,
          "=> saved:",
          created,
        );
        return res.json(created);
      }
      __DEV_ENTRADAS[idx] = Object.assign({}, __DEV_ENTRADAS[idx], mapped, {
        id,
        updatedAt: new Date(),
      });
      console.log(
        "[api/entrada/manual][stub] PUT update id=",
        id,
        "payload:",
        body,
        "=> saved:",
        __DEV_ENTRADAS[idx],
      );
      return res.json(__DEV_ENTRADAS[idx]);
    } catch (e) {
      console.error("Stub PUT /api/entrada/manual/:id error", e);
      return res.status(500).json({ error: "Erro interno stub" });
    }
  });
}

// Garantir que exista um endpoint para listar entradas em /api/entrada/manual
// mesmo quando o módulo `entrada-mercadoria` compilado não expõe esse route.

// POST: criar entrada manual com DB e processar itens no estoque
app.post("/api/entrada/manual", async (req, res) => {
  const payload = req.body || {};
  try {
    const { Entrada, Produto, HistoricoEstoque } = require("./models");
    if (!Entrada || typeof Entrada.create !== "function") {
      throw new Error("Modelo Entrada não disponível");
    }

    const mapped = Object.assign({}, payload);
    mapped.categoriaFinanceira =
      mapped.categoriaFinanceira || mapped.tipoEntrada || mapped.tipo || null;
    mapped.observacao = mapped.observacao || mapped.observacoes || null;
    mapped.situacao = mapped.situacao || mapped.status || "pendente";
    mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
    mapped.valorTotal = mapped.valorTotal || mapped.valor || mapped.total || 0;
    mapped.itens = mapped.itens || mapped.items || [];

    const created = await Entrada.create(mapped);
    const saved = created.toJSON();
    saved.itens =
      saved.itens && saved.itens.length > 0 ? saved.itens : mapped.itens || [];
    saved.updatedProducts = [];

    // Processar estoque quando situacao = concluido/finalizado
    const situacaoStr = String(saved.situacao || "").toLowerCase();
    const isConcluido =
      situacaoStr.includes("final") ||
      situacaoStr.includes("conclui") ||
      situacaoStr === "concluido";

    if (isConcluido && Produto && typeof Produto.findByPk === "function") {
      for (const it of saved.itens) {
        try {
          const fatorVal = Number(it.fator || 1) || 1;
          const qtdEstoque = Number(it.entEstoque || 0) || 0;
          const quantidade =
            qtdEstoque ||
            Math.round(Number(it.quantidade || 0) * fatorVal) ||
            0;
          if (quantidade === 0) continue;

          let prod = null;
          if (it.matchedId) prod = await Produto.findByPk(String(it.matchedId));
          if (!prod && it.codigo)
            prod = await Produto.findOne({
              where: { codigo: String(it.codigo) },
            });

          if (!prod) {
            // Criar produto novo
            const nomeItem = (it.descricao || it.nome || it.xProd || "").trim();
            if (!nomeItem) continue;
            try {
              const [[rowMax]] = await Produto.sequelize.query(
                "SELECT MAX(CAST(id AS UNSIGNED)) AS maxId FROM itens",
              );
              const maxId =
                rowMax && rowMax.maxId !== null ? Number(rowMax.maxId) : 0;
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
                `[entrada/manual POST] Produto criado: ${nomeItem} (id=${prod.id}) estoque=${quantidade}`,
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
                "Erro criando produto na entrada:",
                createErr && createErr.message,
              );
            }
            continue;
          }

          // Incrementar estoque do produto existente
          const atual = Number(prod.estoqueAtual) || 0;
          const novo = atual + quantidade;
          const updatedProd = await prod.update({ estoqueAtual: novo });
          console.log(
            `[entrada/manual POST] Estoque atualizado: ${prod.nome} ${atual} → ${novo}`,
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
              quantidade: quantidade,
              novoEstoque: novo,
              observacao: `Entrada automática via nota ${saved.id}`,
            });
          }
          saved.updatedProducts.push(
            updatedProd.get ? updatedProd.get({ plain: true }) : updatedProd,
          );
        } catch (e) {
          console.warn(
            "Erro ajustando estoque (POST entrada/manual):",
            e && e.message,
          );
        }
      }
    }

    console.log(
      `[api/entrada/manual POST] Entrada criada id=${saved.id}, itens=${saved.itens.length}, produtosProcessados=${saved.updatedProducts.length}`,
    );
    return res.json(saved);
  } catch (err) {
    console.error("Erro POST /api/entrada/manual:", err && err.message);
    return res
      .status(500)
      .json({ error: err.message || "Erro interno ao salvar entrada" });
  }
});

app.get("/api/entrada/manual", async (req, res) => {
  try {
    const models = require("./models");
    const Entrada = models && models.Entrada ? models.Entrada : null;
    if (Entrada && typeof Entrada.findAll === "function") {
      const rows = await Entrada.findAll({
        order: [["createdAt", "DESC"]],
        limit: 500,
      });
      return res.json(rows.map((r) => r.toJSON()));
    }
  } catch (err) {
    console.warn(
      "Erro ao buscar entradas (GET /api/entrada/manual):",
      err && err.message,
    );
  }
  // fallback: retornar array vazio para a UI
  return res.json([]);
});

// GET por id: retornar uma entrada específica
app.get("/api/entrada/manual/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const models = require("./models");
    const Entrada = models && models.Entrada ? models.Entrada : null;
    if (Entrada && typeof Entrada.findByPk === "function") {
      const row = await Entrada.findByPk(id);
      if (row) return res.json(row.toJSON());
    }
  } catch (err) {
    console.warn("Erro GET /api/entrada/manual/:id", err && err.message);
  }
  // fallback: tentar buscar no stub em memória se existir
  try {
    // eslint-disable-next-line no-undef
    if (
      typeof __DEV_ENTRADAS !== "undefined" &&
      Array.isArray(__DEV_ENTRADAS)
    ) {
      const found = __DEV_ENTRADAS.find((e) => String(e.id) === String(id));
      if (found) return res.json(found);
    }
  } catch (e) {
    /* noop */
  }
  return res.status(404).json({ error: "Entrada não encontrada" });
});

// PUT: atualizar ou criar entrada manual (compatibilidade para o frontend)
app.put("/api/entrada/manual/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  try {
    const models = require("./models");
    const Entrada = models && models.Entrada ? models.Entrada : null;
    if (Entrada && typeof Entrada.findByPk === "function") {
      const existing = await Entrada.findByPk(id);
      if (existing) {
        await existing.update(body);
        return res.json(existing.toJSON());
      }
      const created = await Entrada.create(Object.assign({}, body, { id }));
      return res.json(created.toJSON());
    }
  } catch (err) {
    console.warn("Erro PUT /api/entrada/manual/:id (DB):", err && err.message);
  }
  // fallback em memória se existir
  try {
    // eslint-disable-next-line no-undef
    if (
      typeof __DEV_ENTRADAS !== "undefined" &&
      Array.isArray(__DEV_ENTRADAS)
    ) {
      const idx = __DEV_ENTRADAS.findIndex((x) => String(x.id) === String(id));
      if (idx === -1) {
        const created = Object.assign({}, body || {}, {
          id,
          updatedAt: new Date(),
        });
        __DEV_ENTRADAS.unshift(created);
        return res.json(created);
      }
      __DEV_ENTRADAS[idx] = Object.assign({}, __DEV_ENTRADAS[idx], body, {
        id,
        updatedAt: new Date(),
      });
      return res.json(__DEV_ENTRADAS[idx]);
    }
  } catch (e) {
    /* noop */
  }
  return res
    .status(500)
    .json({ error: "Não foi possível atualizar a entrada" });
});

// DELETE: remover entrada
app.delete("/api/entrada/manual/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const models = require("./models");
    const Entrada = models && models.Entrada ? models.Entrada : null;
    if (Entrada && typeof Entrada.destroy === "function") {
      const deleted = await Entrada.destroy({ where: { id } });
      if (deleted > 0) {
        console.log(`✅ Entrada ${id} deletada`);
        return res.json({ success: true, message: "Entrada deletada" });
      }
    }
  } catch (err) {
    console.warn("Erro DELETE /api/entrada/manual/:id", err && err.message);
    return res.status(500).json({ error: err.message });
  }
  return res.status(404).json({ error: "Entrada não encontrada" });
});

// -----------------------------
// Endpoints para Saída manual
// -----------------------------
// Mantemos fallback em memória se modelos/DB não estiverem disponíveis
const __DEV_SAIDAS = [];

app.get("/api/saida/manual", async (req, res) => {
  try {
    // Tentativa: se houver um modelo 'Saida' no DB, usá-lo. Caso contrário, retornar o fallback em memória.
    const models = require("./models");
    const Saida = models && models.Saida ? models.Saida : null;
    if (Saida && typeof Saida.findAll === "function") {
      const rows = await Saida.findAll({
        order: [["createdAt", "DESC"]],
        limit: 500,
      });
      return res.json(rows.map((r) => r.toJSON()));
    }
  } catch (err) {
    console.warn(
      "Erro ao buscar saidas (GET /api/saida/manual):",
      err && err.message,
    );
  }
  // Retornar o fallback em memória (incluir cópia para segurança)
  try {
    return res.json(Array.isArray(__DEV_SAIDAS) ? __DEV_SAIDAS.slice(0) : []);
  } catch (e) {
    return res.json([]);
  }
});

app.get("/api/saida/manual/:id", async (req, res) => {
  const id = req.params.id;
  try {
    // tentar buscar no DB por um registro de saída se existir
    // (não existe modelo Saida por padrão neste projeto)
  } catch (err) {
    console.warn("Erro GET /api/saida/manual/:id", err && err.message);
  }
  const found = __DEV_SAIDAS.find((s) => String(s.id) === String(id));
  if (found) return res.json(found);
  return res.status(404).json({ error: "Saída não encontrada" });
});

app.post("/api/saida/manual", async (req, res) => {
  const payload = req.body || {};
  try {
    const models = require("./models");
    const Saida = models && models.Saida ? models.Saida : null;
    const Produto = models && models.Produto ? models.Produto : null;
    const HistoricoEstoque =
      models && models.HistoricoEstoque ? models.HistoricoEstoque : null;
    const mapped = Object.assign({}, payload);
    mapped.situacao = mapped.situacao || mapped.status || "Pendente";
    mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;
    mapped.valorTotal = mapped.valorTotal || mapped.valor || mapped.total || 0;
    // Se existir modelo Saida, persistir no DB; caso contrário usar fallback em memória
    if (Saida && typeof Saida.create === "function") {
      const createdDb = await Saida.create(mapped);
      const saved = createdDb.toJSON ? createdDb.toJSON() : createdDb;
      saved.itens =
        saved.itens && saved.itens.length > 0
          ? saved.itens
          : mapped.itens || [];
      // pós-processamento: se finalizado, ajustar estoque para menos
      saved.updatedProducts = [];
      if (saved && String(saved.situacao).toLowerCase().includes("final")) {
        const itens = Array.isArray(saved.itens)
          ? saved.itens
          : mapped.itens || [];
        for (const it of itens) {
          try {
            const quantidade =
              Number(it.quantidade || it.qty || it.qtd || 0) || 0;
            if (quantidade === 0) continue;
            if (Produto) {
              let prod = null;
              if (it.id) prod = await Produto.findByPk(String(it.id));
              if (!prod && it.codigo)
                prod = await Produto.findOne({
                  where: { codigo: String(it.codigo) },
                });
              if (!prod) continue;
              const atual = Number(prod.estoqueAtual) || 0;
              const novo = atual - quantidade;
              const updatedProd = await prod.update({ estoqueAtual: novo });
              if (
                HistoricoEstoque &&
                typeof HistoricoEstoque.create === "function"
              ) {
                await HistoricoEstoque.create({
                  produtoId: String(prod.id),
                  produtoNome: prod.nome,
                  dataMovimento: saved.dataEmissao || new Date(),
                  operacao: "Saída",
                  estoqueAnterior: atual,
                  quantidade: quantidade,
                  novoEstoque: novo,
                  observacao: `Saída automática via nota ${saved.id}`,
                });
              }
              try {
                saved.updatedProducts.push(
                  updatedProd.get
                    ? updatedProd.get({ plain: true })
                    : updatedProd,
                );
              } catch (e) {
                saved.updatedProducts.push(updatedProd);
              }
            }
          } catch (e) {
            console.warn(
              "Erro ajustando estoque (POST saida db):",
              e && e.message,
            );
          }
        }
      }
      return res.json(saved);
    }
    // fallback: persistir em memória
    const id = mapped.id || "sim-" + Date.now();
    const created = Object.assign({}, mapped, { id, createdAt: new Date() });
    // se for finalizado, ajustar estoque para menos
    created.updatedProducts = [];
    if (created && String(created.situacao).toLowerCase().includes("final")) {
      const itens = Array.isArray(created.itens)
        ? created.itens
        : mapped.itens || [];
      for (const it of itens) {
        try {
          const quantidade =
            Number(it.quantidade || it.qty || it.qtd || 0) || 0;
          if (quantidade === 0) continue;
          let prod = null;
          if (Produto) {
            if (it.id) prod = await Produto.findByPk(String(it.id));
            if (!prod && it.codigo)
              prod = await Produto.findOne({
                where: { codigo: String(it.codigo) },
              });
            if (!prod) continue;
            const atual = Number(prod.estoqueAtual) || 0;
            const novo = atual - quantidade;
            const updatedProd = await prod.update({ estoqueAtual: novo });
            if (
              HistoricoEstoque &&
              typeof HistoricoEstoque.create === "function"
            ) {
              await HistoricoEstoque.create({
                produtoId: String(prod.id),
                produtoNome: prod.nome,
                dataMovimento: created.dataEmissao || new Date(),
                operacao: "Saída",
                estoqueAnterior: atual,
                quantidade: quantidade,
                novoEstoque: novo,
                observacao: `Saída automática via nota ${created.id}`,
              });
            }
            try {
              created.updatedProducts.push(
                updatedProd.get
                  ? updatedProd.get({ plain: true })
                  : updatedProd,
              );
            } catch (e) {
              created.updatedProducts.push(updatedProd);
            }
          }
        } catch (e) {
          console.warn("Erro ajustando estoque (POST saida):", e && e.message);
        }
      }
    }
    __DEV_SAIDAS.unshift(created);
    return res.json(created);
  } catch (err) {
    console.warn(
      "Erro POST /api/saida/manual fallback em memória:",
      err && err.message,
    );
  }
  try {
    const id = payload.id || "sim-" + Date.now();
    const created = Object.assign({}, payload, { id, createdAt: new Date() });
    __DEV_SAIDAS.unshift(created);
    return res.json(created);
  } catch (e) {
    console.error("Stub POST /api/saida/manual error", e);
    return res.status(500).json({ error: "Erro interno stub" });
  }
});

app.put("/api/saida/manual/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body || {};
  try {
    const models = require("./models");
    const Saida = models && models.Saida ? models.Saida : null;
    const Produto = models && models.Produto ? models.Produto : null;
    const HistoricoEstoque =
      models && models.HistoricoEstoque ? models.HistoricoEstoque : null;
    const mapped = Object.assign({}, body);
    mapped.situacao = mapped.situacao || mapped.status || "Pendente";
    mapped.dataEmissao = mapped.dataEmissao || mapped.data || null;

    // Se houver modelo Saida, atualizar no DB
    if (Saida && typeof Saida.findByPk === "function") {
      try {
        const existing = await Saida.findByPk(id);
        let saved = null;
        if (existing) {
          await existing.update(mapped);
          saved = existing.toJSON ? existing.toJSON() : existing;
        } else {
          const created = await Saida.create(Object.assign({}, mapped, { id }));
          saved = created.toJSON ? created.toJSON() : created;
        }
        saved.itens =
          saved.itens && saved.itens.length > 0
            ? saved.itens
            : mapped.itens || [];
        // pós-processamento: se finalizado, ajustar estoque para menos
        saved.updatedProducts = [];
        if (saved && String(saved.situacao).toLowerCase().includes("final")) {
          const itens = Array.isArray(saved.itens)
            ? saved.itens
            : mapped.itens || [];
          for (const it of itens) {
            try {
              const quantidade =
                Number(it.quantidade || it.qty || it.qtd || 0) || 0;
              if (quantidade === 0) continue;
              if (Produto) {
                let prod = null;
                if (it.id) prod = await Produto.findByPk(String(it.id));
                if (!prod && it.codigo)
                  prod = await Produto.findOne({
                    where: { codigo: String(it.codigo) },
                  });
                if (!prod) continue;
                const atual = Number(prod.estoqueAtual) || 0;
                const novo = atual - quantidade;
                const updatedProd = await prod.update({ estoqueAtual: novo });
                if (
                  HistoricoEstoque &&
                  typeof HistoricoEstoque.create === "function"
                ) {
                  await HistoricoEstoque.create({
                    produtoId: String(prod.id),
                    produtoNome: prod.nome,
                    dataMovimento: saved.dataEmissao || new Date(),
                    operacao: "Saída",
                    estoqueAnterior: atual,
                    quantidade: quantidade,
                    novoEstoque: novo,
                    observacao: `Saída automática via nota ${saved.id}`,
                  });
                }
                try {
                  saved.updatedProducts.push(
                    updatedProd.get
                      ? updatedProd.get({ plain: true })
                      : updatedProd,
                  );
                } catch (e) {
                  saved.updatedProducts.push(updatedProd);
                }
              }
            } catch (e) {
              console.warn(
                "Erro ajustando estoque (PUT saida db):",
                e && e.message,
              );
            }
          }
        }
        return res.json(saved);
      } catch (e) {
        console.warn(
          "Erro atualizando Saida no DB, fallback para memória:",
          e && e.message,
        );
      }
    }

    // Atualizar fallback em memória
    const idx = __DEV_SAIDAS.findIndex((x) => String(x.id) === String(id));
    const saved = Object.assign({}, mapped, { id, updatedAt: new Date() });
    if (idx === -1) __DEV_SAIDAS.unshift(saved);
    else __DEV_SAIDAS[idx] = saved;

    // pós-processamento: se finalizado, ajustar estoque para menos
    saved.updatedProducts = [];
    if (saved && String(saved.situacao).toLowerCase().includes("final")) {
      const itens = Array.isArray(saved.itens)
        ? saved.itens
        : mapped.itens || [];
      for (const it of itens) {
        try {
          const quantidade =
            Number(it.quantidade || it.qty || it.qtd || 0) || 0;
          if (quantidade === 0) continue;
          if (Produto) {
            let prod = null;
            if (it.id) prod = await Produto.findByPk(String(it.id));
            if (!prod && it.codigo)
              prod = await Produto.findOne({
                where: { codigo: String(it.codigo) },
              });
            if (!prod) continue;
            const atual = Number(prod.estoqueAtual) || 0;
            const novo = atual - quantidade;
            const updatedProd = await prod.update({ estoqueAtual: novo });
            if (
              HistoricoEstoque &&
              typeof HistoricoEstoque.create === "function"
            ) {
              await HistoricoEstoque.create({
                produtoId: String(prod.id),
                produtoNome: prod.nome,
                dataMovimento: saved.dataEmissao || new Date(),
                operacao: "Saída",
                estoqueAnterior: atual,
                quantidade: quantidade,
                novoEstoque: novo,
                observacao: `Saída automática via nota ${saved.id}`,
              });
            }
            try {
              saved.updatedProducts.push(
                updatedProd.get
                  ? updatedProd.get({ plain: true })
                  : updatedProd,
              );
            } catch (e) {
              saved.updatedProducts.push(updatedProd);
            }
          }
        } catch (e) {
          console.warn("Erro ajustando estoque (PUT saida):", e && e.message);
        }
      }
    }
    return res.json(saved);
  } catch (err) {
    console.warn(
      "Erro PUT /api/saida/manual/:id (fallback):",
      err && err.message,
    );
  }
  try {
    const idx = __DEV_SAIDAS.findIndex((x) => String(x.id) === String(id));
    if (idx === -1) {
      const created = Object.assign({}, body || {}, {
        id,
        updatedAt: new Date(),
      });
      __DEV_SAIDAS.unshift(created);
      return res.json(created);
    }
    __DEV_SAIDAS[idx] = Object.assign({}, __DEV_SAIDAS[idx], body, {
      id,
      updatedAt: new Date(),
    });
    return res.json(__DEV_SAIDAS[idx]);
  } catch (e) {
    return res
      .status(500)
      .json({ error: "Não foi possível atualizar a saída" });
  }
});

app.delete("/api/saida/manual/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const idx = __DEV_SAIDAS.findIndex((x) => String(x.id) === String(id));
    if (idx !== -1) {
      __DEV_SAIDAS.splice(idx, 1);
      return res.json({ success: true });
    }
  } catch (e) {
    console.warn("Erro DELETE /api/saida/manual/:id", e && e.message);
  }
  return res.status(404).json({ error: "Saída não encontrada" });
});

// Rota de teste para verificar se o servidor está funcionando
app.get("/api/test", (req, res) => {
  res.json({
    message: "Servidor funcionando!",
    timestamp: new Date().toISOString(),
  });
});

const petTagsRoutes = require("./routes/petTagsRoutes");
// Rotas do módulo de Marketing/WhatsApp
const marketingRoutes = require("./routes/marketingRoutes");
app.use("/api/marketing", marketingRoutes);

app.use("/api/clientes", clienteRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/pet-tags", petTagsRoutes);
app.use("/api/agendamentos", agendamentoRoutes);
app.use("/api/servicos", servicoRoutes);
app.use("/api/relatorios", relatoriosRoutes);
app.use("/api/itens", itemRoutes);
app.use("/api/vacinas", vacinaRoutes);
app.use("/api/periodicidades", periodicidadeRoutes);
app.use("/api/centros", centroRoutes);
app.use("/api/marcas", marcasRoutes);
app.use("/api/tipo-entradas", tipoEntradasRoutes);

// Inicializar arquivo de tipos com valores padrão se não existir (não sobrescreve existente)
(function ensureTipoEntradasData() {
  try {
    const fs = require("fs");
    const path = require("path");
    const dataFile = path.join(__dirname, "data", "tipo_entradas.json");
    if (!fs.existsSync(dataFile)) {
      const defaults = [
        { id: Date.now(), descricao: "SEM CUSTO", ativo: true },
        { id: Date.now() + 1, descricao: "BRINDE", ativo: true },
        { id: Date.now() + 2, descricao: "ROMANEIO", ativo: true },
        {
          id: Date.now() + 3,
          descricao: "ENTRADA DE TRANSFERENCIA",
          ativo: true,
        },
        { id: Date.now() + 4, descricao: "ACERTO DE ESTOQUE", ativo: true },
        { id: Date.now() + 5, descricao: "GRANEL - ENTRADA", ativo: true },
      ];
      fs.mkdirSync(path.dirname(dataFile), { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(defaults, null, 2), "utf8");
      console.log("[tipoEntradas] arquivo inicial criado com valores padrão");
    }
  } catch (e) {
    console.warn(
      "Falha ao garantir arquivo tipo_entradas.json",
      e && e.message,
    );
  }
})();
app.use("/api/vendas", vendaRoutes);
app.use("/api/orcamentos", orcamentoRoutes);
app.use("/api/caixas", caixaRoutes);
app.use("/api/movimentos-caixa", movimentoCaixaRoutes);
app.use("/api/posicao-caixa", posicaoCaixaRoutes);
app.use("/api/profissionais", profissionalRoutes);
app.use("/api/empresas", empresaRoutes);
app.use("/api/perfis-produto", perfilProdutoRoutes);
app.use("/api/perfis-cliente", perfilClienteRoutes);
app.use("/api/descontos-relacoes", descontoRelacaoRoutes);
app.use("/api/agrupamentos", agrupamentoRoutes);
app.use("/api/perfis-comissao", perfilComissaoRoutes);
app.use("/api/comissoes", comissaoRoutes);
app.use("/api/portes", porteRoutes);
app.use("/api/pelagens", pelagemRoutes);
app.use("/api/racas", racaRoutes);
app.use("/api/boxes", boxRoutes);
app.use("/api/grupos-clientes", grupoClienteRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/user-filters", userFilterRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/unidades", unidadeRoutes);
app.use("/api/fornecedores", fornecedorRoutes);
app.use("/api/categorias-financeiras", categoriaFinanceiraRoutes);

// Painel Financeiro – dados reais do banco
const painelFinanceiroRoutes = require("./routes/painelFinanceiroRoutes");
app.use("/api/painel-financeiro", painelFinanceiroRoutes);

// Painel Admin – controle de empresas, login admin, faturamento
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Endpoint compatível com frontend: buscar produtos com preço alterado
app.get("/api/editar-produto", async (req, res) => {
  try {
    const Produto = require("./models/Produto");
    const { Op } = require("sequelize");
    const { start, end } = req.query; // expected YYYY-MM-DD

    const where = {};
    if (start && end) {
      // include full end day
      const startDate = new Date(start);
      const endDate = new Date(end + "T23:59:59");
      where.ultimoPrecoAlterado = { [Op.between]: [startDate, endDate] };
    } else if (start) {
      where.ultimoPrecoAlterado = { [Op.gte]: new Date(start) };
    } else if (end) {
      where.ultimoPrecoAlterado = { [Op.lte]: new Date(end + "T23:59:59") };
    } else {
      // sem filtros, retornar vazio para evitar listagem completa
      return res.json([]);
    }

    const produtos = await Produto.findAll({
      where,
      order: [["ultimoPrecoAlterado", "DESC"]],
      limit: 1000,
    });

    // map to lightweight response
    const out = produtos.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      nome: p.nome,
      estoque: p.estoqueAtual,
      ultimoPrecoAlterado: p.ultimoPrecoAlterado,
    }));
    res.json(out);
  } catch (err) {
    console.error("Erro /api/editar-produto", err);
    res
      .status(500)
      .json({ error: "Erro interno buscando produtos com preços alterados" });
  }
});

const { Cliente, Pet, Agendamento } = require("./models");

// ═══════════════════════════════════════════════════════════════════
// SINCRONIZAÇÃO DO BANCO — cria TODAS as tabelas automaticamente
// ═══════════════════════════════════════════════════════════════════
// Usar a instância exportada por `./models` (garante que todos os modelos
// já foram inicializados antes do sync)
const { sequelize } = require("./models");

async function syncAllTables() {
  try {
    await sequelize.authenticate();
    console.log("✅ Conexão com MySQL OK — banco: petshop");

    // 1) Sync principal: cobre Cliente + todos os factory models (Usuario, Empresa, etc.)
    await sequelize.sync();
    console.log("✅ Tabelas da instância principal criadas");

    // 2) Modelos com instância própria de Sequelize (cada um tem seu new Sequelize)
    //    Precisam de .sync() individual
    const ownInstanceModels = [
      ["Agendamento", require("./models/Agendamento").Agendamento],
      ["Box", require("./models/Box")],
      ["Caixa", require("./models/Caixa").Caixa],
      ["DescontoRelacao", require("./models/DescontoRelacao").DescontoRelacao],
      ["HistoricoEstoque", require("./models/HistoricoEstoque")],
      ["ImpressoraConfig", require("./models/ImpressoraConfig")],
      ["ModeloEtiquetaConfig", require("./models/ModeloEtiquetaConfig")],
      ["MovimentoCaixa", require("./models/MovimentoCaixa").MovimentoCaixa],
      ["Orcamento", require("./models/Orcamento").Orcamento],
      ["PagamentoCaixa", require("./models/PagamentoCaixa").PagamentoCaixa],
      ["Pelagem", require("./models/Pelagem")],
      ["PerfilCliente", require("./models/PerfilCliente")],
      ["PerfilProduto", require("./models/PerfilProduto")],
      ["Porte", require("./models/Porte")],
      ["Produto", require("./models/Produto")],
      ["Profissional", require("./models/Profissional").Profissional],
      ["Raca", require("./models/Raca")],
      ["Venda", require("./models/Venda").Venda],
    ];

    for (const [name, model] of ownInstanceModels) {
      try {
        if (model && typeof model.sync === "function") {
          await model.sync();
          console.log(`  ✅ ${name}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ ${name}: ${err.message}`);
      }
    }

    // 3) Verificar total de tabelas criadas
    const [tables] = await sequelize.query("SHOW TABLES");
    console.log(`\n✅ Total de tabelas no banco: ${tables.length}`);

    // 4) Seeds: criar usuário e admin iniciais
    try {
      const criarUsuarioInicial = require("./scripts/seed-usuario-inicial");
      await criarUsuarioInicial();
    } catch (e) {
      console.warn("⚠️ Seed usuário inicial:", e.message);
    }
    try {
      const criarAdminInicial = require("./scripts/seed-admin-painel");
      await criarAdminInicial();
    } catch (e) {
      console.warn("⚠️ Seed admin painel:", e.message);
    }

    console.log("🎉 Sincronização do banco completa!\n");
  } catch (err) {
    console.error("❌ Erro fatal na sincronização:", err.message);
    console.error(
      "⚠️ O servidor será iniciado mesmo assim, mas algumas tabelas podem não existir.",
    );
  }
}

// Executar sync e SÓ DEPOIS iniciar o servidor
syncAllTables().then(() => startServer());

// Endpoints para selecionar/obter impressora
app.get("/api/impressora", async (req, res) => {
  try {
    const ImpressoraConfig = require("./models/ImpressoraConfig");
    const registro = await ImpressoraConfig.findOne({
      order: [["updatedAt", "DESC"]],
    });
    if (!registro) return res.json({ tipo: null });
    res.json({
      tipo: registro.tipo,
      usuario: registro.usuario,
      updatedAt: registro.updatedAt,
    });
  } catch (err) {
    console.error("Erro GET /api/impressora", err);
    res.status(500).json({ error: "Erro ao obter configuração de impressora" });
  }
});

app.post("/api/impressora", async (req, res) => {
  try {
    const { tipo, usuario } = req.body || {};
    if (!tipo)
      return res.status(400).json({ error: "Campo tipo é obrigatório" });
    const ImpressoraConfig = require("./models/ImpressoraConfig");
    // Criar novo registro (mantemos histórico simples)
    const novo = await ImpressoraConfig.create({
      tipo: String(tipo),
      usuario: usuario ? String(usuario) : null,
    });
    res.json({
      success: true,
      registro: {
        id: novo.id,
        tipo: novo.tipo,
        usuario: novo.usuario,
        updatedAt: novo.updatedAt,
      },
    });
  } catch (err) {
    console.error("Erro POST /api/impressora", err);
    res
      .status(500)
      .json({ error: "Erro ao salvar configuração de impressora" });
  }
});

// Endpoints para selecionar/obter Modelo de Etiqueta
app.get("/api/modelo-etiqueta", async (req, res) => {
  try {
    const ModeloEtiquetaConfig = require("./models/ModeloEtiquetaConfig");
    const registro = await ModeloEtiquetaConfig.findOne({
      order: [["updatedAt", "DESC"]],
    });
    if (!registro) return res.json({ modelo: null });
    res.json({
      modelo: registro.modelo,
      usuario: registro.usuario,
      updatedAt: registro.updatedAt,
    });
  } catch (err) {
    console.error("Erro GET /api/modelo-etiqueta", err);
    res
      .status(500)
      .json({ error: "Erro ao obter configuração de modelo de etiqueta" });
  }
});

app.post("/api/modelo-etiqueta", async (req, res) => {
  try {
    const { modelo, usuario } = req.body || {};
    if (!modelo)
      return res.status(400).json({ error: "Campo modelo é obrigatório" });
    const ModeloEtiquetaConfig = require("./models/ModeloEtiquetaConfig");
    const novo = await ModeloEtiquetaConfig.create({
      modelo: String(modelo),
      usuario: usuario ? String(usuario) : null,
    });
    res.json({
      success: true,
      registro: {
        id: novo.id,
        modelo: novo.modelo,
        usuario: novo.usuario,
        updatedAt: novo.updatedAt,
      },
    });
  } catch (err) {
    console.error("Erro POST /api/modelo-etiqueta", err);
    res
      .status(500)
      .json({ error: "Erro ao salvar configuração de modelo de etiqueta" });
  }
});

// ── Handler global: evita crash por erros do Puppeteer/WhatsApp ──────────────
process.on("unhandledRejection", (reason, promise) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  // TargetCloseError é comportamento normal do WhatsApp Web (navegação após auth)
  if (
    msg.includes("Target closed") ||
    msg.includes("TargetCloseError") ||
    msg.includes("Session closed") ||
    msg.includes("Protocol error") ||
    msg.includes("detached Frame") ||
    msg.includes("Execution context was destroyed")
  ) {
    console.warn(
      "[WhatsApp] Puppeteer error ignorado (comportamento normal):",
      msg,
    );
    return;
  }
  console.error("⚠️ [UnhandledRejection]", msg);
});

process.on("uncaughtException", (err) => {
  const msg = err && err.message ? err.message : String(err);
  if (
    msg.includes("Target closed") ||
    msg.includes("TargetCloseError") ||
    msg.includes("Session closed") ||
    msg.includes("Protocol error") ||
    msg.includes("detached Frame") ||
    msg.includes("Execution context was destroyed")
  ) {
    console.warn(
      "[WhatsApp] Puppeteer exception ignorada (comportamento normal):",
      msg,
    );
    return;
  }
  console.error("💥 [UncaughtException]", msg);
  // Não encerrar o processo para erros não críticos
});

// Iniciar o servidor SOMENTE após sync do banco
function startServer() {
  const server = app.listen(3000, () => {
    console.log("🚀 Servidor rodando na porta 3000 ✅");
    console.log("🔗 URL: http://localhost:3000");

    // Iniciar agendador de mensagens WhatsApp (node-cron)
    try {
      const { iniciarAgendador } = require("./services/whatsappQueue");
      iniciarAgendador();
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível iniciar agendador WhatsApp:",
        err.message,
      );
    }

    // Cron: verificação de vencimentos do painel admin (todo dia às 00:30)
    try {
      const cron = require("node-cron");
      const {
        verificarVencimentos,
      } = require("./controllers/empresaPainelController");
      cron.schedule("30 0 * * *", () => {
        console.log("[cron] Executando verificação de vencimentos...");
        verificarVencimentos();
      });
      // Executar verificação ao iniciar também
      verificarVencimentos();
      console.log("✅ Cron de verificação de vencimentos iniciado");
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível iniciar cron de vencimentos:",
        err.message,
      );
    }

    // Cron: backup automático diário de todas as empresas (todo dia às 00:00)
    try {
      const cron = require("node-cron");
      const {
        executarBackupGeral,
        verificarEExecutarBackupSeNecessario,
      } = require("./services/backupService");

      // Verificar na inicialização se o backup de hoje já foi feito
      verificarEExecutarBackupSeNecessario();

      cron.schedule("0 0 * * *", async () => {
        console.log("[cron] Executando backup diário automático...");
        try {
          await executarBackupGeral();
        } catch (err) {
          console.error("[cron] Erro no backup diário:", err && err.message);
        }
      });
      console.log("✅ Cron de backup diário iniciado (00:00)");
    } catch (err) {
      console.warn("⚠️ Não foi possível iniciar cron de backup:", err.message);
    }

    // ═══════════════════════════════════════════════════════════════
    // Função reutilizável: processar aniversariantes do dia
    // ═══════════════════════════════════════════════════════════════
    async function processarAniversariantes() {
      console.log("[cron] Processando aniversariantes (multi-dia)...");
      try {
        const { Pet, Cliente, MensagemAutomatica } = require("./models");
        const { Op } = require("sequelize");
        const {
          dispararMensagemAutomatica,
          normalizarConfig,
        } = require("./controllers/marketingController");

        const hoje = new Date();

        // ── Buscar configs ativas por empresa ──
        const msgsPet = await MensagemAutomatica.findAll({
          where: { tipo: "aniversario_pet", ativo: true },
        });
        const msgsTutor = await MensagemAutomatica.findAll({
          where: { tipo: "aniversario_tutor", ativo: true },
        });

        const configsPet = new Map();
        const allDiasPet = new Set();
        for (const m of msgsPet) {
          const cfg = normalizarConfig(m.configuracaoEnvio);
          configsPet.set(m.empresaId, cfg);
          for (const d of cfg.dias) allDiasPet.add(d);
        }

        const configsTutor = new Map();
        const allDiasTutor = new Set();
        for (const m of msgsTutor) {
          const cfg = normalizarConfig(m.configuracaoEnvio);
          configsTutor.set(m.empresaId, cfg);
          for (const d of cfg.dias) allDiasTutor.add(d);
        }

        // Helper para parsear mês/dia de data_nascimento
        function parseMesDia(dataNasc) {
          const dateStr =
            typeof dataNasc === "string"
              ? dataNasc.split("T")[0]
              : dataNasc.toISOString().split("T")[0];
          const [, mesStr, diaStr] = dateStr.split("-");
          return [parseInt(mesStr, 10), parseInt(diaStr, 10)];
        }

        // ── Aniversário de PETS ──
        if (allDiasPet.size > 0) {
          const pets = await Pet.findAll({
            where: { data_nascimento: { [Op.not]: null } },
            include: [
              {
                model: Cliente,
                as: "cliente",
                attributes: ["id", "nome", "telefone", "empresa_id"],
              },
            ],
          });

          for (const pet of pets) {
            const dataNasc = pet.data_nascimento;
            if (!dataNasc) continue;
            const [mesNasc, diaNasc] = parseMesDia(dataNasc);
            const tutor = pet.cliente;
            if (!tutor?.telefone) continue;
            const cfg = configsPet.get(tutor.empresa_id);
            if (!cfg) continue;

            for (const diasAntes of cfg.dias) {
              const target = new Date(hoje);
              target.setDate(target.getDate() + diasAntes);
              if (
                target.getMonth() + 1 === mesNasc &&
                target.getDate() === diaNasc
              ) {
                await dispararMensagemAutomatica(
                  "aniversario_pet",
                  {
                    nomeTutor: tutor.nome || "Tutor",
                    nomePet: pet.nome || "Pet",
                    nomeEmpresa: "nossa clínica",
                  },
                  tutor.telefone,
                  hoje,
                  { clienteId: tutor.id, petId: pet.id, diasAntes },
                  tutor.empresa_id,
                );
              }
            }
          }
        }

        // ── Aniversário de TUTORES ──
        if (allDiasTutor.size > 0) {
          const clientes = await Cliente.findAll({
            where: { data_nascimento: { [Op.not]: null } },
          });

          for (const cliente of clientes) {
            const dataNasc = cliente.data_nascimento;
            if (!dataNasc) continue;
            const [mesNasc, diaNasc] = parseMesDia(dataNasc);
            if (!cliente.telefone) continue;
            const cfg = configsTutor.get(cliente.empresa_id);
            if (!cfg) continue;

            for (const diasAntes of cfg.dias) {
              const target = new Date(hoje);
              target.setDate(target.getDate() + diasAntes);
              if (
                target.getMonth() + 1 === mesNasc &&
                target.getDate() === diaNasc
              ) {
                const primeiroPet = await Pet.findOne({
                  where: { cliente_id: cliente.id },
                  attributes: ["nome"],
                });
                await dispararMensagemAutomatica(
                  "aniversario_tutor",
                  {
                    nomeTutor: cliente.nome || "Cliente",
                    nomePet: primeiroPet?.nome || "seu pet",
                    nomeEmpresa: "nossa clínica",
                  },
                  cliente.telefone,
                  hoje,
                  { clienteId: cliente.id, diasAntes },
                  cliente.empresa_id,
                );
              }
            }
          }
        }

        console.log("[cron] Processamento de aniversariantes concluído.");
      } catch (err) {
        console.error("[cron] Erro ao processar aniversariantes:", err.message);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // Função reutilizável: processar vacinas/vermifugos/antiparasitários vencendo hoje
    // ═══════════════════════════════════════════════════════════════
    async function processarVencimentos() {
      console.log(
        "[cron] Processando vacinas/vermifugos/antiparasitários vencendo (multi-dia)...",
      );
      try {
        const {
          MensagemAutomatica,
          Agendamento,
          Pet,
          Cliente,
          Periodicidade,
        } = require("./models");
        const {
          dispararMensagemAutomatica,
          normalizarConfig,
        } = require("./controllers/marketingController");

        // Buscar todas as empresas que têm vacinas_vencendo ativo
        const mensagensAtivas = await MensagemAutomatica.findAll({
          where: { tipo: "vacinas_vencendo", ativo: true },
        });
        if (mensagensAtivas.length === 0) {
          console.log(
            "[cron] Nenhuma empresa com 'vacinas_vencendo' ativa. Pulando.",
          );
          return;
        }

        // Normalizar config por empresaId (multi-dia)
        const configPorEmpresa = new Map();
        for (const m of mensagensAtivas) {
          configPorEmpresa.set(
            m.empresaId,
            normalizarConfig(m.configuracaoEnvio),
          );
        }

        const hoje = new Date();

        // Buscar todas as periodicidades para calcular data de renovação
        const periodicidades = await Periodicidade.findAll();
        const periodicidadesMap = new Map(
          periodicidades.map((p) => [p.descricao.trim().toLowerCase(), p]),
        );

        // Buscar agendamentos concluídos que têm vacina/vermifugo/antiparasitário
        const agendamentos = await Agendamento.findAll({
          where: { status: "concluido" },
          include: [
            {
              model: Pet,
              as: "pet",
              include: [{ model: Cliente, as: "cliente" }],
            },
          ],
        });

        let notificados = 0;

        for (const ag of agendamentos) {
          let servicos = ag.servicos;
          if (!servicos) continue;
          if (typeof servicos === "string") {
            try {
              servicos = JSON.parse(servicos);
            } catch (_) {
              continue;
            }
          }
          if (!Array.isArray(servicos)) continue;

          for (const s of servicos) {
            const meta = s.meta || {};
            if (
              !["vacina", "vermifugo", "antiparasitario"].includes(
                meta.tipoEspecial,
              )
            )
              continue;

            const dataAplic = meta.dataAplic || ag.dataAgendamento || null;
            const renovacaoLabel = meta.renovacao || meta.proximaDose || "";
            if (!dataAplic || !renovacaoLabel) continue;

            // Calcular data de renovação
            const p = periodicidadesMap.get(
              renovacaoLabel.trim().toLowerCase(),
            );
            if (!p || !p.dias) continue;

            const dStr =
              typeof dataAplic === "string"
                ? dataAplic.slice(0, 10)
                : new Date(dataAplic).toISOString().slice(0, 10);
            const [year, month, day] = dStr.split("-").map(Number);
            const dRenov = new Date(year, month - 1, day);
            if (isNaN(dRenov)) continue;
            dRenov.setDate(dRenov.getDate() + Number(p.dias));
            const renovStr = `${dRenov.getFullYear()}-${String(dRenov.getMonth() + 1).padStart(2, "0")}-${String(dRenov.getDate()).padStart(2, "0")}`;

            // Verificar se a empresa deste cliente tem vacinas_vencendo ativo
            const pet = ag.pet;
            if (!pet?.cliente?.telefone) continue;
            const empId = pet.cliente.empresa_id;
            const cfgEmpresa = configPorEmpresa.get(empId);
            if (!cfgEmpresa) continue;

            // Multi-dia: checar cada dia configurado
            for (const diasAntes of cfgEmpresa.dias) {
              const targetDate = new Date(
                hoje.getFullYear(),
                hoje.getMonth(),
                hoje.getDate() + diasAntes,
              );
              const targetStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;

              if (renovStr !== targetStr) continue;

              const tipoLabel =
                meta.tipoEspecial === "vacina"
                  ? "vacina"
                  : meta.tipoEspecial === "vermifugo"
                    ? "vermífugo"
                    : "antiparasitário";
              const produtoNome = s.nome || meta.nome || tipoLabel;

              await dispararMensagemAutomatica(
                "vacinas_vencendo",
                {
                  nomeTutor: pet.cliente.nome || "Tutor",
                  nomePet: pet.nome || "Pet",
                  produto: produtoNome,
                  tipoEspecial: tipoLabel,
                  dataRenovacao: dRenov.toLocaleDateString("pt-BR"),
                },
                pet.cliente.telefone,
                dRenov,
                {
                  clienteId: pet.cliente.id,
                  petId: pet.id,
                  agendamentoId: ag.id,
                  diasAntes,
                },
                empId,
              );
              notificados++;
            }
          }
        }

        console.log(
          `[cron] Vencimentos processados: ${notificados} notificação(ões).`,
        );
      } catch (err) {
        console.error("[cron] Erro ao processar vencimentos:", err.message);
      }
    }

    // Cron: mensagens de aniversário (pets e tutores) — todo dia às 08:00
    try {
      const cron = require("node-cron");
      cron.schedule("0 8 * * *", processarAniversariantes);
      console.log(
        "✅ Cron de mensagens de aniversário iniciado (08:00 diário)",
      );
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível iniciar cron de aniversários:",
        err.message,
      );
    }

    // Cron: vacinas/vermifugos/antiparasitários vencendo — todo dia às 09:00
    try {
      const cron = require("node-cron");
      cron.schedule("0 9 * * *", processarVencimentos);
      console.log(
        "✅ Cron de vencimentos (vacinas/vermifugos/antiparasitários) iniciado (09:00 diário)",
      );
    } catch (err) {
      console.warn(
        "⚠️ Não foi possível iniciar cron de vencimentos:",
        err.message,
      );
    }

    // Reconectar automaticamente sessões WhatsApp que estavam ativas
    // (usa arquivos de sessão salvos em disco — sem precisar de novo QR)
    setTimeout(async () => {
      try {
        const {
          reconectarSessoesAtivas,
        } = require("./services/whatsappService");
        await reconectarSessoesAtivas();
      } catch (err) {
        console.warn("⚠️ Erro ao reconectar sessões WhatsApp:", err.message);
      }
    }, 3000); // aguarda 3s para o DB estar pronto

    // Garantir template atualizado do vacinas_vencendo (sem alterar ativo de outras empresas)
    setTimeout(async () => {
      try {
        const { MensagemAutomatica } = require("./models");
        // Apenas atualizar o template do vacinas_vencendo para manter sincronizado
        await MensagemAutomatica.update(
          {
            conteudo:
              "💉 Oi {nome_tutor}!\n\nPassando para avisar que a {produto} de {nome_pet} vence hoje!\n\nNão esqueça de agendar na {nome_empresa} para manter {nome_pet} protegido(a). 🐾\n\nEntre em contato! 😊",
            configuracaoEnvio: { tipo: "no_dia", hora: "09:00" },
            descricaoMarketing:
              "Mantenha os clientes informados sobre vacinas/vermífugos/antiparasitários vencendo para garantir visitas regulares.",
          },
          { where: { tipo: "vacinas_vencendo" } },
        );
      } catch (err) {
        console.warn("⚠️ Erro ao ajustar mensagens automáticas:", err.message);
      }
    }, 5000);

    // Executar aniversariantes + vencimentos no startup (caso horário do cron já tenha passado)
    // Aguarda 90s para dar tempo do WhatsApp headless reconectar
    setTimeout(async () => {
      try {
        console.log(
          "[startup] Verificando mensagens automáticas pendentes (aniversários + vencimentos)...",
        );
        await processarAniversariantes();
        await processarVencimentos();
        console.log(
          "[startup] Verificação de mensagens automáticas concluída.",
        );
      } catch (err) {
        console.warn(
          "⚠️ Erro ao processar mensagens automáticas no startup:",
          err.message,
        );
      }
    }, 30000); // aguarda WhatsApp headless reconectar antes de processar

    const address = server.address();
    if (address) {
      console.log("📊 Endereço:", address);
      console.log("🌐 Hostname:", address.address);
      console.log("👂 Escutando na porta:", address.port);
    }
  });

  server.on("error", (error) => {
    console.error("❌ Erro no servidor:", error.message);
    if (error.code === "EADDRINUSE") {
      console.error("🚫 Porta 3000 já está em uso!");
    }
  });

  server.on("listening", () => {
    console.log("✅ Servidor pronto para receber conexões!");
  });
} // fim startServer()
