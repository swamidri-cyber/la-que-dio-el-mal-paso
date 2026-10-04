# Costos y precios

App para calcular costos, precios, ganancias y punto de equilibrio de productos artesanales.
Hecha con HTML, CSS y JavaScript, sin dependencias. Usa la misma paleta, tipografías e isotipo que
laquedioelmalpaso.com (tomados del proyecto `cuentas`).

## Cómo usarla

- **En la compu:** abrí `index.html` con doble clic. Funciona, pero no se instala ni trabaja sin internet
  desde el archivo (los navegadores no permiten service workers en `file://`).
- **En el celular (recomendado):** subí la carpeta completa a un hosting estático con https
  (Netlify Drop, GitHub Pages, Cloudflare Pages o una subcarpeta de tu web, por ejemplo
  `laquedioelmalpaso.com/costos/`). Abrila en Chrome y elegí **Instalar app**.
  En iPhone: Safari → Compartir → **Agregar a inicio**.

## Datos

Todo queda en el navegador del dispositivo (IndexedDB). Desde **Mi taller → Tus datos**:
- Guardar / restaurar copia (`.json`).
- Exportar a Excel (CSV con `;` y coma decimal): productos, insumos, historial de precios y costos fijos.

## Archivos

- `index.html`: estructura y formularios.
- `base.css`, `marks.css`: estilos de marca compartidos con la app de cuentas.
- `app.css`: estilos de esta app (incluye la ficha para imprimir).
- `js/format.js`: formato argentino de montos y números.
- `js/db.js`: guardado en IndexedDB.
- `js/calc.js`: cálculos (costos, precios sugeridos, margen, markup, punto de equilibrio).
- `js/charts.js`: gráficos en SVG.
- `js/app.js`: pantallas y lógica.
- `sw.js`: funcionamiento sin internet. **Si cambiás algún archivo, subí `VERSION`** para que los celulares
  reciban la actualización.
