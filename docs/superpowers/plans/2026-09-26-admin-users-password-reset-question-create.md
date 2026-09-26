# Admin Users, Password Reset, and Question Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin member-list 404, add queued Solapi phone verification for user password reset, and restore individual question creation through the existing edit-form capabilities.

**Architecture:** Add a generic notification queue whose type-filtered Cron sends up to 50 rows one at a time every five seconds, then build password reset on top of it. Add the admin user list as a conventional paginated module and refactor the question editor into a shared create/edit form across the backend and frontend repositories.

**Tech Stack:** NestJS 10, TypeORM, MySQL, Jest, Solapi 5.5, Next.js 15, React 19, SWR, Zustand, React Hook Form, Zod

**Spec:** `docs/superpowers/specs/2026-09-26-admin-users-password-reset-question-create-design.md`

## Global Constraints

- Do not commit or push implementation work; leave all changes in the working trees for user review.
- Keep tests proportional: add focused Jest coverage only for notification isolation and password-reset security behavior.
- Use `SolapiMessageService` from `solapi`; leave Solapi-managed SMS fallback enabled and do not persist a delivery channel.
- Run notification Cron every five seconds, query at most 50 `PENDING` rows matching the caller's `types`, and call `sendOne()` independently for each row.
- Store the six-digit verification code as plaintext with TypeORM `select: false`; keep user passwords bcrypt-hashed.
- Keep template metadata in `message.constants.ts`; the user supplies the approved template ID before real delivery.
- Do not add `passwordVersion`; existing JWTs retain their current lifetimes.
- Support the seven frontend question types and reuse the existing edit UI in create mode.

## Review Focus

- One notification failure must mark only that row `FAILED` and must not stop later sends; pinned by Task 1's service test.
- A notification Cron run must respect `types` and the 50-row cap; pinned by Task 1's service test.
- Expired, exhausted, or reused password-reset credentials must fail without changing a password; pinned by Task 2's service test.
- An unknown phone must receive the same public request response without creating rows; pinned by Task 2's service test.
- Switching question type during creation must not submit stale answer fields; covered by Task 5's focused manual payload check because this frontend has no unit-test runner.

---

### Task 1: Generic notification queue and Solapi batch

