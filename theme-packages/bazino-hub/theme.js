/* BAZINO HUB THEME — SDK v2, ES5 (no const/let/arrow/optional-chaining/eval/setInterval) */
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK || !SDK.registerComponent) {
    console.warn('[Bazino Hub] SDK not found — components skipped.');
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
  function T(lang, map) {
    if (!map) return '';
    if (typeof map === 'string') return map;
    return map[lang] || map.en || map.fa || '';
  }
  function ts(props, key, fallback) {
    if (props && typeof props.ts === 'function') return props.ts(key, fallback);
    return fallback || key;
  }
  function langOf(props) {
    return (props && props.language) || 'en';
  }
  function go(props, path) {
    if (props && props.onNavigate) props.onNavigate(path);
  }
  function login(props) {
    if (props && props.onLogin) props.onLogin();
    else if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bazino:open-auth'));
  }
  function checkout(props, kind, params, amount) {
    if (props && props.onCheckout) props.onCheckout(kind, params, amount);
    else if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bazino:checkout', { detail: { kind: kind, params: params, amount: amount } }));
    }
  }
  function wrap(Page) {
    return {
      apiVersion: 2,
      render: function (props) { return h(Page, props); }
    };
  }
  function pick(obj, lang) {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || obj.fa || '';
  }
  function Empty(props) {
    return h('div', { className: 'hub-empty hub-neon-box' },
      h('b', null, props.title || 'NOTHING HERE YET'),
      h('p', null, props.body || '')
    );
  }
  function Hero(props) {
    return h('section', {
      className: 'hub-page-hero',
      style: { backgroundImage: props.img ? ('url(' + props.img + ')') : undefined }
    },
      props.back ? h('button', { type: 'button', className: 'hub-back', onClick: props.onBack }, '← BACK') : null,
      h('h1', null, props.title, props.em ? h('em', null, ' ' + props.em) : null),
      h('p', null, props.line || '')
    );
  }
  function svg(d, size) {
    return h('svg', {
      width: size || 18, height: size || 18, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true'
    }, h('path', { d: d }));
  }
  var ICO = {
    game: 'M6 12h12M8 9v6M16 9v6M4 8h16v8H4z',
    trophy: 'M8 4h8v4a4 4 0 01-8 0V4zM8 8H5a3 3 0 003 3M16 8h3a3 3 0 01-3 3M12 12v4M8 20h8',
    star: 'M12 3l2.4 6.6H21l-5.4 4.2 2 6.6L12 16.8 6.4 20.4l2-6.6L3 9.6h6.6z',
    crown: 'M3 18h18M5 18l2-10 5 5 5-5 2 10',
    users: 'M16 19v-1a3 3 0 00-3-3H7a3 3 0 00-3 3v1M12 11a3 3 0 100-6 3 3 0 000 6M20 19v-1a3 3 0 00-2-2.8M16 5.1a3 3 0 010 5.8',
    cal: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z',
    chat: 'M4 5h16v10H8l-4 4V5z',
    pin: 'M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11zM12 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3',
    clock: 'M12 7v5l3 2M12 21a9 9 0 100-18 9 9 0 000 18',
    globe: 'M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18M21 12A9 9 0 113 12a9 9 0 0118 0z'
  };

  var NAV = [
    { id: 'home', href: '/', key: 'home' },
    { id: 'games', href: '/games', key: 'games' },
    { id: 'events', href: '/events', key: 'events' },
    { id: 'shop', href: '/shop', key: 'shop' },
    { id: 'food', href: '/food', key: 'food' },
    { id: 'club', href: '/club', key: 'club' },
    { id: 'blog', href: '/blog', key: 'blog' }
    /* chat: disabled by employer request — ChatPage code + admin rooms stay for re-enable */
  ];

  function navOn(props, id) {
    var page = props.hubPage || '';
    var path = props.pathname || '';
    if (id === 'home') return page === 'home' || path === '/' || path === '';
    if (id === 'events') return page === 'events' || page === 'weekly' || page === 'special' || page === 'season' || page === 'brackets' || page === 'register' || path.indexOf('/events') === 0;
    return page === id || path.indexOf('/' + id) === 0;
  }

  function Logo(props) {
    return h('a', {
      href: '/', className: 'hub-logo',
      onClick: function (e) { e.preventDefault(); go(props, '/'); }
    },
      h('svg', { viewBox: '0 0 48 32', width: 42, height: 28, className: 'hub-logo-pad', 'aria-hidden': 'true' },
        h('defs', null,
          h('linearGradient', { id: 'hub-logo-g', x1: '0', y1: '0', x2: '1', y2: '1' },
            h('stop', { offset: '0', stopColor: '#22d3ff' }),
            h('stop', { offset: '1', stopColor: '#ff2db0' })
          )
        ),
        h('g', { fill: 'none', stroke: 'url(#hub-logo-g)', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' },
          h('path', { d: 'M14 24h20c4 0 7-3 7-7 0-5-3-8-8-8-3 0-5 1.4-9 1.4S18 9 15 9c-5 0-8 3-8 8 0 4 3 7 7 7z' })
        )
      ),
      h('span', { className: 'hub-logo-word' }, h('b', null, 'BAZINO'), h('small', null, 'GAMING CLUB'))
    );
  }

  function HoursModal(props) {
    var hours = (props.settings && (props.settings.club_hours || props.settings.opening_hours)) || '11:00 – 23:50';
    var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var list = [];
    var i;
    for (i = 0; i < days.length; i++) list.push(h('div', { key: days[i] }, h('span', null, days[i]), h('b', null, hours)));
    return h('div', { className: 'hub-modal-bg', onClick: props.onClose },
      h('div', {
        className: 'hub-modal is-hours hub-neon-box hub-neon-box--magenta',
        onClick: function (e) { e.stopPropagation(); }
      },
        h('button', { className: 'hub-x', type: 'button', onClick: props.onClose }, '✕'),
        h('h2', null, 'OPENING HOURS'),
        h('p', { className: 'sub' }, 'Every day at Bazino'),
        h('div', { className: 'hub-hours-list' }, list),
        h('button', { className: 'hub-cta', type: 'button', onClick: props.onClose }, 'SEE YOU IN THE CLUB')
      )
    );
  }

  function HubHeader(props) {
    var st = useState(false);
    var mobile = st[0], setMobile = st[1];
    var lang = langOf(props);
    var langs = ['en', 'tr', 'fa', 'ru'];
    var user = props.user;
    var items = [];
    var i;
    for (i = 0; i < NAV.length; i++) {
      (function (n) {
        items.push(h('a', {
          key: n.id, href: n.href,
          className: navOn(props, n.id) ? 'is-on' : '',
          onClick: function (e) { e.preventDefault(); setMobile(false); go(props, n.href); }
        }, ts(props, n.key, T(lang, { en: n.key.toUpperCase() }))));
      })(NAV[i]);
    }
    var langBtns = [];
    for (i = 0; i < langs.length; i++) {
      (function (l) {
        langBtns.push(h('button', {
          key: l, type: 'button', className: l === lang ? 'is-on' : '',
          onClick: function () { if (props.onLanguage) props.onLanguage(l); }
        }, l.toUpperCase()));
      })(langs[i]);
    }
    return h('div', null,
      h('header', { className: 'hub-header' },
        h(Logo, props),
        h('nav', { className: 'hub-nav' }, items),
        h('div', { className: 'hub-head-right' },
          h('div', { className: 'hub-chip' },
            svg(ICO.globe, 14),
            h('span', { className: 'hub-chip-tx' }, lang.toUpperCase()),
            h('div', { className: 'hub-lang-menu', role: 'list' }, langBtns)
          ),
          user ? h('a', {
            href: '/profile', className: 'hub-user',
            onClick: function (e) { e.preventDefault(); go(props, '/profile'); }
          },
            h('span', { className: 'hub-av hub-av--cyan', style: { width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 } },
              ((user.displayName || user.username || '?').charAt(0) || '?').toUpperCase()
            ),
            h('span', { className: 'hub-user-meta' },
              h('b', null, user.displayName || user.username),
              h('small', null, (user.points || 0) + ' pts')
            )
          ) : h('span', { style: { display: 'inline-flex', gap: 8 } },
            h('button', { className: 'hub-join hub-neon-box hub-neon-box--magenta', type: 'button', onClick: function () { login(props); } }, ts(props, 'join', 'JOIN')),
            h('button', { className: 'hub-login-btn hub-neon-box', type: 'button', onClick: function () { login(props); } }, ts(props, 'login', 'LOGIN'))
          ),
          h('button', {
            className: 'hub-burger', type: 'button',
            onClick: function () { setMobile(!mobile); },
            'aria-label': 'menu', 'aria-expanded': mobile ? 'true' : 'false'
          }, mobile ? '✕' : '☰')
        )
      ),
      h('nav', { className: 'hub-mobile-nav' + (mobile ? ' is-on' : '') }, items)
    );
  }

  function HubFooter(props) {
    var st = useState(false);
    var open = st[0], setOpen = st[1];
    var s = props.settings || {};
    var addr = s.club_address || 'Iskele, Long Beach — Hotel VistaMare';
    var phone = s.club_phone || s.company_landline || '+90 539 112 37 47';
    var map = s.club_map_url || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr));
    var ig = s.club_instagram || 'https://instagram.com/bazinopro';
    var hours = s.club_hours || '11:00 – 23:50';
    var waDigits = String(phone).replace(/\D/g, '');
    return h('footer', { className: 'hub-footer' },
      h('div', { className: 'hub-footer-main' },
        h('a', { href: '/', className: 'hub-foot-logo', onClick: function (e) { e.preventDefault(); go(props, '/'); } },
          h('b', null, 'BAZINO'), h('small', null, 'GAMING CLUB')
        ),
        h('div', { className: 'hub-vdiv' }),
        h('a', { href: map, target: '_blank', rel: 'noreferrer', className: 'hub-foot-item' },
          h('span', { className: 'hub-fic pink' }, svg(ICO.pin, 16)),
          h('span', null, addr)
        ),
        h('button', { className: 'hub-foot-item', type: 'button', onClick: function () { setOpen(true); } },
          h('span', { className: 'hub-fic red' }, svg(ICO.clock, 16)),
          h('span', null, 'OPEN', h('br'), h('b', null, hours))
        ),
        h('a', { className: 'hub-foot-item', href: 'https://wa.me/' + waDigits, target: '_blank', rel: 'noreferrer' },
          h('span', { className: 'hub-fic green' }, svg(ICO.chat, 16)),
          h('span', null, 'WHATSAPP', h('br'), h('b', null, phone))
        ),
        h('a', { className: 'hub-foot-item', href: ig, target: '_blank', rel: 'noreferrer' },
          h('span', { className: 'hub-fic ig' }, svg(ICO.star, 16)),
          h('span', null, 'INSTAGRAM', h('br'), h('b', null, '@bazinopro'))
        )
      ),
      h('div', { className: 'hub-foot-legal' },
        h('a', { href: '/rules', onClick: function (e) { e.preventDefault(); go(props, '/rules'); } }, 'RULES'),
        h('span', null, '·'),
        h('a', { href: '/privacy', onClick: function (e) { e.preventDefault(); go(props, '/privacy'); } }, 'PRIVACY'),
        h('span', null, '·'),
        h('a', { href: '/contact', onClick: function (e) { e.preventDefault(); go(props, '/contact'); } }, 'CONTACT'),
        h('small', null, '© ' + new Date().getFullYear() + ' BAZINO GAMING CLUB')
      ),
      open ? h(HoursModal, { settings: s, onClose: function () { setOpen(false); } }) : null
    );
  }

  function defaultSlides(props) {
    return [
      { imageUrl: asset(props, 'slide-fc26.jpg'), title: { en: 'FC 26 TOURNAMENT' }, desc: { en: 'Saturday night bracket. 32 players.' }, target: '/events/brackets', badge: 'NOW' },
      { imageUrl: asset(props, 'slide-city.jpg'), title: { en: 'GRAND THEFT AUTO VI' }, desc: { en: 'The next generation of games.' }, target: '/blog', badge: 'COMING SOON' },
      { imageUrl: asset(props, 'slide-match.jpg'), title: { en: 'TONIGHT 21:00' }, desc: { en: 'Big screen football in the lounge.' }, target: '/games', badge: 'LIVE MATCH' }
    ];
  }

  function HomePage(props) {
    var lang = langOf(props);
    var slides = (props.slides && props.slides.length) ? props.slides : defaultSlides(props);
    var st = useState(0);
    var i = st[0], setI = st[1];
    useEffect(function () {
      var id = 0;
      var n = slides.length;
      if (n < 2) return function () {};
      function tick() {
        id = window.setTimeout(function () {
          if (typeof document === 'undefined' || document.visibilityState === 'visible') {
            setI(function (x) { return (x + 1) % n; });
          }
          tick();
        }, 6000);
      }
      tick();
      return function () { if (id) window.clearTimeout(id); };
    }, [slides.length]);
    var slideNodes = [];
    var d, n;
    for (n = 0; n < slides.length; n++) {
      d = slides[n];
      slideNodes.push(h('div', {
        key: d.id || n,
        className: 'hub-slide' + (n === i ? ' is-on' : ''),
        style: { backgroundImage: 'url(' + (d.imageUrl || d.image || '') + ')' }
      },
        h('div', { className: 'hub-slide-body' },
          h('span', { className: 'hub-badge is-live' }, d.badge || 'NOW'),
          h('h2', null, pick(d.title, lang) || 'BAZINO'),
          h('p', null, pick(d.desc, lang)),
          h('button', {
            type: 'button', className: 'hub-slide-cta',
            onClick: function (t) { return function () { go(props, t || '/games'); }; }(d.target)
          }, 'OPEN')
        )
      ));
    }
    var tiles = [
      { href: '/games', title: 'GAMES', sub: 'Stations & reservations', tone: 'cyan', ic: ICO.game },
      { href: '/events', title: 'EVENTS', sub: 'Weekly, specials, season', tone: 'magenta', ic: ICO.trophy },
      { href: '/shop', title: 'SHOP', sub: 'Merch desk — coming soon', tone: 'gold', ic: ICO.star },
      { href: '/food', title: 'FOOD & DRINKS', sub: 'Cafe coming soon', tone: 'gold', ic: ICO.crown },
      { href: '/club', title: 'CLUB', sub: 'Credits & member card', tone: 'green', ic: ICO.users },
      { href: '/blog', title: 'BLOG', sub: 'Club news', tone: 'purple', ic: ICO.cal }
      /* chat tile removed — disabled by employer request */
    ];
    var tileNodes = [];
    for (n = 0; n < tiles.length; n++) {
      (function (t) {
        tileNodes.push(h('a', {
          key: t.href, href: t.href,
          className: 'hub-qcard hub-neon-box hub-neon-box--' + t.tone + ' is-' + t.tone,
          onClick: function (e) { e.preventDefault(); go(props, t.href); }
        },
          h('span', { className: 'hub-qic' }, svg(t.ic, 28)),
          h('b', null, t.title),
          h('small', null, t.sub)
        ));
      })(tiles[n]);
    }
    var dots = [];
    for (n = 0; n < slides.length; n++) dots.push(h('i', { key: n, className: n === i ? 'is-on' : '' }));
    return h('div', { className: 'hub-main' },
      h('section', { className: 'hub-slider' },
        slideNodes,
        h('button', { className: 'hub-sarrow hub-sarrow-l hub-neon-box', type: 'button', onClick: function () { setI((i + slides.length - 1) % slides.length); } }, '‹'),
        h('button', { className: 'hub-sarrow hub-sarrow-r hub-neon-box', type: 'button', onClick: function () { setI((i + 1) % slides.length); } }, '›'),
        h('div', { className: 'hub-sdots' }, dots)
      ),
      h('section', { className: 'hub-quick' }, tileNodes)
    );
  }

  function nextSlot(hours) {
    var now = new Date();
    var h = now.getHours() + 1;
    var dateLabel = 'امروز';
    if (h > 23) { h = h - 24; dateLabel = 'فردا'; }
    var end = (h + hours) % 24;
    function pad(n) { return (n < 10 ? '0' : '') + n; }
    return { date: dateLabel, startTime: pad(h) + ':00', endTime: pad(end) + ':00' };
  }

  function filterSys(list, audience) {
    var out = [];
    var i, s, a;
    list = list || [];
    for (i = 0; i < list.length; i++) {
      s = list[i];
      a = (s.audience || '').toLowerCase();
      if (!audience || !a || a === audience || a === 'any') out.push(s);
    }
    return out;
  }

  function GamesPage(props) {
    var viewSt = useState('pick');
    var view = viewSt[0], setView = viewSt[1];
    var sysSt = useState('');
    var sysId = sysSt[0], setSysId = sysSt[1];
    var hrSt = useState(2);
    var hours = hrSt[0], setHours = hrSt[1];
    var gameSt = useState('');
    var game = gameSt[0], setGame = gameSt[1];
    var padSt = useState(0);
    var pads = padSt[0], setPads = padSt[1];
    var systems = props.systems || [];
    var list = filterSys(systems, view === 'kids' ? 'kids' : view === 'adults' ? 'adults' : '');
    var selected = null;
    var i;
    for (i = 0; i < list.length; i++) if (list[i].id === sysId) selected = list[i];
    if (!selected && list.length) selected = list[0];
    var rate = selected ? (selected.hourlyRate || selected.rate || 0) : 0;
    /* extra pads: consoles only — base rate includes 2 pads */
    var isConsole = !!selected && (selected.type === 'PS5' || selected.type === 'Xbox');
    var ctrlRate = Number((props.settings || {}).extra_controller_hourly);
    if (!isFinite(ctrlRate) || ctrlRate < 0) ctrlRate = 25;
    var effPads = isConsole ? pads : 0;
    var total = rate * hours + effPads * ctrlRate * hours;
    var cards = [
      { id: 'kids', title: 'KIDS', body: 'Fun & safe games for younger players.', img: asset(props, 'games-kids.jpg'), tone: 'green', cta: 'RESERVE →' },
      { id: 'adults', title: 'ADULTS', body: 'Action, sports, racing. 85" and 65" bays.', img: asset(props, 'games-adults.jpg'), tone: 'magenta', cta: 'RESERVE →' },
      { id: 'requests', title: 'GAME REQUESTS', body: 'Suggest new games for the library.', img: asset(props, 'games-requests.jpg'), tone: 'cyan', cta: 'SUGGEST →' },
      { id: 'systems', title: 'SYSTEMS & GEAR', body: 'All stations — pick any bay.', img: asset(props, 'hero-setup.jpg'), tone: 'gold', cta: 'RESERVE →' }
    ];
    var cardNodes = [];
    for (i = 0; i < cards.length; i++) {
      (function (c) {
        cardNodes.push(h('button', {
          type: 'button',
          className: 'hub-tri-card hub-neon-box hub-neon-box--' + c.tone,
          style: { backgroundImage: 'url(' + c.img + ')' },
          onClick: function () {
            setView(c.id === 'systems' ? 'adults' : c.id);
            setSysId('');
            setPads(0);
          }
        },
          h('h2', null, c.title),
          h('p', null, c.body),
          h('span', { className: 'hub-tri-cta hub-neon-box hub-neon-box--' + c.tone }, c.cta)
        ));
      })(cards[i]);
    }
    var sysBtns = [];
    if (!list.length && (view === 'kids' || view === 'adults' || view === 'systems')) {
      sysBtns.push(h(Empty, { key: 'e', title: 'NO STATIONS YET', body: 'Systems will appear here when the club publishes them.' }));
    }
    for (i = 0; i < list.length; i++) {
      (function (s) {
        sysBtns.push(h('button', {
          key: s.id, type: 'button',
          className: 'hub-neon-box' + (selected && selected.id === s.id ? ' is-on hub-neon-box--cyan' : ''),
          onClick: function () { setSysId(s.id); setPads(0); }
        },
          h('span', null,
            h('b', null, s.name),
            h('small', { style: { display: 'block', color: '#7f8fc0' } }, (s.type || '') + (s.isReserved ? ' · busy' : ''))
          ),
          h('b', null, (s.hourlyRate || 0) + ' ₺/h')
        ));
      })(list[i]);
    }
    var hourBtns = [];
    for (i = 1; i <= 5; i++) {
      (function (hr) {
        hourBtns.push(h('button', { key: hr, type: 'button', className: hours === hr ? 'is-on' : '', onClick: function () { setHours(hr); } }, hr + 'h'));
      })(i);
    }
    var padBtns = [];
    for (i = 0; i <= 4; i++) {
      (function (n) {
        padBtns.push(h('button', { key: 'pad' + n, type: 'button', className: pads === n ? 'is-on' : '', onClick: function () { setPads(n); } }, n === 0 ? '0' : '+' + n));
      })(i);
    }
    function holdBay() {
      if (!props.user) { login(props); return; }
      if (!selected) return;
      var slot = nextSlot(hours);
      var bayParams = {
        systemId: selected.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        date: slot.date,
        requestedGame: game
      };
      if (effPads > 0) bayParams.extraControllers = effPads;
      checkout(props, 'reservation', bayParams, total);
    }
    return h('div', { className: 'hub-main' },
      h(Hero, {
        img: asset(props, 'games-adults.jpg'),
        title: 'GAMES', em: '& RESERVE',
        line: 'KIDS · ADULTS · REQUESTS · SYSTEMS',
        back: view !== 'pick',
        onBack: function () { setView('pick'); }
      }),
      view === 'pick' ? h('section', { className: 'hub-quad' }, cardNodes) : null,
      (view === 'kids' || view === 'adults') ? h('section', { className: 'hub-reserve' },
        h('div', { className: 'hub-sys' }, sysBtns),
        h('aside', { className: 'hub-pay hub-neon-box hub-neon-box--gold' },
          h('h3', null, view === 'kids' ? 'KIDS BAY' : 'ADULT BAY'),
          h('p', { style: { color: '#7f8fc0', marginTop: 0 } }, selected ? selected.name : '—'),
          h('div', { className: 'hub-hours' }, hourBtns),
          isConsole ? h('div', null,
            h('p', { style: { color: '#7f8fc0', fontSize: 12, margin: '8px 0 4px' } }, 'EXTRA PADS · base includes 2 · +' + ctrlRate + ' ₺/h'),
            h('div', { className: 'hub-hours' }, padBtns)
          ) : null,
          h('div', { className: 'hub-pay-total' }, total + ' ₺'),
          h('p', { style: { color: '#7f8fc0', fontSize: 12 } }, 'Cash or card at the desk — or pay from your Bazino wallet. No third-party checkout in Hub.'),
          h('button', { className: 'hub-pay-go', type: 'button', onClick: holdBay }, ts(props, 'holdBay', 'HOLD MY BAY')),
          h('p', { style: { fontSize: 11, color: '#5f6da6' } }, 'Show your booking at the desk.')
        )
      ) : null,
      view === 'requests' ? h('form', {
        className: 'hub-form',
        onSubmit: function (e) {
          e.preventDefault();
          if (!props.user) { login(props); return; }
          if (!list.length) return;
          var slot = nextSlot(2);
          checkout(props, 'reservation', {
            systemId: (selected && selected.id) || list[0].id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            date: slot.date,
            requestedGame: game
          }, (list[0].hourlyRate || 0) * 2);
        }
      },
        h('div', { className: 'hub-field' },
          h('label', null, 'GAME TITLE'),
          h('input', { value: game, onChange: function (e) { setGame(e.target.value); }, placeholder: 'e.g. Street Fighter 6' })
        ),
        h('button', { className: 'hub-cta', type: 'submit' }, 'SEND REQUEST')
      ) : null
    );
  }

  function coverFor(props, game) {
    var g = String(game || '').toLowerCase();
    if (g.indexOf('ufc') !== -1) return asset(props, 'covers/ufc5.png');
    if (g.indexOf('mortal') !== -1 || g.indexOf('mk') !== -1) return asset(props, 'covers/mk1.png');
    if (g.indexOf('tekken') !== -1) return asset(props, 'covers/tekken8.png');
    return asset(props, 'covers/fc26.png');
  }

  function EventsPage(props) {
    var cards = [
      { href: '/events/weekly', title: 'WEEKLY TOURNAMENTS', sub: 'Regular weekly competition', tone: 'purple', img: asset(props, 'covers/fc26.png') },
      { href: '/events/special', title: 'SPECIAL EVENTS', sub: 'Big competitions & showcases', tone: 'magenta', img: asset(props, 'covers/ufc5.png') },
      { href: '/events/season', title: 'SEASON RANKING', sub: 'Live season standings', tone: 'green', img: asset(props, 'hero-setup.jpg') },
      { href: '/events/brackets', title: 'TOURNAMENT BRACKETS', sub: 'Live & past results', tone: 'gold', img: asset(props, 'covers/banner-bracket.jpg') },
      { href: '/events/register', title: 'REGISTER', sub: 'Join the next weekly', tone: 'cyan', img: asset(props, 'covers/mk1.png') }
    ];
    var nodes = [];
    var i;
    for (i = 0; i < cards.length; i++) {
      (function (c) {
        nodes.push(h('article', { key: c.href, className: 'hub-evcard hub-neon-box hub-neon-box--' + c.tone + ' is-' + c.tone },
          h('header', null, h('span', null, h('b', null, c.title), h('small', null, c.sub))),
          h('div', { className: 'hub-evart' }, h('img', { src: c.img, alt: '' })),
          h('a', {
            href: c.href, className: 'hub-evcta',
            onClick: function (e) { e.preventDefault(); go(props, c.href); }
          }, 'VIEW →')
        ));
      })(cards[i]);
    }
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-setup.jpg'), title: 'EVENTS', em: '& ARENA', line: 'PLAY · COMPETE · EARN' }),
      h('section', { className: 'hub-evgrid' }, nodes)
    );
  }

  function eventRows(list, props, tone) {
    if (!list || !list.length) return h(Empty, { title: 'NO EVENTS YET', body: 'When the club publishes tournaments they will show up here.' });
    var nodes = [];
    var i, t, title;
    for (i = 0; i < list.length; i++) {
      t = list[i];
      title = t.title || t.game || 'Tournament';
      nodes.push(h('article', { key: t.id || i, className: 'hub-row hub-neon-box hub-neon-box--' + (tone || 'purple') },
        h('img', { src: coverFor(props, t.game), alt: '' }),
        h('div', null,
          h('h3', null, title),
          h('p', null, t.game || ''),
          h('small', { style: { color: '#7f8fc0' } }, (t.startDate || '') + ' · ' + (t.liveState || t.status || '') + ' · max ' + (t.maxTeams || '—'))
        ),
        h('div', { className: 'hub-row-meta' },
          h('div', { className: 'hub-stat is-fee' }, h('b', null, (t.registrationFee || 0) + ' ₺'), h('small', null, 'ENTRY')),
          h('div', { className: 'hub-stat' }, h('b', null, (t.registeredTeamsCount || t.teamCount || 0) + '/' + (t.maxTeams || '—')), h('small', null, 'PLAYERS'))
        )
      ));
    }
    return h('section', { className: 'hub-rows' }, nodes);
  }

  function WeeklyPage(props) {
    var feed = props.eventsFeed || {};
    var list = feed.weekly || props.tournaments || [];
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-setup.jpg'), title: 'WEEKLY', em: 'TOURNAMENTS', line: 'PLAY · COMPETE · EARN', back: true, onBack: function () { go(props, '/events'); } }),
      eventRows(list, props, 'purple')
    );
  }
  function SpecialPage(props) {
    var feed = props.eventsFeed || {};
    var list = feed.special || [];
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-setup.jpg'), title: 'SPECIAL', em: 'EVENTS', line: 'BIGGER GAMES · HIGHER PRIZES', back: true, onBack: function () { go(props, '/events'); } }),
      eventRows(list, props, 'magenta')
    );
  }

  function SeasonPage(props) {
    var season = props.season || (props.eventsFeed && props.eventsFeed.season) || null;
    var rows = (season && season.standings) || [];
    var body;
    var i, r;
    if (!season) {
      body = h(Empty, { title: 'NO ACTIVE SEASON', body: 'Season ranking appears when the club opens a season.' });
    } else {
      var trs = [];
      for (i = 0; i < rows.length; i++) {
        r = rows[i];
        trs.push(h('tr', { key: r.username || i, className: (i < 3) ? ('is-' + (i + 1)) : '' },
          h('td', null, String(i + 1)),
          h('td', null, r.displayName || r.username || r.playerKey || '—'),
          h('td', null, r.game || ''),
          h('td', null, h('b', null, r.points || 0))
        ));
      }
      body = h('section', { className: 'hub-season' },
        h('div', { className: 'hub-season-clock hub-neon-box hub-neon-box--gold' },
          h('span', null, h('small', null, 'SEASON'), h('b', null, season.name || 'SEASON')),
          h('span', { className: 'is-count' }, h('small', null, 'DAYS LEFT'), h('b', null, String(season.daysLeft != null ? season.daysLeft : '—')))
        ),
        h('div', { className: 'hub-box hub-neon-box' },
          h('h3', null, 'LEADERBOARD'),
          rows.length ? h('table', { className: 'hub-lb' },
            h('thead', null, h('tr', null, h('th', null, '#'), h('th', null, 'PLAYER'), h('th', null, 'GAME'), h('th', null, 'PTS'))),
            h('tbody', null, trs)
          ) : h(Empty, { title: 'NO STANDINGS YET', body: 'Play weekly or special events to earn season points.' })
        )
      );
    }
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-setup.jpg'), title: 'SEASON', em: 'RANKING', line: 'EARN POINTS · CLIMB', back: true, onBack: function () { go(props, '/events'); } }),
      body
    );
  }

  function BracketsPage(props) {
    var b = props.bracket;
    var rounds = (b && b.rounds) || [];
    var cols = [];
    var i, j, m, matches, col;
    if (!b) {
      cols.push(h(Empty, { key: 'e', title: 'NO LIVE BRACKET', body: 'When a tournament is live the 32-player tree will stream here.' }));
    } else {
      for (i = 0; i < rounds.length; i++) {
        matches = rounds[i] || [];
        col = [];
        for (j = 0; j < matches.length; j++) {
          m = matches[j];
          col.push(h('div', { key: m.id || (i + '-' + j), className: 'hub-match hub-mcard hub-neon-box' },
            h('b', null, (m.teamA && (m.teamA.teamName || m.teamA)) || m.aName || 'TBD'),
            h('small', null, 'vs'),
            h('b', null, (m.teamB && (m.teamB.teamName || m.teamB)) || m.bName || 'TBD'),
            h('small', null, (m.status || '') + (m.scoreA != null ? (' · ' + m.scoreA + '-' + m.scoreB) : ''))
          ));
        }
        cols.push(h('div', { key: i, className: 'hub-bracket-col' },
          h('h4', null, i === rounds.length - 1 ? 'FINAL' : ('R' + (i + 1))),
          col
        ));
      }
      if (!cols.length) cols.push(h(Empty, { key: 'e2', title: 'BRACKET NOT DRAWN', body: 'Players are registered. The draw appears when staff generate it.' }));
    }
    return h('div', { className: 'hub-main' },
      h(Hero, {
        img: asset(props, 'covers/banner-bracket.jpg'),
        title: b && b.title ? b.title : 'BRACKETS',
        em: 'LIVE',
        line: b && b.game ? b.game : 'FULL TREE · SSE',
        back: true, onBack: function () { go(props, '/events'); }
      }),
      h('div', { className: 'hub-bracket-cols' }, cols)
    );
  }

  function RegisterPage(props) {
    var feed = props.eventsFeed || {};
    var list = feed.weekly || props.tournaments || [];
    var idSt = useState(list[0] && list[0].id ? list[0].id : '');
    var tid = idSt[0], setTid = idSt[1];
    var tagSt = useState((props.user && (props.user.displayName || props.user.username)) || '');
    var tag = tagSt[0], setTag = tagSt[1];
    var opts = [];
    var i, t, selected;
    for (i = 0; i < list.length; i++) {
      t = list[i];
      if (!tid && t.id) tid = t.id;
      opts.push(h('option', { key: t.id, value: t.id }, (t.title || t.game || t.id) + ' — ' + (t.registrationFee || 0) + ' ₺'));
      if (t.id === tid) selected = t;
    }
    function holdSeat(e) {
      e.preventDefault();
      if (!props.user) { login(props); return; }
      if (!tid) return;
      checkout(props, 'tournament', { tournamentId: tid, team: { name: tag || props.user.username } }, selected ? selected.registrationFee : 0);
    }
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'covers/mk1.png'), title: 'REGISTER', em: 'TO PLAY', line: 'NAME ON THE BRACKET · PAY AT THE DESK', back: true, onBack: function () { go(props, '/events'); } }),
      list.length ? h('form', { className: 'hub-form', onSubmit: holdSeat },
        h('div', { className: 'hub-field' },
          h('label', null, 'TOURNAMENT'),
          h('select', { value: tid, onChange: function (e) { setTid(e.target.value); } }, opts)
        ),
        h('div', { className: 'hub-field' },
          h('label', null, 'GAMERTAG ON BRACKET'),
          h('input', { value: tag, onChange: function (e) { setTag(e.target.value); }, placeholder: 'ArmanK' })
        ),
        h('button', { className: 'hub-cta', type: 'submit' }, ts(props, 'holdSeat', 'HOLD MY SEAT')),
        h('p', { className: 'hub-form-note' }, 'Entry is paid in cash, card or wallet via the club checkout — Hub never embeds a payment gateway.')
      ) : h(Empty, { title: 'NO OPEN TOURNAMENT', body: 'Registration opens when the club publishes a weekly or special event.' })
    );
  }

  function SoonPage(props) {
    return h('div', { className: 'hub-main' },
      h('section', { className: 'hub-soon', style: { backgroundImage: 'url(' + props.img + ')' } },
        h('span', { className: 'hub-badge is-soon' }, props.kicker),
        h('h1', null, props.title, h('em', null, 'COMING SOON!')),
        h('p', null, props.body),
        h('button', { className: 'hub-slide-cta', type: 'button' }, 'STAY TUNED')
      )
    );
  }
  function ShopPage(props) {
    return h(SoonPage, { img: asset(props, 'shop-soon.jpg'), kicker: 'MERCH DESK', title: 'SHOP ', body: 'Exclusive items and member drops. Guest shop is coming soon.' });
  }
  function FoodPage(props) {
    return h(SoonPage, { img: asset(props, 'food-soon.jpg'), kicker: 'CAFE', title: 'FOOD & DRINKS ', body: 'Snacks and drinks at the station. Guest cafe is coming soon.' });
  }

  function ClubPage(props) {
    var user = props.user;
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-player.jpg'), title: 'BAZINO', em: 'CLUB', line: 'CREDITS · MEMBER CARD · SEASON POINTS' }),
      !user ? h('div', { style: { padding: 40, textAlign: 'center' } },
        h('button', { className: 'hub-cta', style: { maxWidth: 280 }, type: 'button', onClick: function () { login(props); } }, 'LOGIN TO OPEN CLUB')
      ) : h('section', { className: 'hub-club' },
        h('div', { className: 'hub-box hub-neon-box hub-neon-box--gold' },
          h('h3', null, 'BAZINO CREDITS'),
          h('p', { style: { fontSize: 42, margin: '8px 0', fontFamily: 'Orbitron, sans-serif' } }, String(user.credits || 0) + ' BC'),
          h('p', { style: { color: '#7f8fc0' } }, 'Season points: ' + String(user.points || 0) + '. Wallet cash lives in your profile.')
        ),
        h('button', { className: 'hub-cta', type: 'button', onClick: function () { go(props, '/profile'); } }, 'OPEN FULL PROFILE')
      )
    );
  }

  function BlogPage(props) {
    var arts = props.articles || [];
    var nodes = [];
    var i, a;
    for (i = 0; i < arts.length; i++) {
      a = arts[i];
      nodes.push(h('article', { key: a.id || i, className: 'hub-row hub-neon-box' },
        a.imageUrl ? h('img', { src: a.imageUrl, alt: '' }) : null,
        h('div', null,
          h('h3', null, a.title),
          h('p', null, (a.content || '').slice(0, 160)),
          h('small', { style: { color: '#7f8fc0' } }, (a.date || '') + ' · ' + (a.author || ''))
        )
      ));
    }
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-player.jpg'), title: 'CLUB', em: 'BLOG', line: 'NEWS · MATCH REPORTS' }),
      arts.length ? h('section', { className: 'hub-rows' }, nodes) : h(Empty, { title: 'NO POSTS YET', body: 'Club news will appear here when published.' })
    );
  }

  function ChatPage(props) {
    var chatOff = String((props.settings || {}).chat_enabled) !== 'true';
    var roomsSt = useState([]);
    var rooms = roomsSt[0], setRooms = roomsSt[1];
    var idSt = useState('');
    var id = idSt[0], setId = idSt[1];
    var msgsSt = useState([]);
    var msgs = msgsSt[0], setMsgs = msgsSt[1];
    var textSt = useState('');
    var text = textSt[0], setText = textSt[1];
    useEffect(function () {
      if (chatOff) return;
      var cancelled = false;
      fetch('/api/chat/rooms').then(function (r) { return r.ok ? r.json() : []; }).then(function (d) {
        if (cancelled || !d) return;
        var list = Array.isArray(d) ? d : (d.rooms || []);
        setRooms(list);
        if (list[0] && !id) setId(list[0].name || list[0].id || '');
      }).catch(function () {});
      return function () { cancelled = true; };
    }, []);
    useEffect(function () {
      if (chatOff || !id) return;
      var cancelled = false;
      fetch('/api/chat/messages/' + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : []; }).then(function (d) {
        if (!cancelled && Array.isArray(d)) setMsgs(d);
      }).catch(function () {});
      return function () { cancelled = true; };
    }, [id]);
    var roomBtns = [];
    var i, rm;
    for (i = 0; i < rooms.length; i++) {
      rm = rooms[i];
      (function (room) {
        var key = room.name || room.id;
        roomBtns.push(h('button', {
          key: key, type: 'button',
          className: 'hub-neon-box' + (id === key ? ' is-on hub-neon-box--cyan' : ''),
          onClick: function () { setId(key); }
        }, h('b', null, room.name || key)));
      })(rm);
    }
    var msgNodes = [];
    for (i = 0; i < msgs.length; i++) {
      msgNodes.push(h('div', { key: i, className: 'hub-msg' }, msgs[i].content || msgs[i].text || msgs[i].t || ''));
    }
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-player.jpg'), title: 'LIVE', em: 'CHAT', line: 'LOBBY · TABLES · STAFF' }),
      chatOff ? h(Empty, { title: 'CHAT DISABLED', body: 'Lobby chat is paused by the club. It will be back soon.' }) :
      rooms.length ? h('section', { className: 'hub-chat' },
        h('div', { className: 'hub-chat-list' }, roomBtns),
        h('div', { className: 'hub-chat-pane hub-neon-box' },
          h('div', { className: 'hub-msgs' }, msgNodes.length ? msgNodes : h('p', { style: { color: '#7f8fc0' } }, 'No messages yet.')),
          h('form', {
            onSubmit: function (e) {
              e.preventDefault();
              if (!props.user) { login(props); return; }
              if (!text.replace(/^\s+|\s+$/g, '')) return;
              fetch('/api/chat/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room: id, content: text })
              }).then(function () {
                setMsgs(msgs.concat([{ content: text }]));
                setText('');
              }).catch(function () {});
            }
          },
            h('input', { value: text, onChange: function (e) { setText(e.target.value); }, placeholder: 'Message the lobby…' }),
            h('button', { className: 'hub-cta', style: { width: 'auto', padding: '10px 16px' }, type: 'submit' }, 'SEND')
          )
        )
      ) : h(Empty, { title: 'CHAT IS QUIET', body: 'Rooms appear when the club opens lobby chat.' })
    );
  }

  function ContactPage(props) {
    var s = props.settings || {};
    var addr = s.club_address || 'İskele, Long Beach — Hotel VistaMare';
    var phone = s.club_phone || '+90 539 112 37 47';
    var map = s.club_map_url || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addr));
    var hoursSt = useState(false);
    var hoursOpen = hoursSt[0], setHoursOpen = hoursSt[1];
    return h('div', { className: 'hub-main' },
      h(Hero, { img: asset(props, 'hero-player.jpg'), title: 'FIND', em: 'BAZINO', line: addr }),
      h('section', { className: 'hub-contact' },
        h('a', { className: 'hub-loc-card hub-neon-box hub-neon-box--purple', href: map, target: '_blank', rel: 'noreferrer' },
          h('span', { className: 'hub-loc-pin' }, svg(ICO.pin, 34)),
          h('span', { className: 'hub-loc-tx' },
            h('small', null, 'LOCATION'),
            h('b', null, addr),
            h('p', null, 'Opens in Google Maps — no embedded map.')
          ),
          h('span', { className: 'hub-loc-cta' }, 'OPEN IN GOOGLE MAPS →')
        ),
        h('aside', { className: 'hub-box hub-neon-box' },
          h('h3', null, 'OPENING HOURS'),
          h('p', null, s.club_hours || 'Open everyday 11:00 – 23:50'),
          h('button', { type: 'button', className: 'hub-loc-sub', onClick: function () { setHoursOpen(true); } }, 'See all days →'),
          h('h3', null, 'CONTACT'),
          h('p', null, phone)
        )
      ),
      hoursOpen ? h(HoursModal, { settings: s, onClose: function () { setHoursOpen(false); } }) : null
    );
  }

  function RulesPage() {
    return h('div', { className: 'hub-main' },
      h(Hero, { title: 'CLUB', em: 'RULES', line: '8 HOUSE RULES' }),
      h('ol', { className: 'hub-form hub-legal', style: { color: '#c5ceee', lineHeight: 1.6 } },
        h('li', null, 'Respect players, guests and staff.'),
        h('li', null, 'Take care of equipment.'),
        h('li', null, 'Follow game, tournament and event rules.'),
        h('li', null, 'No cheating, fighting, harassment or threats.'),
        h('li', null, 'No insulting or deceptive usernames.'),
        h('li', null, 'Keep the room clean; eat and drink responsibly.'),
        h('li', null, 'Deliberate damage is charged at repair/replace cost.'),
        h('li', null, 'Serious or repeated offences may mean a temp or permanent ban.')
      )
    );
  }
  function PrivacyPage() {
    return h('div', { className: 'hub-main' },
      h(Hero, { title: 'PRIVACY', em: 'POLICY', line: 'WHAT WE STORE · WHY · HOW LONG' }),
      h('div', { className: 'hub-form hub-legal' },
        h('h3', null, 'WHAT WE COLLECT'),
        h('p', null, 'Name, username, date of birth, phone number and an optional profile photo — the data you type when you create a Bazino account.'),
        h('h3', null, 'WHY WE USE IT'),
        h('p', null, 'To identify you at the desk, place your gamertag on tournament brackets, keep season points and Bazino Credits, and contact you about a booking or an event.'),
        h('h3', null, 'WHAT WE NEVER DO'),
        h('p', null, 'We do not sell your data and we do not share it with advertisers. Payment details stay with the club checkout — Hub never copies a payment gateway.'),
        h('p', { className: 'hub-legal-foot' }, 'Accepting the rules and this policy is part of creating a Bazino account.')
      )
    );
  }

  function MobileNavNull() { return null; }

  SDK.registerComponent('header', wrap(HubHeader));
  SDK.registerComponent('footer', wrap(HubFooter));
  SDK.registerComponent('mobileNav', wrap(MobileNavNull));
  SDK.registerComponent('home', wrap(HomePage));
  SDK.registerComponent('hub.home', wrap(HomePage));
  SDK.registerComponent('hub.games', wrap(GamesPage));
  SDK.registerComponent('hub.events', wrap(EventsPage));
  SDK.registerComponent('hub.weekly', wrap(WeeklyPage));
  SDK.registerComponent('hub.special', wrap(SpecialPage));
  SDK.registerComponent('hub.season', wrap(SeasonPage));
  SDK.registerComponent('hub.brackets', wrap(BracketsPage));
  SDK.registerComponent('hub.register', wrap(RegisterPage));
  SDK.registerComponent('hub.shop', wrap(ShopPage));
  SDK.registerComponent('hub.food', wrap(FoodPage));
  SDK.registerComponent('hub.club', wrap(ClubPage));
  SDK.registerComponent('hub.blog', wrap(BlogPage));
  SDK.registerComponent('hub.chat', wrap(ChatPage));
  SDK.registerComponent('hub.contact', wrap(ContactPage));
  SDK.registerComponent('hub.rules', wrap(RulesPage));
  SDK.registerComponent('hub.privacy', wrap(PrivacyPage));
  console.log('[Bazino Hub] regions registered:', SDK.listRegisteredComponents());
})();
