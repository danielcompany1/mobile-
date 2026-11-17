-- Auth accounts created before the initial schema did not run auth_user_defaults.
-- Fill their missing defaults while preserving all existing profile and reminder settings.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

insert into public.notification_preferences (owner_id)
select id from auth.users
on conflict (owner_id) do nothing;
