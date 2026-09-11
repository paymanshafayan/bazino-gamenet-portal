// BAZINO HUB v3.0.0 — Hasti reference design (dark neon gaming, English UI)
// SDK v2 — no React hooks, no timers. Interactive via props callbacks and DOM events.
(function () {
  var SDK = window.BazinoThemeSDK;
  if (!SDK || !SDK.registerComponent) {
    if (typeof console !== 'undefined') console.warn('[Bazino Hub v3] SDK not found.');
    return;
  }
  var R = SDK.React;
  var h = R.createElement;

  // ---------- helpers ----------
  function asset(props, name) {
    var base = (props && props.assetsBase) ? props.assetsBase : '';
    if (!base) return name;
    return base + '/' + name;
  }
  function tsx(props, key, fallback) {
    if (props && typeof props.ts === 'function') return props.ts(key, fallback);
    return fallback || key;
  }
  function go(props, path) {
    if (props && props.onNavigate) props.onNavigate(path);
  }
  function login(props) {
    if (props && props.onLogin) props.onLogin();
    else if (typeof window !== 'undefined' && window.dispatchEvent) window.dispatchEvent(new CustomEvent('bazino:open-auth'));
  }
  function logout(props) {
    if (props && props.onLogout) props.onLogout();
  }
  function setLang(props, lang) {
    if (props && props.onLanguage) props.onLanguage(lang);
  }
  function firstSeg(p) {
    var s = String(p || '/');
    s = s.split('?')[0].split('#')[0];
    if (s === '/' || s === '') return '';
    s = s.replace(/^\//, '');
    return s.split('/')[0];
  }
  function isActive(props, path) {
    var cur = firstSeg(props && props.pathname);
    var want = firstSeg(path);
    return cur === want;
  }

  // ---------- data ----------
  var NAV = [
    { key: 'nav.home', path: '/' },
    { key: 'nav.games', path: '/games' },
    { key: 'nav.events', path: '/events' },
    { key: 'nav.shop', path: '/shop' },
    { key: 'nav.food', path: '/food' },
    { key: 'nav.club', path: '/club' },
    { key: 'nav.blog', path: '/blog' },
    { key: 'nav.contact', path: '/contact' }
  ];
  var LANGS = [
    { code: 'en', label: 'EN' },
    { code: 'fa', label: 'FA' },
    { code: 'tr', label: 'TR' },
    { code: 'ru', label: 'RU' }
  ];

  function contactInfo(props) {
    var s = (props && props.settings) || {};
    var phone = s.club_phone || s.company_landline || '+90 539 112 37 47';
    var waDigits = String(phone).replace(/[^0-9]/g, '');
    return {
      hours: s.club_hours || s.opening_hours || '11:00 - 23:50',
      address: s.club_address || 'Iskele, Long Beach - Hotel VistaMare',
      phone: phone,
      whatsapp: 'https://wa.me/' + waDigits,
      instagram: s.club_instagram || 'https://instagram.com/bazinopro'
    };
  }

  // ---------- icons (inline SVG, stroke) ----------
  function icon(name, cls) {
    var P = {
      gamepad: 'M6 12h4M8 10v4M15 11h.01M17 13h.01M17.32 5H6.68a4 4 0 0 0-3.98 3.6l-.8 8A3 3 0 0 0 8.86 20l1.4-1.4a2 2 0 0 1 1.48-.6h.52a2 2 0 0 1 1.48.6l1.4 1.4a3 3 0 0 0 4.94-3.4l-.8-8A4 4 0 0 0 17.32 5Z',
      trophy: 'M6 9a6 6 0 0 0 12 0V3H6v6ZM6 5H4a2 2 0 0 0 0 4h2M18 5h2a2 2 0 0 1 0 4h-2M9 15l-1 6M15 15l1 6M12 17v4',
      cart: 'M4 5h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 9H7M10 21h.01M17 21h.01',
      burger: 'M4 7h16M4 12h16M4 17h10M17 15.5l2 2 3.5-3.5',
      crown: 'M3 8l4 4 5-8 5 8 4-4v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8ZM9 20h6',
      pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
      pin: 'M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
      clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3',
      whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3ZM8.8 8.6c.2-.5.5-.5.8-.5h.6c.2 0 .4 0 .6.5l.7 1.6c.1.3 0 .5-.1.7l-.5.6c-.1.2-.2.4 0 .7.6 1 1.5 1.8 2.6 2.3.3.1.5.1.7-.1l.6-.7c.2-.2.4-.3.7-.2l1.6.8c.4.2.5.4.5.6-.1 1.1-1 2-2.1 2-1 .1-2.4-.3-4.1-1.5-1.7-1.2-2.8-2.7-3.2-4.2-.3-1-.1-2.1.6-2.8Z',
      instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17.5 6.5h.01',
      swords: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M14.5 6.5 18 3h3v3l-3.5 3.5M5 14l5 5',
      user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 21a7 7 0 0 1 14 0',
      logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
      globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3Z',
      play: 'M8 5.5v13l11-6.5-11-6.5Z'
    };
    return h('svg', { className: cls || 'hz-ico', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
      h('path', { d: P[name] || P.pin })
    );
  }

  // ---------- header ----------
  function Header(props) {
    var user = props && props.user;
    var lang = (props && props.language) || 'en';
    var navLinks = [];
    for (var i = 0; i < NAV.length; i++) {
      var item = NAV[i];
      navLinks.push(h('button', {
        key: item.path,
        className: 'hz-nav-link' + (isActive(props, item.path) ? ' is-active' : ''),
        onClick: (function (p) { return function () { go(props, p); }; })(item.path)
      }, tsx(props, item.key, item.key)));
    }
    var langOpts = [];
    for (var l = 0; l < LANGS.length; l++) {
      langOpts.push(h('option', { key: LANGS[l].code, value: LANGS[l].code }, LANGS[l].label));
    }
    var right = h('div', { className: 'hz-head-right' },
      user ? h('button', { className: 'hz-member', onClick: function () { go(props, '/club'); }, title: user.displayName || user.username },
          icon('user', 'hz-ico hz-ico-sm'),
          h('span', { className: 'hz-member-name' }, user.displayName || user.username),
          user && typeof user.credits === 'number' ? h('span', { className: 'hz-member-credits' }, String(user.credits)) : null
        ) : null,
      user ? h('button', { className: 'hz-logout', onClick: function () { logout(props); }, title: tsx(props, 'header.logout', 'LOGOUT') }, icon('logout', 'hz-ico hz-ico-sm'))
          : h('button', { className: 'hz-login', onClick: function () { login(props); } }, tsx(props, 'header.login', 'LOGIN')),
      h('label', { className: 'hz-lang' },
        icon('globe', 'hz-ico hz-ico-sm'),
        h('select', {
          value: lang,
          onChange: function (e) { var v = e && e.target && e.target.value; if (v) setLang(props, v); },
          'aria-label': 'Language'
        }, langOpts)
      )
    );
    return h('header', { className: 'hz-header' },
      h('div', { className: 'hz-header-in' },
        h('button', { className: 'hz-logo', onClick: function () { go(props, '/'); } },
          h('span', { className: 'hz-logo-main' }, 'BAZINO'),
          h('span', { className: 'hz-logo-sub' }, tsx(props, 'header.club', 'GAMING CLUB'))
        ),
        h('nav', { className: 'hz-nav', 'aria-label': 'Main' }, navLinks),
        right
      )
    );
  }

  // ---------- hero (split 3-card) ----------
  function Hero(props) {
    var c = contactInfo(props);
    return h('section', { className: 'hz-hero' },
      h('button', { className: 'hz-hero-card hz-hero-fc', onClick: function () { go(props, '/events'); } },
        h('img', { className: 'hz-hero-img', src: asset(props, 'slide-fc26.jpg'), alt: 'FC Tournament', loading: 'lazy' }),
        h('div', { className: 'hz-hero-veil' }),
        h('div', { className: 'hz-hero-body' },
          h('span', { className: 'hz-hero-tag hz-t-cyan' }, tsx(props, 'hero.fc.tag', 'TOURNAMENT')),
          h('span', { className: 'hz-hero-title' }, tsx(props, 'hero.fc.title', 'FC 24 / FC 26')),
          h('span', { className: 'hz-hero-sub' }, tsx(props, 'hero.fc.sub', 'Weekly FIFA cups - prize pool every week')),
          h('span', { className: 'hz-hero-btn hz-b-cyan' }, tsx(props, 'hero.fc.btn', 'JOIN NOW'))
        )
      ),
      h('button', { className: 'hz-hero-card hz-hero-gta', onClick: function () { go(props, '/events'); } },
        h('img', { className: 'hz-hero-img', src: asset(props, 'slide-city.jpg'), alt: 'GTA VI', loading: 'lazy' }),
        h('div', { className: 'hz-hero-veil' }),
        h('div', { className: 'hz-hero-body' },
          h('span', { className: 'hz-hero-badge' }, tsx(props, 'hero.gta.badge', 'COMING SOON')),
          h('span', { className: 'hz-hero-title hz-hero-title-xl' }, tsx(props, 'hero.gta.title', 'GTA VI')),
          h('span', { className: 'hz-hero-sub' }, tsx(props, 'hero.gta.sub', 'Next-gen open world - play it first at Bazino'))
        )
      ),
      h('button', { className: 'hz-hero-card hz-hero-live', onClick: function () { go(props, '/events'); } },
        h('img', { className: 'hz-hero-img', src: asset(props, 'slide-match.jpg'), alt: 'Live match', loading: 'lazy' }),
        h('div', { className: 'hz-hero-veil' }),
        h('div', { className: 'hz-hero-body' },
          h('span', { className: 'hz-hero-livebadge' }, h('i', { className: 'hz-dot' }), 'LIVE'),
          h('span', { className: 'hz-hero-title' }, tsx(props, 'hero.live.title', 'LIVE MATCH')),
          h('span', { className: 'hz-hero-sub' }, tsx(props, 'hero.live.sub', 'Watch the action on the big wall')),
          h('span', { className: 'hz-hero-btn hz-b-magenta' }, tsx(props, 'hero.live.btn', 'WATCH'))
        )
      ),
      h('div', { className: 'hz-hero-strip' },
        h('span', { className: 'hz-strip-item' }, icon('clock', 'hz-ico hz-ico-sm'), tsx(props, 'contact.open', 'OPEN EVERYDAY'), h('b', null, c.hours)),
        h('span', { className: 'hz-strip-sep' }),
        h('span', { className: 'hz-strip-item' }, icon('pin', 'hz-ico hz-ico-sm'), c.address)
      )
    );
  }

  // ---------- quick access cards ----------
  var QUICK = [
    { key: 'quick.games', path: '/games', ico: 'gamepad', tone: 'cyan', sub: 'quick.games.sub' },
    { key: 'quick.events', path: '/events', ico: 'trophy', tone: 'purple', sub: 'quick.events.sub' },
    { key: 'quick.shop', path: '/shop', ico: 'cart', tone: 'pink', sub: 'quick.shop.sub' },
    { key: 'quick.food', path: '/food', ico: 'burger', tone: 'orange', sub: 'quick.food.sub' },
    { key: 'quick.club', path: '/club', ico: 'crown', tone: 'green', sub: 'quick.club.sub' },
    { key: 'quick.blog', path: '/blog', ico: 'pen', tone: 'blue', sub: 'quick.blog.sub' },
    { key: 'quick.contact', path: '/contact', ico: 'pin', tone: 'magenta', sub: 'quick.contact.sub' }
  ];
  function QuickCards(props) {
    var cards = [];
    for (var i = 0; i < QUICK.length; i++) {
      var q = QUICK[i];
      cards.push(h('button', {
        key: q.path,
        className: 'hz-quick hz-tone-' + q.tone,
        onClick: (function (p) { return function () { go(props, p); }; })(q.path)
      },
        h('span', { className: 'hz-quick-ico' }, icon(q.ico)),
        h('span', { className: 'hz-quick-title' }, tsx(props, q.key, q.key)),
        h('span', { className: 'hz-quick-sub' }, tsx(props, q.sub, q.sub)),
        h('span', { className: 'hz-quick-arrow' }, '\u2192')
      ));
    }
    return h('section', { className: 'hz-section' },
      h('div', { className: 'hz-section-head' },
        h('span', { className: 'hz-section-kicker' }, 'BAZINO'),
        h('h2', { className: 'hz-section-title' }, tsx(props, 'quick.title', 'QUICK ACCESS'))
      ),
      h('div', { className: 'hz-quick-grid' }, cards)
    );
  }

  // ---------- contact strip ----------
  function ContactStrip(props) {
    var c = contactInfo(props);
    return h('section', { className: 'hz-section' },
      h('div', { className: 'hz-section-head' },
        h('span', { className: 'hz-section-kicker' }, 'BAZINO'),
        h('h2', { className: 'hz-section-title' }, tsx(props, 'contact.title', 'FIND US'))
      ),
      h('div', { className: 'hz-contact-grid' },
        h('div', { className: 'hz-contact hz-tone-cyan' },
          h('span', { className: 'hz-contact-ico' }, icon('clock')),
          h('span', { className: 'hz-contact-label' }, tsx(props, 'contact.hours', 'OPENING HOURS')),
          h('b', { className: 'hz-contact-val' }, c.hours),
          h('span', { className: 'hz-contact-sub' }, tsx(props, 'contact.open', 'OPEN EVERYDAY'))
        ),
        h('a', { className: 'hz-contact hz-tone-green', href: c.whatsapp, target: '_blank', rel: 'noreferrer' },
          h('span', { className: 'hz-contact-ico' }, icon('whatsapp')),
          h('span', { className: 'hz-contact-label' }, 'WHATSAPP'),
          h('b', { className: 'hz-contact-val' }, c.phone),
          h('span', { className: 'hz-contact-sub' }, tsx(props, 'contact.wa', 'Chat with us'))
        ),
        h('button', { className: 'hz-contact hz-tone-orange', onClick: function () { go(props, '/contact'); } },
          h('span', { className: 'hz-contact-ico' }, icon('pin')),
          h('span', { className: 'hz-contact-label' }, tsx(props, 'contact.location', 'LOCATION')),
          h('b', { className: 'hz-contact-val hz-contact-val-sm' }, c.address),
          h('span', { className: 'hz-contact-sub' }, tsx(props, 'contact.map', 'View map & directions'))
        ),
        h('a', { className: 'hz-contact hz-tone-magenta', href: c.instagram, target: '_blank', rel: 'noreferrer' },
          h('span', { className: 'hz-contact-ico' }, icon('instagram')),
          h('span', { className: 'hz-contact-label' }, 'INSTAGRAM'),
          h('b', { className: 'hz-contact-val hz-contact-val-sm' }, '@bazinopro'),
          h('span', { className: 'hz-contact-sub' }, tsx(props, 'contact.ig', 'Follow the club life'))
        )
      )
    );
  }

  // ---------- home ----------
  function HomePage(props) {
    return h('div', { className: 'hz-home' },
      Hero(props),
      QuickCards(props),
      ContactStrip(props)
    );
  }

  // ---------- footer ----------
  function Footer(props) {
    var c = contactInfo(props);
    var links = [];
    for (var i = 0; i < NAV.length; i++) {
      var item = NAV[i];
      links.push(h('button', {
        key: 'f' + item.path,
        className: 'hz-foot-link' + (isActive(props, item.path) ? ' is-active' : ''),
        onClick: (function (p) { return function () { go(props, p); }; })(item.path)
      }, tsx(props, item.key, item.key)));
    }
    return h('footer', { className: 'hz-footer' },
      h('div', { className: 'hz-footer-in' },
        h('div', { className: 'hz-foot-brand' },
          h('span', { className: 'hz-logo' },
            h('span', { className: 'hz-logo-main' }, 'BAZINO'),
            h('span', { className: 'hz-logo-sub' }, tsx(props, 'header.club', 'GAMING CLUB'))
          ),
          h('p', { className: 'hz-foot-tag' }, tsx(props, 'footer.tagline', 'GOOD GAMES - BETTER PEOPLE')),
          h('div', { className: 'hz-foot-social' },
            h('a', { href: c.whatsapp, target: '_blank', rel: 'noreferrer', 'aria-label': 'WhatsApp' }, icon('whatsapp', 'hz-ico')),
            h('a', { href: c.instagram, target: '_blank', rel: 'noreferrer', 'aria-label': 'Instagram' }, icon('instagram', 'hz-ico'))
          )
        ),
        h('div', { className: 'hz-foot-nav' },
          h('h4', null, tsx(props, 'footer.links', 'EXPLORE')),
          links
        ),
        h('div', { className: 'hz-foot-contact' },
          h('h4', null, tsx(props, 'footer.contact', 'CONTACT')),
          h('p', { className: 'hz-foot-line' }, icon('clock', 'hz-ico hz-ico-sm'), c.hours, ' - ', tsx(props, 'contact.open', 'OPEN EVERYDAY')),
          h('p', { className: 'hz-foot-line' }, icon('whatsapp', 'hz-ico hz-ico-sm'), c.phone),
          h('p', { className: 'hz-foot-line' }, icon('pin', 'hz-ico hz-ico-sm'), c.address)
        )
      ),
      h('div', { className: 'hz-foot-bar' },
        h('span', null, '\u00A9 ' + new Date().getFullYear() + ' BAZINO GAMING CLUB'),
        h('span', { className: 'hz-foot-bar-tag' }, tsx(props, 'footer.tagline', 'GOOD GAMES - BETTER PEOPLE'))
      )
    );
  }

  // ---------- mobile nav ----------
  var MOBILE = [
    { key: 'nav.home', path: '/', ico: 'swords' },
    { key: 'nav.games', path: '/games', ico: 'gamepad' },
    { key: 'nav.events', path: '/events', ico: 'trophy' },
    { key: 'nav.club', path: '/club', ico: 'crown' },
    { key: 'nav.contact', path: '/contact', ico: 'pin' }
  ];
  function MobileNav(props) {
    var items = [];
    for (var i = 0; i < MOBILE.length; i++) {
      var m = MOBILE[i];
      items.push(h('button', {
        key: 'm' + m.path,
        className: 'hz-mnav-item' + (isActive(props, m.path) ? ' is-active' : ''),
        onClick: (function (p) { return function () { go(props, p); }; })(m.path)
      },
        icon(m.ico, 'hz-ico'),
        h('span', { className: 'hz-mnav-label' }, tsx(props, m.key, m.key))
      ));
    }
    return h('nav', { className: 'hz-mnav', 'aria-label': 'Mobile' }, items);
  }

  // ---------- register ----------
  function def(Comp) {
    return {
      apiVersion: 2,
      render: function (props) { return h(Comp, props || {}); }
    };
  }
  SDK.registerComponent('header', def(Header));
  SDK.registerComponent('footer', def(Footer));
  SDK.registerComponent('mobileNav', def(MobileNav));
  SDK.registerComponent('home', def(HomePage));
  SDK.registerComponent('hub.home', def(HomePage));
  SDK.registerComponent('hero', def(Hero));
})();
