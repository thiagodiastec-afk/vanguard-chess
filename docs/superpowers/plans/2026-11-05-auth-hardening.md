# Authentication hardening implementation plan

Goal: reject revoked sessions, contain bearer credentials to same-origin API calls, and prepare App Check observation without enforcement.
Architecture: keep Firebase SDK authentication and current Firestore authorization; extract the API authentication boundary for deterministic tests. No production data migration, history rewrite, or App Check enforcement.
Execution: inline, authorized by the end-to-end request. Fresh isolated clone, branch security/auth-hardening.

- [x] Test API boundary: valid identity, revoked/disabled/expired tokens, malformed bearer and unavailable Admin. Enable verifyIdToken(token, true); return stable errors without raw SDK messages.
- [x] Test browser transport: reject external/non-API targets before token retrieval; reject redirects; retain request headers/body; refresh once only for same session. Attach optional App Check tokens; observation failure must not break valid Auth.
- [x] Add opt-in backend App Check monitoring (off by default), logging only valid/missing/invalid counts via fixed outcome labels. No enforcement setting.
- [x] Verify current tree/history without printing credentials. Document console registration, staging checks, direct Firestore revocation limitation and GitHub Support cleanup separately from code.
- [x] Run auth tests, lint, build, full engine suite, HTTP smoke, rules and dependency audit. Commit, publish branch, open draft PR and inspect CI.

Review focus: session changes during awaits, redirects and absolute URLs, distinction between expired and revoked, outage failures, no token/error-message logging, App Check must remain nonblocking.

Execution record: 23 authentication tests passed after RED/GREEN. Existing engine baseline 143/143 passed. Independent reviewer identified unbounded App Check waits; added never-settling provider regression tests (failed), then bounded both observation waits to 250 ms (passed). SDK error logs in AuthModal/Firebase initialization were removed as a low-impact credential hygiene change. No console changes or enforcement. Four moderate dependency findings remain; audit gate unchanged. Final validation and remote CI results are recorded in the PR.
