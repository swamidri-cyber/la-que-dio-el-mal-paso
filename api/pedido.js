// POST /api/pedido: pago por transferencia o cripto. Guarda el pedido con su comprobante
// para que la dueña lo revise en /curso/admin/ y apruebe el acceso.
// Cuerpo: { email, metodo: "transferencia" | "cripto", referencia?, archivo?: { nombre, tipo, base64 } }
import { randomUUID } from "node:crypto";
import { formasDePago } from "../lib/curso.js";
import { avisar, esAlumno, manejar, normalizarEmail, responder, sitio, supabaseAdmin } from "../lib/servidor.js";

const MAX_BYTES = 4 * 1024 * 1024;
const TIPOS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "application/pdf": "pdf" };

export default manejar(async (req, res) => {
  if (req.method !== "POST") return responder(res, 405, { error: "Método no permitido." });
  const b = req.body || {};

  const email = normalizarEmail(b.email);
  if (!email) return responder(res, 400, { error: "Revisá el mail: parece que tiene un error." });
  const forma = formasDePago()[b.metodo];
  if (!forma || !["transferencia", "cripto"].includes(b.metodo)) return responder(res, 400, { error: "Esa forma de pago no está disponible." });
  if (await esAlumno(email)) return responder(res, 200, { yaEsAlumno: true });

  const referencia = String(b.referencia || "").trim().slice(0, 200);
  let archivo = null;
  if (b.archivo && b.archivo.base64) {
    const ext = TIPOS[b.archivo.tipo];
    if (!ext) return responder(res, 400, { error: "El comprobante tiene que ser una foto o un PDF." });
    archivo = Buffer.from(String(b.archivo.base64), "base64");
    if (archivo.length > MAX_BYTES) return responder(res, 400, { error: "El comprobante pesa demasiado (máximo 4 MB). Probá con una captura de pantalla." });
    archivo.ext = ext;
  }
  if (b.metodo === "transferencia" && !archivo) return responder(res, 400, { error: "Subí el comprobante de la transferencia." });
  if (b.metodo === "cripto" && !archivo && referencia.length < 10) return responder(res, 400, { error: "Pegá el ID de la transacción (hash) o subí una captura." });

  const sb = supabaseAdmin();
  const { count } = await sb.from("pedidos").select("id", { count: "exact", head: true }).eq("email", email).eq("estado", "pendiente");
  if (count >= 3) return responder(res, 429, { error: "Ya tenemos comprobantes tuyos para revisar. Te avisamos por mail apenas los confirmemos." });

  const id = randomUUID();
  let ruta = null;
  if (archivo) {
    ruta = `${id}.${archivo.ext}`;
    const { error } = await sb.storage.from("comprobantes").upload(ruta, archivo, { contentType: b.archivo.tipo, upsert: false });
    if (error) throw error;
  }
  const { error } = await sb.from("pedidos").insert({ id, email, metodo: b.metodo, monto: forma.monto, moneda: forma.moneda, referencia: referencia || null, comprobante: ruta });
  if (error) throw error;

  await avisar(
    "Nuevo pago para revisar: " + b.metodo,
    `${email} avisó un pago por ${b.metodo} de ${forma.monto} ${forma.moneda}.\n` +
      (referencia ? `Referencia: ${referencia}\n` : "") +
      `\nRevisalo y aprobalo acá: ${sitio()}/curso/admin/`
  );
  responder(res, 200, { ok: true });
});
