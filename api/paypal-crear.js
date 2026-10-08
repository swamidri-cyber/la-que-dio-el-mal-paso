// POST /api/paypal-crear { email }: arma el pedido en PayPal y devuelve su ID para los botones.
import { CURSO, formasDePago } from "../lib/curso.js";
import { paypal } from "../lib/paypal.js";
import { esAlumno, manejar, normalizarEmail, responder } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { error: "Método no permitido." });
  const email = normalizarEmail(req.body?.email);
  if (!email) return responder(res, 400, { error: "Revisá el mail: parece que tiene un error." });
  if (!formasDePago().paypal) return responder(res, 503, { error: "El pago con PayPal no está disponible." });
  if (await esAlumno(email)) return responder(res, 200, { yaEsAlumno: true });

  const r = await paypal("/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: CURSO.id,
      custom_id: email, // vuelve en la captura: es el mail que recibe el acceso
      description: CURSO.titulo,
      amount: { currency_code: "USD", value: CURSO.precioUsd.toFixed(2) },
    }],
    payment_source: { paypal: { experience_context: { brand_name: "La que dió el mal paso", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW" } } },
  });
  if (!r.ok) throw new Error("PayPal respondió " + r.status + ": " + JSON.stringify(r.datos));
  responder(res, 200, { id: r.datos.id });
});
