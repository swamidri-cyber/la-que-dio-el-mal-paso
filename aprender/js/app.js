/* Pantallas, navegación, medallas y validación del banco de preguntas. */
(function () {
  'use strict';

  var h = UI.h, icono = UI.icono;

  /* ================= Juegos disponibles ================= */
  var JUEGOS = [
    { id: 'trivia',   nombre: 'Trivia',            sub: 'Opción múltiple',     icono: 'trivia',   tipos: ['opcion'],            n: 6, min: 3 },
    { id: 'vf',       nombre: 'Verdadero o falso', sub: 'Contra reloj',        icono: 'vf',       tipos: ['vf'],                n: 8, min: 3 },
    { id: 'unir',     nombre: 'Unir con flechas',  sub: 'Cada cosa con su par', icono: 'unir',    tipos: ['unir'],              n: 1, min: 1 },
    { id: 'memo',     nombre: 'Memotest',          sub: 'Dá vuelta las cartas', icono: 'memo',    tipos: ['memo'],              n: 1, min: 1 },
    { id: 'receta',   nombre: 'Armá la receta',    sub: 'Ordená y elegí',      icono: 'receta',   tipos: ['ordenar', 'elegir'], n: 3, min: 1 },
    { id: 'problema', nombre: '¿Qué salió mal?',   sub: 'Encontrá la causa',   icono: 'problema', tipos: ['problema'],          n: 5, min: 3 }
  ];
  var JUEGO = {};
  JUEGOS.forEach(function (j) { JUEGO[j.id] = j; });

  /* ================= Medallas ================= */
  var MEDALLAS = [
    { id: 'primera', nombre: 'Primera tanda',        desc: 'Terminaste tu primer juego.',                      marca: 'isotipo' },
    { id: 'fichas',  nombre: 'A estudiar',           desc: 'Repasaste todas las fichas de un módulo.',         marca: 'flor' },
    { id: 'tres',    nombre: 'Punto justo',          desc: 'Sacaste 3 estrellas en un juego.',                 marca: 'estrella' },
    { id: 'rayo',    nombre: 'Mano rápida',          desc: 'Verdadero o falso sin ningún error.',              marca: 'espiral' },
    { id: 'flechas', nombre: 'Buena puntería',       desc: 'Uniste todas las flechas bien.',                   marca: 'estrella' },
    { id: 'memoria', nombre: 'Memoria de taller',    desc: 'Memotest con 3 estrellas.',                        marca: 'flor' },
    { id: 'receta',  nombre: 'Receta de memoria',    desc: 'Armá la receta sin un solo error.',                marca: 'espiral' },
    { id: 'racha',   nombre: 'Brasa encendida',      desc: '10 respuestas bien seguidas.',                     marca: 'estrella' },
    { id: 'modulo',  nombre: 'Primer módulo',        desc: 'Aprobaste tu primer módulo.',                      marca: 'isotipo' },
    { id: 'nariz',   nombre: 'Nariz fina',           desc: '3 estrellas en todos los juegos de hierbas e intenciones.', marca: 'flor' },
    { id: 'mitad',   nombre: 'Mitad del camino',     desc: 'Aprobaste la mitad de los módulos.',               marca: 'espiral' },
    { id: 'repaso',  nombre: 'Vuelta al secadero',   desc: 'Hiciste 3 repasos inteligentes.',                  marca: 'espiral' },
    { id: 'todos',   nombre: 'Maestría del taller',  desc: 'Aprobaste todos los módulos.',                     marca: 'isotipo' },
    { id: 'final',   nombre: 'Gran tanda final',     desc: 'Desafío final con 3 estrellas.',                   marca: 'estrella' }
  ];

  /* ================= Banco de preguntas (con validación) ================= */
  var MARCAS = ['isotipo', 'flor', 'espiral', 'estrella'];
  var TIPOS = ['opcion', 'vf', 'unir', 'memo', 'ordenar', 'elegir', 'problema'];
  var errores = [];
  var MODULOS = [], PREGUNTAS = [], FICHAS = [];

  function esTexto(x) { return typeof x === 'string' && x.trim() !== ''; }
  function listaTextos(x, min) { return Array.isArray(x) && x.length >= min && x.every(esTexto); }

  function validarPregunta(p, mods, ids) {
    if (!p || typeof p !== 'object') return 'no es una pregunta';
    if (!esTexto(p.id)) return 'falta el "id"';
    if (ids[p.id]) return 'el id "' + p.id + '" está repetido';
    if (!mods[p.modulo]) return 'el módulo "' + p.modulo + '" no existe';
    if (TIPOS.indexOf(p.tipo) < 0) return 'el tipo "' + p.tipo + '" no existe (usá: ' + TIPOS.join(', ') + ')';
    switch (p.tipo) {
      case 'opcion':
      case 'problema':
        if (!esTexto(p.tipo === 'opcion' ? p.pregunta : p.problema)) return 'falta el texto de "' + (p.tipo === 'opcion' ? 'pregunta' : 'problema') + '"';
        if (!esTexto(p.correcta)) return 'falta "correcta"';
        if (!listaTextos(p.incorrectas, 1)) return '"incorrectas" tiene que ser una lista con al menos una opción';
        if (p.incorrectas.indexOf(p.correcta) >= 0) return 'la respuesta correcta también figura como incorrecta';
        if (p.foto != null && !esTexto(p.foto)) return '"foto" tiene que ser la ruta de una imagen';
        break;
      case 'vf':
        if (!esTexto(p.afirmacion)) return 'falta "afirmacion"';
        if (typeof p.respuesta !== 'boolean') return '"respuesta" tiene que ser true (verdadero) o false (falso), sin comillas';
        break;
      case 'unir':
      case 'memo':
        if (p.tipo === 'unir' && !esTexto(p.consigna)) return 'falta "consigna"';
        if (!Array.isArray(p.pares) || p.pares.length < 3) return '"pares" necesita al menos 3 parejas';
        if (!p.pares.every(function (x) { return listaTextos(x, 2) && x.length === 2; })) return 'cada pareja tiene que ser ["texto", "texto"]';
        var der = p.pares.map(function (x) { return x[1]; });
        if (der.some(function (x, i) { return der.indexOf(x) !== i; })) return 'hay dos parejas con el mismo texto a la derecha';
        break;
      case 'ordenar':
        if (!esTexto(p.consigna)) return 'falta "consigna"';
        if (!listaTextos(p.pasos, 2)) return '"pasos" necesita al menos 2 pasos';
        if (p.pasos.some(function (x, i) { return p.pasos.indexOf(x) !== i; })) return 'hay pasos repetidos';
        break;
      case 'elegir':
        if (!esTexto(p.consigna)) return 'falta "consigna"';
        if (!listaTextos(p.correctas, 1)) return '"correctas" necesita al menos una opción';
        if (p.incorrectas != null && !Array.isArray(p.incorrectas)) return '"incorrectas" tiene que ser una lista';
        break;
    }
    return null;
  }

  function cargarBanco() {
    var B = window.BANCO;
    if (!B || !Array.isArray(B.modulos)) {
      var e = window.__errorBanco;
      errores.push({ grave: true, txt: e
        ? 'No se pudo leer data/preguntas.js (línea ' + e.linea + '): ' + e.msg + '. Suele ser una coma de más o de menos, o unas comillas sin cerrar.'
        : 'No se encontró data/preguntas.js.' });
      return;
    }
    var mods = {};
    B.modulos.forEach(function (m, i) {
      if (!m || !esTexto(m.id) || !esTexto(m.titulo)) { errores.push({ txt: 'Módulo n.º ' + (i + 1) + ': falta "id" o "titulo".' }); return; }
      if (mods[m.id]) { errores.push({ txt: 'Módulo "' + m.id + '": el id está repetido.' }); return; }
      mods[m.id] = m;
      MODULOS.push(m);
    });
    var ids = {};
    (B.preguntas || []).forEach(function (p, i) {
      var err = validarPregunta(p, mods, ids);
      if (err) { errores.push({ txt: 'Pregunta ' + (p && p.id ? '"' + p.id + '"' : 'n.º ' + (i + 1)) + ': ' + err + '.' }); return; }
      ids[p.id] = true;
      PREGUNTAS.push(p);
    });
    (B.fichas || []).forEach(function (f, i) {
      if (!f || !mods[f.modulo] || !esTexto(f.frente) || !esTexto(f.dorso)) {
        errores.push({ txt: 'Ficha n.º ' + (i + 1) + ': revisá "modulo", "frente" y "dorso".' });
        return;
      }
      FICHAS.push(f);
    });
  }

  /* ================= Reglas de avance ================= */
  function preguntasDe(modId) { return PREGUNTAS.filter(function (p) { return p.modulo === modId; }); }
  function fichasDe(modId) { return FICHAS.filter(function (f) { return f.modulo === modId; }); }

  function poolDe(modId, juegoId) {
    var tipos = JUEGO[juegoId].tipos.slice();
    var todas = preguntasDe(modId);
    // Si hay pocos "¿qué salió mal?" en un módulo, se suman a la trivia.
    var problemas = todas.filter(function (p) { return p.tipo === 'problema'; }).length;
    if (juegoId === 'trivia' && problemas < JUEGO.problema.min) tipos.push('problema');
    return todas.filter(function (p) { return tipos.indexOf(p.tipo) >= 0; });
  }
  function juegosDe(modId) {
    return JUEGOS.filter(function (j) { return poolDe(modId, j.id).length >= j.min; });
  }
  function estrellasModulo(modId) {
    var js = juegosDe(modId), s = 0;
    js.forEach(function (j) { s += Progreso.mejor(modId, j.id); });
    return { tiene: s, max: js.length * 3 };
  }
  function aprobado(modId) {
    var js = juegosDe(modId);
    var buenos = js.filter(function (j) { return Progreso.mejor(modId, j.id) >= 2; }).length;
    return js.length > 0 && buenos >= Math.min(2, js.length);
  }
  function indice(modId) { for (var i = 0; i < MODULOS.length; i++) if (MODULOS[i].id === modId) return i; return -1; }
  function abierto(i) { return i === 0 || (i > 0 && aprobado(MODULOS[i - 1].id)); }
  function aprobados() { return MODULOS.filter(function (m) { return aprobado(m.id); }).length; }
  function todosAprobados() { return MODULOS.length > 0 && aprobados() === MODULOS.length; }
  function preguntasAbiertas() {
    return PREGUNTAS.filter(function (p) { return abierto(indice(p.modulo)); });
  }
  function textoDe(p) { return p.pregunta || p.problema || p.afirmacion || p.consigna || ''; }

  /* ================= Medallas ================= */
  function evaluarMedallas(ctx) {
    var S = Progreso.estado, nuevas = [];
    function chequear(id, cond) { if (cond && Progreso.ganarMedalla(id)) nuevas.push(MEDALLAS.filter(function (m) { return m.id === id; })[0]); }
    ctx = ctx || {};
    chequear('primera', ctx.juego);
    chequear('fichas', Object.keys(S.fichas).length > 0);
    chequear('tres', ctx.estrellas === 3);
    chequear('rayo', ctx.juego === 'vf' && ctx.perfecto);
    chequear('flechas', ctx.juego === 'unir' && ctx.perfecto);
    chequear('memoria', ctx.juego === 'memo' && ctx.estrellas === 3);
    chequear('receta', ctx.juego === 'receta' && ctx.perfecto);
    chequear('racha', S.rachaMax >= 10);
    var ap = aprobados();
    chequear('modulo', ap >= 1);
    chequear('mitad', MODULOS.length && ap >= Math.ceil(MODULOS.length / 2));
    chequear('todos', todosAprobados());
    chequear('nariz', indice('hierbas') >= 0 && juegosDe('hierbas').every(function (j) { return Progreso.mejor('hierbas', j.id) === 3; }));
    chequear('repaso', S.repasos >= 3);
    chequear('final', S.desafio === 3);
    return nuevas.filter(Boolean);
  }

  /* ================= Encabezado y navegación ================= */
  var main = document.getElementById('main');
  var btnBack = document.getElementById('btnBack');
  var topTitle = document.getElementById('topTitle');
  var topKicker = document.getElementById('topKicker');
  var limpiar = null;
  var padre = '#inicio';

  function encabezado(titulo, kicker, volverA) {
    topTitle.textContent = titulo;
    topKicker.textContent = kicker || 'La que dió el mal paso';
    btnBack.hidden = !volverA;
    padre = volverA || '#inicio';
    document.title = titulo === 'Aprendé jugando' ? 'Aprendé jugando · La que dió el mal paso' : titulo + ' · Aprendé jugando';
  }
  btnBack.addEventListener('click', function () { location.hash = padre; });

  function marcarTab(nombre) {
    document.querySelectorAll('.tabs a').forEach(function (a) {
      if (a.dataset.tab === nombre) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  function modoJuego(on) { document.body.classList.toggle('jugando', !!on); }

  function ir() {
    if (limpiar) { limpiar(); limpiar = null; }
    Juegos.ocultarFeedback();
    modoJuego(false);
    var partes = (location.hash || '#inicio').slice(1).split('/').map(decodeURIComponent);
    main.textContent = '';
    window.scrollTo(0, 0);
    switch (partes[0]) {
      case 'modulo': pantallaModulo(partes[1]); break;
      case 'fichas': pantallaFichas(partes[1]); break;
      case 'jugar': pantallaJuego(partes[1], partes[2]); break;
      case 'repaso': pantallaRepaso(); break;
      case 'desafio': pantallaDesafio(); break;
      case 'progreso': pantallaProgreso(); break;
      case 'medallas': pantallaMedallas(); break;
      default: pantallaInicio();
    }
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', ir);

  function wrap() { var w = h('div', { class: 'wrap' }); main.appendChild(w); return w; }

  function miniatura(m, cls) {
    if (m.foto) return h('div', { class: cls }, h('img', { src: m.foto, alt: '', loading: 'lazy' }));
    return h('div', { class: cls }, UI.marca(MARCAS.indexOf(m.marca) >= 0 ? m.marca : 'isotipo'));
  }

  /* ================= Inicio ================= */
  function pantallaInicio() {
    encabezado('Aprendé jugando');
    marcarTab('inicio');
    var w = wrap(), S = Progreso.estado;
    var totEst = 0, maxEst = 0;
    MODULOS.forEach(function (m) { var e = estrellasModulo(m.id); totEst += e.tiene; maxEst += e.max; });

    w.appendChild(h('section', { class: 'hero' },
      UI.marca('isotipo', 'hero__deco'),
      h('p', { class: 'eyebrow' }, 'Tu taller de sahumerios'),
      h('h1', null, '¡Hola! ¿Qué aprendemos hoy?'),
      h('p', null, 'Recetas, técnicas, aromas e intenciones, a tu ritmo.'),
      h('div', { class: 'hero__stats' },
        h('div', null, h('p', { class: 'lbl' }, 'Puntos'), h('p', { class: 'val' }, String(S.puntos))),
        h('div', null, h('p', { class: 'lbl' }, 'Estrellas'), h('p', { class: 'val' }, totEst + '/' + maxEst)),
        h('div', null, h('p', { class: 'lbl' }, 'Medallas'), h('p', { class: 'val' }, Object.keys(S.medallas).length + '/' + MEDALLAS.length))
      )
    ));

    if (errores.length) w.appendChild(avisoErrores());

    var pend = Progreso.pendientes(preguntasAbiertas()).length;
    if (pend > 0) {
      w.appendChild(h('section', { class: 'card repaso' },
        h('span', { class: 'repaso__icon' }, icono('repaso')),
        h('div', { class: 'repaso__txt' },
          h('strong', null, 'Repaso inteligente'),
          h('span', { class: 'small muted' }, pend === 1 ? 'Hay 1 pregunta que te costó.' : 'Hay ' + pend + ' preguntas que te costaron.')
        ),
        h('a', { class: 'btn btn--primary btn--sm', href: '#repaso' }, 'Repasar')
      ));
    }

    w.appendChild(h('div', { class: 'section-title' }, h('h2', null, 'Tu camino'),
      h('span', { class: 'small muted' }, aprobados() + ' de ' + MODULOS.length + ' aprobados')));

    var lista = h('ol', { class: 'path' });
    MODULOS.forEach(function (m, i) {
      var ab = abierto(i), est = estrellasModulo(m.id), ok = aprobado(m.id);
      var contenido = [
        miniatura(m, 'mod__thumb'),
        h('div', { class: 'mod__body' },
          h('p', { class: 'mod__num' }, 'Módulo ' + (i + 1) + (ok ? ' · aprobado' : '')),
          h('p', { class: 'mod__title' }, m.titulo),
          ab ? h('p', { class: 'mod__meta' }, UI.estrellas(Math.round(est.tiene / Math.max(1, est.max) * 3)), est.tiene + ' de ' + est.max + ' estrellas')
             : h('p', { class: 'mod__meta' }, 'Aprobá el módulo anterior para abrirlo')
        ),
        icono(ab ? 'seguir' : 'candado', ab ? 'mod__go' : 'mod__lock')
      ];
      lista.appendChild(h('li', null, ab
        ? h('a', { class: 'mod' + (ok ? ' mod--done' : ''), href: '#modulo/' + encodeURIComponent(m.id) }, contenido)
        : h('div', { class: 'mod mod--locked', 'aria-disabled': 'true' }, contenido)));
    });
    var fin = todosAprobados();
    var finContenido = [
      h('div', { class: 'mod__thumb' }, icono('trofeo')),
      h('div', { class: 'mod__body' },
        h('p', { class: 'mod__num' }, 'Desafío final'),
        h('p', { class: 'mod__title' }, 'La gran tanda'),
        h('p', { class: 'mod__meta' }, fin ? UI.estrellas(S.desafio) : 'Se abre al aprobar todos los módulos')
      ),
      icono(fin ? 'seguir' : 'candado', fin ? 'mod__go' : 'mod__lock')
    ];
    lista.appendChild(h('li', null, fin
      ? h('a', { class: 'mod mod--final', href: '#desafio' }, finContenido)
      : h('div', { class: 'mod mod--locked' }, finContenido)));
    w.appendChild(lista);

    w.appendChild(h('footer', { class: 'foot' }, 'Sahumerios artesanales hechos a mano en Rosario', UI.marca('wordmark')));
  }

  function avisoErrores() {
    var grave = errores.some(function (e) { return e.grave; });
    return h('div', { class: 'banner', role: 'alert' },
      h('div', null,
        h('strong', null, grave ? 'No se pudieron cargar las preguntas' : 'Hay ' + errores.length + (errores.length === 1 ? ' cosa' : ' cosas') + ' para corregir en data/preguntas.js'),
        grave ? null : h('span', null, 'Lo que tiene errores no aparece en los juegos; el resto funciona.'),
        h('ul', null, errores.slice(0, 8).map(function (e) { return h('li', null, e.txt); })),
        errores.length > 8 ? h('span', null, 'y ' + (errores.length - 8) + ' más.') : null
      ));
  }

  /* ================= Módulo ================= */
  function pantallaModulo(id) {
    var i = indice(id), m = MODULOS[i];
    if (!m) { location.hash = '#inicio'; return; }
    encabezado(m.titulo, 'Módulo ' + (i + 1), '#inicio');
    marcarTab('inicio');
    var w = wrap();
    if (!abierto(i)) {
      w.appendChild(h('div', { class: 'card' }, h('h2', null, 'Todavía está cerrado'),
        h('p', null, 'Aprobá «' + MODULOS[i - 1].titulo + '» para abrir este módulo.'),
        h('div', { class: 'row' }, h('a', { class: 'btn btn--primary', href: '#modulo/' + encodeURIComponent(MODULOS[i - 1].id) }, 'Ir al módulo anterior'))));
      return;
    }
    var est = estrellasModulo(id);
    w.appendChild(h('section', { class: 'mhead' },
      miniatura(m, 'arch'),
      h('div', null,
        h('p', { class: 'eyebrow' }, 'Módulo ' + (i + 1) + ' de ' + MODULOS.length),
        h('h1', null, m.titulo),
        m.descripcion ? h('p', null, m.descripcion) : null)
    ));
    w.appendChild(h('div', { class: 'card' },
      h('div', { class: 'prog-row' }, h('strong', null, 'Tu avance'), h('span', null, est.tiene + ' de ' + est.max + ' estrellas')),
      h('div', { class: 'bar' }, h('i', { style: 'width:' + (est.max ? est.tiene / est.max * 100 : 0) + '%' })),
      h('p', { class: 'unlock-note' }, icono(aprobado(id) ? 'ok' : 'candado'),
        aprobado(id)
          ? (MODULOS[i + 1] ? '¡Aprobado! Ya podés seguir con «' + MODULOS[i + 1].titulo + '».' : '¡Aprobado! Te falta el desafío final.')
          : 'Conseguí 2 estrellas en ' + Math.min(2, juegosDe(id).length) + ' juegos para aprobar el módulo.')
    ));

    var tiles = h('div', { class: 'tiles' });
    var nf = fichasDe(id).length;
    if (nf) {
      tiles.appendChild(h('a', { class: 'tile tile--study', href: '#fichas/' + encodeURIComponent(id) },
        h('span', { class: 'tile__icon' }, icono('fichas')),
        h('span', null, h('span', { class: 'tile__name' }, 'Fichas de estudio'), h('br'),
          h('span', { class: 'tile__sub' }, nf + ' tarjetas para repasar antes de jugar'))));
    }
    juegosDe(id).forEach(function (j) {
      tiles.appendChild(h('a', { class: 'tile', href: '#jugar/' + encodeURIComponent(id) + '/' + j.id },
        h('span', { class: 'tile__icon' }, icono(j.icono)),
        h('span', { class: 'tile__name' }, j.nombre),
        h('span', { class: 'tile__sub' }, j.sub),
        UI.estrellas(Progreso.mejor(id, j.id))));
    });
    w.appendChild(tiles);
  }

  /* ================= Fichas de estudio ================= */
  function pantallaFichas(id) {
    var i = indice(id), m = MODULOS[i];
    if (!m || !abierto(i)) { location.hash = '#inicio'; return; }
    encabezado('Fichas', m.titulo, '#modulo/' + encodeURIComponent(id));
    var w = wrap();
    var fichas = fichasDe(id);
    var pos = 0, vistas = {};
    var tarjeta = h('button', { class: 'flash__card', type: 'button', 'aria-live': 'polite' });
    var cuenta = h('p', { class: 'flash-count' });
    var bAnt = h('button', { class: 'btn btn--ghost', type: 'button', onclick: function () { mover(-1); } }, icono('volver'), 'Anterior');
    var bSig = h('button', { class: 'btn btn--primary', type: 'button', onclick: function () { mover(1); } }, 'Siguiente', icono('seguir'));
    var listo = h('div', { hidden: true });

    w.appendChild(h('div', { class: 'flash' }, tarjeta));
    w.appendChild(cuenta);
    w.appendChild(h('div', { class: 'flash-nav' }, bAnt, bSig));
    w.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: function () { fichas = UI.mezclar(fichas); pos = 0; dibujar(); } }, icono('mezclar'), 'Mezclar')));
    w.appendChild(listo);

    function dibujar() {
      var f = fichas[pos];
      tarjeta.classList.remove('is-flip');
      tarjeta.textContent = '';
      tarjeta.setAttribute('aria-label', 'Ficha: ' + f.frente + '. Tocá para ver la respuesta.');
      tarjeta.appendChild(h('div', { class: 'flash__inner' },
        h('div', { class: 'flash__face flash__front' },
          f.foto ? h('img', { src: f.foto, alt: '' }) : UI.marca(MARCAS[pos % MARCAS.length], 'flash__deco'),
          h('h2', null, f.frente),
          h('p', { class: 'flash__tap' }, 'Tocá para dar vuelta')),
        h('div', { class: 'flash__face flash__back' },
          UI.marca('isotipo', 'flash__deco'),
          h('p', { class: 'eyebrow' }, f.frente),
          h('p', null, f.dorso))
      ));
      cuenta.textContent = (pos + 1) + ' de ' + fichas.length;
      bAnt.disabled = pos === 0;
      bSig.textContent = '';
      bSig.append(pos === fichas.length - 1 ? 'Terminar' : 'Siguiente', icono('seguir'));
    }
    function mover(d) {
      if (d > 0 && pos === fichas.length - 1) { terminar(); return; }
      pos = Math.max(0, Math.min(fichas.length - 1, pos + d));
      dibujar();
    }
    function terminar() {
      Progreso.marcarFichas(id);
      mostrarMedallas(evaluarMedallas({}));
      listo.hidden = false;
      listo.textContent = '';
      listo.appendChild(h('div', { class: 'card' },
        h('h2', null, '¡Repaso hecho!'),
        h('p', null, 'Ya pasaste por todas las fichas. ¿Probamos con un juego?'),
        h('div', { class: 'row' }, h('a', { class: 'btn btn--primary', href: '#modulo/' + encodeURIComponent(id) }, 'Ir a los juegos'))));
      listo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    tarjeta.addEventListener('click', function () {
      tarjeta.classList.toggle('is-flip');
      vistas[pos] = true;
      tarjeta.setAttribute('aria-label', tarjeta.classList.contains('is-flip') ? fichas[pos].frente + ': ' + fichas[pos].dorso : 'Ficha: ' + fichas[pos].frente);
    });
    var teclas = function (e) {
      if (e.key === 'ArrowRight') mover(1);
      else if (e.key === 'ArrowLeft') mover(-1);
    };
    document.addEventListener('keydown', teclas);
    limpiar = function () { document.removeEventListener('keydown', teclas); };
    dibujar();
  }

  /* ================= Jugar ================= */
  function salirConfirmando(destino) {
    return function () {
      UI.confirmar({ titulo: '¿Salís del juego?', texto: 'Lo que respondiste ya quedó guardado para el repaso, pero esta ronda no suma estrellas.', si: 'Salir', no: 'Seguir jugando' })
        .then(function (si) { if (si) location.hash = destino; });
    };
  }

  function pantallaJuego(modId, juegoId) {
    var i = indice(modId), m = MODULOS[i], j = JUEGO[juegoId];
    if (!m || !j || !abierto(i)) { location.hash = '#inicio'; return; }
    var pool = poolDe(modId, juegoId);
    if (pool.length < j.min) { location.hash = '#modulo/' + encodeURIComponent(modId); return; }
    var items = Progreso.elegir(pool, Math.min(j.n, pool.length));
    var volverA = '#modulo/' + encodeURIComponent(modId);
    document.title = j.nombre + ' · ' + m.titulo;
    modoJuego(true);
    var antes = aprobado(modId);
    limpiar = Juegos.ronda({
      root: main, items: items, etiqueta: j.nombre + ' · ' + m.titulo, icono: j.icono,
      onSalir: salirConfirmando(volverA),
      onFin: function (r) {
        var est = Progreso.estrellasDe(r.ratio);
        var previo = Progreso.guardarJuego(modId, juegoId, est);
        var bonus = [0, 3, 8, 15][est];
        Progreso.sumarPuntos(r.puntos + bonus);
        var nuevas = evaluarMedallas({ juego: juegoId, estrellas: est, perfecto: r.perfecto });
        var abrio = !antes && aprobado(modId) && MODULOS[i + 1] ? MODULOS[i + 1] : null;
        resultado({
          estrellas: est, previo: previo, puntos: r.puntos + bonus, ratio: r.ratio, medallas: nuevas, abrio: abrio,
          otraVez: function () { ir(); },
          volver: volverA, volverTxt: 'Volver al módulo'
        });
      }
    });
  }

  function pantallaRepaso() {
    var pool = preguntasAbiertas().filter(function (p) { return ['opcion', 'vf', 'problema', 'elegir', 'ordenar'].indexOf(p.tipo) >= 0; });
    var pend = Progreso.pendientes(pool);
    var items = Progreso.elegir(pend, 8);
    if (items.length < 8) {
      var resto = pool.filter(function (p) { return items.indexOf(p) < 0; });
      items = items.concat(Progreso.elegir(resto, 8 - items.length));
    }
    items = UI.mezclar(items);
    if (!items.length) { location.hash = '#inicio'; return; }
    document.title = 'Repaso inteligente · Aprendé jugando';
    modoJuego(true);
    limpiar = Juegos.ronda({
      root: main, items: items, etiqueta: 'Repaso inteligente', icono: 'repaso',
      onSalir: salirConfirmando('#inicio'),
      onFin: function (r) {
        var est = Progreso.estrellasDe(r.ratio);
        Progreso.sumarRepaso();
        Progreso.sumarPuntos(r.puntos);
        resultado({
          titulo: 'Repaso hecho', estrellas: est, puntos: r.puntos, ratio: r.ratio,
          medallas: evaluarMedallas({ estrellas: est }),
          otraVez: function () { ir(); }, volver: '#inicio', volverTxt: 'Volver al inicio'
        });
      }
    });
  }

  function pantallaDesafio() {
    if (!todosAprobados()) { location.hash = '#inicio'; return; }
    var items = [];
    MODULOS.forEach(function (m) {
      var pool = preguntasDe(m.id).filter(function (p) { return ['opcion', 'vf', 'problema'].indexOf(p.tipo) >= 0; });
      items = items.concat(Progreso.elegir(pool, 1));
    });
    items = UI.mezclar(items);
    document.title = 'Desafío final · Aprendé jugando';
    modoJuego(true);
    limpiar = Juegos.ronda({
      root: main, items: items, etiqueta: 'Desafío final', icono: 'trofeo', reintentar: false,
      onSalir: salirConfirmando('#inicio'),
      onFin: function (r) {
        var est = Progreso.estrellasDe(r.ratio);
        Progreso.guardarDesafio(est);
        var bonus = [0, 10, 25, 50][est];
        Progreso.sumarPuntos(r.puntos + bonus);
        resultado({
          titulo: est === 3 ? '¡Maestría total!' : null, estrellas: est, puntos: r.puntos + bonus, ratio: r.ratio,
          medallas: evaluarMedallas({ estrellas: est }),
          otraVez: function () { ir(); }, volver: '#inicio', volverTxt: 'Volver al inicio'
        });
      }
    });
  }

  function resultado(r) {
    Juegos.ocultarFeedback();
    modoJuego(true);
    main.textContent = '';
    window.scrollTo(0, 0);
    var titulos = ['¡A seguir practicando!', '¡Buen comienzo!', '¡Muy bien!', '¡Excelente!'];
    var w = wrap();
    var pct = Math.round(r.ratio * 100);
    w.appendChild(h('section', { class: 'result' },
      UI.marca('isotipo', 'result__mark'),
      h('h1', null, r.titulo || titulos[r.estrellas]),
      h('p', { class: 'result__sub' }, pct + '% de aciertos' +
        (r.previo != null && r.estrellas > r.previo && r.previo > 0 ? ' · ¡superaste tu mejor marca!' : '')),
      UI.estrellas(r.estrellas, 3, 'big-stars'),
      h('p', { class: 'result__pts' }, '+' + Math.round(r.puntos) + ' puntos'),
      r.estrellas < 2 ? h('p', { class: 'result__sub' }, 'Las que fallaste van a volver más seguido en el repaso.') : null
    ));
    if (r.abrio) {
      w.appendChild(h('div', { class: 'card' },
        h('p', { class: 'eyebrow' }, 'Módulo aprobado'),
        h('h2', null, 'Se abrió «' + r.abrio.titulo + '»'),
        h('div', { class: 'row' }, h('a', { class: 'btn btn--ghost btn--sm', href: '#modulo/' + encodeURIComponent(r.abrio.id) }, 'Ir ahora', icono('seguir')))));
    }
    if (r.medallas && r.medallas.length) {
      w.appendChild(h('div', { class: 'card' },
        h('p', { class: 'eyebrow' }, r.medallas.length === 1 ? 'Medalla nueva' : 'Medallas nuevas'),
        h('div', { class: 'medal-strip' }, r.medallas.map(function (m) { return medalla(m, true, true); }))));
    }
    w.appendChild(h('div', { class: 'row' },
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: r.otraVez }, icono('repaso'), 'Otra vez'),
      h('a', { class: 'btn btn--primary', href: r.volver }, r.volverTxt)));
    if (r.estrellas === 3 || (r.medallas && r.medallas.length) || r.abrio) setTimeout(function () { UI.petalos(); }, 400);
  }

  /* ================= Progreso ================= */
  function pantallaProgreso() {
    encabezado('Tu progreso');
    marcarTab('progreso');
    var w = wrap(), S = Progreso.estado;
    var dom = Progreso.dominio(PREGUNTAS);
    var vistas = Progreso.vistas(PREGUNTAS);
    var R = 40, C = 2 * Math.PI * R;
    var ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('viewBox', '0 0 100 100');
    ring.setAttribute('role', 'img');
    ring.setAttribute('aria-label', Math.round(dom * 100) + '% dominado');
    ring.innerHTML = '<circle class="bg" cx="50" cy="50" r="' + R + '"/>' +
      '<circle class="fg" cx="50" cy="50" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/>' +
      '<text x="50" y="57" text-anchor="middle">' + Math.round(dom * 100) + '%</text>';
    w.appendChild(h('section', { class: 'card ring' }, ring,
      h('div', null,
        h('h2', null, 'Lo que ya sabés'),
        h('p', { class: 'small muted' }, 'Respondiste ' + vistas + ' de ' + PREGUNTAS.length + ' preguntas al menos una vez. El porcentaje sube cuando acertás varias veces seguidas.'),
        h('p', { class: 'small muted' }, 'Mejor racha: ' + S.rachaMax + ' seguidas.'))));
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      ring.querySelector('.fg').style.strokeDashoffset = String(C * (1 - dom));
    }); });

    var fuertes = [], flojos = [];
    var lista = h('ul', { class: 'prog-list' });
    MODULOS.forEach(function (m, i) {
      var ps = preguntasDe(m.id), d = Progreso.dominio(ps), est = estrellasModulo(m.id);
      var visto = Progreso.vistas(ps) > 0;
      if (visto && d >= 0.7) fuertes.push(m.titulo);
      else if (visto && d < 0.4) flojos.push(m.titulo);
      lista.appendChild(h('li', null,
        h('div', { class: 'prog-row' }, h('strong', null, m.titulo),
          h('span', null, abierto(i) ? Math.round(d * 100) + '% · ' + est.tiene + '/' + est.max + ' ★' : 'cerrado')),
        h('div', { class: 'bar' }, h('i', { class: d < 0.4 ? 'lo' : d < 0.7 ? 'mid' : '', style: 'width:' + Math.round(d * 100) + '%' }))));
    });
    w.appendChild(h('section', { class: 'card' }, h('h2', null, 'Por tema'), lista));

    w.appendChild(h('section', { class: 'card' },
      h('h2', null, 'Temas que dominás'),
      h('p', { class: fuertes.length ? '' : 'muted' }, fuertes.length ? fuertes.join(' · ') : 'Todavía ninguno. Cuando aciertes varias veces seguidas, van a aparecer acá.'),
      flojos.length ? h('h2', { style: 'margin-top:16px' }, 'Temas que te cuestan') : null,
      flojos.length ? h('p', null, flojos.join(' · ')) : null));

    var dificiles = PREGUNTAS.filter(function (p) { var it = S.items[p.id]; return it && it.e > 0 && it.c <= 2; })
      .sort(function (a, b) { return S.items[b.id].e - S.items[a.id].e; }).slice(0, 6);
    if (dificiles.length) {
      w.appendChild(h('section', { class: 'card' },
        h('h2', null, 'Preguntas que te costaron'),
        h('ul', { class: 'weak' }, dificiles.map(function (p) {
          var m = MODULOS[indice(p.modulo)];
          return h('li', null, textoDe(p), h('small', null, m.titulo + ' · ' + S.items[p.id].e + (S.items[p.id].e === 1 ? ' error' : ' errores')));
        })),
        h('div', { class: 'row' }, h('a', { class: 'btn btn--primary', href: '#repaso' }, icono('repaso'), 'Repasarlas ahora'))));
    }

    w.appendChild(h('section', { class: 'card' },
      h('h2', null, 'Empezar de cero'),
      h('p', { class: 'small muted' }, 'Borra puntos, estrellas, medallas y el historial de este dispositivo. Las preguntas no se tocan.'),
      h('div', { class: 'row' }, h('button', { class: 'btn btn--danger-ghost', type: 'button', onclick: reiniciar }, 'Reiniciar progreso'))));
  }

  function reiniciar() {
    UI.confirmar({ titulo: '¿Reiniciar todo?', texto: 'Se borran tus puntos, estrellas, medallas y el repaso. No se puede deshacer.', si: 'Sí, reiniciar', no: 'Cancelar', peligro: true })
      .then(function (si) {
        if (!si) return;
        Progreso.reiniciar();
        UI.toast('Listo, empezás de cero.', 'isotipo');
        location.hash = '#inicio';
        ir();
      });
  }

  /* ================= Medallas ================= */
  function medalla(m, ganada, nueva) {
    return h('div', { class: 'medal' + (ganada ? '' : ' medal--off') + (nueva ? ' medal--new' : '') },
      h('div', { class: 'medal__disc' }, ganada ? UI.marca(m.marca) : icono('candado')),
      h('div', null,
        h('p', { class: 'medal__name' }, m.nombre),
        h('p', { class: 'medal__desc' }, m.desc)));
  }
  function mostrarMedallas(nuevas) {
    nuevas.forEach(function (m, k) {
      setTimeout(function () { UI.toast('Medalla nueva: ' + m.nombre, m.marca); UI.petalos(18); }, k * 1800);
    });
  }
  function pantallaMedallas() {
    encabezado('Tus medallas');
    marcarTab('medallas');
    var w = wrap(), S = Progreso.estado;
    var n = Object.keys(S.medallas).length;
    w.appendChild(h('p', { class: 'muted', style: 'margin-top:8px' }, n === 0 ? 'Todavía no ganaste ninguna. ¡La primera llega con tu primer juego!' : 'Ganaste ' + n + ' de ' + MEDALLAS.length + '.'));
    w.appendChild(h('div', { class: 'medals' }, MEDALLAS.map(function (m) { return medalla(m, !!S.medallas[m.id]); })));
  }

  /* ================= Instalación y sin internet ================= */
  var eventoInstalar = null;
  var btnInstall = document.getElementById('btnInstall');
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    eventoInstalar = e;
    btnInstall.hidden = false;
  });
  btnInstall.addEventListener('click', function () {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    eventoInstalar.userChoice.finally(function () { eventoInstalar = null; btnInstall.hidden = true; });
  });
  window.addEventListener('appinstalled', function () { btnInstall.hidden = true; UI.toast('¡App instalada!', 'isotipo'); });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () { /* sin modo offline */ }); });
  }

  cargarBanco();
  ir();
})();
