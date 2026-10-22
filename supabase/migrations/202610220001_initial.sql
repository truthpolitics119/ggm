create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'user');
create type public.retailer_status as enum ('active', 'inactive');
create type public.interaction_type as enum ('visit', 'call', 'whatsapp', 'email', 'transaction', 'other', 'status');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active) $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_active and p.role = 'admin') $$;

create table public.retailers (
  id uuid primary key default gen_random_uuid(),
  customer_id bigint not null unique,
  name text not null,
  username text,
  street text,
  house_number text,
  postal_code text,
  city text,
  mobile text,
  balance numeric(18,4) not null default 0,
  latitude double precision,
  longitude double precision,
  status_override public.retailer_status,
  status_changed_by uuid references public.profiles(id) on delete set null,
  status_changed_at timestamptz,
  visited_at timestamptz,
  visited_by uuid references public.profiles(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint retailers_coordinates_valid check (
    (latitude is null and longitude is null) or
    (latitude between -90 and 90 and longitude between -180 and 180)
  )
);
create index retailers_city_idx on public.retailers (city);
create index retailers_balance_idx on public.retailers (balance);
create index retailers_customer_id_idx on public.retailers (customer_id);
create index retailers_assigned_to_idx on public.retailers (assigned_to);
create index retailers_status_override_idx on public.retailers (status_override);

create table public.retailer_interactions (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  type public.interaction_type not null,
  note text,
  status_before public.retailer_status,
  status_after public.retailer_status,
  created_at timestamptz not null default now(),
  constraint retailer_interactions_note_length check (note is null or char_length(note) <= 2000)
);
create index retailer_interactions_retailer_created_idx on public.retailer_interactions (retailer_id, created_at desc);
create index retailer_interactions_user_created_idx on public.retailer_interactions (user_id, created_at desc);
create index retailer_interactions_created_at_idx on public.retailer_interactions (created_at desc);

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.retailers to authenticated;
grant select, insert, delete on public.retailer_interactions to authenticated;

alter table public.profiles enable row level security;
alter table public.retailers enable row level security;
alter table public.retailer_interactions enable row level security;

create policy profiles_read_active on public.profiles for select to authenticated
using (public.is_active_user());
create policy profiles_admin_insert on public.profiles for insert to authenticated
with check (public.is_admin());
create policy profiles_admin_update on public.profiles for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy profiles_admin_delete on public.profiles for delete to authenticated
using (public.is_admin());

create policy retailers_read_active on public.retailers for select to authenticated
using (public.is_active_user());
create policy retailers_admin_insert on public.retailers for insert to authenticated
with check (public.is_admin());
create policy retailers_admin_update on public.retailers for update to authenticated
using (public.is_admin()) with check (public.is_admin());
create policy retailers_admin_delete on public.retailers for delete to authenticated
using (public.is_admin());

create policy interactions_read_active on public.retailer_interactions for select to authenticated
using (public.is_active_user());
create policy interactions_insert_self on public.retailer_interactions for insert to authenticated
with check (
  public.is_active_user() and user_id = auth.uid() and type <> 'status'
  and status_before is null and status_after is null
);
create policy interactions_admin_delete on public.retailer_interactions for delete to authenticated
using (public.is_admin());

create or replace function public.change_retailer_status(
  p_retailer_id uuid,
  p_status public.retailer_status,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_before public.retailer_status;
begin
  if v_user is null or not public.is_active_user() then
    raise exception 'An active signed-in user is required';
  end if;
  if p_status is null then raise exception 'A retailer status is required'; end if;
  select coalesce(status_override, case when balance > 0 then 'active'::public.retailer_status else 'inactive'::public.retailer_status end)
    into v_before from public.retailers where id = p_retailer_id for update;
  if not found then raise exception 'Retailer not found'; end if;
  update public.retailers
    set status_override = p_status, status_changed_by = v_user, status_changed_at = now(), updated_at = now()
    where id = p_retailer_id;
  insert into public.retailer_interactions (retailer_id, user_id, type, note, status_before, status_after)
    values (p_retailer_id, v_user, 'status', nullif(trim(p_note), ''), v_before, p_status);
end;
$$;
revoke all on function public.change_retailer_status(uuid, public.retailer_status, text) from public;
grant execute on function public.change_retailer_status(uuid, public.retailer_status, text) to authenticated;

create or replace function public.log_retailer_interaction(
  p_retailer_id uuid,
  p_type public.interaction_type,
  p_note text default null,
  p_mark_visited boolean default false
)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_interaction_id uuid;
begin
  if v_user is null or not public.is_active_user() then
    raise exception 'An active signed-in user is required';
  end if;
  if p_type is null then raise exception 'An interaction type is required'; end if;
  if p_type = 'status' then raise exception 'Use the status-change operation for status history'; end if;
  if not exists (select 1 from public.retailers where id = p_retailer_id) then
    raise exception 'Retailer not found';
  end if;
  insert into public.retailer_interactions (retailer_id, user_id, type, note)
    values (p_retailer_id, v_user, p_type, nullif(trim(p_note), ''))
    returning id into v_interaction_id;
  if p_mark_visited or p_type = 'visit' then
    update public.retailers set visited_at = now(), visited_by = v_user, updated_at = now()
      where id = p_retailer_id;
  end if;
  return v_interaction_id;
end;
$$;
revoke all on function public.log_retailer_interaction(uuid, public.interaction_type, text, boolean) from public;
grant execute on function public.log_retailer_interaction(uuid, public.interaction_type, text, boolean) to authenticated;

create or replace function public.recently_interacted_retailer_ids(p_since timestamptz)
returns table(retailer_id uuid)
language sql stable security invoker set search_path = public
as $$
  select distinct i.retailer_id
  from public.retailer_interactions i
  where i.created_at >= p_since
$$;
grant execute on function public.recently_interacted_retailer_ids(timestamptz) to authenticated;

create or replace function public.import_retailers(p_rows jsonb)
returns table(inserted integer, updated integer)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_total integer;
  v_existing integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Service-role access is required';
  end if;
  if jsonb_typeof(p_rows) <> 'array' then raise exception 'Import payload must be an array'; end if;
  select count(*) into v_total from jsonb_to_recordset(p_rows) as x(customer_id bigint);
  select count(*) into v_existing
    from public.retailers r
    join jsonb_to_recordset(p_rows) as x(customer_id bigint) on x.customer_id = r.customer_id;

  insert into public.retailers (
    customer_id, name, username, street, house_number, postal_code, city, mobile,
    balance, latitude, longitude, updated_at
  )
  select customer_id, name, username, street, house_number, postal_code, city, mobile,
    balance, latitude, longitude, now()
  from jsonb_to_recordset(p_rows) as x(
    customer_id bigint, name text, username text, street text, house_number text,
    postal_code text, city text, mobile text, balance numeric, latitude double precision,
    longitude double precision
  )
  on conflict (customer_id) do update set
    name = excluded.name, username = excluded.username, street = excluded.street,
    house_number = excluded.house_number, postal_code = excluded.postal_code,
    city = excluded.city, mobile = excluded.mobile, balance = excluded.balance,
    latitude = excluded.latitude, longitude = excluded.longitude, updated_at = now();
  return query select v_total - v_existing, v_existing;
end;
$$;
revoke all on function public.import_retailers(jsonb) from public, anon, authenticated;
grant execute on function public.import_retailers(jsonb) to service_role;

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'user');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_auth_user();
