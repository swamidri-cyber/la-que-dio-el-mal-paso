// POST /api/webhook-mercadopago: Mercado Pago avisa acá cada vez que cambia un pago.
// No confiamos en lo que llega en el aviso: con el ID consultamos el pago a Mercado Pago
// y sólo si está aprobado y por el monto correcto damos de alta al alumno.
import { createHmac, timingSafeEqual } from "node:crypto";
import { CURSO } from "../lib/curso.js";
import { env, manejar, normalizarEmail, responder, sitio, supabaseAdmin } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { error: "Método no permitido." });

  const tipo = req.query.type || req.body?.type;
  const id = String(req.query["data.id"] || req.body?.data?.id || "");
  if (tipo !== "payment" || !id) return responder(res, 200, { ignorado: true });

  if (!firmaValida(req, id)) return responder(res, 401, { error: "Firma inválida." });

  const r = await fetch("https://api.mercadopago.com/v1/payments/" + encodeURIComponent(id), {
    headers: { Authorization: "Bearer " + env("MP_ACCESS_TOKEN") },
  });
  if (r.status === 404) return responder(res, 200, { ignorado: true });
  if (!r.ok) throw new Error("Mercado Pago respondió " + r.status); // 500 => Mercado Pago reintenta
  const pago = await r.json();

  if (pago.status !== "approved") return responder(res, 200, { estado: pago.status });
  if (pago.currency_id !== CURSO.moneda || Number(pago.transaction_amount) < CURSO.precio) {
    console.warn("Pago aprobado con monto inesperado", id, pago.transaction_amount, pago.currency_id);
    return responder(res, 200, { ignorado: true });
  }
  const email = normalizarEmail(pago.external_reference);
  if (!email) {
    console.warn("Pago aprobado sin mail de alumno", id);
    return responder(res, 200, { ignorado: true });
  }

  const sb = supabaseAdmin();
  const { data: previo } = await sb.from("alumnos").select("email").eq("email", email).maybeSingle();
  const { error } = await sb.from("alumnos").upsert(
    { email, origen: "mercadopago", pago_id: id, monto: pago.transaction_amount },
    { onConflict: "email" }
  );
  if (error) throw error;

  // Mail de bienvenida con el enlace para entrar, sólo la primera vez.
  // Si la persona ya tenía cuenta, Supabase lo rechaza y no pasa nada: entra con su mail como siempre.
  if (!previo) {
    const inv = await sb.auth.admin.inviteUserByEmail(email, { redirectTo: sitio() + "/curso/" });
    if (inv.error) console.info("Invitación no enviada a", email, inv.error.message);
  }
  responder(res, 200, { ok: true });
});

// Mercado Pago firma cada aviso con la clave secreta del webhook (panel de la aplicación >
// Webhooks). Si la variable no está cargada, se saltea: igual el pago se verifica contra la API.
function firmaValida(req, id) {
  const secreto = process.env.MP_WEBHOOK_SECRET;
  if (!secreto) return true;
  const partes = Object.fromEntries(
    String(req.headers["x-signature"] || "").split(",").map((p) => p.trim().split("=").map((s) => s.trim()))
  );
  if (!partes.ts || !partes.v1) return false;
  const dataId = /^[a-z0-9]+$/i.test(id) ? id.toLowerCase() : id;
  const manifiesto = `id:${dataId};request-id:${req.headers["x-request-id"] || ""};ts:${partes.ts};`;
  const esperado = createHmac("sha256", secreto).update(manifiesto).digest("hex");
  const a = Buffer.from(esperado), b = Buffer.from(String(partes.v1));
  return a.length === b.length && timingSafeEqual(a, b);
}
