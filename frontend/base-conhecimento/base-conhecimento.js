// ================================================================
//  BASE DE CONHECIMENTO PETHUB — LÓGICA PRINCIPAL
//  Renderização dinâmica, pesquisa instantânea, navegação
// ================================================================

(function () {
  "use strict";

  // ── Configuração ──────────────────────────────────────────────
  const KB = {
    CONFIG: {
      artigosPath: "/base-conhecimento/data/artigos.json",
      artigosDir: "/base-conhecimento/artigos/",
      debounceMs: 250,
      maxRecentArticles: 6,
      maxTopArticles: 6,
      maxTips: 4,
      maxNews: 4,
    },

    // ── Estado ─────────────────────────────────────────────────
    state: {
      artigos: [],
      categorias: {},
      currentPage: "home",
      currentCategory: null,
      currentArticle: null,
    },

    // ── Categorias com metadados (ícones e descrições) ─────────
    categoriasMeta: {
      dashboard: { icon: "📊", name: "Dashboard", desc: "Visão geral do sistema, widgets e métricas do seu negócio." },
      agenda: { icon: "📅", name: "Agenda", desc: "Gerencie agendamentos, check-in, check-out e muito mais." },
      clientes: { icon: "👥", name: "Clientes", desc: "Cadastro e gestão completa de clientes." },
      pets: { icon: "🐶", name: "Pets", desc: "Cadastro e gestão de pets, raças, pelagens e boxes." },
      produtos: { icon: "📦", name: "Produtos", desc: "Cadastro de produtos, serviços, planos e comissões." },
      estoque: { icon: "📋", name: "Estoque", desc: "Controle de entrada, saída, transferência e validade." },
      clinica: { icon: "💊", name: "Clínica", desc: "Medicamentos, vacinas e periodicidade." },
      vendas: { icon: "🛒", name: "Vendas", desc: "Nova venda, consulta, devolução e orçamentos." },
      caixa: { icon: "💰", name: "Caixa", desc: "Abertura, fechamento, suprimento e sangria de caixa." },
      compras: { icon: "📥", name: "Compras", desc: "Entrada de mercadoria e cadastro de fornecedores." },
      financeiro: { icon: "📈", name: "Financeiro", desc: "Contas a receber/pagar, cartão, haver e crediário." },
      marketing: { icon: "📢", name: "Marketing", desc: "WhatsApp, disparo de mensagens e automações." },
      relatorios: { icon: "📊", name: "Relatórios", desc: "Relatórios de venda, atendimento, comissão e mais." },
      configuracoes: { icon: "⚙", name: "Configurações", desc: "Configure empresa, usuários, PDV, feriados e mais." },
      mobile: { icon: "📱", name: "App do Gestor", desc: "Aplicativo mobile para acompanhamento do dia a dia." },
      notificacoes: { icon: "🔔", name: "Notificações", desc: "Push notifications e lembretes automáticos." },
      "painel-admin": { icon: "🛡️", name: "Painel Admin", desc: "Administração de empresas e controle do sistema." },
    },

    // ── Dicas rápidas ──────────────────────────────────────────
    dicas: [
      { icon: "💡", text: "Use os atalhos de teclado para agilizar o atendimento no balcão." },
      { icon: "⭐", text: "Clientes frequentes podem ser marcados com grupo de cliente para descontos especiais." },
      { icon: "🔔", text: "Ative as notificações push para não perder nenhum agendamento." },
      { icon: "📱", text: "Baixe o App do Gestor para acompanhar o movimento do seu pet shop de qualquer lugar." },
      { icon: "🔄", text: "Agendamentos recorrentes economizam tempo — configure-os uma única vez." },
      { icon: "📢", text: "Use o marketing automático para enviar mensagens de aniversário sem esforço." },
    ],

    // ── Novidades do sistema ───────────────────────────────────
    novidades: [
      { icon: "🎉", title: "App do Gestor", desc: "A versão mobile do PetHub já está disponível.", date: "Jul/2026" },
      { icon: "🤖", title: "Automação de Marketing", desc: "Dispare mensagens automáticas para clientes.", date: "Jun/2026" },
      { icon: "📊", title: "Painel Financeiro", desc: "Acompanhe suas finanças em tempo real.", date: "Mai/2026" },
      { icon: "📱", title: "Push Notifications", desc: "Receba notificações no celular sobre agendamentos.", date: "Abr/2026" },
    ],

    // ── Inicialização ─────────────────────────────────────────
    async init() {
      try {
        await this.carregarArtigos();
        this.renderHome();
        this.setupSearch();
        this.setupNavigation();
        this.hideLoading();
      } catch (err) {
        console.error("[KB] Erro na inicialização:", err);
        this.showError("Não foi possível carregar a base de conhecimento.");
      }
    },

    // ── Carregar artigos do JSON ──────────────────────────────
    async carregarArtigos() {
      const resp = await fetch(KB.CONFIG.artigosPath);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const data = await resp.json();

      KB.state.artigos = data.artigos || [];
      
      // Agrupar por categoria
      KB.state.categorias = {};
      for (const art of KB.state.artigos) {
        const cat = art.category || "outros";
        if (!KB.state.categorias[cat]) {
          KB.state.categorias[cat] = [];
        }
        KB.state.categorias[cat].push(art);
      }
    },

    // ── Renderizar Home ───────────────────────────────────────
    renderHome() {
      const content = document.getElementById("kbContent");
      if (!content) return;

      content.innerHTML = `
        <div class="kb-header">
          <h1>🐾 Como podemos ajudar você hoje?</h1>
          <p>Encontre respostas rápidas sobre todas as funcionalidades do PetHub</p>
        </div>

        <div class="kb-search-wrapper">
          <span class="kb-search-icon">🔍</span>
          <input type="text" class="kb-search-input" id="kbSearchInput" 
                 placeholder="Como podemos ajudar você hoje?" 
                 autocomplete="off" aria-label="Pesquisar na base de conhecimento">
          <button class="kb-search-clear" id="kbSearchClear" aria-label="Limpar pesquisa">✕</button>
          <div class="kb-search-results" id="kbSearchResults"></div>
        </div>

        <h2 class="kb-section-title">
          <span class="kb-section-icon">📂</span>
          Navegue por categoria
        </h2>
        <div class="kb-categories-grid" id="kbCategoriesGrid">
          ${this.renderCategorias()}
        </div>

        ${this.renderArtigosTop()}
        ${this.renderDicas()}
        ${this.renderNovidades()}
      `;

      KB.state.currentPage = "home";
      this.updateBreadcrumb();
    },

    // ── Renderizar cards de categorias ────────────────────────
    renderCategorias() {
      const order = Object.keys(KB.categoriasMeta);
      return order
        .filter((cat) => KB.state.categorias[cat] && KB.state.categorias[cat].length > 0)
        .map((cat) => {
          const meta = KB.categoriasMeta[cat] || { icon: "📁", name: cat };
          const count = KB.state.categorias[cat] ? KB.state.categorias[cat].length : 0;
          return `<a href="#" class="kb-category-card" data-category="${cat}">
            <span class="kb-cat-icon">${meta.icon}</span>
            <span class="kb-cat-name">${meta.name}</span>
            <span class="kb-cat-count">${count} artigo${count !== 1 ? "s" : ""}</span>
          </a>`;
        })
        .join("");
    },

    // ── Renderizar artigos mais acessados/recentes ────────────
    renderArtigosTop() {
      const artigos = KB.state.artigos;
      if (!artigos.length) return "";

      // Artigos mais recentes (simulando "mais acessados" com os primeiros)
      const recentes = artigos.slice(0, KB.CONFIG.maxRecentArticles);
      
      return `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px;">
          <div>
            <h2 class="kb-section-title">
              <span class="kb-section-icon">🔥</span>
              Artigos em Destaque
            </h2>
            <div class="kb-articles-grid" style="grid-template-columns: 1fr;">
              ${recentes.map((art) => this.renderArticleCard(art)).join("")}
            </div>
          </div>
          <div>
            <h2 class="kb-section-title">
              <span class="kb-section-icon">🆕</span>
              Artigos Recentes
            </h2>
            <div class="kb-articles-grid" style="grid-template-columns: 1fr;">
              ${artigos.slice(-KB.CONFIG.maxRecentArticles).reverse().map((art) => this.renderArticleCard(art)).join("")}
            </div>
          </div>
        </div>
      `;
    },

    // ── Renderizar card de artigo ─────────────────────────────
    renderArticleCard(art) {
      const meta = KB.categoriasMeta[art.category] || {};
      const levelClass = art.level === "Avançado" ? "advanced" : art.level === "Intermediário" ? "intermediate" : "beginner";
      return `<a href="#" class="kb-article-card" data-article="${art.slug}" data-category="${art.category}">
        <div class="kb-art-header">
          <span class="kb-art-icon">${art.icon || meta.icon || "📄"}</span>
          <span class="kb-art-title">${this.esc(art.title)}</span>
        </div>
        <div class="kb-art-desc">${this.esc(art.description)}</div>
        <div class="kb-art-meta">
          <span>⏱ ${art.readingTime || "—"}</span>
          <span class="kb-art-level ${levelClass}">${art.level || "Iniciante"}</span>
        </div>
      </a>`;
    },

    // ── Renderizar dicas rápidas ──────────────────────────────
    renderDicas() {
      const tips = KB.dicas.slice(0, KB.CONFIG.maxTips);
      return `
        <h2 class="kb-section-title">
          <span class="kb-section-icon">💡</span>
          Dicas Rápidas
        </h2>
        <div class="kb-tips-grid">
          ${tips.map((t) => `
            <div class="kb-tip-card">
              <span class="kb-tip-icon">${t.icon}</span>
              <span>${this.esc(t.text)}</span>
            </div>
          `).join("")}
        </div>
      `;
    },

    // ── Renderizar novidades ──────────────────────────────────
    renderNovidades() {
      return `
        <h2 class="kb-section-title">
          <span class="kb-section-icon">🎉</span>
          Novidades do Sistema
        </h2>
        <div class="kb-news-grid">
          ${KB.novidades.map((n) => `
            <div class="kb-news-card">
              <span class="kb-news-icon">${n.icon}</span>
              <div>
                <div class="kb-news-title">${this.esc(n.title)}</div>
                <div>${this.esc(n.desc)}</div>
                <div class="kb-news-date">${n.date}</div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    },

    // ── Renderizar página de categoria ────────────────────────
    renderCategoria(category) {
      const content = document.getElementById("kbContent");
      if (!content) return;

      const artigos = KB.state.categorias[category];
      if (!artigos || !artigos.length) {
        this.showError("Categoria não encontrada.");
        return;
      }

      const meta = KB.categoriasMeta[category] || { icon: "📁", name: category, desc: "" };

      content.innerHTML = `
        <div class="kb-category-page">
          <div class="kb-category-header">
            <span class="kb-cat-icon-large">${meta.icon}</span>
            <div class="kb-cat-info">
              <h1>${this.esc(meta.name)}</h1>
              <p>${this.esc(meta.desc)}</p>
            </div>
          </div>
          <div class="kb-search-wrapper" style="margin-bottom: 24px;">
            <span class="kb-search-icon">🔍</span>
            <input type="text" class="kb-search-input" id="kbSearchInput" 
                   placeholder="Pesquisar em ${this.esc(meta.name)}..." 
                   autocomplete="off" aria-label="Pesquisar nesta categoria">
            <button class="kb-search-clear" id="kbSearchClear" aria-label="Limpar pesquisa">✕</button>
            <div class="kb-search-results" id="kbSearchResults"></div>
          </div>
          <div class="kb-category-list" id="kbCategoryList">
            ${artigos.map((art) => {
              const levelClass = art.level === "Avançado" ? "advanced" : art.level === "Intermediário" ? "intermediate" : "beginner";
              return `<a href="#" class="kb-category-list-item" data-article="${art.slug}" data-category="${category}">
                <span class="kb-list-icon">${art.icon || meta.icon || "📄"}</span>
                <div class="kb-list-info">
                  <div class="kb-list-title">${this.esc(art.title)}</div>
                  <div class="kb-list-desc">${this.esc(art.description)}</div>
                </div>
                <div class="kb-list-meta">
                  <span>⏱ ${art.readingTime || "—"}</span>
                  <span class="kb-art-level ${levelClass}">${art.level || "Iniciante"}</span>
                </div>
              </a>`;
            }).join("")}
          </div>
        </div>
      `;

      KB.state.currentPage = "category";
      KB.state.currentCategory = category;
      this.updateBreadcrumb(category);
      this.setupSearch();
      this.setupNavigation();
    },

    // ── Renderizar página de artigo ───────────────────────────
    async renderArtigo(category, slug) {
      const content = document.getElementById("kbContent");
      if (!content) return;

      // Buscar artigo nos dados
      const artigos = KB.state.categorias[category] || [];
      const artigo = artigos.find((a) => a.slug === slug);
      if (!artigo) {
        this.showError("Artigo não encontrado.");
        return;
      }

      // Mostrar loading
      content.innerHTML = `<div class="kb-loading"><div class="kb-loading-spinner"></div><p>Carregando artigo...</p></div>`;

      try {
        // Carregar o markdown
        const mdPath = `${KB.CONFIG.artigosDir}${category}/${slug}.md`;
        const resp = await fetch(mdPath);
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const mdText = await resp.text();

        // Renderizar markdown
        const html = marked.parse(mdText, { breaks: true, gfm: true });

        // Encontrar artigos relacionados (mesma categoria, excluindo o atual)
        const relacionados = artigos
          .filter((a) => a.slug !== slug)
          .slice(0, 4);

        const levelClass = artigo.level === "Avançado" ? "advanced" : artigo.level === "Intermediário" ? "intermediate" : "beginner";
        const meta = KB.categoriasMeta[category] || {};

        content.innerHTML = `
          <div class="kb-article-page">
            <div class="kb-article-header">
              <h1>${artigo.icon || meta.icon || ""} ${this.esc(artigo.title)}</h1>
              <p class="kb-article-desc">${this.esc(artigo.description)}</p>
              <div class="kb-article-meta-bar">
                <span>⏱ ${artigo.readingTime || "—"}</span>
                <span class="kb-art-level ${levelClass}">${artigo.level || "Iniciante"}</span>
                <span>📂 ${meta.name || category}</span>
              </div>
            </div>
            <div class="kb-article-content">
              ${html}
            </div>
            ${relacionados.length > 0 ? `
              <div class="kb-related-articles">
                <h3>📚 Artigos Relacionados</h3>
                <div class="kb-related-grid">
                  ${relacionados.map((r) => `
                    <a href="#" class="kb-related-item" data-article="${r.slug}" data-category="${category}">
                      <span class="kb-rel-icon">${r.icon || meta.icon || "📄"}</span>
                      <span class="kb-rel-title">${this.esc(r.title)}</span>
                    </a>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
        `;

        KB.state.currentPage = "article";
        KB.state.currentCategory = category;
        KB.state.currentArticle = slug;
        this.updateBreadcrumb(category, artigo.title);
        this.setupNavigation();

        // FAQ interativo
        this.setupFaqAccordion();

        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });

      } catch (err) {
        console.error("[KB] Erro ao carregar artigo:", err);
        this.showError("Erro ao carregar o artigo. Verifique se o arquivo existe.");
      }
    },

    // ── Setup FAQ accordion ───────────────────────────────────
    setupFaqAccordion() {
      document.querySelectorAll(".kb-faq-question").forEach((q) => {
        q.addEventListener("click", function () {
          const answer = this.nextElementSibling;
          const isOpen = answer.classList.contains("open");
          
          // Fechar todos
          document.querySelectorAll(".kb-faq-answer.open").forEach((a) => {
            a.classList.remove("open");
            a.previousElementSibling.classList.remove("open");
          });
          
          if (!isOpen) {
            answer.classList.add("open");
            this.classList.add("open");
          }
        });
      });
    },

    // ── Setup de navegação (clicks em cards, links) ──────────
    setupNavigation() {
      // Categoria cards
      document.querySelectorAll("[data-category]:not([data-article])").forEach((el) => {
        el.removeEventListener("click", KB._navHandler);
        el.addEventListener("click", KB._navHandler = function (e) {
          e.preventDefault();
          const cat = this.dataset.category;
          KB.renderCategoria(cat);
        });
      });

      // Article cards e links
      document.querySelectorAll("[data-article]").forEach((el) => {
        el.removeEventListener("click", KB._artHandler);
        el.addEventListener("click", KB._artHandler = function (e) {
          e.preventDefault();
          const slug = this.dataset.article;
          const cat = this.dataset.category;
          if (slug && cat) {
            KB.renderArtigo(cat, slug);
          }
        });
      });
    },

    // ── Setup de pesquisa ─────────────────────────────────────
    setupSearch() {
      const input = document.getElementById("kbSearchInput");
      const results = document.getElementById("kbSearchResults");
      const clear = document.getElementById("kbSearchClear");
      if (!input || !results) return;

      let debounceTimer = null;

      const doSearch = () => {
        const query = input.value.trim().toLowerCase();
        
        // Mostrar/esconder botão limpar
        if (clear) {
          clear.classList.toggle("visible", query.length > 0);
        }

        if (query.length < 2) {
          results.classList.remove("visible");
          return;
        }

        // Buscar em todos os artigos
        const found = KB.state.artigos.filter((art) => {
          const searchText = `${art.title} ${art.description} ${art.tags ? art.tags.join(" ") : ""} ${art.category}`.toLowerCase();
          return searchText.includes(query);
        }).slice(0, 8);

        if (found.length === 0) {
          results.innerHTML = `
            <div class="kb-search-no-results">
              <span class="kb-no-results-icon">🔍</span>
              Nenhum resultado encontrado para "${this.esc(query)}"
            </div>`;
        } else {
          results.innerHTML = found.map((art) => {
            const meta = KB.categoriasMeta[art.category] || { icon: "📄", name: art.category };
            return `<a href="#" class="kb-search-result-item" data-article="${art.slug}" data-category="${art.category}">
              <span class="kb-result-icon">${art.icon || meta.icon || "📄"}</span>
              <div class="kb-result-info">
                <div class="kb-result-title">${this.highlight(art.title, query)}</div>
                <div class="kb-result-category"><span>${meta.name || art.category}</span></div>
              </div>
            </a>`;
          }).join("");
        }

        results.classList.add("visible");

        // Configurar navegação nos resultados
        this.setupNavigation();
      };

      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => doSearch.call(this), KB.CONFIG.debounceMs);
      });

      input.addEventListener("focus", () => {
        if (input.value.trim().length >= 2) {
          results.classList.add("visible");
        }
      });

      // Fechar ao clicar fora
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".kb-search-wrapper")) {
          results.classList.remove("visible");
        }
      });

      // Fechar com ESC
      input.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          results.classList.remove("visible");
          input.blur();
        }
      });

      // Limpar pesquisa
      if (clear) {
        clear.addEventListener("click", () => {
          input.value = "";
          results.classList.remove("visible");
          clear.classList.remove("visible");
          input.focus();
        });
      }
    },

    // ── Atualizar breadcrumb ──────────────────────────────────
    updateBreadcrumb(category, articleTitle) {
      const bc = document.getElementById("kbBreadcrumb");
      if (!bc) return;

      const meta = KB.categoriasMeta[category] || {};

      if (!category) {
        bc.innerHTML = `<a href="/base-conhecimento/index.html">🏠 Central de Ajuda</a>`;
        return;
      }

      if (!articleTitle) {
        bc.innerHTML = `
          <a href="/base-conhecimento/index.html">🏠 Central de Ajuda</a>
          <span class="kb-separator">›</span>
          <span class="kb-current">${meta.icon || ""} ${this.esc(meta.name || category)}</span>
        `;
        return;
      }

      bc.innerHTML = `
        <a href="/base-conhecimento/index.html" id="kbBreadcrumbHome">🏠 Central de Ajuda</a>
        <span class="kb-separator">›</span>
        <a href="#" id="kbBreadcrumbCat" data-category="${category}">${meta.icon || ""} ${this.esc(meta.name || category)}</a>
        <span class="kb-separator">›</span>
        <span class="kb-current">${this.esc(articleTitle)}</span>
      `;

      // Evento para voltar à categoria
      const catLink = document.getElementById("kbBreadcrumbCat");
      if (catLink) {
        catLink.addEventListener("click", (e) => {
          e.preventDefault();
          KB.renderCategoria(category);
        });
      }

      // Evento para voltar à home
      const homeLink = document.getElementById("kbBreadcrumbHome");
      if (homeLink) {
        homeLink.addEventListener("click", (e) => {
          e.preventDefault();
          KB.renderHome();
        });
      }
    },

    // ── Utilitários ───────────────────────────────────────────
    esc(str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, '\x26amp;')
        .replace(/</g, '\x26lt;')
        .replace(/>/g, '\x26gt;')
        .replace(/"/g, '\x26quot;')
        .replace(/'/g, '\x26#39;');
    },

    highlight(text, query) {
      if (!text || !query) return this.esc(text);
      const escaped = this.esc(text);
      const q = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return escaped.replace(new RegExp(`(${q})`, "gi"), "<strong>$1</strong>");
    },

    hideLoading() {
      const loading = document.getElementById("kbLoading");
      if (loading) loading.style.display = "none";
    },

    showError(msg) {
      const content = document.getElementById("kbContent");
      if (!content) return;
      content.innerHTML = `
        <div class="kb-empty">
          <span class="kb-empty-icon">😕</span>
          <p>${this.esc(msg)}</p>
          <a href="/base-conhecimento/index.html" class="kb-btn" style="display:inline-block;margin-top:16px;padding:10px 24px;background:var(--color-primary,#007bff);color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Voltar à Central de Ajuda</a>
        </div>
      `;
      this.hideLoading();
    },
  };

  // ── Inicializar quando o DOM estiver pronto ────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => KB.init());
  } else {
    KB.init();
  }

  // Expor globalmente para debugs
  window.KB = KB;
})();