**Files:**
- Create: `src/common/constants/notification-type.enum.ts`
- Create: `src/common/constants/notification-status.enum.ts`
- Create: `src/entities/notification.entity.ts`
- Create: `src/repositories/notification.repository.ts`
- Create: `src/notification/message.constants.ts`
- Create: `src/notification/notification.service.ts`
- Create: `src/notification/notification.batch.ts`
- Create: `src/notification/notification.module.ts`
- Create: `src/notification/notification.service.spec.ts`
- Modify: `src/external/solapi/solapi.api.adapter.ts`
- Modify: `src/external/solapi/solapi.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Produces: `NotificationType.PHONE_VERIFICATION`, `NotificationStatus.PENDING | SEND | FAILED`
- Produces: `NotificationService.enqueue(input: { phone: string; type: NotificationType; payload: Record<string, string> }, manager?: EntityManager): Promise<Notification>`
- Produces: `NotificationService.send(input: { types: NotificationType[] }): Promise<void>`
- Produces: `SolapiApiAdapter.sendOne(input: { phone: string; templateId: string; text: string; payload: Record<string, string> }): Promise<void>`
- Produces: `MESSAGE_TEMPLATES` entries with `type`, `templateId`, `text`, and required `payload` keys

- [ ] **Step 1: Write one focused notification service spec**

Add two cases to `notification.service.spec.ts`: `send filters pending rows by requested types and caps the repository query at 50`, and `send continues after one sendOne rejection while marking each row independently`.

- [ ] **Step 2: Run the focused spec and confirm it fails**

Run: `npm test -- --runInBand src/notification/notification.service.spec.ts`

Expected: FAIL because the notification module does not exist.

- [ ] **Step 3: Add the notification persistence model and repository**

Implement the schema from the spec. Repository methods must include `createPending(...)`, `findPendingByTypes(types: NotificationType[], limit = 50)`, `markSent(id: number, sentAt: Date)`, and `markFailed(id: number, failedAt: Date, reason: string)`.

- [ ] **Step 4: Implement the template registry and Solapi adapter**

Set the phone-verification template ID constant to an empty source-controlled value until the user supplies the approved ID. Add the approved Korean message text and payload keys. Construct `SolapiMessageService` from the four Solapi environment values and call `sendOne()` with `disableSms: false`.

- [ ] **Step 5: Implement independent type-filtered sending**

`NotificationService.send({ types })` must read at most 50 oldest pending rows, validate the type metadata and payload, then `await` and update each row inside its own `try/catch` so one failure cannot abort the loop.

- [ ] **Step 6: Add the five-second batch and daily cleanup**

Add `NotificationBatch.sendPhoneVerification()` using `@Cron('*/5 * * * * *', { waitForCompletion: true })` and call `send({ types: [NotificationType.PHONE_VERIFICATION] })`. Add one daily cleanup method that removes notification rows terminal for more than 30 days; Task 2 extends the same cleanup policy to expired password challenges.

- [ ] **Step 7: Run the focused spec and backend build**

Run: `npm test -- --runInBand src/notification/notification.service.spec.ts`

Run: `npm run build`

Expected: focused spec PASS and build exit code 0.

- [ ] **Step 8: Leave a review checkpoint without committing**

Run: `git status --short` and `git diff --check` in `jei-cbt`; keep changes uncommitted.

### Task 2: Password reset backend

**Files:**
- Create: `src/entities/password-reset-challenge.entity.ts`
- Create: `src/repositories/password-reset-challenge.repository.ts`
- Create: `src/dtos/app/auth/password-reset.auth.dto.ts`
- Create: `src/app/auth/app.auth.service.spec.ts`
- Modify: `src/app/auth/app.auth.service.ts`
- Modify: `src/app/auth/app.auth.controller.ts`
- Modify: `src/app/auth/app.auth.module.ts`
- Modify: `src/repositories/user.repository.ts`
- Modify: `src/common/constants/error-code.enum.ts`

**Interfaces:**
- Consumes: `NotificationService.enqueue(...)` from Task 1 with payload keys `#{name}` and `#{code}`
- Produces: `AppAuthService.requestPasswordReset(dto: RequestPasswordResetAuthAppDto): Promise<boolean>`
- Produces: `AppAuthService.verifyPasswordReset(dto: VerifyPasswordResetAuthAppDto): Promise<{ resetToken: string }>`
- Produces: `AppAuthService.completePasswordReset(dto: CompletePasswordResetAuthAppDto): Promise<boolean>`
- Produces: `UserRepository.updatePassword(userId: number, passwordHash: string, manager?: EntityManager): Promise<void>`

- [ ] **Step 1: Write a compact password-reset service spec**

Cover four critical cases in one spec file: unknown phone returns the generic result without writes; registered request atomically creates a five-minute challenge and pending notification; five wrong attempts or expiry rejects verification; a verified 30-minute token updates a bcrypt password once and rejects reuse.

- [ ] **Step 2: Run the focused spec and confirm it fails**

Run: `npm test -- --runInBand src/app/auth/app.auth.service.spec.ts`

Expected: FAIL because password-reset methods and entity do not exist.

- [ ] **Step 3: Add the challenge entity and repository**

Implement the agreed plaintext `code` with `select: false`, attempt/expiry/revocation timestamps, SHA-256 reset-token hash, indexes, and repository operations for newest active challenge, rate checks, mismatch increment, verification, consumption, revocation, and cleanup of rows expired for more than 30 days.

- [ ] **Step 4: Add DTOs and service flow**

Validate normalized phone, six numeric code characters, reset token, minimum-six-character password, and matching confirmation. Use `crypto.randomInt` for the code and `randomBytes` for the reset token. Keep the challenge plus pending notification creation in one TypeORM transaction; do not call Solapi in the request.

- [ ] **Step 5: Expose the three auth endpoints**

