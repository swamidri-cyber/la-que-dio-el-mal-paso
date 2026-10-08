// POST /api/comprar { email }: crea el pago en Mercado Pago y devuelve el link para pagar.
// El mail que la persona escribe acá es con el que después entra al curso,
// aunque pague con una cuenta de Mercado Pago que tenga otro mail.
import { CURSO } from "../lib/curso.js";
import { env, esAlumno, manejar, normalizarEmail, responder, sitio } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { error: "Método no permitido." });

  const email = normalizarEmail(req.body?.email);
  if (!email) return responder(res, 400, { error: "Revisá el mail: parece que tiene un error." });
  if (!(CURSO.precio > 0)) return responder(res, 503, { error: "La venta del curso todavía no está abierta." });
  if (await esAlumno(email)) return responder(res, 200, { yaEsAlumno: true });

  const base = sitio();
  const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: "Bearer " + env("MP_ACCESS_TOKEN"), "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: CURSO.id, title: CURSO.titulo, quantity: 1, unit_price: CURSO.precio, currency_id: CURSO.moneda }],
      payer: { email },
      external_reference: email,
      metadata: { curso: CURSO.id, email },
      back_urls: {
        success: base + "/curso/?pago=ok",
        pending: base + "/curso/?pago=pendiente",
        failure: base + "/curso/?pago=error",
      },
      auto_return: "approved",
      notification_url: base + "/api/webhook-mercadopago",
      statement_descriptor: "LAQUEDIOELMALPASO",
    }),
  });
  if (!r.ok) throw new Error("Mercado Pago respondió " + r.status + ": " + (await r.text()));
  const pref = await r.json();
  responder(res, 200, { url: pref.init_point });
});
