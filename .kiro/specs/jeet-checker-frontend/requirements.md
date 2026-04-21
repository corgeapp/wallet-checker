# Requirements Document

## Introduction

The Jeet Checker is a Web3 reputation scoring frontend application built with Vite, React, Tailwind CSS, and Framer Motion. It allows users to submit a wallet address and receive a reputation score from the backend API. The UI reflects the Corge brand identity: dark charcoal canvas, glassmorphism panels, sharp orange accents, and premium Web3-native aesthetics. The application communicates with an async job-based backend — submitting a wallet triggers a queued job, which the frontend polls until results are ready.

## Glossary

- **App**: The Jeet Checker frontend application
- **User**: A person interacting with the App via a web browser
- **Wallet_Address**: An Ethereum-compatible hex address string (e.g. `0x...`)
- **Job**: A backend processing unit identified by a `jobId`, progressing through states: `queued` → `processing` → `done`
- **Job_Status**: The current state of a Job — one of `queued`, `processing`, or `done`
- **Queue_Position**: A numeric value indicating a Job's place in the processing queue when Job_Status is `queued`
- **Wallet_Score**: A numeric reputation score returned by the backend when Job_Status is `done`
- **Score_Label**: A human-readable classification label accompanying the Wallet_Score (e.g. "Jeet", "Diamond Hands")
- **API**: The existing backend REST API the App communicates with
- **Poller**: The frontend polling mechanism that calls `GET /wallet/job/:jobId` every 3 seconds
- **Result_Card**: The UI component that displays the final wallet reputation result
- **Queue_Card**: The UI component that displays queue position and processing status while waiting
- **Input_Form**: The UI component where the User enters a Wallet_Address and submits it
- **Design_System**: The Corge brand design system defined in `global.css`, including color tokens, typography, shadows, and utilities

---

## Requirements

### Requirement 1: Wallet Address Submission

**User Story:** As a User, I want to enter a wallet address and submit it for reputation checking, so that I can find out the reputation score of any wallet.

#### Acceptance Criteria

1. THE App SHALL render an Input_Form containing a text input field and a submit button on the main page.
2. WHEN the User submits the Input_Form with a valid Wallet_Address, THE App SHALL send a `POST /wallet` request with the body `{ "address": "<Wallet_Address>" }`.
3. IF the User submits the Input_Form with an empty input, THEN THE Input_Form SHALL display an inline validation error and SHALL NOT send a request to the API.
4. IF the User submits the Input_Form with a string that does not match the pattern `^0x[0-9a-fA-F]{40}$`, THEN THE Input_Form SHALL display an inline validation error message and SHALL NOT send a request to the API.
5. WHILE a submission request is in-flight, THE Input_Form SHALL disable the submit button and display a loading indicator.
6. WHEN the API responds to `POST /wallet` with HTTP 202, THE App SHALL store the returned `jobId` and transition to the polling state.
7. IF the API responds to `POST /wallet` with an HTTP error status, THEN THE App SHALL display a user-facing error message describing the failure.

---

### Requirement 2: Job Polling and Queue Status Display

**User Story:** As a User, I want to see my position in the queue and know when my wallet is being processed, so that I understand how long I need to wait.

#### Acceptance Criteria

1. WHEN the App enters the polling state, THE Poller SHALL call `GET /wallet/job/:jobId` every 3 seconds until Job_Status is `done`.
2. WHILE Job_Status is `queued`, THE App SHALL display the Queue_Card showing the Queue_Position to the User.
3. WHEN Queue_Position changes between polls, THE Queue_Card SHALL update the displayed position without a full page reload.
4. WHILE Job_Status is `processing`, THE App SHALL display the Queue_Card with a processing indicator and SHALL NOT display a Queue_Position.
5. WHEN Job_Status transitions to `done`, THE Poller SHALL stop polling and THE App SHALL transition to the result display state.
6. IF a poll request to `GET /wallet/job/:jobId` fails with a network error, THEN THE Poller SHALL retry on the next 3-second interval and SHALL display a non-blocking connectivity warning to the User.
7. IF a poll request returns an HTTP error status other than a transient network failure, THEN THE App SHALL stop polling and display a user-facing error message.

---

### Requirement 3: Result Display

**User Story:** As a User, I want to see the wallet's reputation score and label clearly presented, so that I can quickly assess the wallet's reputation.

