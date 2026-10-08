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

-- Para dar acceso a mano (por ejemplo, a quienes compraron en Hotmart):
-- insert into public.alumnos (email, origen) values
--   ('alguien@gmail.com', 'hotmart'),
--   ('otra.persona@hotmail.com', 'hotmart')
-- on conflict (email) do nothing;
