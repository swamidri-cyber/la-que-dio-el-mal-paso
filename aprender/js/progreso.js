/* Progreso guardado en el dispositivo (localStorage), repaso inteligente y medallas.
   No hay usuarios ni servidor: todo queda en este navegador. */
(function () {
  'use strict';

  var KEY = 'aprender-sahumerios-v1';

  function vacio() {
    return {
      v: 1,
      puntos: 0,
      items: {},      // id de pregunta -> { c: caja 0-5, a: aciertos, e: errores, t: fecha }
      juegos: {},     // "modulo:juego" -> { best: estrellas 0-3, veces }
      medallas: {},   // id -> fecha
      fichas: {},     // modulo -> true si se repasaron todas
      racha: 0,
      rachaMax: 0,
      repasos: 0,
      desafio: 0
    };
  }

  function cargar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return Object.assign(vacio(), JSON.parse(raw));
    } catch (e) { /* sin almacenamiento: se juega igual, sin guardar */ }
    return vacio();
  }

  var S = cargar();

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* idem */ }
  }

  /* ---------- Repaso inteligente (cajas tipo Leitner) ----------
     Caja 0: nunca vista. Al acertar sube de caja; al errar vuelve a la 1.
     Cuanto más baja la caja, más probable es que la pregunta vuelva a salir. */
  var PESO = { 0: 3, 1: 8, 2: 4, 3: 2, 4: 1, 5: 0.5 };

  function caja(id) { return (S.items[id] && S.items[id].c) || 0; }

  function registrar(id, ok) {
    var it = S.items[id] || (S.items[id] = { c: 0, a: 0, e: 0 });
    if (ok) {
      it.a++;
      it.c = it.c === 0 ? 2 : Math.min(5, it.c + 1);
      S.racha++;
      if (S.racha > S.rachaMax) S.rachaMax = S.racha;
    } else {
      it.e++;
      it.c = 1;
      S.racha = 0;
    }
    it.t = Date.now();
    guardar();
  }

  function peso(p) { return PESO[caja(p.id)] || 1; }

  // Elige n preguntas sin repetir, con más chances para las que cuestan.
  function elegir(pool, n, pesoFn) {
    var lista = pool.slice(), out = [];
    pesoFn = pesoFn || peso;
    while (out.length < n && lista.length) {
      var total = 0, i;
      for (i = 0; i < lista.length; i++) total += pesoFn(lista[i]);
      var r = Math.random() * total;
      for (i = 0; i < lista.length; i++) {
        r -= pesoFn(lista[i]);
        if (r <= 0) break;
      }
      out.push(lista.splice(Math.min(i, lista.length - 1), 1)[0]);
    }
    return out;
  }

  // Preguntas vistas que todavía cuestan.
  function pendientes(pool) {
    return pool.filter(function (p) {
      var it = S.items[p.id];
      return it && it.c > 0 && it.c <= 2;
    });
  }

  // 0 a 1: qué tan dominado está un conjunto de preguntas.
  function dominio(pool) {
    if (!pool.length) return 0;
    var s = 0;
    pool.forEach(function (p) { s += caja(p.id) / 5; });
    return s / pool.length;
  }

  function vistas(pool) {
    return pool.filter(function (p) { return S.items[p.id]; }).length;
  }

  /* ---------- Juegos y estrellas ---------- */
  function estrellasDe(ratio) {
    if (ratio >= 0.9) return 3;
    if (ratio >= 0.7) return 2;
    if (ratio >= 0.5) return 1;
    return 0;
  }

  function mejor(mod, juego) {
    var j = S.juegos[mod + ':' + juego];
    return j ? j.best : 0;
  }

  function guardarJuego(mod, juego, estrellas) {
    var k = mod + ':' + juego;
    var j = S.juegos[k] || (S.juegos[k] = { best: 0, veces: 0 });
    var antes = j.best;
    j.veces++;
    if (estrellas > j.best) j.best = estrellas;
    guardar();
    return antes;
  }

  function sumarPuntos(n) {
    S.puntos += Math.max(0, Math.round(n));
    guardar();
  }

  function marcarFichas(mod) { S.fichas[mod] = true; guardar(); }
  function sumarRepaso() { S.repasos++; guardar(); }
  function guardarDesafio(est) { if (est > S.desafio) S.desafio = est; guardar(); }

  function ganarMedalla(id) {
    if (S.medallas[id]) return false;
    S.medallas[id] = Date.now();
    guardar();
    return true;
  }

  function reiniciar() {
    S = vacio();
    guardar();
  }

  window.Progreso = {
    get estado() { return S; },
    caja: caja,
    registrar: registrar,
    elegir: elegir,
    pendientes: pendientes,
    dominio: dominio,
    vistas: vistas,
    estrellasDe: estrellasDe,
    mejor: mejor,
    guardarJuego: guardarJuego,
    sumarPuntos: sumarPuntos,
    marcarFichas: marcarFichas,
    sumarRepaso: sumarRepaso,
    guardarDesafio: guardarDesafio,
    ganarMedalla: ganarMedalla,
    reiniciar: reiniciar
  };
})();
