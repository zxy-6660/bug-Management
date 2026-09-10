-- ============================================================
-- 问题反馈工作台 · Supabase 初始化脚本
-- 使用方法：Supabase 控制台 -> SQL Editor -> New query -> 粘贴全部内容 -> Run
-- 脚本可重复执行（幂等）
-- ============================================================

-- 1. 问题主表 -------------------------------------------------
create table if not exists public.bugs (
  id          uuid primary key default gen_random_uuid(),
  content     text not null check (char_length(btrim(content)) > 0),
  remark      text,
  attachments jsonb not null default '[]'::jsonb,
  sort_order  integer not null default 0,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 增量升级：已存在的旧表补上备注字段 / 排序字段 / 已解决标记
alter table public.bugs add column if not exists remark text;
alter table public.bugs add column if not exists sort_order integer not null default 0;
alter table public.bugs add column if not exists resolved boolean not null default false;

-- 展示顺序：已解决优先置顶，组内再按手动排序值升序
create index if not exists bugs_sort_order_idx on public.bugs (sort_order asc);
create index if not exists bugs_resolved_sort_idx on public.bugs (resolved desc, sort_order asc);

-- 2. 开启行级安全（RLS） ---------------------------------------
alter table public.bugs enable row level security;

-- 3. 策略：匿名用户可读 / 可写 / 可改 / 可删 ---------------------
drop policy if exists "bugs_select_public" on public.bugs;
create policy "bugs_select_public" on public.bugs
  for select to anon, authenticated
  using (true);

drop policy if exists "bugs_insert_public" on public.bugs;
create policy "bugs_insert_public" on public.bugs
  for insert to anon, authenticated
  with check (true);

drop policy if exists "bugs_update_public" on public.bugs;
create policy "bugs_update_public" on public.bugs
  for update to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "bugs_delete_public" on public.bugs;
create policy "bugs_delete_public" on public.bugs
  for delete to anon, authenticated
  using (true);

-- 4. 附件存储桶（公开读取，单文件上限 20MB） --------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('bug-attachments', 'bug-attachments', true, 20971520)
on conflict (id) do update
  set public = true, file_size_limit = 20971520;

-- 5. 存储桶访问策略 --------------------------------------------
drop policy if exists "bug_attachments_select_public" on storage.objects;
create policy "bug_attachments_select_public" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'bug-attachments');

drop policy if exists "bug_attachments_insert_public" on storage.objects;
create policy "bug_attachments_insert_public" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'bug-attachments');

drop policy if exists "bug_attachments_delete_public" on storage.objects;
create policy "bug_attachments_delete_public" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'bug-attachments');
