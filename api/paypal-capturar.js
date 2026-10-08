// POST /api/paypal-capturar { orderId }: cobra el pedido que la persona aprobó en PayPal
// y, si el cobro se completó por el monto correcto, le da acceso al curso.
import { CURSO } from "../lib/curso.js";
import { paypal } from "../lib/paypal.js";
import { darAcceso, manejar, normalizarEmail, responder } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { error: "Método no permitido." });
  const id = String(req.body?.orderId || "");
  if (!/^[A-Z0-9-]{5,40}$/i.test(id)) return responder(res, 400, { error: "Pedido inválido." });

  const r = await paypal("/v2/checkout/orders/" + id + "/capture");
  if (!r.ok) {
    const motivo = r.datos?.details?.[0]?.issue;
    if (motivo === "INSTRUMENT_DECLINED") return responder(res, 402, { error: "La tarjeta fue rechazada. Probá con otra.", reintentar: true });
    console.warn("Captura de PayPal fallida", id, r.status, JSON.stringify(r.datos));
    return responder(res, 400, { error: "PayPal no pudo completar el pago. No se te cobró nada." });
  }

  const captura = r.datos.purchase_units?.[0]?.payments?.captures?.[0];
  const email = normalizarEmail(captura?.custom_id);
  const ok = r.datos.status === "COMPLETED" && captura?.status === "COMPLETED"
    && captura.amount?.currency_code === "USD" && Number(captura.amount.value) >= CURSO.precioUsd;
  if (!ok || !email) {
    console.warn("Pago de PayPal inesperado", id, JSON.stringify(r.datos));
    return responder(res, 400, { error: "El pago quedó en revisión. Escribinos y lo resolvemos." });
  }

  await darAcceso(email, "paypal", { pago_id: captura.id, monto: Number(captura.amount.value) });
  responder(res, 200, { ok: true, email });
});
