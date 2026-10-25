# Security Deposit & FDR Management Portal — Software Architecture Brief

Software Architecture, Product Requirements, Security Model, Implementation Plan & AI Coding-Agent Instructions

*Working name: FDR Sentinel*

Source basis: supplied screenshots from the AICTE Approval Process Handbook 2024–2027, including Annexure-1, Annexure-2, and release-related provisions in Clause 6.46.

Purpose: give a coding agent and engineering team a precise, buildable specification — not a claim that every proposed feature is absent from the current AICTE portal.

---

## 0. Read This First

This is an implementation brief for a reliable administrative workflow system for managing institution records, security-deposit/FDR instruments, document evidence, verification, maturity monitoring, renewal/replacement history, and release requests.

Important boundary: the handbook pages establish regulatory/document requirements and parts of the approval/release process. They do not prove the full technical design or all capabilities of AICTE's current software. Treat proposed automation as a product design to validate, not as proof of a current-system deficiency.

- Do not hard-code every Annexure-1 document as mandatory for every institution or workflow. Requirements vary by application type, institution category, and process stage.
- Do not treat maturity as automatic eligibility for release.
- Do not allow AI/OCR to approve a deposit, certify a bank instrument as genuine, grant an NOC, or authorise release.
- Do not invent policy rules. Every policy rule used in a decision must be versioned, source-linked, effective-dated, and approved by an authorised policy owner.
- Build a demonstrable prototype with synthetic data and clearly labelled mock integrations if real government/bank integrations are unavailable.

## 1. Product Goal and Scope

Build a secure, auditable portal that provides one consistent view of an institution's relevant approval documents and security-deposit lifecycle, while supporting role-controlled submission, review, clearance tracking, and official decisions.

### 1.1 Core outcomes

- Institution users maintain their institution profile, submit applicable records/documents, track requests, respond to queries, and view deadlines.
- Authorised officials review submissions, compare extracted fields with declared values, record findings, request corrections, and process the workflow according to their permissions.
- The system tracks the relationship between an underlying deposit obligation and each financial instrument used to satisfy it, preserving renewal/replacement history.
- The system provides maturity reminders, outstanding-task views, and evidence-backed discrepancy flags.
- Every consequential action has an audit event and can be reconstructed later.
- The system generates a consistent release-readiness checklist and evidence package without making the legal/administrative decision automatically.

### 1.2 Explicit non-goals

- Not a banking system; does not transfer funds.
- Not a replacement for AICTE's statutory or authorised decision-making.
- Not a general-purpose ERP.
- Not a fraud-detection engine that labels institutions fraudulent based on a model score.
- Not a promise of live integration with AICTE internal systems, PGRC, Vigilance, banks, SMS gateways, or identity providers unless access is formally granted.
- Not a system that silently changes rules when an LLM produces a response.

## 2. Dashboard / Role Architecture: Two Portals, Not Three Apps

Two user-facing portals (Institution Portal and Official Operations Portal) backed by one API and one database. Inside the Official Operations Portal, use role-based navigation and permissions for processing officers, reviewers/approvers, supervisors, and administrators/auditors.

| Surface | Primary users | Main capabilities |
|---|---|---|
| A. Institution Portal | Institution owner/authorised representative; document operator | Institution profile; applicable document checklist; FDR/deposit records; upload and resubmission; requests; status tracking; maturity/renewal reminders; notifications; downloadable acknowledgements. |
| B. Official Operations Portal | Processing officer; verification/review officer; authorised approver; supervisor; auditor; system administrator | Queue management; evidence review; discrepancies; request-for-information; clearance tracking; release workflow; decision recording; reports; audit review; rule administration only for authorised policy owners. |

### 2.1 Roles and least-privilege permissions

