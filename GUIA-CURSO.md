# Curso propio: cómo ponerlo en marcha

El curso ahora vive en `laquedioelmalpaso.com/curso/`. Para que funcione hacen falta
cuatro cuentas. Todas son gratis para empezar, salvo Bunny (unos 5 USD por mes con 11 videos).

| Servicio | Para qué | Costo |
|---|---|---|
| **Netlify** | Aloja la web (reemplaza a GitHub Pages) y corre la parte privada | Gratis |
| **Supabase** | Guarda quién es alumno y manda el mail para entrar | Gratis |
| **Mercado Pago** | Cobra el curso | Comisión por venta |
| **Bunny Stream** | Guarda los videos y sólo los muestra con enlaces que vencen | ~5 USD/mes |

El código sigue en GitHub como siempre. Netlify toma los cambios de ahí solo.

Hacé los pasos en este orden. Cada clave que copies va a parar al paso 5.

---

## 1. Supabase (alumnos e ingreso por mail)

1. Entrá a <https://supabase.com>, creá una cuenta y un proyecto nuevo.
   Región: **South America (São Paulo)**. Guardá la contraseña de la base en un lugar seguro.
2. **SQL Editor > New query**: pegá todo el contenido de `supabase/esquema.sql` y tocá **Run**.
   Esto crea la tabla de alumnos y la carpeta privada de bonos.
3. **Authentication > URL Configuration**:
   - *Site URL*: `https://laquedioelmalpaso.com/curso/`
   - *Redirect URLs*: agregá `https://laquedioelmalpaso.com/curso/` y `https://*.netlify.app/curso/`
4. **Mails de verdad (hacelo antes de tocar las plantillas)**: Supabase no deja editar
   el texto de los mails hasta que conectes tu propio servicio de correo, y el que trae
   de fábrica manda muy pocos mails por hora.
   - Creá una cuenta gratis en <https://resend.com> y verificá tu dominio `laquedioelmalpaso.com`
     (Resend te dice qué registros DNS agregar donde compraste el dominio).
   - En Resend: **API Keys > Create API Key** y copiala.
   - En Supabase: **Authentication > Emails**, tocá **Set up SMTP** y cargá:
     host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña: la API Key de Resend.
     Remitente: `curso@laquedioelmalpaso.com`, nombre: `La que dió el mal paso`.
5. **Authentication > Emails > Templates > Magic Link** (recién ahora se puede editar).
   Reemplazá el texto por algo así; lo importante es `{{ .Token }}`, que es el código de 6 números:
   ```html
   <h2>Tu acceso al curso</h2>
   <p><a href="{{ .ConfirmationURL }}">Tocá acá para entrar al aula</a></p>
   <p>O escribí este código en la página: <b>{{ .Token }}</b></p>
   ```
   Hacé lo mismo en la plantilla **Invite user**, que es el mail que llega después de comprar.
   Si Zen te muestra "no puede abrir esta página" en la vista previa, ignoralo: es sólo la vista previa.
6. **Storage > bonos**: subí los dos bonos **con estos nombres exactos**:
   - `planilla-de-costos.xlsx`
   - `guia-del-taller.pdf`

   Si tienen otra extensión, avisame y cambio el nombre en `lib/curso.js`.
7. **Project Settings > API**: copiá *Project URL*, la clave *anon public* y la
   *service_role*. La *service_role* es secreta: no la mandes por chat ni la subas a GitHub.

## 2. Bunny Stream (videos)

1. Primero bajá los 11 videos de Hotmart. Si no tenés los originales, en Hotmart:
   *Herramientas > Hotmart Club > Contenido*, o pedíselos a soporte de Hotmart.
2. Creá una cuenta en <https://bunny.net> y entrá a **Stream > Add Video Library**
   (nombre: "Curso sahumerios", región: São Paulo).
