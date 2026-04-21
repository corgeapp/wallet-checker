# Implementation Plan: Jeet Checker Frontend

## Overview

Scaffold a Vite + React + TypeScript SPA with Tailwind CSS v4, Framer Motion, and a job-polling architecture. The app submits wallet addresses to a backend API, polls for results, and renders a branded reputation score UI. Implementation proceeds in layers: project setup → types/API → state machine + hooks → components → integration wiring → tests.

## Tasks

- [x] 1. Scaffold project and configure tooling
  - Run `npm create vite@latest . -- --template react-ts` in the workspace root
  - Install dependencies: `framer-motion`, `tailwindcss@next`, `@tailwindcss/vite`, `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `fast-check`, `jsdom`
  - Configure `vite.config.ts`: add `@tailwindcss/vite` plugin, set `test.environment` to `jsdom`, add `setupFiles` pointing to `src/test/setup.ts`
  - Create `src/test/setup.ts` importing `@testing-library/jest-dom`
  - Copy `logostar.svg` into `src/assets/`
  - Place `global.css` in `src/` and import it in `main.tsx` (remove default Vite CSS imports)
  - Add Google Fonts import for Unbounded and Space Grotesk in `index.html` via `<link>` tags
  - Create `.env.example` with `VITE_API_BASE_URL=http://localhost:3000`
  - _Requirements: 5.1, 5.4, 5.5, 5.6_

- [-] 2. Define types and API service layer
  - [x] 2.1 Create `src/types/index.ts` with all shared TypeScript types
    - Define `AppState` discriminated union (`idle | submitting | polling | done | error`)
    - Define `JobStatusResponse`, `SubmitWalletRequest`, `SubmitWalletResponse`, `WalletResult`, `QueueStatus`
    - Define `ScoreCategory` type and `QueueCardProps`, `ResultCardProps`, `ErrorDisplayProps`, `InputFormProps`, `QueueStatusBannerProps` interfaces
    - _Requirements: 1.6, 2.1, 3.1_

  - [x] 2.2 Create `src/api/client.ts` with typed fetch functions
    - Export `submitWallet(address: string): Promise<SubmitWalletResponse>` — `POST /wallet`
    - Export `getJobStatus(jobId: string): Promise<JobStatusResponse>` — `GET /wallet/job/:jobId`
    - Export `getQueueStatus(): Promise<QueueStatus>` — `GET /queue/status`
    - Read base URL from `import.meta.env.VITE_API_BASE_URL`
    - Throw typed errors for non-2xx responses, distinguishing network errors from HTTP errors
    - _Requirements: 1.2, 2.1, 8.1_

  - [x] 2.3 Create `src/utils/validation.ts`
    - Export `WALLET_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/`
    - Export `validateWalletAddress(input: string): string | null`
    - _Requirements: 1.3, 1.4_

  - [x] 2.4 Create `src/utils/score.ts`
    - Export `classifyScore(score: number): ScoreCategory`
    - Export `SCORE_CATEGORY_STYLES` mapping each category to CSS class names and badge label
    - _Requirements: 3.4_

  - [ ] 2.5 Write property tests for validation and score utilities
    - **Property 2: Invalid address always rejected without API call**
    - **Validates: Requirements 1.3, 1.4**
    - **Property 9: Score classification is total and produces distinct categories**
    - **Validates: Requirements 3.4**
    - Place tests in `src/utils/__tests__/validation.test.ts` and `src/utils/__tests__/score.test.ts`

- [-] 3. Implement `usePoller` hook
  - [x] 3.1 Create `src/hooks/usePoller.ts`
    - Accept `jobId: string | null`, `onTick`, `onError` callbacks
    - Use `setInterval` at `POLL_INTERVAL_MS = 3000`
    - Track elapsed time; after `POLL_TIMEOUT_MS = 300_000` call `onError` with timeout message and clear interval
    - On network error: call `onError` with a non-fatal flag, do NOT clear interval (retry next tick)
    - On non-transient HTTP error: call `onError` with fatal flag and clear interval
    - Clear interval on unmount or when `jobId` becomes null
    - _Requirements: 2.1, 2.6, 2.7, 7.2_

  - [ ] 3.2 Write property tests for `usePoller`
    - **Property 6: Done poll response always stops polling and shows result**
    - **Validates: Requirements 2.5, 3.1**
    - **Property 7: HTTP errors on polling always stop poller and show error**
    - **Validates: Requirements 2.7**
    - **Property 10: First-poll done response skips queue and shows result immediately**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Place tests in `src/hooks/__tests__/usePoller.test.ts`; use `vi.useFakeTimers()`