| Role | Can do | Must not do by default |
|---|---|---|
| Institution Owner | Manage own institution users; submit/edit drafts; submit requests; see own records and status. | View other institutions; approve own submissions; alter official findings. |
| Institution Operator | Prepare drafts, upload documents, respond to queries, view permitted records. | Invite/remove owner; submit if permission not granted; view other institutions. |
| Processing Officer | Review assigned cases; inspect files/extracted fields; record checklist outcomes; request missing information; recommend next step. | Issue final decision unless separately authorised; change global rules. |
| Verifier / Clearance Officer | Record the outcome of a specific assigned verification/clearance with reference and evidence. | See unrelated cases or clearances without assignment/permission. |
| Approver / Competent Authority | Accept/reject/return a request within assigned jurisdiction; record reason and order/NOC reference. | Edit source documents or erase prior findings. |
| Supervisor | Allocate/reassign work; monitor SLA/aging; review escalations; view team-level reports. | Modify historical decisions without a correction event. |
| Auditor / Read-only Reviewer | Read authorised case history, decisions, evidence metadata, and audit events; export permitted reports. | Submit, approve, delete, or alter records. |
| System Administrator | Manage accounts, technical configuration, integrations, availability. | Automatically gain authority to make regulatory decisions. |
| Policy Administrator | Draft/version policy rules, attach sources/effective dates, submit for approval. | Publish a rule without the required approval workflow. |

Enforce permissions on the backend for every request. Hiding a button is not access control. Institution-level data isolation must be enforced in queries and, where supported, at the database policy layer.

## 3. Regulatory Evidence and Document Catalogue

Annexure-1 ("Documents to be uploaded/submitted/shown for Setting up a New Technical Institution", handbook pp. 77–80) and Annexure-2 ("Documents to be uploaded/submitted by Existing Institutions", pp. 81 onward) are approval-process document lists, not a universal list for every FDR event. Model each checklist by application type and stage.

### 3.1 Annexure-1: new technical institution — scrutiny / re-scrutiny

Section 1.1: applicant presents supporting documents in original with one copy, self-attested, to the Scrutiny Committee; documents other than the specified affidavit should be authenticated by the authorised signatory or Head of Institution. Implement as configurable guidance.

| Document / evidence | Implementation notes |
|---|---|
| Building Plan / Certificate-2 (Certificate-1) and approved Building Plan copies | Capture issuing architect/authority details; OCR is not approval. |
| Affidavit 2 on non-judicial stamp/e-stamp paper of Rs. 100, sworn before specified authority | Capture type, date, signatory, authentication. Amount/format is effective-dated config. |
| Resolution of Applicant Organization in Format 3 | Store document and resolution date/reference. |
| Occupancy/Completion Certificate / Building Licence / Form D, as applicable; or affidavit and later completion evidence | Conditional rules. |
| Valid Fire Safety Certificate issued by Competent Authority | Capture issue/expiry; alert on expiry only where validity is known. |
| Certificate 3 issued by Bank Manager regarding financial status | Own document type; not required for every release request. |
| Hard copy of complete application as uploaded to AICTE Web-Portal | Checklist item / evidence record. |
| Trust/Society/Company/PPP/BOT registration, Memorandum and Rules | Conditional on entity type. |
| Recommended Board of Governors for standalone PGDM institutions | Conditional on programme type. |
| Section 8 company MoA and Rules for non-profit objective | Conditional on entity type. |
| Land/building ownership or lease documents; lease affidavit | High-importance; support document groups and cross-document validation. |
| Private lease of land: registered lease, land conversion certificate, lessor title, encumbrance certificate, lessor resolution, sublease evidence | Conditional; not for owned land. |
| Private lease of building: approved plan, occupancy certificate, title, registered lease, fire certificate, land-use certificate, floor plans, working capital proof, bank certificate | Conditional group. |
| Audited statement of accounts for last three years | Conditional; track year coverage. |
| Minority status certificate | Optional/conditional. |
| Detailed Project Report (DPR) | Versioned. |
| High-tension line / safety undertaking or certificate | Conditional. |
| Documents for older government buildings without originals | Capture competent-authority letter. |
| Other documents specified by the handbook | Never replace an explicit checklist with this generic item. |

### 3.2 Annexure-1: Expert Visit Committee (EVC) evidence (section 1.2)

