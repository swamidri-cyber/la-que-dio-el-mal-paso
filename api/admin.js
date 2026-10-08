// /api/admin: panel de la dueña. Sólo para los mails de ADMIN_EMAILS.
// GET: pedidos pendientes (con enlace al comprobante) y últimos alumnos.
// POST { accion: "aprobar" | "rechazar", id }  o  { accion: "dar-acceso" | "quitar-acceso", email }
import { darAcceso, manejar, normalizarEmail, responder, supabaseAdmin, usuarioActual } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  const usuario = await usuarioActual(req);
  if (!usuario) return responder(res, 401, { error: "Iniciá sesión." });
  if (!usuario.admin) return responder(res, 403, { error: "Esta cuenta no administra el curso." });
  const sb = supabaseAdmin();

  if (req.method === "GET") {
    const [pedidos, alumnos, total] = await Promise.all([
      sb.from("pedidos").select("*").eq("estado", "pendiente").order("creado", { ascending: true }),
      sb.from("alumnos").select("email, origen, creado").order("creado", { ascending: false }).limit(50),
      sb.from("alumnos").select("email", { count: "exact", head: true }),
    ]);
    if (pedidos.error) throw pedidos.error;
    if (alumnos.error) throw alumnos.error;
    const conEnlace = await Promise.all(pedidos.data.map(async (p) => {
      if (!p.comprobante) return p;
      const { data } = await sb.storage.from("comprobantes").createSignedUrl(p.comprobante, 600);
      return Object.assign({}, p, { comprobanteUrl: data?.signedUrl || null });
    }));
    return responder(res, 200, { pedidos: conEnlace, alumnos: alumnos.data, totalAlumnos: total.count || 0 });
  }

  if (req.method !== "POST") return responder(res, 405, { error: "Método no permitido." });
  const { accion } = req.body || {};

  if (accion === "aprobar" || accion === "rechazar") {
    const { data: p, error } = await sb.from("pedidos").select("*").eq("id", String(req.body.id || "")).maybeSingle();
    if (error) throw error;
    if (!p) return responder(res, 404, { error: "No encontramos ese pedido." });
    if (p.estado !== "pendiente") return responder(res, 409, { error: "Ese pedido ya fue resuelto." });
    if (accion === "aprobar") await darAcceso(p.email, p.metodo, { pago_id: p.id, monto: p.monto });
    const r = await sb.from("pedidos").update({ estado: accion === "aprobar" ? "aprobado" : "rechazado", resuelto: new Date().toISOString() }).eq("id", p.id);
    if (r.error) throw r.error;
    return responder(res, 200, { ok: true });
  }

  const email = normalizarEmail(req.body?.email);
  if (!email) return responder(res, 400, { error: "Revisá el mail." });
  if (accion === "dar-acceso") {
    const r = await darAcceso(email, req.body.origen === "hotmart" ? "hotmart" : "manual");
    return responder(res, 200, { ok: true, nuevo: r.nuevo });
  }
  if (accion === "quitar-acceso") {
    const r = await sb.from("alumnos").delete().eq("email", email);
    if (r.error) throw r.error;
    return responder(res, 200, { ok: true });
  }
  responder(res, 400, { error: "Acción desconocida." });
});
