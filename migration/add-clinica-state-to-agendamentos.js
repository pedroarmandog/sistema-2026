const mysql = require('mysql2/promise');

async function addClinicaStateColumn() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '@Pedropro14',
        database: 'petshop'
    });

    try {
        console.log('🔍 Verificando se coluna clinica_state existe...');
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'petshop' 
            AND TABLE_NAME = 'agendamentos' 
            AND COLUMN_NAME = 'clinica_state'
        `);

        if (columns.length > 0) {
            console.log('✅ Coluna clinica_state já existe!');
            return;
        }

        console.log('➕ Adicionando coluna clinica_state...');
        await connection.query(`
            ALTER TABLE agendamentos 
            ADD COLUMN clinica_state JSON NULL COMMENT 'Estado da UI da aba clínica (ultima aba/sub-aba selecionada)'
            AFTER prontuario
        `);

        console.log('✅ Coluna clinica_state adicionada com sucesso!');

    } catch (error) {
        console.error('❌ Erro:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

addClinicaStateColumn()
    .then(() => {
        console.log('✅ Migration concluída!');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Migration falhou:', err);
        process.exit(1);
    });