Add `POST /auth/password-reset/request`, `/verify`, and `/complete`; replace the existing placeholder `/auth/reset-password/verify`. Return the same request result for registered and unregistered phone numbers.

- [ ] **Step 6: Run the focused spec and backend build**

Run: `npm test -- --runInBand src/app/auth/app.auth.service.spec.ts`

Run: `npm run build`

Expected: focused spec PASS and build exit code 0.

- [ ] **Step 7: Leave a review checkpoint without committing**

Run: `git status --short` and `git diff --check` in `jei-cbt`; keep changes uncommitted.

### Task 3: Admin member list backend and frontend

**Files:**
- Create: `src/admin/user/admin.user.controller.ts`
- Create: `src/admin/user/admin.user.service.ts`
- Create: `src/admin/user/admin.user.module.ts`
- Create: `src/dtos/admin/user/get-user-list-query.admin.dto.ts`
- Create: `src/dtos/admin/user/get-user-list.admin.dto.ts`
- Modify: `src/repositories/user.repository.ts`
- Modify: `src/app.module.ts`
- Create: `jei-cbt-frontend/src/lib/http/apis/dtos/admin/user/get-user-list.admin.dto.ts`
- Create: `jei-cbt-frontend/src/app/admin/_hooks/apis/useUsers.ts`
- Create: `jei-cbt-frontend/src/lib/store/stores/users-store.ts`
- Create: `jei-cbt-frontend/src/app/admin/(auth)/users/_components/Users.tsx`
- Create: `jei-cbt-frontend/src/app/admin/(auth)/users/_components/UsersFilter.tsx`
- Create: `jei-cbt-frontend/src/app/admin/(auth)/users/_components/UsersTable.tsx`
- Create: `jei-cbt-frontend/src/app/admin/(auth)/users/page.tsx`

**Interfaces:**
- Produces: `GET /admin/users?page&limit&keyword`
- Produces: paginated `{ id, name, phone, createdAt }` DTO rows
- Produces: `useUsers(params)` returning `users`, `totalCount`, `isLoading`, and `error`

- [ ] **Step 1: Add the protected backend list module**

Follow the existing admin unit/question pagination pattern. Extend `UserRepository` with `findAndCount(page, limit, { keyword })` using name-or-phone partial matching and excluding soft-deleted rows.

- [ ] **Step 2: Add the frontend API hook, filter store, and page**

Mirror the learn-record list structure with member ID, name, phone, and Korean-formatted registration date. Reuse existing pagination, result count, loading skeleton, empty, and error components.

- [ ] **Step 3: Verify the 404 is gone and search parameters are wired**

Run backend `npm run build` and frontend `npm run build`.

Expected: both builds exit 0 and the Next build includes `/admin/users`.

- [ ] **Step 4: Leave review checkpoints without committing**

Run `git status --short` and `git diff --check` in both repositories; keep changes uncommitted.

### Task 4: Password reset frontend

**Files:**
- Create: `jei-cbt-frontend/src/lib/http/apis/dtos/app/auth/password-reset.auth.dto.ts`
- Modify: `jei-cbt-frontend/src/lib/http/apis/app/auth.ts`
- Modify: `jei-cbt-frontend/src/schemas/app/auth.ts`
- Modify: `jei-cbt-frontend/src/app/(app)/auth/reset-password/_components/ResetPassword.tsx`

**Interfaces:**
- Consumes: Task 2's request, verify, and complete endpoints
- Produces: three-step phone, code, and new-password UI

- [ ] **Step 1: Add typed API functions and Zod schemas**

Add `requestPasswordReset`, `verifyPasswordReset`, and `completePasswordReset`; model the six-digit code and matching minimum-six-character passwords.

- [ ] **Step 2: Replace the placeholder reset component**

Implement the three-step form, a five-minute code countdown, 60-second resend lock, in-memory reset token, loading guards, field errors, expired flow reset, and successful navigation to `/auth/login`.

- [ ] **Step 3: Verify the frontend**

Run: `npm run lint`

Run: `npm run build`

Expected: no new lint errors from these files and build exit code 0.

