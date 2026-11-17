begin;
select plan(7);

insert into auth.users (id, email, aud, role, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('40000000-0000-4000-8000-000000000001', 'reminders@example.test', 'authenticated', 'authenticated', '', now(), now(), now())
on conflict (id) do nothing;

insert into public.planner_items(id, owner_id, title, category, due_on, due_time, all_day, timezone, reminders)
values ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'Future exam', 'exam', '2030-01-02', '15:00', false, 'America/Chicago', array[60]);

select is((select count(*)::int from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001' and status = 'queued'), 1, 'insert schedules a future reminder');
select is((select due_at from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001'), '2030-01-02 21:00:00+00'::timestamptz, 'due instant respects the item time zone');
select is((select available_at from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001'), '2030-01-02 20:00:00+00'::timestamptz, 'one-hour reminder is scheduled before the deadline');

update public.planner_items
set due_on = '2030-01-03', timezone = 'America/Los_Angeles', reminders = array[30]
where id = '50000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001' and status = 'canceled'), 1, 'editing the item cancels its previous queued reminder');
select is((select available_at from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001' and status = 'queued'), '2030-01-03 22:30:00+00'::timestamptz, 'editing recalculates reminder time in the new zone');

update public.planner_items set status = 'completed' where id = '50000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001' and status = 'queued'), 0, 'completion cancels queued reminders');

update public.planner_items
set status = 'open', recurrence_rule = '{"frequency":"weekly","count":3}'::jsonb
where id = '50000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.notification_jobs where item_id = '50000000-0000-4000-8000-000000000001' and status = 'queued'), 3, 'recurrence changes schedule one reminder for each future occurrence');

select * from finish();
rollback;