- Advertisement in at least one national daily for recruitment of Principal/Director and faculty.
- Proof of internet bandwidth in Mbps.
- Library book titles and volumes; invoices for equipment and books.
- Journal subscription details.
- Electrical load sanction.
- Architect's certificate on sewage disposal, barrier-free environment, accessible toilets, approach roads.
- Details of other institutions run by the same Trust/Society/Company.
- Video recording of facilities uploaded for advance viewing.

Associate with the EVC stage only.

### 3.3 Annexure-1: after LoA and closure/restart

Section 1.3: post-LoA faculty/staff appointments and staff data. Section 1.4: closure and starting a new institution on the same premises — university/board NOC, organisation resolution, salary sheet, RPGF/Joint FDR made with AICTE, student status, faculty/staff liability status. Section 1.5: Section 8 company registration documents. Keep as separate stage checklists; do not conflate with Clause 6.46.

### 3.4 Annexure-2: existing institutions

| Section | Documents / conditions | Product behaviour |
|---|---|---|
| 2.1 — EoA (self-disclosure) / restoration of intake | Affidavit 2 with digital signature; portal payment receipt; occupancy/completion certificate/building licence/Form D; structural stability certificate for buildings over 30 years; fire safety certificate; satellite map with lat/long; audited accounts for previous year. | Checklist by application; validate dates; flag rather than auto-reject. |
| 2.2 — NRI seats | Organisation resolution approving NRI seats. | Only for that application type. |
| 2.3 — change of site, women's institution conversion, level conversion, new programme | Annexure-1 documents where applicable; university/board NOC; organisation resolution. | Application-type checklists. |
| 2.4 — merger on same campus | Annexure-2 documents; university/board NOC; merger resolution; legal merger documents. | Link predecessor/successor; never destroy records. |
| 2.5 — supernumerary seats (OCI/foreign/Gulf) | Hostel details; Office of International Affairs; resolution. | Conditional. |
| 2.6 — increase intake/additional courses/language/FPM | Affidavit 8; faculty qualification proof; resolution. | Conditional; exception for Extended EoA. |
| 2.7 — progressive/complete closure | University/board NOC with student arrangements; salary sheet; RPGF/Joint FDR details; student status; faculty/staff liability; Affidavit 4; pending cases/charges/ragging status; closure resolution. | Separate closure workflow; no automatic eligibility. |
| 2.8–2.12 — institution/course/name/affiliation/bank-detail changes | Affidavits, NOCs, resolutions, merger-bank evidence. | Track identity and bank-detail changes with review/audit; never overwrite silently. |

### 3.5 Clause 6.46: release of security deposit — separate checklist

- Institution application/request letter for FDR/RTGS release.
- Affidavit 6 with institution and Trust/Society/Company names and FDR/RTGS details in the prescribed format.
- Copy of the FDR to be released; for RPGF, Demand Draft copy/copies and/or online security-deposit payment proof.
- Latest LoA/EoA.
- Clearance outcomes from PGRC, Vigilance Cell and other relevant cells/bureaus, as applicable.
- For FDR/RPGF, the Approval Bureau NOC after required clearances; for RTGS, the applicable sanction order.
- Any additional condition or hold, including relevant government-body/bank NOC where required.
- For progressive closure, the affiliating University/Board certificate that no students are studying there, subject to the stated maturity exception.
- For merger, the University/Board certificate that no students are studying at the child institution.
- For conversion to a Private University / Deemed University, the additional conditions in the handbook.

Affidavit 6 includes declarations about pending action/inquiries, LoA conditions, permanent site, No Admission Category, fee-refund cases, complaints under investigation, and FDR status. These are applicant declarations — record them and their evidence; never label them independently verified unless authorised verification occurred.

### 3.6 Checklist engine design

- A checklist is a versioned set of requirements keyed by application type, institution category, process stage, effective date, and conditions.
- Each requirement: stable code, display name, source reference, applicability predicate, required/optional/conditional status, acceptable evidence types, validation rules, effective-from/to, policy owner.
- Checklist states: Not started, Missing, Uploaded, Processing, Needs correction, Under review, Accepted, Rejected, Waived by authorised exception, Not applicable.
- Waivers require authorised role, reason, legal basis, timestamp, audit event.
- Never mark a document "verified" because it was uploaded or OCR succeeded.
- When a policy version changes, preserve the version applied to existing requests.

