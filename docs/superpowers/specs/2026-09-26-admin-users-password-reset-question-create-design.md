# Admin Users, Password Reset, and Question Creation Design

## Summary

This change fixes the missing admin member list, completes user-driven password reset through phone verification, introduces a reusable queued notification system backed by Solapi, and restores individual question creation by reusing the existing question edit form.

The work spans two repositories:

- Backend: `jei-cbt`
- Frontend: `jei-cbt-frontend`

## Goals

1. Make `/admin/users` a working, searchable, paginated member list instead of a 404.
2. Let users reset their own password by receiving and verifying a six-digit code through Kakao Alimtalk with Solapi-managed SMS fallback.
3. Store outbound messages in a generic notification table and send them asynchronously through a type-filtered Cron batch.
4. Restore individual question creation for all seven question types currently supported by the frontend by sharing the existing edit-form UI.

## Non-goals

- Admin-triggered password reset
- Admin member editing or deletion
- Persisting the notification delivery channel; Solapi owns Alimtalk-to-SMS fallback
- Automatic retry of failed notification rows
- Invalidating existing access or refresh JWTs after a password change
- Adding Redis or another external queue
- Supporting the legacy backend-only `COMPLETION` question type in the frontend

## Admin member list

### Backend

Add an admin user module protected by `AdminAuthGuard`.

Endpoint:

```text
GET /admin/users?page=1&limit=10&keyword=홍길동
```

Behavior:

- Return only non-deleted users.
- Search `name` and `phone` using partial matching when `keyword` is present.
- Reuse the existing pagination response structure.
- Return only `id`, `name`, `phone`, and `createdAt` for each row.

### Frontend

Create the existing sidebar target `/admin/users` and follow the established admin list patterns.

The page contains:

- Member ID
- Name
- Phone number
- Registration date
- Combined name/phone search
- Page-size selection and pagination
- Loading, empty, and API-error states

No member mutation actions are included.

## Password reset data model

### `password_reset_challenge`

This table stores one password-reset phone challenge. It extends the project's base entity conventions where practical.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `BIGINT` | Primary key |
| `userId` | `BIGINT` | Foreign key to `user`; cascade on user deletion |
| `code` | `VARCHAR(6)` | Six-digit code stored as plaintext; TypeORM `select: false` |
| `codeExpiresAt` | `DATETIME` | Five minutes after creation |
| `attemptCount` | `TINYINT UNSIGNED` | Starts at zero; maximum five failed attempts |
| `verifiedAt` | `DATETIME NULL` | Set after successful code verification |
| `resetTokenHash` | `CHAR(64) NULL` | SHA-256 hash of a high-entropy reset token |
| `resetTokenExpiresAt` | `DATETIME NULL` | Thirty minutes after verification |
| `consumedAt` | `DATETIME NULL` | Set after password update |
| `revokedAt` | `DATETIME NULL` | Set when superseded or invalidated |
| `createdAt` | `DATETIME` | Creation time |
| `deletedAt` | `DATETIME NULL` | Cleanup marker |

Indexes:

- `(userId, createdAt)` for resend and hourly rate checks
- Unique index on `resetTokenHash`
- Index on `codeExpiresAt` for cleanup

The verification code is only selected by the verification query and is never returned from an API or written to logs. New user passwords continue to use the existing bcrypt hashing. No password-version column is added, so already-issued JWTs retain their existing one-hour access and seven-day refresh lifetimes.

### `notification`

The notification table is generic and is not tied only to password reset.

| Column | Type | Rules |
| --- | --- | --- |
| `id` | `BIGINT` | Primary key |
| `phone` | `VARCHAR` | Recipient number |
| `type` | `ENUM` | Initially `PHONE_VERIFICATION` |
| `payload` | `JSON` | Template variables and replacement values |
| `status` | `ENUM` | `PENDING`, `SEND`, or `FAILED` |
| `sentAt` | `DATETIME NULL` | Set after Solapi accepts the send |
| `failedAt` | `DATETIME NULL` | Set after an individual send failure |
| `reason` | `TEXT NULL` | Failure reason suitable for operations |
| `createdAt` | `DATETIME` | Creation time |
| `deletedAt` | `DATETIME NULL` | Cleanup marker |

