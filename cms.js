/* Imperial Marble Arts - public CMS connector.
   Published rows only; if configuration/network is unavailable, static HTML remains visible. */
(function () {
  'use strict';
  var CFG = window.IMP_CONFIG || {};
  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_PUBLISHABLE_KEY || /YOUR_|xxxx/i.test(CFG.SUPABASE_URL)) return;
  var PREVIEW = /[?&]preview=1/.test(location.search);
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  s.onload = function () { start().catch(function (e) { console.warn('CMS: static content kept.', e && e.message); }); };
  s.onerror = function () { console.warn('CMS: Supabase SDK could not load; static content kept.'); };
  document.head.appendChild(s);
  var $ = function (q, r) { return (r || document).querySelector(q); };
  var $$ = function (q, r) { return Array.prototype.slice.call((r || document).querySelectorAll(q)); };
  function get(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? a : a[k]; }, o); }
  function str(v) { return typeof v === 'string' && v.trim() !== '' ? v.trim() : null; }
  function safeUrl(u) { u = str(u); return u && /^(https?:\/\/|mailto:|tel:|#|\/|\.\/|assets\/|\.\.\/)/i.test(u) ? u : null; }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function digits(v) { return String(v || '').replace(/[^\d]/g, ''); }
  async function start() {
    var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
    var draftMode = false;
    if (PREVIEW) { try { var ses = await sb.auth.getSession(); if (ses.data && ses.data.session) { var a = await sb.rpc('is_admin'); draftMode = a.data === true; } } catch (e) {} }
    async function rows(table, mod) { var q = sb.from(table).select('*'); if (mod) q = mod(q); var r = await q; if (r.error) { console.warn('CMS ' + table + ':', r.error.message); return null; } return r.data || []; }
    var pub = await rows('site_content'), content = {};
    (pub || []).forEach(function (r) { content[r.key] = r.data || {}; });
    if (draftMode) (await rows('site_content_draft') || []).forEach(function (r) { content[r.key] = r.data || {}; });
    var pubFilter = function (q) { return draftMode ? q : q.eq('status', 'published'); };
    var res = await Promise.all([
      rows('categories', function (q) { return q.order('sort_order'); }),
      rows('products', function (q) { return pubFilter(q).order('sort_order'); }),
      rows('product_images', function (q) { return q.order('sort_order'); }),
      rows('services', function (q) { return pubFilter(q).order('sort_order'); }),
      rows('testimonials', function (q) { return pubFilter(q).order('sort_order'); }),
      rows('gallery_items', function (q) { return pubFilter(q).order('sort_order'); }),
      rows('nav_items', function (q) { return q.order('sort_order'); })
    ]);
    var cats = (res[0] || []).filter(function (c) { return c.is_visible !== false; }), prods = res[1] || [], pimgs = res[2] || [], services = res[3] || [], tests = res[4] || [], gal = res[5] || [], nav = (res[6] || []).filter(function (n) { return n.is_visible !== false; });
    applyContent(content); applyCategories(cats, prods); applyProducts(cats, prods, pimgs); applyServices(services); applyTestimonials(tests); applyGallery(gal); applyNav(nav);
    if (draftMode) { var d = el('div', '', 'PREVIEW MODE: showing unpublished draft changes. Visitors do not see this.'); d.setAttribute('style', 'position:fixed;left:0;right:0;top:0;z-index:100002;background:#b8926a;color:#161617;text-align:center;padding:.5rem;font:500 .72rem Jost,sans-serif;letter-spacing:.14em'); document.body.appendChild(d); }
  }
  function applyContent(c) {
    $$('[data-cms]').forEach(function (n) { var path = n.getAttribute('data-cms'); if (path === 'brand.name_html') { var a = str(get(c, 'brand.name_1')), b = str(get(c, 'brand.name_2')); if (a || b) { n.textContent = ''; n.appendChild(document.createTextNode((a || 'Imperial') + ' ')); n.appendChild(el('em', '', b || 'Marble Arts')); } return; } var v = str(get(c, path)); if (v) n.textContent = v; });
    $$('[data-cms-href]').forEach(function (n) { var u = safeUrl(get(c, n.getAttribute('data-cms-href'))); if (u) n.setAttribute('href', u); });
    $$('[data-cms-src]').forEach(function (n) { var u = safeUrl(get(c, n.getAttribute('data-cms-src'))); if (u) n.setAttribute('src', u); });
    var logo = safeUrl(get(c, 'appearance.logo_url')); if (logo) $$('img[data-cms-logo]').forEach(function (i) { i.src = logo; });
    var fav = safeUrl(get(c, 'appearance.favicon_url')); if (fav) { var l = $('link[rel="icon"]'); if (l) l.href = fav; }
    var hv = $('#hv'), vu = safeUrl(get(c, 'hero.video_url')), pu = safeUrl(get(c, 'hero.poster_url')); if (hv && pu) hv.setAttribute('poster', pu); if (hv && vu) { hv.src = vu; hv.load(); var p = hv.play(); if (p && p.catch) p.catch(function () {}); }
    var k = c.contact || {}, phone = str(k.phone), wa = digits(k.whatsapp), em = str(k.email), ad = str(k.address), mp = safeUrl(k.maps), hr = str(k.hours), ig = safeUrl(k.instagram), yt = safeUrl(k.youtube);
    if (phone) { var tel = '+' + (digits(phone).length === 10 ? '91' : '') + digits(phone); $$('a[href^="tel:"]').forEach(function (a) { a.href = 'tel:' + tel; }); $$('[data-ct="phone"]').forEach(function (a) { a.textContent = phone; }); }
    if (wa) { window.WA_NUM = wa; $$('a[href*="wa.me/"]').forEach(function (a) { a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + wa); }); }
    if (em && /^[^\s@<>\"]+@[^\s@<>\"]+\.[^\s@<>\"]+$/.test(em)) { $$('a[href^="mailto:"]').forEach(function (a) { a.href = 'mailto:' + em; }); $$('[data-ct="email"]').forEach(function (a) { a.textContent = em; }); }
    if (ad) $$('[data-ct="address"]').forEach(function (n) { n.textContent = ad; }); if (mp) $$('[data-ct="maps"]').forEach(function (a) { a.href = mp; });
    if (hr) { var row = $('#hoursrow'), h = $('[data-ct="hours"]'); if (row && h) { row.hidden = false; h.textContent = hr; } }
    function social(sel, url) { if (url) $$(sel).forEach(function (a) { a.href = url; }); } social('[data-ct="instagram"]', ig); social('[data-ct="youtube"]', yt);
    var tk = str(get(c, 'header.ticker')); if (tk) $$('.ti').forEach(function (t) { t.textContent = tk; });
    var st = str(get(c, 'seo.title')), sd = str(get(c, 'seo.description')), sk = str(get(c, 'seo.keywords')), so = safeUrl(get(c, 'seo.og_image'));
    function meta(sel, name, attr, val) { var m = $(sel); if (!m) { m = document.createElement('meta'); m.setAttribute(attr, name); document.head.appendChild(m); } m.setAttribute('content', val); }
    if (st) { document.title = st; meta('meta[property="og:title"]', 'og:title', 'property', st); } if (sd) { meta('meta[name="description"]', 'description', 'name', sd); meta('meta[property="og:description"]', 'og:description', 'property', sd); } if (sk) meta('meta[name="keywords"]', 'keywords', 'name', sk); if (so) meta('meta[property="og:image"]', 'og:image', 'property', so);
    var ap = c.appearance || {}, root = document.documentElement.style, map = { accent: ['--tan', '--gd'], accent_light: ['--tan2', '--gd2'], navy: ['--navy', '--dk2'], ink: ['--ink', '--dk'], slate: ['--slate', '--dk3'], sand: ['--sand', '--mk'] };
    Object.keys(map).forEach(function (key) { if (/^#[0-9a-fA-F]{6}$/.test(ap[key] || '')) map[key].forEach(function (v) { root.setProperty(v, ap[key]); }); });
  }
  function applyCategories(cats, prods) { var g = $('#cgrid'); if (!g || !cats.length) return; g.textContent = ''; var has = {}; prods.forEach(function (p) { has[p.category_id] = true; }); cats.forEach(function (c, i) { var a = el('a', 'cc rv in'), href = has[c.id] ? '#products' : 'https://wa.me/' + (window.WA_NUM || '918949431785') + '?text=' + encodeURIComponent(c.name + ' enquiry'); a.href = href; if (!has[c.id]) { a.target = '_blank'; a.rel = 'noopener'; } a.appendChild(el('span', 'cn', ('0' + (i + 1)).slice(-2))); a.appendChild(el('h3', '', c.name)); a.appendChild(el('p', '', c.description || '')); a.appendChild(el('span', 'cg', has[c.id] ? 'View products →' : 'Enquire →')); g.appendChild(a); }); var sel = $('#cfrq'); if (sel) { sel.textContent = ''; cats.forEach(function (c) { sel.appendChild(el('option', '', c.name)); }); sel.appendChild(el('option', '', 'Custom Design')); sel.appendChild(el('option', '', 'Other')); } }
  function priceText(p) { return p.show_price && p.price != null && p.price !== '' ? '₹ ' + Number(p.price).toLocaleString('en-IN') : null; }
  function applyProducts(cats, prods, pimgs) { if (!prods.length) return; var byId = {}; cats.forEach(function (c) { byId[c.id] = c; }); var mand = [], fount = [], other = []; prods.forEach(function (p) { var c = byId[p.category_id], slug = c ? c.slug : '', imgs = pimgs.filter(function (i) { return i.product_id === p.id; }).sort(function (a, b) { return (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0) || a.sort_order - b.sort_order; }).map(function (i) { return i.url; }); if (!imgs.length && p.main_image_url) imgs = [p.main_image_url]; imgs = imgs.filter(safeUrl); if (!imgs.length) return; var pid = 'cms-' + p.id, spec = []; if (p.material) spec.push(['Material', p.material]); if (p.marble_type) spec.push(['Marble Type', p.marble_type]); if (p.dimensions) spec.push(['Dimensions', p.dimensions]); if (priceText(p)) spec.unshift(['Price', priceText(p)]); window.P = window.P || {}; window.P[pid] = { name: p.title, feats: (p.tags && p.tags.length ? p.tags : [p.material || (c && c.name) || 'Marble']).slice(0, 5), desc: p.description || p.short_description || '', wa: encodeURIComponent(p.title).replace(/%20/g, '+'), sizes: [{ s: 'Customizable', p: 'On Request' }], spec: spec.length ? spec : [['Customization', 'Fully bespoke']] }; if (window.SH) window.SH[pid] = imgs[0]; var item = { p: p, c: c, imgs: imgs }; if (/^marble-(mandir|garmandir)/.test(slug)) mand.push(item); else if (slug === 'marble-fountains') fount.push(item); else other.push(item); });
    function fill(track, list) { if (!track || !list.length) return; track.textContent = ''; list.forEach(function (i) { var art = el('article', 'pc'); art.setAttribute('data-pid', 'cms-' + i.p.id); art.setAttribute('data-cat', i.p.category_id || ''); var pcs = el('div', 'pcs'); i.imgs.forEach(function (u, j) { var d = el('div', 'ms' + (j === 0 ? ' on ct' : '')), im = document.createElement('img'); im.src = u; im.alt = i.p.title + ', Imperial Marble Arts'; im.loading = 'lazy'; d.appendChild(im); pcs.appendChild(d); }); art.appendChild(pcs); var b = el('div', 'pcb2'); b.appendChild(el('span', 'pcl', [i.c && i.c.name, i.p.material].filter(Boolean).join(' · '))); b.appendChild(el('h3', '', i.p.title)); b.appendChild(el('p', '', i.p.short_description || '')); var pr = priceText(i.p); if (pr) b.appendChild(el('span', 'pcl', pr)); var act = el('div', 'pca'), vb = el('button', '', 'View Details'); vb.addEventListener('click', function (e) { if (window.oPD) window.oPD('cms-' + i.p.id, e); }); var wa = el('a', '', 'Enquire on WhatsApp'); wa.href = 'https://wa.me/' + (window.WA_NUM || '918949431785') + '?text=' + encodeURIComponent(i.p.title + ' enquiry'); wa.target = '_blank'; wa.rel = 'noopener'; act.appendChild(vb); act.appendChild(wa); b.appendChild(act); art.appendChild(b); track.appendChild(art); }); }
    fill($('#mt'), mand); fill($('#ft'), fount); var grid = $('#pgrid'); if (grid && other.length) { fill(grid, other); var tabs = $('#ptabs'); if (tabs) { tabs.textContent = ''; var all = el('button', 'on', 'All'); all.onclick = function () { $$('#pgrid .pc').forEach(function (x) { x.style.display = ''; }); }; tabs.appendChild(all); cats.forEach(function (c) { if (!other.some(function (i) { return i.p.category_id === c.id; })) return; var b = el('button', '', c.name); b.onclick = function () { $$('#pgrid .pc').forEach(function (x) { x.style.display = x.getAttribute('data-cat') === c.id ? '' : 'none'; }); }; tabs.appendChild(b); }); } }
    if (window.initSliders) window.initSliders(document);
  }
  function applyServices(list) { var g = $('#whyg'); if (!g || !list.length) return; g.textContent = ''; list.forEach(function (s, i) { var c = el('div', 'wcard rvc in'); c.style.transitionDelay = (i * .06) + 's'; c.appendChild(el('span', 'wi', (s.icon || '✦').slice(0, 4))); c.appendChild(el('div', 'wn', s.title)); c.appendChild(el('p', 'wt', s.description || '')); g.appendChild(c); }); }
  function applyTestimonials(list) { var g = $('#rg'); if (!g || !list.length) return; g.textContent = ''; list.forEach(function (t) { var c = el('div', 'rc2 rv in'); c.appendChild(el('span', 'qm', '“')); c.appendChild(el('p', '', t.message)); c.appendChild(el('b', '', (t.rating ? '★'.repeat(Math.max(1, Math.min(5, t.rating | 0))) + '  ' : '') + t.name + (t.location ? ' · ' + t.location : ''))); g.appendChild(c); }); }
  function applyGallery(list) { var m = $('#gmas'); if (!m || !list.length) return; m.textContent = ''; list.forEach(function (g) { var u = safeUrl(g.image_url); if (!u) return; var f = el('figure'), im = document.createElement('img'); im.src = u; im.alt = g.caption || 'Imperial Marble Arts work'; im.loading = 'lazy'; f.appendChild(im); if (g.caption) f.appendChild(el('figcaption', '', g.caption)); f.addEventListener('click', function () { var b = $('#glb'); if (b) { $('img', b).src = u; b.classList.add('o'); } }); m.appendChild(f); }); var b = $('#glb'); if (b) b.onclick = function () { b.classList.remove('o'); }; }
  function applyNav(list) { var head = list.filter(function (n) { return n.location !== 'footer' && safeUrl(n.url); }); if (!head.length) return; function build(parent, mobile) { if (!parent) return; parent.textContent = ''; head.forEach(function (n) { var a = el('a', '', n.label); a.href = n.url; if (/^https?:/.test(n.url)) { a.target = '_blank'; a.rel = 'noopener'; } if (mobile) a.addEventListener('click', function () { if (window.tMob) window.tMob(); }); parent.appendChild(a); }); } build($('#navl'), false); build($('#mnav'), true); }
})();
