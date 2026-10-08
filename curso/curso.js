// Aula del curso: ingreso por mail (sin contraseña), compra con Mercado Pago y clases.
// Quién tiene acceso lo decide el servidor (/api); acá sólo se muestra lo que responde.
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

let sb = null;
let estado = null;
let actual = null; // id de la clase abierta
let vistas = new Set(leer("curso:vistas", []));

// ---------- Arranque ----------

mostrarAvisoPago();
iniciar().catch((e) => {
  console.error(e);
  vista("entrar");
  mensaje($("[data-form-entrar] [data-msj]"), "No pudimos conectar con el aula. Recargá la página en un rato.", true);
});

async function iniciar() {
  const cfg = await (await fetch("/api/config")).json();
  sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  // Si se llega desde el enlace del mail, Supabase toma la sesión de la URL acá.
  await sb.auth.getSession();
  // Supabase repite SIGNED_IN al volver a la pestaña: sólo recargamos si cambió la persona.
  sb.auth.onAuthStateChange((evento, sesion) => {
    const antes = estado && estado.usuario ? estado.usuario.email : null;
    const ahora = sesion && sesion.user ? sesion.user.email.toLowerCase() : null;
    if ((evento === "SIGNED_IN" || evento === "SIGNED_OUT") && estado && antes !== ahora) setTimeout(cargar, 0); // fuera del callback, para no trabar a Supabase
  });
  await cargar();
}

async function token() {
  const { data } = await sb.auth.getSession();
  return data.session ? data.session.access_token : null;
}

async function api(ruta, opciones = {}) {
  const t = await token();
  const headers = Object.assign({ "Content-Type": "application/json" }, t ? { Authorization: "Bearer " + t } : {});
  const r = await fetch(ruta, Object.assign({}, opciones, { headers }));
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(datos.error || "Algo falló. Probá de nuevo.");
  return datos;
}

async function cargar() {
  estado = await api("/api/estado");
  const u = estado.usuario;
  $("[data-mail]").textContent = u ? u.email : "";
  $("[data-mail]").hidden = !u;
  $$("[data-salir]").forEach((b) => (b.hidden = !u));

  if (!u) return pintarEntrar();
  if (!u.alumno) {
    $("[data-mail-actual]").textContent = u.email;
    return vista("sin-acceso");
  }
  pintarAula();
}

function vista(nombre) {
  $$("[data-vista]").forEach((v) => (v.hidden = v.dataset.vista !== nombre));
  $("[data-vista='cargando']").removeAttribute("aria-busy");
}

// ---------- Entrar y comprar ----------

function pintarEntrar() {
  const lista = $("[data-temario-mini]");
  lista.innerHTML = "";
  estado.modulos.forEach((m) => {
    const li = document.createElement("li");
    li.innerHTML = "<span></span><span></span>";
    li.children[0].textContent = m.titulo;
    li.children[1].textContent = m.clases.length + (m.clases.length === 1 ? " clase" : " clases");
    lista.appendChild(li);
  });
  const precio = $("[data-precio]");
  if (estado.curso.precio > 0) {
    precio.textContent = new Intl.NumberFormat("es-AR", { style: "currency", currency: estado.curso.moneda, maximumFractionDigits: 0 }).format(estado.curso.precio);
    precio.hidden = false;
  }
  $("[data-form-entrar]").hidden = false;
  $("[data-form-codigo]").hidden = true;
  vista("entrar");
}

let mailEnviado = "";

$("[data-form-entrar]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget, msj = $("[data-msj]", form);
  const email = form.email.value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mensaje(msj, "Revisá el mail: parece que tiene un error.", true);
  ocupado(form, true);
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + "/curso/" } });
  ocupado(form, false);
  if (error) return mensaje(msj, errorAuth(error), true);
  mailEnviado = email;
  $("[data-mail-enviado]").textContent = email;
  form.hidden = true;
  $("[data-form-codigo]").hidden = false;
  $("#codigo").focus();
});

$("[data-form-codigo]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget, msj = $("[data-msj]", form);
  const codigo = form.codigo.value.replace(/\D/g, "");
  if (codigo.length < 6) return mensaje(msj, "El código tiene 6 números.", true);
  ocupado(form, true);
  const { error } = await sb.auth.verifyOtp({ email: mailEnviado, token: codigo, type: "email" });
  ocupado(form, false);
  if (error) return mensaje(msj, "Ese código no sirve o ya venció. Pedí uno nuevo.", true);
  // onAuthStateChange se encarga de abrir el aula
});

$("[data-otro-mail]").addEventListener("click", () => {
  $("[data-form-codigo]").hidden = true;
  $("[data-form-entrar]").hidden = false;
  $("#mail-entrar").focus();
});

$("[data-form-comprar]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  comprar(form.email.value, $("[data-msj]", form), form);
});

$("[data-comprar-actual]").addEventListener("click", (e) => {
  comprar(estado.usuario.email, $("[data-msj-sin-acceso]"), e.currentTarget);
});

$("[data-reintentar]").addEventListener("click", () => cargar());

async function comprar(email, msj, control) {
  email = String(email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mensaje(msj, "Revisá el mail: parece que tiene un error.", true);
  ocupado(control, true);
  try {
    const r = await api("/api/comprar", { method: "POST", body: JSON.stringify({ email }) });
    if (r.yaEsAlumno) {
      ocupado(control, false);
      $("#mail-entrar").value = email;
      return mensaje(msj, "Ese mail ya tiene el curso. Entrá con él en “Ya lo compré”.");
    }
    mensaje(msj, "Te llevamos a Mercado Pago…");
    location.href = r.url;
  } catch (err) {
    ocupado(control, false);
    mensaje(msj, err.message, true);
  }
}

$$("[data-salir]").forEach((b) =>
  b.addEventListener("click", async () => {
    await sb.auth.signOut();
    $("[data-pantalla] iframe")?.remove();
    actual = null;
  })
);

// ---------- Aula ----------

function clases() {
  const lista = [];
  estado.modulos.forEach((m) => m.clases.forEach((c) => lista.push(Object.assign({ modulo: m.titulo }, c))));
  return lista;
}

function pintarAula() {
  const nav = $("[data-temario]");
  nav.innerHTML = "";
  estado.modulos.forEach((m) => {
    const bloque = document.createElement("div");
    const h = document.createElement("h3");
    h.textContent = m.titulo;
    const ol = document.createElement("ol");
    m.clases.forEach((c) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.dataset.clase = c.id;
      b.disabled = !c.disponible;
      b.innerHTML = "<i class='ph'></i><span></span>";
      b.querySelector("span").textContent = c.titulo;
      if (!c.disponible) b.querySelector("span").insertAdjacentHTML("beforeend", "<small>Muy pronto</small>");
      b.addEventListener("click", () => abrir(c.id));
      li.appendChild(b);
      ol.appendChild(li);
    });
    bloque.append(h, ol);
    nav.appendChild(bloque);
  });

  const bonos = $("[data-bonos]");
  bonos.innerHTML = "";
  estado.bonos.forEach((bono) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "bono-btn";
    b.innerHTML = "<i class='ph'></i><div><strong></strong><small></small></div><i class='ph ph-download-simple'></i>";
    b.firstChild.classList.add(bono.icono);
    b.querySelector("strong").textContent = bono.titulo;
    b.querySelector("small").textContent = bono.detalle;
    b.addEventListener("click", () => descargar(bono.id, b));
    bonos.appendChild(b);
  });

  vista("aula");
  marcarTemario();
  const disponibles = clases().filter((c) => c.disponible);
  const ultima = leer("curso:ultima", null);
  const inicial = disponibles.find((c) => c.id === ultima) || disponibles.find((c) => !vistas.has(c.id)) || disponibles[0];
  if (inicial) abrir(inicial.id, false);
  else $("[data-pantalla-vacia] p").textContent = "Las clases se están cargando. Volvé a entrar en unas horas.";
}

async function abrir(id, desplazar = true) {
  const lista = clases(), i = lista.findIndex((c) => c.id === id), c = lista[i];
  if (!c || !c.disponible) return;
  actual = id;
  guardar("curso:ultima", id);
  $("[data-clase-modulo]").textContent = c.modulo;
  $("[data-clase-titulo]").textContent = c.titulo;
  const disp = lista.filter((x) => x.disponible), j = disp.findIndex((x) => x.id === id);
  $("[data-anterior]").disabled = j <= 0;
  $("[data-siguiente]").disabled = j >= disp.length - 1;
  marcarTemario();

  const pantalla = $("[data-pantalla]");
  try {
    const { url } = await api("/api/video?clase=" + encodeURIComponent(id));
    if (actual !== id) return; // se eligió otra clase mientras cargaba
    let frame = $("iframe", pantalla);
    if (!frame) {
      frame = document.createElement("iframe");
      frame.allow = "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      pantalla.appendChild(frame);
    }
    frame.title = c.titulo;
    frame.src = url;
    $("[data-pantalla-vacia]").hidden = true;
  } catch (err) {
    $("iframe", pantalla)?.remove();
    $("[data-pantalla-vacia]").hidden = false;
    $("[data-pantalla-vacia] p").textContent = err.message;
  }
  if (desplazar && matchMedia("(max-width: 999px)").matches) pantalla.scrollIntoView({ behavior: "smooth", block: "start" });
}

function marcarTemario() {
  $$("[data-temario] button").forEach((b) => {
    const id = b.dataset.clase, hecha = vistas.has(id);
    b.setAttribute("aria-current", String(id === actual));
    b.classList.toggle("hecha", hecha);
    const i = b.querySelector("i");
    i.className = "ph " + (b.disabled ? "ph-lock-simple" : hecha ? "ph-check-circle" : id === actual ? "ph-play-circle" : "ph-circle");
  });
  const total = clases().length, hechas = clases().filter((c) => vistas.has(c.id)).length;
  $("[data-progreso-txt]").textContent = hechas + " de " + total;
  $("[data-progreso-barra]").style.width = (total ? (hechas / total) * 100 : 0) + "%";
  const visto = $("[data-visto]"), es = vistas.has(actual);
  visto.setAttribute("aria-pressed", String(es));
  visto.querySelector("span").textContent = es ? "Vista" : "Marcar como vista";
  visto.disabled = !actual;
}

$("[data-visto]").addEventListener("click", () => {
  if (!actual) return;
  vistas.has(actual) ? vistas.delete(actual) : vistas.add(actual);
  guardar("curso:vistas", Array.from(vistas));
  marcarTemario();
});

function moverse(paso) {
  const disp = clases().filter((c) => c.disponible), j = disp.findIndex((c) => c.id === actual);
  const destino = disp[j + paso];
  if (!destino) return;
  if (paso > 0 && actual) {
    vistas.add(actual);
    guardar("curso:vistas", Array.from(vistas));
  }
  abrir(destino.id);
}
$("[data-anterior]").addEventListener("click", () => moverse(-1));
$("[data-siguiente]").addEventListener("click", () => moverse(1));

async function descargar(id, boton) {
  boton.disabled = true;
  try {
    const { url } = await api("/api/bono?id=" + encodeURIComponent(id));
    location.href = url;
  } catch (err) {
    alert(err.message);
  } finally {
    setTimeout(() => (boton.disabled = false), 1500);
  }
}

// ---------- Utilidades ----------

function mostrarAvisoPago() {
  const p = new URLSearchParams(location.search).get("pago");
  const textos = {
    ok: ["ph-confetti", "¡Gracias por tu compra! En un minuto te llega un mail para entrar. También podés entrar acá abajo con el mismo mail que usaste."],
    pendiente: ["ph-hourglass-medium", "Tu pago quedó pendiente. Cuando Mercado Pago lo acredite, el curso se habilita solo para tu mail."],
    error: ["ph-warning-circle", "El pago no se completó. Podés intentarlo de nuevo cuando quieras."],
  };
  if (!textos[p]) return;
  const aviso = $("[data-aviso]");
  aviso.innerHTML = "<i class='ph'></i><p></p>";
  aviso.firstChild.classList.add(textos[p][0]);
  aviso.querySelector("p").textContent = textos[p][1];
  aviso.hidden = false;
  history.replaceState(null, "", location.pathname + location.hash);
}

function mensaje(el, texto, esError) {
  el.textContent = texto;
  el.classList.toggle("error", Boolean(esError));
}

function ocupado(el, si) {
  const b = el.tagName === "FORM" ? $("button[type='submit']", el) : el;
  b.disabled = si;
}

function errorAuth(error) {
  if (error.status === 429 || /rate|seconds/i.test(error.message)) return "Ya te mandamos un mail hace muy poco. Esperá un minuto y probá de nuevo.";
  return "No pudimos mandar el mail. Revisá la dirección y probá de nuevo.";
}

function leer(clave, porDefecto) {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; }
}

function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}
