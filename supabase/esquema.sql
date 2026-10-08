-- Ejecutar una sola vez en Supabase: SQL Editor > New query > pegar todo > Run.

-- Quién tiene acceso al curso. Una fila por mail.
create table if not exists public.alumnos (
  email   text primary key check (email = lower(email)),
  origen  text not null default 'manual',   -- mercadopago | hotmart | manual
  pago_id text,
  monto   numeric,
  creado  timestamptz not null default now()
);

-- RLS activado y SIN políticas: desde el navegador nadie puede leer ni escribir esta tabla.
-- Sólo las funciones de /api (con la service role key) la usan.
alter table public.alumnos enable row level security;

-- Bucket privado para los bonos descargables.
insert into storage.buckets (id, name, public)
values ('bonos', 'bonos', false)
on conflict (id) do nothing;

-- Pagos por transferencia o cripto que esperan revisión (se aprueban en /curso/admin/).
create table if not exists public.pedidos (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  metodo      text not null,                       -- transferencia | cripto
  estado      text not null default 'pendiente',   -- pendiente | aprobado | rechazado
  monto       numeric,
  moneda      text,
  referencia  text,                                -- hash de la transacción, nombre del titular, etc.
  comprobante text,                                -- archivo en el bucket "comprobantes"
  creado      timestamptz not null default now(),
  resuelto    timestamptz
);
create index if not exists pedidos_estado on public.pedidos (estado, creado);
alter table public.pedidos enable row level security;

-- Bucket privado para los comprobantes de pago.
insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

-- Para dar acceso a mano (también se puede desde /curso/admin/) (por ejemplo, a quienes compraron en Hotmart):
-- insert into public.alumnos (email, origen) values
--   ('alguien@gmail.com', 'hotmart'),
--   ('otra.persona@hotmail.com', 'hotmart')
-- on conflict (email) do nothing;
