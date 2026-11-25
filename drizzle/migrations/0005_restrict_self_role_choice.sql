create or replace function public.choose_role(_role app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _role <> 'candidate' then raise exception 'Role not allowed'; end if;
  if exists (select 1 from public.user_roles where user_id = auth.uid()) then return; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'candidate');
end $$;
revoke execute on function public.choose_role(app_role) from public, anon;
grant execute on function public.choose_role(app_role) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  if new.raw_user_meta_data->>'role' = 'candidate' then
    insert into public.user_roles (user_id, role) values (new.id, 'candidate');
  end if;
  return new;
end $$;