## 4. Core Data Model

PostgreSQL. Separate institution, deposit obligation, financial instrument, uploaded file, and workflow/request.

| Entity | Key fields |
|---|---|
| institutions | id; official code; legal name; type; trust/society/company; approval IDs; address; affiliation; status. |
| users | id; IdP subject; name; email/phone; active; MFA status. |
| institution_memberships | user_id; institution_id; role; status; granted_by. |
| deposit_obligations | id; institution_id; reference; policy version; required amount; start/expiry/return conditions; status; source. |
| financial_instruments | id; obligation_id; type (FDR/RPGF/RTGS/other); bank; branch; masked account ref; FDR number (sensitive); amount; issue date; maturity date; depositor; status; predecessor_instrument_id; verification state. |
| documents | id; institution; case/instrument; type; storage key; SHA-256; filename; MIME; size; uploaded_by/at; version; malware scan status; retention label. |
| document_extractions | id; document_id; extractor/version; field; value; confidence; page/coordinates/snippet; status. |
| verification_cases | id; institution_id; subject; assigned officer; status; priority reason; opened/due/closed. |
| verification_findings | id; case_id; code; severity; expected; observed; evidence; disposition; reviewer; timestamp. |
| release_requests | id; institution_id; instrument_id; type; submitted_at; status; reason; policy version; outcome; decision reference; decided_by/at. |
| clearance_records | id; release_request_id; clearance type; responsible cell; status; reference; date; evidence; remarks; recorded_by. |
| renewal_replacements | id; old/new instrument; effective date; reason; review status; documents. |
| policy_rules | id; code; version; source citation; effective dates; applicability; expression; rationale; status; approved_by/at. |
| notifications | id; recipient; channel; template; event key; delivery status; retries; sent_at; provider ref. |
| workflow_events | id; aggregate; event type; previous/new state; actor; reason; timestamp; correlation ID. |
| audit_events | id; actor; action; resource; timestamp; correlation ID; outcome; safe metadata; integrity linkage. |
| integration_jobs | id; integration; idempotency key; type; status; attempts; next retry; error code. |

### 4.1 Data integrity rules

- UUID PKs; official identifiers separate.
- NUMERIC for money, never float.
- Timestamps UTC; display Asia/Kolkata. Maturity dates as DATE.
- No hard-delete of submitted documents, decisions, or audit events.
- Transactions for multi-record state transitions.
- Optimistic concurrency on editable cases.
- FKs, check constraints, indexes, pagination.
- Replacement instruments link to predecessors; history immutable.
- Never store bank credentials, OTPs, or payment secrets.

## 5. Recommended Technology Stack (production target)

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind + shadcn/ui / Radix |
| Forms | React Hook Form + Zod |
| Server data | TanStack Query; TanStack Table |
| Charts | Recharts only where trends help |
| Backend | Python FastAPI + Pydantic |
| ORM/migrations | SQLAlchemy 2.x + Alembic |
| Database | PostgreSQL |
| Auth | OIDC provider; Supabase Auth acceptable for prototype |
| Authorisation | Backend RBAC + institution scoping; optional Postgres RLS |
| File storage | Private S3-compatible / Supabase Storage |
| Extraction | pypdf; Tesseract or managed OCR; optional OpenCV |
| Background | Worker + Postgres job table; Celery + Redis only if justified |
| Notifications | Email/SMS adapter; mock for demo |
| Reports | Server-generated PDF/CSV with permission checks |
| Testing | pytest; Vitest/RTL; Playwright |
| CI | Docker; GitHub Actions |
| Observability | Structured logs, metrics, traces with redaction |

Start as a modular monolith + PostgreSQL + background worker. No microservices, Kafka, Kubernetes, vector DBs, or LLM agent frameworks unless measured requirements justify them.

## 6. Module Boundaries

identity_access · institution_registry · policy_checklists · document_service · document_processing · deposit_registry · verification_workbench · release_workflow · renewal_monitor · notifications · reporting_audit · integration_adapters (mocks visibly labelled).

