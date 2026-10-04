/* Costos y precios — lógica principal */
(function () {
  'use strict';
  const { money, moneyFine, moneyShort, parseMoney, moneyInput, parseNum, num, today, isoDate, dmy, daysSince, norm, esc } = window.F;
  const { UNIDADES, uf, ubase, compatibles, costoBase, analyze, unidadesPara, descuentoMax, redondear } = window.C;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  /* ---------------- Valores iniciales ---------------- */
  const DEF_TALLER = {
    valorHora: 0, impuestoPct: 0, medioMin: 'm-mp', medioMay: 'm-transferencia',
    prorrateo: 'unidades', redondeo: 100, modo: 'margen', objMin: 45, objMay: 25
  };
  const DEF_MEDIOS = [
    { id: 'm-efectivo', nombre: 'Efectivo', pct: 0 },
    { id: 'm-transferencia', nombre: 'Transferencia', pct: 0 },
    { id: 'm-mp', nombre: 'Mercado Pago (cobro al instante)', pct: 7.61 },
    { id: 'm-tarjeta', nombre: 'Tarjeta de crédito', pct: 4.5 }
  ];
  const SUG_FIJOS = ['Alquiler del taller', 'Luz', 'Gas', 'Internet', 'Monotributo', 'Puesto en la feria', 'Publicidad'];

  /* ---------------- Estado ---------------- */
  const S = {
    insumos: [], productos: [], fijos: [], medios: [], taller: {}, combos: [],
    settings: { tema: 'auto', ultimaCopia: null },
    view: 'inicio', param: null, A: null,
    qIns: '', peCanal: 'min',
    t: {
      tool: 'equilibrio',
      simProd: '*', simIns: '*', simInsPct: null, simPrecioPct: null, simUnidades: null,
      metaMonto: null, metaProd: '*',
      rankBy: 'unidad',
      combo: { id: null, nombre: '', items: [], extra: 0, desc: 10, canal: 'min' },
      descProd: null, descCanal: 'min', descPct: 10
    }
  };

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const saveKV = k => DB.set(k, S[k]);
  const byName = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  const insumo = id => S.insumos.find(i => i.id === id);
  const producto = id => S.productos.find(p => p.id === id);
  const pctTxt = (x, d) => (x == null || !isFinite(x)) ? '—' : num(x * 100, d == null ? 1 : d) + ' %';
  const unidTxt = u => (UNIDADES[u] || UNIDADES.u).nombre;
  const cantTxt = (c, u) => num(c) + ' ' + unidTxt(u);
  const plural = (n, s, p) => n === 1 ? s : (p || s + 's');
  const ceil = n => isFinite(n) ? Math.ceil(n - 1e-9) : Infinity;
  const usos = id => S.productos.filter(p => (p.items || []).some(it => it.insumoId === id));

  /* ---------------- Glosario ---------------- */
  const GLOS = {
    margen: ['el margen', 'De cada $ 100 que cobrás, cuántos te quedan de ganancia. Se calcula <b>sobre el precio</b>. Margen 30 % = de un precio de $ 1.000, ganás $ 300.'],
    markup: ['el markup', 'Cuánto le sumás al costo. Se calcula <b>sobre el costo</b>. Markup 50 % = a algo que te cuesta $ 1.000 le sumás $ 500 y lo vendés a $ 1.500.'],
    margenMarkup: ['la diferencia entre margen y markup', 'Son la misma ganancia mirada desde dos lados. Si algo te cuesta $ 1.000 y lo vendés a $ 1.500, ganás $ 500: <br>• <b>Markup</b> = 500 ÷ 1.000 = 50 % (sobre el costo).<br>• <b>Margen</b> = 500 ÷ 1.500 = 33 % (sobre el precio).<br>El margen siempre da más bajo. Un markup de 100 % es un margen de 50 %. Ojo: si querés ganar 50 % de margen, no alcanza con sumar 50 % al costo.'],
    equilibrio: ['el punto de equilibrio', 'Lo mínimo que tenés que vender en el mes para no perder plata: ahí cubrís todos tus costos y la ganancia es cero. Cada unidad que vendas arriba de ese número ya es ganancia.'],
    contribucion: ['la contribución', 'Lo que te deja cada unidad después de pagar sus materiales, tu tiempo y las comisiones. Esa plata es la que va juntando para pagar los costos fijos; cuando ya los cubriste, es ganancia.'],
    fijos: ['un costo fijo', 'Lo que pagás todos los meses, vendas mucho o poco: alquiler, luz, internet, monotributo, el puesto en la feria. Los <b>variables</b>, en cambio, crecen con cada unidad que hacés (materiales, packaging, comisiones).'],
    prorrateo: ['el prorrateo', 'Repartir los costos fijos del mes entre las unidades que hacés. Si tus fijos son $ 100.000 y hacés 200 unidades, a cada una le toca $ 500. Por eso, cuanto más producís, menos fijo carga cada unidad.'],
    neto: ['lo que te queda neto', 'El precio menos lo que se lleva el medio de cobro (Mercado Pago, tarjeta) y los impuestos sobre la venta. Es la plata que realmente entra.'],
    merma: ['la merma', 'Lo que se pierde al producir: masa que sobra, varillas que se rompen, esencia que se evapora. Se suma al costo de los materiales.'],
    mezcla: ['la mezcla de ventas', 'Como vendés varios productos, el punto de equilibrio se calcula con la proporción en que los vendés (la “mezcla”). Si cambia la mezcla —por ejemplo, vendés más de lo que deja menos—, cambia el punto.']
  };
  const explica = (k, open) => `<details class="explica"${open ? ' open' : ''}><summary>¿Qué es ${GLOS[k][0]}?</summary><p>${GLOS[k][1]}</p></details>`;

  /* ---------------- Diálogos (con botón "atrás" del celular) ---------------- */
  const dlgStack = [];
  let ignorePop = 0;
  function openDlg(d) {
    if (d._finishClose) d._finishClose();
    if (d.open) return;
    d.style.transform = '';
    d.showModal();
    dlgStack.push(d);
    history.pushState({ dlg: dlgStack.length }, '');
  }
  /** Cierra con animación de salida (deslizándose hacia abajo o achicándose) */
  function closeDlg(d) {
    if (!d.open || d._finishClose) return;
    if (calm()) { d.close(); return; }
    let done = false;
    d._finishClose = () => {
      if (done) return;
      done = true;
      d._finishClose = null;
      d.classList.remove('closing');
      d.style.transform = '';
      if (d.open) d.close();
    };
    d.classList.add('closing');
    d.addEventListener('animationend', d._finishClose, { once: true });
    setTimeout(d._finishClose, 420);
  }

  /* Hojas: se pueden cerrar arrastrándolas hacia abajo desde el encabezado */
  $$('dialog.sheet').forEach(d => {
    const head = $('.sheet__head', d);
    let y0 = null, dy = 0, t0 = 0;
    head.style.touchAction = 'none';
    head.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || window.matchMedia('(min-width: 600px)').matches) return;
      y0 = e.clientY; dy = 0; t0 = performance.now();
      d.classList.add('dragging');
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener('pointermove', e => {
      if (y0 == null) return;
      dy = Math.max(0, e.clientY - y0);
      d.style.transform = `translateY(${dy}px)`;
    });
    const end = () => {
      if (y0 == null) return;
      y0 = null;
      d.classList.remove('dragging');
      const fast = dy / Math.max(1, performance.now() - t0) > 0.6;
      if (dy > 120 || (fast && dy > 30)) closeDlg(d);
      else d.style.transform = '';
    };
    head.addEventListener('pointerup', end);
    head.addEventListener('pointercancel', end);
  });
  $$('dialog').forEach(d => {
    d.addEventListener('close', () => {
      const i = dlgStack.lastIndexOf(d);
      if (i !== -1) {
        dlgStack.splice(i, 1);
        ignorePop++;
        history.back();
      }
    });
    d.addEventListener('cancel', e => { e.preventDefault(); closeDlg(d); });
    d.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) closeDlg(d);
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (e.clientY < r.top || e.clientY > r.bottom || e.clientX < r.left || e.clientX > r.right) closeDlg(d);
      }
    });
  });
  window.addEventListener('popstate', () => {
    if (ignorePop) { ignorePop--; return; }
    const top = dlgStack.pop();
    if (top && top.open) closeDlg(top); // ya no está en la pila: no vuelve a tocar el historial
  });

  function confirmBox(title, text, okLabel, danger) {
    const d = $('#dlgConfirm');
    $('#dlgConfirmTitle').textContent = title;
    $('#dlgConfirmText').textContent = text;
    const ok = $('#dlgConfirmOk');
    ok.textContent = okLabel || 'Sí, borrar';
    ok.className = 'btn ' + (danger === false ? 'btn--primary' : 'btn--danger');
    openDlg(d);
    return new Promise(res => {
      let done = false;
      const cancel = d.querySelector('button[value="cancel"]');
      const finish = v => {
        if (done) return;
        done = true;
        ok.onclick = cancel.onclick = null;
        closeDlg(d);
        res(v);
      };
      ok.onclick = e => { e.preventDefault(); finish(true); };
      cancel.onclick = e => { e.preventDefault(); finish(false); };
      d.addEventListener('close', () => finish(false), { once: true });
    });
  }

  /* ---------------- Toast ---------------- */
  let toastT;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
    if (action) t.querySelector('button').onclick = () => { t.classList.remove('show'); action.fn(); };
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), action ? 7000 : 3200);
  }

  /* ---------------- Controles genéricos ---------------- */
  function setSeg(el, v) {
    $$('button', el).forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === String(v == null ? '' : v))));
  }
  const getSeg = el => { const b = $('button[aria-checked="true"]', el); return b ? b.dataset.v : ''; };
  document.addEventListener('click', e => {
    const b = e.target.closest('.seg button');
    if (!b) return;
    const seg = b.closest('.seg');
    setSeg(seg, b.dataset.v);
    seg.dispatchEvent(new CustomEvent('segchange', { bubbles: true, detail: b.dataset.v }));
  });
  // Montos: al salir del campo se muestran con formato argentino
  document.addEventListener('blur', e => {
    const el = e.target;
    if (!el.matches || !el.matches('[data-money]')) return;
    const v = parseMoney(el.value);
    if (v != null) el.value = moneyInput(v);
  }, true);
  const moneyField = el => { const v = parseMoney(el.value); return v == null ? null : v; };

  /* ---------------- Tema ---------------- */
  function applyTheme() {
    const t = S.settings.tema;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  const isDark = () => getComputedStyle(document.documentElement).colorScheme === 'dark';
  $('#btnTheme').addEventListener('click', () => {
    S.settings.tema = isDark() ? 'light' : 'dark';
    applyTheme(); saveKV('settings');
  });

  /* ---------------- Navegación ---------------- */
  const VIEWS = ['inicio', 'insumos', 'productos', 'producto', 'herramientas', 'taller'];
  const TOOLS = [
    ['equilibrio', 'Equilibrio'], ['simulador', '¿Qué pasa si…?'], ['meta', 'Meta de ganancia'],
    ['ranking', 'Ranking'], ['combos', 'Combos'], ['descuentos', 'Descuentos']
  ];
  function go() {
    let [view, param] = location.hash.slice(1).split('/');
    param = param ? decodeURIComponent(param) : null;
    if (!VIEWS.includes(view)) view = 'inicio';
    if (view === 'producto' && !producto(param)) { view = 'productos'; param = null; }
    const changed = view !== S.view || param !== S.param;
    const prevView = S.view, prevTool = S.t.tool;
    const sameTools = view === 'herramientas' && prevView === 'herramientas';
    if (view === 'herramientas' && param && TOOLS.some(t => t[0] === param)) S.t.tool = param;
    S.view = view; S.param = param;
    document.body.dataset.view = view;
    VIEWS.forEach(v => { $('#view-' + v).hidden = v !== view; });
    const tab = view === 'producto' ? 'productos' : view;
    $$('.tabs a').forEach(a => {
      if (a.dataset.view === tab) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    $('.tabs').style.setProperty('--tab', ['inicio', 'insumos', 'productos', 'herramientas', 'taller'].indexOf(tab));
    $('#btnBack').hidden = view !== 'producto';
    $('#topMark').hidden = view === 'producto';
    $('#fab').hidden = !(view === 'insumos' || view === 'productos');
    $('#fab').setAttribute('aria-label', view === 'insumos' ? 'Agregar insumo' : 'Agregar producto');
    render();
    if (!changed) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (sameTools) {
      const ti = k => TOOLS.findIndex(t => t[0] === k);
      animateIn($('#toolBody'), ti(S.t.tool) >= ti(prevTool) ? 'fwd' : 'back');
    } else {
      animateIn($('#view-' + view), (ORDER[view] || 0) >= (ORDER[prevView] || 0) ? 'fwd' : 'back');
    }
  }

  /* ---------------- Movimiento ---------------- */
  const ORDER = { inicio: 0, insumos: 1, productos: 2, producto: 2.5, herramientas: 3, taller: 4 };
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** Entrada de una pantalla: los bloques llegan deslizándose uno detrás de otro */
  function animateIn(el, dir) {
    if (!el || calm()) return;
    el.classList.remove('enter-fwd', 'enter-back');
    [...el.children].forEach((c, i) => c.style.setProperty('--i', Math.min(i, 10)));
    void el.offsetWidth;
    el.classList.add('enter-' + dir);
    clearTimeout(el._enterT);
    el._enterT = setTimeout(() => el.classList.remove('enter-fwd', 'enter-back'), 1400);
    $$('[data-count]', el).forEach(countUp);
  }
  /** Los montos grandes cuentan desde cero */
  function countUp(el) {
    const end = +el.dataset.count, noCents = el.dataset.nocents === '1';
    const t0 = performance.now(), dur = 750;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = money(end * e, { noCents });
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  window.addEventListener('hashchange', go);
  $('#btnBack').addEventListener('click', () => { location.hash = '#productos'; });
  $('#fab').addEventListener('click', () => {
    if (S.view === 'insumos') openInsumo(null);
    else openProducto(null);
  });

  function render() {
    S.A = analyze(S);
    renderBanners();
    const v = S.view;
    if (v === 'inicio') renderInicio();
    else if (v === 'insumos') renderInsumos();
    else if (v === 'productos') renderProductos();
    else if (v === 'producto') renderProducto(S.param);
    else if (v === 'herramientas') renderHerramientas();
    else renderTaller();
    $('#viewTitle').textContent = v === 'producto' ? producto(S.param).nombre : $('#view-' + v).dataset.title;
    Charts.bindTips($('#view-' + v));
  }
  /** Re-render que no salta arriba de la página */
  function refresh() { const y = window.scrollY; render(); window.scrollTo({ top: y, behavior: 'instant' }); }

  /* ---------------- Estados de precio ---------------- */
  const ESTADOS = {
    ok: ['Bien', 'ok'],
    flojo: ['Ganancia baja', 'warn'],
    bajo: ['Debajo del costo', 'bad'],
    perdida: ['Perdés plata', 'bad'],
    sinprecio: ['Sin precio', 'none']
  };
  const badge = e => `<span class="badge badge--${ESTADOS[e][1]}">${ESTADOS[e][0]}</span>`;
  function estadoTexto(r) {
    const m = r.canales.min, w = r.canales.may;
    const parts = [];
    [['minorista', m], ['mayorista', w]].forEach(([n, c]) => {
      if (c.estado === 'perdida') parts.push(`a precio ${n} no cubre ni los materiales ni tu tiempo`);
      else if (c.estado === 'bajo') parts.push(`a precio ${n} no cubre el costo total`);
      else if (c.estado === 'flojo') parts.push(`a precio ${n} gana menos de lo que buscás (sugerido ${money(c.sugerido, { noCents: true })})`);
    });
    return parts.join('; ');
  }

  /* ---------------- Avisos ---------------- */
  function renderBanners() {
    const el = $('#banners');
    const out = [];
    if (DB.isMemory()) {
      out.push(`<div class="banner banner--bad"><div class="banner__body"><strong>Este navegador no deja guardar datos</strong>Lo que cargues se pierde al cerrar. Abrí la app en Chrome o instalala.</div></div>`);
    }
    const hayDatos = S.insumos.length || S.productos.length;
    const dias = daysSince(S.settings.ultimaCopia);
    if (hayDatos && dias > 30 && (S.view === 'inicio' || S.view === 'taller')) {
      out.push(`<div class="banner"><div class="banner__body"><strong>${S.settings.ultimaCopia ? 'Hace ' + dias + ' días que no guardás una copia' : 'Todavía no guardaste una copia'}</strong>Tus datos viven solo en este celular. Guardá una copia por si lo perdés o lo cambiás.<div class="row-actions"><button class="btn btn--primary" type="button" data-act="backup">Guardar copia</button></div></div></div>`);
    }
    el.innerHTML = out.join('');
  }
  $('#banners').addEventListener('click', e => {
    const b = e.target.closest('[data-act="backup"]');
    if (b) downloadBackup();
  });

  /* =============================== INICIO =============================== */
  function renderInicio() {
    const el = $('#view-inicio');
    const A = S.A, T = A.totals;
    if (!S.insumos.length && !S.productos.length) {
      el.innerHTML = `
        <div class="card welcome">
          <span class="mark m-flor" aria-hidden="true"></span>
          <h2>Hola 👋</h2>
          <p>Esta app te ayuda a saber <b>cuánto te cuesta</b> hacer cada producto, <b>a cuánto venderlo</b> y <b>cuánto tenés que vender</b> por mes para que te rinda.</p>
          <ol class="steps">
            <li><b>Cargá tus insumos</b> con el precio del paquete. La app calcula cuánto sale cada gramo, mililitro o unidad.</li>
            <li><b>Armá tus productos</b>: elegí los insumos y cuánto usás de cada uno.</li>
            <li><b>Completá Mi taller</b>: lo que vale tu hora y tus costos fijos del mes.</li>
          </ol>
          <div class="row-actions">
            <a class="btn btn--primary" href="#insumos">Empezar con los insumos</a>
            <button class="btn btn--ghost" type="button" data-act="ejemplo">Ver un ejemplo con sahumerios</button>
          </div>
          <p class="small muted mt">Todo queda guardado en este celular. No hace falta internet ni cuenta.</p>
        </div>
        ${glosarioCard()}`;
      return;
    }

    const problemas = A.rows.filter(r => ['perdida', 'bajo', 'flojo'].includes(r.estado))
      .sort((a, b) => ['perdida', 'bajo', 'flojo'].indexOf(a.estado) - ['perdida', 'bajo', 'flojo'].indexOf(b.estado));
    const sinVentas = T.unidades === 0;
    const ultima = S.insumos.reduce((a, i) => (i.actualizado || '') > a ? i.actualizado : a, '');

    let hero;
    if (sinVentas) {
      hero = `<div class="hero">
        <p class="eyebrow">Tu mes</p>
        <p class="hero__value hero__value--sm">Contame cuánto vendés</p>
        <p class="hero__sub">Cargá en cada producto cuántas unidades vendés por mes (minorista y mayorista) para ver tu ganancia del mes y tu punto de equilibrio.</p>
        <span class="mark m-espiral hero__deco" aria-hidden="true"></span>
      </div>`;
    } else {
      hero = `<div class="hero">
        <p class="eyebrow">Ganancia estimada por mes</p>
        <p class="hero__value num" data-count="${Math.round(T.ganancia)}" data-nocents="1">${money(T.ganancia, { noCents: true })}</p>
        <p class="hero__sub">Con ${num(T.unidades, 0)} unidades al mes · ${num(T.horas, 1)} h de trabajo${S.taller.valorHora ? ' (tu sueldo de ' + money(T.manoObraMes, { noCents: true }) + ' ya está descontado)' : ''}</p>
        <div class="hero__split">
          <div><p class="lbl">Facturás</p><p class="val num">${money(T.facturacion, { noCents: true })}</p></div>
          <div><p class="lbl">Costos fijos</p><p class="val num">${money(T.F, { noCents: true })}</p></div>
        </div>
        <span class="mark m-espiral hero__deco" aria-hidden="true"></span>
      </div>`;
    }

    let pe = '';
    if (!sinVentas) {
      const cob = Math.min(1, T.cobertura);
      pe = `<div class="card">
        <div class="card__head"><h2>Punto de equilibrio</h2><a class="link" href="#herramientas/equilibrio">Ver detalle</a></div>
        ${isFinite(T.peUnidades)
          ? `<p>Para cubrir tus costos tenés que vender <b class="num">${num(ceil(T.peUnidades), 0)} unidades</b> por mes, o sea facturar <b class="num">${money(T.pePesos, { noCents: true })}</b>.</p>
             <div class="meter" role="img" aria-label="Cubrís el ${Math.round(T.cobertura * 100)} % de los costos fijos"><div class="meter__fill ${T.cobertura >= 1 ? '' : 'meter__fill--warn'}" style="width:${(cob * 100).toFixed(1)}%"></div></div>
             <p class="small ${T.cobertura >= 1 ? 'pos' : 'neg'}">${T.F === 0 ? 'No cargaste costos fijos todavía.' : T.cobertura >= 1 ? `Con lo que estimás vender lo superás: cubrís ${pctTxt(T.cobertura, 0)} de tus fijos.` : `Con lo que estimás vender cubrís solo ${pctTxt(T.cobertura, 0)} de tus fijos.`}</p>`
          : `<p class="neg">Con los precios actuales, cada venta no alcanza a pagar sus propios costos: no hay punto de equilibrio. Revisá los precios.</p>`}
        ${explica('equilibrio')}
      </div>`;
    }

    const alertas = problemas.length ? `<div class="card">
        <div class="card__head"><h2>Revisá estos precios</h2></div>
        <ul class="alert-list">${problemas.map(r => `<li><a href="#producto/${encodeURIComponent(r.p.id)}">
          <span class="alert-list__name">${esc(r.p.nombre)}</span>${badge(r.estado)}
          <span class="alert-list__txt">${esc(estadoTexto(r))}</span></a></li>`).join('')}</ul>
      </div>` : (S.productos.length ? `<div class="card ok-card"><p>✓ Todos tus productos cubren sus costos con la ganancia que buscás.</p></div>` : '');

    el.innerHTML = `
      ${hero}
      ${alertas}
      ${pe}
      <div class="stats mt">
        <a class="stat" href="#insumos"><p class="stat__lbl">Insumos</p><p class="stat__val">${S.insumos.length}</p></a>
        <a class="stat" href="#productos"><p class="stat__lbl">Productos</p><p class="stat__val">${S.productos.length}</p></a>
        <a class="stat" href="#taller"><p class="stat__lbl">Tu hora</p><p class="stat__val num">${S.taller.valorHora ? money(S.taller.valorHora, { noCents: true }) : '—'}</p></a>
        <div class="stat"><p class="stat__lbl">Últimos precios</p><p class="stat__val">${ultima ? (daysSince(ultima) === 0 ? 'hoy' : 'hace ' + daysSince(ultima) + ' d') : '—'}</p></div>
      </div>
      <div class="row-actions">
        ${S.insumos.length ? '<button class="btn btn--primary" type="button" data-act="bulk">Actualizar precios de insumos</button>' : ''}
        <button class="btn btn--ghost" type="button" data-act="nuevo-prod">Nuevo producto</button>
      </div>
      ${glosarioCard()}`;
  }

  function glosarioCard() {
    return `<div class="card">
      <div class="card__head"><h2>Palabras que vas a ver</h2></div>
      ${['margenMarkup', 'margen', 'markup', 'equilibrio', 'contribucion', 'fijos', 'prorrateo', 'neto', 'merma', 'mezcla'].map(k => explica(k)).join('')}
    </div>`;
  }

  /* =============================== INSUMOS =============================== */
  function insumoMeta(i) {
    const cm = C.costoMostrable(i);
    return cm.map(x => `<b>${moneyFine(x.v)}</b> / ${x.u}`).join(' · ');
  }
  function variacion(i) {
    const h = i.historial || [];
    if (h.length < 2) return null;
    const a = costoBase(h[h.length - 2]), b = costoBase(h[h.length - 1]);
    return a ? b / a - 1 : null;
  }
  function renderInsumos() {
    const el = $('#view-insumos');
    if (!S.insumos.length) {
      el.innerHTML = `<div class="empty"><span class="mark m-estrella" aria-hidden="true"></span>
        <p><b>Todavía no cargaste insumos.</b></p>
        <p>Cargá cada materia prima con el precio y lo que trae el paquete: masa, esencias, varillas, bolsas, etiquetas…</p>
        <div class="row-actions center"><button class="btn btn--primary" type="button" data-act="nuevo-ins">Cargar el primero</button></div></div>`;
      return;
    }
    el.innerHTML = `
      <div class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
        <input type="search" id="qIns" placeholder="Buscar insumo…" aria-label="Buscar insumos" autocomplete="off" value="${esc(S.qIns)}">
      </div>
      <div class="row-actions">
        <button class="btn btn--primary btn--sm" type="button" data-act="bulk">Actualizar precios</button>
        <button class="btn btn--ghost btn--sm" type="button" data-act="nuevo-ins">+ Insumo</button>
      </div>
      <p class="help mt">Cuando algo aumente, cambiale el precio: todos los productos que lo usan se recalculan solos.</p>
      <div id="insList" class="list"></div>`;
    renderInsList();
    $('#qIns').addEventListener('input', e => { S.qIns = e.target.value; renderInsList(); });
  }
  function renderInsList() {
    const q = norm(S.qIns);
    const list = S.insumos.filter(i => !q || norm(i.nombre + ' ' + (i.categoria || '') + ' ' + (i.proveedor || '')).includes(q)).sort(byName);
    const groups = {};
    list.forEach(i => { const g = i.categoria || 'Sin categoría'; (groups[g] = groups[g] || []).push(i); });
    const keys = Object.keys(groups).sort((a, b) => a === 'Sin categoría' ? 1 : b === 'Sin categoría' ? -1 : a.localeCompare(b, 'es'));
    $('#insList').innerHTML = list.length ? keys.map(g => `<h3 class="group-title">${esc(g)}</h3>` + groups[g].map(i => {
      const v = variacion(i);
      const n = usos(i.id).length;
      return `<button class="item" type="button" data-act="ins" data-id="${esc(i.id)}">
        <span class="item__main">
          <span class="item__title">${esc(i.nombre)}</span>
          <span class="item__meta">${money(i.precio)} el paquete de ${cantTxt(i.cantidad, i.unidad)}${i.actualizado ? ' · ' + dmy(i.actualizado) : ''}</span>
          <span class="item__meta">${n ? 'En ' + n + ' ' + plural(n, 'producto') : 'Sin usar todavía'}${v != null && Math.abs(v) > 0.0005 ? ` · <span class="${v > 0 ? 'neg' : 'pos'}">${v > 0 ? '▲' : '▼'} ${pctTxt(Math.abs(v))}</span> la última vez` : ''}</span>
        </span>
        <span class="item__side">${insumoMeta(i)}</span>
      </button>`;
    }).join('')).join('') : '<p class="empty">No encontré insumos con esa búsqueda.</p>';
  }

  /* ---------- Hoja de insumo ---------- */
  let editIns = null;
  function insumoDraft() {
    return {
      precio: parseMoney($('#iPrecio').value),
      cantidad: parseNum($('#iCantidad').value),
      unidad: getSeg($('#iUnidad')) || 'g'
    };
  }
  function updIns() {
    const d = insumoDraft();
    const out = $('#iCalc');
    if (d.precio > 0 && d.cantidad > 0) {
      out.innerHTML = 'Te sale ' + C.costoMostrable(d).map(x => `<b>${moneyFine(x.v)}</b> ${x.u === 'u.' ? 'cada unidad' : 'el ' + ({ g: 'gramo', kg: 'kilo', ml: 'mililitro', l: 'litro' }[x.u])}`).join(' · ');
    } else out.textContent = 'Cargá el precio y la cantidad para ver cuánto sale cada unidad.';
  }
  ['#iPrecio', '#iCantidad'].forEach(s => $(s).addEventListener('input', updIns));
  $('#iUnidad').addEventListener('segchange', updIns);

  function openInsumo(id, preset) {
    const i = id ? insumo(id) : null;
    editIns = i;
    $('#dlgInsumoTitle').textContent = i ? 'Editar insumo' : 'Nuevo insumo';
    $('#iNombre').value = i ? i.nombre : (preset || '');
    $('#iPrecio').value = i ? moneyInput(i.precio) : '';
    $('#iCantidad').value = i ? num(i.cantidad) : '';
    setSeg($('#iUnidad'), i ? i.unidad : 'g');
    $('#iCategoria').value = i ? (i.categoria || '') : '';
    $('#iProveedor').value = i ? (i.proveedor || '') : '';
    $('#iFecha').value = today();
    $('#iErr').textContent = '';
    $('#iBorrar').hidden = !i;
    $('#catsInsumo').innerHTML = [...new Set(S.insumos.map(x => x.categoria).filter(Boolean))].sort().map(c => `<option value="${esc(c)}">`).join('');
    // Historial
    const h = i ? (i.historial || []) : [];
    let hh = '';
    if (h.length) {
      const pts = h.map(x => ({ label: dmy(x.fecha), v: costoBase(x), tip: money(x.precio) + ' × ' + cantTxt(x.cantidad, x.unidad) }));
      hh = `<h3 class="form-sub">Historial de precios</h3>
        ${Charts.spark(pts)}
        <div class="tbl-wrap"><table class="tbl">
          <thead><tr><th>Fecha</th><th>Paquete</th><th>Por ${unidTxt(ubase(i.unidad))}</th><th>Cambio</th></tr></thead>
          <tbody>${h.slice().reverse().map((x, k, arr) => {
            const prev = arr[k + 1];
            const v = prev && costoBase(prev) ? costoBase(x) / costoBase(prev) - 1 : null;
            return `<tr><td>${dmy(x.fecha)}</td><td>${money(x.precio)}<br><span class="muted small">${cantTxt(x.cantidad, x.unidad)}</span></td><td>${moneyFine(costoBase(x))}</td><td class="${v > 0 ? 'neg' : v < 0 ? 'pos' : ''}">${v == null ? '—' : (v > 0 ? '+' : '') + pctTxt(v)}</td></tr>`;
          }).join('')}</tbody>
        </table></div>
        ${h.length > 1 ? `<p class="small muted">Desde el ${dmy(h[0].fecha)} subió ${pctTxt(costoBase(h[h.length - 1]) / costoBase(h[0]) - 1)}.</p>` : ''}`;
    }
    $('#iHistorial').innerHTML = hh;
    updIns();
    openDlg($('#dlgInsumo'));
    Charts.bindTips($('#iHistorial'));
    if (!i) setTimeout(() => $('#iNombre').focus(), 60);
  }

  $('#formInsumo').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#iNombre').value.trim();
    const d = insumoDraft();
    const err = $('#iErr');
    if (!nombre) { err.textContent = 'Poné un nombre.'; $('#iNombre').focus(); return; }
    if (!(d.precio > 0)) { err.textContent = 'Poné el precio que pagaste.'; $('#iPrecio').focus(); return; }
    if (!(d.cantidad > 0)) { err.textContent = 'Poné cuánto trae el paquete.'; $('#iCantidad').focus(); return; }
    const fecha = $('#iFecha').value || today();
    const i = editIns;
    if (i && ubase(i.unidad) !== ubase(d.unidad) && usos(i.id).length) {
      err.textContent = `Este insumo se usa en recetas en ${unidTxt(ubase(i.unidad))}. No lo podés pasar a ${unidTxt(ubase(d.unidad))}: creá uno nuevo.`;
      return;
    }
    const before = analyze(S);
    const row = i || { id: uid(), historial: [] };
    const cambioPrecio = !i || i.precio !== d.precio || i.cantidad !== d.cantidad || i.unidad !== d.unidad;
    Object.assign(row, {
      nombre, precio: d.precio, cantidad: d.cantidad, unidad: d.unidad,
      categoria: $('#iCategoria').value.trim(), proveedor: $('#iProveedor').value.trim()
    });
    if (cambioPrecio) {
      row.historial = (row.historial || []).concat({ fecha, precio: d.precio, cantidad: d.cantidad, unidad: d.unidad })
        .sort((a, b) => a.fecha < b.fecha ? -1 : 1);
      row.actualizado = row.historial[row.historial.length - 1].fecha;
    }
    if (!i) S.insumos.push(row);
    await DB.put('insumos', row);
    closeDlg($('#dlgInsumo'));
    refresh();
    if (!alertDiff(before)) toast(i ? (cambioPrecio ? 'Precio actualizado: productos recalculados' : 'Insumo guardado') : 'Insumo cargado');
  });

  $('#iBorrar').addEventListener('click', async () => {
    const i = editIns;
    if (!i) return;
    const u = usos(i.id);
    const ok = await confirmBox('¿Borrar ' + i.nombre + '?',
      u.length ? `Se usa en ${u.length} ${plural(u.length, 'producto')} (${u.map(p => p.nombre).join(', ')}). Se va a sacar de esas recetas y van a quedar más baratas de lo que son.` : 'Se borra junto con su historial de precios.');
    if (!ok) return;
    for (const p of u) {
      p.items = p.items.filter(it => it.insumoId !== i.id);
      await DB.put('productos', p);
    }
    S.insumos = S.insumos.filter(x => x.id !== i.id);
    await DB.del('insumos', i.id);
    closeDlg($('#dlgInsumo'));
    refresh();
    toast('Insumo borrado');
  });

  /** Después de cambiar precios: avisa si algún producto quedó vendiéndose por debajo del costo */
  function alertDiff(before) {
    const after = S.A || analyze(S);
    const malo = e => e === 'bajo' || e === 'perdida';
    const nuevos = after.rows.filter(r => malo(r.estado) && !(before.byId[r.p.id] && malo(before.byId[r.p.id].estado)));
    const flojos = after.rows.filter(r => r.estado === 'flojo' && before.byId[r.p.id] && before.byId[r.p.id].estado === 'ok');
    if (nuevos.length) {
      const t = nuevos.length === 1 ? `Ojo: ${nuevos[0].p.nombre} quedó por debajo del costo` : `Ojo: ${nuevos.length} productos quedaron por debajo del costo`;
      toast(t, { label: 'Ver', fn: () => { location.hash = nuevos.length === 1 ? '#producto/' + encodeURIComponent(nuevos[0].p.id) : '#inicio'; } });
      return true;
    }
    if (flojos.length) {
      toast(`${flojos.length} ${plural(flojos.length, 'producto')} ${flojos.length === 1 ? 'quedó' : 'quedaron'} con menos ganancia de la que buscás`, { label: 'Ver', fn: () => { location.hash = '#inicio'; } });
      return true;
    }
    return false;
  }

  /* ---------- Actualizar precios en bloque ---------- */
  function openBulk() {
    $('#bPct').value = '';
    $('#bList').innerHTML = S.insumos.slice().sort(byName).map(i => `
      <div class="bulk-row" data-id="${esc(i.id)}">
        <div class="bulk-row__name"><b>${esc(i.nombre)}</b><span class="muted small">${cantTxt(i.cantidad, i.unidad)} · antes ${money(i.precio)}</span></div>
        <label class="field"><span class="sr">Nuevo precio de ${esc(i.nombre)}</span>
          <input data-money inputmode="decimal" value="${moneyInput(i.precio)}" data-orig="${i.precio}" autocomplete="off"></label>
        <span class="bulk-row__delta small"></span>
      </div>`).join('');
    openDlg($('#dlgBulk'));
  }
  function bulkDelta(row) {
    const inp = $('input', row);
    const v = parseMoney(inp.value), o = +inp.dataset.orig;
    const d = v && o ? v / o - 1 : 0;
    const out = $('.bulk-row__delta', row);
    out.textContent = Math.abs(d) > 0.0005 ? (d > 0 ? '+' : '') + pctTxt(d) : '';
    out.className = 'bulk-row__delta small ' + (d > 0 ? 'neg' : 'pos');
  }
  $('#bList').addEventListener('input', e => { const r = e.target.closest('.bulk-row'); if (r) bulkDelta(r); });
  $('#bApply').addEventListener('click', () => {
    const p = parseNum($('#bPct').value);
    if (p == null) { $('#bPct').focus(); return; }
    $$('.bulk-row', $('#bList')).forEach(r => {
      const inp = $('input', r);
      inp.value = moneyInput(Math.round(+inp.dataset.orig * (1 + p / 100)));
      bulkDelta(r);
    });
  });
  $('#formBulk').addEventListener('submit', async e => {
    e.preventDefault();
    const before = analyze(S);
    const changed = [];
    $$('.bulk-row', $('#bList')).forEach(r => {
      const i = insumo(r.dataset.id);
      const v = parseMoney($('input', r).value);
      if (i && v > 0 && v !== i.precio) {
        i.precio = v;
        i.historial = (i.historial || []).concat({ fecha: today(), precio: v, cantidad: i.cantidad, unidad: i.unidad });
        i.actualizado = today();
        changed.push(i);
      }
    });
    if (changed.length) await DB.putMany('insumos', changed);
    closeDlg($('#dlgBulk'));
    refresh();
    if (!changed.length) { toast('No cambiaste ningún precio'); return; }
    if (!alertDiff(before)) toast(`${changed.length} ${plural(changed.length, 'precio')} ${changed.length === 1 ? 'actualizado' : 'actualizados'}: productos recalculados.`);
  });

  /* =============================== PRODUCTOS =============================== */
  function renderProductos() {
    const el = $('#view-productos');
    if (!S.productos.length) {
      el.innerHTML = `<div class="empty"><span class="mark m-flor" aria-hidden="true"></span>
        <p><b>Todavía no armaste productos.</b></p>
        <p>${S.insumos.length ? 'Armá la receta de cada producto con tus insumos.' : 'Primero cargá tus insumos; después armás la receta de cada producto.'}</p>
        <div class="row-actions center">${S.insumos.length ? '<button class="btn btn--primary" type="button" data-act="nuevo-prod">Armar el primero</button>' : '<a class="btn btn--primary" href="#insumos">Ir a insumos</a>'}</div></div>`;
      return;
    }
    const rows = S.A.rows.slice().sort((a, b) => byName(a.p, b.p));
    el.innerHTML = `<div class="list">${rows.map(r => {
      const c = (x, n) => x.precio
        ? `${n} ${money(x.precio, { noCents: true })} <span class="${x.ganancia < 0 ? 'neg' : ''}">(${pctTxt(x.margen, 0)})</span>`
        : `${n}: sugerido ${isFinite(x.sugerido) ? money(x.sugerido, { noCents: true }) : '—'}`;
      return `<a class="item" href="#producto/${encodeURIComponent(r.p.id)}">
        <span class="item__main">
          <span class="item__title">${esc(r.p.nombre)}</span>
          <span class="item__meta">Costo por unidad ${money(r.costoTotal)}</span>
          <span class="item__meta">${c(r.canales.min, 'Minorista')} · ${c(r.canales.may, 'mayorista')}</span>
          ${r.faltan ? '<span class="item__meta neg">Falta un insumo que borraste</span>' : ''}
        </span>
        <span class="item__side">${badge(r.estado)}</span>
      </a>`;
    }).join('')}</div>
    <p class="help mt">“Ganancia baja” = gana menos de lo que buscás. “Debajo del costo” = no llega a cubrir el costo total. “Perdés plata” = no cubre ni los materiales ni tu tiempo.</p>`;
  }

  /* ---------- Detalle de producto ---------- */
  function renderProducto(id) {
    const el = $('#view-producto');
    const r = S.A.byId[id];
    if (!r) return;
    const p = r.p;
    const T = S.taller;
    const ct = r.costoTotal || 1;
    const seg = [
      ['Materiales', r.matUnidad, 'var(--tan)'],
      ['Tu trabajo', r.moUnidad, 'var(--terra)'],
      ['Costos fijos', r.fijoUnidad, 'var(--sage)']
    ];
    const itemsRows = r.items.map(x => {
      if (!x.ins) return `<tr><td colspan="4" class="neg">Insumo borrado</td></tr>`;
      const q = x.it.por === 'unidad' ? cantTxt(x.it.cantidad, x.it.unidad) + ' c/u' : cantTxt(x.it.cantidad, x.it.unidad);
      return `<tr><td>${esc(x.ins.nombre)}<br><span class="muted small">${q}</span></td><td>${moneyFine(x.porUnidad)}</td><td>${money(x.porTanda)}</td></tr>`;
    }).join('');
    const horas = (p.minutos || 0) / 60;

    const canalHtml = (k, titulo) => {
      const c = r.canales[k];
      const modoTxt = c.modo === 'markup' ? 'markup' : 'margen';
      return `<div class="canal">
        <div class="canal__head"><h3>${titulo}</h3>${badge(c.estado)}</div>
        <label class="field"><span>Tu precio ${k === 'min' ? 'minorista' : 'mayorista'}</span>
          <input data-money data-price="${k}" inputmode="decimal" placeholder="$ 0" value="${p[k === 'min' ? 'precioMin' : 'precioMay'] ? moneyInput(p[k === 'min' ? 'precioMin' : 'precioMay']) : ''}" autocomplete="off"></label>
        <div class="sug">
          <p>Sugerido para ${num(c.objetivo)} % de ${modoTxt}:<br><b class="num sug__val">${isFinite(c.sugerido) ? money(c.sugerido, { noCents: true }) : 'imposible'}</b></p>
          ${isFinite(c.sugerido) && c.sugerido !== c.precio ? `<button class="btn btn--ghost btn--sm" type="button" data-act="use-sug" data-k="${k}">Usar</button>` : ''}
        </div>
        ${!isFinite(c.sugerido) ? `<p class="small neg">Con ${num(c.pctCobro)} % de comisión y ${num(c.pctImp)} % de impuestos no se puede llegar a ${num(c.objetivo)} % de margen. Bajá el objetivo.</p>` : ''}
        ${c.precio ? `<dl class="kv">
          <div><dt>Precio</dt><dd class="num">${money(c.precio)}</dd></div>
          <div><dt>− ${esc(c.medio.nombre)} (${num(c.pctCobro)} %)</dt><dd class="num">${money(-c.comision)}</dd></div>
          ${c.pctImp ? `<div><dt>− Impuestos (${num(c.pctImp)} %)</dt><dd class="num">${money(-c.impuesto)}</dd></div>` : ''}
          <div class="kv__sum"><dt>Te queda neto</dt><dd class="num">${money(c.neto)}</dd></div>
          <div><dt>− Costo total</dt><dd class="num">${money(-r.costoTotal)}</dd></div>
          <div class="kv__sum"><dt>Ganancia por unidad</dt><dd class="num ${c.ganancia >= 0 ? 'pos' : 'neg'}">${money(c.ganancia)}</dd></div>
          <div><dt>Margen <span class="muted">(sobre el precio)</span></dt><dd class="num">${pctTxt(c.margen)}</dd></div>
          <div><dt>Markup <span class="muted">(sobre el costo)</span></dt><dd class="num">${pctTxt(c.markup)}</dd></div>
        </dl>` : `<p class="small muted">Cargá tu precio para ver cuánto te queda.</p>`}
        <p class="small muted mt">Para no perder plata: mínimo <b>${money(c.minimo, { noCents: true })}</b>. Por debajo de <b>${money(c.piso, { noCents: true })}</b> no cubrís ni los materiales ni tu tiempo.</p>
        <p class="small muted">Con ${num(c.objetivo)} % de margen: ${isFinite(c.sugMargen) ? money(c.sugMargen, { noCents: true }) : '—'} · con ${num(c.objetivo)} % de markup: ${money(c.sugMarkup, { noCents: true })}</p>
      </div>`;
    };

    const k = S.peCanal;
    const c = r.canales[k];
    let peHtml;
    if (!c.precio) peHtml = `<p class="muted">Cargá el precio ${k === 'min' ? 'minorista' : 'mayorista'} para calcularlo.</p>`;
    else if (!(c.contrib > 0)) peHtml = `<p class="neg">Con este precio, cada unidad no alcanza a pagar sus materiales, tu tiempo y la comisión. No hay punto de equilibrio: subí el precio.</p>`;
    else {
      const pe = r.p && S.A.F / c.contrib;
      peHtml = `<div class="stats">
          <div class="stat"><p class="stat__lbl">Unidades por mes</p><p class="stat__val num">${num(ceil(pe), 0)}</p></div>
          <div class="stat"><p class="stat__lbl">Facturación por mes</p><p class="stat__val num">${money(pe * c.precio, { noCents: true })}</p></div>
        </div>
        <p class="mt">Si vendieras <b>solo este producto</b> a precio ${k === 'min' ? 'minorista' : 'mayorista'}, necesitás ${num(ceil(pe), 0)} unidades por mes para cubrir tus ${money(S.A.F, { noCents: true })} de costos fijos. Cada unidad aporta ${money(c.contrib)} (su <b>contribución</b>).</p>
        ${Charts.breakEven({ F: S.A.F, precio: c.precio, costoVar: c.precio - c.contrib, pe, actual: r.unidadesMes })}
        <p class="small muted mt">Como vendés varios productos, el punto real está en <a class="link" href="#herramientas/equilibrio">Números → Equilibrio</a>.</p>`;
    }

    el.innerHTML = `
      <div class="hero">
        <p class="eyebrow">Te cuesta hacer cada unidad</p>
        <p class="hero__value num" data-count="${r.costoTotal}">${money(r.costoTotal)}</p>
        <p class="hero__sub">Tanda de ${num(r.rinde)} ${plural(r.rinde, 'unidad', 'unidades')}: ${money(r.costoTotal * r.rinde)} · ${num(horas, 2)} h de trabajo</p>
        <div class="hero__split">
          <div><p class="lbl">Precio minorista</p><p class="val num">${r.canales.min.precio ? money(r.canales.min.precio, { noCents: true }) : '—'}</p></div>
          <div><p class="lbl">Ganancia por unidad</p><p class="val num">${r.canales.min.precio ? money(r.canales.min.ganancia) : '—'}</p></div>
        </div>
        <span class="mark m-flor hero__deco" aria-hidden="true"></span>
      </div>
      ${r.estado !== 'ok' && r.estado !== 'sinprecio' ? `<div class="banner ${r.estado === 'flojo' ? '' : 'banner--bad'}"><div class="banner__body"><strong>${ESTADOS[r.estado][0]}</strong>${esc(estadoTexto(r))}.</div></div>` : ''}

      <div class="card">
        <div class="card__head"><h2>De qué está hecho el costo</h2></div>
        <div class="stack" role="img" aria-label="Materiales ${pctTxt(r.matUnidad / ct, 0)}, tu trabajo ${pctTxt(r.moUnidad / ct, 0)}, costos fijos ${pctTxt(r.fijoUnidad / ct, 0)}">
          ${seg.map(s => s[1] > 0 ? `<span style="width:${(s[1] / ct * 100).toFixed(2)}%;background:${s[2]}"></span>` : '').join('')}
        </div>
        <dl class="kv kv--legend">
          ${seg.map(s => `<div><dt><i style="background:${s[2]}"></i>${s[0]}</dt><dd class="num">${money(s[1])} <span class="muted small">${pctTxt(s[1] / ct, 0)}</span></dd></div>`).join('')}
          <div class="kv__sum"><dt>Costo total por unidad</dt><dd class="num">${money(r.costoTotal)}</dd></div>
        </dl>

        <h3 class="form-sub">Materiales</h3>
        ${r.items.length ? `<div class="tbl-wrap"><table class="tbl tbl--costos">
          <thead><tr><th>Insumo</th><th>Por unidad</th><th>Por tanda</th></tr></thead>
          <tbody>${itemsRows}
            ${r.merma ? `<tr><td>Merma (${num(p.merma)} %)</td><td>${moneyFine(r.mermaUnidad)}</td><td>${money(r.mermaUnidad * r.rinde)}</td></tr>` : ''}
            <tr class="tbl__total"><td>Total materiales</td><td>${money(r.matUnidad)}</td><td>${money(r.matTanda)}</td></tr>
          </tbody></table></div>` : '<p class="muted">Todavía no cargaste la receta.</p>'}

        <h3 class="form-sub">Tu trabajo</h3>
        <p>${num(horas, 2)} h por tanda × ${T.valorHora ? money(T.valorHora, { noCents: true }) + ' la hora' : '<a class="link" href="#taller">cargá el valor de tu hora</a>'} = ${money(r.moTanda)} por tanda → <b>${money(r.moUnidad)}</b> por unidad.</p>

        <h3 class="form-sub">Costos fijos</h3>
        ${S.A.F ? (r.sinProrrateo
          ? `<p class="neg">Para repartir tus costos fijos (${money(S.A.F, { noCents: true })}) necesito saber cuántas unidades vendés por mes. Cargalo en <button class="link" type="button" data-act="edit-prod">editar</button>.</p>`
          : `<p>Te toca <b>${money(r.fijoUnidad)}</b> por unidad: ${money(S.A.F, { noCents: true })} de fijos repartidos ${T.prorrateo === 'horas' ? 'según las horas de trabajo de cada producto' : 'entre las ' + num(S.A.totals.unidades + 0, 0) + ' unidades que hacés por mes'}.</p>`)
          : '<p class="muted">No cargaste costos fijos. <a class="link" href="#taller">Cargalos en Mi taller</a>.</p>'}
        ${explica('prorrateo')}
      </div>

      <div class="card">
        <div class="card__head"><h2>Precio de venta</h2></div>
        <div class="canales">${canalHtml('min', 'Minorista')}${canalHtml('may', 'Mayorista')}</div>
        ${explica('margenMarkup')}
        ${explica('neto')}
      </div>

      <div class="card">
        <div class="card__head"><h2>Punto de equilibrio</h2></div>
        <div class="seg" role="radiogroup" aria-label="Canal" id="peCanal">
          <button type="button" role="radio" aria-checked="${k === 'min'}" data-v="min">Minorista</button>
          <button type="button" role="radio" aria-checked="${k === 'may'}" data-v="may">Mayorista</button>
        </div>
        <div class="mt">${peHtml}</div>
        ${explica('equilibrio')}
      </div>

      <div class="row-actions">
        <button class="btn btn--primary" type="button" data-act="edit-prod">Editar receta y datos</button>
        <button class="btn btn--ghost" type="button" data-act="ficha">Ficha para imprimir / PDF</button>
        <button class="btn btn--ghost" type="button" data-act="dup-prod">Duplicar</button>
        <button class="btn btn--danger-ghost" type="button" data-act="del-prod">Borrar</button>
      </div>`;
  }

  $('#view-producto').addEventListener('segchange', e => {
    if (e.target.id === 'peCanal') { S.peCanal = e.detail; refresh(); }
  });
  $('#view-producto').addEventListener('change', async e => {
    const inp = e.target.closest('[data-price]');
    if (!inp) return;
    const p = producto(S.param);
    const v = parseMoney(inp.value);
    p[inp.dataset.price === 'min' ? 'precioMin' : 'precioMay'] = v > 0 ? v : null;
    await DB.put('productos', p);
    refresh();
    toast('Precio guardado');
  });

  /* ---------- Hoja de producto ---------- */
  let editProd = null; // { id|null, items: [] }
  function itemRow(it, idx) {
    const ins = insumo(it.insumoId);
    const units = ins ? compatibles(ins.unidad) : ['u'];
    const opts = S.insumos.slice().sort(byName).map(i => `<option value="${esc(i.id)}"${i.id === it.insumoId ? ' selected' : ''}>${esc(i.nombre)}</option>`).join('');
    return `<div class="rec${idx === editProd.nuevo ? ' rec--new' : ''}" data-idx="${idx}">
      <label class="field rec__ins"><span class="sr">Insumo</span>
        <select data-f="insumoId"><option value="">Elegí un insumo…</option>${opts}</select></label>
      <label class="field rec__cant"><span class="sr">Cantidad</span>
        <input data-f="cantidad" inputmode="decimal" placeholder="Cant." value="${it.cantidad != null ? esc(num(it.cantidad)) : ''}" autocomplete="off"></label>
      <label class="field rec__u"><span class="sr">Unidad</span>
        <select data-f="unidad">${units.map(u => `<option value="${u}"${u === it.unidad ? ' selected' : ''}>${unidTxt(u)}</option>`).join('')}</select></label>
      <label class="field rec__por"><span class="sr">Por tanda o por unidad</span>
        <select data-f="por"><option value="tanda"${it.por !== 'unidad' ? ' selected' : ''}>por tanda</option><option value="unidad"${it.por === 'unidad' ? ' selected' : ''}>por unidad</option></select></label>
      <button class="icon-btn rec__del" type="button" data-del aria-label="Quitar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <p class="rec__cost small muted"></p>
    </div>`;
  }
  function renderItems() {
    const box = $('#pItems');
    if (!S.insumos.length) {
      box.innerHTML = '<p class="help neg">Todavía no tenés insumos cargados. Guardá el producto y después cargá los insumos, o cargalos primero.</p>';
      return;
    }
    box.innerHTML = editProd.items.length ? editProd.items.map(itemRow).join('') : '<p class="help">Sin insumos todavía.</p>';
  }
  function draftProduct() {
    const id = editProd.id || '__draft__';
    const base = editProd.id ? producto(editProd.id) : {};
    const modo = getSeg($('#pModo'));
    return Object.assign({}, base, {
      id,
      nombre: $('#pNombre').value.trim(),
      rinde: parseNum($('#pRinde').value) || 1,
      merma: parseNum($('#pMerma').value) || 0,
      minutos: (parseNum($('#pHoras').value) || 0) * 60 + (parseNum($('#pMinutos').value) || 0),
      items: editProd.items.filter(it => it.insumoId && it.cantidad > 0).map(it => Object.assign({}, it)),
      precioMin: moneyField($('#pPrecioMin')) || null,
      precioMay: moneyField($('#pPrecioMay')) || null,
      ventasMin: parseNum($('#pVentasMin').value) || 0,
      ventasMay: parseNum($('#pVentasMay').value) || 0,
      modo: modo || null,
      objMin: parseNum($('#pObjMin').value),
      objMay: parseNum($('#pObjMay').value)
    });
  }
  function updPreview() {
    const d = draftProduct();
    const tmp = Object.assign({}, S, { productos: S.productos.filter(p => p.id !== d.id).concat(d) });
    const A = analyze(tmp);
    const r = A.byId[d.id];
    // costo de cada renglón
    $$('.rec', $('#pItems')).forEach(row => {
      const it = editProd.items[+row.dataset.idx];
      const ins = it && insumo(it.insumoId);
      const out = $('.rec__cost', row);
      if (!ins || !(it.cantidad > 0)) { out.textContent = ''; return; }
      const v = costoBase(ins) * it.cantidad * uf(it.unidad);
      out.textContent = it.por === 'unidad' ? `${moneyFine(v)} por unidad · ${money(v * r.rinde)} por tanda` : `${money(v)} por tanda · ${moneyFine(v / r.rinde)} por unidad`;
    });
    $('#pPreview').innerHTML = `<dl class="kv">
      <div><dt>Materiales por unidad</dt><dd class="num">${money(r.matUnidad)}</dd></div>
      <div><dt>Tu trabajo por unidad</dt><dd class="num">${money(r.moUnidad)}</dd></div>
      <div><dt>Costos fijos por unidad</dt><dd class="num">${money(r.fijoUnidad)}</dd></div>
      <div class="kv__sum"><dt>Costo total por unidad</dt><dd class="num">${money(r.costoTotal)}</dd></div>
      <div><dt>Costo de la tanda (${num(r.rinde)} u.)</dt><dd class="num">${money(r.costoTotal * r.rinde)}</dd></div>
      <div><dt>Precio minorista sugerido</dt><dd class="num">${isFinite(r.canales.min.sugerido) ? money(r.canales.min.sugerido, { noCents: true }) : '—'}</dd></div>
      <div><dt>Precio mayorista sugerido</dt><dd class="num">${isFinite(r.canales.may.sugerido) ? money(r.canales.may.sugerido, { noCents: true }) : '—'}</dd></div>
    </dl>`;
  }
  function openProducto(id, dup) {
    const p = id ? producto(id) : null;
    editProd = { id: p && !dup ? p.id : null, items: p ? p.items.map(it => Object.assign({}, it)) : [] };
    $('#dlgProductoTitle').textContent = p && !dup ? 'Editar producto' : dup ? 'Copia de producto' : 'Nuevo producto';
    $('#pNombre').value = p ? p.nombre + (dup ? ' (copia)' : '') : '';
    $('#pRinde').value = p ? num(p.rinde) : '';
    $('#pMerma').value = p && p.merma ? num(p.merma) : '';
    $('#pHoras').value = p && p.minutos ? Math.floor(p.minutos / 60) : '';
    $('#pMinutos').value = p && p.minutos ? Math.round(p.minutos % 60) : '';
    $('#pPrecioMin').value = p && p.precioMin ? moneyInput(p.precioMin) : '';
    $('#pPrecioMay').value = p && p.precioMay ? moneyInput(p.precioMay) : '';
    $('#pVentasMin').value = p && p.ventasMin ? num(p.ventasMin) : '';
    $('#pVentasMay').value = p && p.ventasMay ? num(p.ventasMay) : '';
    setSeg($('#pModo'), p && p.modo ? p.modo : '');
    $('#pObjMin').value = p && p.objMin != null ? num(p.objMin) : '';
    $('#pObjMay').value = p && p.objMay != null ? num(p.objMay) : '';
    $('#pObjMin').placeholder = num(S.taller.objMin) + ' (taller)';
    $('#pObjMay').placeholder = num(S.taller.objMay) + ' (taller)';
    $('#pErr').textContent = '';
    if (!editProd.items.length && S.insumos.length) editProd.items.push({ insumoId: '', cantidad: null, unidad: 'g', por: 'tanda' });
    renderItems();
    updPreview();
    openDlg($('#dlgProducto'));
    if (!p) setTimeout(() => $('#pNombre').focus(), 60);
  }
  $('#pAddItem').addEventListener('click', () => {
    if (!S.insumos.length) { toast('Primero cargá insumos'); return; }
    editProd.items.push({ insumoId: '', cantidad: null, unidad: 'g', por: 'tanda' });
    editProd.nuevo = editProd.items.length - 1;
    renderItems(); updPreview();
    editProd.nuevo = null;
    const sels = $$('.rec select[data-f="insumoId"]', $('#pItems'));
    sels[sels.length - 1].focus();
  });
  $('#pItems').addEventListener('click', e => {
    const b = e.target.closest('[data-del]');
    if (!b) return;
    editProd.items.splice(+b.closest('.rec').dataset.idx, 1);
    renderItems(); updPreview();
  });
  $('#pItems').addEventListener('input', e => {
    const row = e.target.closest('.rec');
    if (!row) return;
    const it = editProd.items[+row.dataset.idx];
    const f = e.target.dataset.f;
    if (f === 'cantidad') it.cantidad = parseNum(e.target.value);
    else it[f] = e.target.value;
    if (f === 'insumoId') {
      const ins = insumo(it.insumoId);
      if (ins) {
        it.unidad = ubase(ins.unidad);
        if (ubase(ins.unidad) === 'u') it.por = 'unidad';
      }
      const y = row.querySelector('select').value;
      renderItems();
      const nr = $(`.rec[data-idx="${row.dataset.idx}"] input`, $('#pItems'));
      if (y && nr) nr.focus();
    }
    updPreview();
  });
  $('#formProducto').addEventListener('input', e => { if (!e.target.closest('#pItems')) updPreview(); });
  $('#pModo').addEventListener('segchange', updPreview);

  $('#formProducto').addEventListener('submit', async e => {
    e.preventDefault();
    const d = draftProduct();
    const err = $('#pErr');
    if (!d.nombre) { err.textContent = 'Poné un nombre.'; $('#pNombre').focus(); return; }
    if (!(parseNum($('#pRinde').value) > 0)) { err.textContent = 'Poné cuántas unidades salen por tanda (si hacés de a una, poné 1).'; $('#pRinde').focus(); return; }
    const incompletos = editProd.items.filter(it => (it.insumoId && !(it.cantidad > 0)) || (!it.insumoId && it.cantidad > 0));
    if (incompletos.length) { err.textContent = 'Hay un renglón de la receta sin insumo o sin cantidad.'; return; }
    if (!editProd.id) d.id = uid();
    if (d.objMin == null) d.objMin = null;
    if (d.objMay == null) d.objMay = null;
    const idx = S.productos.findIndex(p => p.id === d.id);
    if (idx === -1) S.productos.push(d); else S.productos[idx] = d;
    await DB.put('productos', d);
    closeDlg($('#dlgProducto'));
    if (S.view === 'producto' && S.param === d.id) refresh();
    else location.hash = '#producto/' + encodeURIComponent(d.id);
    toast('Producto guardado');
  });

  async function deleteProducto(id) {
    const p = producto(id);
    if (!p) return;
    if (!await confirmBox('¿Borrar ' + p.nombre + '?', 'Se borra la receta y sus precios. Los insumos quedan.')) return;
    S.productos = S.productos.filter(x => x.id !== id);
    S.combos.forEach(c => { c.items = c.items.filter(it => it.productoId !== id); });
    await DB.del('productos', id);
    await saveKV('combos');
    location.hash = '#productos';
    toast('Producto borrado');
  }

  /* =============================== HERRAMIENTAS =============================== */
  function prodOptions(sel, withAll) {
    return (withAll ? `<option value="*"${sel === '*' ? ' selected' : ''}>${withAll}</option>` : '') +
      S.productos.slice().sort(byName).map(p => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
  }
  const numVal = v => v == null || v === '' ? '' : String(v);

  function renderHerramientas() {
    const el = $('#view-herramientas');
    const t = S.t.tool;
    const nav = `<nav class="toolnav" aria-label="Herramientas">${TOOLS.map(([k, n]) => `<a href="#herramientas/${k}"${k === t ? ' aria-current="page"' : ''}>${n}</a>`).join('')}</nav>`;
    if (!S.productos.length) {
      el.innerHTML = nav + `<div class="empty"><span class="mark m-estrella" aria-hidden="true"></span><p><b>Primero armá tus productos.</b></p><p>Con productos, precios y ventas estimadas, acá calculás tu punto de equilibrio, simulás aumentos y más.</p></div>`;
      return;
    }
    el.innerHTML = nav + '<div id="toolBody"></div>';
    TOOL_RENDER[t]();
    const cur = $('.toolnav [aria-current]', el);
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  const body = () => $('#toolBody');
  function bindOut(fn) {
    fn();
    Charts.bindTips(body());
  }

  const TOOL_RENDER = {
    /* ---------- Punto de equilibrio con mezcla ---------- */
    equilibrio() {
      const A = S.A, T = A.totals;
      const sinVentas = T.unidades === 0;
      let html = `<div class="card"><div class="card__head"><h2>Punto de equilibrio del taller</h2></div>`;
      if (sinVentas) {
        html += `<p>Para calcularlo con todos tus productos necesito saber <b>cuántas unidades vendés por mes</b> de cada uno (y que tengan precio). Cargalo al editar cada producto.</p>`;
      } else if (!isFinite(T.peUnidades)) {
        html += `<p class="neg">Con los precios actuales, en promedio cada venta no cubre sus propios costos (materiales, tu tiempo y comisiones). No hay punto de equilibrio: subí precios.</p>`;
      } else {
        html += `<div class="stats">
            <div class="stat"><p class="stat__lbl">Unidades por mes</p><p class="stat__val num">${num(ceil(T.peUnidades), 0)}</p></div>
            <div class="stat"><p class="stat__lbl">Facturación por mes</p><p class="stat__val num">${money(T.pePesos, { noCents: true })}</p></div>
          </div>
          <p class="mt">Tus costos fijos son <b>${money(T.F, { noCents: true })}</b> por mes. Con tu mezcla de ventas, cada unidad deja en promedio <b>${money(T.wcm)}</b> de contribución. ${money(T.F, { noCents: true })} ÷ ${money(T.wcm)} = <b>${num(ceil(T.peUnidades), 0)} unidades</b>.</p>
          <p class="mt">Hoy estimás vender <b>${num(T.unidades, 0)}</b> por mes: ${T.unidades >= T.peUnidades ? `<span class="pos">estás ${num(T.unidades - T.peUnidades, 0)} unidades arriba del punto y ganás ${money(T.ganancia, { noCents: true })}.</span>` : `<span class="neg">te faltan ${num(ceil(T.peUnidades - T.unidades), 0)} unidades para cubrir los fijos (perdés ${money(-T.ganancia, { noCents: true })}).</span>`}</p>
          ${Charts.breakEven({ F: T.F, precio: T.precioProm, costoVar: T.precioProm - T.wcm, pe: T.peUnidades, actual: T.unidades })}
          <h3 class="form-sub">Cuánto de cada producto</h3>
          <div class="tbl-wrap"><table class="tbl">
            <thead><tr><th>Producto</th><th>Mezcla</th><th>Minorista</th><th>Mayorista</th></tr></thead>
            <tbody>${A.rows.filter(r => r.unidadesMes > 0).map(r => {
              const f = T.peUnidades / T.unidades;
              return `<tr><td>${esc(r.p.nombre)}</td><td>${pctTxt(r.unidadesMes / T.unidades, 0)}</td><td>${num(ceil(r.ventasMin * f), 0)}</td><td>${num(ceil(r.ventasMay * f), 0)}</td></tr>`;
            }).join('')}</tbody>
          </table></div>
          <p class="small muted mt">Se mantiene la proporción en que estimás vender cada producto y canal.</p>`;
      }
      html += explica('equilibrio') + explica('contribucion') + explica('mezcla') + '</div>';
      body().innerHTML = html;
    },

    /* ---------- Simulador ---------- */
    simulador() {
      const s = S.t;
      body().innerHTML = `<div class="card">
        <div class="card__head"><h2>¿Qué pasa si…?</h2></div>
        <p class="help">Probá cambios sin tocar tus datos.</p>
        <label class="field mt"><span>Producto</span><select id="simProd">${prodOptions(s.simProd, 'Todo el taller')}</select></label>
        <div class="grid2">
          <label class="field"><span>Si sube el insumo…</span><select id="simIns"><option value="*">Todos los insumos</option>${S.insumos.slice().sort(byName).map(i => `<option value="${esc(i.id)}"${i.id === s.simIns ? ' selected' : ''}>${esc(i.nombre)}</option>`).join('')}</select></label>
          <label class="field"><span>…un (%)</span><input id="simInsPct" type="number" step="any" inputmode="decimal" placeholder="Ej: 20" value="${numVal(s.simInsPct)}"></label>
          <label class="field"><span>Cambio el precio (%)</span><input id="simPrecioPct" type="number" step="any" inputmode="decimal" placeholder="Ej: −10" value="${numVal(s.simPrecioPct)}"></label>
          <label class="field"><span>Vendo por mes (unidades)</span><input id="simUnidades" type="number" step="any" min="0" inputmode="decimal" placeholder="como ahora" value="${numVal(s.simUnidades)}"></label>
        </div>
        <p class="help">Para bajar un precio poné un número negativo (ej: −10).</p>
        <div id="toolOut" class="mt" aria-live="polite"></div>
      </div>`;
      const upd = () => bindOut(simOut);
      $('#simProd').addEventListener('change', e => { s.simProd = e.target.value; s.simUnidades = null; $('#simUnidades').value = ''; upd(); });
      $('#simIns').addEventListener('change', e => { s.simIns = e.target.value; upd(); });
      ['simInsPct', 'simPrecioPct', 'simUnidades'].forEach(k => $('#' + k).addEventListener('input', e => {
        s[k] = e.target.value === '' ? null : Number(e.target.value);
        upd();
      }));
      upd();
    },

    /* ---------- Meta de ganancia ---------- */
    meta() {
      const s = S.t;
      body().innerHTML = `<div class="card">
        <div class="card__head"><h2>Meta de ganancia</h2></div>
        <label class="field"><span>Quiero ganar por mes</span><input id="metaMonto" data-money inputmode="decimal" placeholder="$ 0" value="${s.metaMonto ? moneyInput(s.metaMonto) : ''}" autocomplete="off"></label>
        <label class="field mt"><span>Vendiendo</span><select id="metaProd">${prodOptions(s.metaProd, 'Todos mis productos (mi mezcla de ventas)')}</select></label>
        <div id="toolOut" class="mt" aria-live="polite"></div>
      </div>`;
      const upd = () => bindOut(metaOut);
      $('#metaMonto').addEventListener('input', e => { s.metaMonto = parseMoney(e.target.value); upd(); });
      $('#metaProd').addEventListener('change', e => { s.metaProd = e.target.value; upd(); });
      upd();
    },

    /* ---------- Ranking ---------- */
    ranking() {
      const s = S.t;
      body().innerHTML = `<div class="card">
        <div class="card__head"><h2>Ranking de productos</h2></div>
        <p class="help">A precio minorista. ¿Cuál te conviene empujar?</p>
        <div class="seg" role="radiogroup" aria-label="Ordenar por" id="rankBy">
          <button type="button" role="radio" aria-checked="${s.rankBy === 'unidad'}" data-v="unidad">Por unidad</button>
          <button type="button" role="radio" aria-checked="${s.rankBy === 'hora'}" data-v="hora">Por hora</button>
          <button type="button" role="radio" aria-checked="${s.rankBy === 'margen'}" data-v="margen">Margen</button>
        </div>
        <div id="toolOut" class="mt"></div>
      </div>`;
      $('#rankBy').addEventListener('segchange', e => { s.rankBy = e.detail; rankOut(); });
      rankOut();
    },

    /* ---------- Combos ---------- */
    combos() {
      const s = S.t, cb = s.combo;
      if (!cb.items.length) cb.items.push({ productoId: S.productos.slice().sort(byName)[0].id, cant: 1 });
      body().innerHTML = `<div class="card">
        <div class="card__head"><h2>Combos y kits</h2></div>
        <p class="help">Armá un kit con varios productos y fijate cuánto podés descontar.</p>
        <label class="field mt"><span>Nombre del combo</span><input id="cbNombre" maxlength="60" placeholder="Ej: Kit limpieza energética" value="${esc(cb.nombre)}" autocomplete="off"></label>
        <div id="cbItems" class="mt">${cb.items.map((it, i) => `<div class="cb-row" data-i="${i}">
          <label class="field"><span class="sr">Producto</span><select data-f="productoId">${prodOptions(it.productoId)}</select></label>
          <label class="field"><span class="sr">Cantidad</span><input data-f="cant" type="number" min="1" step="1" inputmode="numeric" value="${it.cant}"></label>
          <button class="icon-btn" type="button" data-del aria-label="Quitar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
        </div>`).join('')}</div>
        <button class="btn btn--ghost btn--sm mt" type="button" id="cbAdd">+ Agregar producto</button>
        <div class="grid2">
          <label class="field"><span>Packaging extra del combo</span><input id="cbExtra" data-money inputmode="decimal" placeholder="$ 0" value="${cb.extra ? moneyInput(cb.extra) : ''}" autocomplete="off"></label>
          <label class="field"><span>Descuento (%)</span><input id="cbDesc" type="number" step="any" min="0" max="100" inputmode="decimal" value="${numVal(cb.desc)}"></label>
        </div>
        <div class="seg" role="radiogroup" aria-label="Canal" id="cbCanal">
          <button type="button" role="radio" aria-checked="${cb.canal === 'min'}" data-v="min">Minorista</button>
          <button type="button" role="radio" aria-checked="${cb.canal === 'may'}" data-v="may">Mayorista</button>
        </div>
        <div id="toolOut" class="mt" aria-live="polite"></div>
        <div class="row-actions">
          <button class="btn btn--primary btn--sm" type="button" id="cbSave">${cb.id ? 'Guardar cambios' : 'Guardar combo'}</button>
          ${cb.id ? '<button class="btn btn--ghost btn--sm" type="button" id="cbNew">Nuevo combo</button><button class="btn btn--danger-ghost btn--sm" type="button" id="cbDel">Borrar</button>' : ''}
        </div>
      </div>
      ${S.combos.length ? `<div class="card"><div class="card__head"><h2>Combos guardados</h2></div>
        <ul class="set-list">${S.combos.map(c => `<li><span class="name">${esc(c.nombre || 'Combo sin nombre')}<br><span class="meta">${c.items.length} ${plural(c.items.length, 'producto')} · ${num(c.desc || 0)} % off</span></span><button class="btn btn--ghost btn--sm" type="button" data-load="${esc(c.id)}">Abrir</button></li>`).join('')}</ul></div>` : ''}`;
      const upd = () => comboOut();
      $('#cbNombre').addEventListener('input', e => { cb.nombre = e.target.value; });
      $('#cbItems').addEventListener('input', e => {
        const row = e.target.closest('.cb-row');
        const it = cb.items[+row.dataset.i];
        if (e.target.dataset.f === 'cant') it.cant = Math.max(0, Number(e.target.value) || 0);
        else it.productoId = e.target.value;
        upd();
      });
      $('#cbItems').addEventListener('click', e => {
        if (!e.target.closest('[data-del]')) return;
        cb.items.splice(+e.target.closest('.cb-row').dataset.i, 1);
        TOOL_RENDER.combos();
      });
      $('#cbAdd').addEventListener('click', () => {
        const used = new Set(cb.items.map(i => i.productoId));
        const p = S.productos.slice().sort(byName).find(x => !used.has(x.id)) || S.productos[0];
        cb.items.push({ productoId: p.id, cant: 1 });
        TOOL_RENDER.combos();
      });
      $('#cbExtra').addEventListener('input', e => { cb.extra = parseMoney(e.target.value) || 0; upd(); });
      $('#cbDesc').addEventListener('input', e => { cb.desc = e.target.value === '' ? 0 : Number(e.target.value); upd(); });
      $('#cbCanal').addEventListener('segchange', e => { cb.canal = e.detail; upd(); });
      $('#cbSave').addEventListener('click', async () => {
        if (!cb.items.length) { toast('Agregá al menos un producto'); return; }
        const row = JSON.parse(JSON.stringify(cb));
        if (!row.id) row.id = uid();
        cb.id = row.id;
        const i = S.combos.findIndex(c => c.id === row.id);
        if (i === -1) S.combos.push(row); else S.combos[i] = row;
        await saveKV('combos');
        TOOL_RENDER.combos();
        toast('Combo guardado');
      });
      if (cb.id) {
        $('#cbNew').addEventListener('click', () => { s.combo = { id: null, nombre: '', items: [], extra: 0, desc: 10, canal: 'min' }; TOOL_RENDER.combos(); });
        $('#cbDel').addEventListener('click', async () => {
          if (!await confirmBox('¿Borrar este combo?', cb.nombre || 'Combo sin nombre')) return;
          S.combos = S.combos.filter(c => c.id !== cb.id);
          await saveKV('combos');
          s.combo = { id: null, nombre: '', items: [], extra: 0, desc: 10, canal: 'min' };
          TOOL_RENDER.combos();
        });
      }
      $$('[data-load]', body()).forEach(b => b.addEventListener('click', () => {
        const c = S.combos.find(x => x.id === b.dataset.load);
        s.combo = JSON.parse(JSON.stringify(c));
        s.combo.items = s.combo.items.filter(it => producto(it.productoId));
        TOOL_RENDER.combos();
        window.scrollTo(0, 0);
      }));
      upd();
    },

    /* ---------- Descuentos ---------- */
    descuentos() {
      const s = S.t;
      if (!producto(s.descProd)) s.descProd = S.productos.slice().sort(byName)[0].id;
      body().innerHTML = `<div class="card">
        <div class="card__head"><h2>¿Cuánto puedo descontar?</h2></div>
        <label class="field"><span>Producto</span><select id="dProd">${prodOptions(s.descProd)}</select></label>
        <div class="seg" role="radiogroup" aria-label="Canal" id="dCanal">
          <button type="button" role="radio" aria-checked="${s.descCanal === 'min'}" data-v="min">Minorista</button>
          <button type="button" role="radio" aria-checked="${s.descCanal === 'may'}" data-v="may">Mayorista</button>
        </div>
        <label class="field mt"><span>Descuento (%)</span><input id="dPct" type="number" step="any" min="0" max="100" inputmode="decimal" value="${numVal(s.descPct)}"></label>
        <div id="toolOut" class="mt" aria-live="polite"></div>
      </div>`;
      $('#dProd').addEventListener('change', e => { s.descProd = e.target.value; descOut(); });
      $('#dCanal').addEventListener('segchange', e => { s.descCanal = e.detail; descOut(); });
      $('#dPct').addEventListener('input', e => { s.descPct = e.target.value === '' ? 0 : Number(e.target.value); descOut(); });
      descOut();
    }
  };

  const delta = (a, b, fmt, goodUp) => {
    const d = b - a;
    if (!isFinite(d) || Math.abs(d) < 0.5) return '<span class="muted">=</span>';
    const good = goodUp ? d > 0 : d < 0;
    return `<span class="${good ? 'pos' : 'neg'}">${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}</span>`;
  };
  const m0 = v => money(v, { noCents: true });

  function simOut() {
    const s = S.t;
    const base = S.A;
    const ov = {};
    if (s.simInsPct) ov.insumoPct = { [s.simIns]: s.simInsPct };
    if (s.simPrecioPct) ov.precioPct = s.simPrecioPct;
    if (s.simUnidades != null && s.simUnidades >= 0) {
      ov.ventas = {};
      if (s.simProd === '*') {
        const f = base.totals.unidades ? s.simUnidades / base.totals.unidades : 0;
        base.rows.forEach(r => { ov.ventas[r.p.id] = { min: r.ventasMin * f, may: r.ventasMay * f }; });
        if (!base.totals.unidades) { $('#toolOut').innerHTML = '<p class="neg">Para simular unidades del taller, cargá primero las ventas por mes de cada producto.</p>'; return; }
      } else {
        const r = base.byId[s.simProd];
        const tot = r.unidadesMes;
        ov.ventas[s.simProd] = tot ? { min: s.simUnidades * r.ventasMin / tot, may: s.simUnidades * r.ventasMay / tot } : { min: s.simUnidades, may: 0 };
      }
    }
    const sim = analyze(S, ov);
    const Tb = base.totals, Ts = sim.totals;
    let rows = [];
    if (s.simProd !== '*') {
      const a = base.byId[s.simProd], b = sim.byId[s.simProd];
      const ca = a.canales.min, cb = b.canales.min;
      const peA = unidadesPara(base.F, ca.contrib), peB = unidadesPara(sim.F, cb.contrib);
      rows = [
        ['Costo por unidad', money(a.costoTotal), money(b.costoTotal), delta(a.costoTotal, b.costoTotal, money, false)],
        ['Precio minorista', money(ca.precio), money(cb.precio), delta(ca.precio, cb.precio, money, true)],
        ['Ganancia por unidad', money(ca.ganancia), money(cb.ganancia), delta(ca.ganancia, cb.ganancia, money, true)],
        ['Margen', pctTxt(ca.margen), pctTxt(cb.margen), ''],
        ['Unidades por mes', num(a.unidadesMes, 0), num(b.unidadesMes, 0), ''],
        ['Equilibrio (solo este)', isFinite(peA) ? num(ceil(peA), 0) + ' u.' : '—', isFinite(peB) ? num(ceil(peB), 0) + ' u.' : '—', ''],
        ['Ganancia del mes (taller)', m0(Tb.ganancia), m0(Ts.ganancia), delta(Tb.ganancia, Ts.ganancia, m0, true)]
      ];
    } else {
      const malosA = base.rows.filter(r => r.estado === 'bajo' || r.estado === 'perdida').length;
      const malosB = sim.rows.filter(r => r.estado === 'bajo' || r.estado === 'perdida').length;
      rows = [
        ['Facturación del mes', m0(Tb.facturacion), m0(Ts.facturacion), delta(Tb.facturacion, Ts.facturacion, m0, true)],
        ['Ganancia del mes', m0(Tb.ganancia), m0(Ts.ganancia), delta(Tb.ganancia, Ts.ganancia, m0, true)],
        ['Unidades por mes', num(Tb.unidades, 0), num(Ts.unidades, 0), ''],
        ['Equilibrio (unidades)', isFinite(Tb.peUnidades) ? num(ceil(Tb.peUnidades), 0) : '—', isFinite(Ts.peUnidades) ? num(ceil(Ts.peUnidades), 0) : '—', ''],
        ['Equilibrio (pesos)', isFinite(Tb.pePesos) ? m0(Tb.pePesos) : '—', isFinite(Ts.pePesos) ? m0(Ts.pePesos) : '—', ''],
        ['Productos bajo el costo', String(malosA), String(malosB), '']
      ];
    }
    let extra = '';
    if (s.simInsPct) {
      const afect = sim.rows.filter(r => s.simIns === '*' || r.items.some(x => x.ins && x.ins.id === s.simIns))
        .filter(r => s.simProd === '*' || r.p.id === s.simProd);
      if (afect.length) {
        extra = `<h3 class="form-sub">Para mantener tu ganancia buscada</h3><ul class="plain">${afect.map(r => {
          const c = r.canales.min;
          return `<li><b>${esc(r.p.nombre)}</b>: precio minorista ${isFinite(c.sugerido) ? m0(c.sugerido) : '—'}${c.precio ? ` <span class="muted">(hoy ${m0(base.byId[r.p.id].canales.min.precio)})</span>` : ''}</li>`;
        }).join('')}</ul>`;
      } else extra = '<p class="small muted mt">Ese insumo no se usa en este producto.</p>';
    }
    $('#toolOut').innerHTML = `<div class="tbl-wrap"><table class="tbl tbl--cmp">
        <thead><tr><th></th><th>Ahora</th><th>Simulado</th><th>Diferencia</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3]}</td></tr>`).join('')}</tbody>
      </table></div>${extra}`;
  }

  function metaOut() {
    const s = S.t, A = S.A, T = A.totals;
    const X = s.metaMonto || 0;
    const out = $('#toolOut');
    const nota = S.taller.valorHora
      ? `<p class="small muted mt">Tu hora (${m0(S.taller.valorHora)}) ya se cuenta como costo, así que esta ganancia es <b>además</b> de tu sueldo.</p>`
      : `<p class="small muted mt">No cargaste valor de tu hora: esta ganancia es todo lo que te llevás por tu trabajo.</p>`;
    if (s.metaProd === '*') {
      if (!T.unidades) { out.innerHTML = '<p>Cargá las ventas por mes de cada producto para usar tu mezcla de ventas, o elegí un producto.</p>'; return; }
      const u = unidadesPara(T.F, T.wcm, X);
      if (!isFinite(u)) { out.innerHTML = '<p class="neg">Con estos precios no se puede: cada venta no cubre sus costos.</p>'; return; }
      const f = u / T.unidades;
      out.innerHTML = `<div class="stats">
          <div class="stat"><p class="stat__lbl">Unidades por mes</p><p class="stat__val num">${num(ceil(u), 0)}</p></div>
          <div class="stat"><p class="stat__lbl">Facturación por mes</p><p class="stat__val num">${m0(u * T.precioProm)}</p></div>
          <div class="stat"><p class="stat__lbl">Por semana</p><p class="stat__val num">${num(ceil(u / 4.33), 0)} u.</p></div>
          <div class="stat"><p class="stat__lbl">Horas de trabajo</p><p class="stat__val num">${num(T.horas * f, 0)} h/mes</p></div>
        </div>
        <p class="mt">(${m0(T.F)} de fijos + ${m0(X)} de ganancia) ÷ ${money(T.wcm)} que deja cada unidad en promedio.</p>
        <h3 class="form-sub">Repartido según tu mezcla</h3>
        <ul class="plain">${A.rows.filter(r => r.unidadesMes > 0).map(r => `<li><b>${esc(r.p.nombre)}</b>: ${num(ceil(r.ventasMin * f), 0)} minorista${r.ventasMay ? ' + ' + num(ceil(r.ventasMay * f), 0) + ' mayorista' : ''}</li>`).join('')}</ul>
        ${T.horas * f > 160 ? '<p class="banner">Son más de 160 horas por mes: es más que un trabajo de tiempo completo. Pensá en subir precios o en los productos que dejan más por hora (mirá el Ranking).</p>' : ''}
        ${nota}`;
    } else {
      const r = A.byId[s.metaProd];
      const rows = ['min', 'may'].map(k => {
        const c = r.canales[k];
        const precio = c.precio || c.sugerido;
        const cc = C.canal(precio, r.costoVar, r.costoTotal, c.pctCobro, c.pctImp);
        const u = unidadesPara(T.F, cc.contrib, X);
        return `<tr><td>${k === 'min' ? 'Minorista' : 'Mayorista'}${c.precio ? '' : '<br><span class="muted small">con precio sugerido</span>'}</td><td>${isFinite(u) ? num(ceil(u), 0) : '—'}</td><td>${isFinite(u) ? m0(u * precio) : '—'}</td><td>${isFinite(u) ? num(u * r.minUnidad / 60, 0) + ' h' : '—'}</td></tr>`;
      }).join('');
      out.innerHTML = `<p>Si vendieras <b>solo ${esc(r.p.nombre)}</b>, para cubrir ${m0(T.F)} de fijos y ganar ${m0(X)}:</p>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Canal</th><th>Unidades</th><th>Facturación</th><th>Trabajo</th></tr></thead><tbody>${rows}</tbody></table></div>${nota}`;
    }
  }

  function rankOut() {
    const by = S.t.rankBy;
    const val = r => by === 'unidad' ? r.canales.min.ganancia : by === 'hora' ? r.gananciaHora : r.canales.min.margen;
    const fmt = v => !isFinite(v) ? '—' : by === 'margen' ? pctTxt(v) : money(v, { noCents: true });
    const rows = S.A.rows.filter(r => r.canales.min.precio).sort((a, b) => (isFinite(val(b)) ? val(b) : -1e15) - (isFinite(val(a)) ? val(a) : -1e15));
    const max = Math.max(...rows.map(val).filter(isFinite).map(Math.abs), 1e-9);
    const sinPrecio = S.A.rows.filter(r => !r.canales.min.precio);
    const expl = {
      unidad: 'Ganancia limpia por cada unidad vendida (ya descontados materiales, tu hora, fijos y comisiones).',
      hora: 'Cuánta plata te queda por cada hora de trabajo: tu sueldo por hora más la ganancia. Sirve para ver qué producto aprovecha mejor tu tiempo.',
      margen: 'De cada $ 100 que cobrás, cuánto es ganancia.'
    }[by];
    $('#toolOut').innerHTML = `<p class="help">${expl}</p>
      <ol class="ranking">${rows.map((r, i) => {
        const v = val(r);
        const w = isFinite(v) ? Math.abs(v) / max * 100 : 0;
        return `<li>
          <a href="#producto/${encodeURIComponent(r.p.id)}"><span class="ranking__pos">${i + 1}</span><span class="ranking__name">${esc(r.p.nombre)}</span><b class="num ${v < 0 ? 'neg' : ''}">${fmt(v)}</b></a>
          <div class="hbar__track"><div class="hbar__fill" style="width:${w.toFixed(1)}%;background:${v < 0 ? 'var(--c-gas)' : 'var(--sage)'}"></div></div>
          <p class="hbar__meta">Por unidad ${money(r.canales.min.ganancia)} · por hora ${isFinite(r.gananciaHora) ? m0(r.gananciaHora) : '—'} · margen ${pctTxt(r.canales.min.margen, 0)}</p>
        </li>`;
      }).join('')}</ol>
      ${sinPrecio.length ? `<p class="small muted mt">Sin precio minorista (no entran): ${sinPrecio.map(r => esc(r.p.nombre)).join(', ')}.</p>` : ''}`;
  }

  function comboOut() {
    const cb = S.t.combo, A = S.A;
    let costo = cb.extra || 0, costoVar = cb.extra || 0, lista = 0, faltaPrecio = false, pctCobro = 0, pctImp = 0;
    cb.items.forEach(it => {
      const r = A.byId[it.productoId];
      if (!r || !it.cant) return;
      const c = r.canales[cb.canal];
      pctCobro = c.pctCobro; pctImp = c.pctImp;
      costo += r.costoTotal * it.cant;
      costoVar += r.costoVar * it.cant;
      const pr = c.precio || c.sugerido;
      if (!c.precio) faltaPrecio = true;
      lista += pr * it.cant;
    });
    const out = $('#toolOut');
    if (!lista) { out.innerHTML = '<p class="muted">Agregá productos al combo.</p>'; return; }
    const precio = redondear(lista * (1 - (cb.desc || 0) / 100), S.taller.redondeo);
    const c = C.canal(precio, costoVar, costo, pctCobro, pctImp);
    const sep = C.canal(lista, costoVar, costo, pctCobro, pctImp);
    const dm = descuentoMax(lista, costo, costoVar, pctCobro, pctImp);
    out.innerHTML = `<dl class="kv">
        <div><dt>Por separado costarían</dt><dd class="num">${money(lista)}</dd></div>
        <div class="kv__sum"><dt>Precio del combo (−${num(cb.desc || 0)} %, redondeado)</dt><dd class="num">${money(precio)}</dd></div>
        <div><dt>Costo total del combo</dt><dd class="num">${money(costo)}</dd></div>
        <div><dt>− Comisión e impuestos</dt><dd class="num">${money(-(c.comision + c.impuesto))}</dd></div>
        <div class="kv__sum"><dt>Ganancia por combo</dt><dd class="num ${c.ganancia >= 0 ? 'pos' : 'neg'}">${money(c.ganancia)}</dd></div>
        <div><dt>Margen</dt><dd class="num">${pctTxt(c.margen)}</dd></div>
        <div><dt>Vendiendo todo por separado ganarías</dt><dd class="num">${money(sep.ganancia)}</dd></div>
      </dl>
      <p class="mt ${c.ganancia >= 0 ? '' : 'neg'}">Podés descontar hasta <b>${pctTxt(dm.total)}</b> sin perder plata (${m0(lista * (1 - dm.total))}). Más allá de <b>${pctTxt(dm.piso)}</b> ni siquiera cubrís materiales y tu tiempo.</p>
      ${faltaPrecio ? '<p class="small muted">Algún producto no tiene precio cargado: usé el sugerido.</p>' : ''}`;
  }

  function descOut() {
    const s = S.t, A = S.A;
    const r = A.byId[s.descProd];
    const c = r.canales[s.descCanal];
    const lista = c.precio || c.sugerido;
    const out = $('#toolOut');
    if (!isFinite(lista) || !lista) { out.innerHTML = '<p class="muted">Este producto no tiene precio.</p>'; return; }
    const dm = descuentoMax(lista, r.costoTotal, r.costoVar, c.pctCobro, c.pctImp);
    const calc = d => C.canal(lista * (1 - d / 100), r.costoVar, r.costoTotal, c.pctCobro, c.pctImp);
    const cur = calc(s.descPct || 0);
    const steps = [5, 10, 15, 20, 25, 30, 40, 50];
    out.innerHTML = `<dl class="kv">
        <div><dt>Precio de lista${c.precio ? '' : ' (sugerido)'}</dt><dd class="num">${money(lista)}</dd></div>
        <div class="kv__sum"><dt>Con ${num(s.descPct || 0)} % de descuento</dt><dd class="num">${money(cur.precio)}</dd></div>
        <div><dt>Te queda neto</dt><dd class="num">${money(cur.neto)}</dd></div>
        <div class="kv__sum"><dt>Ganancia por unidad</dt><dd class="num ${cur.ganancia >= 0 ? 'pos' : 'neg'}">${money(cur.ganancia)}</dd></div>
        <div><dt>Margen</dt><dd class="num">${pctTxt(cur.margen)}</dd></div>
      </dl>
      <div class="limits">
        <div class="limit limit--ok"><p class="limit__lbl">Descuento máximo sin perder</p><p class="limit__val">${pctTxt(dm.total)}</p><p class="small">Precio mínimo ${money(lista * (1 - dm.total))}. Cubre todo: materiales, tu hora y fijos.</p></div>
        <div class="limit limit--bad"><p class="limit__lbl">Límite absoluto</p><p class="limit__val">${pctTxt(dm.piso)}</p><p class="small">Más que esto, cada venta te saca plata del bolsillo (no cubre los materiales ni tu tiempo).</p></div>
      </div>
      <p class="small muted mt">Entre los dos límites, la venta ayuda a pagar algo de los fijos pero no deja ganancia. Sirve para liquidar stock, no como precio de siempre.</p>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Descuento</th><th>Precio</th><th>Ganancia</th><th>Margen</th></tr></thead>
        <tbody>${steps.map(d => { const x = calc(d); return `<tr><td>${d} %</td><td>${money(x.precio, { noCents: true })}</td><td class="${x.ganancia >= 0 ? 'pos' : 'neg'}">${money(x.ganancia)}</td><td>${pctTxt(x.margen, 0)}</td></tr>`; }).join('')}</tbody>
      </table></div>`;
  }

  /* =============================== MI TALLER =============================== */
  function renderTaller() {
    const el = $('#view-taller');
    const T = S.taller, A = S.A;
    const F = A.F;
    const medioOpts = sel => S.medios.map(m => `<option value="${esc(m.id)}"${m.id === sel ? ' selected' : ''}>${esc(m.nombre)} (${num(m.pct)} %)</option>`).join('');
    el.innerHTML = `
      <div class="card">
        <div class="card__head"><h2>Tu mano de obra</h2></div>
        <label class="field"><span>Lo que vale tu hora de trabajo</span>
          <input data-money data-set="valorHora" data-type="money" inputmode="decimal" placeholder="$ 0" value="${T.valorHora ? moneyInput(T.valorHora) : ''}" autocomplete="off"></label>
        <details class="more mt" id="horaCalc">
          <summary>Ayudame a calcularla</summary>
          <div class="grid2">
            <label class="field"><span>Quiero cobrarme por mes</span><input id="hcSueldo" data-money inputmode="decimal" placeholder="$ 0" autocomplete="off"></label>
            <label class="field"><span>Horas que trabajo por mes</span><input id="hcHoras" inputmode="decimal" placeholder="Ej: 80" autocomplete="off"></label>
          </div>
          <p class="calc-line" id="hcOut"></p>
          <button class="btn btn--ghost btn--sm" type="button" id="hcUse" hidden>Usar este valor</button>
        </details>
        <p class="help mt">Tu tiempo también es un costo: si no lo contás, estás regalando tu trabajo. Se suma al costo de cada producto según las horas por tanda.${A.totals.horas ? ` Con lo que estimás vender, trabajás unas <b>${num(A.totals.horas, 0)} h por mes</b>.` : ''}</p>
      </div>

      <div class="card">
        <div class="card__head"><h2>Costos fijos del mes</h2><span class="num"><b>${money(F, { noCents: true })}</b></span></div>
        ${S.fijos.length ? `<ul class="set-list">${S.fijos.map(f => `<li><span class="name">${esc(f.nombre)}</span><span class="num">${money(f.monto, { noCents: true })}</span><button class="icon-btn" type="button" data-act="fijo" data-id="${esc(f.id)}" aria-label="Editar ${esc(f.nombre)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></li>`).join('')}</ul>` : '<p class="muted">Todavía no cargaste ninguno.</p>'}
        <div class="chips mt">${SUG_FIJOS.filter(n => !S.fijos.some(f => norm(f.nombre) === norm(n))).map(n => `<button class="chip chip--add" type="button" data-act="fijo-sug" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}<button class="chip chip--add" type="button" data-act="fijo">+ Otro</button></div>
        <h3 class="form-sub">Cómo se reparten entre los productos</h3>
        <div class="seg" role="radiogroup" aria-label="Prorrateo" id="tProrrateo">
          <button type="button" role="radio" aria-checked="${T.prorrateo !== 'horas'}" data-v="unidades">Por unidad</button>
          <button type="button" role="radio" aria-checked="${T.prorrateo === 'horas'}" data-v="horas">Por horas de trabajo</button>
        </div>
        <p class="help mt">${T.prorrateo === 'horas' ? 'Cada producto carga fijos según cuánto tiempo te lleva: lo que más trabajo da, más fijo paga.' : 'Todas las unidades cargan lo mismo de fijos, sin importar el producto.'}
          ${A.totals.unidades ? ` Hacés unas <b>${num(A.totals.unidades, 0)} unidades por mes</b>${T.prorrateo !== 'horas' ? ': a cada una le tocan <b>' + money(F / A.totals.unidades) + '</b>' : ''}.` : ' <span class="neg">Cargá en cada producto cuánto vendés por mes para poder repartirlos.</span>'}</p>
        ${explica('fijos')}${explica('prorrateo')}
      </div>

      <div class="card">
        <div class="card__head"><h2>Cobros e impuestos</h2></div>
        <ul class="set-list">${S.medios.map(m => `<li><span class="name">${esc(m.nombre)}</span><span class="num">${num(m.pct)} %</span><button class="icon-btn" type="button" data-act="medio" data-id="${esc(m.id)}" aria-label="Editar ${esc(m.nombre)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></li>`).join('')}</ul>
        <button class="btn btn--ghost btn--sm mt" type="button" data-act="medio">+ Medio de cobro</button>
        <p class="help mt">Las comisiones cambian seguido: revisá las tasas actuales de tu cuenta y corregilas.</p>
        <div class="grid2">
          <label class="field"><span>Cobrás al por menor con</span><select data-set="medioMin">${medioOpts(T.medioMin)}</select></label>
          <label class="field"><span>Cobrás al por mayor con</span><select data-set="medioMay">${medioOpts(T.medioMay)}</select></label>
        </div>
        <label class="field mt"><span>Impuestos sobre la venta (%)</span>
          <input data-set="impuestoPct" data-type="num" inputmode="decimal" placeholder="0" value="${T.impuestoPct ? num(T.impuestoPct) : ''}" autocomplete="off"></label>
        <p class="help">Por ejemplo Ingresos Brutos, si pagás un % de lo que vendés. El monotributo es una cuota fija: cargalo en costos fijos.</p>
      </div>

      <div class="card">
        <div class="card__head"><h2>Cómo calcular el precio</h2></div>
        <div class="seg" role="radiogroup" aria-label="Método" id="tModo">
          <button type="button" role="radio" aria-checked="${T.modo !== 'markup'}" data-v="margen">Por margen</button>
          <button type="button" role="radio" aria-checked="${T.modo === 'markup'}" data-v="markup">Por markup</button>
        </div>
        <div class="grid2">
          <label class="field"><span>${T.modo === 'markup' ? 'Markup' : 'Margen'} minorista (%)</span><input data-set="objMin" data-type="num" inputmode="decimal" value="${num(T.objMin)}" autocomplete="off"></label>
          <label class="field"><span>${T.modo === 'markup' ? 'Markup' : 'Margen'} mayorista (%)</span><input data-set="objMay" data-type="num" inputmode="decimal" value="${num(T.objMay)}" autocomplete="off"></label>
        </div>
        <p class="calc-line">${T.modo === 'markup' ? `Markup ${num(T.objMin)} % equivale a un margen de ${pctTxt(T.objMin / (100 + T.objMin))}.` : (T.objMin < 100 ? `Margen ${num(T.objMin)} % equivale a un markup de ${pctTxt(T.objMin / (100 - T.objMin))}.` : 'El margen tiene que ser menor a 100 %.')}</p>
        <label class="field mt"><span>Redondear precios sugeridos hacia arriba a</span>
          <select data-set="redondeo" data-type="num">${[[0, 'Sin redondear'], [10, '$ 10'], [50, '$ 50'], [100, '$ 100'], [500, '$ 500'], [1000, '$ 1.000']].map(([v, n]) => `<option value="${v}"${+T.redondeo === v ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        ${explica('margenMarkup')}
      </div>

      <div class="card">
        <div class="card__head"><h2>Tus datos</h2></div>
        <p class="help">Todo vive en este celular. Guardá una copia seguido.${S.settings.ultimaCopia ? ' Última copia: ' + dmy(S.settings.ultimaCopia.slice(0, 10)) + '.' : ''}</p>
        <div class="row-actions">
          <button class="btn btn--primary" type="button" data-act="backup">Guardar copia</button>
          ${canShareFiles() ? '<button class="btn btn--ghost" type="button" data-act="share">Compartir copia</button>' : ''}
          <button class="btn btn--ghost" type="button" data-act="import">Restaurar una copia</button>
        </div>
        <h3 class="form-sub">Para Excel</h3>
        <div class="row-actions">
          <button class="btn btn--ghost btn--sm" type="button" data-act="csv-productos">Productos y costos</button>
          <button class="btn btn--ghost btn--sm" type="button" data-act="csv-insumos">Insumos</button>
          <button class="btn btn--ghost btn--sm" type="button" data-act="csv-historial">Historial de precios</button>
          <button class="btn btn--ghost btn--sm" type="button" data-act="csv-fijos">Costos fijos</button>
        </div>
        <h3 class="form-sub">Otros</h3>
        <div class="row-actions">
          <button class="btn btn--ghost btn--sm" type="button" data-act="ejemplo">Cargar ejemplo</button>
          <button class="btn btn--danger-ghost btn--sm" type="button" data-act="borrar-todo">Borrar todo</button>
        </div>
      </div>

      <div class="card" id="installCard" ${installEvt || isStandalone() ? 'hidden' : ''}>
        <div class="card__head"><h2>Instalala en el celular</h2></div>
        <p class="help">En Android (Chrome): menú ⋮ → <b>Instalar app</b> o <b>Agregar a pantalla principal</b>. En iPhone (Safari): botón compartir → <b>Agregar a inicio</b>. Funciona sin internet.</p>
      </div>
      ${installEvt ? '<div class="row-actions"><button class="btn btn--primary" type="button" data-act="install">Instalar la app</button></div>' : ''}

      <div class="about">
        <span class="mark m-wordmark" aria-hidden="true"></span>
        <p>Costos y precios · hecho para el taller</p>
      </div>`;

    // Calculadora de la hora
    const hc = () => {
      const s = parseMoney($('#hcSueldo').value), h = parseNum($('#hcHoras').value);
      const ok = s > 0 && h > 0;
      $('#hcOut').innerHTML = ok ? `Tu hora vale <b>${money(s / h, { noCents: true })}</b>.` : '';
      $('#hcUse').hidden = !ok;
      $('#hcUse').dataset.v = ok ? Math.round(s / h) : '';
    };
    $('#hcSueldo').addEventListener('input', hc);
    $('#hcHoras').addEventListener('input', hc);
    $('#hcUse').addEventListener('click', async e => {
      S.taller.valorHora = Math.round(+e.target.dataset.v / 100) * 100;
      await saveKV('taller'); refresh(); toast('Valor de tu hora guardado');
    });
  }
  $('#view-taller').addEventListener('change', async e => {
    const el = e.target.closest('[data-set]');
    if (!el) return;
    const k = el.dataset.set, type = el.dataset.type;
    let v = el.value;
    if (type === 'money') v = parseMoney(v) || 0;
    else if (type === 'num') v = parseNum(v) || 0;
    if ((k === 'objMin' || k === 'objMay') && S.taller.modo !== 'markup' && v >= 100) { toast('El margen tiene que ser menor a 100 %'); refresh(); return; }
    S.taller[k] = v;
    await saveKV('taller');
    refresh();
    toast('Guardado');
  });
  $('#view-taller').addEventListener('segchange', async e => {
    if (e.target.id === 'tProrrateo') S.taller.prorrateo = e.detail;
    else if (e.target.id === 'tModo') {
      S.taller.modo = e.detail;
      if (e.detail !== 'markup') { S.taller.objMin = Math.min(S.taller.objMin, 90); S.taller.objMay = Math.min(S.taller.objMay, 90); }
    } else return;
    await saveKV('taller');
    refresh();
  });

  /* ---------- Costos fijos y medios ---------- */
  let editFijo = null, editMedio = null;
  function openFijo(id, nombre) {
    const f = id ? S.fijos.find(x => x.id === id) : null;
    editFijo = f;
    $('#fNombre').value = f ? f.nombre : (nombre || '');
    $('#fMonto').value = f ? moneyInput(f.monto) : '';
    $('#fErr').textContent = '';
    $('#fBorrar').hidden = !f;
    openDlg($('#dlgFijo'));
    setTimeout(() => (nombre ? $('#fMonto') : $('#fNombre')).focus(), 60);
  }
  $('#formFijo').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#fNombre').value.trim(), monto = parseMoney($('#fMonto').value);
    if (!nombre) { $('#fErr').textContent = 'Poné un nombre.'; return; }
    if (!(monto >= 0) || monto == null) { $('#fErr').textContent = 'Poné el monto por mes.'; return; }
    const before = analyze(S);
    if (editFijo) Object.assign(editFijo, { nombre, monto });
    else S.fijos.push({ id: uid(), nombre, monto });
    await saveKV('fijos');
    closeDlg($('#dlgFijo'));
    refresh();
    if (!alertDiff(before)) toast('Costo fijo guardado');
  });
  $('#fBorrar').addEventListener('click', async () => {
    S.fijos = S.fijos.filter(f => f !== editFijo);
    await saveKV('fijos');
    closeDlg($('#dlgFijo'));
    refresh();
    toast('Costo fijo borrado');
  });
  function openMedio(id) {
    const m = id ? S.medios.find(x => x.id === id) : null;
    editMedio = m;
    $('#mNombre').value = m ? m.nombre : '';
    $('#mPct').value = m ? num(m.pct) : '';
    $('#mErr').textContent = '';
    $('#mBorrar').hidden = !m || S.medios.length <= 1;
    openDlg($('#dlgMedio'));
  }
  $('#formMedio').addEventListener('submit', async e => {
    e.preventDefault();
    const nombre = $('#mNombre').value.trim(), pct = parseNum($('#mPct').value) || 0;
    if (!nombre) { $('#mErr').textContent = 'Poné un nombre.'; return; }
    if (pct < 0 || pct >= 100) { $('#mErr').textContent = 'La comisión tiene que estar entre 0 y 100 %.'; return; }
    const before = analyze(S);
    if (editMedio) Object.assign(editMedio, { nombre, pct });
    else S.medios.push({ id: uid(), nombre, pct });
    await saveKV('medios');
    closeDlg($('#dlgMedio'));
    refresh();
    if (!alertDiff(before)) toast('Medio de cobro guardado');
  });
  $('#mBorrar').addEventListener('click', async () => {
    const m = editMedio;
    S.medios = S.medios.filter(x => x !== m);
    if (S.taller.medioMin === m.id) S.taller.medioMin = S.medios[0].id;
    if (S.taller.medioMay === m.id) S.taller.medioMay = S.medios[0].id;
    await saveKV('medios'); await saveKV('taller');
    closeDlg($('#dlgMedio'));
    refresh();
  });

  /* =============================== ACCIONES =============================== */
  const ACTS = {
    'ejemplo': cargarEjemplo,
    'bulk': () => { if (S.insumos.length) openBulk(); else toast('Primero cargá insumos'); },
    'nuevo-ins': () => openInsumo(null),
    'ins': b => openInsumo(b.dataset.id),
    'nuevo-prod': () => openProducto(null),
    'edit-prod': () => openProducto(S.param),
    'dup-prod': () => openProducto(S.param, true),
    'del-prod': () => deleteProducto(S.param),
    'ficha': () => printFicha(S.param),
    'use-sug': async b => {
      const p = producto(S.param);
      const k = b.dataset.k;
      p[k === 'min' ? 'precioMin' : 'precioMay'] = Math.round(S.A.byId[p.id].canales[k].sugerido);
      await DB.put('productos', p);
      refresh();
      toast('Precio actualizado');
    },
    'fijo': b => openFijo(b.dataset.id || null),
    'fijo-sug': b => openFijo(null, b.dataset.n),
    'medio': b => openMedio(b.dataset.id || null),
    'backup': () => downloadBackup(),
    'share': () => shareBackup(),
    'import': () => $('#fileImport').click(),
    'csv-productos': csvProductos,
    'csv-insumos': csvInsumos,
    'csv-historial': csvHistorial,
    'csv-fijos': csvFijos,
    'borrar-todo': borrarTodo,
    'install': async () => {
      if (!installEvt) return;
      installEvt.prompt();
      await installEvt.userChoice;
      installEvt = null;
      refresh();
    }
  };
  $('#main').addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || !ACTS[b.dataset.act]) return;
    e.preventDefault();
    ACTS[b.dataset.act](b);
  });

  /* =============================== FICHA =============================== */
  function printFicha(id) {
    const r = S.A.byId[id];
    if (!r) return;
    const p = r.p, T = S.taller;
    const canal = (k, n) => {
      const c = r.canales[k];
      return `<tr><td>${n}</td><td>${c.precio ? money(c.precio) : '—'}</td><td>${isFinite(c.sugerido) ? money(c.sugerido) : '—'}</td><td>${c.precio ? money(c.neto) : '—'}</td><td>${c.precio ? money(c.ganancia) : '—'}</td><td>${c.precio ? pctTxt(c.margen) : '—'}</td><td>${c.precio ? pctTxt(c.markup) : '—'}</td></tr>`;
    };
    const cMin = r.canales.min;
    const pe = cMin.precio && cMin.contrib > 0 ? S.A.F / cMin.contrib : Infinity;
    $('#ficha').innerHTML = `
      <header class="ficha__head">
        <span class="mark m-wordmark" aria-hidden="true"></span>
        <div><p class="ficha__kicker">Ficha de costo · ${dmy(today())}</p><h1>${esc(p.nombre)}</h1></div>
      </header>
      <p>Tanda: <b>${num(r.rinde)} unidades</b> · Trabajo: <b>${num((p.minutos || 0) / 60, 2)} h</b> por tanda${p.merma ? ' · Merma: <b>' + num(p.merma) + ' %</b>' : ''}</p>
      <h2>Materiales</h2>
      <table><thead><tr><th>Insumo</th><th>Cantidad</th><th>Costo unitario</th><th>Por unidad</th><th>Por tanda</th></tr></thead><tbody>
        ${r.items.filter(x => x.ins).map(x => `<tr><td>${esc(x.ins.nombre)}</td><td>${cantTxt(x.it.cantidad, x.it.unidad)} ${x.it.por === 'unidad' ? 'por unidad' : 'por tanda'}</td><td>${moneyFine(costoBase(x.ins))} / ${unidTxt(ubase(x.ins.unidad))}</td><td>${moneyFine(x.porUnidad)}</td><td>${money(x.porTanda)}</td></tr>`).join('')}
        ${r.merma ? `<tr><td>Merma</td><td>${num(p.merma)} %</td><td></td><td>${moneyFine(r.mermaUnidad)}</td><td>${money(r.mermaUnidad * r.rinde)}</td></tr>` : ''}
        <tr class="tot"><td colspan="3">Total materiales</td><td>${money(r.matUnidad)}</td><td>${money(r.matTanda)}</td></tr>
      </tbody></table>
      <h2>Costo por unidad</h2>
      <table><tbody>
        <tr><td>Materiales</td><td>${money(r.matUnidad)}</td></tr>
        <tr><td>Mano de obra (${money(T.valorHora || 0, { noCents: true })} la hora)</td><td>${money(r.moUnidad)}</td></tr>
        <tr><td>Costos fijos prorrateados (${T.prorrateo === 'horas' ? 'por horas' : 'por unidad'})</td><td>${money(r.fijoUnidad)}</td></tr>
        <tr class="tot"><td>Costo total</td><td>${money(r.costoTotal)}</td></tr>
        <tr><td>Costo de la tanda</td><td>${money(r.costoTotal * r.rinde)}</td></tr>
      </tbody></table>
      <h2>Precios</h2>
      <table><thead><tr><th>Canal</th><th>Precio</th><th>Sugerido</th><th>Neto</th><th>Ganancia</th><th>Margen</th><th>Markup</th></tr></thead><tbody>
        ${canal('min', 'Minorista (' + esc(cMin.medio.nombre) + ')')}${canal('may', 'Mayorista (' + esc(r.canales.may.medio.nombre) + ')')}
      </tbody></table>
      <p class="ficha__note">Objetivo: ${num(r.obj.min)} % / ${num(r.obj.may)} % de ${r.obj.modo}. Comisiones e impuestos (${num(cMin.pctImp)} %) descontados del precio.
      ${isFinite(pe) ? ` Punto de equilibrio si fuera el único producto: ${num(ceil(pe), 0)} unidades/mes (${money(pe * cMin.precio, { noCents: true })}).` : ''}</p>
      <p class="ficha__note">Costos fijos del taller: ${money(S.A.F, { noCents: true })}/mes.</p>`;
    const prevTitle = document.title;
    document.title = 'Ficha de costo - ' + p.nombre;
    setTimeout(() => {
      window.print();
      document.title = prevTitle;
    }, 50);
  }

  /* =============================== DATOS =============================== */
  const kvRows = () => ['fijos', 'medios', 'taller', 'combos'].map(key => ({ key, value: S[key] }));
  function backupBlob() {
    const data = { app: 'costos-lqdemp', version: 1, exportado: new Date().toISOString(), insumos: S.insumos, productos: S.productos, kv: kvRows() };
    return new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  }
  const backupName = () => 'costos-copia-' + today() + '.json';
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  async function markBackup() {
    S.settings.ultimaCopia = new Date().toISOString();
    await saveKV('settings');
    refresh();
  }
  async function downloadBackup() {
    download(backupBlob(), backupName());
    await markBackup();
    toast('Copia guardada en Descargas');
  }
  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['x'], 'x.json', { type: 'application/json' })] })); } catch (e) { return false; }
  }
  async function shareBackup() {
    const file = new File([backupBlob()], backupName(), { type: 'application/json' });
    try {
      await navigator.share({ files: [file], title: 'Copia de Costos y precios' });
      await markBackup();
      toast('Copia compartida');
    } catch (e) {
      if (e.name !== 'AbortError') downloadBackup();
    }
  }
  $('#fileImport').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let data;
    try { data = JSON.parse(await file.text()); } catch (err) { toast('Ese archivo no es una copia válida'); return; }
    if (!data || data.app !== 'costos-lqdemp' || !Array.isArray(data.insumos) || !Array.isArray(data.productos)) {
      toast('Ese archivo no es una copia de esta app'); return;
    }
    const fecha = data.exportado ? dmy(data.exportado.slice(0, 10)) : '¿?';
    const ok = await confirmBox('¿Restaurar esta copia?',
      `La copia es del ${fecha}: ${data.insumos.length} insumos y ${data.productos.length} productos. Reemplaza todo lo que hay ahora en el celular.`, 'Sí, restaurar', false);
    if (!ok) return;
    const insumos = data.insumos.filter(i => i && i.id && typeof i.precio === 'number');
    const productos = data.productos.filter(p => p && p.id && Array.isArray(p.items));
    const kv = (data.kv || []).filter(r => r && ['fijos', 'medios', 'taller', 'combos'].includes(r.key));
    kv.push({ key: 'settings', value: S.settings });
    await DB.replaceAll({ insumos, productos, kv });
    await load();
    refresh();
    toast(`Copia restaurada: ${insumos.length} insumos, ${productos.length} productos`);
  });

  /* ---------- Excel / CSV ---------- */
  const csvNum = (v, d) => !isFinite(v) ? '' : (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace('.', ',');
  const pesos = (cents, d) => csvNum((cents || 0) / 100, d == null ? 2 : d);
  function csv(head, rows, name) {
    const q = v => {
      const s = String(v == null ? '' : v);
      return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const text = String.fromCharCode(0xFEFF) + [head, ...rows].map(r => r.map(q).join(';')).join('\r\n');
    download(new Blob([text], { type: 'text/csv;charset=utf-8' }), name + '-' + today() + '.csv');
    toast('Archivo para Excel descargado');
  }
  function csvProductos() {
    if (!S.productos.length) { toast('No hay productos'); return; }
    const head = ['Producto', 'Unidades por tanda', 'Horas por tanda', 'Materiales x unidad', 'Mano de obra x unidad', 'Fijos x unidad', 'Costo total x unidad',
      'Precio minorista', 'Sugerido minorista', 'Neto minorista', 'Ganancia minorista', 'Margen minorista %', 'Markup minorista %',
      'Precio mayorista', 'Sugerido mayorista', 'Neto mayorista', 'Ganancia mayorista', 'Margen mayorista %', 'Markup mayorista %',
      'Ventas/mes minorista', 'Ventas/mes mayorista', 'Estado'];
    const rows = S.A.rows.slice().sort((a, b) => byName(a.p, b.p)).map(r => {
      const m = r.canales.min, w = r.canales.may;
      const c = x => [x.precio ? pesos(x.precio) : '', isFinite(x.sugerido) ? pesos(x.sugerido) : '', x.precio ? pesos(x.neto) : '', x.precio ? pesos(x.ganancia) : '', x.precio ? csvNum(x.margen * 100, 1) : '', x.precio ? csvNum(x.markup * 100, 1) : ''];
      return [r.p.nombre, csvNum(r.rinde, 2), csvNum((r.p.minutos || 0) / 60, 2), pesos(r.matUnidad), pesos(r.moUnidad), pesos(r.fijoUnidad), pesos(r.costoTotal),
        ...c(m), ...c(w), csvNum(r.ventasMin, 0), csvNum(r.ventasMay, 0), ESTADOS[r.estado][0]];
    });
    csv(head, rows, 'costos-productos');
  }
  function csvInsumos() {
    if (!S.insumos.length) { toast('No hay insumos'); return; }
    const head = ['Insumo', 'Categoría', 'Proveedor', 'Precio del paquete', 'Cantidad', 'Unidad', 'Costo por unidad base', 'Unidad base', 'Actualizado', 'Usado en'];
    const rows = S.insumos.slice().sort(byName).map(i => [i.nombre, i.categoria || '', i.proveedor || '', pesos(i.precio), csvNum(i.cantidad, 3), unidTxt(i.unidad),
      pesos(costoBase(i), 4), unidTxt(ubase(i.unidad)), i.actualizado ? dmy(i.actualizado) : '', usos(i.id).map(p => p.nombre).join(', ')]);
    csv(head, rows, 'costos-insumos');
  }
  function csvHistorial() {
    const rows = [];
    S.insumos.slice().sort(byName).forEach(i => (i.historial || []).forEach(h => rows.push([i.nombre, dmy(h.fecha), pesos(h.precio), csvNum(h.cantidad, 3), unidTxt(h.unidad), pesos(costoBase(h), 4)])));
    if (!rows.length) { toast('No hay historial todavía'); return; }
    csv(['Insumo', 'Fecha', 'Precio', 'Cantidad', 'Unidad', 'Costo por unidad base'], rows, 'costos-historial');
  }
  function csvFijos() {
    if (!S.fijos.length) { toast('No hay costos fijos'); return; }
    csv(['Costo fijo', 'Monto por mes'], S.fijos.map(f => [f.nombre, pesos(f.monto)]).concat([['TOTAL', pesos(S.A.F)]]), 'costos-fijos');
  }

  async function borrarTodo() {
    if (!await confirmBox('¿Borrar todo?', 'Se borran insumos, productos, costos fijos y configuración de este celular. Si no guardaste una copia, no se puede recuperar.')) return;
    await DB.replaceAll({ insumos: [], productos: [], kv: [{ key: 'settings', value: S.settings }] });
    await load();
    location.hash = '#inicio';
    refresh();
    toast('Listo, la app quedó vacía');
  }

  /* ---------- Ejemplo ---------- */
  async function cargarEjemplo() {
    if (S.insumos.length || S.productos.length) {
      if (!await confirmBox('¿Cargar el ejemplo?', 'Reemplaza todo lo que cargaste por un ejemplo de sahumerios. Guardá una copia antes si querés conservarlo.', 'Sí, cargar ejemplo')) return;
    }
    const hace = d => { const x = new Date(); x.setDate(x.getDate() - d); return isoDate(x); };
    const ins = (id, nombre, categoria, precio, cantidad, unidad, prev) => {
      const historial = prev.map((pp, k) => ({ fecha: hace(30 * (prev.length - k) + 50), precio: pp * 100, cantidad, unidad }))
        .concat({ fecha: hace(12), precio: precio * 100, cantidad, unidad });
      return { id, nombre, categoria, proveedor: '', precio: precio * 100, cantidad, unidad, historial, actualizado: hace(12) };
    };
    const insumos = [
      ins('i-base', 'Polvo base para sahumerio', 'Masa', 8000, 1, 'kg', [6200, 7000]),
      ins('i-carbon', 'Carbón vegetal molido', 'Masa', 5000, 1, 'kg', [4200]),
      ins('i-goma', 'Goma guar', 'Masa', 6000, 500, 'g', [5000]),
      ins('i-esencia', 'Esencia aromática', 'Esencias', 9000, 100, 'ml', [7000, 8000]),
      ins('i-resina', 'Resina de mirra', 'Resinas y hierbas', 7500, 100, 'g', []),
      ins('i-hierbas', 'Hierbas secas (ruda, romero, lavanda)', 'Resinas y hierbas', 4000, 250, 'g', [3200]),
      ins('i-palitos', 'Varillas de bambú', 'Varillas', 12000, 1000, 'u', [10000]),
      ins('i-canastita', 'Canastita de cartón', 'Packaging', 7500, 50, 'u', []),
      ins('i-bolsa', 'Bolsa kraft', 'Packaging', 9000, 100, 'u', [7500]),
      ins('i-etiqueta', 'Etiqueta impresa', 'Packaging', 6000, 100, 'u', []),
      ins('i-hilo', 'Hilo de algodón (metro)', 'Packaging', 3000, 100, 'u', [])
    ];
    const it = (insumoId, cantidad, unidad, por) => ({ insumoId, cantidad, unidad, por });
    const productos = [
      {
        id: 'p-varilla', nombre: 'Sahumerio de varilla (caja x 10)', rinde: 20, minutos: 180, merma: 5,
        items: [it('i-base', 600, 'g', 'tanda'), it('i-carbon', 200, 'g', 'tanda'), it('i-goma', 50, 'g', 'tanda'), it('i-esencia', 40, 'ml', 'tanda'),
          it('i-palitos', 10, 'u', 'unidad'), it('i-bolsa', 1, 'u', 'unidad'), it('i-etiqueta', 1, 'u', 'unidad')],
        precioMin: 450000, precioMay: 300000, ventasMin: 60, ventasMay: 40, modo: null, objMin: null, objMay: null
      },
      {
        id: 'p-canasta', nombre: 'Canastita de defumación', rinde: 12, minutos: 120, merma: 0,
        items: [it('i-hierbas', 300, 'g', 'tanda'), it('i-resina', 60, 'g', 'tanda'), it('i-base', 150, 'g', 'tanda'),
          it('i-canastita', 1, 'u', 'unidad'), it('i-bolsa', 1, 'u', 'unidad'), it('i-etiqueta', 1, 'u', 'unidad')],
        precioMin: 380000, precioMay: 260000, ventasMin: 30, ventasMay: 20, modo: null, objMin: null, objMay: null
      },
      {
        id: 'p-atado', nombre: 'Atado de hierbas', rinde: 10, minutos: 60, merma: 0,
        items: [it('i-hierbas', 30, 'g', 'unidad'), it('i-hilo', 2, 'u', 'unidad'), it('i-etiqueta', 1, 'u', 'unidad')],
        precioMin: 250000, precioMay: 170000, ventasMin: 25, ventasMay: 10, modo: null, objMin: null, objMay: null
      }
    ];
    const fijos = [['Alquiler del taller', 60000], ['Luz', 15000], ['Gas', 8000], ['Internet', 12000], ['Monotributo', 32000], ['Puesto en la feria', 40000], ['Publicidad', 10000]]
      .map(([nombre, m], k) => ({ id: 'f-' + k, nombre, monto: m * 100 }));
    const taller = Object.assign({}, DEF_TALLER, { valorHora: 400000 });
    await DB.replaceAll({
      insumos, productos,
      kv: [{ key: 'fijos', value: fijos }, { key: 'medios', value: DEF_MEDIOS.map(m => Object.assign({}, m)) }, { key: 'taller', value: taller }, { key: 'combos', value: [] }, { key: 'settings', value: S.settings }]
    });
    await load();
    location.hash = '#inicio';
    refresh();
    toast('Ejemplo cargado. Tocá cualquier cosa para ver cómo funciona.');
  }

  /* =============================== ARRANQUE =============================== */
  async function load() {
    const [insumos, productos, fijos, medios, taller, combos, settings] = await Promise.all([
      DB.all('insumos'), DB.all('productos'), DB.get('fijos'), DB.get('medios'), DB.get('taller'), DB.get('combos'), DB.get('settings')
    ]);
    S.insumos = insumos || [];
    S.productos = productos || [];
    S.fijos = fijos || [];
    S.medios = medios && medios.length ? medios : DEF_MEDIOS.map(m => Object.assign({}, m));
    S.taller = Object.assign({}, DEF_TALLER, taller || {});
    S.combos = combos || [];
    S.settings = Object.assign({ tema: 'auto', ultimaCopia: null }, settings || {});
    applyTheme();
  }

  let installEvt = null;
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvt = e;
    if (S.view === 'taller') refresh();
  });

  (async function init() {
    await load();
    go();
    DB.persist();
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW:', err));
    }
  })();
})();
