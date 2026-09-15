/* BAZINO ARENA 3D — classic layout, full inner-page ownership, SDK v2 */
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK || !SDK.registerComponent) {
    console.warn('[bazino-arena3d] SDK not found');
    return;
  }
  var R = SDK.React;
  var h = R.createElement;
  var useState = R.useState;
  var useEffect = R.useEffect;

  function asset(props, name) {
    var base = (props && props.assetsBase) ? props.assetsBase : '';
    if (!base) return name;
    return base + '/' + name;
  }
  function ts(props, key, fallback) {
    if (props && typeof props.ts === 'function') return props.ts(key, fallback);
    return fallback || key;
  }
  function langOf(props) { return (props && props.language) || 'en'; }
  function go(props, path) { if (props && props.onNavigate) props.onNavigate(path); }
  function isInner(props) {
    var p = (props && (props.currentPath || props.pathname)) || '';
    return p && p !== '/' && p !== '/home';
  }
  function wrap(fn) { return { apiVersion: 2, render: fn }; }

  // Navigation — required main menu: Home/Games/Cafe/Shop/Tournaments/Loyalty/Blog (no Chat, no Reservations/Profile)
  var NAV = [
    { id: 'home', path: '/', labelKey: 'nav.home', fallback: 'HOME' },
    { id: 'games', path: '/games', labelKey: 'nav.games', fallback: 'GAMES' },
    { id: 'cafe', path: '/cafe', labelKey: 'nav.cafe', fallback: 'CAFE' },
    { id: 'shop', path: '/shop', labelKey: 'nav.shop', fallback: 'SHOP' },
    { id: 'tournaments', path: '/tournaments', labelKey: 'nav.tournaments', fallback: 'TOURNAMENTS' },
    { id: 'loyalty', path: '/loyalty', labelKey: 'nav.loyalty', fallback: 'LOYALTY' },
    { id: 'blog', path: '/blog', labelKey: 'nav.blog', fallback: 'BLOG' }
  ];

  function Header(props) {
    var lang = langOf(props);
    var inner = isInner(props);
    var active = (props && props.activeTab) || (props && props.pathname) || '';
    // update body data-path for CSS transparent header
    useEffect(function () {
      try {
        document.body.setAttribute('data-path', (props && (props.currentPath || props.pathname)) || '/');
      } catch (e) {}
    }, [props && props.currentPath, props && props.pathname]);
    return h('header', { className: 'arena-header' + (inner ? ' is-inner' : '') },
      h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }, onClick: function () { go(props, '/'); } },
          props.logoUrl ? h('img', { src: props.logoUrl, alt: 'logo', style: { height: 36, width: 'auto', borderRadius: 8 } }) : h('div', { style: { width: 36, height: 36, background: 'var(--arena-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 900 } }, 'B'),
          h('span', { style: { fontWeight: 900, letterSpacing: '0.08em', color: '#fff' } }, 'BAZINO ', h('span', { style: { color: 'var(--arena-primary)' } }, 'ARENA 3D'))
        ),
        h('nav', { className: 'arena-nav' },
          NAV.map(function (n) {
            var isActive = active === n.id || (props.pathname && props.pathname.indexOf('/' + n.id) === 0) || (n.id === 'home' && (props.pathname === '/' || props.pathname === '/home'));
            return h('button', { key: n.id, className: isActive ? 'active' : '', onClick: function () { go(props, n.path); } }, ts(props, n.labelKey, n.fallback));
          })
        ),
        h('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
          props.user ? h('span', { style: { fontSize: 11, color: 'var(--arena-dim)' } }, props.user.displayName || props.user.username) : null,
          props.user ? h('button', { className: 'arena-btn', style: { padding: '6px 12px', fontSize: 11 }, onClick: function () { if (props.onLogout) props.onLogout(); } }, 'OUT') : h('button', { className: 'arena-btn', style: { padding: '6px 12px', fontSize: 11 }, onClick: function () { if (props.onLogin) props.onLogin(); } }, ts(props, 'nav.login', 'LOGIN'))
        )
      )
    );
  }

  function Footer(props) {
    var ci = (props && (props.contactInfo || props.companyInfo)) || null;
    // Never invent data: render only if exists
    var hasAddress = ci && ci.address;
    var hasPhone = ci && ci.phone;
    var hasEmail = ci && ci.email;
    var hasHours = ci && ci.hours;
    var hasAny = hasAddress || hasPhone || hasEmail || hasHours;
    return h('footer', { className: 'arena-footer' },
      h('div', { style: { maxWidth: 1280, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between' } },
        h('div', null,
          h('div', { style: { fontWeight: 900, color: '#fff', marginBottom: 8 } }, 'BAZINO ARENA 3D'),
          h('div', { style: { fontSize: 11, color: 'var(--arena-dim)' } }, 'Real data only — no fake address/phone. All from Props.')
        ),
        hasAny ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          hasAddress ? h('div', null, ts(props, 'contact.address', 'Address') + ': ' + ci.address) : null,
          hasPhone ? h('div', null, ts(props, 'contact.phone', 'Phone') + ': ' + ci.phone) : null,
          hasEmail ? h('div', null, 'Email: ' + ci.email) : null,
          hasHours ? h('div', null, ts(props, 'contact.hours', 'Hours') + ': ' + ci.hours) : null
        ) : h('div', { style: { color: 'var(--arena-dim)' } }, '—'),
        h('div', { style: { fontSize: 10, opacity: 0.6 } }, '© Bazino Arena 3D — classic layout with inner-page ownership')
      )
    );
  }

  function MobileNav(props) {
    var active = (props && props.activeTab) || '';
    return h('nav', { className: 'arena-mobile-nav' },
      NAV.map(function (n) {
        var isActive = active === n.id;
        return h('button', { key: n.id, className: isActive ? 'active' : '', onClick: function () { go(props, n.path); } }, ts(props, n.labelKey, n.fallback));
      })
    );
  }

  function Home(props) {
    var lang = langOf(props);
    var games = (props && (props.featuredGames || props.games)) || [];
    var tournaments = (props && props.tournaments) || [];
    var slides = (props && props.slides) || [];
    return h('div', { className: 'arena-home', style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 24 } },
      // Hero
      h('div', { className: 'arena-card', style: { padding: 24, background: 'linear-gradient(135deg, #0e1220 0%, #070b16 100%)', border: '1px solid rgba(0,229,255,0.2)' } },
        h('h1', { style: { fontSize: 28, fontWeight: 900, color: '#fff', margin: 0 } }, ts(props, 'hero.title', 'BAZINO ARENA 3D')),
        h('p', { style: { color: 'var(--arena-dim)', marginTop: 8, fontSize: 13 } }, ts(props, 'hero.sub', 'Next-gen gaming lounge')),
        h('div', { style: { marginTop: 16, display: 'flex', gap: 8 } },
          h('button', { className: 'arena-btn', onClick: function () { go(props, '/games'); } }, ts(props, 'cta.reserve', 'RESERVE')),
          h('button', { className: 'arena-btn', style: { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)' }, onClick: function () { go(props, '/tournaments'); } }, ts(props, 'nav.tournaments', 'TOURNAMENTS'))
        )
      ),
      // Destination card only Home
      h('div', { className: 'arena-destination-card arena-card', style: { padding: 16 } },
        h('div', { style: { fontWeight: 800, color: '#fff', marginBottom: 6 } }, 'DESTINATION — CLUB LOCATION'),
        (props.contactInfo && props.contactInfo.mapUrl) ? h('a', { href: props.contactInfo.mapUrl, target: '_blank', rel: 'noreferrer', style: { color: 'var(--arena-primary)', fontSize: 12 } }, 'Open Map') : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, 'Map available via contactInfo.mapUrl prop only if provided'),
        (props.contactInfo && props.contactInfo.address) ? h('div', { style: { marginTop: 8, fontSize: 12, color: 'var(--arena-dim)' } }, props.contactInfo.address) : null
      ),
      // Slides from admin if any
      slides && slides.length ? h('div', { className: 'arena-grid' },
        slides.slice(0, 4).map(function (s) {
          var title = (s.title && (s.title[lang] || s.title.en || s.title.fa)) || '';
          return h('div', { key: s.id, className: 'arena-card', style: { padding: 0, overflow: 'hidden' } },
            h('img', { src: s.imageUrl, alt: title, style: { width: '100%', height: 160, objectFit: 'cover' } }),
            h('div', { style: { padding: 12 } },
              h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 13 } }, title),
              h('button', { className: 'arena-btn', style: { marginTop: 8, fontSize: 11 }, onClick: function () { go(props, s.target || '/games'); } }, 'GO')
            )
          );
        })
      ) : null,
      // Featured games from real props
      h('div', null,
        h('h2', { style: { color: '#fff', fontWeight: 900, fontSize: 16, marginBottom: 12 } }, ts(props, 'nav.games', 'GAMES') + ' — Featured (' + games.length + ')'),
        games.length ? h('div', { className: 'arena-grid' },
          games.slice(0, 6).map(function (g) {
            return h('div', { key: g.id || g.name, className: 'arena-card', style: { padding: 12 } },
              h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 13 } }, g.name || g.title || 'Game'),
              h('div', { style: { fontSize: 11, color: 'var(--arena-dim)', marginTop: 4 } }, (g.category || g.genre || '') + (g.price ? ' — ' + g.price : '')),
              h('button', { className: 'arena-btn', style: { marginTop: 10, fontSize: 11 }, onClick: function () { go(props, '/games'); } }, ts(props, 'cta.reserve', 'RESERVE'))
            );
          })
        ) : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, ts(props, 'empty', 'Nothing here yet'))
      ),
      // Tournaments preview
      h('div', null,
        h('h2', { style: { color: '#fff', fontWeight: 900, fontSize: 16, marginBottom: 12 } }, ts(props, 'nav.tournaments', 'TOURNAMENTS') + ' (' + tournaments.length + ')'),
        tournaments.length ? h('div', { className: 'arena-grid' },
          tournaments.slice(0, 3).map(function (t) {
            return h('div', { key: t.id, className: 'arena-card', style: { padding: 12 } },
              h('div', { style: { fontWeight: 800, color: '#fff' } }, t.title || t.name),
              h('div', { style: { fontSize: 11, color: 'var(--arena-dim)', marginTop: 4 } }, t.game || '' + ' — ' + (t.startDate || '')),
              h('button', { className: 'arena-btn', style: { marginTop: 8, fontSize: 11 }, onClick: function () { go(props, '/tournaments'); } }, ts(props, 'cta.register', 'REGISTER'))
            );
          })
        ) : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, ts(props, 'empty', 'Nothing here yet'))
      )
    );
  }

  function Games(props) {
    var games = (props && (props.games || props.systems || props.featuredGames)) || [];
    var loading = props && props.loading;
    var error = props && props.error;
    var isEmpty = props && props.isEmpty;
    if (loading) return h('div', { style: { padding: 24, color: 'var(--arena-dim)' } }, ts(props, 'loading', 'Loading...'));
    if (error) return h('div', { style: { padding: 24, color: '#ff5555' } }, ts(props, 'error', 'Something went wrong') + ': ' + error);
    if (isEmpty || !games.length) return h('div', { style: { padding: 24, color: 'var(--arena-dim)' } }, ts(props, 'empty', 'Nothing here yet') + ' — games from real API');
    return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px' } },
      h('h2', { style: { color: '#fff', fontWeight: 900, marginBottom: 16 } }, ts(props, 'nav.games', 'GAMES') + ' (' + games.length + ')'),
      h('div', { className: 'arena-grid' },
        games.map(function (g) {
          return h('div', { key: g.id, className: 'arena-card', style: { padding: 14 } },
            g.imageUrl ? h('img', { src: g.imageUrl, alt: g.name, style: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 10 } }) : null,
            h('div', { style: { fontWeight: 800, color: '#fff' } }, g.name || g.title),
            h('div', { style: { fontSize: 11, color: 'var(--arena-dim)', marginTop: 4 } }, g.category || g.type || ''),
            h('div', { style: { marginTop: 10, display: 'flex', gap: 6 } },
              h('button', { className: 'arena-btn', style: { fontSize: 11 }, onClick: function () { if (props.onViewDetail) props.onViewDetail(g.id); else if (props.onNavigate) props.onNavigate('/games'); } }, 'DETAILS'),
              h('button', { className: 'arena-btn', style: { fontSize: 11, background: 'rgba(255,255,255,0.08)', color: '#fff' }, onClick: function () { if (props.onCheckout) props.onCheckout('reservation', { systemId: g.id }, g.price); } }, ts(props, 'cta.reserve', 'RESERVE'))
            )
          );
        })
      )
    );
  }

  function GamesDetail(props) {
    var systems = (props && (props.systems || props.games)) || [];
    var selected = (props && props.selectedGame) || null;
    return h('div', { style: { maxWidth: 900, margin: '0 auto', padding: '24px 16px' } },
      h('button', { className: 'arena-btn', style: { marginBottom: 16, background: 'rgba(255,255,255,0.08)', color: '#fff' }, onClick: function () { if (props.onBack) props.onBack(); else go(props, '/games'); } }, '← BACK'),
      selected ? h('div', { className: 'arena-card', style: { padding: 20 } },
        h('h2', { style: { color: '#fff', fontWeight: 900 } }, selected.name || selected.title),
        h('div', { style: { color: 'var(--arena-dim)', fontSize: 12, marginTop: 6 } }, selected.description || selected.category || ''),
        h('button', { className: 'arena-btn', style: { marginTop: 12 }, onClick: function () { if (props.onCheckout) props.onCheckout('reservation', { systemId: selected.id }, selected.price); } }, ts(props, 'cta.reserve', 'RESERVE'))
      ) : h('div', null,
        h('div', { style: { color: 'var(--arena-dim)', marginBottom: 12 } }, 'Select a game — real data from props.games (' + systems.length + ')'),
        h('div', { className: 'arena-grid' },
          systems.slice(0, 6).map(function (g) {
            return h('div', { key: g.id, className: 'arena-card', style: { padding: 12 } },
              h('div', { style: { color: '#fff', fontWeight: 800 } }, g.name),
              h('button', { className: 'arena-btn', style: { marginTop: 8, fontSize: 11 }, onClick: function () { if (props.onViewDetail) props.onViewDetail(g.id); } }, 'VIEW')
            );
          })
        )
      )
    );
  }

  function Cafe(props) {
    var items = (props && (props.cafeItems)) || [];
    var cats = (props && props.cafeCategories) || ['All'];
    var cart = (props && props.cart) || [];
    var loading = props && props.loading;
    if (loading) return h('div', { style: { padding: 24, color: 'var(--arena-dim)' } }, ts(props, 'loading', 'Loading...'));
    return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 } },
      h('h2', { style: { color: '#fff', fontWeight: 900 } }, ts(props, 'nav.cafe', 'CAFE') + ' — ' + items.length + ' items (real API)'),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
        cats.map(function (c) { return h('span', { key: c, className: 'arena-badge' }, c); })
      ),
      h('div', { className: 'arena-grid' },
        items.map(function (it) {
          return h('div', { key: it.id, className: 'arena-card', style: { padding: 12 } },
            it.imageUrl ? h('img', { src: it.imageUrl, alt: it.name, style: { width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, marginBottom: 8 } }) : null,
            h('div', { style: { color: '#fff', fontWeight: 800, fontSize: 13 } }, it.name),
            h('div', { style: { color: 'var(--arena-dim)', fontSize: 11, marginTop: 4 } }, (it.category || '') + ' — ' + (it.price || 0) + ' TL — stock ' + (it.inventory || it.stock || 0)),
            h('button', { className: 'arena-btn', style: { marginTop: 8, fontSize: 11 }, onClick: function () { if (props.onAddToCart) props.onAddToCart(it, 1); } }, ts(props, 'cta.order', 'ORDER'))
          );
        })
      ),
      h('div', { className: 'arena-card', style: { padding: 12, marginTop: 8 } },
        h('div', { style: { fontWeight: 800, color: '#fff' } }, 'CART (' + cart.length + ') — real'),
        cart.map(function (c) {
          var item = c.item || c;
          var qty = c.qty || 1;
          return h('div', { key: item.id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--arena-dim)', marginTop: 6 } },
            h('span', null, item.name + ' x' + qty),
            h('span', null, (item.price * qty) + ' TL')
          );
        }),
        h('button', { className: 'arena-btn', style: { marginTop: 10, fontSize: 11 }, onClick: function () { if (props.onCheckout) props.onCheckout(); } }, ts(props, 'cta.order', 'ORDER'))
      )
    );
  }

  function CafeDetail(props) {
    // Reuse Cafe but as detail view — real data only
    return Cafe(props);
  }

  function CafeCart(props) {
    var cart = (props && props.cart) || [];
    var total = (props && props.total) || 0;
    return h('div', { className: 'arena-card', style: { padding: 16, position: 'sticky', top: 80 } },
      h('div', { style: { fontWeight: 900, color: '#fff', marginBottom: 10 } }, 'CAFE CART — ' + cart.length + ' items'),
      cart.length ? cart.map(function (c) {
        var it = c.item || c;
        return h('div', { key: it.id, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--arena-dim)', marginTop: 6 } },
          h('span', null, it.name + ' x' + (c.qty || 1)),
          h('span', null,
            h('button', { onClick: function () { if (props.onUpdateQty) props.onUpdateQty(it.id, -1); }, style: { marginRight: 6 } }, '-'),
            h('button', { onClick: function () { if (props.onUpdateQty) props.onUpdateQty(it.id, 1); }, style: { marginRight: 6 } }, '+'),
            h('button', { onClick: function () { if (props.onRemoveFromCart) props.onRemoveFromCart(it.id); }, style: { color: '#ff5555' } }, 'x')
          )
        );
      }) : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, ts(props, 'empty', 'Nothing here yet')),
      h('div', { style: { marginTop: 12, fontWeight: 800, color: '#fff' } }, 'Total: ' + total + ' TL'),
      h('button', { className: 'arena-btn', style: { marginTop: 10, width: '100%' }, onClick: function () { if (props.onCheckout) props.onCheckout(); } }, ts(props, 'cta.order', 'ORDER'))
    );
  }

  function Shop(props) {
    var items = (props && (props.shopItems || props.accessories)) || [];
    var cats = (props && props.shopCategories) || [];
    return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px' } },
      h('h2', { style: { color: '#fff', fontWeight: 900, marginBottom: 12 } }, ts(props, 'nav.shop', 'SHOP') + ' — ' + items.length + ' products (real)'),
      h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } }, cats.map(function (c) { return h('span', { key: c, className: 'arena-badge' }, c); })),
      h('div', { className: 'arena-grid' },
        items.map(function (it) {
          return h('div', { key: it.id, className: 'arena-card', style: { padding: 12 } },
            it.imageUrl ? h('img', { src: it.imageUrl, alt: it.name, style: { width: '100%', height: 110, objectFit: 'cover', borderRadius: 10, marginBottom: 8 } }) : null,
            h('div', { style: { color: '#fff', fontWeight: 800 } }, it.name),
            h('div', { style: { color: 'var(--arena-dim)', fontSize: 11, marginTop: 4 } }, (it.category || '') + ' — ' + (it.price || 0) + ' TL'),
            h('button', { className: 'arena-btn', style: { marginTop: 8, fontSize: 11 }, onClick: function () { if (props.onAddToCart) props.onAddToCart(it, 1); } }, ts(props, 'cta.buy', 'BUY'))
          );
        })
      )
    );
  }

  function ShopDetail(props) { return Shop(props); }
  function ShopCart(props) { return CafeCart(props); }

  function Tournaments(props) {
    var tournaments = (props && props.tournaments) || [];
    var weekly = (props && props.weeklyTournaments) || [];
    var special = (props && props.specialTournaments) || [];
    var seasons = (props && (props.seasons || (props.season ? [props.season] : []))) || [];
    return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 20 } },
      h('h2', { style: { color: '#fff', fontWeight: 900 } }, ts(props, 'nav.tournaments', 'TOURNAMENTS') + ' — ' + tournaments.length + ' (real)'),
      h('div', { className: 'arena-grid' },
        tournaments.map(function (t) {
          return h('div', { key: t.id, className: 'arena-card', style: { padding: 14 } },
            h('div', { style: { fontWeight: 800, color: '#fff' } }, t.title || t.name),
            h('div', { style: { fontSize: 11, color: 'var(--arena-dim)', marginTop: 4 } }, (t.game || '') + ' — ' + (t.startDate || '') + ' — ' + (t.status || '')),
            h('div', { style: { marginTop: 10, display: 'flex', gap: 6 } },
              h('button', { className: 'arena-btn', style: { fontSize: 11 }, onClick: function () { if (props.onOpenBracket) props.onOpenBracket(t.id); else go(props, '/tournaments'); } }, 'BRACKET'),
              h('button', { className: 'arena-btn', style: { fontSize: 11, background: 'rgba(255,255,255,0.08)', color: '#fff' }, onClick: function () { if (props.onRegisterTournament) props.onRegisterTournament(t.id); } }, ts(props, 'cta.register', 'REGISTER'))
            )
          );
        })
      ),
      weekly.length ? h('div', null,
        h('h3', { style: { color: '#fff', fontWeight: 800, marginBottom: 8, marginTop: 8 } }, 'WEEKLY (' + weekly.length + ')'),
        h('div', { className: 'arena-grid' }, weekly.slice(0, 4).map(function (t) { return h('div', { key: t.id, className: 'arena-card', style: { padding: 10, fontSize: 12, color: '#fff' } }, t.title || t.name); }))
      ) : null,
      special.length ? h('div', null,
        h('h3', { style: { color: '#fff', fontWeight: 800, marginBottom: 8 } }, 'SPECIAL (' + special.length + ')'),
        h('div', { className: 'arena-grid' }, special.slice(0, 4).map(function (t) { return h('div', { key: t.id, className: 'arena-card', style: { padding: 10, fontSize: 12, color: '#fff' } }, t.title || t.name); }))
      ) : null,
      seasons.length ? h('div', null,
        h('h3', { style: { color: '#fff', fontWeight: 800, marginBottom: 8 } }, 'SEASONS (' + seasons.length + ')'),
        h('div', null, seasons.map(function (s) { return h('div', { key: s.id || s.season || 's', className: 'arena-card', style: { padding: 10, fontSize: 12, color: '#fff' } }, (s.name || s.title || 'Season') + ' — ' + (s.year || '')); }))
      ) : null
    );
  }

  function Weekly(props) {
    var list = (props && (props.weeklyTournaments || props.tournaments)) || [];
    return h('div', { style: { padding: 16 } },
      h('h3', { style: { color: '#fff', fontWeight: 900 } }, 'WEEKLY TOURNAMENTS — ' + list.length),
      h('div', { className: 'arena-grid' }, list.map(function (t) { return h('div', { key: t.id, className: 'arena-card', style: { padding: 12, color: '#fff', fontSize: 12 } }, t.title || t.name + ' — ' + (t.startDate || '')); }))
    );
  }
  function Special(props) {
    var list = (props && (props.specialTournaments || props.tournaments)) || [];
    return h('div', { style: { padding: 16 } },
      h('h3', { style: { color: '#fff', fontWeight: 900 } }, 'SPECIAL TOURNAMENTS — ' + list.length),
      h('div', { className: 'arena-grid' }, list.map(function (t) { return h('div', { key: t.id, className: 'arena-card', style: { padding: 12, color: '#fff', fontSize: 12 } }, t.title || t.name); }))
    );
  }
  function Season(props) {
    var list = (props && (props.seasons || (props.season ? [props.season] : []))) || [];
    return h('div', { style: { padding: 16 } },
      h('h3', { style: { color: '#fff', fontWeight: 900 } }, 'SEASONS — ' + list.length),
      h('div', null, list.map(function (s) { return h('div', { key: s.id || 's', className: 'arena-card', style: { padding: 12, color: '#fff', marginBottom: 8 } }, (s.name || 'Season') + ' — ' + JSON.stringify(s).slice(0, 120)); }))
    );
  }
  function Brackets(props) {
    var bracket = (props && (props.bracket || (props.selectedTournament && props.selectedTournament.bracket))) || null;
    var tournaments = (props && props.tournaments) || [];
    var selected = (props && props.selectedTournament) || (tournaments[0] || null);
    if (!bracket && selected && selected.bracket) bracket = selected.bracket;
    return h('div', { style: { padding: 16 } },
      h('h3', { style: { color: '#fff', fontWeight: 900, marginBottom: 12 } }, 'BRACKETS — real data'),
      !bracket || !bracket.round1 || !bracket.round1.length ? h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, 'No bracket yet — real prop is empty') :
        h('div', { style: { display: 'flex', gap: 16, overflowX: 'auto' } },
          h('div', { style: { minWidth: 180 } },
            h('div', { style: { fontWeight: 800, color: 'var(--arena-primary)', fontSize: 11, marginBottom: 8 } }, 'ROUND 1'),
            bracket.round1.map(function (m) { return h('div', { key: m.id, className: 'arena-card', style: { padding: 8, marginBottom: 8, fontSize: 11, color: '#fff' } }, m.teamA + ' vs ' + m.teamB + ' — ' + (m.winner || '')); })
          ),
          bracket.semis ? h('div', { style: { minWidth: 180 } },
            h('div', { style: { fontWeight: 800, color: 'var(--arena-primary)', fontSize: 11, marginBottom: 8 } }, 'SEMIS'),
            bracket.semis.map(function (m) { return h('div', { key: m.id, className: 'arena-card', style: { padding: 8, marginBottom: 8, fontSize: 11, color: '#fff' } }, m.teamA + ' vs ' + m.teamB + ' — ' + (m.winner || '')); })
          ) : null,
          bracket.finals ? h('div', { style: { minWidth: 180 } },
            h('div', { style: { fontWeight: 800, color: 'var(--arena-primary)', fontSize: 11, marginBottom: 8 } }, 'FINALS'),
            bracket.finals.map(function (m) { return h('div', { key: m.id, className: 'arena-card', style: { padding: 8, marginBottom: 8, fontSize: 11, color: '#fff', border: '1px solid var(--arena-primary)' } }, m.teamA + ' vs ' + m.teamB + ' — Champ: ' + (m.winner || '')); })
          ) : null
        )
    );
  }
  function Register(props) {
    var selected = (props && props.selectedTournament) || null;
    var tournaments = (props && props.tournaments) || [];
    var st = useState('');
    var teamName = st[0], setTeamName = st[1];
    var st2 = useState('');
    var leader = st2[0], setLeader = st2[1];
    var st3 = useState([]);
    var members = st3[0], setMembers = st3[1];
    var st4 = useState('');
    var memberInput = st4[0], setMemberInput = st4[1];
    return h('div', { className: 'arena-card', style: { padding: 16 } },
      h('h3', { style: { color: '#fff', fontWeight: 900, marginBottom: 8 } }, 'REGISTER TEAM — real API'),
      selected ? h('div', { style: { color: 'var(--arena-dim)', fontSize: 12, marginBottom: 10 } }, 'Selected: ' + (selected.title || selected.name) + ' — fee ' + (selected.registrationFee || 0) + ' TL') : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12, marginBottom: 10 } }, 'Select tournament — ' + tournaments.length + ' available'),
      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        h('input', { placeholder: 'Team Name', value: teamName, onChange: function (e) { setTeamName(e.target.value); }, style: { padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0e1220', color: '#fff', fontSize: 12 } }),
        h('input', { placeholder: 'Leader Gamertag', value: leader, onChange: function (e) { setLeader(e.target.value); }, style: { padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0e1220', color: '#fff', fontSize: 12 } }),
        h('div', { style: { display: 'flex', gap: 6 } },
          h('input', { placeholder: 'Teammate gamertag', value: memberInput, onChange: function (e) { setMemberInput(e.target.value); }, style: { flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0e1220', color: '#fff', fontSize: 12 } }),
          h('button', { className: 'arena-btn', style: { fontSize: 11 }, onClick: function () { if (!memberInput.trim()) return; setMembers(members.concat([memberInput.trim()])); setMemberInput(''); } }, '+ ADD')
        ),
        members.length ? h('div', { style: { fontSize: 11, color: 'var(--arena-dim)' } }, 'Members: ' + members.join(', ')) : null,
        h('button', { className: 'arena-btn', onClick: function () {
          if (!selected) { if (props.addNotification) props.addNotification('Select a tournament first', 'error'); return; }
          if (!teamName.trim() || !leader.trim()) { if (props.addNotification) props.addNotification('Team name & leader required', 'error'); return; }
          if (props.onRegisterTeam) props.onRegisterTeam(selected.id, { name: teamName, leader: leader, members: members });
          else if (props.onCheckout) props.onCheckout('tournament', { tournamentId: selected.id, team: { name: teamName, leader: leader, members: members } }, selected.registrationFee);
        } }, ts(props, 'cta.register', 'REGISTER'))
      )
    );
  }

  function Loyalty(props) {
    var user = (props && (props.user || props.loyaltyUser)) || null;
    var tx = (props && (props.transactions)) || [];
    var coupons = (props && (props.activeCoupons || props.rewards)) || [];
    var points = (props && (props.points != null ? props.points : (user && user.loyaltyPoints))) || 0;
    var credits = (props && (props.credits != null ? props.credits : (user && user.credits))) || 0;
    if (props && props.loading) return h('div', { style: { padding: 24, color: 'var(--arena-dim)' } }, ts(props, 'loading', 'Loading...'));
    if (!user) return h('div', { style: { padding: 24, color: 'var(--arena-dim)' } }, 'Login to see loyalty — real user prop is null (logged out state)');
    return h('div', { style: { maxWidth: 900, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 } },
      h('div', { className: 'arena-card', style: { padding: 16 } },
        h('div', { style: { fontWeight: 900, color: '#fff' } }, 'CLUB — ' + (user.displayName || user.username)),
        h('div', { style: { fontSize: 12, color: 'var(--arena-dim)', marginTop: 6 } }, 'Points: ' + points + ' — Credits: ' + credits),
        h('button', { className: 'arena-btn', style: { marginTop: 10, fontSize: 11 }, onClick: function () { if (props.onRedeemPoints) props.onRedeemPoints(100); } }, 'REDEEM 100 PTS')
      ),
      h('div', { className: 'arena-card', style: { padding: 16 } },
        h('div', { style: { fontWeight: 800, color: '#fff', marginBottom: 8 } }, 'TRANSACTIONS (' + tx.length + ') — real'),
        tx.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
          tx.slice(0, 10).map(function (t) { return h('div', { key: t.id, style: { fontSize: 11, color: 'var(--arena-dim)', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 4 } }, (t.date || '') + ' — ' + (t.description || t.type || '') + ' — ' + (t.amount || t.points || '')); })
        ) : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, ts(props, 'empty', 'Nothing here yet'))
      ),
      h('div', { className: 'arena-card', style: { padding: 16 } },
        h('div', { style: { fontWeight: 800, color: '#fff', marginBottom: 8 } }, 'COUPONS (' + coupons.length + ') — real'),
        coupons.length ? h('div', { className: 'arena-grid' },
          coupons.map(function (c) { return h('div', { key: c.id || c.code, style: { fontSize: 11, color: '#fff', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', padding: 8, borderRadius: 8 } }, (c.code || '') + ' — ' + (c.value || '') + (c.type === 'Percent' ? '%' : ' TL')); })
        ) : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, ts(props, 'empty', 'Nothing here yet'))
      )
    );
  }

  function Blog(props) {
    var articles = (props && props.articles) || [];
    return h('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '24px 16px' } },
      h('h2', { style: { color: '#fff', fontWeight: 900, marginBottom: 12 } }, ts(props, 'nav.blog', 'BLOG') + ' — ' + articles.length + ' real articles'),
      articles.length ? h('div', { className: 'arena-grid' },
        articles.map(function (a) {
          return h('div', { key: a.id, className: 'arena-card', style: { padding: 12 } },
            a.imageUrl ? h('img', { src: a.imageUrl, alt: a.title, style: { width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 8 } }) : null,
            h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 13 } }, a.title),
            h('div', { style: { fontSize: 11, color: 'var(--arena-dim)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, a.content || ''),
            h('button', { className: 'arena-btn', style: { marginTop: 8, fontSize: 11 }, onClick: function () { if (props.onOpenArticle) props.onOpenArticle(a.id); else if (props.onNavigate) props.onNavigate('/blog'); } }, 'READ MORE')
          );
        })
      ) : h('div', { style: { color: 'var(--arena-dim)' } }, ts(props, 'empty', 'Nothing here yet'))
    );
  }

  function BlogDetail(props) {
    var article = (props && props.selectedArticle) || null;
    var comments = (props && (props.comments || (article && article.comments))) || [];
    var st = useState('');
    var gamerTag = st[0], setGamerTag = st[1];
    var st2 = useState('');
    var content = st2[0], setContent = st2[1];
    if (!article) return h('div', { style: { padding: 24, color: 'var(--arena-dim)' } }, 'Select an article — real prop is null');
    return h('div', { style: { maxWidth: 800, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 } },
      h('button', { className: 'arena-btn', style: { background: 'rgba(255,255,255,0.08)', color: '#fff', width: 'fit-content' }, onClick: function () { if (props.onBack) props.onBack(); else go(props, '/blog'); } }, '← BACK'),
      h('div', { className: 'arena-card', style: { padding: 16 } },
        article.imageUrl ? h('img', { src: article.imageUrl, alt: article.title, style: { width: '100%', height: 220, objectFit: 'cover', borderRadius: 12, marginBottom: 12 } }) : null,
        h('h1', { style: { color: '#fff', fontWeight: 900, fontSize: 20 } }, article.title),
        h('div', { style: { fontSize: 11, color: 'var(--arena-dim)', marginTop: 6 } }, (article.author || '') + ' — ' + (article.date || '') + ' — ' + comments.length + ' comments (real)'),
        h('div', { style: { color: '#ddd', fontSize: 13, lineHeight: 1.6, marginTop: 12, whiteSpace: 'pre-wrap' } }, article.content || '')
      ),
      h('div', { className: 'arena-card', style: { padding: 16 } },
        h('div', { style: { fontWeight: 800, color: '#fff', marginBottom: 10 } }, 'COMMENTS (' + comments.length + ') — real'),
        comments.length ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
          comments.map(function (c) { return h('div', { key: c.id, style: { background: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 8 } },
            h('div', { style: { fontSize: 11, color: 'var(--arena-primary)', fontWeight: 800 } }, '@' + (c.gamerTag || 'anon') + ' — ' + (c.date || '')),
            h('div', { style: { fontSize: 12, color: '#ddd', marginTop: 4 } }, c.content)
          ); })
        ) : h('div', { style: { color: 'var(--arena-dim)', fontSize: 12 } }, 'No comments yet — be first'),
        h('div', { style: { marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 } },
          h('input', { placeholder: 'GamerTag', value: gamerTag, onChange: function (e) { setGamerTag(e.target.value); }, style: { padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0e1220', color: '#fff', fontSize: 12 } }),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('input', { placeholder: 'Your comment...', value: content, onChange: function (e) { setContent(e.target.value); }, style: { flex: 1, padding: 8, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: '#0e1220', color: '#fff', fontSize: 12 } }),
            h('button', { className: 'arena-btn', style: { fontSize: 11 }, onClick: function () {
              if (!gamerTag.trim() || !content.trim()) { if (props.addNotification) props.addNotification('GamerTag & content required', 'error'); return; }
              if (props.onAddComment) props.onAddComment(article.id, { gamerTag: gamerTag.trim(), content: content.trim() });
              setContent('');
            } }, 'SEND')
          )
        )
      )
    );
  }

  function Contact(props) {
    var company = (props && props.companyInfo) || null;
    var contact = (props && props.contactInfo) || null;
    var ci = contact || company || {};
    // Never invent data — render only if exists, hide if none
    var hasAddress = ci && ci.address;
    var hasPhone = ci && ci.phone;
    var hasEmail = ci && ci.email;
    var hasHours = ci && ci.hours;
    var hasMap = ci && ci.mapUrl;
    var hasInstagram = ci && ci.instagram;
    var hasAny = hasAddress || hasPhone || hasEmail || hasHours || hasMap || hasInstagram;
    return h('div', { style: { maxWidth: 900, margin: '0 auto', padding: '32px 16px' } },
      h('h1', { style: { color: '#fff', fontWeight: 900, fontSize: 24, marginBottom: 16 } }, ts(props, 'contact.title', 'CONTACT US')),
      !hasAny ? h('div', { className: 'arena-card', style: { padding: 20, color: 'var(--arena-dim)' } }, 'No contact data — props.companyInfo/contactInfo empty, so nothing rendered (real data only)') :
        h('div', { className: 'arena-card', style: { padding: 20, display: 'flex', flexDirection: 'column', gap: 14 } },
          hasAddress ? h('div', null, h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 12 } }, ts(props, 'contact.address', 'Address')), h('div', { style: { color: 'var(--arena-dim)', fontSize: 13, marginTop: 4 } }, ci.address)) : null,
          hasPhone ? h('div', null, h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 12 } }, ts(props, 'contact.phone', 'Phone')), h('a', { href: 'tel:' + ci.phone, style: { color: 'var(--arena-primary)', fontSize: 13, marginTop: 4, display: 'block' } }, ci.phone)) : null,
          hasEmail ? h('div', null, h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 12 } }, 'Email'), h('a', { href: 'mailto:' + ci.email, style: { color: 'var(--arena-primary)', fontSize: 13, marginTop: 4, display: 'block' } }, ci.email)) : null,
          hasHours ? h('div', null, h('div', { style: { fontWeight: 800, color: '#fff', fontSize: 12 } }, ts(props, 'contact.hours', 'Hours')), h('div', { style: { color: 'var(--arena-dim)', fontSize: 13, marginTop: 4 } }, ci.hours)) : null,
          hasMap ? h('div', null, h('a', { href: ci.mapUrl, target: '_blank', rel: 'noreferrer', className: 'arena-btn', style: { display: 'inline-block', fontSize: 11, marginTop: 6 } }, 'OPEN MAP')) : null,
          hasInstagram ? h('div', null, h('a', { href: ci.instagram, target: '_blank', rel: 'noreferrer', style: { color: 'var(--arena-primary)', fontSize: 12 } }, 'Instagram: ' + ci.instagram)) : null,
          company && company.company ? h('div', { style: { marginTop: 12, fontSize: 11, color: 'var(--arena-dim)', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 } }, company.company + (company.taxNo ? ' — Tax: ' + company.taxNo : '')) : null
        ),
      h('button', { className: 'arena-btn', style: { marginTop: 20, background: 'rgba(255,255,255,0.08)', color: '#fff' }, onClick: function () { if (props.onBack) props.onBack(); else go(props, '/'); } }, '← BACK HOME')
    );
  }

  // Register all regions
  SDK.registerComponent('header', wrap(Header));
  SDK.registerComponent('footer', wrap(Footer));
  SDK.registerComponent('mobileNav', wrap(MobileNav));
  SDK.registerComponent('home', wrap(Home));
  SDK.registerComponent('hero', wrap(Home));
  SDK.registerComponent('home.genres', wrap(function (p) { return h('div', { style: { padding: 16, color: 'var(--arena-dim)', fontSize: 12 } }, 'Genres from props.gameGenres: ' + ((p.gameGenres && p.gameGenres.length) || 0)); }));
  SDK.registerComponent('home.lounges', wrap(function (p) { return h('div', { style: { padding: 16, color: 'var(--arena-dim)', fontSize: 12 } }, 'Lounges — systems ' + ((p.systems && p.systems.length) || 0)); }));
  SDK.registerComponent('home.results', wrap(function (p) { return h('div', { style: { padding: 16, color: 'var(--arena-dim)', fontSize: 12 } }, 'Results — from props'); }));
  SDK.registerComponent('home.tournaments', wrap(function (p) { return h('div', { style: { padding: 16 } }, Tournaments(p)); }));
  SDK.registerComponent('home.pricing', wrap(function (p) { return h('div', { style: { padding: 16, color: 'var(--arena-dim)', fontSize: 12 } }, 'Pricing — real settings'); }));
  SDK.registerComponent('home.staff', wrap(function (p) { return h('div', { style: { padding: 16, color: 'var(--arena-dim)', fontSize: 12 } }, 'Staff — real'); }));
  SDK.registerComponent('home.location', wrap(function (p) { return h('div', { style: { padding: 16 } }, Contact(p)); }));

  SDK.registerComponent('games', wrap(Games));
  SDK.registerComponent('games.detail', wrap(GamesDetail));

  SDK.registerComponent('cafe', wrap(Cafe));
  SDK.registerComponent('cafe.detail', wrap(CafeDetail));
  SDK.registerComponent('cafe.cart', wrap(CafeCart));

  SDK.registerComponent('shop', wrap(Shop));
  SDK.registerComponent('shop.detail', wrap(ShopDetail));
  SDK.registerComponent('shop.cart', wrap(ShopCart));

  SDK.registerComponent('tournaments', wrap(Tournaments));
  SDK.registerComponent('tournaments.weekly', wrap(Weekly));
  SDK.registerComponent('tournaments.special', wrap(Special));
  SDK.registerComponent('tournaments.season', wrap(Season));
  SDK.registerComponent('tournaments.brackets', wrap(Brackets));
  SDK.registerComponent('tournaments.register', wrap(Register));

  SDK.registerComponent('loyalty', wrap(Loyalty));

  SDK.registerComponent('blog', wrap(Blog));
  SDK.registerComponent('blog.detail', wrap(BlogDetail));

  SDK.registerComponent('contact', wrap(Contact));

  console.log('[bazino-arena3d] registered 29 regions — classic layout with inner-page ownership');
})();
