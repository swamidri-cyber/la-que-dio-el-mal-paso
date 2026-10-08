// GET /api/bono?id=<id>: enlace de descarga de un bono, válido por 5 minutos.
import { BONOS } from "../lib/curso.js";
import { manejar, responder, supabaseAdmin, usuarioActual } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  const usuario = await usuarioActual(req);
  if (!usuario) return responder(res, 401, { error: "Iniciá sesión para descargar los bonos." });
  if (!usuario.alumno) return responder(res, 403, { error: "Tu cuenta no tiene el curso." });

  const bono = BONOS.find((b) => b.id === req.query.id);
  if (!bono) return responder(res, 404, { error: "No encontramos ese archivo." });

  const { data, error } = await supabaseAdmin().storage.from("bonos").createSignedUrl(bono.archivo, 300, { download: true });
  if (error) throw error;
  responder(res, 200, { url: data.signedUrl });
});
