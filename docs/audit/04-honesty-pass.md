# Honesty pass: every claim, where it lives, whether it is true, what it becomes

Rule from the brief: when the migration is finished, every statement about privacy must be true. If a statement cannot be made true, the sentence changes. This is the inventory to work from; each row gets ticked in the final step.

Legend for "True today": **No** (false as the code stands), **Partly**, **Yes**, **Unverifiable** (a number nobody can check).

---

## 1. README.md

| Line | Current claim | True today | After migration |
|---|---|---|---|
| 3 | "An intelligent document reasoning system with a Matrix-themed interface." | Yes | keep |
| 5 | Live Demo (Vercel) and API Docs (Render) links | Yes, but both retire | remove; replace with a screenshot or short GIF of the local app |
| 11 | "Upload your private documents ... returns accurate answers with source citations." | No: citations are not shown (F2); "accurate" is unverifiable | "Upload your documents, ask questions, get answers where every source marker `[n]` points at a real passage from your files. Runs entirely on your machine." |
| 15 | "Private by design: Each session creates a fresh Pinecone vector namespace. When your session ends, your documents and conversation are deleted. Nothing is stored permanently." | No (F1, F9) | "Local by design: documents, embeddings and the search index live in `backend/data/` on your disk and are deleted when you delete them. Nothing is sent anywhere. The test that proves it is `backend/tests/test_no_egress.py` and `scripts/prove_local.sh`." |
| 16 | "Cost effective: Pay only for the tokens you use instead of $20/month" | Yes, but irrelevant after | "Free to run: no accounts, no keys, no metered tokens." |
| 17 | "Unique insights: answers derived specifically from your documents, not generic web results." | Partly (no grounding gate, F2) | keep, now backed by the refusal path |
| 21 to 25 | How it works: chunked and embedded, stored in Pinecone, "Claude (or your chosen model) generates answers", "New session = fresh start" | No | rewrite: chunk, embed with `nomic-embed-text` via Ollama, store in LanceDB on disk, hybrid retrieval, answer with your chosen local model, `[n]` citations validated against retrieved passages |
| 27 to 36 | Privacy & API keys section: keys in browser, BFF pass-through, "We don't log it, persist it", "Conversations aren't saved", "Documents are session-scoped ... deleted when the session ends", "no analytics on your queries, no transcripts written to disk, no key telemetry. The only third parties involved are the ones you explicitly choose (Anthropic, OpenAI, Pinecone)" | Mixed: keys claim Yes; BFF claim Yes; "no transcripts" Yes; "deleted when session ends" No; "third parties you choose" is true but Pinecone is not chosen by the user, it is the operator's | replace with a "What leaves your machine" section: at inference, nothing (loopback only); at install, `ollama pull` for two models and `pip`/`npm` for dependencies; Ollama's desktop app checks for updates (run `ollama serve` from a terminal to avoid that); what is on disk and where; how to wipe it |
| 38 to 47 | Tech stack badges incl. Anthropic, OpenAI, Pinecone | No after | Next.js, TypeScript, Tailwind, Python, FastAPI, Ollama, LanceDB |
| 49 | Licence MIT | Yes | keep |

## 2. DEPLOYMENT.md (tracked, though `.gitignore:107` says otherwise)

Whole file describes Railway/Render/Vercel/Pinecone setup, cost tables, and lists `RERANKER_MODEL`, `USE_RERANKER`, `USE_HYBRID_SEARCH` as variables to set (which would crash the app, F25). Line 763 links a `CLAUDE.md` that does not exist. **Action:** replace with a local-install guide (Ollama, models, venv, npm, optional Docker Compose) and a short "exposing on a LAN is an opt-in with a warning" section. Remove the `.gitignore` lines for `DEPLOYMENT.md` and `CLAUDE.md`.

## 3. CHANGELOG.md

| Line | Claim | True today | Action |
|---|---|---|---|
| 21 to 28 | 1.0.0 backend features incl. "Cross-encoder reranking (48% improvement)", "Query Rewriting", "87% code coverage" | reranker dead; rewriter dead; coverage unverifiable | leave as dated history; add a 2.0.0 entry that says what was removed and why |
| 55 to 62 | "91% recall@10", "Simple mode: ~500ms", "Uptime: 98.7%" | Unverifiable | leave in the 1.0.0 block; do not repeat anywhere live |
| 64 to 70 | 1.0.0 Security: "Input validation on all endpoints", "CSP headers", "No hardcoded credentials" | first two No (F17, F18), third Yes | 2.0.0 entry lists the review and what changed; do not edit history |
| 10 to 14 | Unreleased: multi-modal, GraphRAG, team collaboration, fine-tuning | plans | replace with: eval-gated Ollama tool loop, optional local reranker, bge-m3 preset |

## 4. Frontend UI copy

