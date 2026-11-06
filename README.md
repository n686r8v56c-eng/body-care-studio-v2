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

## 연습 기록 SQL 분리 (Face / Voice)

1. 동일한 Supabase 프로젝트의 SQL Editor에서 [supabase/practice_logs.sql](supabase/practice_logs.sql) 전체를 한 번 실행합니다.
2. 기존 `body_care_studio_data.payload.practiceLogs` 기록은 삭제하지 않고 새 `body_care_practice_logs` 테이블로 복사합니다. 동일 스크립트를 다시 실행해도 기존 날짜의 기록이 중복 합산되지 않습니다.
3. 앱을 새로고침합니다. 기록 탭은 새 SQL 테이블을 읽고, 타이머는 고유 ID가 있는 이벤트로 실제 경과 시간을 기록합니다.
4. SQL 테이블이 아직 준비되지 않았거나 네트워크가 끊긴 동안에는 새 기록을 브라우저 로컬 대기열에 보관합니다. 재접속한 뒤 전송을 재시도합니다. 다른 기기와 동기화하려면 SQL 설치와 전송 완료가 필요합니다.
5. 기존 루틴, 유튜브 영상, JSON 백업은 변경하지 않습니다. 본인 계정만 읽고 쓸 수 있도록 RLS를 적용합니다.

> 유의: GitHub에 SQL 파일을 추가하는 것만으로 Supabase에 테이블이 생성되지는 않습니다. 반드시 SQL Editor에서 실행해야 합니다.

## 기기 간 타이머 동기화 (iPhone / iPad)

1. Body Care v2의 Supabase 프로젝트 SQL Editor에서 [supabase/timer_sync.sql](supabase/timer_sync.sql)을 실행합니다. 기존 연습 기록 SQL([supabase/practice_logs.sql](supabase/practice_logs.sql))은 별도로 실행해야 합니다.
2. 같은 Supabase 계정으로 두 기기에서 로그인합니다. `Timer` → `Face` 또는 `Voice`에 들어가면 해당 장르의 공유 타이머 상태를 확인할 수 있습니다.
3. 한 기기에서 생성·시작한 미저장 루틴과 현재 단계, 남은 시간, 재생 상태를 다른 기기에서 조회할 수 있습니다. 화면은 약 2.4초마다 서버 상태를 확인합니다.
4. 두 번째 기기는 기본적으로 읽기 전용입니다. **이 기기에서 이어받기**를 누르면 첫 번째 기기의 제어권을 가져와서 일시정지 상태로 이어서 조작할 수 있습니다.
5. SQL이 설치되지 않았거나 네트워크가 끊긴 경우 화면에 기기 저장만 가능하다는 메시지가 표시됩니다. 이때 기기 간 동기화를 보장하지 않습니다.
6. 타이머 진행 시간은 제어 중인 기기에서 기록합니다. 백그라운드 앱 제한, 네트워크 지연 또는 기기 시계 차이로 초 단위 차이가 생길 수 있으므로 실제 양쪽 기기에서 검증해 주세요.
