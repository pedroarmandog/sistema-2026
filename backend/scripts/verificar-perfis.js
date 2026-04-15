const mysql = require('mysql2/promise');

async function verificarPerfis() {
    const conn = await mysql.createConnection({
        host: '72.60.244.46',
        user: 'root',
        password: 'PetHub@123',
        database: 'petshop'
    });

    try {
        const [rows] = await conn.execute('SELECT * FROM perfis_comissao ORDER BY id DESC');
        console.log('📊 Total de perfis no banco:', rows.length);
        console.log('\n📋 Lista de perfis:');
        rows.forEach(r => {
            console.log(`  ID ${r.id}: ${r.perfilVendedor} (${r.descricao})`);
        });
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await conn.end();
    }
}

verificarPerfis();
