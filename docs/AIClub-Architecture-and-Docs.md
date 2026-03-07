# AI Club Collaboration Platform — Architecture & Documentation

## Architecture Diagram

Below is the system architecture represented in Mermaid. Many Markdown renderers (and VS Code extensions) will render this into a visual diagram.

```mermaid
flowchart LR
  subgraph Client
    Browser[Browser / Next.js Client]
  end
  subgraph Frontend
    Next[Next.js App Router<br/>(app/*, components/*)]
    Tailwind[Tailwind CSS]
  end
  subgraph Auth[Authentication]
    FirebaseAuth[Firebase Auth]
  end
  subgraph Data[Database & Storage]
    Firestore[Firestore]
    Storage[Firebase Storage / OneDrive]
  end
  subgraph Server[Server & AI Services]
    API[Next.js Server Routes / API]
    AdminSDK[Firebase Admin SDK]
    Gemini[Gemini AI Service]
    Transcribe[Transcription / Voice Services]
  end
  subgraph External[External Services]
    OneDrive[OneDrive (Graph API)]
    NewsAPIs[arXiv / TechCrunch]
    Email[SendGrid / Email]
    CI[GitHub Actions]
  end

  Browser --> Next
  Next -->|Auth requests| FirebaseAuth
  Next -->|Reads/Writes| Firestore
  Next -->|Uploads| Storage

  API --> FirebaseAuth
  API --> Firestore
  API --> Storage
  API --> AdminSDK
  API --> Gemini
  API --> Transcribe

  OneDrive --> Storage
  NewsAPIs --> API
  Email --> API
  CI --> Next
  CI --> API

  style Client fill:#f9f,stroke:#333,stroke-width:1px
  style Frontend fill:#bbf,stroke:#333,stroke-width:1px
  style Server fill:#bfb,stroke:#333,stroke-width:1px
  style Data fill:#ffd,stroke:#333,stroke-width:1px
  style External fill:#eee,stroke:#333,stroke-width:1px

```

---

## Overview

This document describes the overall system architecture, key components, data flow, technology stack, feature mapping (traceability matrix), security & compliance considerations, and the testing plan for the AI Club Collaboration Platform.

Core goals: real-time collaboration, AI-assisted features (summaries, recommendations, team-matching), secure file handling (OneDrive integration), and role-based access.

## Core Components

- Frontend: Next.js (App Router) — UI pages live in the `app/` directory and reusable UI lives in `components/`.
- Styling: Tailwind CSS (configured via `tailwind.config.js`).
- Authentication: Firebase Auth (email/password; custom claims for RBAC).
- Database: Firestore for application state, real-time listeners, and collections (channels, messages, users, projects, polls, wiki articles).
- File Storage: OneDrive via Microsoft Graph API for primary file storage; Firebase Storage used as fallback/cache for uploads.
- Server/API: Next.js server routes (`api/*`) for server-only operations, AI calls, and privileged admin actions.
- Admin & Privileged Ops: Firebase Admin SDK (`lib/firebase/admin.ts`) using `FIREBASE_SERVICE_ACCOUNT_KEY` stored server-side.
- AI Services: Gemini (server-side key) for text generation, summarization, and recommendations; transcription/voice flows implemented in `api/meetings/*`.
- External Integrations: arXiv/TechCrunch (news ingestion), SendGrid (email digests), OneDrive (file storage).

## High-level Data Flow

1. Client (browser) renders React UI from Next.js (`app/*`).
2. User actions call the Firebase client SDK (`lib/firebase/client.ts`) for typical reads/writes and real-time listeners.
3. For AI or privileged operations, the client calls Next.js server routes (`/api/*`) which authenticate the user via Firebase ID tokens and then call external services (Gemini, OneDrive Graph, transcription APIs).
4. Server writes results back to Firestore or returns them directly for immediate UI display.
5. File uploads either go to OneDrive (preferred) via signed server operations, with metadata saved in Firestore, or to Firebase Storage when necessary.

## Deployment & Hosting

- Frontend: Vercel or Firebase Hosting (for static/resources + serverless routes). 
- Server Functions: Next.js serverless functions on Vercel or Cloud Run / Firebase Functions.
- Secrets: Use platform secret manager (Vercel Environment Variables or GCP Secret Manager) for `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_KEY`.
- CI/CD: GitHub Actions for linting, tests, builds, and deployments.

## Tools & AI Technologies

- Frameworks: Next.js (React + App Router), TypeScript, Tailwind CSS.
- Firebase: Auth, Firestore, Storage, Admin SDK.
- AI: Gemini (text generation, summarization, recommendations). Consider embeddings + vector search (Pinecone / Weaviate / Firestore approximations) for team matching and recommendation features.
- Speech/Transcription: cloud-based STT (Google Speech-to-Text or other) via `api/meetings/*` routes.
- Realtime Collaboration: Firestore listeners for presence; consider CRDT library (Yjs) for complex shared editing.
- Testing: Jest, React Testing Library, Playwright (E2E), Firebase Emulator for integration.
- Observability: Sentry, Cloud Logging, structured logs in Firestore for audit events.