The phone verification payload is stored exactly in the format expected by Kakao template variables:

```json
{
  "#{name}": "홍길동",
  "#{code}": "123123"
}
```

## Password reset API and flow

Endpoints:

```text
POST /auth/password-reset/request
POST /auth/password-reset/verify
POST /auth/password-reset/complete
```

### Request

1. Validate and normalize the phone number.
2. Return the same public response whether the number is registered or not.
3. For a registered user, reject requests made less than 60 seconds apart or after five requests in one hour.
4. Revoke the user's previous unconsumed challenge.
5. Generate a cryptographically random six-digit code.
6. In one database transaction, create the challenge and a `PENDING` notification.
7. Return a generic accepted response. Solapi is not called in this request.

The challenge and notification row inserts are atomic. The later notification sends are not part of this transaction.

### Verify

1. Find the newest active challenge for the phone number and explicitly select its hidden code.
2. Reject expired, revoked, consumed, or locked challenges.
3. Compare the supplied code.
4. Increment `attemptCount` after a mismatch; reject further attempts after five failures.
5. On success, set `verifiedAt`, create a high-entropy reset token, store only its SHA-256 hash, and set a 30-minute expiry.
6. Return the reset token to the browser once.

### Complete

1. Hash the supplied reset token and find its verified, active challenge.
2. Reject an expired or previously consumed token.
3. Require both `password` and `passwordConfirmation`, verify they match, and apply the current minimum-six-character policy.
4. Store the password using bcrypt.
5. Set `consumedAt` so the token cannot be reused.

Existing JWTs are deliberately not invalidated by this feature.

## Notification architecture

### Template registry

Template metadata is source-controlled in `message.constants.ts`, not environment variables.

```ts
export const MESSAGE_TEMPLATES = {
  PHONE_VERIFICATION: {
    type: NotificationType.PHONE_VERIFICATION,
    templateId: PHONE_VERIFICATION_TEMPLATE_ID,
    payload: ["#{name}", "#{code}"],
  },
} as const;
```

`PHONE_VERIFICATION_TEMPLATE_ID` is a source-controlled string constant. The user will assign the approved Solapi template ID after registering the agreed message. Until that value is assigned, runtime validation fails the individual notification with a useful reason. The same validation applies when a type has no template or its payload is incomplete.

Solapi credentials and sender/channel identifiers remain environment configuration:

```text
SOLAPI_API_KEY
SOLAPI_API_SECRET
SOLAPI_SENDER_NUMBER
SOLAPI_KAKAO_PF_ID
```

No password-reset HMAC secret or template-ID environment variable is introduced.

### Generic send service

Expose a type-filtered service operation:

```ts
notificationService.send({
  types: [NotificationType.PHONE_VERIFICATION],
});
```

It performs the following:

1. Query the oldest `PENDING` rows whose type is in `types`.
2. Load at most 50 rows per call across the supplied type set.
3. Resolve the template metadata for each row.
4. Validate every required payload key.
5. Call `SolapiMessageService.sendOne()` once per notification.
6. Set that row to `SEND` and record `sentAt` when Solapi accepts it.
7. Set that row to `FAILED`, `failedAt`, and `reason` when it fails.
8. Continue processing the remaining rows after an individual failure.

There is no transaction around the 50 sends and no batch-wide rollback. Each send and status update is independent. Failed rows are not retried automatically; a user resend request creates a new challenge and notification.

### Cron

The phone verification Cron runs every five seconds and calls the generic service with only `PHONE_VERIFICATION`. It processes at most 50 rows per run. The scheduler uses `waitForCompletion: true` so a previous run in the same application instance cannot overlap.

Future message categories can define their own Cron schedules and pass different `types` arrays to the same service.

