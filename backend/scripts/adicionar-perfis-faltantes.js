const mysql = require('mysql2/promise');

async function adicionarPerfisFaltantes() {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'pethub',
        password: 'PetHub@123',
        database: 'petshop'
    });

    try {
        console.log('🔍 Verificando perfis existentes...');
        
        // Verificar se ASSINATURA existe
        const [assinatura] = await conn.execute(
            'SELECT * FROM perfis_comissao WHERE perfilVendedor = ?',
            ['ASSINATURA']
        );
        
        if (assinatura.length === 0) {
            await conn.execute(
                'INSERT INTO perfis_comissao (perfilVendedor, descricao, percentual, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
                ['ASSINATURA', 'Perfil de comissão para assinaturas', 0.00]
            );
            console.log('✅ Perfil ASSINATURA inserido');
        } else {
            console.log('ℹ️  Perfil ASSINATURA já existe');
        }
        
        // Verificar se teste existe
        const [teste] = await conn.execute(
            'SELECT * FROM perfis_comissao WHERE perfilVendedor = ?',
            ['teste']
        );
        
        if (teste.length === 0) {
            await conn.execute(
                'INSERT INTO perfis_comissao (perfilVendedor, descricao, percentual, createdAt, updatedAt) VALUES (?, ?, ?, NOW(), NOW())',
                ['teste', 'Perfil de teste', 0.00]
            );
            console.log('✅ Perfil teste inserido');
        } else {
            console.log('ℹ️  Perfil teste já existe');
        }
        
        // Listar todos os perfis
        const [rows] = await conn.execute('SELECT * FROM perfis_comissao ORDER BY perfilVendedor ASC');
        console.log('\n📊 Total de perfis:', rows.length);
        rows.forEach(r => {
            console.log(`  - ${r.perfilVendedor} (ID: ${r.id}, Percentual: ${r.percentual}%)`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await conn.end();
    }
}

adicionarPerfisFaltantes();
