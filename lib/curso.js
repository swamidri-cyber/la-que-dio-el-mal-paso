// Datos del curso. Para cambiar el temario o cargar los videos, se edita sólo este archivo.
// "video" es el ID del video en Bunny Stream (Biblioteca > el video > "Video ID").
// Mientras un video esté vacío, la clase aparece como "Muy pronto".

export const CURSO = {
  id: "curso-sahumerios",
  titulo: "Curso integral de sahumerios artesanales",
  // Precio en pesos. Se puede cambiar sin tocar código con la variable CURSO_PRECIO en Vercel.
  precio: Number(process.env.CURSO_PRECIO || 0),
  moneda: "ARS",
};

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
