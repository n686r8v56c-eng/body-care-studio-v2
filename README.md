# Body Care Studio

상체/하체 전환과 마사지·스트레치·맨몸근력·기계근력 4개 탭을 갖춘 운동 영상 라이브러리입니다.

- 뷰티케어 스트레치와 비슷한 콤팩트한 1줄 목록, 펼침, 편집·순서변경·보관·복구
- 항목 수 제한 없음, 각 항목에 YouTube 영상 최대 5개 등록, 앱 안 임베드·링크 복사
- 계정별 Supabase JSON 데이터 동기화 및 JSON 내보내기·가져오기
- 데이터베이스 환경변수가 아직 없다면 로그인 없는 기기 저장 모드로 동작합니다. 클라우드 동기화는 별도 설정 후 사용할 수 있습니다.

## 설정
1. Supabase 프로젝트를 준비한 뒤 `supabase/schema.sql`을 SQL Editor에서 실행하세요.
2. `.env.example`을 참고하여 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정하세요. 서비스 롤 키는 넣지 마세요.
3. `npm install` 후 `npm run dev` / `npm run build`.
4. Cloudflare Pages: GitHub 저장소 연결, 빌드 명령 `npm run build`, 빌드 출력 `dist`, 환경변수 등록.
5. 기기 간 동기화를 하려면 동일 이메일 계정으로 로그인하세요.

기존 Beauty Care 및 다른 앱의 데이터를 삭제하거나 변경하지 않습니다. JSON 백업은 정기적으로 다운로드하세요.