3. Subí los 11 videos.
4. En la biblioteca, **Security**:
   - Activá **Enable token authentication** (embed view token authentication).
   - En **Allowed domains** poné `laquedioelmalpaso.com`.
   - Activá **Block direct URL file access**.
5. Copiá el **Library ID** (en *API*) y la **Token Authentication Key** (en *Security*).
6. Por cada video copiá su **Video ID** (algo como `a1b2c3d4-...`) y pegalo en
   `lib/curso.js`, en el `video: ""` de la clase que corresponde. También me podés
   pasar la lista de IDs y lo hago yo. Los IDs no son secretos.

## 3. Mercado Pago (cobros)

1. Entrá a <https://www.mercadopago.com.ar/developers/panel/app> con tu cuenta de vendedora.
2. **Crear aplicación**: tipo *Pagos online*, producto **Checkout Pro**.
3. **Credenciales de producción**: copiá el **Access Token** (empieza con `APP_USR-`). Es secreto.
4. **Webhooks > Configurar notificaciones**, en modo productivo:
   - URL: `https://laquedioelmalpaso.com/api/webhook-mercadopago`
   - Evento: **Pagos**
   - Guardá y copiá la **clave secreta** que aparece.

## 3b. Otras formas de pago (opcionales)

Cada una aparece en la página sólo si cargás sus variables en el paso 5.

**Transferencia bancaria.** No hace falta ninguna cuenta nueva: sólo tu alias o CBU.
Quien compra ve los datos, transfiere y sube el comprobante. Vos lo aprobás en el panel
`laquedioelmalpaso.com/curso/admin/` y le llega el mail para entrar.

**PayPal (pagos desde el exterior, en dólares).**
1. Creá una cuenta **Business** en <https://www.paypal.com/ar/business>.
2. Entrá a <https://developer.paypal.com> > **Apps & Credentials**, elegí **Live** y
   tocá **Create App**. Copiá el **Client ID** y el **Secret** (es secreto).
3. Ojo: desde Argentina, la plata de PayPal no se pasa directo a un banco argentino.
   Se retira con servicios como Takenos, Payoneer o una cuenta en el exterior.

**Cripto (USDT).** Necesitás una billetera que reciba USDT (Binance, Lemon, Belo, etc.).
Copiá tu dirección de depósito de USDT **y fijate en qué red está** (TRC20 / Tron es la
más barata). Quien paga pega el código de la transacción; vos revisás en tu billetera
que haya llegado y lo aprobás en el panel.

**Aviso por mail cuando llega un comprobante** (recomendado si usás transferencia o cripto):
con la misma cuenta de Resend del paso 1, creá otra API Key y cargala en `RESEND_API_KEY`.

## 4. Netlify (alojamiento)

1. Entrá a <https://netlify.com> con tu cuenta de GitHub.
2. **Add new site > Import an existing project > GitHub** y elegí `la-que-dio-el-mal-paso`.
3. Rama a publicar: `curso-propio` mientras probás. Cuando esté todo listo se pasa a `main`.
4. Dejá vacíos *Build command* y *Publish directory*, porque ya vienen en `netlify.toml`. Tocá **Deploy**.

## 5. Variables secretas

En Netlify: **Site configuration > Environment variables > Add a variable**. Cargá estas
variables (están también en `.env.example`):

