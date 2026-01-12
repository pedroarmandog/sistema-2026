const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Empresa } = require('../models');
const Produto = require('../models/Produto');

// DEBUG: confirmar que o arquivo de rotas foi carregado
console.log('🔧 relatoriosRoutes.js carregado e router criado');

/**
 * ========================================
 * ROTAS DE RELATÓRIOS
 * ========================================
 */

/**
 * POST /api/relatorios/faturamento
 * Retorna dados para relatório de faturamento
 */
router.post('/faturamento', async (req, res) => {
    try {
        console.log('📊 Gerando dados do relatório de faturamento');
        console.log('Filtros recebidos:', req.body);
        
        const { dataInicio, dataFim, relatorioPor, ordenacao } = req.body;
        
        // Aqui você faria a consulta real no banco de dados
        // Por enquanto, vou retornar dados de exemplo
        
        const dadosRelatorio = {
            periodo: `Período: ${dataInicio || '06/11/2025'} até ${dataFim || '06/11/2025'}`,
            produtos: [
                {
                    codigo: '368',
                    produto: 'Assinatura 4 Banho/Mês - Scoot - Cláudio',
                    qtd_vendida: 1,
                    custo: 0.00,
                    total_venda: 200.00,
                    lucro: 200.00,
                    margem: 100
                },
                {
                    codigo: '125',
                    produto: 'Consulta Veterinária',
                    qtd_vendida: 5,
                    custo: 50.00,
                    total_venda: 600.00,
                    lucro: 350.00,
                    margem: 58.33
                },
                {
                    codigo: '089',
                    produto: 'Vacina V10',
                    qtd_vendida: 3,
                    custo: 35.00,
                    total_venda: 255.00,
                    lucro: 150.00,
                    margem: 58.82
                },
                {
                    codigo: '234',
                    produto: 'Banho e Tosa - Pequeno',
                    qtd_vendida: 8,
                    custo: 20.00,
                    total_venda: 480.00,
                    lucro: 320.00,
                    margem: 66.67
                },
                {
                    codigo: '345',
                    produto: 'Ração Premium - 15kg',
                    qtd_vendida: 12,
                    custo: 85.00,
                    total_venda: 1680.00,
                    lucro: 660.00,
                    margem: 39.29
                }
            ]
        };
        
        // Se você estiver usando Sequelize, seria algo assim:
        /*
        const produtos = await Produto.findAll({
            include: [
                {
                    model: ItemVenda,
                    where: {
                        data_venda: {
                            [Op.between]: [dataInicio, dataFim]
                        }
                    }
                }
            ],
            attributes: [
                'codigo',
                'nome',
                [sequelize.fn('SUM', sequelize.col('ItemVenda.quantidade')), 'qtd_vendida'],
                [sequelize.fn('SUM', sequelize.col('ItemVenda.total')), 'total_venda'],
                'custo'
            ],
            group: ['Produto.id'],
            order: [[ordenacao, 'DESC']]
        });
        */
        
        res.json(dadosRelatorio);
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar relatório',
            message: error.message 
        });
    }
});

/**
 * POST /api/relatorios/faturamento/pdf
 * Gera PDF do relatório de faturamento
*/
router.post('/faturamento/pdf', async (req, res) => {
    try {
        console.log('📄 Gerando PDF de faturamento (POST)');

        const { dataInicio = '', dataFim = '', produtos = [] } = req.body || {};

        let PDFDocument;
        try { PDFDocument = require('pdfkit'); } catch (errRequire) {
            console.error('❌ pdfkit não está instalado:', errRequire && errRequire.message);
            res.status(500).json({ error: 'Dependência ausente: pdfkit', message: 'Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.' });
            return;
        }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="relatorio_faturamento.pdf"');
        doc.pipe(res);

        // Cabeçalho com logo da empresa
        let logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png'); // logo padrão
        const EmpresaModel = Empresa; // já importado no topo
        let empresa = null;
        try {
            empresa = await EmpresaModel.findOne({ where: { ativa: true }, order: [['id', 'ASC']] });
        } catch (e) { console.warn('⚠️ Não foi possível buscar empresa ativa:', e && e.message); }

        if (empresa && empresa.logo && empresa.logo !== '') {
            const empresaLogoPath = path.join(__dirname, '../../uploads', empresa.logo);
            if (fs.existsSync(empresaLogoPath)) {
                logoPath = empresaLogoPath;
                console.log('✅ Usando logo da empresa:', empresa.logo);
            }
        }

        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, (595/2) - 55, 30, { width: 110, align: 'center' });
        }

        // Título
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('RELATÓRIO DE FATURAMENTO', 0, 150, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).font('Helvetica');
        doc.text(empresa ? (empresa.nome || empresa.razaoSocial || 'PET CRIA LTDA') : 'PET CRIA LTDA', { align: 'center' });

        doc.moveDown(1);

        // Construir tabela com layout em duas linhas por produto (para caber em A4)
        const left = 40;
        const usableWidth = 595 - 2 * 40; // A4 width - margins
        // Colunas calculadas para segunda linha
        const cols2 = {
            marca: left,
            grupo: left + 120,
            subgrupo: left + 240,
            preco_custo: left + 340,
            preco_venda: left + 400,
            estoque_minimo: left + 460
        };

        // Header (título da tabela)
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#222');
        // desenhar uma linha de separação abaixo do título
        let y = 180; // ajustado para dar espaço à logo centralizada
        doc.moveTo(left, y + 18).lineTo(left + usableWidth, y + 18).stroke('#e6e6e6');

        doc.fontSize(9).font('Helvetica');

        // Percorrer produtos e desenhar cada produto em duas colunas: esquerda (código + descrição), direita (meta + preços)
        y = y + 26;
        const rightColWidth = 170;
        const codeWidth = 40;
        const descX = left + codeWidth + 8; // espaço após código
        const descWidth = usableWidth - rightColWidth - codeWidth - 16; // margem interna
        const rightX = left + usableWidth - rightColWidth;

        const dataProdutos = Array.isArray(produtos) && produtos.length ? produtos : [];

        dataProdutos.forEach((p, i) => {
            // calcular blocos e alturas para evitar sobreposição
            const codigoText = p.codigo || '';
            const descricao = (p.descricao || p.produto || '');
            const unidadeText = p.unidade ? `Un: ${p.unidade}` : '';

            const marcaText = p.marca || '';
            const grupoText = p.grupo || '';
            const subgrupoText = p.subgrupo || '';

            const precoCusto = p.preco_custo ? `C: R$ ${Number(p.preco_custo).toFixed(2)}` : '';
            const precoVenda = p.preco_venda ? `V: R$ ${Number(p.preco_venda).toFixed(2)}` : '';
            const estoqueTxt = (p.estoque_minimo !== undefined && p.estoque_minimo !== null) ? String(p.estoque_minimo) : '';

            const leftDescHeight = doc.heightOfString(descricao, { width: descWidth });
            const leftUnitHeight = unidadeText ? doc.heightOfString(unidadeText, { width: descWidth }) : 0;
            const leftHeight = Math.max(leftDescHeight + leftUnitHeight, 18);

            const rightTopLines = [marcaText, grupoText, subgrupoText].filter(Boolean).join('\n');
            const rightPriceLines = [precoCusto, precoVenda, estoqueTxt ? `Est: ${estoqueTxt}` : ''].filter(Boolean).join('\n');

            const rightTopHeight = rightTopLines ? doc.heightOfString(rightTopLines, { width: rightColWidth - 8 }) : 0;
            const rightPriceHeight = rightPriceLines ? doc.heightOfString(rightPriceLines, { width: rightColWidth - 8 }) : 0;
            const rightHeight = Math.max(rightTopHeight + rightPriceHeight, 18);

            const rowPadding = 12;
            const rowHeight = Math.max(leftHeight, rightHeight) + rowPadding;

            if (y + rowHeight > 760) {
                doc.addPage();
                y = 60;
            }

            doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
            doc.text(codigoText, left, y, { width: codeWidth, align: 'left' });
            doc.font('Helvetica').fontSize(9).fillColor('#111');
            doc.text(descricao, descX, y, { width: descWidth, align: 'left' });

            if (unidadeText) {
                doc.font('Helvetica').fontSize(8).fillColor('#666');
                doc.text(unidadeText, descX, y + leftDescHeight + 4, { width: descWidth });
            }

            doc.font('Helvetica').fontSize(9).fillColor('#333');
            if (rightTopLines) {
                doc.text(rightTopLines, rightX, y, { width: rightColWidth - 8, align: 'left' });
            }

            if (rightPriceLines) {
                const priceStartY = y + rightTopHeight + 6;
                const priceLinesArr = rightPriceLines.split('\n');
                priceLinesArr.forEach((line, idxLine) => {
                    const thisY = priceStartY + idxLine * 12;
                    doc.text(line, rightX, thisY, { width: rightColWidth - 8, align: 'right' });
                });
            }

            const sepY = y + rowHeight - 6;
            doc.moveTo(left, sepY).lineTo(left + usableWidth, sepY).stroke('#f0f0f0');
            y = sepY + 12;
        });

        doc.end();

    } catch (error) {
        console.error('❌ Erro ao gerar PDF de faturamento:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
    }
});
/**
 * POST /api/relatorios/etiquetas/pdf
 * Gera PDF simples de etiquetas a partir de um array de itens.
 * Espera JSON: { etiquetas: [{ id, produto, quantidade, codigoBarras? }], primeiraLinha, primeiraColuna, gerarPor, modelo }
 */