### 6.1 Logical flow

Browser → frontend → authenticated API → permission and policy checks → service → PostgreSQL transaction. Uploads via controlled endpoint or signed URL → malware scan → async processing. Workers write extractions and findings. Notifications and integrations use an outbox/job table with idempotency keys. Every state transition writes a workflow/audit event.

### 6.2 No privileged browser-to-database access

The frontend never receives a service-role key or storage master credential.

## 7. Workflows and State Machines

### 7.1 Institution document submission

1. User selects application type; backend resolves checklist version.
2. UI shows only applicable requirements, with reason and source.
3. Upload: validate type/size, store privately, checksum, schedule scan/extraction.
4. Upload status shown separately from verification status.
5. Extraction stores candidates with page/evidence/confidence; low confidence needs manual confirmation.
6. Compare declared, extracted, and on-record values; differences become review findings, not fraud accusations.
7. Submit: snapshot checklist/policy version and document versions.
8. Officer reviews, requests correction or records a reasoned outcome. All transitions audited.

### 7.2 FDR registration and monitoring

- Create the deposit obligation, then associate an instrument.
- Capture amount, instrument ID, bank/branch, issue date, maturity date, depositor, source document.
- OCR suggests; user confirms critical values; officer verifies where required.
- Instrument states: Draft, Submitted, Under review, Verified by authorised process, Needs correction, Active, Near maturity, Matured, Replaced, Release requested, Released, Rejected/On hold, Archived.
- Never infer Active/Verified from a future maturity date or OCR success.
- On replacement, link old and new instruments with effective transition and evidence.

### 7.3 Release request

1. Institution selects instrument and starts a release request.
2. Checklist from current Clause 6.46 policy plus institution conditions.
3. Validate request letter, Affidavit 6, FDR/payment evidence, latest LoA/EoA.
4. Each clearance is a separate record with status, reference, evidence, responsible cell, date.
5. States: Draft → Submitted → Completeness review → In verification → Awaiting clearance(s) → Awaiting institution response → Ready for authorised decision → Approved / Rejected / Returned / On hold → Closed.
6. "Ready for authorised decision" is not approval.
7. Only an authorised approver records the decision, with outcome, reason, order/NOC reference, timestamp.
8. Never release money, call a bank payment endpoint, or generate a purported official NOC.

### 7.4 Clearance status model

| Status | Meaning |
|---|---|
| Not requested | No clearance task created yet. |
| Pending | Requested/assigned; no recorded outcome. |
| Further information required | Additional evidence or clarification needed. |
| Cleared | Authorised person recorded a positive clearance with reference/evidence. |
| Not cleared | Authorised person recorded a negative outcome with reason. |
| Not applicable | Documented rule/authorised reviewer determined it does not apply; reason required. |
| Error / unavailable | Integration failed or source unavailable; never interpreted as cleared. |

### 7.5 Maturity and notifications

- Daily scheduled job; configurable reminder horizons (demo defaults 90, 60, 30, 7 days and maturity day), labelled as product settings, not AICTE deadlines.
- Idempotency key: instrument_id + maturity_date + reminder_type + recipient.
- Supersede stale reminders when dates are corrected.
- Notification states: queued, sent, delivered (where supported), failed, retrying.
- Escalate overdue internal tasks on configurable targets, not invented statutory deadlines.

## 8. AI/OCR: Bounded, Explainable, Optional

| Capability | Allowed | Forbidden |
|---|---|---|
| OCR / extraction | Suggest fields and evidence locations with confidence and extractor version. | Declare authenticity from extracted text. |
| Cross-document comparison | Flag mismatches with both values and evidence. | Label a mismatch as fraud. |
| Document classification | Suggest a type with confidence. | Silently assign a legally significant type at low confidence. |
| Checklist assistance | Explain a requirement via versioned rule and source. | Invent a requirement. |
| Review prioritisation | Rank by missing evidence, deadlines, unresolved issues, age. | Opaque fraud score as a decision. |
| LLM summaries | Summarise a case with source links and an "aid only" warning. | Make eligibility, clearance, approval, or release decisions. |

