# Wedding Planner (Web 버전)

Claude 아티팩트로 만들었던 결혼 준비 플래너를, 로그인 없이 브라우저 어디서든 접속 가능한
독립 웹앱으로 옮긴 버전입니다. 데이터는 Claude와 무관하게 Supabase에 저장되며,
Vercel에 배포하면 완전히 무료로 운영할 수 있습니다.

## 1. Supabase 테이블 만들기 (아직 안 하셨다면)

1. Supabase 프로젝트 대시보드 → 왼쪽 메뉴 **SQL Editor**
2. 이 저장소의 `supabase-schema.sql` 내용을 전체 복사해서 붙여넣고 **Run**
3. 왼쪽 메뉴 **Table Editor**에서 `workspaces`, `group_contents` 두 테이블이 생겼는지 확인

## 2. 로컬에서 테스트 (선택)

```bash
npm install
npm run dev
```

`http://localhost:3000` 접속. `.env.local` 파일에 이미 Supabase 접속 정보가 들어있어요.

## 3. GitHub에 업로드

이 폴더 전체를 GitHub 저장소에 올리세요. `.env.local`은 `.gitignore`에 포함되어 있어
자동으로 제외됩니다 (의도된 동작이에요 — 비밀 값은 레포에 올리지 않습니다).

## 4. Vercel에 배포

1. [vercel.com](https://vercel.com) → **Add New Project** → 방금 올린 GitHub 저장소 선택
2. **Environment Variables**에 아래 두 개를 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://sgzgvyhsuhcnxdlxidmz.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (Supabase 프로젝트의 publishable/anon key)
3. **Deploy** 클릭

배포가 끝나면 `https://프로젝트이름.vercel.app` 주소가 생겨요. 그 주소가 앞으로 계속 쓸 링크입니다.

## 데이터가 안전하게 유지되는 이유

- 모든 데이터는 Supabase Postgres DB에 저장되고, 화면의 "공유코드"가 그 데이터의 열쇠예요.
- 이 브라우저(기기)는 `localStorage`에 "마지막으로 본 공유코드"만 기억해요. 데이터 자체는
  기기가 아니라 Supabase에 있어서, 다른 기기·다른 브라우저에서도 같은 공유코드를 입력하면
  똑같은 내용을 볼 수 있어요.
- 같은 코드를 보고 있는 두 사람은 서로 새로고침 없이도 실시간으로 변경사항이 반영돼요
  (Supabase Realtime).

## 주의할 점

- **보안**: 로그인 시스템이 없어서, 공유코드를 아는 사람은 누구나 그 데이터를 읽고 쓸 수 있어요.
  원래 Claude 버전과 동일한 보안 수준이에요 — 코드를 아무 데나 공개적으로 올리지만 않으면 돼요.
- **Supabase 무료 플랜 자동 일시정지**: 7일간 접속이 없으면 프로젝트가 잠깐 멈춰요.
  데이터는 안전하지만, 접속하려면 Supabase 대시보드에서 한 번 깨워줘야 해요.
  자주 쓰시면 문제되지 않지만, 오래 안 쓸 걸 대비해 무료 모니터링 서비스(UptimeRobot 등)로
  며칠에 한 번 자동 접속시켜두는 것도 방법이에요.
- **사진 용량**: 사진은 압축된 형태로 DB에 저장돼요. Supabase 무료 DB 용량은 500MB인데,
  결혼 준비 기간 동안 텍스트 위주로 쓰신다면 충분하고, 사진을 아주 많이 올리실 계획이면
  그 부분만 염두에 두시면 좋아요.
