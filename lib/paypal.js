// Conexión con la API de PayPal (pedidos en dólares).
import { env } from "./servidor.js";

export function paypalBase() {
  return process.env.PAYPAL_ENV === "sandbox" ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
}

export async function paypal(ruta, cuerpo) {
  const credenciales = Buffer.from(env("PAYPAL_CLIENT_ID") + ":" + env("PAYPAL_SECRET")).toString("base64");
  const t = await fetch(paypalBase() + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + credenciales, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!t.ok) throw new Error("PayPal no aceptó las credenciales: " + t.status);
  const { access_token } = await t.json();
  const r = await fetch(paypalBase() + ruta, {
    method: "POST",
    headers: { Authorization: "Bearer " + access_token, "Content-Type": "application/json" },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, datos };
}