### 8.1 Extraction schema

field_name, extracted_value, normalized_value, confidence, document_id/version, page, snippet or bounding box, extractor name/version, timestamp, human_confirmed_by/at. Never overwrite the original or declared values.

### 8.2 Comparison logic

Deterministic normalisation (whitespace/case, bank-name aliases, numeric amounts, ISO dates, exact identifier checks). Fuzzy matching never decides legally significant identifiers; it produces a review finding.

### 8.3 Bank verification

Adapter interface for a future authorised bank API. Until then, manual verification or a mock labelled "SIMULATED — NOT A REAL BANK CHECK". A PDF, QR code, or extracted FDR number is not proof of authenticity.

## 9. API Contract Outline (production target)

`/api/v1`, OpenAPI, Pydantic validation, stable error codes, correlation IDs, pagination.

- Identity: `GET /me`, `GET /me/permissions`, `GET /institutions/{id}`
- Checklist: `GET /cases/{id}/checklist`, `GET /policies/{code}/versions`
- Documents: `POST /documents/upload-intents`, `POST /documents/{id}/complete`, `POST /documents/{id}/download-intent`
- Deposits: `GET/POST /institutions/{id}/deposit-obligations`, `GET/POST /deposit-obligations/{id}/instruments`, `POST /instruments/{id}/replacement`
- Verification: `GET /verification-cases`, `POST /verification-cases/{id}/findings`, `POST /verification-cases/{id}/request-correction`
- Release: `POST /institutions/{id}/release-requests`, `POST /release-requests/{id}/submit`, `POST /release-requests/{id}/decision`
- Clearances: `GET /release-requests/{id}/clearances`, `POST /clearances/{id}/outcome`
- Reports/audit: `GET /reports/maturity`, `GET /reports/work-queue`, `GET /audit-events`

No generic "set status" endpoint. State transitions are explicit commands validated against a state machine.

### 9.1 API safety

Rate limits; idempotency keys on submit/decision/retry; consistent errors (400, 401, 403, 404, 409, 413, 422, 429, 5xx); no stack traces or secrets in errors; permission + institution scope checks on every read/write/export/download.

## 10. Security, Privacy, Compliance

HTTPS; secure cookies; CSRF; strict CORS. MFA for privileged roles. Least privilege and separation of duties. Private storage with short-lived signed URLs. File-type allowlist, signature validation, size/page caps, malware scan. Encryption in transit and at rest; secrets in a secret manager. Redacted logs. Audit sensitive access, exports, permission/policy/clearance changes, decisions. Defined retention, legal hold, backups. Indian data protection review. Threat-model insider misuse, cross-institution leakage, forged uploads, replay, IDOR, malicious PDFs, credential theft, unauthorised exports.

## 11. Reliability and Operations

Transactions + outbox; bounded retries with backoff and jitter; idempotent jobs; health endpoints; structured logs; metrics on queue depth/job age/error rate; connection limits and timeouts; tested backups; expand-migrate-contract migrations; separate staging and production; UTC storage with Asia/Kolkata display; operator health view.

Targets (engineering, not statutory): p95 API < 500 ms; async OCR with progress; visible job status; WCAG 2.1 AA.

## 12. UI/UX Direction

Restrained public-sector/enterprise case-management UI: trust, dense but readable information, predictable navigation, error prevention.

- Neutral background, white surfaces, dark text, one primary colour, consistent semantic status colours.
- Compact left sidebar, clear titles, breadcrumbs, persistent institution/case context.
- Tables with filters, server-side pagination, sortable columns, empty/loading/error states.
- Cards only for high-value summaries. No gradients, glassmorphism, glow, blobs, decorative icons.
- No emoji icons; one icon library.
- Charts only for real questions.
- Status badges carry text.
- Grouped forms, conditional requirements explained, drafts preserved, inline validation.
- Two-column detail views with a right-side timeline/actions panel.
- Show provenance everywhere.

### 12.2 Required screens

