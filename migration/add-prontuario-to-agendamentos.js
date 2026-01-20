const mysql = require('mysql2/promise');

async function addProntuarioColumn() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '@Pedropro14',
        database: 'petshop'
    });

    try {
        console.log('🔍 Verificando se coluna prontuario existe...');
        
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'petshop' 
            AND TABLE_NAME = 'agendamentos' 
            AND COLUMN_NAME = 'prontuario'
        `);

        if (columns.length > 0) {
            console.log('✅ Coluna prontuario já existe!');
            return;
        }

        console.log('➕ Adicionando coluna prontuario...');
        
        await connection.query(`
            ALTER TABLE agendamentos 
            ADD COLUMN prontuario JSON NULL COMMENT 'Registros do prontuário clínico'
            AFTER totalPago
        `);

        console.log('✅ Coluna prontuario adicionada com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

addProntuarioColumn()
    .then(() => {
        console.log('✅ Migration concluída!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Migration falhou:', err);
        process.exit(1);
    });
