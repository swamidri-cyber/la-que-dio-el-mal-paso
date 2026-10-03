/* Herramientas de interfaz y motor de los juegos. */
(function () {
  'use strict';

  /* ================= Utilidades de interfaz ================= */

  // Crea elementos: h('div', { class: 'x', onclick: fn }, 'texto', otroNodo)
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) agregar(el, arguments[i]);
    return el;
  }
  function agregar(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { agregar(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }

  var ICONOS = {
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    volver: '<path d="M15 5l-7 7 7 7"/>',
    ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    mal: '<path d="M7 7l10 10M17 7L7 17"/>',
    candado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    seguir: '<path d="M9 5l7 7-7 7"/>',
    trivia: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.6"/><path d="M12 17h.01"/>',
    vf: '<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>',
    unir: '<circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><path d="M7 6.5L18 17M7 17.5L18 7"/><path d="M14.5 17.5H18.5V13.5M14.5 6.5H18.5V10.5"/>',
    memo: '<rect x="3" y="5" width="8" height="13" rx="2"/><rect x="13" y="6" width="8" height="13" rx="2"/><path d="M7 9.5v4M17 10.5v4"/>',
    receta: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 7.5c0-1.5 1-2 1-3.5M14 7.5c0-1.5 1-2 1-3.5"/>',
    problema: '<path d="M12 21c-4 0-6-2.7-6-6 0-4 4-6 4-10 2.5 1.5 4 4 4 6 1-1 1.5-2 1.5-3 2 1.6 2.5 4.3 2.5 7 0 3.3-2 6-6 6z"/>',
    fichas: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H19v-3"/>',
    repaso: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
    inicio: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    progreso: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    medalla: '<circle cx="12" cy="15" r="5"/><path d="M8.5 11L6 3h4l2 5 2-5h4l-2.5 8"/>',
    mezclar: '<path d="M4 7h3c4 0 6 10 10 10h3M4 17h3c1.6 0 2.8-1.6 3.8-3.5M14 9.5C15 7.8 16 7 17 7h3"/><path d="M18 4l3 3-3 3M18 14l3 3-3 3"/>',
    instalar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    trofeo: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
    deshacer: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'
  };
  function icono(nombre, cls) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = ICONOS[nombre] || '';
    return s;
  }

  var ESTRELLA = 'M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z';
  function estrellas(n, total, cls) {
    total = total || 3;
    var box = h('span', { class: cls || 'stars', role: 'img', 'aria-label': n + ' de ' + total + ' estrellas' });
    for (var i = 0; i < total; i++) {
      var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('class', i < n ? 'on' : 'off');
      s.innerHTML = '<path d="' + ESTRELLA + '"/>';
      box.appendChild(s);
    }
    return box;
  }

  function marca(nombre, cls) {
    return h('span', { class: 'mark m-' + nombre + (cls ? ' ' + cls : ''), 'aria-hidden': 'true' });
  }

  function mezclar(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function azar(lista) { return lista[Math.floor(Math.random() * lista.length)]; }
  function esFoto(t) { return /\.(jpe?g|png|webp|gif)$/i.test(String(t)); }

  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Volutas de humo que suben desde un elemento (acierto).
  function humo(el) {
    if (quieto || !el) return;
    var r = el.getBoundingClientRect();
    for (var k = 0; k < 3; k++) {
      var s = h('span', { class: 'humo' });
      s.style.left = (r.left + r.width * (0.35 + 0.15 * k)) + 'px';
      s.style.top = (r.top - 6) + 'px';
      s.style.setProperty('--dx', (Math.random() * 24 - 12) + 'px');
      s.style.animationDelay = (k * 120) + 'ms';
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 1500);
    }
  }

  // Lluvia de pétalos en la paleta de la marca (medallas, tres estrellas).
  function petalos(n) {
    if (quieto) return;
    var colores = ['#bb7458', '#c4a27f', '#929580', '#605f4b', '#d9b99a'];
    for (var i = 0; i < (n || 26); i++) {
      var p = h('span', { class: 'petalo' });
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.setProperty('--pc', azar(colores));
      p.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
      p.style.setProperty('--r', (Math.random() * 600 - 300) + 'deg');
      p.style.setProperty('--t', (2.2 + Math.random() * 1.8) + 's');
      p.style.animationDelay = (Math.random() * 0.6) + 's';
      document.body.appendChild(p);
      setTimeout(p.remove.bind(p), 4800);
    }
  }

  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* nada */ } }

  var toastTimer;
  function toast(texto, conMarca) {
    var t = document.getElementById('toast');
    t.textContent = '';
    if (conMarca) t.appendChild(marca(conMarca));
    t.appendChild(document.createTextNode(texto));
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  // Diálogo de confirmación. Devuelve una promesa con true o false.
  function confirmar(op) {
    return new Promise(function (resolve) {
      var dlg = h('dialog', { class: 'modal', 'aria-labelledby': 'dlgT' },
        h('h2', { id: 'dlgT' }, op.titulo),
        op.texto ? h('p', null, op.texto) : null,
        h('div', { class: 'row' },
          h('button', { class: 'btn btn--ghost', type: 'button', onclick: function () { cerrar(false); } }, op.no || 'Cancelar'),
          h('button', { class: 'btn ' + (op.peligro ? 'btn--danger' : 'btn--primary'), type: 'button', onclick: function () { cerrar(true); } }, op.si || 'Aceptar')
        )
      );
      function cerrar(v) { dlg.close(); dlg.remove(); resolve(v); }
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); cerrar(false); });
      document.body.appendChild(dlg);
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    });
  }

  /* ================= Devolución después de cada respuesta ================= */

  var FRASES_OK = ['¡Bien ahí!', '¡Eso!', 'Tal cual', '¡Punto justo!', '¡Qué buena mano!', '¡Perfecto!'];
  var FRASES_MEDIO = ['Casi, casi', 'Muy cerca', 'Vas bien'];
  var FRASES_MAL = ['Uy, no era esa', 'Casi', 'Se apagó la brasa', 'No pasa nada, sigamos'];

  function feedback(op) {
    var fb = document.getElementById('fb');
    var clase = op.score >= 0.8 ? 'ok' : 'bad';
    var titulo = op.titulo || (op.score >= 0.8 ? azar(FRASES_OK) : op.score >= 0.5 ? azar(FRASES_MEDIO) : azar(FRASES_MAL));
    var btn = h('button', { class: 'btn btn--primary btn--wide', type: 'button' }, op.boton || 'Seguir', icono('seguir'));
    fb.className = 'fb fb--' + clase;
    fb.textContent = '';
    fb.appendChild(h('div', { class: 'fb__in', role: 'status' },
      h('div', { class: 'fb__head' },
        h('span', { class: 'fb__icon' }, icono(clase === 'ok' ? 'ok' : 'mal')),
        h('p', { class: 'fb__title' }, titulo)
      ),
      op.respuesta ? h('p', { class: 'fb__answer' }, op.respuesta) : null,
      op.orden ? h('ol', { class: 'fb__order' }, op.orden.map(function (t) { return h('li', null, t); })) : null,
      op.explicacion ? h('p', { class: 'fb__exp' }, op.explicacion) : null,
      (op.vuelve || op.fuente) ? h('p', { class: 'fb__meta' },
        op.vuelve ? 'Esta vuelve al final de la ronda. ' : '',
        op.fuente ? 'Fuente: ' + op.fuente : '') : null,
      btn
    ));
    setTimeout(function () { fb.classList.add('show'); btn.focus({ preventScroll: true }); }, 30);
    btn.addEventListener('click', function () {
      fb.classList.remove('show');
      setTimeout(op.onSeguir, 180);
    }, { once: true });
  }
  function ocultarFeedback() {
    var fb = document.getElementById('fb');
    if (fb) fb.classList.remove('show');
  }

  /* ================= Un renderizador por tipo de pregunta =================
     Cada uno dibuja la pregunta en `body` y llama a fin(puntaje 0-1, info). */

  var R = {};

  R.opcion = R.problema = function (p, body, fin) {
    var esProblema = p.tipo === 'problema';
    var ops = mezclar([p.correcta].concat(p.incorrectas || []));
    var botones = [];
    var cont = h('div', { class: 'q' },
      p.foto ? h('div', { class: 'q__photo' }, h('img', { src: p.foto, alt: 'Foto del taller' })) : null,
      h('h2', { class: 'q__text' }, esProblema ? p.problema : p.pregunta),
      esProblema ? h('p', { class: 'q__hint' }, '¿Cuál es la causa más probable?') : null,
      h('div', { class: 'opts' }, ops.map(function (t, i) {
        var b = h('button', { class: 'opt', type: 'button', onclick: function () { elegir(b, t); } },
          h('span', { class: 'opt__key', 'aria-hidden': 'true' }, 'ABCDEF'[i]), h('span', null, t));
        botones.push(b);
        return b;
      }))
    );
    body.appendChild(cont);

    function elegir(b, t) {
      var ok = t === p.correcta;
      botones.forEach(function (x, i) {
        x.disabled = true;
        if (ops[i] === p.correcta) x.classList.add('is-ok');
        else if (x !== b) x.classList.add('is-dim');
      });
      if (ok) humo(b); else { b.classList.add('is-bad'); vibrar(40); }
      fin(ok ? 1 : 0, { respuesta: ok ? null : 'Era: ' + p.correcta });
    }
  };

  R.vf = function (p, body, fin, op) {
    var total = (op && op.tiempo) || 12;
    var barra = h('i');
    var timer = h('div', { class: 'timer', role: 'progressbar', 'aria-label': 'Tiempo' }, barra);
    var bv, bf;
    body.appendChild(h('div', { class: 'q' },
      timer,
      h('div', { class: 'vf-card' }, h('p', null, p.afirmacion)),
      h('div', { class: 'vf-btns' },
        bv = h('button', { class: 'opt', type: 'button', onclick: function () { responder(true, bv); } }, icono('ok'), 'Verdadero'),
        bf = h('button', { class: 'opt', type: 'button', onclick: function () { responder(false, bf); } }, icono('mal'), 'Falso')
      )
    ));
    var inicio = performance.now(), listo = false, raf;
    function tic(now) {
      if (listo) return;
      var resta = Math.max(0, 1 - (now - inicio) / (total * 1000));
      barra.style.transform = 'scaleX(' + resta + ')';
      if (resta < 0.3) timer.classList.add('is-low');
      if (resta <= 0) { responder(null, null); return; }
      raf = requestAnimationFrame(tic);
    }
    raf = requestAnimationFrame(tic);

    function responder(v, b) {
      if (listo) return;
      listo = true;
      cancelAnimationFrame(raf);
      var resta = Math.max(0, 1 - (performance.now() - inicio) / (total * 1000));
      var ok = v === p.respuesta;
      bv.disabled = bf.disabled = true;
      (p.respuesta ? bv : bf).classList.add('is-ok');
      if (b && !ok) { b.classList.add('is-bad'); vibrar(40); }
      if (ok) humo(b);
      fin(ok ? 1 : 0, {
        bonus: ok ? Math.round(resta * 5) : 0,
        titulo: v === null ? '¡Se terminó el tiempo!' : null,
        respuesta: ok ? null : 'Era ' + (p.respuesta ? 'verdadero' : 'falso') + '.'
      });
    }
    return function () { listo = true; cancelAnimationFrame(raf); };
  };

  R.unir = function (p, body, fin) {
    var COLORES = ['var(--terra)', 'var(--ok-line)', 'var(--tan)', 'var(--ink-soft)', 'var(--sage)'];
    var pares = mezclar(p.pares).slice(0, 5);
    var izq = pares.map(function (x, i) { return { t: x[0], i: i }; });
    var der = mezclar(pares.map(function (x, i) { return { t: x[1], i: i }; }));
    var links = {};   // índice izquierdo -> índice derecho
    var sel = null, cerrado = false;
    var bIzq = [], bDer = [];

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'unir__svg');
    svg.setAttribute('aria-hidden', 'true');

    var colI = h('div', { class: 'unir__col' }, izq.map(function (x) {
      var b = h('button', { class: 'unir__item', type: 'button', 'aria-pressed': 'false', onclick: function () { tocarIzq(x.i); } }, h('span', { class: 'dot' }), h('span', null, x.t));
      bIzq[x.i] = b;
      return b;
    }));
    var colD = h('div', { class: 'unir__col unir__col--der' }, der.map(function (x) {
      var b = h('button', { class: 'unir__item', type: 'button', onclick: function () { tocarDer(x.i); } }, h('span', { class: 'dot' }), h('span', null, x.t));
      bDer[x.i] = b;
      return b;
    }));
    var caja = h('div', { class: 'unir' }, svg, colI, colD);
    var btnOk = h('button', { class: 'btn btn--primary btn--wide', type: 'button', disabled: true, onclick: comprobar }, 'Comprobar');

    body.appendChild(h('div', { class: 'q' },
      h('h2', { class: 'q__text' }, p.consigna),
      h('p', { class: 'q__hint' }, 'Tocá un elemento de la izquierda y después su pareja de la derecha.'),
      caja,
      h('div', { class: 'check-row' }, btnOk)
    ));

    function colorDe(i) { return COLORES[i % COLORES.length]; }

    function tocarIzq(i) {
      if (cerrado) return;
      if (links[i] != null) { delete links[i]; sel = i; }
      else sel = sel === i ? null : i;
      pintar(i);
    }
    function tocarDer(j) {
      if (cerrado) return;
      var duenio = Object.keys(links).filter(function (k) { return links[k] === j; })[0];
      if (sel == null) {
        if (duenio != null) { delete links[duenio]; pintar(-1); }
        return;
      }
      if (duenio != null) delete links[duenio];
      links[sel] = j;
      var nuevo = sel;
      sel = null;
      pintar(nuevo);
    }
    function pintar(nuevo) {
      bIzq.forEach(function (b, i) {
        b.classList.toggle('is-sel', sel === i);
        b.setAttribute('aria-pressed', sel === i ? 'true' : 'false');
        var l = links[i] != null;
        b.classList.toggle('is-linked', l);
        b.style.setProperty('--c', l ? colorDe(i) : 'transparent');
      });
      bDer.forEach(function (b, j) {
        var k = Object.keys(links).filter(function (x) { return links[x] === j; })[0];
        b.classList.toggle('is-linked', k != null);
        b.style.setProperty('--c', k != null ? colorDe(Number(k)) : 'transparent');
      });
      btnOk.disabled = Object.keys(links).length < pares.length;
      dibujar(nuevo);
    }
    function dibujar(nuevo, final) {
      var base = caja.getBoundingClientRect();
      svg.innerHTML = '';
      Object.keys(links).forEach(function (k) {
        var i = Number(k), j = links[k];
        var a = bIzq[i].getBoundingClientRect(), b = bDer[j].getBoundingClientRect();
        var x1 = a.right - base.left, y1 = a.top + a.height / 2 - base.top;
        var x2 = b.left - base.left, y2 = b.top + b.height / 2 - base.top;
        var mx = (x1 + x2) / 2;
        var color = final ? (i === j ? 'var(--ok-line)' : 'var(--bad-line)') : colorDe(i);
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M' + x1 + ' ' + y1 + ' C' + mx + ' ' + y1 + ' ' + mx + ' ' + y2 + ' ' + (x2 - 6) + ' ' + y2);
        path.style.stroke = color;
        if (i === nuevo) path.setAttribute('class', 'ln-draw');
        // punta de flecha
        var punta = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        punta.setAttribute('d', 'M' + (x2 - 9) + ' ' + (y2 - 5) + ' L' + (x2 - 1) + ' ' + y2 + ' L' + (x2 - 9) + ' ' + (y2 + 5));
        punta.style.stroke = color;
        svg.appendChild(path);
        svg.appendChild(punta);
      });
    }
    function comprobar() {
      cerrado = true;
      btnOk.disabled = true;
      var bien = 0, errores = [];
      pares.forEach(function (par, i) {
        var ok = links[i] === i;
        if (ok) bien++; else errores.push(par[0] + ' → ' + par[1]);
        bIzq[i].classList.add(ok ? 'is-ok' : 'is-bad');
        bDer[links[i]].classList.add(ok ? 'is-ok' : 'is-bad');
      });
      dibujar(-1, true);
      if (bien === pares.length) humo(caja); else vibrar(40);
      fin(bien / pares.length, {
        respuesta: bien === pares.length ? 'Uniste las ' + bien + ' parejas.' : 'Te salieron ' + bien + ' de ' + pares.length + '. Las correctas eran:',
        orden: errores.length ? errores : null
      });
    }

    var onResize = function () { dibujar(-1, cerrado); };
    window.addEventListener('resize', onResize);
    return function () { window.removeEventListener('resize', onResize); };
  };

  R.memo = function (p, body, fin) {
    var pares = mezclar(p.pares).slice(0, 6);
    var cartas = mezclar([].concat.apply([], pares.map(function (par, i) {
      return [{ par: i, t: par[0] }, { par: i, t: par[1] }];
    })));
    var primera = null, bloqueo = false, intentos = 0, hechas = 0;
    var info = h('span', null, 'Intentos: 0');
    var grid = h('div', { class: 'memo' }, cartas.map(function (c) {
      var cara = esFoto(c.t)
        ? h('div', { class: 'memo__face memo__front' }, h('img', { src: c.t, alt: '' }))
        : h('div', { class: 'memo__face memo__front' }, c.t);
      var b = h('button', { class: 'memo__card', type: 'button', 'aria-label': 'Carta boca abajo' },
        h('div', { class: 'memo__inner' },
          h('div', { class: 'memo__face memo__back' }, marca('isotipo')),
          cara
        ));
      c.b = b;
      b.addEventListener('click', function () { dar(c); });
      return b;
    }));
    body.appendChild(h('div', { class: 'q' },
      h('h2', { class: 'q__text' }, p.consigna || 'Encontrá cada pareja.'),
      grid,
      h('p', { class: 'memo-info' }, info, h('span', null, pares.length + ' parejas'))
    ));

    function nombre(c) { return esFoto(c.t) ? 'foto' : c.t; }
    function dar(c) {
      if (bloqueo || c.b.classList.contains('is-up') || c.b.classList.contains('is-match')) return;
      c.b.classList.add('is-up');
      c.b.setAttribute('aria-label', nombre(c));
      if (!primera) { primera = c; return; }
      intentos++;
      info.textContent = 'Intentos: ' + intentos;
      var a = primera; primera = null;
      if (a.par === c.par) {
        [a, c].forEach(function (x) { x.b.classList.remove('is-up'); x.b.classList.add('is-match'); x.b.disabled = true; });
        humo(c.b);
        hechas++;
        if (hechas === pares.length) setTimeout(terminar, 650);
      } else {
        bloqueo = true;
        a.b.classList.add('is-miss'); c.b.classList.add('is-miss');
        setTimeout(function () {
          [a, c].forEach(function (x) {
            x.b.classList.remove('is-up', 'is-miss');
            x.b.setAttribute('aria-label', 'Carta boca abajo');
          });
          bloqueo = false;
        }, 950);
      }
    }
    function terminar() {
      var extra = intentos - pares.length;
      var score = extra <= 2 ? 1 : extra <= 5 ? 0.8 : extra <= 8 ? 0.6 : 0.4;
      fin(score, { respuesta: 'Lo resolviste en ' + intentos + ' intentos (mínimo posible: ' + pares.length + ').' });
    }
  };

  R.ordenar = function (p, body, fin) {
    var pasos = p.pasos;
    var desorden = mezclar(pasos);
    while (pasos.length > 1 && desorden.join('|') === pasos.join('|')) desorden = mezclar(pasos);
    var puestos = [];   // textos en el orden elegido
    var pool = h('div', { class: 'pool' });
    var slots = h('ol', { class: 'slots' });
    var btnOk = h('button', { class: 'btn btn--primary btn--wide', type: 'button', disabled: true, onclick: comprobar }, 'Comprobar');
    var cerrado = false;

    body.appendChild(h('div', { class: 'q' },
      h('h2', { class: 'q__text' }, p.consigna),
      h('p', { class: 'q__hint' }, 'Tocá los pasos en orden. Si te equivocás, tocá el paso para devolverlo.'),
      slots, pool,
      h('div', { class: 'check-row' }, btnOk)
    ));

    function pintar() {
      slots.textContent = '';
      pasos.forEach(function (_, i) {
        var t = puestos[i];
        slots.appendChild(h('li', { class: 'slot' + (t ? ' is-full' : '') },
          h('span', { class: 'slot__n' }, String(i + 1)),
          t ? h('button', { type: 'button', 'aria-label': 'Quitar: ' + t, onclick: function () { quitar(i); } }, t) : h('span', null, 'Paso ' + (i + 1))
        ));
      });
      pool.textContent = '';
      desorden.forEach(function (t) {
        if (puestos.indexOf(t) >= 0) return;
        pool.appendChild(h('button', { class: 'chip', type: 'button', onclick: function () { poner(t); } }, t));
      });
      btnOk.disabled = puestos.length < pasos.length;
    }
    function poner(t) { if (!cerrado) { puestos.push(t); pintar(); } }
    function quitar(i) { if (!cerrado) { puestos.splice(i, 1); pintar(); } }
    function comprobar() {
      cerrado = true;
      btnOk.disabled = true;
      var bien = 0;
      Array.prototype.forEach.call(slots.children, function (li, i) {
        var ok = puestos[i] === pasos[i];
        if (ok) bien++;
        li.classList.add(ok ? 'is-ok' : 'is-bad');
        li.querySelector('button').disabled = true;
      });
      if (bien === pasos.length) humo(slots); else vibrar(40);
      fin(bien / pasos.length, {
        respuesta: bien === pasos.length ? '¡Todos los pasos en su lugar!' : 'Pusiste bien ' + bien + ' de ' + pasos.length + '. El orden es:',
        orden: bien === pasos.length ? null : pasos
      });
    }
    pintar();
  };

  R.elegir = function (p, body, fin) {
    var opciones = mezclar(p.correctas.concat(p.incorrectas || []));
    var elegidas = {};
    var chips = [];
    var btnOk = h('button', { class: 'btn btn--primary btn--wide', type: 'button', disabled: true, onclick: comprobar }, 'Comprobar');
    body.appendChild(h('div', { class: 'q' },
      h('h2', { class: 'q__text' }, p.consigna),
      h('p', { class: 'q__hint' }, 'Puede haber más de una correcta.'),
      h('div', { class: 'pool' }, opciones.map(function (t) {
        var c = h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: function () {
          elegidas[t] = !elegidas[t];
          c.setAttribute('aria-pressed', elegidas[t] ? 'true' : 'false');
          btnOk.disabled = !Object.keys(elegidas).some(function (k) { return elegidas[k]; });
        } }, t);
        chips.push({ t: t, c: c });
        return c;
      })),
      h('div', { class: 'check-row' }, btnOk)
    ));
    function comprobar() {
      btnOk.disabled = true;
      var aciertos = 0, errores = 0;
      chips.forEach(function (x) {
        var correcta = p.correctas.indexOf(x.t) >= 0;
        x.c.disabled = true;
        x.c.removeAttribute('aria-pressed');
        if (elegidas[x.t] && correcta) { aciertos++; x.c.classList.add('is-ok'); }
        else if (elegidas[x.t]) { errores++; x.c.classList.add('is-bad'); }
        else if (correcta) x.c.classList.add('is-miss');
      });
      var score = Math.max(0, aciertos - errores) / p.correctas.length;
      if (score === 1) humo(btnOk); else vibrar(40);
      fin(score, { respuesta: score === 1 ? null : 'Eran: ' + p.correctas.join(', ') + '.' });
    }
  };

  /* ================= La ronda: una pregunta tras otra ================= */

  var REINTENTABLES = { opcion: 1, vf: 1, problema: 1 };

  function ronda(op) {
    var root = op.root;
    var cola = op.items.slice();
    var total = cola.length;
    var vistas = {};           // id -> ya puntuada en esta ronda
    var reintentadas = {};
    var suma = 0, hechas = 0, puntos = 0, perfecto = true;
    var limpiar = null;

    var barra = h('i', { style: 'width:0%' });
    var contador = h('span', { class: 'game-count' }, '0/' + total);
    var cuerpo = h('div');
    root.textContent = '';
    root.appendChild(h('div', { class: 'wrap' },
      h('div', { class: 'game-top' },
        h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Salir del juego', onclick: op.onSalir }, icono('cerrar')),
        h('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Avance de la ronda' }, barra),
        contador
      ),
      h('p', { class: 'eyebrow game-label' }, icono(op.icono || 'trivia'), op.etiqueta),
      cuerpo
    ));

    function siguiente() {
      if (limpiar) { limpiar(); limpiar = null; }
      if (!cola.length) {
        op.onFin({ ratio: total ? suma / total : 0, puntos: puntos, perfecto: perfecto, total: total });
        return;
      }
      var p = cola.shift();
      cuerpo.textContent = '';
      window.scrollTo(0, 0);
      limpiar = R[p.tipo](p, cuerpo, function (score, info) {
        info = info || {};
        var primera = !vistas[p.id];
        var vuelve = false;
        if (primera) {
          vistas[p.id] = true;
          suma += score;
          hechas++;
          if (score < 1) perfecto = false;
          Progreso.registrar(p.id, score >= 0.8);
          puntos += 10 * score + (info.bonus || 0);
          barra.style.width = (hechas / total * 100) + '%';
          contador.textContent = hechas + '/' + total;
          if (score < 0.8 && op.reintentar !== false && REINTENTABLES[p.tipo] && !reintentadas[p.id]) {
            reintentadas[p.id] = true;
            cola.push(p);
            vuelve = true;
          }
        }
        feedback({
          score: score,
          titulo: info.titulo,
          respuesta: info.respuesta,
          orden: info.orden,
          explicacion: p.explicacion,
          fuente: p.fuente,
          vuelve: vuelve,
          boton: cola.length ? 'Seguir' : 'Ver resultado',
          onSeguir: siguiente
        });
      }, op) || null;
    }
    siguiente();
    return function () { if (limpiar) limpiar(); ocultarFeedback(); };
  }

  window.UI = {
    h: h, icono: icono, estrellas: estrellas, marca: marca, mezclar: mezclar, azar: azar, esFoto: esFoto,
    humo: humo, petalos: petalos, toast: toast, confirmar: confirmar, vibrar: vibrar
  };
  window.Juegos = { ronda: ronda, renderizadores: R, ocultarFeedback: ocultarFeedback };
})();
