-- Loja Kairavana: estrutura do banco no Supabase.
-- Rode tudo de uma vez em: Supabase → SQL Editor → New query → colar → Run.
-- Regras de acesso (RLS): cada cliente só vê os próprios dados; só a equipe (tabela admins) edita a loja.

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  descricao text default '',
  ordem int not null default 0
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  categoria_id uuid references public.categorias(id) on delete restrict,
  descricao text default '',
  como_usar text default '',
  aviso text default '',
  preco numeric(10,2) not null check (preco >= 0),
  preco_antigo numeric(10,2) check (preco_antigo is null or preco_antigo > preco),
  estoque int not null default 0 check (estoque >= 0),
  imagens text[] not null default '{}',
  destaque boolean not null default false,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text default '',
  email text,
  telefone text default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.enderecos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  apelido text default '',
  cep text not null, rua text not null, numero text not null, complemento text default '',
  bairro text not null, cidade text not null, uf char(2) not null,
  principal boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated always as identity (start with 1000) unique,
  usuario_id uuid not null references public.perfis(id) on delete restrict,
  status text not null default 'aguardando_pagamento'
    check (status in ('aguardando_pagamento','pago','em_preparo','enviado','entregue','cancelado')),
  subtotal numeric(10,2) not null, frete numeric(10,2) not null, total numeric(10,2) not null,
  endereco jsonb not null,
  mensagem_cartao text default '' check (char_length(mensagem_cartao) <= 300),
  rastreio text default '',
  mp_preference_id text, mp_payment_id text,
  estoque_baixado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.itens_pedido (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.pedidos(id) on delete cascade,
  produto_id uuid references public.produtos(id) on delete set null,
  nome text not null,
  preco numeric(10,2) not null,
  quantidade int not null check (quantidade > 0)
);

create table if not exists public.admins (
  usuario_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.configuracoes (
  id int primary key default 1 check (id = 1),
  frete_fixo numeric(10,2) not null default 22,
  frete_gratis_acima numeric(10,2) not null default 250,
  parcelas_sem_juros int not null default 3
);
insert into public.configuracoes (id) values (1) on conflict do nothing;

-- ---------- funções ----------
create or replace function public.eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where usuario_id = auth.uid());
$$;

-- cria o perfil quando alguém se cadastra
create or replace function public.novo_perfil() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email, telefone)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', ''), new.email, coalesce(new.raw_user_meta_data->>'telefone', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists ao_cadastrar on auth.users;
create trigger ao_cadastrar after insert on auth.users for each row execute function public.novo_perfil();

create or replace function public.marca_atualizacao() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;
drop trigger if exists pedidos_atualizado on public.pedidos;
create trigger pedidos_atualizado before update on public.pedidos for each row execute function public.marca_atualizacao();

