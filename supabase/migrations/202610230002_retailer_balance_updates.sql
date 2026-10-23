create or replace function public.update_retailer_balance(
  p_retailer_id uuid,
  p_balance numeric
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_previous_balance numeric(18,4);
  v_previous_status public.retailer_status;
begin
  if v_user is null or not public.is_active_user() then
    raise exception 'An active signed-in user is required';
  end if;
  if p_balance is null or abs(p_balance) > 99999999999999.9999 then
    raise exception 'Balance is outside the supported range';
  end if;

  select balance,
    coalesce(status_override, case when balance > 0 then 'active'::public.retailer_status else 'inactive'::public.retailer_status end)
  into v_previous_balance, v_previous_status
  from public.retailers
  where id = p_retailer_id
  for update;
  if not found then raise exception 'Retailer not found'; end if;

  update public.retailers
  set balance = p_balance,
      status_override = 'active',
      status_changed_by = v_user,
      status_changed_at = now(),
      updated_at = now()
  where id = p_retailer_id;

  insert into public.retailer_interactions (retailer_id, user_id, type, note)
  values (
    p_retailer_id,
    v_user,
    'transaction',
    format('Balance updated from %s to %s.', v_previous_balance, p_balance)
  );

  if v_previous_status <> 'active' then
    insert into public.retailer_interactions (retailer_id, user_id, type, note, status_before, status_after)
    values (
      p_retailer_id,
      v_user,
      'status',
      'Retailer marked active when balance was updated.',
      v_previous_status,
      'active'
    );
  end if;
end;
$$;

revoke all on function public.update_retailer_balance(uuid, numeric) from public;
grant execute on function public.update_retailer_balance(uuid, numeric) to authenticated;
