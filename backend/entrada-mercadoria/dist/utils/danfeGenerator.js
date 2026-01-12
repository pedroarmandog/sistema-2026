const PDFDocument = require('pdfkit');

async function generateDanfeBuffer(notaData) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];
      doc.on('data', (d) => buffers.push(d));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      doc.fontSize(16).text('DANFE (Simplificado)', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Fornecedor: ${notaData.fornecedorNome || (notaData.fornecedor && notaData.fornecedor.nome) || '-'}`);
      doc.text(`Número: ${notaData.numero || '-'}`);
      doc.text(`Chave: ${notaData.chave || '-'}`);
      doc.text(`Emissão: ${notaData.dataEmissao || '-'}`);
      doc.text(`Valor total: ${notaData.valorTotal ?? '-'}`);
      doc.moveDown();
      doc.text('Itens:');
      doc.moveDown(0.5);
      const itens = notaData.itens || (notaData.parsedData && notaData.parsedData.itens) || [];
      itens.forEach((it, idx) => {
        doc.text(`${idx + 1}. ${it.descricao || it.xProd || '-'} — qtd: ${it.quantidade ?? '-'} — valor: ${it.valorTotal ?? it.vProd ?? '-'}`);
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateDanfeBuffer };
