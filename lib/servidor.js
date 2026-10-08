// Utilidades compartidas por las funciones de /api.
import { createClient } from "@supabase/supabase-js";

let admin = null;

// Cliente con la clave de servicio: sólo existe en el servidor, nunca llega al navegador.
export function supabaseAdmin() {
  if (!admin) {
    admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

export function env(nombre) {
  const v = process.env[nombre];
  if (!v) throw new Error("Falta la variable de entorno " + nombre);
  return v;
}

export function sitio() {
  return (process.env.SITE_URL || "https://laquedioelmalpaso.com").replace(/\/$/, "");
}

export function normalizarEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 ? e : null;
}

export async function esAlumno(email) {
  const { data, error } = await supabaseAdmin().from("alumnos").select("email").eq("email", email).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// Da de alta al alumno (si ya estaba, no pasa nada) y, la primera vez, le manda el mail
// con el enlace para entrar. Lo usan Mercado Pago, PayPal y el panel de administración.
export async function darAcceso(email, origen, datos = {}) {
  const sb = supabaseAdmin();
  const previo = await esAlumno(email);
  if (previo) return { nuevo: false };
  const { error } = await sb.from("alumnos").upsert(Object.assign({ email, origen }, datos), { onConflict: "email" });
  if (error) throw error;
  // Si la persona ya tenía cuenta, Supabase rechaza la invitación y no pasa nada: entra con su mail como siempre.
  const inv = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: sitio() + "/curso/" });
  if (inv.error) console.info("Invitación no enviada a", email, inv.error.message);
  return { nuevo: true };
}

// Mails con permiso para el panel /curso/admin/ (variable ADMIN_EMAILS, separados por coma).
export function esAdmin(email) {
  return String(process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean).includes(email);
}

// Lee la sesión que manda el navegador (Authorization: Bearer <token>) y devuelve
// { email, alumno, admin }, o null si no hay sesión válida.
export async function usuarioActual(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data?.user?.email) return null;
  const email = data.user.email.toLowerCase();
  return { email, alumno: await esAlumno(email), admin: esAdmin(email) };
}

// Aviso por mail a la dueña cuando entra un pago para revisar. Opcional: usa Resend
// si están RESEND_API_KEY y AVISOS_EMAIL; si no, el pedido igual queda en el panel.
export async function avisar(asunto, texto) {
  const clave = process.env.RESEND_API_KEY, para = process.env.AVISOS_EMAIL;
  if (!clave || !para) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + clave, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.AVISOS_REMITENTE || "Curso <curso@laquedioelmalpaso.com>", to: para.split(","), subject: asunto, text: texto }),
    });
    if (!r.ok) console.warn("Aviso no enviado", r.status, await r.text());
  } catch (e) {
    console.warn("Aviso no enviado", e.message);
  }
}

export function responder(res, estado, cuerpo) {
  res.setHeader("Cache-Control", "no-store");
  res.status(estado).json(cuerpo);
}

// Envuelve un handler para que un error inesperado no deje la respuesta colgada.
export function manejar(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      console.error(e);
      responder(res, 500, { error: "Algo falló de nuestro lado. Probá de nuevo en un rato." });
    }
  };
}
