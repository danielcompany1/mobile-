begin;
select plan(10);

insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'rls-a@example.test', 'authenticated', 'authenticated', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', 'rls-b@example.test', 'authenticated', 'authenticated', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.planner_items(id, owner_id, title, category, due_on, timezone)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'My item', 'assignment', '2030-01-01', 'UTC'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Other account item', 'assignment', '2030-01-01', 'UTC');
insert into public.applications(id, owner_id, organization, opportunity_name)
values
  ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'My school', 'My scholarship'),
  ('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'Other school', 'Other scholarship');
insert into public.notification_jobs(owner_id, item_id, offset_minutes, due_at, available_at)
values ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 0, '2030-01-01 09:00+00', '2030-01-01 09:00+00');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::int from public.planner_items), 1, 'users see only their own planner items');
select is((select count(*)::int from public.applications), 1, 'users see only their own applications');
select lives_ok(
  $$insert into public.planner_items(title,category,due_on,timezone) values ('Owned by session','assignment','2030-01-02','UTC')$$,
  'client inserts can omit owner_id'
);
select is((select count(*)::int from public.planner_items), 2, 'the database derives insert ownership from auth.uid()');
select throws_ok(
  $$insert into public.planner_items(owner_id,title,category,due_on,timezone) values ('10000000-0000-4000-8000-000000000002','spoofed','assignment','2030-01-01','UTC')$$,
  '42501', null, 'users cannot write rows for another owner'
);
select throws_ok(
  $$insert into public.planner_checklist_steps(owner_id,item_id,title) values ('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','cross-owner step')$$,
  '23503', null, 'checklist steps cannot reference another owner item'
);
select throws_ok(
  $$insert into public.application_steps(owner_id,application_id,title) values ('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','cross-owner step')$$,
  '23503', null, 'application steps cannot reference another owner application'
);
select is((select count(*)::int from public.notification_jobs), 0, 'notification jobs are server-only');
select is((select count(*)::int from public.notification_delivery_log), 0, 'notification delivery logs are server-only');
select is((select count(*)::int from public.profiles), 1, 'profile defaults are provisioned and private');

select * from finish();
rollback;