router.post('/etiquetas/pdf', async (req, res) => {
    try {
        console.log('📄 Gerando PDF de etiquetas');
        const { etiquetas = [], primeiraLinha = 1, primeiraColuna = 1, gerarPor = 'Código do produto', modelo = '', barcodeOffsetMm = 0, priceOffsetMm = 0 } = req.body || {};
        // helper mm -> pt (definido antes do uso dos offsets)
        const mmToPt = mm => mm * 2.834645669;
        // converter offsets em mm (recebidos do frontend) para pontos
        let barcodeOffsetPt = (typeof barcodeOffsetMm === 'number') ? mmToPt(barcodeOffsetMm) : (Number(barcodeOffsetMm) ? mmToPt(Number(barcodeOffsetMm)) : 0);
        let priceOffsetPt = (typeof priceOffsetMm === 'number') ? mmToPt(priceOffsetMm) : (Number(priceOffsetMm) ? mmToPt(Number(priceOffsetMm)) : 0);

        // Se for o modelo A4-65 com barras e offsets não foram fornecidos, aplicar pequeno ajuste padrão para a esquerda
        const modeloA465 = (/65 etiquetas|38x21|38 x 21|38x21mm/i.test(modelo) && /barras|barra/i.test(modelo));
        if (modeloA465) {
            if (!barcodeOffsetPt) barcodeOffsetPt = mmToPt(-4); // -4 mm por padrão para a esquerda (mais deslocamento)
            if (!priceOffsetPt) priceOffsetPt = mmToPt(-4);
        }

        if (barcodeOffsetPt || priceOffsetPt) console.log(`🔧 Offsets aplicados (pt): barcodeOffset=${barcodeOffsetPt.toFixed(2)}, priceOffset=${priceOffsetPt.toFixed(2)}`);

        // Log de debug: mostrar amostra dos primeiros itens e verificar presença do campo `preco`
        try {
            const sample = (Array.isArray(etiquetas) ? etiquetas : []).slice(0,5).map((it, i) => ({
                index: i,
                id: it && (it.id || it.codigo || it.codigoBarras) ? (it.id || it.codigo || it.codigoBarras) : null,
                produto: it && (it.produto || it.nome) ? (it.produto || it.nome) : null,
                preco: it && (it.preco !== undefined ? it.preco : (it.preco_venda || it.precoVenda || it.preco_venda_formatted || it.preco_formatted || null))
            }));
            console.log('🔎 etiquetas (sample 0..4):', JSON.stringify({ modelo, sample }));
        } catch (dbg) { console.warn('⚠️ Falha ao montar log de amostra de etiquetas:', dbg && dbg.message); }

        let PDFDocument;
        try { PDFDocument = require('pdfkit'); } catch (errRequire) {
            console.error('❌ pdfkit não está instalado:', errRequire && errRequire.message);
            res.status(500).json({ error: 'Dependência ausente: pdfkit', message: 'Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.' });
            return;
        }

        const doc = new PDFDocument({ size: 'A4', margin: 28 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="etiquetas.pdf"`);
        doc.pipe(res);

        const pageWidth = 595.28; // pts for A4
        const pageHeight = 841.89;
        const margin = 28;

        // Build flat list expanding quantities
        const flat = [];
        etiquetas.forEach(item => {
            const qty = Number(item.quantidade) || 1;
            for (let i = 0; i < qty; i++) flat.push(item);
        });

        // helper mm -> pt (defined once above for offsets and later usage)

        // Caso: modelo Papel A4 - 65 etiquetas (38x21mm) com barras
        if (/65 etiquetas|38x21|38 x 21|38x21mm/i.test(modelo) && /barras|barra/i.test(modelo)){
            // label size: 38 x 21 mm
            const labelW = mmToPt(38);
            const labelH = mmToPt(21);
            const cols = 5;
            const rows = 13; // 5 x 13 = 65

            const usableW = pageWidth - margin * 2;
            const totalGridW = cols * labelW;
            const startX = margin + Math.max(0, (usableW - totalGridW) / 2);
            let startY = margin + mmToPt(6);

            // try to load bwip-js for barcode rendering (diagnostic logs added)
            let bwip = null;
            try {
                bwip = require('bwip-js');
                console.log('✅ bwip-js carregado: geração de códigos habilitada');
            } catch (e) {
                bwip = null;
                console.warn('⚠️ bwip-js não encontrado — códigos de barras gráficos estarão desativados');
            }

            doc.font('Helvetica').fontSize(8).fillColor('#111');

            let idx = 0;
            for (let r = 0; r < rows; r++){
                for (let c = 0; c < cols; c++){
                    if (idx >= flat.length) break;
                    const it = flat[idx];
                    const x = startX + c * labelW;
                    const y = startY + r * labelH;

                    // Text line: ID - NAME (smaller font)
                    const codigo = (gerarPor && gerarPor.toLowerCase().indexOf('barras') !== -1) ? (it.codigoBarras || it.codigo || String(it.id || '')) : (it.id || it.codigo || '');
                    const titulo = it.produto || it.nome || '';
                    const linha = [String(codigo).trim(), String(titulo).trim()].filter(Boolean).join(' - ');
                    doc.font('Helvetica').fontSize(8).fillColor('#000');
                    // medir altura do título para posicionar corretamente o código de barras e preço
                    const tituloHeight = doc.heightOfString(linha, { width: labelW - 8 });
                    doc.text(linha, x + 4, y + 4, { width: labelW - 8, align: 'left' });

                    // Barcode (e possivelmente preço) abaixo do texto
                    const imgW = Math.min(labelW - 12, mmToPt(30));
                    // posição X centralizada base (sem offsets)
                    const baseCenterX = x + (labelW - imgW) / 2;
                    // posição X do barcode: centralizada + offset específico para barcode
                    const imgX = baseCenterX + (barcodeOffsetPt || 0);
                    const imgH = mmToPt(8); // altura do barcode

                    // detectar se o modelo pede preço (preço + barras)
                    const modeloPedePreco = /pre[cç]o|preco|preço/i.test(modelo || '');
                    // obter valor do preço a partir dos campos mais comuns
                    let precoRaw = (it.preco !== undefined && it.preco !== null) ? it.preco : (it.preco_venda || it.precoVenda || it.preco_venda_formatted || it.preco_formatted || null);
                    let temPreco = precoRaw !== null && precoRaw !== undefined && precoRaw !== '';

                    // Fallback: se não veio preço no payload, tentar buscar no banco pelo id (quando houver)
                    if (!temPreco && it && (it.id || it.codigo)) {
                        try {
                            const lookupId = String(it.id || it.codigo);
                            const prod = await Produto.findByPk(lookupId);
                            if (prod && (prod.preco !== undefined && prod.preco !== null)) {
                                precoRaw = prod.preco;
                                temPreco = true;
                                console.log(`🔁 Preço obtido do DB para produto ${lookupId}:`, precoRaw);
                            }
                        } catch (dbErr) {
                            console.warn('⚠️ Falha ao buscar produto para fallback de preco:', dbErr && dbErr.message);
                        }
                    }

                    // preparar texto do preço (formatado) e medir sua altura para reservar espaço
                    let precoText = null;
                    let priceHeight = 0;
                    if (modeloPedePreco && temPreco) {
                        try {
                            let precoNum = Number(String(precoRaw).replace(/[^0-9\-.,]/g, '').replace(',', '.'));
                            if (!isNaN(precoNum) && isFinite(precoNum)) {
                                precoText = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(precoNum);
                            } else {
                                precoText = String(precoRaw);
                            }
                        } catch (e) {
                            precoText = String(precoRaw);
                        }
                        try {
                            doc.font('Helvetica-Bold').fontSize(9);
                            priceHeight = doc.heightOfString(precoText, { width: imgW });
                        } catch (e) { priceHeight = 0; }
                    }

                    // posicionamento base do topo do barcode, após o título e reservando espaço para o preço quando houver
                    const spacingAfterTitle = 4;
                    const priceGap = 2; // gap entre preço e barcode
                    const barcodeTop = y + 4 + tituloHeight + (priceHeight ? (priceHeight + priceGap) : spacingAfterTitle);

                    // se há preço, desenhar centralizado imediatamente acima do barcode, usando a altura medida
                    if (precoText) {
                        try {
                            const priceY = barcodeTop - priceHeight - priceGap;
                            doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
                            // posicionar o preço em relação à base central (para não se mover junto com o barcode)
                            const priceX = baseCenterX + (priceOffsetPt || 0);
                            doc.text(precoText, priceX, priceY, { width: imgW, align: 'center' });
                        } catch (e) { console.warn('⚠️ Erro ao desenhar preço na etiqueta:', e && e.message); }
                    }

                    // evitar duplicar o código visual no cabeçalho: verificar se o header já começa com o código
                    const headerHasCode = String(linha || '').trim().startsWith(String(codigo).trim());

                    if (bwip){
                        try{
                            const png = await bwip.toBuffer({ bcid: 'code128', text: String(codigo), scale: 2, height: 14, includetext: false });
                            console.log('🔢 Código de barras gerado (bytes):', png && png.length ? png.length : 'indisponível');
                            // salvar PNG para diagnóstico local (pasta tmp) — será útil para inspecionar se o PNG foi gerado corretamente
                            try{
                                const tmpDir = path.join(__dirname, '../../tmp');
                                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                                const outPath = path.join(tmpDir, `barcode-${String(codigo)}.png`);
                                fs.writeFileSync(outPath, png);
                                console.log('📁 PNG do código de barras salvo em:', outPath);
                            } catch(saveErr){
                                console.warn('⚠️ Não foi possível salvar PNG de diagnóstico:', saveErr && saveErr.message);
                            }

                            try{
                                // tentar desenhar a imagem; usar fit para respeitar proporções
                                doc.image(png, imgX, barcodeTop, { fit: [imgW, imgH], align: 'center' });
                            } catch(imgErr){
                                console.warn('⚠️ Erro ao renderizar imagem do código de barras no PDF:', imgErr && imgErr.message);
                                // fallback: desenhar o número do código para garantir que algo apareça
                                doc.fontSize(7).text(String(codigo), imgX, barcodeTop, { width: imgW, align: 'center' });
                            }
                        }catch(barErr){
                            console.warn('⚠️ bwip-js falhou ao gerar o código de barras:', barErr && barErr.message);
                            // fallback: desenhar o número do código por garantia
                            doc.fontSize(7).text(String(codigo), imgX, barcodeTop, { width: imgW, align: 'center' });
                        }
                    } else {
                        // bwip não está instalado: não desenhar o código duplicado (já aparece no cabeçalho)
                        // Logar instrução para o desenvolvedor instalar a dependência caso queira barras gráficas
                        console.warn('⚠️ bwip-js não encontrado. Para gerar códigos de barras gráficos execute: npm install bwip-js');
                        if (!headerHasCode) doc.fontSize(7).text(String(codigo), imgX, barcodeTop, { width: imgW, align: 'center' });
                    }

                    idx++;
                }
                if (idx >= flat.length) break;
            }

            doc.end();
            return;
        }

        // Fallback: Simple layout (3 cols)
        const colsFallback = 3;
        const usableWidth = pageWidth - margin * 2;
        const labelWidth = Math.floor(usableWidth / colsFallback);
        const labelHeight = 72; // pt
        doc.font('Helvetica').fontSize(9).fillColor('#111');

        let x = margin;
        let y = margin + 10; // start a bit lower
        let colIndex = 0;

        flat.forEach((it, idx) => {
            if (colIndex === 0 && idx !== 0 && (y + labelHeight) > (pageHeight - margin)) {
                doc.addPage();
                y = margin + 10;
            }

            x = margin + (colIndex * labelWidth);

            // Draw label content
            const codigo = (gerarPor && gerarPor.toLowerCase().indexOf('barras') !== -1) ? (it.codigoBarras || it.codigo || String(it.id || '')) : (it.id || it.codigo || '');
            const titulo = (it.produto || it.nome || 'Produto');

            // Conteúdo: "CÓDIGO - PRODUTO" em uma única linha (sem estoque)
            const codigoStr = codigo ? String(codigo).trim() : '';
            const produtoStr = titulo ? String(titulo).trim() : '';
            const linha = [codigoStr, produtoStr].filter(Boolean).join(' - ');
            doc.font('Helvetica').fontSize(9).fillColor('#000').text(linha, x + 4, y + 6, { width: labelWidth - 8, align: 'left' });

            colIndex++;
            if (colIndex >= colsFallback) {
                colIndex = 0;
                y += labelHeight;
            }
        });

        doc.end();
    } catch (err) {
        console.error('❌ Erro gerando etiquetas PDF', err);
        try { res.status(500).json({ error: 'Erro gerando PDF', message: err && err.message }); } catch(e){}
    }
});



/**
 * POST /api/relatorios/produtos
 * Retorna dados para relatório de produtos
 */
router.post('/produtos', async (req, res) => {
    try {
        console.log('📊 Gerando dados do relatório de produtos');
        
        const dadosRelatorio = {
            periodo: 'Catálogo de Produtos',
            produtos: [
                {
                    codigo: '001',
                    produto: 'Ração Premium Adulto',
                    categoria: 'Alimentação',
                    estoque: 45,
                    preco_venda: 89.90
                },
                {
                    codigo: '002',
                    produto: 'Shampoo Antipulgas',
                    categoria: 'Higiene',
                    estoque: 23,
                    preco_venda: 35.00
                },
                {
                    codigo: '003',
                    produto: 'Brinquedo Mordedor',
                    categoria: 'Acessórios',
                    estoque: 67,
                    preco_venda: 25.90
                }
            ]
        };
        
        res.json(dadosRelatorio);
        
    } catch (error) {
        console.error('❌ Erro ao gerar relatório de produtos:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar relatório',
            message: error.message 
        });
    }
});

/**
 * GET /api/relatorios/template/:tipo
 * Retorna o template do relatório
 */
router.get('/template/:tipo', (req, res) => {
    const { tipo } = req.params;
    const path = require('path');
    const templatePath = path.join(__dirname, '../../frontend/reports/templates', `${tipo}.mrt`);
    
    res.sendFile(templatePath, (err) => {
        if (err) {
            console.error('❌ Erro ao enviar template:', err);
            res.status(404).json({ error: 'Template não encontrado' });
        }
    });
});

module.exports = router;

/**
 * GET /api/relatorios/produtos/pdf
 * Gera um PDF com o catálogo de produtos e retorna como application/pdf
 */
router.get('/produtos/pdf', async (req, res) => {
    try {
        console.log('📄 Gerando PDF de produtos');

        // Buscar empresa ativa do banco de dados
        const empresa = await Empresa.findOne({
            where: { ativa: true },
            order: [['id', 'ASC']]
        });

        // Aqui você deveria buscar os produtos do banco ou do storage
        // Usarei o mesmo fallback de produtos definido acima (produtosExemplo-like)
        const produtos = [
            { codigo: '001', descricao: 'Ração Premium Adulto', unidade: 'UN', marca: 'Golden', grupo: 'Rações', subgrupo: 'Adulto', preco_custo: 40.04, preco_venda: 131.00, estoque_minimo: 0, local: 'Loja' },
            { codigo: '002', descricao: 'BUTOX P CE 25 - 20ML', unidade: 'UN', marca: 'Credeli', grupo: 'Farmácia', subgrupo: 'Medicamentos', preco_custo: 4.31, preco_venda: 7.00, estoque_minimo: 0, local: 'Loja' },
            { codigo: '003', descricao: 'Banho e Tosa - Cães Pequeno Porte', unidade: 'UN', marca: '', grupo: 'Serviços', subgrupo: 'Banho/Tosa', preco_custo: 0.00, preco_venda: 50.00, estoque_minimo: 0, local: 'Loja' }
        ];

        // carregar pdfkit dinamicamente (se não estiver instalado, retornar erro claro)
        let PDFDocument;
        try {
            PDFDocument = require('pdfkit');
        } catch (errRequire) {
            console.error('❌ pdfkit não está instalado:', errRequire && errRequire.message);
            res.status(500).json({ error: 'Dependência ausente: pdfkit', message: 'Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.' });
            return;
        }

        // criar documento em memória
        const doc = new PDFDocument({ size: 'A4', margin: 40 });

        // preparar headers da resposta
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="relatorio_produtos.pdf"');

        // pipe direto para response
        doc.pipe(res);

        // Cabeçalho com logo da empresa
        let logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png'); // logo padrão
        
        // Se empresa tem logo, usar a logo da empresa
        if (empresa && empresa.logo && empresa.logo !== '') {
            const empresaLogoPath = path.join(__dirname, '../../uploads', empresa.logo);
            if (fs.existsSync(empresaLogoPath)) {
                logoPath = empresaLogoPath;
                console.log('✅ Usando logo da empresa:', empresa.logo);
            }
        }
        
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, (595/2) - 55, 30, { width: 110, align: 'center' }); // centralizar logo
        }

        // Título
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('RELATÓRIO DE PRODUTO', 0, 150, { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(11).font('Helvetica');
        doc.text(empresa ? (empresa.nome || empresa.razaoSocial || 'PET CRIA LTDA') : 'PET CRIA LTDA', { align: 'center' });

        doc.moveDown(1);

        // Construir tabela com layout em duas linhas por produto (para caber em A4)
        const left = 40;
        const usableWidth = 595 - 2 * 40; // A4 width - margins
        // Colunas calculadas para segunda linha
        const cols2 = {
            marca: left,
            grupo: left + 120,
            subgrupo: left + 240,
            preco_custo: left + 340,
            preco_venda: left + 400,
            estoque_minimo: left + 460
        };

        // Header (título da tabela)
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#222');
        // desenhar uma linha de separação abaixo do título
        let y = 180; // ajustado para dar espaço à logo centralizada
        doc.moveTo(left, y + 18).lineTo(left + usableWidth, y + 18).stroke('#e6e6e6');

        doc.fontSize(9).font('Helvetica');

        // Percorrer produtos e desenhar cada produto em duas colunas: esquerda (código + descrição), direita (meta + preços)
        y = y + 26;
        const rightColWidth = 170;
        const codeWidth = 40;
        const descX = left + codeWidth + 8; // espaço após código
        const descWidth = usableWidth - rightColWidth - codeWidth - 16; // margem interna
        const rightX = left + usableWidth - rightColWidth;

        produtos.forEach((p, i) => {
            // calcular blocos e alturas para evitar sobreposição
            const codigoText = p.codigo || '';
            const descricao = (p.descricao || p.produto || '');
            const unidadeText = p.unidade ? `Un: ${p.unidade}` : '';

            const marcaText = p.marca || '';
            const grupoText = p.grupo || '';
            const subgrupoText = p.subgrupo || '';

            const precoCusto = p.preco_custo ? `C: R$ ${Number(p.preco_custo).toFixed(2)}` : '';
            const precoVenda = p.preco_venda ? `V: R$ ${Number(p.preco_venda).toFixed(2)}` : '';
            const estoqueTxt = (p.estoque_minimo !== undefined && p.estoque_minimo !== null) ? String(p.estoque_minimo) : '';

            // montar blocos de texto para medir alturas
            const leftDescHeight = doc.heightOfString(descricao, { width: descWidth });
            const leftUnitHeight = unidadeText ? doc.heightOfString(unidadeText, { width: descWidth }) : 0;
            const leftHeight = Math.max(leftDescHeight + leftUnitHeight, 18);

            const rightTopLines = [marcaText, grupoText, subgrupoText].filter(Boolean).join('\n');
            const rightPriceLines = [precoCusto, precoVenda, estoqueTxt ? `Est: ${estoqueTxt}` : ''].filter(Boolean).join('\n');

            const rightTopHeight = rightTopLines ? doc.heightOfString(rightTopLines, { width: rightColWidth - 8 }) : 0;
            const rightPriceHeight = rightPriceLines ? doc.heightOfString(rightPriceLines, { width: rightColWidth - 8 }) : 0;
            const rightHeight = Math.max(rightTopHeight + rightPriceHeight, 18);

            const rowPadding = 12;
            const rowHeight = Math.max(leftHeight, rightHeight) + rowPadding;

            // nova página se necessário (considerar rowHeight)
            if (y + rowHeight > 760) {
                doc.addPage();
                y = 60;
            }

            // Desenhar código à esquerda (fonte menor e largura limitada) e descrição ao lado
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
            doc.text(codigoText, left, y, { width: codeWidth, align: 'left' });
            doc.font('Helvetica').fontSize(9).fillColor('#111');
            doc.text(descricao, descX, y, { width: descWidth, align: 'left' });

            // Unidade abaixo da descrição, se houver
            if (unidadeText) {
                doc.font('Helvetica').fontSize(8).fillColor('#666');
                doc.text(unidadeText, descX, y + leftDescHeight + 4, { width: descWidth });
            }

            // Bloco direito: topo (marca/grupo/subgrupo) + preços (cada um em linha própria)
            doc.font('Helvetica').fontSize(9).fillColor('#333');
            if (rightTopLines) {
                doc.text(rightTopLines, rightX, y, { width: rightColWidth - 8, align: 'left' });
            }

            if (rightPriceLines) {
                const priceStartY = y + rightTopHeight + 6;
                // desenhar preços alinhados à direita dentro o bloco
                const priceLinesArr = rightPriceLines.split('\n');
                priceLinesArr.forEach((line, idx) => {
                    const thisY = priceStartY + idx * 12;
                    doc.text(line, rightX, thisY, { width: rightColWidth - 8, align: 'right' });
                });
            }

            // linha separadora entre registros
            const sepY = y + rowHeight - 6;
            doc.moveTo(left, sepY).lineTo(left + usableWidth, sepY).stroke('#f0f0f0');

            // avançar y para próximo registro
            y = sepY + 12;
        });

        doc.end();

    } catch (error) {
        console.error('❌ Erro ao gerar PDF:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
    }
});

/**
 * POST /api/relatorios/entradas/pdf
 * Gera PDF da lista de Entradas usando o mesmo template/layout do relatório de produtos.
 * Corpo esperado: { entradas: [ { id, dataEmissao, tipoEntrada, itens: [ { produto, unidade, quantidade, custo, total, categoria } ] }, ... ], companyLogo?, companyRazao? }
 */
router.post('/entradas/pdf', async (req, res) => {
    try {
        console.log('📄 Gerando PDF de ENTRADAS (POST)');

        const entradas = Array.isArray(req.body && req.body.entradas) ? req.body.entradas : (Array.isArray(req.body) ? req.body : []);

        // Gerar seção de entradas: renderizamos um resumo por entrada (ID, Tipo, Data Emissão, Valor)
        const dataEntradas = Array.isArray(entradas) ? entradas : [];
        // ordenar por dataEmissao decrescente quando presente
        try {
            dataEntradas.sort((a, b) => {
                const da = new Date(a.dataEmissao || a.data || a.createdAt || 0).getTime() || 0;
                const db = new Date(b.dataEmissao || b.data || b.createdAt || 0).getTime() || 0;
                return db - da;
            });
        } catch (e) { /* noop */ }

        // carregar pdfkit dinamicamente
        let PDFDocument;
        try { PDFDocument = require('pdfkit'); } catch (errRequire) {
            console.error('❌ pdfkit não está instalado:', errRequire && errRequire.message);
            res.status(500).json({ error: 'Dependência ausente: pdfkit', message: 'Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.' });
            return;
        }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="relatorio_entradas.pdf"');
        doc.pipe(res);

        // Buscar empresa ativa
        const empresa = await Empresa.findOne({ where: { ativa: true }, order: [['id', 'ASC']] });

        // pegar logo do payload (base64) se foi enviada, senão usar logo da empresa, senão fallback local
        const companyLogo = req.body.companyLogo || null;
        const companyRazao = req.body.companyRazao || (empresa ? (empresa.nome || empresa.razaoSocial) : 'PET CRIA LTDA');

        let logoRendered = false;
        // permitir ajuste de largura da logo via payload (em pontos). Default menor para visual menos dominante.
        const logoWidth = (typeof req.body.companyLogoWidth === 'number' && req.body.companyLogoWidth > 0) ? req.body.companyLogoWidth : (req.body && Number(req.body.companyLogoWidth) ? Number(req.body.companyLogoWidth) : 90);
        const pageWidth = 595;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = 25;

        if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image/')) {
            try {
                const base64Data = companyLogo.split(',')[1];
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, logoX, logoY, { width: logoWidth, align: 'center' });
                logoRendered = true;
            } catch (e) { logoRendered = false; }
        }

        if (!logoRendered && empresa && empresa.logo && empresa.logo !== '') {
            try {
                const empresaLogoPath = path.join(__dirname, '../../uploads', empresa.logo);
                if (fs.existsSync(empresaLogoPath)) { doc.image(empresaLogoPath, logoX, logoY, { width: logoWidth, align: 'center' }); logoRendered = true; }
            } catch (e) { /* noop */ }
        }

        if (!logoRendered) {
            try { const logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png'); if (fs.existsSync(logoPath)) doc.image(logoPath, logoX, logoY, { width: logoWidth, align: 'center' }); } catch (e) {}
        }

        // Título específico para Entradas (mantendo o estilo visual)
        const tituloY = Math.max(110, logoY + 85);
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('OUTRAS ENTRADAS NO PERÍODO', 0, tituloY, { align: 'center', width: pageWidth });
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica');
        doc.text(companyRazao, 0, doc.y, { align: 'center', width: pageWidth });
        doc.moveDown(1.2);

        // Renderizar entradas em formato resumido por entrada (uma linha por entrada)
        const left = 40;
        const usableWidth = 595 - 2 * 40;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#222');
        let y = 180;
        doc.moveTo(left, y + 18).lineTo(left + usableWidth, y + 18).stroke('#e6e6e6');
        doc.fontSize(9).font('Helvetica');
        y = y + 26;

        const rightColWidth = 160;
        const codeWidth = 40;
        const descX = left + codeWidth + 8;
        const descWidth = usableWidth - rightColWidth - codeWidth - 16;
        const rightX = left + usableWidth - rightColWidth;

        // Interpretar datas de forma a evitar deslocamento de timezone
        // - Strings no formato YYYY-MM-DD serão tratadas como datas LOCAIS (sem shift UTC)
        // - Strings em outros formatos (com 'T' ou timezone) serão deixadas para Date() padrão
        const parseToLocalDate = (v) => {
            if (!v && v !== 0) return null;
            try {
                if (v instanceof Date) return v;
                if (typeof v === 'number' || /^[0-9]+$/.test(String(v))) return new Date(Number(v));
                const s = String(v).trim();
                // YYYY-MM-DD (sem hora) -> criar Date local (evita shift UTC)
                const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (ymd) {
                    const year = Number(ymd[1]);
                    const month = Number(ymd[2]) - 1;
                    const day = Number(ymd[3]);
                    return new Date(year, month, day);
                }
                // dd/mm/yyyy -> criar Date local
                const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                if (br) {
                    const day = Number(br[1]);
                    const month = Number(br[2]) - 1;
                    const year = Number(br[3]);
                    return new Date(year, month, day);
                }
                // fallback: permitir Date parse (inclui ISO com T e timezone)
                return new Date(s);
            } catch (e) { return null; }
        };

        const formatDate = (v) => {
            try {
                if (!v) return '';
                const d = parseToLocalDate(v);
                if (!d || isNaN(d.getTime())) return String(v);
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            } catch (e) { return String(v || ''); }
        };

        dataEntradas.forEach((ent) => {
            try {
                const entId = ent.id || ent.ID || ent._id || '';
                const tipo = (ent.tipoEntrada || ent.tipo || ent.descricao || ent.tipoDescricao || '').toString();
                const dataEmissao = ent.dataEmissao || ent.data || ent.createdAt || '';
                const valorNum = Number(ent.valor || ent.total || ent.valorTotal || ent.valor_pago || 0) || 0;
                const valorText = valorNum ? `R$ ${valorNum.toFixed(2).replace('.', ',')}` : '';

                const descricao = tipo;
                const leftDescHeight = doc.heightOfString(descricao, { width: descWidth });
                const dateLine = formatDate(dataEmissao);
                const dateHeight = dateLine ? doc.heightOfString(dateLine, { width: descWidth }) : 0;
                const leftHeight = Math.max(leftDescHeight + dateHeight, 18);

                const rightLinesHeight = valorText ? doc.heightOfString(valorText, { width: rightColWidth - 8 }) : 0;
                const rowPadding = 12;
                const rowHeight = Math.max(leftHeight, rightLinesHeight) + rowPadding;

                if (y + rowHeight > 760) { doc.addPage(); y = 60; }

                doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
                doc.text(String(entId), left, y, { width: codeWidth, align: 'left' });

                doc.font('Helvetica').fontSize(9).fillColor('#111');
                doc.text(descricao, descX, y, { width: descWidth, align: 'left' });
                if (dateLine) {
                    doc.font('Helvetica').fontSize(8).fillColor('#666');
                    doc.text(dateLine, descX, y + leftDescHeight + 4, { width: descWidth, align: 'left' });
                }

                if (valorText) {
                    doc.font('Helvetica').fontSize(9).fillColor('#333');
                    doc.text(valorText, rightX, y, { width: rightColWidth - 8, align: 'right' });
                }

                const sepY = y + rowHeight - 6;
                doc.moveTo(left, sepY).lineTo(left + usableWidth, sepY).stroke('#f0f0f0');
                y = sepY + 12;
            } catch (itemErr) {
                console.warn('⚠️ Erro ao renderizar entrada:', ent && (ent.id || ent.ID), itemErr && itemErr.message);
            }
        });

        doc.end();

    } catch (error) {
        console.error('❌ Erro ao gerar PDF de entradas:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
    }
});

/**
 * POST /api/relatorios/produtos/pdf
 * Gera PDF a partir da lista de produtos enviada no corpo da requisição.
 * Corpo esperado: { produtos: [ { codigo, descricao, unidade, marca, grupo, subgrupo, preco_custo, preco_venda, estoque_minimo, local }, ... ] }
 */
router.post('/produtos/pdf', async (req, res) => {
    try {
        console.log('📄 Gerando PDF de produtos (POST)');

        const produtos = Array.isArray(req.body && req.body.produtos) ? req.body.produtos : (
            Array.isArray(req.body) ? req.body : null
        );

        // fallback para data de exemplo quando nada for enviado
        const produtosFallback = [
            { codigo: '001', descricao: 'Ração Premium Adulto', unidade: 'UN', marca: 'Golden', grupo: 'Rações', subgrupo: 'Adulto', preco_custo: 40.04, preco_venda: 131.00, estoque_minimo: 0, local: 'Loja' },
            { codigo: '002', descricao: 'BUTOX P CE 25 - 20ML', unidade: 'UN', marca: 'Credeli', grupo: 'Farmácia', subgrupo: 'Medicamentos', preco_custo: 4.31, preco_venda: 7.00, estoque_minimo: 0, local: 'Loja' },
            { codigo: '003', descricao: 'Banho e Tosa - Cães Pequeno Porte', unidade: 'UN', marca: '', grupo: 'Serviços', subgrupo: 'Banho/Tosa', preco_custo: 0.00, preco_venda: 50.00, estoque_minimo: 0, local: 'Loja' }
        ];

        const dataProdutos = produtos && produtos.length ? produtos : produtosFallback;

        // Garantir ordenação alfabética por descrição no servidor (pt-BR)
        try {
            dataProdutos.sort((a, b) => {
                const aDesc = (a && (a.descricao || a.nome || a.produto)) ? String(a.descricao || a.nome || a.produto) : '';
                const bDesc = (b && (b.descricao || b.nome || b.produto)) ? String(b.descricao || b.nome || b.produto) : '';
                return aDesc.localeCompare(bDesc, 'pt-BR', { sensitivity: 'base' });
            });
        } catch (e) {
            // se algo der errado na ordenação, não interrompemos a geração do PDF
            console.warn('⚠️ Não foi possível ordenar dataProdutos no servidor:', e && e.message);
        }

        // carregar pdfkit dinamicamente (se não estiver instalado, retornar erro claro)
        let PDFDocument;
        try {
            PDFDocument = require('pdfkit');
        } catch (errRequire) {
            console.error('❌ pdfkit não está instalado:', errRequire && errRequire.message);
            res.status(500).json({ error: 'Dependência ausente: pdfkit', message: 'Execute `npm install pdfkit` na raiz do projeto e reinicie o servidor.' });
            return;
        }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="relatorio_produtos.pdf"');
        doc.pipe(res);

        // Buscar empresa ativa do banco de dados
        const empresa = await Empresa.findOne({
            where: { ativa: true },
            order: [['id', 'ASC']]
        });

        // usar logo e razão social do payload se disponíveis, senão usar da empresa
        const companyLogo = req.body.companyLogo || null;
        const companyRazao = req.body.companyRazao || (empresa ? (empresa.nome || empresa.razaoSocial) : 'PET CRIA LTDA');

        // tentar usar logo do payload (base64 dataURL) ou fallback para arquivo local
        let logoRendered = false;
        // permitir ajuste de largura da logo via payload (em pontos). Default menor para visual menos dominante.
        const logoWidth = (typeof req.body.companyLogoWidth === 'number' && req.body.companyLogoWidth > 0) ? req.body.companyLogoWidth : (req.body && Number(req.body.companyLogoWidth) ? Number(req.body.companyLogoWidth) : 90);
        const pageWidth = 595; // largura A4
        const logoX = (pageWidth - logoWidth) / 2; // centralizar horizontalmente
        const logoY = 25; // posição Y fixa no topo
        
        if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image/')) {
            try {
                const base64Data = companyLogo.split(',')[1];
                if (!base64Data) throw new Error('Base64 data inválida');
                
                // verificar tamanho aproximado (evitar imagens muito grandes que causam crash)
                const estimatedSize = (base64Data.length * 3) / 4; // tamanho em bytes
                if (estimatedSize > 5 * 1024 * 1024) { // limite de 5MB
                    console.warn('⚠️ Logo muito grande, usando fallback local');
                    throw new Error('Logo excede 5MB');
                }
                
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, logoX, logoY, { width: logoWidth, align: 'center' });
                logoRendered = true;
            } catch (logoErr) {
                console.warn('⚠️ Erro ao incluir logo do payload:', logoErr.message);
                logoRendered = false;
            }
        }
        
        // tentar logo da empresa se não renderizou a do payload
        if (!logoRendered && empresa && empresa.logo && empresa.logo !== '') {
            try {
                const empresaLogoPath = path.join(__dirname, '../../uploads', empresa.logo);
                if (fs.existsSync(empresaLogoPath)) {
                    doc.image(empresaLogoPath, logoX, logoY, { width: logoWidth, align: 'center' });
                    logoRendered = true;
                    console.log('✅ Usando logo da empresa:', empresa.logo);
                }
            } catch (logoErr) {
                console.warn('⚠️ Erro ao incluir logo da empresa:', logoErr.message);
                logoRendered = false;
            }
        }
        
        // fallback: tentar logo local padrão se ainda não renderizou
        if (!logoRendered) {
            try {
                const logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png');
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, logoX, logoY, { width: logoWidth, align: 'center' });
                }
            } catch (localLogoErr) {
                console.warn('⚠️ Erro ao incluir logo local:', localLogoErr.message);
            }
        }

        // Título centralizado com espaço seguro abaixo da logo (mínimo 110px do topo)
        const tituloY = Math.max(110, logoY + 85); // garante espaço mínimo maior entre logo e título
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('RELATÓRIO DE PRODUTO', 0, tituloY, { align: 'center', width: pageWidth });
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica');
        doc.text(companyRazao, 0, doc.y, { align: 'center', width: pageWidth });
        doc.moveDown(1.2);

        // Se o frontend solicitou modo resumido, gerar layout enxuto: apenas Nome e Preço
        if (req.body && req.body.mode === 'resumido') {
            const left = 40;
            const usableWidth = 595 - 2 * 40;
            let y = 120 + 26;
            const priceWidth = 100; // reserva para o preço à direita

            doc.fontSize(9).font('Helvetica');

            dataProdutos.forEach((p) => {
                const descricao = (p.descricao || p.produto || p.nome || '');
                const precoVal = (p.preco_venda !== undefined && p.preco_venda !== null) ? Number(p.preco_venda) : (
                    (p.preco !== undefined && p.preco !== null) ? Number(p.preco) : null
                );
                const precoText = (precoVal !== null) ? `R$ ${precoVal.toFixed(2).replace('.', ',')}` : '';

                // altura estimada
                const descHeight = doc.heightOfString(descricao, { width: usableWidth - priceWidth - 8 });
                const rowHeight = Math.max(descHeight, 12) + 12;

                if (y + rowHeight > 760) {
                    doc.addPage();
                    y = 60;
                }

                doc.font('Helvetica').fontSize(9).fillColor('#111');
                doc.text(descricao, left, y, { width: usableWidth - priceWidth - 8, align: 'left' });
                if (precoText) {
                    doc.text(precoText, left + usableWidth - priceWidth, y, { width: priceWidth - 8, align: 'right' });
                }

                const sepY = y + rowHeight - 6;
                doc.moveTo(left, sepY).lineTo(left + usableWidth, sepY).stroke('#f0f0f0');
                y = sepY + 12;
            });

            doc.end();
            return;
        }

        const left = 40;
        const usableWidth = 595 - 2 * 40;
        const rightColWidth = 170;
        const codeWidth = 40;
        const descX = left + codeWidth + 8;
        const descWidth = usableWidth - rightColWidth - codeWidth - 16;
        const rightX = left + usableWidth - rightColWidth;

        doc.fontSize(9).font('Helvetica');
        let y = 120 + 26;

        dataProdutos.forEach((p) => {
            const codigoText = p.codigo || (p.id ? String(p.id) : '');
            const descricao = (p.descricao || p.produto || p.nome || '');
            // O campo unidade já vem formatado do frontend com preços incluídos
            const unidadeText = p.unidade ? String(p.unidade) : (p.unidade_medida ? String(p.unidade_medida) : '');

            const marcaText = p.marca ? String(p.marca) : '';
            const grupoText = p.grupo || p.categoria ? String(p.grupo || p.categoria) : '';
            const subgrupoText = p.subgrupo ? String(p.subgrupo) : '';

            // Como os preços já estão no campo unidade, não precisamos formatar aqui para modo detalhado
            // Mas mantemos para outros campos se necessário
            const precoCusto = '';  // já incluído em unidade
            const precoVenda = '';  // já incluído em unidade
            const estoqueTxt = (p.estoque_minimo !== undefined && p.estoque_minimo !== null) ? String(p.estoque_minimo) : '';

            try {
                const leftDescHeight = doc.heightOfString(descricao, { width: descWidth });
                const leftUnitHeight = unidadeText ? doc.heightOfString(unidadeText, { width: descWidth }) : 0;
                const leftHeight = Math.max(leftDescHeight + leftUnitHeight + 6, 18);

                const rightTopLines = [marcaText, grupoText, subgrupoText].filter(Boolean).join('\n');
                const rightPriceLines = [estoqueTxt ? `Estoque Mín: ${estoqueTxt}` : ''].filter(Boolean).join('\n');

                const rightTopHeight = rightTopLines ? doc.heightOfString(rightTopLines, { width: rightColWidth - 8 }) : 0;
                const rightPriceHeight = rightPriceLines ? doc.heightOfString(rightPriceLines, { width: rightColWidth - 8 }) : 0;
                const rightHeight = Math.max(rightTopHeight + rightPriceHeight, 18);

                const rowPadding = 12;
                const rowHeight = Math.max(leftHeight, rightHeight) + rowPadding;

                if (y + rowHeight > 760) {
                    doc.addPage();
                    y = 60;
                }

                doc.font('Helvetica-Bold').fontSize(8).fillColor('#000');
                doc.text(codigoText, left, y, { width: codeWidth, align: 'left' });
                doc.font('Helvetica').fontSize(9).fillColor('#111');
                doc.text(descricao, descX, y, { width: descWidth, align: 'left' });

                if (unidadeText) {
                    doc.font('Helvetica').fontSize(8).fillColor('#666');
                    doc.text(unidadeText, descX, y + leftDescHeight + 4, { width: descWidth });
                }

                doc.font('Helvetica').fontSize(9).fillColor('#333');
                if (rightTopLines) {
                    doc.text(rightTopLines, rightX, y, { width: rightColWidth - 8, align: 'left' });
                }

                if (rightPriceLines) {
                    const priceStartY = y + rightTopHeight + 6;
                    const priceLinesArr = rightPriceLines.split('\n');
                    priceLinesArr.forEach((line, idx) => {
                        const thisY = priceStartY + idx * 12;
                        doc.text(line, rightX, thisY, { width: rightColWidth - 8, align: 'right' });
                    });
                }

                const sepY = y + rowHeight - 6;
                doc.moveTo(left, sepY).lineTo(left + usableWidth, sepY).stroke('#f0f0f0');
                y = sepY + 12;
            } catch (itemErr) {
                console.warn('⚠️ Erro ao renderizar produto:', p.codigo || p.id, itemErr.message);
                // pular este item e continuar
            }
        });

        doc.end();

    } catch (error) {
        console.error('❌ Erro ao gerar PDF (POST):', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
    }
});

/**
 * POST /api/relatorios/fornecedores/pdf
 * Gera PDF com a lista de fornecedores (modo 'resumido' ou 'detalhado')
 */
router.post('/fornecedores/pdf', async (req, res) => {
    try {
        console.log('📄 Gerando PDF de fornecedores');
        console.log('📥 payload recebido:', JSON.stringify(req.body, null, 2));

        // tentar carregar modelo Fornecedor e Sequelize Op
        let Fornecedor, Op;
        try {
            ({ Fornecedor } = require('../models'));
            ({ Op } = require('sequelize'));
            console.log('✅ Modelo Fornecedor carregado');
        } catch (err) {
            console.error('❌ Erro ao carregar modelo Fornecedor:', err && err.message);
            return res.status(500).json({ error: 'Modelo Fornecedor não disponível' });
        }

        const filtros = req.body && req.body.filtros ? req.body.filtros : {};
        const mode = (req.body && req.body.tipo) ? req.body.tipo : (req.body && req.body.mode) ? req.body.mode : 'resumido';

        let fornecedoresList = [];

        if (Fornecedor && typeof Fornecedor.findAll === 'function') {
            const where = {};
            
            // Processar filtro ativo (aceita 'todos', 'sim', 'nao', true, false, 1, 0)
            if (filtros.ativo !== undefined && filtros.ativo !== null && filtros.ativo !== 'todos') {
                if (filtros.ativo === 'sim' || filtros.ativo === true || filtros.ativo === 1 || filtros.ativo === '1' || filtros.ativo === 'true') {
                    where.ativo = true;
                } else if (filtros.ativo === 'nao' || filtros.ativo === false || filtros.ativo === 0 || filtros.ativo === '0' || filtros.ativo === 'false') {
                    where.ativo = false;
                }
            }
            
            // Processar filtro de pesquisa (busca por nome, razaoSocial ou codigo)
            if (filtros.pesquisa && filtros.pesquisa.trim() && Op) {
                where[Op.or] = [
                    { nome: { [Op.like]: `%${filtros.pesquisa.trim()}%` } },
                    { razaoSocial: { [Op.like]: `%${filtros.pesquisa.trim()}%` } },
                    { codigo: { [Op.like]: `%${filtros.pesquisa.trim()}%` } }
                ];
            }
            
            console.log('🔎 Query where:', JSON.stringify(where, null, 2));
            
            try {
                fornecedoresList = await Fornecedor.findAll({ 
                    where, 
                    attributes: [
                        'id','codigo','nome','cnpj','cpf','razaoSocial','telefone','ativo',
                        'email','cidade','bairro','endereco','cep','proximidade',
                        'inscEstadual','createdAt'
                    ],
                    raw: true,
                    order: [['nome','ASC']] 
                });
                console.log(`✅ Fornecedor.findAll retornou ${fornecedoresList.length} registros`);
                if (fornecedoresList.length > 0) {
                    console.log('📦 Registros encontrados:', fornecedoresList.map(f => ({ id: f.id, nome: f.nome, codigo: f.codigo })));
                } else {
                    console.warn('⚠️ Nenhum fornecedor encontrado no banco de dados!');
                }
            } catch (dbErr) {
                console.error('❌ Erro na query Fornecedor.findAll:', dbErr);
                return res.status(500).json({ error: 'Erro ao buscar fornecedores', details: dbErr.message });
            }
        } else {
            console.error('❌ Modelo Fornecedor não disponível ou findAll não é função');
            return res.status(500).json({ error: 'Modelo Fornecedor não disponível' });
        }

        console.log(`📊 Total de fornecedores para o PDF: ${fornecedoresList.length}`);

        let PDFDocument;
        try {
            PDFDocument = require('pdfkit');
        } catch (errRequire) {
            console.error('❌ pdfkit não está instalado:', errRequire && errRequire.message);
            res.status(500).json({ error: 'Dependência ausente: pdfkit' });
            return;
        }

        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="relatorio_fornecedores.pdf"');
        doc.pipe(res);

        // Buscar empresa ativa para logo e razão social
        let empresa = null;
        try {
            empresa = await Empresa.findOne({ where: { ativa: true }, order: [['id', 'ASC']] });
        } catch (e) {
            console.warn('⚠️ Erro ao buscar empresa ativa:', e && e.message);
        }

        // Cabeçalho semelhante à imagem: logo à esquerda/centralizado e título + razão social no centro
        const pageWidth = 595;
        const logoWidth = 80;
        const logoX = 50; // deixar margem esquerda para a logo
        const logoY = 25;

        // tentar usar logo da empresa (upload), senão fallback para frontend/logo
        let renderedLogo = false;
        try {
            if (empresa && empresa.logo) {
                const empresaLogoPath = path.join(__dirname, '../../uploads', empresa.logo);
                if (fs.existsSync(empresaLogoPath)) {
                    doc.image(empresaLogoPath, logoX, logoY, { width: logoWidth });
                    renderedLogo = true;
                }
            }
        } catch (errLogo) {
            console.warn('⚠️ Falha ao tentar renderizar logo da empresa:', errLogo && errLogo.message);
        }

        if (!renderedLogo) {
            try {
                const defaultLogo = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png');
                if (fs.existsSync(defaultLogo)) doc.image(defaultLogo, logoX, logoY, { width: logoWidth });
            } catch (e) { /* ignore */ }
        }

        // Título centralizado
        const tituloY = 40;
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text('RELATÓRIO DE FORNECEDOR', 0, tituloY, { align: 'center', width: pageWidth });
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica');
        const razao = (empresa && (empresa.nome || empresa.razaoSocial)) ? (empresa.nome || empresa.razaoSocial) : 'PET CRIA LTDA';
        doc.text(razao, 0, doc.y, { align: 'center', width: pageWidth });
        doc.moveDown(0.8);
        // Cabeçalho da tabela (Código | Nome | Telefone | CNPJ/CPF)
        const left = 40;
        const usableWidth = pageWidth - left - 40;
        // ajustar larguras: priorizar espaço para CNPJ/CPF para evitar quebra
        const colCodigo = 50;
        const colTelefone = 110; // reduzir um pouco
        const colCnpj = 150; // aumentar espaço para CNPJ/CPF
        const colNome = usableWidth - (colCodigo + colTelefone + colCnpj);

        let y = doc.y + 6;

        // Se for modo 'detalhado', renderizar layout completo por fornecedor e terminar
        if (mode && String(mode).toLowerCase() === 'detalhado') {
            console.log('📄 Modo DETALHADO: renderizando informações completas por fornecedor');
            // larguras para colunas detalhadas
            const leftCol = left;
            const leftColWidth = Math.floor(usableWidth * 0.55);
            const rightCol = left + leftColWidth + 10;
            const rightColWidth = usableWidth - leftColWidth - 10;

            doc.moveDown(0.2);
            let yy = doc.y + 4;
            fornecedoresList.forEach((f, idx) => {
                if (yy + 120 > 760) {
                    doc.addPage();
                    yy = 60;
                }

                // linha separadora superior
                doc.lineWidth(0.5).strokeColor('#bbbbbb');
                doc.moveTo(leftCol, yy).lineTo(leftCol + usableWidth, yy).stroke();
                yy += 8;

                const clienteText = `Cliente: ${f.id ? f.id + ' - ' : ''}${f.nome || f.razaoSocial || ''}`;
                const cnpjText = `CNPJ: ${f.cnpj || ''}`;
                const telefone1 = `Telefone 1: ${f.telefone || ''}`;
                const email = `E-mail: ${f.email || ''}`;
                const proximidade = `Proximidade: ${f.proximidade || ''}`;

                const ieRg = `IE/RG: ${f.inscEstadual || ''}`;
                const telefone2 = `Telefone 2: `; // Campo não existe no banco, deixar vazio
                const cidade = `Cidade: ${f.cidade || ''}`;
                const bairro = `Bairro: ${f.bairro || ''}`;
                const endereco = `Endereço: ${f.endereco || ''}`;
                const cep = `Cep: ${f.cep || ''}`;
                const dt = `Dt: ${f.createdAt ? new Date(f.createdAt).toLocaleDateString('pt-BR') : ''}`;

                doc.fontSize(9).font('Helvetica');
                // esquerda (bloco)
                doc.text(clienteText, leftCol, yy, { width: leftColWidth, align: 'left' });
                doc.text(cnpjText, leftCol, yy + 14, { width: leftColWidth, align: 'left' });
                doc.text(telefone1, leftCol, yy + 28, { width: leftColWidth, align: 'left' });
                doc.text(email, leftCol, yy + 42, { width: leftColWidth, align: 'left' });
                doc.text(proximidade, leftCol, yy + 56, { width: leftColWidth, align: 'left' });

                // direita (bloco)
                doc.text(ieRg, rightCol, yy, { width: rightColWidth, align: 'left' });
                doc.text(telefone2, rightCol, yy + 14, { width: rightColWidth, align: 'left' });
                doc.text(cidade, rightCol, yy + 28, { width: rightColWidth, align: 'left' });
                doc.text(bairro, rightCol, yy + 42, { width: rightColWidth, align: 'left' });
                doc.text(endereco, rightCol, yy + 56, { width: rightColWidth - 60, align: 'left' });
                doc.text(cep, rightCol + rightColWidth - 60, yy + 56, { width: 60, align: 'right' });
                doc.text(dt, rightCol + rightColWidth - 60, yy + 42, { width: 60, align: 'right' });

                // texto final direito (ex: Sem limite)
                doc.fontSize(9).font('Helvetica');
                doc.text('Sem limite', rightCol + rightColWidth - 60, yy + 28, { width: 60, align: 'right' });

                yy += 84;
            });

            // desenhar rodapé final na última página (já tem hook pageAdded)
            doc.end();
            return;
        }
        // --- MODO RESUMIDO: Layout simples com tabela ---
        console.log(`📝 Renderizando (resumido) ${fornecedoresList.length} fornecedores no PDF...`);

        // Cabeçalho da tabela
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Código', left, y, { width: colCodigo, align: 'left' });
        doc.text('Nome', left + colCodigo, y, { width: colNome, align: 'left' });
        doc.text('Telefone', left + colCodigo + colNome, y, { width: colTelefone, align: 'left' });
        doc.text('CNPJ / CPF', left + colCodigo + colNome + colTelefone, y, { width: colCnpj, align: 'left' });

        y += 16;
        doc.moveTo(left, y).lineTo(left + usableWidth, y).stroke('#000');
        y += 8;

        doc.font('Helvetica').fontSize(9).fillColor('#111');

        // Renderizar fornecedores linha por linha (layout simples e espaçamento fixo)
        fornecedoresList.forEach((f, index) => {
            const codigo = f.codigo || (f.id ? String(f.id) : '');
            const nome = f.nome || f.razaoSocial || '';
            const telefone = f.telefone || '';
            const cnpjcpf = f.cnpj || f.cpf || '';

            if (y > 750) {
                doc.addPage();
                y = 60;
            }

            doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
            doc.text(codigo, left, y, { width: colCodigo, align: 'left' });

            doc.font('Helvetica').fontSize(9).fillColor('#111');
            doc.text(nome, left + colCodigo, y, { width: colNome, align: 'left' });

            doc.fontSize(8).fillColor('#333');
            doc.text(telefone, left + colCodigo + colNome, y, { width: colTelefone, align: 'left' });
            doc.text(cnpjcpf, left + colCodigo + colNome + colTelefone, y, { width: colCnpj, align: 'left' });

            y += 18; // espaçamento fixo entre linhas
        });

        // Quantidade no rodapé
        const quantidade = fornecedoresList.length || 0;
        doc.fontSize(10).font('Helvetica');
        doc.text('Quantidade:', left + usableWidth - 160, Math.max(y + 10, 560), { width: 120, align: 'right' });
        doc.text(String(quantidade), left + usableWidth - 30, Math.max(y + 10, 560), { width: 30, align: 'right' });

        doc.end();

    } catch (error) {
        console.error('❌ Erro ao gerar PDF de fornecedores:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF de fornecedores', message: error.message });
    }
});

/**
 * POST /api/relatorios/demonstrativo-resultados/pdf
 * Gera PDF do relatório demonstrativo de resultados
 */
router.post('/demonstrativo-resultados/pdf', async (req, res) => {
    try {
        console.log('📊 Gerando PDF Demonstrativo de Resultados');
        const { dataInicio, dataFim, apuracaoCusto, detalharGrupo, detalharCentro, considerarCusto, companyLogo, companyRazao } = req.body;

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="demonstrativo_resultados.pdf"');
        doc.pipe(res);

        // LOGO DA EMPRESA (mesmo estilo do relatório de produtos)
        const companyRazaoFinal = companyRazao || 'SUA EMPRESA';
        let logoRendered = false;
        const logoWidth = 120;
        const pageWidth = 595;
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = 25;

        if (companyLogo && typeof companyLogo === 'string' && companyLogo.startsWith('data:image/')) {
            try {
                const base64Data = companyLogo.split(',')[1];
                if (!base64Data) throw new Error('Base64 data inválida');
                const estimatedSize = (base64Data.length * 3) / 4;
                if (estimatedSize > 5 * 1024 * 1024) throw new Error('Logo excede 5MB');
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.image(imgBuffer, logoX, logoY, { width: logoWidth, align: 'center' });
                logoRendered = true;
            } catch (logoErr) {
                console.warn('⚠️ Erro ao incluir logo:', logoErr.message);
            }
        }

        if (!logoRendered) {
            try {
                const logoPath = path.join(__dirname, '../../frontend/logos/logo_pet_cria-removebg-preview.png');
                if (fs.existsSync(logoPath)) {
                    doc.image(logoPath, logoX, logoY, { width: logoWidth, align: 'center' });
                }
            } catch (err) { /* ignore */ }
        }

        // CABEÇALHO (posicionar abaixo da logo)
        const tituloY = Math.max(110, logoY + 85);
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#000');
        doc.text('RELATÓRIO DEMONSTRATIVO DE RESULTADOS', 0, tituloY, { align: 'center', width: pageWidth });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').fillColor('#666');
        doc.text(companyRazaoFinal, 0, doc.y, { align: 'center', width: pageWidth });
        doc.moveDown(0.3);
        doc.text(`Período: ${dataInicio} até ${dataFim}`, { align: 'center' });
        doc.moveDown(0.3);
        
        if (apuracaoCusto) {
            const apuracaoTexto = {
                'cadastro': 'Custo do Cadastro',
                'compra': 'Custo de Compra',
                'medio': 'Custo Médio'
            };
            doc.text(`Apuração: ${apuracaoTexto[apuracaoCusto] || apuracaoCusto}`, { align: 'center' });
        }
        
        doc.moveDown(1);
        doc.strokeColor('#ddd').lineWidth(1);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(1);

        // DADOS DE EXEMPLO (substituir por dados reais do banco)
        const dadosReceita = [
            { descricao: 'Receita Bruta de Serviços', valor: 45000.00 },
            { descricao: 'Receita Bruta de Produtos', valor: 15000.00 },
            { descricao: 'TOTAL RECEITA BRUTA', valor: 60000.00, destaque: true }
        ];

        const dadosDeducoes = [
            { descricao: 'Impostos sobre Vendas', valor: -6000.00 },
            { descricao: 'Descontos Concedidos', valor: -1500.00 },
            { descricao: 'TOTAL DEDUÇÕES', valor: -7500.00, destaque: true }
        ];

        const dadosCustos = [
            { descricao: 'Custo de Produtos Vendidos', valor: -8000.00 },
            { descricao: 'Custo de Serviços Prestados', valor: -12000.00 },
            { descricao: 'TOTAL CUSTOS', valor: -20000.00, destaque: true }
        ];

        const dadosDespesas = [
            { descricao: 'Despesas Administrativas', valor: -5000.00 },
            { descricao: 'Despesas com Pessoal', valor: -15000.00 },
            { descricao: 'Despesas Operacionais', valor: -3000.00 },
            { descricao: 'TOTAL DESPESAS', valor: -23000.00, destaque: true }
        ];

        function renderizarSecao(titulo, dados) {
            doc.fontSize(12).font('Helvetica-Bold').fillColor('#000');
            doc.text(titulo, 40, doc.y);
            doc.moveDown(0.5);

            dados.forEach(item => {
                const y = doc.y;
                
                if (item.destaque) {
                    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000');
                } else {
                    doc.fontSize(9).font('Helvetica').fillColor('#333');
                }

                doc.text(item.descricao, 60, y, { width: 350, align: 'left' });
                
                const valorFormatado = item.valor.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                });
                
                doc.text(valorFormatado, 420, y, { width: 100, align: 'right' });
                doc.moveDown(0.3);
            });

            doc.moveDown(0.5);
        }

        // Renderizar todas as seções
        renderizarSecao('RECEITAS', dadosReceita);
        renderizarSecao('DEDUÇÕES', dadosDeducoes);
        
        // RECEITA LÍQUIDA
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000');
        const receitaLiquida = 60000.00 - 7500.00;
        doc.text('RECEITA LÍQUIDA', 60, doc.y, { width: 350, align: 'left' });
        doc.text(receitaLiquida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 420, doc.y, { width: 100, align: 'right' });
        doc.moveDown(1);

        renderizarSecao('CUSTOS', dadosCustos);
        
        // LUCRO BRUTO
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000');
        const lucroBruto = receitaLiquida - 20000.00;
        doc.text('LUCRO BRUTO', 60, doc.y, { width: 350, align: 'left' });
        doc.text(lucroBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 420, doc.y, { width: 100, align: 'right' });
        doc.moveDown(1);

        renderizarSecao('DESPESAS OPERACIONAIS', dadosDespesas);

        // RESULTADO OPERACIONAL (LUCRO LÍQUIDO)
        doc.strokeColor('#000').lineWidth(2);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown(0.5);
        
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#000');
        const resultadoOperacional = lucroBruto - 23000.00;
        const corResultado = resultadoOperacional >= 0 ? '#006400' : '#8B0000';
        
        doc.text('RESULTADO OPERACIONAL (LUCRO LÍQUIDO)', 60, doc.y, { width: 350, align: 'left' });
        doc.fillColor(corResultado);
        doc.text(resultadoOperacional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 420, doc.y, { width: 100, align: 'right' });

        // Rodapé com informações adicionais
        doc.moveDown(2);
        doc.fontSize(8).font('Helvetica').fillColor('#999');
        doc.text(`Relatório gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
        
        if (considerarCusto) {
            doc.text('* Custos do cadastro no serviço prestado foram considerados', { align: 'center' });
        }

        doc.end();

    } catch (error) {
        console.error('❌ Erro ao gerar PDF Demonstrativo:', error);
        res.status(500).json({ error: 'Erro ao gerar PDF', message: error.message });
    }
});