A daily cleanup job soft-deletes password-reset challenges and notification rows that have been terminal or expired for more than 30 days. Cleanup never touches active challenges or `PENDING` notifications.

### Solapi adapter

Complete the existing `SolapiApiAdapter` using:

```ts
import { SolapiMessageService } from "solapi";
```

For each notification, call `sendOne()` with the recipient, sender, approved text, Kakao `pfId`, template ID, and payload variables. Leave SMS fallback enabled (`disableSms: false`); the application does not store or infer which final channel Solapi used.

## Kakao Alimtalk template

Proposed registered text:

```text
[재능고등학교 CBT]

#{name}님, 비밀번호 재설정을 위한 인증번호는 #{code}입니다.

인증번호는 5분간 유효합니다.
본인이 요청하지 않았다면 이 메시지를 무시해 주세요.
```

Required variables:

- `#{name}`
- `#{code}`

## Password reset frontend

Complete the existing `/auth/reset-password` route as a three-step user flow:

1. Phone number entry and request
2. Six-digit code entry and verification
3. New password and password-confirmation entry

Behavior:

- Show a five-minute verification countdown.
- Disable resend for 60 seconds.
- Keep the public response generic for unknown phone numbers.
- Do not persist the reset token outside the active page flow.
- Show field validation and actionable expired/locked-token messages.
- On successful password change, return the user to login.

## Individual question creation

The current `/admin/questions/create` page is empty, while the backend create API and the question edit UI already contain most required behavior.

### Shared form

Refactor the existing edit component into:

- A shared `QuestionForm` that owns common fields, the seven type-specific answer editors, validation, and the unsaved-changes bar
- An edit container that loads an existing question, maps it to form values, and sends PUT
- A create container that adds unit and type selection, starts with empty values, and sends POST

The shared form supports the frontend's seven current types:

- `TRUE_FALSE`
- `MULTIPLE_CHOICE`
- `MULTIPLE_CHOICE_INPUT`
- `MATCHING`
- `SHORT_ANSWER`
- `MULTIPLE_SHORT_ANSWER`
- `INTERVIEW`

Changing type during creation clears answer fields belonging to the previous type. Edit mode keeps unit and type immutable. All existing edit capabilities and validation remain available in create mode.

### Navigation and submission

- Add an `개별 등록` action to the question-list header alongside the Excel tools.
- POST the mapped create DTO.
- Change the backend create response to include the created question ID.
- Redirect to that question's edit page after success.
- Continue using the existing photo dialog on the edit page because photo mapping requires a persisted question ID.

## Error handling

- Unknown phone: generic accepted response; no challenge or notification rows
- Resend too soon or hourly limit exceeded: rate-limit error
- Wrong code: generic invalid-code error and attempt increment
- Five wrong attempts: challenge locked
- Expired code or reset token: restart the flow
- Missing message template or payload variable: fail only that notification row
- Solapi send failure: fail only that notification row and continue the batch
- Question validation error: preserve form values and show field/API feedback
- Member-list API failure: render the existing admin error state

## Verification

### Backend automated checks

- Admin user list authorization, search, pagination, and DTO exposure
- Password reset request rate limits and previous-challenge revocation
- Five-minute expiry and five-attempt lockout
- Verification success and reset-token 30-minute/one-use behavior
- bcrypt password update
- Atomic creation of challenge and notification rows
- Notification type filtering and 50-row limit
- Per-notification `SEND`/`FAILED` updates without batch rollback
- Missing template and payload failures
- Solapi adapter mocked; no real messages in automated tests
- Existing test suite and production build

### Frontend checks

- Admin member list loading, search, empty, error, and pagination behavior
- Password reset step transitions, countdowns, resend state, and validation
- Shared question form maps all seven create and edit payloads correctly
- Existing question edit behavior remains intact
- Lint and production build

### Operational verification

Real Alimtalk delivery is verified only after the approved template ID and production Solapi credentials/channel identifiers are installed. Confirm both Alimtalk receipt and Solapi-managed SMS fallback outside the automated test suite.
