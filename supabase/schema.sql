create extension if not exists pgcrypto;

create table if not exists public.allowed_teachers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 120),
  last_name text not null check (char_length(last_name) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (class_id, first_name, last_name)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  attendance_date date not null default current_date,
  status text not null check (status in ('pending', 'present', 'late', 'absent')),
  updated_at timestamptz not null default now(),
  unique (student_id, attendance_date)
);

create index if not exists attendance_date_idx on public.attendance (attendance_date);
create index if not exists students_class_idx on public.students (class_id, last_name, first_name);

create or replace function public.is_allowed_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.allowed_teachers
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_allowed_teacher() from public, anon;
grant execute on function public.is_allowed_teacher() to authenticated;

alter table public.allowed_teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.attendance enable row level security;

drop policy if exists "Teachers can read their own allowlist entry" on public.allowed_teachers;
create policy "Teachers can read their own allowlist entry"
  on public.allowed_teachers for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Authorized teachers can manage classes" on public.classes;
create policy "Authorized teachers can manage classes"
  on public.classes for all to authenticated
  using ((select public.is_allowed_teacher()))
  with check ((select public.is_allowed_teacher()));

drop policy if exists "Authorized teachers can manage students" on public.students;
create policy "Authorized teachers can manage students"
  on public.students for all to authenticated
  using ((select public.is_allowed_teacher()))
  with check ((select public.is_allowed_teacher()));

drop policy if exists "Authorized teachers can manage attendance" on public.attendance;
create policy "Authorized teachers can manage attendance"
  on public.attendance for all to authenticated
  using ((select public.is_allowed_teacher()))
  with check ((select public.is_allowed_teacher()));

revoke all on public.allowed_teachers, public.classes, public.students, public.attendance from anon;
grant select on public.allowed_teachers to authenticated;
grant select, insert, update, delete on public.classes, public.students, public.attendance to authenticated;

create or replace function public.import_roster(roster jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  imported_students integer;
  imported_courses integer;
begin
  if not public.is_allowed_teacher() then
    raise exception 'Teacher access is required.';
  end if;
  if roster is null
    or coalesce(jsonb_typeof(roster), '') <> 'array' then
    raise exception 'Roster must be a JSON array.';
  end if;
  if jsonb_array_length(roster) < 1 or jsonb_array_length(roster) > 500 then
    raise exception 'Roster must contain between 1 and 500 rows.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(roster) as entry(first_name text, last_name text, class_name text)
    where char_length(btrim(coalesce(entry.first_name, ''))) not between 1 and 120
      or char_length(btrim(coalesce(entry.last_name, ''))) not between 1 and 120
      or char_length(btrim(coalesce(entry.class_name, ''))) not between 1 and 120
  ) then
    raise exception 'Roster contains a blank or oversized value.';
  end if;

  insert into public.classes (name)
  select distinct btrim(entry.class_name)
  from jsonb_to_recordset(roster) as entry(first_name text, last_name text, class_name text)
  where btrim(coalesce(entry.class_name, '')) <> ''
  on conflict (name) do nothing;

  insert into public.students (class_id, first_name, last_name)
  select classes.id, btrim(entry.first_name), btrim(entry.last_name)
  from jsonb_to_recordset(roster) as entry(first_name text, last_name text, class_name text)
  join public.classes as classes on classes.name = btrim(entry.class_name)
  where btrim(coalesce(entry.first_name, '')) <> ''
    and btrim(coalesce(entry.last_name, '')) <> ''
  on conflict (class_id, first_name, last_name) do nothing;
  get diagnostics imported_students = row_count;

  select count(distinct btrim(entry.class_name))
  into imported_courses
  from jsonb_to_recordset(roster) as entry(first_name text, last_name text, class_name text);

  return jsonb_build_object(
    'student_count', imported_students,
    'course_count', imported_courses
  );
end;
$$;

revoke all on function public.import_roster(jsonb) from public, anon;
grant execute on function public.import_roster(jsonb) to authenticated;

alter table public.attendance replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'attendance'
    ) then
    alter publication supabase_realtime add table public.attendance;
  end if;
end
$$;
