// Panel de la dueña: aprobar pagos por transferencia o cripto y dar acceso a mano.
// La sesión es la misma del aula; el servidor sólo responde a los mails de ADMIN_EMAILS.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
let sb = null;

const METODOS = { transferencia: "Transferencia", cripto: "Cripto", mercadopago: "Mercado Pago", paypal: "PayPal", hotmart: "Hotmart", manual: "Manual" };
const fecha = (iso) => new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

iniciar().catch((e) => { console.error(e); sinPermiso("No pudimos abrir el panel", "Recargá la página en un rato."); });

async function iniciar() {
  const cfg = await (await fetch("/api/config")).json();
  sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const { data } = await sb.auth.getSession();
  if (!data.session) return sinPermiso("Entrá primero", "Para usar el panel, entrá en el aula con tu mail de administradora y volvé a esta página.");
  $("[data-mail]").textContent = data.session.user.email;
  await cargar();
}

async function api(ruta, opciones = {}) {
  const { data } = await sb.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (data.session) headers.Authorization = "Bearer " + data.session.access_token;
  const r = await fetch(ruta, Object.assign({}, opciones, { headers }));
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(datos.error || "Algo falló."), { status: r.status });
  return datos;
}

function vista(nombre) {
  $$("[data-vista]").forEach((v) => (v.hidden = v.dataset.vista !== nombre));
}

function sinPermiso(titulo, texto) {
  $("[data-titulo-permiso]").textContent = titulo;
  $("[data-texto-permiso]").textContent = texto;
  vista("sin-permiso");
}

async function cargar() {
  let d;
  try {
    d = await api("/api/admin");
  } catch (e) {
    if (e.status === 403) return sinPermiso("Esta cuenta no administra el curso", "Entraste con un mail que no tiene permiso de administración.");
    throw e;
  }
  $("[data-total-alumnos]").textContent = d.totalAlumnos;
  $("[data-total-pendientes]").textContent = d.pedidos.length;
  pintarPedidos(d.pedidos);
  pintarAlumnos(d.alumnos);
  vista("panel");
}

function el(tag, clase, texto) {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}

function pintarPedidos(pedidos) {
  const caja = $("[data-pedidos]");
  caja.innerHTML = "";
  if (!pedidos.length) {
    caja.innerHTML = "<p class='vacio'><i class='ph ph-check-circle'></i>No hay pagos para revisar.</p>";
    return;
  }
  pedidos.forEach((p) => {
    const art = el("article", "pedido");
    const cab = el("div", "pedido-cabeza");
    cab.append(el("strong", null, p.email), el("time", null, fecha(p.creado)));
    const datos = el("div", "pedido-datos");
    datos.append(el("span", "etiqueta", METODOS[p.metodo] || p.metodo), el("span", "etiqueta monto", (p.moneda === "ARS" ? "$ " : p.moneda + " ") + Number(p.monto).toLocaleString("es-AR")));
    art.append(cab, datos);
    if (p.referencia) art.append(el("p", "ref", "Referencia: " + p.referencia));
    if (p.comprobanteUrl) {
      const a = el("a", "comprobante");
      a.href = p.comprobanteUrl;
      a.target = "_blank";
      a.rel = "noopener";
      if (/\.pdf$/i.test(p.comprobante)) a.innerHTML = "<i class='ph ph-file-pdf'></i> Ver comprobante (PDF)";
      else {
        a.classList.add("comprobante-foto");
        const img = el("img");
        img.src = p.comprobanteUrl;
        img.alt = "Comprobante de " + p.email;
        img.loading = "lazy";
        a.append(img);
      }
      art.append(a);
    }
    const acc = el("div", "pedido-acciones");
    const ok = el("button", "btn btn-primary");
    ok.type = "button";
    ok.innerHTML = "<i class='ph ph-check'></i> Aprobar y dar acceso";
    const no = el("button", "btn btn-ghost");
    no.type = "button";
    no.textContent = "Rechazar";
    ok.addEventListener("click", () => resolver(p, "aprobar", [ok, no]));
    no.addEventListener("click", () => {
      if (confirm("¿Rechazar el pago de " + p.email + "? No va a tener acceso.")) resolver(p, "rechazar", [ok, no]);
    });
    acc.append(ok, no);
    art.append(acc);
    caja.append(art);
  });
}

async function resolver(p, accion, botones) {
  botones.forEach((b) => (b.disabled = true));
  try {
    await api("/api/admin", { method: "POST", body: JSON.stringify({ accion, id: p.id }) });
    await cargar();
  } catch (e) {
    alert(e.message);
    botones.forEach((b) => (b.disabled = false));
  }
}

function pintarAlumnos(alumnos) {
  const ul = $("[data-alumnos]");
  ul.innerHTML = "";
  if (!alumnos.length) { ul.append(el("li", "vacio", "Todavía no hay alumnos.")); return; }
  alumnos.forEach((a) => {
    const li = el("li");
    const quitar = el("button");
    quitar.type = "button";
    quitar.innerHTML = "<i class='ph ph-user-minus'></i>";
    quitar.setAttribute("aria-label", "Quitar acceso a " + a.email);
    quitar.title = "Quitar acceso";
    quitar.addEventListener("click", async () => {
      if (!confirm("¿Quitarle el acceso al curso a " + a.email + "?")) return;
      try { await api("/api/admin", { method: "POST", body: JSON.stringify({ accion: "quitar-acceso", email: a.email }) }); await cargar(); }
      catch (e) { alert(e.message); }
    });
    li.append(el("span", null, a.email), quitar, el("small", null, (METODOS[a.origen] || a.origen) + " · " + fecha(a.creado)));
    ul.append(li);
  });
}

$("[data-form-acceso]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget, msj = $("[data-msj]", form), boton = $("button", form);
  const mails = Array.from(new Set(form.mails.value.toLowerCase().split(/[\s,;]+/).filter((m) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m))));
  if (!mails.length) { msj.textContent = "Escribí al menos un mail válido."; msj.classList.add("error"); return; }
  msj.classList.remove("error");
  boton.disabled = true;
  let nuevos = 0, fallidos = [];
  for (let i = 0; i < mails.length; i++) {
    msj.textContent = "Dando acceso… " + (i + 1) + " de " + mails.length;
    try {
      const r = await api("/api/admin", { method: "POST", body: JSON.stringify({ accion: "dar-acceso", email: mails[i], origen: form.origen.value }) });
      if (r.nuevo) nuevos++;
    } catch (err) { fallidos.push(mails[i]); }
  }
  boton.disabled = false;
  msj.textContent = "Listo: " + nuevos + " con acceso nuevo" + (mails.length - nuevos - fallidos.length ? ", " + (mails.length - nuevos - fallidos.length) + " ya lo tenían" : "") + "." + (fallidos.length ? " Fallaron: " + fallidos.join(", ") : "");
  msj.classList.toggle("error", fallidos.length > 0);
  if (!fallidos.length) form.mails.value = "";
  await cargar();
});