| Nombre | Valor |
|---|---|
| `SITE_URL` | Mientras probás, la dirección `https://algo.netlify.app`. Después, `https://laquedioelmalpaso.com` |
| `CURSO_PRECIO` | Precio en pesos, sólo el número. Ej: `25000` |
| `CURSO_PRECIO_USD` | Precio en dólares para PayPal y cripto. Ej: `30` |
| `ADMIN_EMAILS` | `laquedioelmalpaso2020@gmail.com` (quién puede usar el panel) |
| `SUPABASE_URL` | Project URL de Supabase |
| `SUPABASE_ANON_KEY` | Clave anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (secreta) |
| `MP_ACCESS_TOKEN` | Access Token de producción de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Clave secreta del webhook |
| `BUNNY_LIBRARY_ID` | Library ID de Bunny |
| `BUNNY_TOKEN_KEY` | Token Authentication Key de Bunny |
| `TRANSFERENCIA_ALIAS` / `TRANSFERENCIA_CBU` | Tu alias y CBU/CVU |
| `TRANSFERENCIA_TITULAR` / `TRANSFERENCIA_BANCO` | Nombre del titular y banco o billetera |
| `PAYPAL_CLIENT_ID` / `PAYPAL_SECRET` | Credenciales Live de PayPal (el Secret es secreto) |
| `CRIPTO_DIRECCION` / `CRIPTO_RED` | Dirección USDT y su red, ej. `TRC20 (Tron)` |
| `RESEND_API_KEY` / `AVISOS_EMAIL` | Para que te llegue un mail con cada comprobante |

Las formas de pago cuyas variables dejes vacías simplemente no aparecen.

Después: **Deploys > Trigger deploy** para que las tome.

## 6. Probar antes de abrir

1. Entrá a `https://algo.netlify.app/curso/`.
2. **Ingreso**: en Supabase, *SQL Editor*, date acceso a vos misma:
   ```sql
   insert into public.alumnos (email, origen) values ('tu-mail@gmail.com', 'manual');
   ```
   Entrá con ese mail y fijate que veas los videos y puedas bajar los bonos.
3. **Compra real**: poné `CURSO_PRECIO` en `100` y pedile a alguien de confianza que compre
   con su cuenta. Mercado Pago no te deja pagarte a vos misma. Después le devolvés la plata
   desde Mercado Pago y volvés a poner el precio real.
4. Si un pago no da acceso: Netlify > *Logs > Functions* muestra qué pasó.

## 7. Pasar el dominio a Netlify

1. Netlify: **Domain management > Add a domain** > `laquedioelmalpaso.com`.
2. Netlify te dice qué registros DNS cambiar en el lugar donde compraste el dominio.
   Cambialos ahí; puede tardar unas horas en verse.
3. Cambiá `SITE_URL` a `https://laquedioelmalpaso.com` y volvé a publicar.
4. Pasá la rama `curso-propio` a `main`.
5. En GitHub: **Settings > Pages**: desactivá GitHub Pages.

## 8. Alumnos que ya compraron en Hotmart

1. Hotmart: **Ventas > Historial de ventas**, filtrá el curso y exportá a Excel.
2. Entrá a `laquedioelmalpaso.com/curso/admin/`, pegá todos los mails en **Dar acceso a mano**
   (uno por línea), elegí **Compró en Hotmart** y tocá **Dar acceso**. A cada uno le llega
   el mail para entrar. También se puede por SQL en Supabase:
   ```sql
   insert into public.alumnos (email, origen) values
     ('alguien@gmail.com', 'hotmart'),
     ('otra@hotmail.com', 'hotmart')
   on conflict (email) do nothing;
   ```
   Mails **en minúscula**. Si me pasás el Excel, te armo este texto.
3. Avisales que el curso se mudó a `laquedioelmalpaso.com/curso/` y que entran con su mail.
4. Recién ahí desactivá la venta en Hotmart.

---

## Cosas del día a día

Casi todo se hace desde el panel **`laquedioelmalpaso.com/curso/admin/`**: aprobar
transferencias y cripto, dar o quitar acceso y ver los últimos alumnos. Si entrás al aula
con tu mail de administradora, arriba aparece el enlace **Panel**.

- **Dar acceso a mano** (regalo, pago por transferencia): el `insert` del paso 8 con `'manual'`.
- **Sacar el acceso**: `delete from public.alumnos where email = 'mail@x.com';`
- **Ver quién compró**: Supabase > *Table Editor > alumnos*.
- **Cambiar el precio**: la variable `CURSO_PRECIO` en Netlify y *Trigger deploy*.
- **Agregar o cambiar clases**: `lib/curso.js`.
