create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  timezone text not null default 'UTC',
  week_starts_on smallint not null default 1 check (week_starts_on between 0 and 6),
  school text,
  current_term text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unique (id, owner_id),
  name text not null,
  starts_on date,
  ends_on date,
  created_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  term_id uuid,
  unique (id, owner_id),
  name text not null,
  code text,
  color text not null default '#526B5E',
  created_at timestamptz not null default now(),
  foreign key (term_id) references public.academic_terms(id) on delete set null
);

create table public.planner_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id uuid,
  unique (id, owner_id),
  title text not null check (length(trim(title)) between 1 and 160),
  category text not null check (category in ('assignment','exam','school_event','fee','scholarship','internship_job','personal')),
  due_on date not null,
  due_time time,
  all_day boolean not null default true,
  timezone text not null default 'UTC',
  notes text,
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'open' check (status in ('open','completed')),
  reminders integer[] not null default array[1440, 60],
  recurrence_rule jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (category = 'school_event' or recurrence_rule is null),
  check (recurrence_rule is null or recurrence_rule @> '{"frequency":"weekly"}'::jsonb),
  check (array_position(reminders, null) is null and array_length(reminders, 1) <= 8),
  check (all_day or due_time is not null),
  foreign key (course_id) references public.courses(id) on delete set null
);

create table public.planner_checklist_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (item_id, owner_id) references public.planner_items(id, owner_id) on delete cascade
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unique (id, owner_id),
  organization text not null,
  opportunity_name text not null,
  deadline date,
  status text not null default 'planning' check (status in ('planning','in_progress','submitted','interview','accepted','rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.application_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  application_id uuid not null,
  title text not null check (length(trim(title)) between 1 and 160),
  is_complete boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (application_id, owner_id) references public.applications(id, owner_id) on delete cascade
);

create table public.notification_preferences (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  push_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_start time not null default '22:00',
  quiet_end time not null default '08:00',
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios','android')),
  device_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (owner_id, expo_push_token)
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unique (id, owner_id),
  item_id uuid not null,
  offset_minutes integer not null check (offset_minutes >= 0),
  due_at timestamptz not null,
  available_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','processing','sent','failed','canceled')),
  attempts integer not null default 0,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (item_id, due_at, offset_minutes),
  foreign key (item_id, owner_id) references public.planner_items(id, owner_id) on delete cascade
);

create table public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid references public.notification_jobs(id) on delete set null,
  device_id uuid references public.push_devices(id) on delete set null,
  outcome text not null,
  expo_ticket_id text,
  error_code text,
  attempted_at timestamptz not null default now()
);

create table public.in_app_notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job_id uuid unique,
  item_id uuid,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (job_id) references public.notification_jobs(id) on delete set null,
  foreign key (item_id) references public.planner_items(id) on delete set null
);

