create type public.retailer_visit_status as enum ('planned', 'completed', 'cancelled');

create table public.retailer_visits (
  id uuid primary key default gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  scheduled_at timestamptz not null,
  note text,
  status public.retailer_visit_status not null default 'planned',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint retailer_visits_note_length check (note is null or char_length(note) <= 2000)
);

create index retailer_visits_retailer_scheduled_idx on public.retailer_visits (retailer_id, scheduled_at desc);
create index retailer_visits_planned_idx on public.retailer_visits (scheduled_at) where status = 'planned';

grant select, insert on public.retailer_visits to authenticated;
alter table public.retailer_visits enable row level security;

create policy retailer_visits_read_active on public.retailer_visits for select to authenticated
using (public.is_active_user());
create policy retailer_visits_insert_self on public.retailer_visits for insert to authenticated
with check (public.is_active_user() and created_by = auth.uid());
create or replace function public.update_retailer_visit_status(
  p_visit_id uuid,
  p_retailer_id uuid,
  p_status public.retailer_visit_status
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_retailer_id uuid;
  v_note text;
begin
  if auth.uid() is null or not public.is_active_user() then
    raise exception 'An active signed-in user is required';
  end if;
  if p_status not in ('completed', 'cancelled') then
    raise exception 'Choose a valid visit status';
  end if;

  select retailer_id, note into v_retailer_id, v_note
  from public.retailer_visits
  where id = p_visit_id and retailer_id = p_retailer_id and status = 'planned'
    and (created_by = auth.uid() or public.is_admin())
  for update;
  if not found then raise exception 'Planned visit not found or cannot be managed'; end if;

  update public.retailer_visits
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else null end
  where id = p_visit_id;

  if p_status = 'completed' then
    perform public.log_retailer_interaction(
      v_retailer_id,
      'visit'::public.interaction_type,
      concat_ws(E'\n', 'Scheduled visit completed', nullif(trim(v_note), '')),
      true
    );
  end if;
end;
$$;

revoke all on function public.update_retailer_visit_status(uuid, uuid, public.retailer_visit_status) from public;
grant execute on function public.update_retailer_visit_status(uuid, uuid, public.retailer_visit_status) to authenticated;
