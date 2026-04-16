# 보건환경연구원 공용차량 배차 시스템

## 로컬 실행

```bash
npm install
npm run dev
```

## Vercel 배포 방법

1. GitHub에 이 폴더를 업로드
2. vercel.com → New Project → GitHub 레포 선택
3. Environment Variables 설정:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_ADMIN_PASSWORD`
4. Deploy 클릭

## 관리자 접속

배포된 URL 뒤에 `#admin` 추가:
```
https://your-app.vercel.app/#admin
```

## Supabase SQL (최초 1회 실행)

```sql
create table dispatches (
  id bigint generated always as identity primary key,
  date text not null,
  car text not null,
  dept text not null,
  "user" text not null,
  passengers text,
  description text,
  depart text,
  arrive text,
  dest text not null,
  fuel int default 0,
  km text,
  locked boolean default false,
  created_at timestamptz default now()
);

alter table dispatches enable row level security;

create policy "anyone can read" on dispatches for select using (true);
create policy "anyone can insert" on dispatches for insert with check (true);
create policy "anyone can update" on dispatches for update using (true);
create policy "anyone can delete" on dispatches for delete using (true);
```
