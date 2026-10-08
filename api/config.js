// GET /api/config: datos públicos que necesita el navegador para iniciar sesión.
// La "anon key" de Supabase es pública por diseño; lo que protege los datos es la tabla
// alumnos con RLS activado y sin políticas (sólo el servidor puede leerla).
import { env, manejar } from "../lib/servidor.js";

export default manejar(async (req, res) => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ supabaseUrl: env("SUPABASE_URL"), supabaseAnonKey: env("SUPABASE_ANON_KEY") });
});
