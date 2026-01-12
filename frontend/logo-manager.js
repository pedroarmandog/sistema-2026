// logo-manager.js
// Permite clicar na logo para Alterar/Excluir; salva em localStorage como DataURL
(function(){
  const STORAGE_KEY = 'app_logo_dataurl';
  const MAX_W = 240; // largura máxima em px (display max fora do dashboard)
  const MAX_H = 90;  // altura máxima em px (display max fora do dashboard)
  const DASHBOARD_REQUIRED_W = 113; // dashboard: largura exata requerida
  const DASHBOARD_REQUIRED_H = 77; // dashboard: altura exata requerida

  function init(){
    try{
      document.addEventListener('DOMContentLoaded', onReady);
    }catch(e){ console.error('logo-manager init error', e); }
  }

  function onReady(){
    try{
      const logoImg = document.querySelector('.logo-pet-cria');
      if(!logoImg) return;

      // salvar src padrão (atributo) — vamos restaurar sempre para este valor
      const defaultSrc = logoImg.getAttribute('src');

      // aplicar limites visuais
      logoImg.style.maxWidth = MAX_W + 'px';
      logoImg.style.maxHeight = MAX_H + 'px';
      logoImg.style.height = 'auto';
      logoImg.style.cursor = 'pointer';

      // carregar do storage; se houver, usar; senão manter o src padrão definido no HTML
      try{
        const stored = localStorage.getItem(STORAGE_KEY);
        if(stored){
          logoImg.src = stored;
        }
      } catch(e){}

      // input file oculto
      let fileInput = document.getElementById('logoFileInput_global');
      if(!fileInput){
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.id = 'logoFileInput_global';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
      }

      // menu
      let menu = document.getElementById('logoContextMenu_global');
      if(!menu){
        menu = document.createElement('div');
        menu.id = 'logoContextMenu_global';
        menu.className = 'logo-context-menu-global';
        // sempre mostrar 'Alterar' (não 'Editar') conforme pedido
        const editLabel = 'Alterar';
        menu.innerHTML = `<div class="lcm-item lcm-item-alterar" data-action="alterar">${editLabel}</div><div class="lcm-item lcm-item-excluir" data-action="excluir">Excluir</div>`;
        document.body.appendChild(menu);
      }

      // estilo mínimo
      if(!document.getElementById('logoManagerStyles_global')){
        const s = document.createElement('style');
        s.id = 'logoManagerStyles_global';
        s.innerHTML = `
          .logo-context-menu-global{ position:fixed; display:none; background:#fff; box-shadow:0 8px 24px rgba(0,0,0,0.12); border-radius:6px; overflow:hidden; z-index:12000; min-width:120px; }
          .logo-context-menu-global .lcm-item{ padding:10px 14px; cursor:pointer; font-size:14px; color:#222; }
          .logo-context-menu-global .lcm-item:hover{ background:#f4f6f8; }
          /* toast amarelo (aviso/erro de resolução) */
          #logoToastGlobal{ position:fixed; top:16px; right:16px; background:#FFEB3B; color:#000; padding:10px 14px; border-radius:6px; box-shadow:0 6px 20px rgba(0,0,0,0.12); z-index:14000; font-size:14px; opacity:0; transition:opacity 260ms ease; }
          /* toast sucesso verde claro */
          #logoToastSuccessGlobal{ position:fixed; top:16px; right:16px; background:#DFF2DD; color:#0b4d23; padding:10px 14px; border-radius:6px; box-shadow:0 6px 20px rgba(0,0,0,0.08); z-index:14000; font-size:14px; opacity:0; transition:opacity 260ms ease; }

          /* confirmação modal customizada */
          .logo-confirm-overlay{ position:fixed; inset:0; background:rgba(2,16,26,0.5); display:flex; align-items:center; justify-content:center; z-index:15000; }
          .logo-confirm-dialog{ background:#fff; border-radius:12px; padding:18px 20px; box-shadow:0 10px 40px rgba(2,16,26,0.16); max-width:420px; width:90%; font-family:inherit; }
          .logo-confirm-title{ font-weight:600; margin-bottom:6px; color:#073642; }
          .logo-confirm-body{ color:#123; margin-bottom:14px; font-size:14px; }
          .logo-confirm-actions{ display:flex; gap:10px; justify-content:flex-end; }
          .logo-confirm-btn{ padding:8px 14px; border-radius:999px; border:0; cursor:pointer; font-weight:600; }
          .logo-confirm-btn.cancel{ background:#e8f0f6; color:#01445a; }
          .logo-confirm-btn.ok{ background:#006d6d; color:#fff; }
        `;
        document.head.appendChild(s);
      }

      // função utilitária para mostrar confirmação estilizada
      function showConfirm(message, title){
        return new Promise(function(resolve){
          try{
            const overlay = document.createElement('div'); overlay.className = 'logo-confirm-overlay';
            const dlg = document.createElement('div'); dlg.className = 'logo-confirm-dialog';
            const t = document.createElement('div'); t.className = 'logo-confirm-title'; t.textContent = title || '';
            const b = document.createElement('div'); b.className = 'logo-confirm-body'; b.textContent = message || 'Tem certeza?';
            const actions = document.createElement('div'); actions.className = 'logo-confirm-actions';
            const btnCancel = document.createElement('button'); btnCancel.className = 'logo-confirm-btn cancel'; btnCancel.textContent = 'Cancelar';
            const btnOk = document.createElement('button'); btnOk.className = 'logo-confirm-btn ok'; btnOk.textContent = 'OK';
            actions.appendChild(btnCancel); actions.appendChild(btnOk);
            dlg.appendChild(t); dlg.appendChild(b); dlg.appendChild(actions); overlay.appendChild(dlg);
            document.body.appendChild(overlay);

            function cleanup(){ try{ overlay.remove(); }catch(e){} }
            btnCancel.addEventListener('click', function(){ cleanup(); resolve(false); });
            btnOk.addEventListener('click', function(){ cleanup(); resolve(true); });
            // fechar ao clicar fora do dialog
            overlay.addEventListener('click', function(ev){ if(ev.target === overlay){ cleanup(); resolve(false); } });
            // foco primário
            btnOk.focus();
          }catch(e){ console.warn('showConfirm error', e); resolve(false); }
        });
      }

      // abrir menu ao clicar
      logoImg.addEventListener('click', function(ev){ ev.stopPropagation(); try{ const r = logoImg.getBoundingClientRect(); menu.style.left = Math.max(8, r.left) + 'px'; menu.style.top = (r.bottom + 8) + 'px'; menu.style.display = 'block'; }catch(e){ menu.style.display = 'block'; } });

      // fechar ao clicar fora
      document.addEventListener('click', function(){ if(menu) menu.style.display = 'none'; });

      // ações menu
      menu.addEventListener('click', async function(ev){
        ev.stopPropagation();
        const action = ev.target && ev.target.getAttribute && ev.target.getAttribute('data-action');
        if(!action) return;
        if(action === 'alterar'){
          fileInput.click();
        } else if(action === 'excluir'){
          try{
            // somente permitir exclusão se houver uma logo armazenada (ou seja, não é a logo padrão)
            const stored = (function(){ try{ return localStorage.getItem(STORAGE_KEY); }catch(e){ return null; } })();
            if(!stored){
              // nada a fazer: não permitir exclusão da logo padrão
              showToast('Não é possível excluir a logo padrão');
              menu.style.display = 'none';
              return;
            }
            const ok = await showConfirm('Remover a logo atual?', 'Confirmação');
            if(ok){
              try{
                localStorage.removeItem(STORAGE_KEY);
                // restaurar para o src padrão definido no HTML
                logoImg.src = defaultSrc || '';
                showSuccess('Logo restaurada para o padrão');
              }catch(e){ showToast('Erro ao remover logo'); }
            }
          }catch(e){ showToast('Erro ao processar exclusão'); }
        }
        menu.style.display = 'none';
      });

      // upload
      fileInput.addEventListener('change', function(){ const f = this.files && this.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = function(evt){ try{ const dataUrl = evt.target.result; // resize via canvas
          const img = new Image();
          img.onload = function(){
            try{
              const isDashboard = (window.location && window.location.pathname && window.location.pathname.indexOf('dashboard.html') !== -1) || (window.location && window.location.href && window.location.href.indexOf('dashboard.html') !== -1);
              if(isDashboard){
                // exigir resolução exatamente 113x77
                if(img.width !== DASHBOARD_REQUIRED_W || img.height !== DASHBOARD_REQUIRED_H){
                  showToast('Resolução não permitida, ajuste a resolução da sua logo para 113x77.');
                  return;
                }
                // aceito: salvar como está (mantemos resolução original)
                try{ logoImg.src = dataUrl; localStorage.setItem(STORAGE_KEY, dataUrl); }catch(e){ console.warn('logo save failed', e); }
                showSuccess('Logo atualizada');
                return;
              }

              // comportamento antigo para outras páginas: redimensionar para caber em MAX_W/MAX_H
              const scale = Math.min(1, Math.min(MAX_W / img.width, MAX_H / img.height));
              const w = Math.max(1, Math.round(img.width * scale));
              const h = Math.max(1, Math.round(img.height * scale));
              const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
                try{
                const out = canvas.toDataURL('image/png', 0.9);
                logoImg.src = out;
                try{ localStorage.setItem(STORAGE_KEY, out); }catch(e){ console.warn('logo save failed', e); }
                showSuccess('Logo atualizada');
              }catch(e){
                logoImg.src = dataUrl;
                try{ localStorage.setItem(STORAGE_KEY, dataUrl); }catch(err){}
                showSuccess('Logo atualizada');
              }
            }catch(err){
              console.error('logo processing error', err);
              showToast('Erro ao processar imagem');
            }
          };
          img.onerror = function(){ showToast('Arquivo de imagem inválido'); };
          img.src = dataUrl;
        }catch(e){ console.error('logo read error', e); showToast('Erro ao processar imagem'); } }; reader.readAsDataURL(f); menu.style.display = 'none'; });

      // helper: toast amarelo no canto superior direito
      function showToast(msg){
        try{
          let t = document.getElementById('logoToastGlobal');
          if(t){ t.parentNode.removeChild(t); }
          t = document.createElement('div'); t.id = 'logoToastGlobal'; t.textContent = msg; document.body.appendChild(t);
          // forçar reflow e mostrar
          window.getComputedStyle(t).opacity;
          t.style.opacity = '1';
          setTimeout(function(){ try{ t.style.opacity = '0'; setTimeout(function(){ if(t && t.parentNode) t.parentNode.removeChild(t); }, 300); }catch(e){} }, 4000);
        }catch(e){ console.warn('toast error', e); }
      }

      // toast de sucesso verde claro
      function showSuccess(msg){
        try{
          let t = document.getElementById('logoToastSuccessGlobal');
          if(t){ t.parentNode.removeChild(t); }
          t = document.createElement('div'); t.id = 'logoToastSuccessGlobal'; t.textContent = msg; document.body.appendChild(t);
          window.getComputedStyle(t).opacity;
          t.style.opacity = '1';
          setTimeout(function(){ try{ t.style.opacity = '0'; setTimeout(function(){ if(t && t.parentNode) t.parentNode.removeChild(t); }, 300); }catch(e){} }, 3000);
        }catch(e){ console.warn('success toast error', e); }
      }

    }catch(e){ console.error('logo-manager onReady error', e); }
  }

  init();
})();