| File and line | Current | True today | After |
|---|---|---|---|
| `src/components/Settings/Settings.tsx:423` | "API keys are stored locally in your browser ... never persisted server-side and never shared with third parties." | Yes (keys are sent to the provider, which is the point) | section removed with the keys |
| `Settings.tsx:426` | "No data retention: Conversations and uploaded documents are scoped to your session and deleted when the session ends. Nothing is stored long-term on the server." | No (F9) | "Your library: documents and their index live in `backend/data/` on this machine until you delete them. Conversations live in this browser tab." |
| `src/components/Onboarding/QuickStartGuide.tsx:141` | "Complete Privacy" | No | "Runs on your machine" |
| `QuickStartGuide.tsx:144` | "Documents cleared when you start a new browser session" | No | "Documents stay in your local library until you delete them" |
| `QuickStartGuide.tsx:148` | "Temporary storage - complete privacy" | No | "Nothing leaves this computer" |
| `QuickStartGuide.tsx` steps 1 to 3 | add API key, upload, ask | keys go | install Ollama, pull models, run, upload, ask |
| `src/app/layout.tsx:13-21` | title "Agentic RAG System", keywords "Claude, Pinecone" | agentic retired | title "Morpheus, local document Q&A"; keywords updated |
| `src/lib/hooks/useBackendHealth.ts:23` | stage "Connecting Pinecone index", hint "embedding dimension 1536" | No | "Opening library" / "Loading model" |
| `src/components/AppShell/ColdStart.tsx` | narrates Render cold start | retired | narrates Ollama model load |
| `src/components/Chat/RAGModeIndicator.tsx`, `QueryInsight.tsx`, `FloatingInsightPanel.tsx` | show "agentic", "auto", complexity analysis | heuristic output shown as analysis (F24) | show mode, deep on/off, retrieved, cited, grounded, timings |
| `src/components/Chat/EmptyState.tsx` | quick prompts | check for provider mentions | keep, reword if needed |
| Provider badge in `ChatInterface.tsx:305-327` | "Claude" / "GPT" chip | retired | model name chip from Settings |
| `frontend/README.md:107` | "Agentic Mode: Claude AI decides search strategy autonomously" | No | modes rewritten |
| `frontend/README.md:193-205` | Vercel deployment section | retired | local run only |

## 5. Backend copy and metadata

| File and line | Current | After |
|---|---|---|
| `app/api/chat.py:370-418` (`/api/info`) | "Claude as autonomous research agent", "HyDE", "Auto-escalation on low confidence", "Claude-powered responses", accuracy percentages | endpoint removed; `/api/health` reports facts only |
| `app/main.py:64` | "Advanced RAG chatbot with multiple retrieval modes and streaming support" | "Local document question answering with verified citations" |
| `app/models/chat.py:14-21,29-40` | docstrings describing tiers and Claude agent | rewritten for the two modes |
| `app/rag/__init__.py:1-14` | tiered system description | rewritten |
| `app/core/morpheus_prompts.py:26` | "Cite sources with phrases like 'the code reveals...'" | replaced by the `[n]` instruction in `core/prompts.py` |
| `backend/README.md:22-27,122-125,152-154` | required keys, Pinecone troubleshooting | local setup, Ollama troubleshooting |
| `backend/.env.example` | 188 lines of cloud config incl. four keys that crash `Settings` | ~30 lines, all optional, all commented |
| `backend/TESTING.md` | describes mocking Pinecone/OpenAI | describes the offline suite and the egress tests |
| `docker-compose.yml:1-5,18-23` | "Local development stack", env_file with keys | host Ollama, loopback ports, `data/` mount |
| `CONTRIBUTING.md:26,44` | "Services: Anthropic API key, OpenAI API key, Pinecone account"; "Configure your API keys" | "Ollama with the two models"; publishing checklist from Odysseus's `SECURITY.md` (adapted) |
| `frontend/docs/REDESIGN_PROGRESS.md:14` | "driven by real `/api/health` telemetry" (meaning health data, not analytics) | reword to "health data" to avoid the word |

## 6. Claims that will be made, and what backs each

| New claim | Backing |
|---|---|
| "Runs entirely on your machine" | backend binds `127.0.0.1`; `test_no_egress`; kernel-sandboxed `prove_local.sh` |
| "Nothing is sent anywhere at inference time" | same, plus the CI network-namespace job |
| "Your documents and index never leave `backend/data/`" | temp files under `data/tmp` with `try/finally`; store path fixed; delete test greps the directory for a nonce |
| "Every citation points at a real passage" | inline validator; `test_citations`; `grounded` flag in the UI |
| "If your documents do not contain the answer, Morpheus says so instead of guessing" | refusal path with no model call; `test_pipeline` |
| "Documents are treated as data, not instructions" | guarded block, policy preamble, `test_prompts`; README says "treated as data", not "immune to injection" |
| "No accounts, no API keys" | `test_no_cloud_imports`; `.env.example` with nothing required |
| "The only network activity is at install time" | README lists exactly what: `ollama pull`, `pip`, `npm`; Ollama desktop update check noted |

## 7. Wording rules for the rewrite

- Say what the software does, in the present tense, with the file that proves it.
- No percentages without a script in the repo that produces them.
- "Private" only when paired with the mechanism ("private because it never leaves the machine"), never on its own.
- Prompt injection: "mitigated" and "made visible", never "prevented".
- No em dashes.