create index academic_terms_owner_idx on public.academic_terms(owner_id);
create index courses_owner_idx on public.courses(owner_id);
create index planner_items_owner_due_idx on public.planner_items(owner_id, due_on, due_time);
create index planner_items_owner_status_idx on public.planner_items(owner_id, status);
create index checklist_owner_item_idx on public.planner_checklist_steps(owner_id, item_id, position);
create index applications_owner_deadline_idx on public.applications(owner_id, deadline);
create index application_steps_owner_application_idx on public.application_steps(owner_id, application_id, position);
create index push_devices_owner_idx on public.push_devices(owner_id);
create index push_devices_token_idx on public.push_devices(expo_push_token);
create index notification_jobs_dispatch_idx on public.notification_jobs(status, available_at) where status = 'queued';
create index notification_log_owner_time_idx on public.notification_delivery_log(owner_id, attempted_at desc);
create unique index notification_one_success_per_device_idx on public.notification_delivery_log(job_id, device_id) where outcome = 'accepted_by_expo';
create index in_app_notifications_owner_time_idx on public.in_app_notifications(owner_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger planner_items_touch before update on public.planner_items for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications for each row execute function public.touch_updated_at();

create or replace function public.create_user_defaults()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.notification_preferences (owner_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger auth_user_defaults after insert on auth.users for each row execute function public.create_user_defaults();

create or replace function public.schedule_item_reminders()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid;
  v_item uuid;
  v_due_on date;
  v_due_time time;
  v_timezone text;
  v_status text;
  v_reminders integer[];
  v_due_at timestamptz;
  v_offset integer;
  v_index integer;
  v_occurrence_count integer;
  v_occurrence_on date;
begin
  if tg_op = 'DELETE' then
    update public.notification_jobs set status = 'canceled' where item_id = old.id and status in ('queued','processing');
    return old;
  end if;

  if tg_op = 'UPDATE' then
    update public.notification_jobs set status = 'canceled' where item_id = new.id and status in ('queued','processing');
  end if;

  if new.status <> 'open' then
    return new;
  end if;

  v_owner := new.owner_id;
  v_item := new.id;
  v_due_on := new.due_on;
  v_due_time := coalesce(new.due_time, time '09:00');
  v_timezone := new.timezone;
  v_status := new.status;
  v_reminders := new.reminders;
  v_occurrence_count := case
    when new.recurrence_rule ->> 'frequency' = 'weekly'
      then greatest(1, least(52, coalesce((new.recurrence_rule ->> 'count')::integer, 16)))
    else 1
  end;
  for v_index in 0..v_occurrence_count - 1 loop
    v_occurrence_on := v_due_on + (v_index * 7);
    v_due_at := ((v_occurrence_on + v_due_time) at time zone v_timezone);
    foreach v_offset in array v_reminders loop
      if v_offset >= 0 and v_due_at - make_interval(mins => v_offset) > now() then
        insert into public.notification_jobs(owner_id, item_id, offset_minutes, due_at, available_at)
        values (v_owner, v_item, v_offset, v_due_at, v_due_at - make_interval(mins => v_offset))
        on conflict (item_id, due_at, offset_minutes) do update
          set owner_id = excluded.owner_id, available_at = excluded.available_at, status = 'queued', attempts = 0, claimed_at = null
          where notification_jobs.status <> 'sent';
      end if;
    end loop;
  end loop;
  return new;
end;
$$;

create trigger planner_reminders_insert after insert on public.planner_items for each row execute function public.schedule_item_reminders();
create trigger planner_reminders_update after update of due_on, due_time, timezone, reminders, recurrence_rule, status on public.planner_items for each row execute function public.schedule_item_reminders();
create trigger planner_reminders_delete after delete on public.planner_items for each row execute function public.schedule_item_reminders();

create or replace function public.claim_notification_jobs(batch_size integer default 100)
returns setof public.notification_jobs
language plpgsql security definer set search_path = public as $$
begin
  return query
  with picked as (
    select id from public.notification_jobs
    where (status = 'queued' and available_at <= now())
       or (status = 'processing' and claimed_at < now() - interval '10 minutes')
    order by available_at
    for update skip locked
    limit greatest(1, least(batch_size, 500))
  )
  update public.notification_jobs j
  set status = 'processing', attempts = j.attempts + 1, claimed_at = now()
  from picked where j.id = picked.id
  returning j.*;
end;
$$;
revoke all on function public.claim_notification_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(integer) to service_role;

alter table public.profiles enable row level security;
alter table public.academic_terms enable row level security;
alter table public.courses enable row level security;
alter table public.planner_items enable row level security;
alter table public.planner_checklist_steps enable row level security;
alter table public.applications enable row level security;
alter table public.application_steps enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_devices enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_delivery_log enable row level security;
alter table public.in_app_notifications enable row level security;

create policy "profiles belong to user" on public.profiles for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "terms belong to user" on public.academic_terms for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "courses belong to user" on public.courses for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "planner items belong to user" on public.planner_items for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "checklist steps belong to user" on public.planner_checklist_steps for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "applications belong to user" on public.applications for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "application steps belong to user" on public.application_steps for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "notification preferences belong to user" on public.notification_preferences for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "push devices belong to user" on public.push_devices for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "in app notifications belong to user" on public.in_app_notifications for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
-- Notification jobs and delivery logs are deliberately server-only: RLS is enabled with no client policies.
