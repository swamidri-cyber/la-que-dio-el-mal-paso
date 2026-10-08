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
      { id: "presentacion-inmersion", titulo: "Presentación inmersión", video: "f2c652b2-a6fb-449a-959f-1329c9b7ae1d" },
      { id: "preparacion-masa", titulo: "Preparación de la masa", video: "ae7adad2-1089-402a-8805-1d9cae41ffb1" },
      { id: "sahumerios-inmersion", titulo: "Sahumerios por inmersión", video: "f826ead6-3a99-41b7-87c0-a870ef9864f4" },
    ],
  },
  {
    titulo: "Técnica por extrusión",
    clases: [
      { id: "extrusion", titulo: "Extrusión", video: "c6288ea7-09f8-4607-b54b-aee2067d2e26" },
      { id: "extrusion-formas", titulo: "Extrusión formas", video: "10208b09-a069-4d37-a69f-19b6bbce990f" },
      { id: "extrusion-masa-natural", titulo: "Extrusión masa natural", video: "e15edd30-f34a-4937-b49d-41a958678d73" },
      { id: "extrusion-natural", titulo: "Extrusión natural", video: "5e8f9337-cd6e-415f-b46e-2b48f4c8abcb" },
    ],
  },
  {
    titulo: "Técnica de amasado",
    clases: [
      { id: "amasado", titulo: "Amasado", video: "45bce0ee-3eab-4767-b23a-7e2f39f84f35" },
      { id: "amasado-2", titulo: "Amasado 2", video: "71c116a4-4506-4864-8d4f-daacc4a6d587" },
    ],
  },
  {
    titulo: "Perfume y color",
    clases: [{ id: "perfume-color", titulo: "Perfume y color", video: "cb2c396a-3f45-47f6-9c4e-f1f68e66081c" }],
  },
  {
    titulo: "Despedida",
    clases: [{ id: "despedida", titulo: "Despedida y entrega de bonos", video: "c0957632-1164-41fa-ba1f-9f050f489cbf" }],
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
