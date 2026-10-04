/* Motor de cálculo: costos, precios, márgenes y punto de equilibrio.
   Funciones puras: reciben el estado y devuelven números. Montos en centavos (pueden tener decimales). */
(function () {
  'use strict';

  /* ---------- Unidades ---------- */
  const UNIDADES = {
    g: { base: 'g', f: 1, nombre: 'g', largo: 'gramos' },
    kg: { base: 'g', f: 1000, nombre: 'kg', largo: 'kilos' },
    ml: { base: 'ml', f: 1, nombre: 'ml', largo: 'mililitros' },
    l: { base: 'ml', f: 1000, nombre: 'l', largo: 'litros' },
    u: { base: 'u', f: 1, nombre: 'u.', largo: 'unidades' }
  };
  const uf = u => (UNIDADES[u] || UNIDADES.u).f;
  const ubase = u => (UNIDADES[u] || UNIDADES.u).base;
  /** Unidades en las que se puede usar un insumo (g ↔ kg, ml ↔ l) */
  const compatibles = u => Object.keys(UNIDADES).filter(k => UNIDADES[k].base === ubase(u));

  /** Costo de 1 unidad base (1 g, 1 ml o 1 unidad) */
  function costoBase(ins, pctExtra) {
    const cant = (ins.cantidad || 0) * uf(ins.unidad);
    if (!cant) return 0;
    return (ins.precio || 0) * (1 + (pctExtra || 0) / 100) / cant;
  }
  /** Costo por unidad "de compra" más cómoda para mostrar: por g, por ml, por unidad, y también por kg / l */
  function costoMostrable(ins) {
    const b = costoBase(ins);
    const base = ubase(ins.unidad);
    const out = [{ u: UNIDADES[base].nombre, v: b }];
    if (base === 'g') out.push({ u: 'kg', v: b * 1000 });
    if (base === 'ml') out.push({ u: 'l', v: b * 1000 });
    return out;
  }

  /* ---------- Producto ---------- */
  function objetivos(p, T) {
    return {
      modo: p.modo || T.modo || 'margen',
      min: p.objMin != null ? p.objMin : T.objMin,
      may: p.objMay != null ? p.objMay : T.objMay
    };
  }

  function redondear(cents, paso) {
    if (!isFinite(cents)) return cents;
    const step = (paso || 0) * 100;
    if (!step) return Math.ceil(cents);
    return Math.ceil(cents / step - 1e-9) * step;
  }

  /** Precio sugerido para llegar al objetivo, descontando comisión e impuestos */
  function sugerido(costoTotal, pctCobro, pctImp, modo, obj) {
    const keep = 1 - pctCobro / 100 - pctImp / 100;
    if (modo === 'markup') return keep > 0 ? costoTotal * (1 + obj / 100) / keep : Infinity;
    const den = keep - obj / 100;
    return den > 0 ? costoTotal / den : Infinity;
  }

  /** Números de un canal (minorista o mayorista) para un precio dado */
  function canal(precio, costoVar, costoTotal, pctCobro, pctImp) {
    const comision = precio * pctCobro / 100;
    const impuesto = precio * pctImp / 100;
    const neto = precio - comision - impuesto;
    const ganancia = neto - costoTotal;
    return {
      precio, comision, impuesto, neto, ganancia,
      contrib: neto - costoVar,
      margen: precio > 0 ? ganancia / precio : NaN,
      markup: costoTotal > 0 ? ganancia / costoTotal : NaN
    };
  }

  /**
   * Analiza todo. S: estado de la app. ov (opcional, para el simulador):
   *   { insumoPct: { '*': n, [id]: n }, precioPct: n, ventas: { [id]: { min, may } }, fijosPct: n, valorHora: cents }
   */
  function analyze(S, ov) {
    ov = ov || {};
    const T = S.taller;
    const insMap = new Map(S.insumos.map(i => [i.id, i]));
    const medio = id => S.medios.find(m => m.id === id) || { nombre: 'Sin comisión', pct: 0 };
    const mMin = medio(T.medioMin), mMay = medio(T.medioMay);
    const pctImp = T.impuestoPct || 0;
    const valorHora = ov.valorHora != null ? ov.valorHora : (T.valorHora || 0);
    const insPct = id => (ov.insumoPct ? (ov.insumoPct[id] || 0) + (ov.insumoPct['*'] || 0) : 0);
    const F = S.fijos.reduce((a, f) => a + (f.monto || 0), 0) * (1 + (ov.fijosPct || 0) / 100);

    // 1) Materiales y mano de obra
    const rows = S.productos.map(p => {
      const rinde = Math.max(1, p.rinde || 1);
      let faltan = 0;
      const items = (p.items || []).map(it => {
        const ins = insMap.get(it.insumoId);
        if (!ins) { faltan++; return { it, ins: null, porTanda: 0, porUnidad: 0 }; }
        const unit = costoBase(ins, insPct(ins.id)) * (it.cantidad || 0) * uf(it.unidad);
        const porTanda = it.por === 'unidad' ? unit * rinde : unit;
        return { it, ins, porTanda, porUnidad: porTanda / rinde };
      });
      const merma = (p.merma || 0) / 100;
      const matSin = items.reduce((a, x) => a + x.porTanda, 0);
      const matTanda = matSin * (1 + merma);
      const moTanda = valorHora * (p.minutos || 0) / 60;
      const v = ov.ventas && ov.ventas[p.id];
      const ventasMin = v ? v.min : (p.ventasMin || 0);
      const ventasMay = v ? v.may : (p.ventasMay || 0);
      return {
        p, rinde, items, faltan, merma, matSin, matTanda,
        matUnidad: matTanda / rinde, mermaUnidad: (matTanda - matSin) / rinde,
        moTanda, moUnidad: moTanda / rinde,
        minUnidad: (p.minutos || 0) / rinde,
        ventasMin, ventasMay, unidadesMes: ventasMin + ventasMay
      };
    });

    // 2) Prorrateo de costos fijos
    const U = rows.reduce((a, r) => a + r.unidadesMes, 0);
    const Min = rows.reduce((a, r) => a + r.unidadesMes * r.minUnidad, 0);
    const porHoras = T.prorrateo === 'horas' && Min > 0;
    rows.forEach(r => {
      if (porHoras) r.fijoUnidad = F * r.minUnidad / Min;
      else r.fijoUnidad = U > 0 ? F / U : 0;
      r.sinProrrateo = U === 0 && F > 0;
      r.costoVar = r.matUnidad + r.moUnidad;
      r.costoTotal = r.costoVar + r.fijoUnidad;
    });

    // 3) Precios por canal
    const precioFactor = 1 + (ov.precioPct || 0) / 100;
    rows.forEach(r => {
      const o = objetivos(r.p, T);
      r.obj = o;
      r.canales = {};
      [['min', mMin, r.p.precioMin, o.min, r.ventasMin], ['may', mMay, r.p.precioMay, o.may, r.ventasMay]].forEach(([k, m, precio, obj, ventas]) => {
        const base = precio ? precio * precioFactor : 0;
        const c = canal(base, r.costoVar, r.costoTotal, m.pct || 0, pctImp);
        c.medio = m; c.pctCobro = m.pct || 0; c.pctImp = pctImp; c.ventas = ventas;
        c.objetivo = obj; c.modo = o.modo;
        c.sugeridoExacto = sugerido(r.costoTotal, c.pctCobro, pctImp, o.modo, obj);
        c.sugerido = redondear(c.sugeridoExacto, T.redondeo);
        c.sugMargen = sugerido(r.costoTotal, c.pctCobro, pctImp, 'margen', obj);
        c.sugMarkup = sugerido(r.costoTotal, c.pctCobro, pctImp, 'markup', obj);
        c.minimo = sugerido(r.costoTotal, c.pctCobro, pctImp, 'margen', 0); // precio que solo cubre todo
        c.piso = sugerido(r.costoVar, c.pctCobro, pctImp, 'margen', 0);      // precio que solo cubre lo variable
        if (!base) c.estado = 'sinprecio';
        else if (c.contrib < 0) c.estado = 'perdida';
        else if (c.ganancia < 0) c.estado = 'bajo';
        else if (isFinite(c.sugeridoExacto) && base < c.sugeridoExacto * 0.98) c.estado = 'flojo';
        else c.estado = 'ok';
        r.canales[k] = c;
      });
      const g = r.canales.min, w = r.canales.may;
      r.estado = ['perdida', 'bajo', 'flojo'].find(e => g.estado === e || w.estado === e) ||
        (g.estado === 'sinprecio' ? 'sinprecio' : 'ok');
      const horasTanda = (r.p.minutos || 0) / 60;
      // Ganancia por hora de trabajo: lo que deja una tanda (a precio minorista) sobre las horas que lleva
      r.gananciaHora = horasTanda > 0 && g.precio ? (g.ganancia + r.moUnidad) * r.rinde / horasTanda : NaN;
    });

    // 4) Totales del mes y punto de equilibrio con mezcla de ventas
    let fact = 0, contrib = 0, unidades = 0, horas = 0;
    rows.forEach(r => {
      ['min', 'may'].forEach(k => {
        const c = r.canales[k];
        if (!c.ventas || !c.precio) return;
        fact += c.ventas * c.precio;
        contrib += c.ventas * c.contrib;
        unidades += c.ventas;
      });
      horas += r.unidadesMes * r.minUnidad / 60;
    });
    const wcm = unidades > 0 ? contrib / unidades : 0;
    const precioProm = unidades > 0 ? fact / unidades : 0;
    const peUnidades = wcm > 0 ? F / wcm : Infinity;
    const totals = {
      F, unidades, facturacion: fact, contrib, ganancia: contrib - F, horas,
      wcm, precioProm, peUnidades, pePesos: peUnidades * precioProm,
      cobertura: F > 0 ? contrib / F : Infinity,
      manoObraMes: horas * valorHora
    };

    const byId = {};
    rows.forEach(r => { byId[r.p.id] = r; });
    return { rows, byId, totals, F, mMin, mMay, pctImp };
  }

  /** Unidades necesarias para cubrir fijos (y una meta de ganancia) con una contribución por unidad */
  function unidadesPara(F, contribUnidad, meta) {
    if (!(contribUnidad > 0)) return Infinity;
    return (F + (meta || 0)) / contribUnidad;
  }

  /** Descuento máximo: hasta dónde bajar sin perder (cubriendo costo total) y sin poner plata (solo variables) */
  function descuentoMax(precio, costoTotal, costoVar, pctCobro, pctImp) {
    const keep = 1 - pctCobro / 100 - pctImp / 100;
    const netoLista = precio * keep;
    if (!(netoLista > 0)) return { total: 0, piso: 0 };
    return { total: Math.max(0, 1 - costoTotal / netoLista), piso: Math.max(0, 1 - costoVar / netoLista) };
  }

  window.C = {
    UNIDADES, uf, ubase, compatibles, costoBase, costoMostrable, sugerido, canal, analyze,
    unidadesPara, descuentoMax, redondear
  };
})();
