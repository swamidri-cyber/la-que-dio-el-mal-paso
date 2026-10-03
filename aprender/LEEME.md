# Aprendé jugando · La que dió el mal paso

App para aprender jugando todo sobre sahumerios artesanales. Se instala en el celular, funciona sin internet
y guarda el progreso en el mismo dispositivo: no hay usuarios, ni servidor, ni ranking.

## Cómo abrirla

- **En la compu:** abrí `index.html` con doble clic. Funciona entera, pero desde el archivo no se instala
  ni trabaja sin internet (los navegadores no lo permiten fuera de una web).
- **En el celular:** subí la carpeta `aprender` completa a tu web, por ejemplo
  `laquedioelmalpaso.com/aprender/`. Abrila en Chrome y tocá **Instalar** (o menú ⋮ → *Instalar app*).
  En iPhone: Safari → Compartir → **Agregar a inicio**. Desde ahí funciona sin internet.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `data/preguntas.js` | **Todas las preguntas, fichas y módulos.** Es el único archivo que tenés que tocar. |
| `data/a-revisar.json` | Preguntas que necesitan datos que no están en la guía. No aparecen en la app hasta que las apruebes. |
| `fotos/` | Fotos del taller, achicadas para que la app pese poco. |
| `index.html`, `styles.css`, `marks.css`, `js/` | La app. No hace falta tocarlos. |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalación y modo sin internet. |
| `fonts/` | Leander y Josefin Sans, las tipografías del manual de marca. |

---

## Cómo agregar o editar preguntas

Abrí `data/preguntas.js` con el **Bloc de notas** o, mejor, con **VS Code** (gratis; te marca los errores en rojo).

El archivo tiene tres listas:

- `"modulos"`: los temas del camino, en orden.
- `"fichas"`: las tarjetas de estudio.
- `"preguntas"`: todo lo que se juega.

### Reglas de escritura (las únicas que importan)

1. Todo texto va entre **comillas dobles**: `"así"`. No uses comillas “curvas” de Word.
2. Entre un elemento y el siguiente va **una coma**. **Después del último, no va coma.**
3. `true` y `false` van **sin comillas**.
4. Cada `id` tiene que ser único. Usá el prefijo del módulo y un número: `per-o9`, `hie-v9`.
5. No borres la primera línea (`window.BANCO = {`) ni el `};` del final.

Si algo queda mal escrito, **la app te avisa** con un cartel rojo en la pantalla de inicio. El cartel dice qué
pregunta tiene el error y por qué; si el archivo entero no se puede leer, dice en qué **línea** está el problema.
Las preguntas con errores no aparecen en los juegos, pero el resto sigue funcionando.

### Los módulos

```json
{ "id": "perfume", "titulo": "Perfume y color", "descripcion": "Macerado, perfumado y colorantes.", "foto": "fotos/varilla-pintada-6.jpg", "marca": "" }
```

- `foto`: foto en arco del módulo. Si la dejás vacía (`""`), se usa `marca`.
- `marca`: un dibujo del manual: `"isotipo"`, `"flor"`, `"espiral"` o `"estrella"`.
- El orden de la lista es el orden del camino. Cada módulo se abre al **aprobar** el anterior
  (2 estrellas en 2 juegos).

### Las fichas de estudio

```json
{ "modulo": "perfume", "frente": "El macerado", "dorso": "10 cc de esencia + 90 cc de alcohol." }
```

Opcional: `"foto": "fotos/canastitas-1.jpg"` para mostrar una foto en el frente.

### Los 7 tipos de pregunta

Todas llevan `id`, `modulo` y `tipo`. Las demás partes dependen del tipo. `explicacion` aparece después
de responder, y `fuente` (opcional) dice de dónde sale el dato.

**1. Trivia** (`"tipo": "opcion"`). Las opciones se mezclan solas, así que no importa el orden.
Podés sumar `"foto"` para preguntar sobre una imagen.

```json
{ "id": "per-o9", "modulo": "perfume", "tipo": "opcion", "fuente": "Guía p. 11",
  "pregunta": "¿Cuánto tiempo, como mínimo, macerás la esencia?",
  "correcta": "10 días",
  "incorrectas": ["Una hora", "24 horas", "Dos días"],
  "explicacion": "Diez días como mínimo." }
```

**2. Verdadero o falso** (`"tipo": "vf"`). Se juega contra reloj.

```json
{ "id": "per-v9", "modulo": "perfume", "tipo": "vf",
  "afirmacion": "Las esencias pueden ir en la masa.",
  "respuesta": false,
  "explicacion": "Nunca van en la masa: se maceran en alcohol." }
```

**3. Unir con flechas** (`"tipo": "unir"`). Al menos 3 parejas. En cada partida salen 5 al azar.
El texto de la derecha no se puede repetir.

```json
{ "id": "hie-u2", "modulo": "hierbas", "tipo": "unir",
  "consigna": "Uní cada hierba con su intención.",
  "pares": [
    ["Lavanda", "Buen descanso"],
    ["Laurel", "Victoria"],
    ["Canela", "Pasión"]
  ] }
```

