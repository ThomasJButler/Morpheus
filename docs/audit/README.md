# Audit: making Morpheus's claims match its code

Written 2026-08-26 against commit `3397d0b` on `feat/localai`, before any code was changed, so the starting point is on record.

| Read | What it is |
|---|---|
| [`../../SECURITY_REVIEW.md`](../../SECURITY_REVIEW.md) | The security review: 28 findings, severity ranked, each with evidence (file:line), why it matters, what an attacker gets, the fix, and a status column that is updated as fixes land. Tool output in section 5. |
| [`01-phase0-what-is-actually-here.md`](01-phase0-what-is-actually-here.md) | The map. Request flows as built, every network call, every key, every environment variable, every dependency that can open a socket, the dead-code map, and the state of the dev machine. |
| [`02-siblings-odysseus-and-isq-agent.md`](02-siblings-odysseus-and-isq-agent.md) | What Odysseus and isq-agent do for each concern, what Morpheus takes, where it deliberately diverges and why, and the licence rule for copying. |
| [`03-migration-plan.md`](03-migration-plan.md) | Target architecture, decisions with justification (LanceDB, nomic-embed-text, qwen3.5, no sessions, no hosted demo, multi-query deep mode), where local is worse, file-by-file changes, ten implementation steps each with its verification, and the API contract after. |
| [`04-honesty-pass.md`](04-honesty-pass.md) | Every claim about privacy, locality, citations or capability, with its file and line, whether it is true today, and what it becomes. |
| [`05-proof-of-locality.md`](05-proof-of-locality.md) | The seven checks that fail if the app ever stops being local: socket guard, macOS sandbox, Linux network namespace, lsof sampler, browser assertions, static import guard, and the manual Wi-Fi-off procedure. |

Reading order for a first pass: the summary of the review, then 01, then 03. The rest is reference.

These documents are not deleted when the work is done. They are the record of what was found and why each decision was made; the review's status table is the only part that changes.
