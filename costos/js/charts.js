/* Gráficos en SVG hechos a mano (sin librerías).
   Cada marca lleva data-tip con HTML seguro; un único manejador muestra el tooltip. */
(function () {
  'use strict';
  const { money, moneyShort, esc, num } = window.F;

  function niceMax(v) {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / exp;
    const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * exp;
  }

  /**
   * Ingresos vs costos según unidades vendidas por mes.
   * o: { F, precio (por unidad), costoVar (por unidad, con comisiones), pe (unidades), actual (unidades/mes) }
   */
  function breakEven(o) {
    const W = 340, H = 220, padL = 50, padR = 10, padT = 14, padB = 34;
    const iw = W - padL - padR, ih = H - padT - padB;
    const qMax = niceMax(Math.max(10, isFinite(o.pe) ? o.pe * 1.8 : 0, (o.actual || 0) * 1.25));
    const ing = q => q * o.precio;
    const cos = q => o.F + q * o.costoVar;
    const yMax = niceMax(Math.max(ing(qMax), cos(qMax)));
    const x = q => padL + (q / qMax) * iw;
    const y = v => padT + ih - (v / yMax) * ih;
    const base = padT + ih;

    const yt = [0, 0.5, 1].map(t => t * yMax);
    const xt = [0, 0.25, 0.5, 0.75, 1].map(t => t * qMax);
    const grid = yt.map(t => `<line class="grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/>` +
      `<text x="${padL - 6}" y="${y(t) + 4}" text-anchor="end">${esc(moneyShort(t))}</text>`).join('') +
      xt.map(t => `<text x="${x(t)}" y="${base + 16}" text-anchor="middle">${esc(num(t, 0))}</text>`).join('') +
      `<text x="${padL + iw / 2}" y="${base + 30}" text-anchor="middle">unidades vendidas por mes</text>`;

    // Zonas: pérdida (antes del punto) y ganancia (después)
    let zones = '';
    if (isFinite(o.pe) && o.pe > 0 && o.pe < qMax) {
      zones = `<path d="M${x(0)} ${y(cos(0))}L${x(o.pe)} ${y(cos(o.pe))}L${x(0)} ${y(0)}Z" fill="var(--c-gas)" opacity=".12"/>` +
        `<path d="M${x(o.pe)} ${y(ing(o.pe))}L${x(qMax)} ${y(ing(qMax))}L${x(qMax)} ${y(cos(qMax))}Z" fill="var(--c-ing)" opacity=".16"/>`;
    }
    const lines =
      `<line x1="${x(0)}" y1="${y(o.F)}" x2="${x(qMax)}" y2="${y(o.F)}" stroke="var(--sage)" stroke-width="1.5" stroke-dasharray="4 4"/>` +
      `<line x1="${x(0)}" y1="${y(cos(0))}" x2="${x(qMax)}" y2="${y(cos(qMax))}" stroke="var(--c-gas)" stroke-width="2.5" stroke-linecap="round" class="draw" pathLength="1"/>` +
      `<line x1="${x(0)}" y1="${y(0)}" x2="${x(qMax)}" y2="${y(ing(qMax))}" stroke="var(--c-ing)" stroke-width="2.5" stroke-linecap="round" class="draw" pathLength="1"/>`;

    let marks = '';
    if (o.actual > 0 && o.actual <= qMax) {
      const g = ing(o.actual) - cos(o.actual);
      const tip = `<b>Lo que estimás vender: ${esc(num(o.actual, 1))} u.</b><br>Ingresos: ${money(ing(o.actual))}<br>Costos: ${money(cos(o.actual))}<br>${g >= 0 ? 'Ganancia' : 'Pérdida'}: ${money(Math.abs(g))}`;
      marks += `<g data-tip="${esc(tip)}"><line x1="${x(o.actual)}" x2="${x(o.actual)}" y1="${padT}" y2="${base}" stroke="var(--ink-soft)" stroke-width="1.5" stroke-dasharray="2 3"/>` +
        `<rect class="hit" x="${x(o.actual) - 12}" y="${padT}" width="24" height="${ih}"/>` +
        `<text x="${x(o.actual)}" y="${padT - 3}" text-anchor="middle" style="fill:var(--ink-soft);font-weight:600">vos hoy</text></g>`;
    }
    if (isFinite(o.pe) && o.pe <= qMax) {
      const tip = `<b>Punto de equilibrio</b><br>${esc(num(Math.ceil(o.pe), 0))} unidades por mes<br>${money(ing(o.pe))} facturados`;
      const px = x(o.pe), py = y(ing(o.pe));
      marks += `<g data-tip="${esc(tip)}"><circle cx="${px}" cy="${py}" r="14" class="hit"/>` +
        `<circle cx="${px}" cy="${py}" r="6" fill="var(--card)" stroke="var(--ink)" stroke-width="2.5"/></g>`;
    }
    const aria = isFinite(o.pe)
      ? `Gráfico de ingresos y costos. El punto de equilibrio está en ${Math.ceil(o.pe)} unidades por mes.`
      : 'Gráfico de ingresos y costos. Con estos precios no se llega al punto de equilibrio.';
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${grid}${zones}${lines}${marks}</svg><div class="tip" hidden></div></div>
      <div class="legend"><span><i style="background:var(--c-ing)"></i>Ingresos</span><span><i style="background:var(--c-gas)"></i>Costos totales</span><span><i style="background:var(--sage);height:3px"></i>Costos fijos</span><span><i style="border:2px solid var(--ink);border-radius:50%;background:var(--card)"></i>Punto de equilibrio</span></div>`;
  }

  /** Línea chiquita para el historial de precios. pts: [{label, v}] */
  function spark(pts) {
    if (pts.length < 2) return '';
    const W = 300, H = 70, pad = 8;
    const vs = pts.map(p => p.v);
    const min = Math.min(...vs), max = Math.max(...vs);
    const span = max - min || 1;
    const x = i => pad + i * (W - pad * 2) / (pts.length - 1);
    const y = v => H - pad - ((v - min) / span) * (H - pad * 2);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join('');
    const dots = pts.map((p, i) => `<g data-tip="${esc('<b>' + esc(p.label) + '</b><br>' + p.tip)}"><circle class="hit" cx="${x(i)}" cy="${y(p.v)}" r="12"/><circle cx="${x(i)}" cy="${y(p.v)}" r="3.5" fill="var(--terra-strong)"/></g>`).join('');
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolución del precio"><path d="${d}" fill="none" stroke="var(--terra)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" class="draw" pathLength="1"/>${dots}</svg><div class="tip" hidden></div></div>`;
  }

  /** Tooltips: tocar/pasar el dedo o el mouse sobre una marca */
  function bindTips(root) {
    root.querySelectorAll('.chart').forEach(ch => {
      const tip = ch.querySelector('.tip');
      if (!tip || ch.dataset.tips) return;
      ch.dataset.tips = '1';
      let active = null;
      const show = (el, ev) => {
        const rect = ch.getBoundingClientRect();
        const er = el.getBoundingClientRect();
        tip.innerHTML = el.getAttribute('data-tip');
        tip.hidden = false;
        let x = (ev && ev.clientX != null ? ev.clientX : er.left + er.width / 2) - rect.left;
        const y = er.top - rect.top;
        const tw = tip.offsetWidth;
        x = Math.max(tw / 2, Math.min(rect.width - tw / 2, x));
        tip.style.left = x + 'px';
        tip.style.top = Math.max(y, tip.offsetHeight + 14) + 'px';
        active = el;
      };
      const hide = () => { tip.hidden = true; active = null; };
      let lastType = 'touch';
      ch.addEventListener('pointerdown', e => { lastType = e.pointerType; });
      ch.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        const el = e.target.closest('[data-tip]');
        if (el) show(el, e); else hide();
      });
      ch.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hide(); });
      ch.addEventListener('click', e => {
        if (lastType === 'mouse') return;
        const el = e.target.closest('[data-tip]');
        if (!el || el === active) hide(); else show(el, e);
      });
    });
  }

  window.Charts = { breakEven, spark, bindTips };
})();
