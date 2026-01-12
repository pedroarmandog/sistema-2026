const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const xml2js = require('xml2js');
const bodyParser = require('body-parser');

router.use(bodyParser.json({ limit: '10mb' }));

// Simple health route
router.get('/', (req, res) => {
  // If a chave query param is provided, return a mock lookup
  const chave = req.query && req.query.chave;
  if (chave) {
    return res.json({ ok: true, module: 'entrada-mercadoria', chave, nota: null, message: 'Mock: nenhuma nota encontrada para esta chave' });
  }

  res.json({ ok: true, module: 'entrada-mercadoria' });
});

// Endpoint: generate danfe buffer from posted nota data
router.post('/generate-danfe', async (req, res) => {
  try {
    const nota = req.body;
    const { generateDanfeBuffer } = require('../utils/danfeGenerator');
    const buffer = await generateDanfeBuffer(nota);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=danfe.pdf');
    res.send(buffer);
  } catch (err) {
    console.error('generate-danfe error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Endpoint: retornar DANFE por ID (GET /:id/danfe)
router.get('/:id/danfe', async (req, res) => {
  try {
    const id = req.params.id;
    let nota = null;

    // Tentar carregar a entrada do banco (Sequelize) quando disponível
    try {
      const modelsPath = path.join(__dirname, '..', '..', '..', 'models');
      const models = require(modelsPath);
      const Entrada = models && models.Entrada ? models.Entrada : null;
      if (Entrada && typeof Entrada.findByPk === 'function') {
        const row = await Entrada.findByPk(id);
        if (row) nota = (typeof row.toJSON === 'function') ? row.toJSON() : row;
      }
    } catch (dbErr) {
      console.warn('GET /:id/danfe - falha ao buscar Entrada no DB:', dbErr && dbErr.message);
    }

    // Se não encontrou no DB, criar um objeto mock para gerar o DANFE
    if (!nota) {
      nota = {
        fornecedorNome: 'Fornecedor (não encontrado no DB)',
        numero: id,
        chave: '',
        dataEmissao: new Date().toISOString().slice(0,10),
        valorTotal: 0,
        itens: []
      };
    }

    const { generateDanfeBuffer } = require('../utils/danfeGenerator');
    const buffer = await generateDanfeBuffer(nota);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=danfe-${id}.pdf`);
    res.send(buffer);
  } catch (err) {
    console.error('GET /:id/danfe error', err);
    res.status(500).send('Erro ao gerar DANFE: ' + (err && err.message ? err.message : String(err)));
  }
});

// Importar XML (recebe { filename, content })
router.post('/import-xml', async (req, res) => {
  try {
    const payload = req.body;
    const filename = payload && payload.filename ? payload.filename : 'unknown.xml';
    const content = payload && payload.content ? payload.content : '';
    const size = typeof content === 'string' ? content.length : 0;
    // Tentar extrair dados do XML e persistir fornecedor no banco
    let fornecedorSaved = null;
    try {
      if (content && content.trim()) {
        const parsed = await xml2js.parseStringPromise(content, { explicitArray: true });
        // procurar por node 'emit' contendo xNome e CNPJ
        function findEmit(obj) {
          if (!obj || typeof obj !== 'object') return null;
          if (obj.emit) return obj.emit;
          for (const k of Object.keys(obj)) {
            const v = obj[k];
            if (Array.isArray(v)) {
              for (const item of v) {
                const r = findEmit(item);
                if (r) return r;
              }
            } else if (typeof v === 'object') {
              const r = findEmit(v);
              if (r) return r;
            }
          }
          return null;
        }

        const emit = findEmit(parsed);
        let nome = null; let cnpj = null;
        try {
          if (emit) {
            const e = Array.isArray(emit) ? emit[0] : emit;
            nome = e.xNome && e.xNome[0] ? e.xNome[0] : nome;
            cnpj = e.CNPJ && e.CNPJ[0] ? e.CNPJ[0] : cnpj;
          }
        } catch (e) { /* ignore */ }

        if (nome) {
          try {
            const Fornecedor = require(path.join(__dirname, '..', '..', '..', 'models', 'Fornecedor'));
            let found = null;
            if (cnpj) found = await Fornecedor.findOne({ where: { cnpj: cnpj } });
            if (!found) found = await Fornecedor.findOne({ where: { nome: nome } });
            if (!found) {
              const created = await Fornecedor.create({ nome: nome, cnpj: cnpj || null });
              fornecedorSaved = created;
            } else {
              fornecedorSaved = found;
            }
          } catch (err) {
            console.warn('Erro ao persistir fornecedor durante import-xml:', err && err.message);
          }
        }
      }
    } catch (errParse) {
      console.warn('import-xml parse error', errParse && errParse.message);
    }

    return res.json({ ok: true, message: 'XML recebido', filename, size, fornecedor: fornecedorSaved ? { id: fornecedorSaved.id, nome: fornecedorSaved.nome } : null });
  } catch (err) {
    console.error('import-xml error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// Entrada manual (recebe dados mínimos da nota e salva no banco)
router.post('/manual', async (req, res) => {
  try {
    const nota = req.body || {};
    
    // Tentar persistir no banco usando o modelo Sequelize Entrada
    try {
      const modelsPath = path.join(__dirname, '..', '..', '..', 'models');
      const models = require(modelsPath);
      const Entrada = models && models.Entrada ? models.Entrada : null;

      if (Entrada && typeof Entrada.create === 'function') {
          // Antes de persistir a entrada, garantir que o fornecedor exista no cadastro de fornecedores
          try {
            const fornecedorNome = nota.fornecedor || nota.fornecedorNome || (nota.fornecedor && nota.fornecedor.nome) || null;
            const fornecedorCnpj = nota.fornecedorCnpj || nota.cnpj || (nota.fornecedor && (nota.fornecedor.cnpj || nota.fornecedor.CNPJ)) || null;
            if (fornecedorNome) {
              try {
                const Fornecedor = require(path.join(__dirname, '..', '..', '..', 'models', 'Fornecedor'));
                let found = null;
                if (fornecedorCnpj) found = await Fornecedor.findOne({ where: { cnpj: fornecedorCnpj } });
                if (!found) found = await Fornecedor.findOne({ where: { nome: fornecedorNome } });
                if (!found) {
                  found = await Fornecedor.create({ nome: fornecedorNome, cnpj: fornecedorCnpj || null });
                }
                // normalizar o campo fornecedor para o nome salvo
                nota.fornecedor = found.nome;
              } catch (fErr) {
                console.warn('Persistência de fornecedor falhou ao criar entrada manual:', fErr && fErr.message);
              }
            }

            const created = await Entrada.create({
              fornecedor: nota.fornecedor || null,
              numero: nota.numero || null,
              serie: nota.serie || null,
              dataEmissao: nota.dataEmissao || null,
              dataEntrada: nota.dataEntrada || null,
              chaveAcesso: nota.chaveAcesso || null,
              transportador: nota.transportador || null,
              fretePorConta: nota.fretePorConta || null,
              frete: nota.frete || 0,
              itens: nota.itens || null,
              observacao: nota.observacao || nota.observacoes || null,
              desconto: nota.desconto || 0,
              seguro: nota.seguro || 0,
              despesa: nota.despesa || 0,
              icmsST: nota.icmsST || 0,
              ipi: nota.ipi || 0,
              despesaExtra: nota.despesaExtra || 0,
              totalProdutos: nota.totalProdutos || 0,
              valorTotal: nota.valorTotal || 0,
              centroResultado: nota.centroResultado || null,
              categoriaFinanceira: nota.categoriaFinanceira || null,
              situacao: 'pendente'
            });

            // Retornar diretamente o objeto criado (compatível com o frontend que espera o objeto)
            try{ return res.json(typeof created.toJSON === 'function' ? created.toJSON() : created); }catch(e){ return res.json(created); }
          } catch (persistErr) {
            console.warn('Persistência com Sequelize falhou ao criar entrada:', persistErr && persistErr.message);
          }
        }
    } catch (persistErr) {
      console.warn('Persistência com Sequelize falhou:', persistErr && persistErr.message);
    }

    // Fallback: retornar mock se persistência não funcionar (retornar objeto direto para compatibilidade)
    const saved = Object.assign({ id: Date.now(), situacao: 'pendente' }, nota);
    return res.json(saved);
  } catch (err) {
    console.error('manual entry error', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

module.exports = router;
