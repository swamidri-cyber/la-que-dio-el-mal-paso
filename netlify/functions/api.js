// Netlify: una sola función atiende todo /api/* y llama al handler de api/<nombre>.js.
// Los handlers usan el estilo (req, res) de Node; acá se adaptan al Request/Response de Netlify.
import estado from "../../api/estado.js";
import configApi from "../../api/config.js";
import video from "../../api/video.js";
import bono from "../../api/bono.js";
import comprar from "../../api/comprar.js";
import webhookMercadopago from "../../api/webhook-mercadopago.js";

const RUTAS = { estado, config: configApi, video, bono, comprar, "webhook-mercadopago": webhookMercadopago };

export default async (request) => {
  const url = new URL(request.url);
  const handler = RUTAS[url.pathname.replace(/^\/api\//, "").replace(/\/$/, "")];
  if (!handler) return Response.json({ error: "No encontrado." }, { status: 404 });

  let body;
  if (request.method === "POST") {
    try { body = await request.json(); } catch (e) { body = {}; }
  }
  const req = {
    method: request.method,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(request.headers), // Headers ya trae los nombres en minúscula
    body,
  };

  let estadoHttp = 200, cuerpo = null;
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  const res = {
    setHeader(k, v) { headers.set(k, v); return res; },
    status(s) { estadoHttp = s; return res; },
    json(j) { cuerpo = JSON.stringify(j); return res; },
  };
  await handler(req, res);
  return new Response(cuerpo, { status: estadoHttp, headers });
};

export const config = { path: "/api/*" };
