-- Painel Pessoal v2 — núcleo: extensões, helper de updated_at, whitelist, profiles, user_settings.
-- Rode este arquivo primeiro, na ordem do nome (timestamp crescente).

create extension if not exists "pgcrypto";

-- Helper reutilizado por toda tabela que tem updated_at.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- Whitelist de acesso — só e-mails aqui podem terminar de criar conta.
-- =========================================================================

create table public.allowed_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.allowed_emails is
  'Whitelist de e-mails autorizados a usar o painel. Login Google de e-mail fora desta lista é rejeitado no próprio auth.users (ver handle_new_user).';

-- Preencha com o(s) e-mail(s) autorizado(s) antes de tentar logar pela primeira vez, ex.:
-- insert into public.allowed_emails (email, note) values ('voce@exemplo.com', 'dono do painel');

alter table public.allowed_emails enable row level security;
-- Ninguém acessa esta tabela pelo cliente (nem para leitura) — só o trigger (security definer) a consulta.
-- Nenhuma policy = nenhum acesso via PostgREST/anon/authenticated.

-- =========================================================================
-- profiles — 1:1 com auth.users
-- =========================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  migrated_from_local_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Sem policy de insert/delete: linhas são criadas só pelo trigger handle_new_user (security definer).

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =========================================================================
-- Trigger: cria a conta em auth.users somente se o e-mail estiver na whitelist.
-- Lançar exceção aqui reverte a transação inteira, incluindo o insert em auth.users
-- (é o mecanismo padrão do Supabase para allow-list de signup).
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails
    where lower(email) = lower(new.email)
  ) then
    raise exception 'E-mail % não autorizado para este painel pessoal.', new.email
      using errcode = '28000'; -- invalid_authorization_specification
  end if;

  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- =========================================================================
-- user_settings — preferências, criado depois de profiles pois é referenciado acima
-- (a tabela precisa existir antes do trigger ser criado, então ela é definida agora
-- e o trigger só é efetivamente registrado no fim deste arquivo).
-- =========================================================================

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  cardio_default_goal_minutes int not null default 120 check (cardio_default_goal_minutes > 0),
  cycle_anchor_date date not null default date_trunc('week', now())::date,
  hide_financial_values boolean not null default true,
  hide_financial_on_startup boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "user_settings_update_own" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger set_user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Agora que profiles e user_settings existem, registra o trigger de criação de conta.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- Storage — bucket de avatar (privado; acesso via signed URL ou policy abaixo)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "avatar_select_own" on storage.objects
  for select using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_insert_own" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_update_own" on storage.objects
  for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "avatar_delete_own" on storage.objects
  for delete using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Convenção de path: avatars/{user_id}/{arquivo}