- [ ] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Implement `Header` component
  - Create `src/components/Header.tsx`
  - Render `logostar.svg` as an `<img>` (or inline SVG) in the page header
  - Render tagline "Reputation is the new capital" in Space Grotesk body text
  - Apply Unbounded font to any heading text in the header
  - _Requirements: 5.4, 5.5, 5.6, 5.7_

  - [ ] 5.1 Write smoke test for `Header`
    - Assert `logostar.svg` is rendered (via `alt` or `data-testid`)
    - Assert tagline text is present in the document
    - _Requirements: 5.6, 5.7_

- [-] 6. Implement `InputForm` component
  - [x] 6.1 Create `src/components/InputForm.tsx`
    - Controlled text input bound to local state
    - On submit: call `validateWalletAddress`; if invalid, set inline error and return without calling `onSubmit`
    - Disable submit button and show spinner when `isLoading === true`
    - Display `error` prop below the input field when provided
    - Apply glassmorphism card styling, corge-orange focus ring, touch-friendly tap targets (min 44×44px)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 5.2, 5.3, 6.3, 6.4_

  - [ ] 6.2 Write property tests for `InputForm`
    - **Property 1: Valid address submission always sends correct POST body**
    - **Validates: Requirements 1.2**
    - **Property 2: Invalid address always rejected without API call**
    - **Validates: Requirements 1.3, 1.4**
    - Place tests in `src/components/__tests__/InputForm.test.tsx`

  - [ ] 6.3 Write unit tests for `InputForm`
    - Test: renders input and submit button (Req 1.1)
    - Test: submit button disabled and spinner shown when `isLoading` (Req 1.5)
    - Test: inline error displayed when `error` prop provided
    - _Requirements: 1.1, 1.5_

- [-] 7. Implement `QueueCard` component
  - [x] 7.1 Create `src/components/QueueCard.tsx`
    - Show queue position number when `pollStatus === 'queued'`
    - Show animated pulse processing indicator when `pollStatus === 'processing'` (no position shown)
    - Show non-blocking connectivity warning banner when `connectivityWarning === true`
    - Apply glassmorphism card styling and Framer Motion entrance animation
    - _Requirements: 2.2, 2.3, 2.4, 2.6, 5.2, 5.8_

  - [ ] 7.2 Write property tests for `QueueCard`
    - **Property 5: Queue position always displayed accurately across poll ticks**
    - **Validates: Requirements 2.2, 2.3**
    - Place tests in `src/components/__tests__/QueueCard.test.tsx`

  - [ ] 7.3 Write unit tests for `QueueCard`
    - Test: shows processing indicator without queue position when `pollStatus === 'processing'` (Req 2.4)
    - Test: shows connectivity warning when `connectivityWarning` is true (Req 2.6)
    - _Requirements: 2.4, 2.6_

- [-] 8. Implement `ResultCard` component
  - [x] 8.1 Create `src/components/ResultCard.tsx`
    - Display `score` and `label` prominently using Unbounded font for the score value
    - Render all additional fields from `result` payload (iterate over keys beyond `address`, `score`, `label`)
    - Apply `classifyScore` to determine visual treatment (color class, badge label, glow)
    - Wrap card in `motion.div` with entrance animation (`initial`, `animate`, `transition` props)
    - Render "Check another wallet" button that calls `onReset`
    - Apply glassmorphism card styling and Design_System shadow/glow utilities
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.2, 5.8, 5.10_

  - [ ] 8.2 Write property tests for `ResultCard`
    - **Property 8: Result_Card renders all fields from done payload**
    - **Validates: Requirements 3.2**
    - **Property 9: Score classification is total and produces distinct categories**
    - **Validates: Requirements 3.4**
    - Place tests in `src/components/__tests__/ResultCard.test.tsx`

  - [ ] 8.3 Write unit tests for `ResultCard`
    - Test: `motion.div` (or `motion.*`) props present on card wrapper (Req 3.3)
    - Test: "Check another wallet" button calls `onReset` (Req 3.5)
    - _Requirements: 3.3, 3.5_

- [x] 9. Implement `ErrorDisplay` component
  - Create `src/components/ErrorDisplay.tsx`
  - Render error message using Design_System error color tokens
  - Show "Retry" button when `recoverable === true`, calling `onRetry`
  - Show "Dismiss" button always, calling `onDismiss`
  - Apply consistent styled error panel layout
  - _Requirements: 7.1, 7.2, 7.3_

  - [x] 9.1 Write property tests for `ErrorDisplay`
    - **Property 11: All error states render through ErrorDisplay component**
    - **Validates: Requirements 7.3**
    - Place tests in `src/components/__tests__/ErrorDisplay.test.tsx`