- [ ] **Step 4: Leave a review checkpoint without committing**

Run `git status --short` and `git diff --check` in `jei-cbt-frontend`; keep changes uncommitted.

### Task 5: Shared question create/edit form

**Files:**
- Modify: `src/admin/question/admin.question.service.ts`
- Create: `jei-cbt-frontend/src/lib/http/apis/dtos/admin/question/create-question.admin.dto.ts`
- Modify: `jei-cbt-frontend/src/app/admin/_hooks/apis/useQuestions.ts`
- Modify: `jei-cbt-frontend/src/schemas/admin/question.ts`
- Create: `jei-cbt-frontend/src/app/admin/(auth)/questions/_components/QuestionForm.tsx`
- Modify: `jei-cbt-frontend/src/app/admin/(auth)/questions/[id]/_components/Question.tsx`
- Create: `jei-cbt-frontend/src/app/admin/(auth)/questions/create/_components/QuestionCreate.tsx`
- Modify: `jei-cbt-frontend/src/app/admin/(auth)/questions/create/page.tsx`
- Modify: `jei-cbt-frontend/src/app/admin/(auth)/questions/_components/Questions.tsx`

**Interfaces:**
- Produces: backend create result `{ questionId: number; message: string }`
- Produces: `QuestionFormProps = { mode: 'create' | 'edit'; initialValues: AdminQuestionFormInput; unitOptions: GetUnitAdminDto[]; onSubmit(values: AdminQuestionFormInput): Promise<boolean>; isSaving: boolean }`
- Produces: `useQuestionCreate()` posting the seven-type `CreateQuestionAdminDto`

- [ ] **Step 1: Return the created question ID from the backend**

Return the transaction's saved question ID from `AdminQuestionService.create` without changing existing answer creation semantics.

- [ ] **Step 2: Extract the existing editor UI into `QuestionForm`**

Move the current base fields, seven answer editors, validation messages, and unsaved-changes bar without visually redesigning them. Keep data fetching, DTO mapping, photo dialog, and PUT mutation in the edit container.

- [ ] **Step 3: Add create-mode fields and mapping**

Add unit and question-type selectors only in create mode, loading selectable units with `useUnits({ page: 1, limit: 1000 })`. Clear all inactive answer collections whenever the type changes, and map only the active type into `CreateQuestionAdminDto`.

- [ ] **Step 4: Wire creation and list navigation**

Implement `QuestionCreate`, call POST, redirect to `/admin/questions/{questionId}`, and add the `개별 등록` button to the list header.

- [ ] **Step 5: Perform a focused manual payload check**

In the browser or React dev flow, switch from multiple choice to true/false before submit and confirm the POST body contains only the true/false answer. Repeat one create request for another collection type such as matching.

- [ ] **Step 6: Verify both repositories**

Run backend `npm run build`, frontend `npm run lint`, and frontend `npm run build`.

Expected: all commands exit 0 and existing edit route plus create route compile.

- [ ] **Step 7: Leave review checkpoints without committing**

Run `git status --short` and `git diff --check` in both repositories; keep changes uncommitted.

### Task 6: Final targeted verification and handoff

**Files:**
- Review only; no new files expected

**Interfaces:**
- Consumes all prior task outputs
- Produces uncommitted backend and frontend diffs ready for user review

- [ ] **Step 1: Run only the two focused backend specs**

Run: `npm test -- --runInBand src/notification/notification.service.spec.ts src/app/auth/app.auth.service.spec.ts`

Expected: both suites PASS.

- [ ] **Step 2: Run final builds**

Run backend `npm run build` and frontend `npm run build`.

Expected: both builds exit 0.

- [ ] **Step 3: Inspect all diffs without committing**

Run `git diff --check`, `git status --short`, and `git diff --stat` in each repository. Confirm no secrets, generated outputs, unrelated changes, commits, or pushes were added.

- [ ] **Step 4: Hand off operational inputs**

Report the uncommitted file sets, focused test/build results, the exact Alimtalk template text, and the source constant where the user must enter the approved template ID.
