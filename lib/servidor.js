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

// Lee la sesión que manda el navegador (Authorization: Bearer <token>) y devuelve
// { email, alumno }, o null si no hay sesión válida.
export async function usuarioActual(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!token) return null;
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data?.user?.email) return null;
  const email = data.user.email.toLowerCase();
  return { email, alumno: await esAlumno(email) };
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
