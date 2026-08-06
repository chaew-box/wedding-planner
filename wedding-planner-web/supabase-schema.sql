-- Wedding Planner: Supabase 테이블 생성 스크립트
-- Supabase 대시보드 > SQL Editor 에 전체 복사해서 실행하세요.

create table if not exists workspaces (
  code text primary key,
  title text,
  wedding_date text,
  user_a text default '',
  user_b text default '',
  categories jsonb default '[]',
  groups_by_category jsonb default '{}',
  schedule jsonb default '[]',
  budget jsonb default '[]',
  status_options jsonb default '[]',
  announcements jsonb default '[]',
  checklist jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists group_contents (
  code text not null,
  group_id text not null,
  memo_sections jsonb default '[]',
  photos jsonb default '[]',
  budget_note text default '',
  schedule_note text default '',
  primary key (code, group_id)
);

-- Realtime(실시간 동기화)을 위해 두 테이블을 publication에 추가
alter publication supabase_realtime add table workspaces;
alter publication supabase_realtime add table group_contents;

-- RLS 활성화
alter table workspaces enable row level security;
alter table group_contents enable row level security;

-- 이 앱은 로그인 없이 "공유코드를 아는 사람"이 곧 접근 권한인 구조입니다.
-- 따라서 anon(비로그인) 역할에게 전체 read/write를 허용합니다.
-- (주의: 공유코드가 노출되면 그 코드의 데이터는 누구나 읽고 쓸 수 있습니다 —
--  원래 Claude 아티팩트 버전과 동일한 보안 수준입니다.)
create policy "anon full access" on workspaces
  for all
  to anon
  using (true)
  with check (true);

create policy "anon full access" on group_contents
  for all
  to anon
  using (true)
  with check (true);
