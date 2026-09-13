# 문제 엑셀 수정·등록

관리자가 Unit을 선택해 내려받은 파일을 수정한 뒤 업로드 검사와 일괄 반영을 진행한다. 기존 문제·보기 ID, 사진 매핑, 제출 답안 및 채점 기록을 보존한다. 기존 학습 결과에 표시하는 문제와 해설은 최신 내용이다.

## 서버 반영

- `QuestionExcelBatch` 엔티티가 `question_excel_batch` 테이블을 추가한다. 현재 애플리케이션의 TypeORM `synchronize: true` 구성에서 시작 시 생성된다. 자동 동기화를 사용하지 않는 환경은 함께 제공한 SQL을 먼저 적용한다.
- 기존 문제·보기·학습 테이블의 스키마나 ID를 변경할 필요가 없다. 운영 데이터 삭제나 재등록은 필요하지 않다.
- 백엔드와 프런트를 함께 배포한다. 기존 `POST /admin/questions/excel` 호출은 이제 저장하지 않고 검토 결과만 반환한다. 기존 외부 호출자는 검토 후 commit API 호출을 추가해야 한다.
- 검토는 관리자별 DB 배치로 저장하며 24시간 후 반영할 수 없다. 완료 결과는 같은 검토 ID의 재시도에 재사용된다. 서버 재시작 후에도 중복 등록되지 않는다.
- 엑셀 반영과 개별 문제 수정·등록은 능력단위 → 문제 → 보기 순서로 잠그고 트랜잭션을 사용한다. 사진·학습 기록은 엑셀 반영에서 쓰지 않는다.

## API

모든 경로에 기존 관리자 인증이 적용된다. JSON 응답은 기존 `{ code, message, data }` 형식이다.

| 메서드 / 경로 | 입력 | 결과 |
| --- | --- | --- |
| GET `/admin/questions/excel` | `unitIds=1,2` | `.xlsx` 바이너리 |
| POST `/admin/questions/excel/preview` | multipart `file` 하나 | `previewId`, `expiresAt`, `counts`, `units`, `rows` |
| POST `/admin/questions/excel` | multipart `file` 하나 | preview와 동일, 저장하지 않음 |
| POST `/admin/questions/excel/commit` | `{ previewId, acknowledgeWarnings?: boolean }` | `created`, `updated`, `unchanged`, 신규 `questionIds` |

행 결과에는 `sheet`, `row`(실제 엑셀 행 번호), `questionId`, `unitId`, `unitName`, `title`, `status`, `errors`, `warnings`, `changes`가 포함된다. `changes`는 `field`, `before`, `after` 목록이다. 상태는 `new`, `updated`, `unchanged`, `error`이고 경고 건수는 경고가 있는 행 수다.

기존 문제는 `questionId`와 숨김 `_originalHash`가 필요하다. 원본 문제 또는 답안 ID·내용이 바뀌면 충돌로 차단한다. ID 없이 숨김 검증 값만 남아 있으면 실수로 기존 ID를 지운 것으로 보고 차단한다. 신규 문제를 복사해서 만들 때는 두 값을 모두 비운다.

기존 보기 칸의 순서는 ID 오름차순이며 연결형은 왼쪽 ID를 기준으로 대응하는 오른쪽 항목을 배치한다. 다중 단답형은 같은 번호에 여러 정답을 허용하되 기존 행의 번호 순서와 항목 개수는 유지해야 한다.

복수 단답형에 과거 입력으로 생긴 빈 추가 정답이 있으면, 같은 빈칸 번호에 정상 정답이 있는 경우에만 다운로드 내용·번호에서 함께 제외한다. 기존 다운로드의 끝 빈 줄이나 빈 줄이 제거된 파일도 동일한 기준으로 읽는다. 원본 검증에는 빈 레코드까지 포함하며, 정상 정답의 ID와 DB에 남아 있는 빈 레코드를 다운로드·재업로드만으로 변경하지 않는다. 특정 빈칸 번호에 정상 정답이 하나도 없으면 해당 문제 ID와 빈칸 번호를 오류로 안내한다. 신규 엑셀 및 관리자 편집에서는 빈 정답을 저장하지 못하게 한다.

## 검증 실행

`npm test -- --runInBand`로 일반 테스트를 실행한다. MySQL 통합 테스트는 기본적으로 건너뛰며 애플리케이션 `.env`를 읽지 않는다.

격리된 로컬 MySQL에 데이터베이스 `cbt_excel_test`, root 비밀번호 `cbt-excel-local-test`를 준비하고 PowerShell에서 실행한다. **이 DB는 테스트마다 스키마와 데이터를 초기화한다.** 호스트는 코드에서 `127.0.0.1`로 고정되어 있다.

```powershell
$env:QUESTION_EXCEL_TEST_DB='cbt_excel_test'
$env:QUESTION_EXCEL_TEST_PORT='33316'
# 선택: 실제 V3 양식 규모 테스트를 함께 실행
$env:QUESTION_EXCEL_TEST_FILE='C:/path/to/template.xlsx'
npm test -- --runInBand question-excel
```

첨부 양식 규모 테스트는 원본 오류가 있으면 전체 반영 차단을 검증한 뒤, 테스트 DB 내부에서만 유효한 행을 분리해 대량 저장·재다운로드 왕복을 검증한다. 운영 API는 일부 행 반영을 지원하지 않는다.
