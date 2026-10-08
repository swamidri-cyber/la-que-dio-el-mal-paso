// Datos del curso. Para cambiar el temario o cargar los videos, se edita sólo este archivo.
// "video" es el ID del video en Bunny Stream (Biblioteca > el video > "Video ID").
// Mientras un video esté vacío, la clase aparece como "Muy pronto".

export const CURSO = {
  id: "curso-sahumerios",
  titulo: "Curso integral de sahumerios artesanales",
  // Precio en pesos (Mercado Pago y transferencia). Se cambia con la variable CURSO_PRECIO en Netlify.
  precio: Number(process.env.CURSO_PRECIO || 0),
  moneda: "ARS",
  // Precio en dólares (PayPal y cripto). Variable CURSO_PRECIO_USD.
  precioUsd: Number(process.env.CURSO_PRECIO_USD || 0),
};

// Formas de pago que se muestran. Cada una aparece sólo si sus variables están cargadas.
export function formasDePago() {
  const e = process.env;
  const f = {};
  if (CURSO.precio > 0 && e.MP_ACCESS_TOKEN) f.mercadopago = { monto: CURSO.precio, moneda: "ARS" };
  if (CURSO.precio > 0 && (e.TRANSFERENCIA_ALIAS || e.TRANSFERENCIA_CBU)) {
    f.transferencia = {
      monto: CURSO.precio, moneda: "ARS",
      alias: e.TRANSFERENCIA_ALIAS || "", cbu: e.TRANSFERENCIA_CBU || "",
      titular: e.TRANSFERENCIA_TITULAR || "", banco: e.TRANSFERENCIA_BANCO || "",
    };
  }
  if (CURSO.precioUsd > 0 && e.PAYPAL_CLIENT_ID && e.PAYPAL_SECRET) f.paypal = { monto: CURSO.precioUsd, moneda: "USD", clientId: e.PAYPAL_CLIENT_ID };
  if (CURSO.precioUsd > 0 && e.CRIPTO_DIRECCION) f.cripto = { monto: CURSO.precioUsd, moneda: "USDT", red: e.CRIPTO_RED || "TRC20 (Tron)", direccion: e.CRIPTO_DIRECCION };
  return f;
}

export const MODULOS = [
  {
    titulo: "Técnica por inmersión",
    clases: [
      { id: "presentacion-inmersion", titulo: "Presentación inmersión", video: "" },
      { id: "preparacion-masa", titulo: "Preparación de la masa", video: "" },
      { id: "sahumerios-inmersion", titulo: "Sahumerios por inmersión", video: "" },
    ],
  },
  {
    titulo: "Técnica por extrusión",
    clases: [
      { id: "extrusion", titulo: "Extrusión", video: "" },
      { id: "extrusion-formas", titulo: "Extrusión formas", video: "" },
      { id: "extrusion-masa-natural", titulo: "Extrusión masa natural", video: "" },
      { id: "extrusion-natural", titulo: "Extrusión natural", video: "" },
    ],
  },
  {
    titulo: "Técnica de amasado",
    clases: [
      { id: "amasado", titulo: "Amasado", video: "" },
      { id: "amasado-2", titulo: "Amasado 2", video: "" },
    ],
  },
  {
    titulo: "Perfume y color",
    clases: [{ id: "perfume-color", titulo: "Perfume y color", video: "" }],
  },
  {
    titulo: "Despedida",
    clases: [{ id: "despedida", titulo: "Despedida y entrega de bonos", video: "" }],
  },
];

// Archivos guardados en Supabase Storage, bucket privado "bonos".
export const BONOS = [
  { id: "planilla", titulo: "Planilla de costos", detalle: "Para calcular el precio de cada producto.", archivo: "planilla-de-costos.xlsx", icono: "ph-table" },
  { id: "guia", titulo: "Guía del taller", detalle: "Para organizar tu espacio y tu producción.", archivo: "guia-del-taller.pdf", icono: "ph-book-open-text" },
];

export function buscarClase(id) {
  for (const m of MODULOS) for (const c of m.clases) if (c.id === id) return c;
  return null;
}

// Temario sin los IDs de video, para mostrar a cualquiera.
export function temarioPublico() {
  return MODULOS.map((m) => ({
    titulo: m.titulo,
    clases: m.clases.map((c) => ({ id: c.id, titulo: c.titulo, disponible: Boolean(c.video) })),
  }));
}
