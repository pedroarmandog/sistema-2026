// Script global para aplicar cores personalizadas do sistema
(function() {
    'use strict';
    try{ console.log('custom-colors.js executing on', window.location.origin, window.location.pathname); }catch(e){}
    
    // Aplicar cores salvas ao carregar a página
    function applyCustomColors() {
        const savedColors = localStorage.getItem('systemColors');
        
        if (savedColors) {
            try {
                const colors = JSON.parse(savedColors);
                const root = document.documentElement;
                
                // Aplicar todas as categorias de cores
                Object.values(colors).forEach(category => {
                    if (Array.isArray(category)) {
                        category.forEach(color => {
                            if (color.var && color.hex) {
                                root.style.setProperty(color.var, color.hex);
                            }
                        });
                    }
                });
                
                // Atualizar gradiente do sidebar dinamicamente
                const sidebarStart = colors.sidebar?.find(c => c.id === 'sidebar-start')?.hex || '#2c3e50';
                const sidebarEnd = colors.sidebar?.find(c => c.id === 'sidebar-end')?.hex || '#34495e';
                root.style.setProperty('--bg-sidebar', `linear-gradient(180deg, ${sidebarStart} 0%, ${sidebarEnd} 100%)`);
                
                console.log('✅ Cores personalizadas aplicadas com sucesso!');
            } catch (error) {
                console.error('❌ Erro ao aplicar cores personalizadas:', error);
            }
        }
    }
    
    // Aplicar cores imediatamente
    applyCustomColors();
    
    // Replicar cores para também aplicar aos estilos inline comuns
    function updateInlineStyles() {
        const savedColors = localStorage.getItem('systemColors');
        if (!savedColors) return;
        
        try {
            const colors = JSON.parse(savedColors);
            
            // Mapear cores para elementos comuns
            const primaryBlue = colors.primary?.find(c => c.id === 'primary-blue')?.hex || '#007bff';
            const primaryBlueHover = colors.primary?.find(c => c.id === 'primary-blue-hover')?.hex || '#0056b3';
            const successColor = colors.status?.find(c => c.id === 'status-success')?.hex || '#28a745';
            const dangerColor = colors.status?.find(c => c.id === 'status-danger')?.hex || '#dc3545';
            const btnPrimary = colors.buttons?.find(c => c.id === 'btn-primary')?.hex || '#28a745';
            const btnPrimaryHover = colors.buttons?.find(c => c.id === 'btn-primary-hover')?.hex || '#1e7e34';
            const sidebarStart = colors.sidebar?.find(c => c.id === 'sidebar-start')?.hex || '#2c3e50';
            const sidebarEnd = colors.sidebar?.find(c => c.id === 'sidebar-end')?.hex || '#34495e';
            
            // Injetar estilos globais
            let styleEl = document.getElementById('custom-colors-override');
            if (!styleEl) {
                styleEl = document.createElement('style');
                styleEl.id = 'custom-colors-override';
                document.head.appendChild(styleEl);
            }
            
            styleEl.textContent = `
                /* Cores personalizadas aplicadas globalmente */
                .btn-primary, .button-primary { background: ${btnPrimary} !important; }
                .btn-primary:hover, .button-primary:hover { background: ${btnPrimaryHover} !important; }
                .text-primary { color: ${primaryBlue} !important; }
                .bg-primary { background-color: ${primaryBlue} !important; }
                .border-primary { border-color: ${primaryBlue} !important; }
                
                .text-success, .notification.success { color: ${successColor} !important; }
                .bg-success { background-color: ${successColor} !important; }
                
                .text-danger, .text-error, .notification.error { color: ${dangerColor} !important; }
                .bg-danger, .bg-error { background-color: ${dangerColor} !important; }
                
                /* Sidebar com gradiente personalizado */
                .sidebar {
                    background: linear-gradient(180deg, ${sidebarStart} 0%, ${sidebarEnd} 100%) !important;
                }
            `;
        } catch (error) {
            console.error('Erro ao atualizar estilos inline:', error);
        }
    }
    
    // Aplicar também aos estilos inline
    updateInlineStyles();
    
    // Observar mudanças no localStorage (para sincronizar entre abas)
    window.addEventListener('storage', function(e) {
        if (e.key === 'systemColors') {
            applyCustomColors();
            updateInlineStyles();
        }
    });
    
})();
