# marusj

마루상조 파트너스 어드민

## 실행

```powershell
npm install
npm start
```

서버 실행 후 브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3000/login.html
```

초기 로그인 계정은 `.env`가 없을 때 `admin / 1`입니다.

## 환경 변수

실제 DB 접속 정보는 `.env`에 넣고 GitHub에는 올리지 않습니다. 예시는 `.env.example`을 참고하세요.

```powershell
Copy-Item .env.example .env
```

## 주요 API

```text
GET  /api/health
POST /api/auth/login
POST /api/sales/register
GET  /api/members
GET  /api/members/tree
GET  /api/invite-links
POST /api/invite-links
POST /api/signup
GET  /api/terms?scope=sales_register
GET  /api/terms?scope=funeral_member
GET  /api/terms/active?scope=sales_register
GET  /api/terms/active?scope=funeral_member
PUT  /api/terms/:scope/:type
GET  /api/terms/agreements
```

## MSSQL

초기 테이블 예시는 `server/schema.sql`에 있습니다.

약관 3종 기본 문안을 다시 채우려면 아래 명령을 사용합니다.

```powershell
npm run seed:terms
```