| Portal | Screen | Elements |
|---|---|---|
| Institution | Overview | Instrument summary, requests needing action, upcoming maturity, recent cases. |
| Institution | Deposit register | ID, type, amount, dates, status, verification, obligation, history. |
| Institution | Document centre | Application checklist, upload progress, version, correction reason, status. |
| Institution | Release request wizard | Select instrument; checklist; evidence; declarations; review. |
| Institution | Request detail | Timeline, state, actions, RFIs, acknowledgement download. |
| Official | Work queue | Assigned/unassigned, age, priority reason, type, institution, status, due. |
| Official | Case workbench | Context, checklist, document viewer, extracted fields and evidence, discrepancies, comments, history. |
| Official | Instrument detail | Declared/extracted/verified values, sources, lineage, maturity, replacements. |
| Official | Release review | Checklist, clearances, findings, policy source, role-allowed actions. |
| Official | Clearance workspace | Assigned clearances, outcomes, references, evidence, timestamps. |
| Official | Reports | Maturity horizon, queue aging, missing documents, clearance aging, decisions. |
| Admin/policy | User and policy admin | Role grants, jurisdiction, policy versions, sources, two-person publish. |
| Auditor | Audit explorer | Filter by case/actor/action/time; immutable detail; authorised export. |

## 13. Testing and Acceptance

Unit tests for dates, money, checklist applicability, transitions, permissions, rule versions. Integration tests for constraints, uploads, retries, notification idempotency, release checklist. Security tests for cross-institution reads and unauthorised approval. E2E for full workflows. Document fixtures (text/scanned/rotated/corrupt/oversized/duplicate/conflicting). Failure tests. Accessibility tests.

Definition of done: real endpoints; every status maps to a backend state; every checklist item source-linked; extractions show evidence and confidence; no cross-institution access; decision endpoints enforce approver permissions; lineage preserved; idempotent reminders; audit coverage; CI passes.

## 14. Implementation Phases (production plan)

0 Reconnaissance · 1 Foundation · 2 Identity and tenancy · 3 Institution and checklist · 4 Document service · 5 Deposit registry · 6 Review workbench · 7 Release workflow · 8 Monitoring · 9 Hardening.

Agent rules: inspect first; plan files and tests per phase; small increments; never fake integrations; no secrets in code; synthetic data separate; migrations only; log ambiguity; maintain IMPLEMENTATION_STATUS.md; report per phase.

## 16. Seed Data and Demonstration Rules

- Fictional institutions, FDR IDs, documents, simulated bank/clearance responses.
- Persistent "DEMO DATA — NOT CONNECTED TO AICTE OR A BANK" notice.
- No real institution financial or personal data.
- Demo flow: upload → extracted fields → discrepancy → correction → verification → maturity alert → release request → clearance tracking → authorised decision.
- Include: one clean case, one missing-document case, one mismatch case, one pending-clearance case, one replacement-FDR history case.
- Deterministic seed data.

## 17. Open Questions / Assumptions

| Question | Safe treatment |
|---|---|
| Does the live AICTE portal already provide FDR lifecycle tracking, OCR, bank verification, or maturity alerts? | Unknown; do not claim a gap as fact. |
| Exact deposit rules per institution category and application type? | Versioned policy config reviewed against the current handbook. |
| Are clearance systems integrated or offline? | Record clearances manually or via mock adapters. |
| Mandated identity provider and deployment? | Behind interfaces/config. |
| Retention periods? | Require legal/records confirmation. |
| Official reminder intervals? | Configurable demo defaults, not statutory. |
| Official bank authenticity API? | Unknown; adapter + manual fallback. |
| Official decision and NOC/sanction format? | Store metadata; generate official formats only from an authoritative spec. |

## 19. Source Basis and Limits

- AICTE Approval Process Handbook 2024–2027 screenshots: Annexure-1 (pp. 77–80), Annexure-2 (pp. 81–84).
- Clause 6.46 and Affidavit 6 details summarised as a separate release checklist.
- Stack, schema, security, UI, API and phases are architecture recommendations, not handbook quotations.
- Verify the latest handbook, corrigenda, portal behaviour and policies before production use.