**4. Memotest** (`"tipo": "memo"`). Al menos 3 parejas; salen 6 al azar. Cualquier lado puede ser una foto:
escribí la ruta, por ejemplo `"fotos/barra-1.jpg"`. Usá textos cortos, porque las cartas son chicas.

```json
{ "id": "for-m2", "modulo": "formas", "tipo": "memo",
  "consigna": "Encontrá cada foto con su nombre.",
  "pares": [
    ["fotos/barra-1.jpg", "Barra"],
    ["fotos/sahumos-1.jpg", "Sahumo"],
    ["fotos/canastitas-1.jpg", "Canastitas"]
  ] }
```

**5. Armá la receta: ordenar** (`"tipo": "ordenar"`). Escribí los pasos **en el orden correcto**:
la app los mezcla sola.

```json
{ "id": "per-r2", "modulo": "perfume", "tipo": "ordenar",
  "consigna": "Ordená los pasos para perfumar.",
  "pasos": ["Macerar 10 días", "Sumergir toda la noche", "Llevar al secadero"],
  "explicacion": "Primero el macerado, después el perfumado." }
```

**6. Armá la receta: elegir** (`"tipo": "elegir"`). Puede haber varias correctas.

```json
{ "id": "rec-e2", "modulo": "receta", "tipo": "elegir",
  "consigna": "Elegí los ingredientes de la receta base.",
  "correctas": ["50 g de harina", "2 g de goma guar", "250 cc de agua"],
  "incorrectas": ["100 g de harina", "15 g de goma guar"],
  "explicacion": "50 g de harina, 2 g de goma guar y 250 cc de agua." }
```

**7. ¿Qué salió mal?** (`"tipo": "problema"`). Igual que la trivia, pero con un problema.

```json
{ "id": "pro-p13", "modulo": "problemas", "tipo": "problema",
  "problema": "Tus varillas se doblan al sumergirlas.",
  "correcta": "No son de pino",
  "incorrectas": ["La masa está en punto aceite", "Usaste vaso largo"],
  "explicacion": "El pino no se dobla." }
```

### Qué juegos aparecen en cada módulo

La app arma los juegos sola según las preguntas que haya en el módulo:

| Juego | Aparece si el módulo tiene… |
|---|---|
| Fichas de estudio | al menos 1 ficha |
| Trivia | al menos 3 preguntas `opcion` |
| Verdadero o falso | al menos 3 preguntas `vf` |
| Unir con flechas | al menos 1 pregunta `unir` |
| Memotest | al menos 1 pregunta `memo` |
| Armá la receta | al menos 1 pregunta `ordenar` o `elegir` |
| ¿Qué salió mal? | al menos 3 preguntas `problema` (si hay menos, se suman a la trivia) |

### Aprobar las preguntas "a revisar"

En `data/a-revisar.json` hay preguntas que necesitan datos que **no están en la guía**. Faltan las secciones
5 ("Secado, guardado y problemas frecuentes") y 7 ("Del taller al emprendimiento"). Cada pregunta tiene una
`nota` que explica qué revisar. Donde dice `COMPLETAR`, escribí el dato real.

Para aprobar una:

1. Corregila si hace falta.
2. Borrale las líneas `"estado"` y `"nota"`.
3. Copiala dentro de la lista `"preguntas"` de `data/preguntas.js`. Acordate de la coma entre preguntas.

### Agregar una foto nueva

1. Achicala (unos 700 px de alto alcanza) y guardala en la carpeta `fotos/`. El nombre va sin espacios ni
   tildes, por ejemplo `fotos/conito-nuevo.jpg`.
2. Usala en una pregunta (`"foto"`), en una ficha o en un memotest.

La app guarda sola para el modo sin internet todas las fotos que usan las preguntas.

### Después de editar

- **En la compu:** recargá la página.
- **En la web:** subí el archivo cambiado. Los celulares toman la versión nueva la segunda vez que abren la app.
  Si cambiaste algo de la app misma (no solo las preguntas), abrí `sw.js` y subí el número de
  `VERSION` (por ejemplo, de `aprender-v1` a `aprender-v2`).

## Progreso

- Cada respuesta se guarda en el dispositivo.
- **Repaso inteligente:** las preguntas que fallás bajan de "caja" y salen más seguido. Las que acertás
  varias veces seguidas aparecen menos.
- **Progreso:** muestra el porcentaje dominado por tema, los temas que dominás y los que te cuestan, y las
  preguntas que más te costaron.
- **Reiniciar progreso:** está al final de la pantalla Progreso. Borra puntos, estrellas, medallas e
  historial, pero no toca las preguntas.
- Si borrás los datos del navegador, también se borra el progreso.

## Fuentes del contenido

- *Guía de taller de sahumerios artesanales* (Parte 1): seguridad, materiales, receta base, nitrato, técnicas,
  esencias, colorantes, y hierbas y resinas.
- laquedioelmalpaso.com: cómo encender y usar los sahumerios, y el catálogo de productos (tipos y formas).
- *Planilla de costos*: el módulo "Del taller al precio".

La tipografía Leander se tomó de la que tenés instalada en la compu. Si la app va a ser pública, confirmá que
tu licencia de Leander permita usarla en la web. Si no, borrá `fonts/Leander.ttf`: la app usa
IM Fell English como reemplazo.
