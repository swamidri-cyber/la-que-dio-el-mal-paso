// GET /api/video?clase=<id>: devuelve un enlace al reproductor de Bunny que vence en unas horas.
// Sin sesión de alumno no hay enlace, y un enlace copiado deja de andar al vencer.
import { createHash } from "node:crypto";
import { buscarClase } from "../lib/curso.js";
import { env, manejar, responder, usuarioActual } from "../lib/servidor.js";

const DURACION = 4 * 60 * 60; // segundos

export default manejar(async (req, res) => {
  const usuario = await usuarioActual(req);
  if (!usuario) return responder(res, 401, { error: "Iniciá sesión para ver las clases." });
  if (!usuario.alumno) return responder(res, 403, { error: "Tu cuenta no tiene el curso." });

  const clase = buscarClase(String(req.query.clase || ""));
  if (!clase) return responder(res, 404, { error: "No encontramos esa clase." });
  if (!clase.video) return responder(res, 404, { error: "Esta clase todavía no está disponible." });

  const biblioteca = env("BUNNY_LIBRARY_ID");
  const expira = Math.floor(Date.now() / 1000) + DURACION;
  const firma = createHash("sha256").update(env("BUNNY_TOKEN_KEY") + clase.video + expira).digest("hex");
  const url = `https://iframe.mediadelivery.net/embed/${biblioteca}/${clase.video}?token=${firma}&expires=${expira}&preload=true&responsive=true`;
  responder(res, 200, { url });
});
