(function(){
    // inject-sidebar.js - carrega o HTML do componente e injeta no documento
    const cssHref = '/dashboard.css'; // usar o CSS do dashboard para manter estilo idêntico
    const jsSrc = '/dashboard.js'; // usar o JS do dashboard para manter comportamento
    const componentPath = '/sidebar-component/sidebar.html';

    function ensureCss(href){
        if(document.querySelector(`link[href="${href}"]`)) return;
        const l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href; l.dataset.injected = 'sidebar';
        document.head.appendChild(l);
    }

    function ensureJs(src){
        if(document.querySelector(`script[src="${src}"]`)) return;
        const s = document.createElement('script');
        s.src = src; s.defer = true; s.dataset.injected = 'sidebar';
        document.head.appendChild(s);
    }

    function fetchAndInsert(){
        fetch(componentPath).then(r=>r.text()).then(html=>{
            // Inserir no início do body para replicar o mesmo layout
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            const existing = document.querySelector('.sidebar');
            if(existing){
                // substituir
                existing.parentElement.replaceChild(wrapper.firstElementChild, existing);
            } else {
                document.body.insertBefore(wrapper.firstElementChild, document.body.firstChild);
            }
            // Após inserir, configurar detecção de submenus abertos para controlar overflow-x
            try{ setupSidebarOverflowGuard(); }catch(e){ console.warn('Erro ao configurar overflow guard do sidebar', e); }
        }).catch(err=>console.warn('Falha ao carregar sidebar component', err));
    }

    // Injeta CSS e HTML e garante JS carregado
    ensureCss(cssHref);
    fetchAndInsert();
    // carregar JS depois de um pequeno delay para garantir DOM
    setTimeout(()=>ensureJs(jsSrc), 50);
    
    // --- Helpers locais: detectar submenus abertos e aplicar overflow-x:hidden ---
    function setupSidebarOverflowGuard(){
        // Evitar múltiplas configurações
        if(window.__sidebarOverflowGuardInstalled) return;
        window.__sidebarOverflowGuardInstalled = true;

        function anySubmenuOpen(){
            // considerar .submenu.open ou elementos com display:block/flex inline
            return !!document.querySelector('.nav-item-with-submenu .submenu.open, .nav-item-with-submenu .submenu[style*="display: block"], .nav-item-with-submenu .submenu[style*="display: flex"]');
        }

        function updateOverflow(){
            try{
                const open = anySubmenuOpen();
                if(open){
                    if(typeof window.__sidebarPrevOverflowX === 'undefined'){
                        window.__sidebarPrevOverflowX = document.documentElement.style.overflowX || '';
                    }
                    document.documentElement.style.overflowX = 'hidden';
                } else {
                    if(typeof window.__sidebarPrevOverflowX !== 'undefined'){
                        document.documentElement.style.overflowX = window.__sidebarPrevOverflowX || '';
                        try{ delete window.__sidebarPrevOverflowX; }catch(e){}
                    } else {
                        document.documentElement.style.overflowX = '';
                    }
                }
            }catch(e){ console.warn('updateOverflow failed', e); }
        }

        // observar cliques: muitos menus usam click handlers; checar logo após clique
        document.addEventListener('click', function(ev){
            // aguardar micro-tick para permitir outros handlers executarem
            setTimeout(updateOverflow, 40);
        }, true);

        // observar mudanças no DOM (classes/open) para ser mais robusto
        const mo = new MutationObserver(mutations => {
            // checar apenas mudanças em atributos/class/style de elementos submenu
            for(const m of mutations){
                if(m.type === 'attributes' && m.target && m.target.classList && (m.target.classList.contains('submenu') || m.target.closest && m.target.closest('.submenu'))){
                    updateOverflow();
                    return;
                }
            }
        });
        mo.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class','style'] });

        // checar ao carregar
        setTimeout(updateOverflow, 100);
    }
})();