const mysql = require('mysql2/promise');

async function adicionarColunaTipo() {
    const conn = await mysql.createConnection({
        host: '72.60.244.46',
        user: 'root',
        password: 'PetHub@123',
        database: 'petshop'
    });

    try {
        console.log('🔄 Verificando se coluna tipo já existe...');
        
        // Verificar se a coluna já existe
        const [columns] = await conn.execute(
            "SHOW COLUMNS FROM perfis_comissao LIKE 'tipo'"
        );
        
        if (columns.length > 0) {
            console.log('ℹ️  Coluna tipo já existe');
        } else {
            // Adicionar coluna tipo
            await conn.execute(
                `ALTER TABLE perfis_comissao 
                 ADD COLUMN tipo ENUM('produto', 'vendedor') DEFAULT 'vendedor' AFTER percentual`
            );
            console.log('✅ Coluna tipo adicionada com sucesso');
        }
        
        // Listar perfis atualizados
        const [rows] = await conn.execute('SELECT id, perfilVendedor, tipo FROM perfis_comissao ORDER BY id');
        console.log('\n📊 Perfis atualizados:');
        rows.forEach(r => {
            console.log(`  ID ${r.id}: ${r.perfilVendedor} (tipo: ${r.tipo || 'vendedor'})`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await conn.end();
    }
}

adicionarColunaTipo();