## Feature Mapping (Traceability Matrix)

| Feature Area | Requirement Summary | Implementation / Files |
|---|---|---|
| Text Channels | Topic channels, real-time messaging, rich text, attachments | `components/chat/*`, Firestore `channels` + `messages`, `firestore.rules` |
| Threaded Replies | Nested threads with collapse/expand | `components/chat/ThreadPanel.tsx`, message thread subcollections |
| Mentions | `@username` & `@role` with suggestions | `components/chat/ChatInput.tsx`, notifications collection, server routes for push |
| Announcements | Admin-only channels, push notifications | `app/(dashboard)/admin/*`, push via FCM or server push routes |
| Polls | Single/multi-choice polls, real-time results | `components/chat/PollCreatorModal.tsx`, `PollRenderer.tsx`, Firestore `polls` |
| Project Spaces | Kanban, tasks, milestones | `components/projects/*` (KanbanBoard.tsx), `app/(dashboard)/projects/*` |
| Shared Boards | Collaborative whiteboards, attachments | `components/projects/CollaborativeBoard.tsx`, OneDrive metadata in Firestore |
| Real-time Editing | Multi-user editing + version history | Firestore + optional Yjs CRDT for complex docs |
| File Uploads | Datasets & papers (CSV/PDF/JSON) | Upload handlers in `api/*`, OneDrive Graph integration, validation & virus scanning on server |
| Calendar & Events | Create events, reminders, countdowns | `app/(dashboard)/calendar/*`, weekly digest `api/digest/weekly/trigger/route.ts` |
| Knowledge Base | Markdown editor, search, versions | `app/wiki/*`, Firestore `wiki` collection, optional Algolia for search |
| AI News Feed | External news ingestion, recommendations | `lib/services/newsService.ts`, `api/tech-feed/*` |
| Member Profiles | Skills, projects, links | `app/(dashboard)/members/page.tsx`, `app/(dashboard)/profile/page.tsx` |
| Team Matching | Skill complementarity & availability | `app/(dashboard)/team-match/page.tsx`, server `api/team-match/*` using embeddings |
| Auth & RBAC | Email/password, custom claims | `lib/firebase/auth.ts`, `lib/firebase/admin.ts`, `firestore.rules` |

## Security & Compliance Plan (Summary)

- Authentication: Firebase Auth with email/password and optional SSO. Roles via Firebase custom claims.
- Secrets: Keep `GEMINI_API_KEY` and `FIREBASE_SERVICE_ACCOUNT_KEY` server-side in secret manager.
- Encryption: TLS in transit; Firebase-managed encryption at rest. Use KMS for any extra encryption requirements.
- Upload safety: File type/size validation, server-side virus scanning (ClamAV or hosted service), store metadata in Firestore.
- Access Controls: Firestore security rules + server-side checks for privileged APIs.
- Privacy/GDPR: Implement data export and deletion endpoints; keep user consent records; retention policy.
- Operational: Logging for audit trail, Sentry for errors, dependency scanning and routine security reviews.

## Testing Plan (Summary)

- Unit: Jest + React Testing Library for components and `lib/*` utilities.
- Integration: Firebase Emulator + supertest for `api/*` routes and Auth flows.
- E2E: Playwright for core user journeys (signup, channel messaging, file uploads, project workflows).
- AI Tests: Mock Gemini for deterministic unit tests; integration tests validate prompt outputs and handling of edge cases (timeouts, rate-limits).
- Security Tests: Automated Firestore rules testing via Firebase Emulator; SCA and dependency scanning in CI.
- Performance: Load tests for real-time channels and AI endpoints; caching strategies for heavy operations.

## Files of Interest (quick pointers)

- `app/` — Next.js pages and layouts.
- `components/chat/*` — Chat UI components such as `ChannelList.tsx`, `ChatInput.tsx`, `MessageList.tsx`.
- `api/` — Server routes (AI, meetings, tech-feed, digest triggers).
- `lib/firebase/*` — Client and Admin Firebase helpers.
- `lib/ai/gemini.ts` — AI integration layer.
- `lib/services/newsService.ts` — News ingestion service.

## Next Steps & Deliverables

1. Export a rendered SVG/PNG of the above Mermaid diagram (if you want an image file added to the repo).
2. Export this document to PDF on request.
3. Generate CSV traceability matrix for import to other tools.

---

If you want the SVG rendered and saved in the repo, tell me and I will add `docs/architecture.svg`.