- [x] 10. Checkpoint — Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 11. Implement `App` component — state machine and wiring
  - [x] 11.1 Create `src/App.tsx` with `AppState` state machine
    - Initialize state as `{ status: 'idle' }`
    - `handleSubmit(address)`: set `submitting`, call `submitWallet`, on 202 set `polling` with `jobId`, on error set `error`
    - `handleReset()`: set `idle`
    - `handleRetry()` / `handleDismiss()`: clear error, set `idle`
    - Pass `connectivityWarning` flag to `QueueCard` when a non-fatal poll error occurs
    - Wire `usePoller` with `jobId` from polling state; on tick update `pollStatus` and `queuePosition`; on done transition to `{ status: 'done', result }`; on fatal error transition to `{ status: 'error' }`
    - Render `<Header />`, then conditionally render `<InputForm />`, `<QueueCard />`, `<ResultCard />`, or `<ErrorDisplay />` based on `AppState.status`
    - Wrap state transitions with `AnimatePresence` from Framer Motion for exit animations
    - _Requirements: 1.6, 1.7, 2.1, 2.5, 2.6, 2.7, 3.5, 4.1, 4.2, 4.3, 7.1, 7.2, 7.4_

  - [ ] 11.2 Write property tests for App state machine
    - **Property 3: 202 response always transitions to polling with correct jobId**
    - **Validates: Requirements 1.6**
    - **Property 4: HTTP errors on submission always produce error display**
    - **Validates: Requirements 1.7**
    - **Property 12: Error dismissal always clears error state before new request**
    - **Validates: Requirements 7.4**
    - Place tests in `src/__tests__/App.test.tsx`; mock `src/api/client.ts`

  - [ ] 11.3 Write integration tests for full flows
    - Test: submit → poll queued → poll processing → poll done → ResultCard shown
    - Test: submit → first poll returns done → ResultCard shown immediately, QueueCard never rendered
    - Test: submit → poll → timeout after 5 minutes → ErrorDisplay shown with retry option
    - Test: API unreachable at submission → ErrorDisplay shown, InputForm re-enabled
    - _Requirements: 1.6, 2.1, 4.1, 7.1, 7.2_

- [ ] 12. Implement `QueueStatusBanner` component and `useQueueStatus` hook (optional — Req 8)
  - [x] 12.1 Create `src/hooks/useQueueStatus.ts`
    - Accept `enabled: boolean`
    - Fetch `GET /queue/status` on mount when `enabled`
    - Refresh every 10 seconds while `enabled` and no active job is polling
    - Return `QueueStatus | null`
    - _Requirements: 8.1, 8.2_

  - [x] 12.2 Create `src/components/QueueStatusBanner.tsx`
    - Display `queueDepth` and `activeJobs` from props
    - When `queueDepth === 0`, show "Results will be returned quickly" message (Req 8.3)
    - Mount in `App` above `MainPanel`; pass `enabled` flag (e.g. `import.meta.env.VITE_QUEUE_STATUS_ENABLED`)
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 12.3 Write unit tests for `QueueStatusBanner` and `useQueueStatus`
    - Test: fetches on mount and refreshes every 10s (Req 8.1, 8.2)
    - Test: shows "quickly" message when queue is empty (Req 8.3)
    - _Requirements: 8.1, 8.2, 8.3_

- [x] 13. Apply responsive layout
  - In `App.tsx` (or a `MainPanel` wrapper), apply Tailwind responsive classes:
    - Single-column full-width layout below `md` breakpoint (768px)
    - Centered `max-w-lg` (or similar) constrained layout at `md` and above
  - Verify `InputForm`, `QueueCard`, and `ResultCard` use `w-full` on mobile
  - Verify all interactive elements meet 44×44px minimum tap target size
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 14. Final checkpoint — Ensure all tests pass
  - Run `npx vitest --run` and confirm all tests pass.
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical milestones
- Property tests use `fast-check` and validate universal correctness properties (Properties 1–12 from design.md)
- Unit tests validate specific examples and edge cases
- The `VITE_API_BASE_URL` env variable must be set before running the app; see `.env.example`
- Tailwind v4 uses `@theme` tokens in `global.css` — no `tailwind.config.ts` needed
