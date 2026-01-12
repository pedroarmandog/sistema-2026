// Proxy shim: serve como compatibilidade para includes que usam
// `/frontend/inject-sidebar.js` enquanto o arquivo original vive em
// `/frontend/sidebar-component/inject-sidebar.js`.
(function(){
    if(document.currentScript && document.currentScript.dataset.injectedShim) return;
    if(document.querySelector('script[data-inject-sidebar-proxy]')) return;
    try{
        var s = document.createElement('script');
        s.src = '/frontend/sidebar-component/inject-sidebar.js';
        s.defer = true;
        s.dataset.injectSidebarProxy = '1';
        document.head.appendChild(s);
    }catch(e){
        console.warn('inject-sidebar shim failed', e);
    }
})();