-- baixa o estoque uma única vez quando o pagamento é aprovado (chamada só pelo servidor)
create or replace function public.baixar_estoque(p_pedido uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.pedidos set estoque_baixado = true where id = p_pedido and not estoque_baixado;
  if found then
    update public.produtos pr set estoque = greatest(0, pr.estoque - i.quantidade)
    from public.itens_pedido i where i.pedido_id = p_pedido and i.produto_id = pr.id;
  end if;
end $$;
revoke all on function public.baixar_estoque(uuid) from public, anon, authenticated;

-- ---------- regras de acesso (RLS) ----------
alter table public.categorias enable row level security;
alter table public.produtos enable row level security;
alter table public.perfis enable row level security;
alter table public.enderecos enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;
alter table public.admins enable row level security;
alter table public.configuracoes enable row level security;

drop policy if exists "categorias: todos leem" on public.categorias;
create policy "categorias: todos leem" on public.categorias for select using (true);
drop policy if exists "categorias: equipe edita" on public.categorias;
create policy "categorias: equipe edita" on public.categorias for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "produtos: todos leem os ativos" on public.produtos;
create policy "produtos: todos leem os ativos" on public.produtos for select using (ativo or public.eh_admin());
drop policy if exists "produtos: equipe edita" on public.produtos;
create policy "produtos: equipe edita" on public.produtos for all using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "perfis: dono ou equipe leem" on public.perfis;
create policy "perfis: dono ou equipe leem" on public.perfis for select using (id = auth.uid() or public.eh_admin());
drop policy if exists "perfis: dono edita" on public.perfis;
create policy "perfis: dono edita" on public.perfis for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "enderecos: dono gerencia" on public.enderecos;
create policy "enderecos: dono gerencia" on public.enderecos for all using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "enderecos: equipe lê" on public.enderecos;
create policy "enderecos: equipe lê" on public.enderecos for select using (public.eh_admin());

-- pedidos são criados só pelo servidor (função checkout); o cliente só lê os seus
drop policy if exists "pedidos: dono ou equipe leem" on public.pedidos;
create policy "pedidos: dono ou equipe leem" on public.pedidos for select using (usuario_id = auth.uid() or public.eh_admin());
drop policy if exists "pedidos: equipe atualiza" on public.pedidos;
create policy "pedidos: equipe atualiza" on public.pedidos for update using (public.eh_admin()) with check (public.eh_admin());

drop policy if exists "itens: quem vê o pedido vê os itens" on public.itens_pedido;
create policy "itens: quem vê o pedido vê os itens" on public.itens_pedido for select
  using (exists (select 1 from public.pedidos p where p.id = pedido_id and (p.usuario_id = auth.uid() or public.eh_admin())));

drop policy if exists "admins: cada um vê a si" on public.admins;
create policy "admins: cada um vê a si" on public.admins for select using (usuario_id = auth.uid());

drop policy if exists "configuracoes: todos leem" on public.configuracoes;
create policy "configuracoes: todos leem" on public.configuracoes for select using (true);
drop policy if exists "configuracoes: equipe edita" on public.configuracoes;
create policy "configuracoes: equipe edita" on public.configuracoes for update using (public.eh_admin()) with check (public.eh_admin());

-- a equipe só pode mudar status e rastreio dos pedidos (valores ficam como o servidor calculou)
revoke update on public.pedidos from authenticated;
grant update (status, rastreio) on public.pedidos to authenticated;
-- o cliente só muda nome e celular no próprio perfil
revoke update on public.perfis from authenticated;
grant update (nome, telefone) on public.perfis to authenticated;

-- ---------- fotos dos produtos (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('produtos', 'produtos', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "fotos: todos veem" on storage.objects;
create policy "fotos: todos veem" on storage.objects for select using (bucket_id = 'produtos');
drop policy if exists "fotos: equipe envia" on storage.objects;
create policy "fotos: equipe envia" on storage.objects for insert with check (bucket_id = 'produtos' and public.eh_admin());
drop policy if exists "fotos: equipe apaga" on storage.objects;
create policy "fotos: equipe apaga" on storage.objects for delete using (bucket_id = 'produtos' and public.eh_admin());

-- ---------- categorias iniciais ----------
insert into public.categorias (nome, slug, descricao, ordem) values
  ('Velas aromáticas', 'velas', 'Velas com aromas para acompanhar seus momentos de pausa.', 0),
  ('Óleos essenciais', 'oleos-essenciais', 'Óleos essenciais para difusor e para os seus rituais de autocuidado.', 1),
  ('Incensos', 'incensos', 'Incensos para perfumar o ambiente.', 2),
  ('Sprays áuricos e home sprays', 'sprays', 'Sprays para ambientes, tecidos e para o seu momento de cuidado.', 3),
  ('Banhos de ervas', 'banhos-de-ervas', 'Ervas desidratadas para banhos e escalda-pés.', 4),
  ('Sais de banho', 'sais-de-banho', 'Sais para banhos e escalda-pés.', 5),
  ('Cristais e pedras', 'cristais', 'Cristais e pedras naturais, escolhidos um a um.', 6),
  ('Florais de Bach', 'florais', 'Essências florais de Bach. A maioria é conservada em conhaque: contém álcool.', 7),
  ('Oráculos e cartas', 'oraculos', 'Baralhos e cartas de autoconhecimento, para reflexão e não para previsão.', 8)
on conflict (slug) do nothing;

-- ---------- primeira pessoa da equipe ----------
-- 1) Crie a conta dela em conta.html (ou em Authentication → Users).
-- 2) Rode, trocando o e-mail:
-- insert into public.admins (usuario_id) select id from auth.users where email = 'email-da-equipe@exemplo.com';
