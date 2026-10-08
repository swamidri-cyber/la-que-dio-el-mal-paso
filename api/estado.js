// GET /api/estado: temario público y, si hay sesión, si esa persona tiene el curso.
import { CURSO, BONOS, temarioPublico } from "../lib/curso.js";
import { manejar, responder, usuarioActual } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  const usuario = await usuarioActual(req);
  responder(res, 200, {
    curso: { titulo: CURSO.titulo, precio: CURSO.precio, moneda: CURSO.moneda },
    modulos: temarioPublico(),
    bonos: BONOS.map(({ id, titulo, detalle, icono }) => ({ id, titulo, detalle, icono })),
    usuario,
  });
});