#### Acceptance Criteria

1. WHEN Job_Status is `done`, THE App SHALL render the Result_Card displaying the Wallet_Score and Score_Label.
2. THE Result_Card SHALL display all additional wallet data fields returned in the `done` response payload.
3. WHEN the Result_Card is rendered, THE App SHALL animate the Result_Card into view using Framer Motion with an entrance transition.
4. THE Result_Card SHALL apply a visual style (color, icon, or badge) that visually differentiates score ranges or Score_Label categories.
5. WHEN the User wants to check another wallet, THE App SHALL provide a clearly labeled action to reset the Input_Form and clear the current result.

---

### Requirement 4: Cached and Duplicate Wallet Handling

**User Story:** As a User, I want instant results for previously checked wallets, so that I don't wait unnecessarily for cached data.

#### Acceptance Criteria

1. WHEN the API returns a `jobId` for a duplicate submission that maps to an already-completed Job, THE App SHALL display the Result_Card immediately without waiting for additional polls.
2. WHEN the API returns a cached result with Job_Status already `done` on the first poll, THE Poller SHALL stop immediately and THE App SHALL display the Result_Card.
3. THE App SHALL NOT display a queue waiting state for results that arrive as `done` on the first poll response.

---

### Requirement 5: Brand and Visual Design

**User Story:** As a User, I want a visually premium, Web3-native interface, so that the tool feels trustworthy and aligned with the Corge brand.

#### Acceptance Criteria

1. THE App SHALL use `#121212` (corge-charcoal) as the primary background color for the page canvas.
2. THE App SHALL apply glassmorphism styling (frosted background, backdrop blur, subtle border) to all card components including the Input_Form, Queue_Card, and Result_Card.
3. THE App SHALL use `#FF5A1F` (corge-orange) as the primary accent color for CTAs, highlights, and interactive focus states.
4. THE App SHALL render all heading text using the Unbounded font family.
5. THE App SHALL render all body and UI text using the Space Grotesk font family.
6. THE App SHALL display the `logostar.svg` logo in the page header.
7. THE App SHALL display the tagline "Reputation is the new capital" on the main page.
8. THE App SHALL apply Framer Motion animations to all major state transitions, including form submission, queue status updates, and result card entrance.
9. WHERE the User's browser supports CSS backdrop-filter, THE App SHALL render glassmorphism blur effects on card components.
10. THE App SHALL use the shadow and glow utilities defined in the Design_System for card elevation and accent highlights.

---

### Requirement 6: Responsive Layout

**User Story:** As a User, I want the application to be usable on both desktop and mobile devices, so that I can check wallet reputations from any device.

#### Acceptance Criteria

1. THE App SHALL render a single-column layout on viewports narrower than 768px.
2. THE App SHALL render a centered, max-width-constrained layout on viewports 768px and wider.
3. THE Input_Form, Queue_Card, and Result_Card SHALL each occupy the full available column width on mobile viewports.
4. THE App SHALL maintain legible font sizes and touch-friendly tap targets (minimum 44×44px) on mobile viewports.

---

### Requirement 7: Error and Edge Case Handling

**User Story:** As a User, I want clear feedback when something goes wrong, so that I know what happened and what to do next.

#### Acceptance Criteria

1. IF the API is unreachable at submission time, THEN THE App SHALL display an error message indicating the service is unavailable and SHALL re-enable the Input_Form.
2. IF the Poller has not received a `done` status after 5 minutes of polling, THEN THE App SHALL stop polling, display a timeout message, and offer the User the option to retry.
3. THE App SHALL display all error messages in a consistent, styled error component using the Design_System error color tokens.
4. WHEN an error is dismissed or the User retries, THE App SHALL clear the previous error state before initiating a new request.

---

### Requirement 8: Queue Status Overview (Optional)

**User Story:** As a User, I want to see the current global queue status, so that I can understand overall system load before submitting.

#### Acceptance Criteria

1. WHERE the queue status feature is enabled, THE App SHALL fetch `GET /queue/status` on page load and display the current queue depth and active job count.
2. WHERE the queue status feature is enabled, THE App SHALL refresh the queue status display every 10 seconds while no active Job is being polled.
3. WHERE the queue status feature is enabled and the queue is empty, THE App SHALL indicate to the User that results will be returned quickly.
