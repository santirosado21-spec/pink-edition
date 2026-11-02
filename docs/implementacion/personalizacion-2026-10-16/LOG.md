# Registro de implementación

Fecha: 16 octubre 2026, America/Mexico_City. Autorizado por «sigue». Host/builder Codex, reviewer/inspector claude-opus-5-5 high. 3 rondas de plan máximo, 2 inspecciones, 2 intentos de arreglo. Sin commits ni despliegue. Baseline HEAD 271e604a97ba41567abd109a68645bdce0f3a49d. Copias antes de editar: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/cutkind-personalization-baseline-sfs42qbz. Cambios preexistentes preservados.

Plan específico de primer incremento; el PLAN de investigación aprobado el 15 octubre no se modifica. No se pretende implementar los cinco paquetes completos en este incremento.

## Plan, ronda 1

Resultado: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-amtzult9/result.json; modelo observado: ['claude-opus-5-5']

```json
{
  "verdict": "REVISE",
  "summary": "The plan targets the right gaps. Today readProfile hides invalid or unreadable profiles as null, the worker silently drops invalid preferences, propose overwrites the current draft, collides IDs and lets the model emit photo cards, and the Editor has no try/finally. But it leaves out several real readers of the profile that sit outside its file list. One is proxy.ts, which gates every /edit and /api/jobs request in cloud mode and treats an invalid profile as missing. Others are the auth callback/confirm routes, billing-request, app/app and cuenta. Together with the /estilo \"warning only, no form\" rule, this would leave users with an invalid profile locked out, and the Editor's profile-error state could never be reached in cloud mode. Other gaps: an existsSync check in startPipeline still treats an unreadable profile as absent; the TS and Python validators disagree in ways the shared fixtures must cover; per-10-second density and existing occupied ranges are neither sent to the model nor enforced on the server; and the Playwright run has no defined way to avoid touching the real work/_profile.json. A few contract items are ambiguous: emphasis merging, counter matching, how statuses are chosen, and which profile gates propose.",
  "findings": [
    {
      "id": "R1-unlisted-readProfile-callers",
      "severity": "high",
      "path": "app/auth/callback/route.ts",
      "evidence": "Contract item 2 makes readProfile throw a typed error for invalid profiles and rethrow read errors. Grep shows callers that are not in the plan's file list and do not catch anything: app/auth/callback/route.ts:15 and app/auth/confirm/route.ts:14 (`(await readProfile()) ? \"/app\" : \"/estilo\"`), app/_lib/billing-request.ts:11, app/app/page.tsx:13 (local mode), and app/cuenta/page.tsx:13 via requireOnboarding. Example: a user whose profile row was edited directly through PostgREST (RLS allows owner update with no shape check beyond jsonb object) clicks the email magic link. readProfile throws inside the callback, the session cookie is set, but they get a 500 instead of a redirect. Billing requests return 500 instead of 409/422.",
      "fix": "Add these callers to the scope and give each a defined outcome. Auth callback/confirm should redirect invalid profiles to /estilo (with a reason flag) and show a retryable error page for infrastructure failures. billingUser should return 422 for invalid and 503 for read failures. app/app local mode should redirect invalid to /estilo and show an error on read failure. Add contract tests for each with doubles."
    },
    {
      "id": "R2-proxy-profile-gate",
      "severity": "high",
      "path": "proxy.ts",
      "evidence": "proxy.ts:33-38 reads profiles itself in cloud mode for /app, /edit/*, /cuenta and /api/jobs/* (not upload). It computes `completed = profile?.preferences && checkPreferences(...).length === 0`, so an invalid profile gets the same 409 \"Completa tu estilo\" or redirect to /estilo as a missing one. This contradicts item 1 (invalid must not become absence) and item 2's 422/503 split. It also makes 'Editor muestra el fallo de perfil sin alterar el snapshot' unreachable in cloud: /edit/[id] redirects before the Editor renders. A valid video snapshot can no longer be edited, proposed, saved or rendered because every /api/jobs/[id]/* call returns 409, so the snapshot is not 'independiente del perfil de cuenta'. The route-level ordering (draft validation before credentials) also cannot be observed in cloud, because the proxy answers first.",
      "fix": "Add proxy.ts to the scope and have it share the typed profile reader. Decide explicitly which paths an invalid profile blocks. The contract implies only new analysis/upload and billing should be blocked, while /edit/[id] and /api/jobs/[id]/{plan,propose,render} keep working on the video snapshot. Return distinct codes and messages for absent, invalid and read failure (e.g. redirect /estilo?perfil=invalido, 422). Cover this in the contract tests."
    },
    {
      "id": "R3-estilo-dead-end",
      "severity": "high",
      "path": "app/estilo/page.tsx",
      "evidence": "Item 2 says /estilo shows a visible warning and 'no formulario con defaults'. Meanwhile requireOnboarding (and proxy.ts:38) send invalid profiles to /estilo. StyleQuiz (app/_components/StyleQuiz.tsx:62) is the only writer that reaches PUT /api/profile. If /estilo shows only a warning, a cloud user with an invalid profile is redirected away from /app, /edit and /cuenta and has no in-app way to replace the profile, so they are locked out permanently. A read failure (503) on /estilo has no defined behaviour either; the server component would throw.",
      "fix": "Define the recovery path. Show the warning and the specific errors, plus an explicit action such as 'Rehacer mi estilo' that only then opens the quiz. Prefill only the fields that are individually valid, or start from DEFAULT_PREFERENCES after the user confirms. Saving through PUT replaces the row. For read failures, render a retry notice rather than a crash or a defaults form. Add a Playwright step that recovers from an invalid profile."
    },
    {
      "id": "R4-startPipeline-existsSync",
      "severity": "medium",
      "path": "app/_lib/jobs.ts",
      "evidence": "jobs.ts:257-258 passes `--preferences` only when `existsSync(at(\"work\",\"_profile.json\"))`. existsSync returns false for any stat error: EACCES on work/, ENOTDIR, ELOOP, a dangling symlink. pink_edit then runs with no preferences, so a read error silently becomes legacy behaviour, which violates item 1. The invalid case is only detected asynchronously after the upload has been written and status.json set to running, so the upload route answers 200 and the failure shows up later.",
      "fix": "In startPipeline (and the upload route before it accepts the body) use the shared typed reader. Treat ENOENT as absent, fail synchronously on invalid or read error with a concrete message, and always pass the explicit path when the file is present. Add jobs.ts startPipeline to the contract tests (EACCES, invalid, absent)."
    },
    {
      "id": "R5-ts-python-validator-divergence",
      "severity": "medium",
      "path": "src/preferences.ts",
      "evidence": "src/preferences.ts:63 detects unknown keys with `key in DEFAULT_PREFERENCES`, which also matches prototype keys. A profile like {...valid, \"constructor\":1, \"toString\":\"x\", \"__proto__\":{}} passes TS (and proxy.ts) but fails Python scripts/plan_io.py:26, which breaks 'claves desconocidas no se convierten / no se relajan'. catalog_version: JSON `1.0` parses to 1 in JS (accepted) but to float in Python, which rejects it because `type(...) is not int`. Text limits count UTF-16 units in TS (topic.length) but code points in Python, so 41–80 astral characters pass Python and fail TS.",
      "fix": "Use Object.hasOwn (or an explicit allowed-key set) in checkPreferences. Agree one rule for integer catalog_version and one length unit, and apply both in TS and Python. Add fixtures for prototype keys, __proto__, 1.0 and astral-character strings to the shared accept/reject set."
    },
    {
      "id": "R6-density-occupancy-not-specified",
      "severity": "medium",
      "path": "app/_lib/propose.ts",
      "evidence": "propose.ts:108/112 sends the model only the transcript, the catalog and preferences. It is never told which ranges the draft already occupies or which emphasis words exist. The per-10-second DENSITY limit exists only in the prompt (system(), line 42); proposalToPlan enforces only whole-video counts for 'few' and computes seconds with a hardcoded /30 fps (proposalPlan.ts:34) while propose.ts uses timeline.fps. With item 5 keeping every existing event, the model will propose into occupied spans (mass discards then get reported as degraded or no_new_elements), and accepted additions can stack on top of existing events beyond the density limit. The Editor warns at more than 4 per 10 s (Editor.tsx:141). The plan says 'límite total 60' but does not say it includes zooms, which validatePlan counts (jobs.ts:173).",
      "fix": "Specify that the prompt lists occupied ranges by word index, marked as data, and that the server enforces DENSITY per sliding 10-second window counting existing cuts, cards and backgrounds. Use timeline.fps consistently. State that the 60 budget subtracts existing cuts, cards, backgrounds and zooms. Add tests for a dense draft."
    },
    {
      "id": "R7-propose-profile-gate-ambiguous",
      "severity": "medium",
      "path": "app/api/jobs/[id]/propose/route.ts",
      "evidence": "Item 1 says an invalid profile must cause an explicit error 'antes de proponer IA', yet a valid video snapshot stays independent of the account profile. The verification calls for 'route con cero llamadas IA ante perfil/borrador inválido'. proposePlan uses only current.preferences (propose.ts:108, 112; proposalPlan.ts:33), never the account profile. A builder could read the route as also required to call readProfile and block on an invalid account profile, which contradicts snapshot independence. Or it could skip the check, and the test meaning becomes unclear.",
      "fix": "State explicitly that propose gates only on the validated draft, including draft.preferences via validatePlan, and that the account profile is not consulted (except as a separately decided proxy gate). Rename the test case to 'preferencias del borrador inválidas'."
    },
    {
      "id": "R8-playwright-isolation-unspecified",
      "severity": "medium",
      "path": "app/_lib/profile.ts",
      "evidence": "profileFile() is hardcoded to process.cwd()/work/_profile.json (profile.ts:9), and jobs.ts reads work/ from cwd as well. The Playwright step requires an 'aviso de perfil' scenario, meaning an invalid profile, while 'sin mutar perfil real' and 'no exponer rutas de prueba en producción'. Running the dev server in the repo means writing an invalid work/_profile.json, overwriting the user's real profile, and loading real jobs from work/, which the plan forbids reading. No mechanism is defined.",
      "fix": "Define the isolation concretely. For example, run Next from a temporary copy or temporary cwd with synthetic work/ fixtures. Alternatively, add a work-root override that is ignored when NODE_ENV==='production' or VERCEL is set, plus a startup assertion. Record the chosen method in LOG.md and back up and restore nothing from the real work/."
    },
    {
      "id": "R9-draft-body-unbounded-unknown-keys",
      "severity": "low",
      "path": "app/_lib/jobs.ts",
      "evidence": "The propose route will now parse a client draft. validatePlan (jobs.ts:155-222) ignores unknown keys, even though schema/edit-plan.schema.json sets additionalProperties:false. It does not bound label or meaning length or type, and the request body has no size cap. A draft carrying event keys such as `origin`/`locked` passes, is echoed back in the merged plan, and is persisted on the next save. That contradicts 'No se introduce origin/locked de cliente' and poisons any future increment that trusts those keys. A multi-megabyte draft is fully parsed in memory, and if existing labels are sent to the model (see R6) it inflates prompt cost.",
      "fix": "In the propose route, cap the body (Content-Length plus a counted read, e.g. 512 KB) before JSON.parse. Reject unknown top-level and event keys according to the schema, or strip them, and test that `origin`/`locked` are rejected. Bound label and meaning as strings of fixed length."
    },
    {
      "id": "R10-emphasis-and-status-ambiguity",
      "severity": "low",
      "path": "app/_lib/proposalPlan.ts",
      "evidence": "Item 5 says explicit emphasis is preserved exactly, including [], while item 6 says 'No sustituir palabras de énfasis ya presentes'. The second wording allows a union-add when emphasis is non-empty, the first forbids any change. proposalPlan.ts:58-64 currently replaces emphasis wholesale. Item 7 calls the status 'degraded' when every candidate is rejected for invalidity, but does not say what happens when every valid candidate is rejected for occupancy or limits, or for a mix. 'Contador con cifra literal' has no matching rule (punctuation, '1.000' vs '1,000', '30%'). 'Nuevos fondos no duplican otros fondos' does not say whether that means identical range or any time overlap.",
      "fix": "Choose and write down one rule each. Emphasis: if emphasis_word_ids is defined, return it unchanged; if undefined, the model may set it, up to MAX_EMPHASIS 40. Status precedence: no candidates → no_new_elements; every candidate invalid → degraded; valid but no room → no_new_elements with reasons. Counter: text must equal, after trimming punctuation, a digit-bearing word token inside [first_word,last_word]. Backgrounds: no time overlap with any background. Add fixtures for each."
    },
    {
      "id": "R11-absence-detection-edge-cases",
      "severity": "low",
      "path": "scripts/pink_edit.py",
      "evidence": "pink_edit.py:116 uses `load_plan(...).get(\"preferences\", {})`, then `if preferences and check_preferences(...)`. A snapshot with \"preferences\": null or {} skips validation, and line 121 then raises AttributeError on None.get, giving an opaque failure. worker.py:134 (Local) and pink_edit.py:117/139 use Path.exists(), which on Python ≥3.13 returns False for EACCES, so a read error becomes absence. readProfile (profile.ts:16-17) returns null when getUser yields no user, including auth-service errors, so an infrastructure failure looks like absence, against item 2.",
      "fix": "In the snapshot, treat the key being present with null or {} as invalid and fail with a concrete message before conform. In the adapters and pink_edit, decide absence with open()/stat() catching only FileNotFoundError. In readProfile, separate 'no session' (its own result) from getUser errors (rethrow as infrastructure errors). Add matching fixtures."
    }
  ],
  "coverage": [
    "Plan file (verified content matches the provided plan)",
    "src/preferences.ts (checkPreferences, defaults)",
    "app/_lib/profile.ts, account.ts, cloud.ts, jobs.ts (validatePlan, savePlan, startPipeline), propose.ts, proposalPlan.ts, request-security.ts, billing-request.ts",
    "app/api/profile/route.ts, app/api/jobs/[id]/propose/route.ts, app/api/jobs/[id]/plan/route.ts, app/api/jobs/upload/route.ts, app/api/jobs/route.ts",
    "app/_components/Editor.tsx (propose, history, profile fetch, busy state); StyleQuiz.tsx (initial/default handling, via grep)",
    "app/estilo/page.tsx, app/edit/[id]/page.tsx, app/app/page.tsx",
    "proxy.ts (cloud profile gate)",
    "scripts/plan_io.py (check_preferences, empty_plan, check_plan), scripts/worker.py (adapters, analyze, render, main loop), scripts/pink_edit.py (preference loading, status handling, via read and grep), scripts/place_graphics.py (card top recomputation)",
    "supabase/migrations/20261012120000_pink_ai_profiles.sql (profiles constraints/RLS)",
    "schema/edit-plan.schema.json (enum/additionalProperties, via grep)",
    "Repository-wide grep for readProfile/requireOnboarding/saveProfile/_profile.json/api/profile callers"
  ],
  "limitations": [
    "I reviewed the plan statically only. I could not run typecheck, tests, Playwright or Python, so no test results are claimed.",
    "The planned new test files (test_personalization_contract.mjs/.py) and shared fixtures do not exist yet, so I could not inspect them.",
    "I did not read app/cuenta/page.tsx, app/auth/confirm/route.ts or the full StyleQuiz.tsx; my view of how they use readProfile comes from grep lines.",
    "I did not inspect scripts/test_brand_catalog.mjs/.py, src/edit.ts types in full, or the other migrations; RLS and deployment behaviour were not verified.",
    "I did not read the graphify output; I went beyond the plan's file list using grep and reads, as the reviewer instructions require tracing callers.",
    "The pre-existing uncommitted user changes in the working tree are part of what I read; I cannot tell which lines differ from base 271e604 without git access."
  ]
}
```

Desviación: el revisor hizo búsquedas y lecturas adicionales a la lista pese al límite Graphify. El host localizó y leyó los callers adicionales por Graphify antes de incorporarlos. No se repiten búsquedas en ronda 2.

## Plan ronda2
Resultado: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-ic65v7zy/result.json
```json
{
  "verdict": "REVISE",
  "summary": "The appendix resolves the round-1 findings R1–R5, R7, R8, R10 and R11 with concrete, testable rules. Proxy, auth and billing callers are now in scope, and absent / invalid / read-failure outcomes are kept separate. /edit and /api/jobs/[id]/* run on the snapshot only. There is an explicit «Rehacer mi estilo» recovery. startPipeline and upload use the typed reader, and absence is only ENOENT. Object.hasOwn, the 1.0 and UTF-16 rules have shared fixtures, and the harness is isolated. Emphasis, counter and status precedence are defined. Two problems remain from the new text. First, the strict schema check on proposal drafts (R9) could reject plans the server itself produced or stored. That would contradict item 5's promise to keep legacy events, and the plan adds no compatibility test for it. Second, the density admission window (R6) does not say which windows must be checked, so a natural implementation would miss saturation from events that start before the candidate.",
  "findings": [
    {
      "id": "R2-1-draft-schema-strictness-vs-legacy",
      "severity": "medium",
      "path": "app/api/jobs/[id]/propose/route.ts",
      "evidence": "R9 rejects unknown top-level, event, anchor and photo keys 'conforme al esquema' and bounds label to 80 characters. The schema sets additionalProperties:false at many levels (schema/edit-plan.schema.json lines 6, 24, 98, 168, 202, 274, 349, 376, 517). The writers never enforced it: validatePlan (jobs.ts:155-222) ignores unknown keys, Python check_plan does too, and stored plans are produced by savePlan, layout_captions.py, place_graphics.py, empty_plan, the worker's insert_plan and cloudJob (which adds `version`), plus older plan versions. The Editor always sends the loaded plan as the draft. If any stored or legacy plan has a key outside the current schema, or a label longer than 80 characters, every 'Proponer' on that video fails with 400. That contradicts item 5 ('TODOS los eventos actuales se conservan exactamente, incluso legacy'), and the user's only workaround is to delete events. Nothing in the plan checks that server-produced plans pass the new draft validator.",
      "fix": "Pick one of two approaches. (a) Add a compatibility test: run the draft validator over every plan shape the server emits, namely empty_plan output, savePlan output after layout_captions/place_graphics, cloudJob output with version, and the repository's existing plan fixtures or historical fixtures if any exist, and require them all to pass. Widen the bounds (e.g. label) to match what writers actually produce. Or (b) narrow the rule: reject only explicitly forbidden keys (origin, locked) plus the size and type bounds, and return unknown legacy keys unchanged without trusting them. Whichever you choose, write it down and add a fixture of a legacy draft with extra keys."
    },
    {
      "id": "R2-2-density-window-definition",
      "severity": "low",
      "path": "app/_lib/proposalPlan.ts",
      "evidence": "R6 says new suggestions are admitted with a 'ventana móvil [inicio,inicio+10s)' counting existing and new events, but does not say which window starts get checked. If only the window starting at the candidate is checked, events starting up to 10 s before the candidate are missed. Example, with DENSITY 3 and fps 30: existing events start at frames 0, 60 and 120, and a candidate starts at 200. The window [200, 500) holds one event, so the candidate is admitted, but [0, 300) now holds four. The Editor's warning (Editor.tsx:141, windows anchored at every item start) would then flag the result the generator just produced.",
      "fix": "Specify that a candidate is admitted only if, after insertion, every window [s, s+10·fps) has at most DENSITY event starts, where s ranges over the start of every existing and accepted event, including the candidate. That matches the Editor's warning semantics. Add a test where saturation comes from events starting before the candidate."
    }
  ],
  "coverage": [
    "Full revised plan text including the 'Precisiones de revisión' appendix (SHA d7534c81…)",
    "Cross-check of each round-1 finding (R1–R11) against the appendix: R1, R2, R3, R4, R5, R7, R8, R9 (body cap and origin/locked), R10 and R11 are specified; R6 is specified as an admission guard, with the window ambiguity noted above",
    "Reuse of round-1 evidence: proxy.ts, account.ts, profile.ts, billing-request.ts, auth callers via grep, jobs.ts (validatePlan/savePlan/startPipeline), cloud.ts, propose.ts, proposalPlan.ts, Editor.tsx lines 60–400, plan_io.py, worker.py, pink_edit.py, place_graphics.py, schema/edit-plan.schema.json (grep of additionalProperties), profiles migration"
  ],
  "limitations": [
    "Following the host's instruction, I did no new Grep, Glob or Read this round. Graphify is not available in my toolchain, so no new exploration was done; findings rely on round-1 reads and the revised plan text.",
    "I could not check whether current stored plans (layout_captions.py / historical versions) actually contain keys outside the schema, so R2-1 is stated as an unverified compatibility risk that needs a test, not a confirmed break.",
    "I did not read Editor.tsx lines 1–59 (imports). Whether the esbuild harness can bundle Editor without server-only modules (e.g. if it imports from app/_lib/jobs.ts) was not verified; that would show up at harness build time.",
    "This is a static plan review only: no tests, typecheck or Playwright were run, and no results are claimed."
  ]
}
```
Disposición: ambos hallazgos aceptados.

## Plan ronda3 aprobado
Resultado: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-cfiwf_0y/result.json
SHA: 0fa0fc161b3ac9f9dc413a405c5bd210201f6dbf498fcb7aa5c3c77718e12cfd
Check: Approval matches the current plan.
```json
{
  "verdict": "APPROVED",
  "summary": "The final appendix resolves both round-2 findings. R2-1 (option b): the proposal validator now rejects only reserved provenance keys on events, wrong structure or types on known fields, and bodies over 512 KiB. Legacy extra keys and long existing labels are kept exactly and never sent to the model. Only new model labels and meanings are capped at 80/1000. Fixtures cover a legacy plan that is preserved and a forged origin/locked plan that is rejected. R2-2: the admission rule now checks every window [s, s+10·fps) anchored at the start of each existing or accepted event, including the candidate. The fixture for that is arithmetically correct: starts 0, 60, 120 plus a candidate at 200 make 4 events in [0,300), which exceeds 3; and frame 300 is excluded from [0,300). Round-1 resolutions still hold. One low-severity inconsistency remains about how far a saturated window blocks additions. It errs toward caution, fits the plan's stated conservative-mode risk, and does not block the work.",
  "findings": [
    {
      "id": "R3-1-saturation-scope-inconsistent",
      "severity": "low",
      "path": "app/_lib/proposalPlan.ts",
      "evidence": "The R6 appendix says that when existing events already exceed DENSITY, 'no se añaden entradas en la ventana saturada', meaning only that window. The R2-2 closure says to admit only if no window exceeds DENSITY after insertion, and that 'un draft previamente saturado ... bloquea adiciones'. Read literally, one window that is already over the limit makes every candidate fail anywhere in the video, because that window still exceeds after any insertion. Example: dynamic vibe (DENSITY 4) with five zooms in 0–10 s from 'Zooms automáticos', counted per R6, and a 60 s video. Every suggestion at 30–60 s is rejected and the report shows no_new_elements, even though those windows are empty.",
      "fix": "Check only the windows that contain the candidate: every s in the set of event starts (existing, accepted and the candidate) with s ≤ c < s + 10·fps, where c is the candidate's start. Admit only if none of those windows goes over DENSITY. Report windows that were already saturated as warnings without blocking candidates elsewhere. Add a fixture with a saturated 0–10 s span and a candidate at 40 s that is admitted."
    }
  ],
  "coverage": [
    "Full revised plan text (SHA 0fa0fc16…), including both appendices ('Precisiones de revisión' and 'Cierre de segunda revisión')",
    "Checked round-2 findings R2-1 and R2-2 against the closure text; both are resolved",
    "Re-checked round-1 resolutions R1–R11 against the current text; none reopened",
    "Re-checked the R2-2 fixture arithmetic and the half-open window boundary semantics",
    "Relied on round-1 source evidence: proxy.ts, profile.ts, account.ts, jobs.ts, cloud.ts, propose.ts, proposalPlan.ts, Editor.tsx, plan_io.py, worker.py, pink_edit.py, schema grep, profiles migration"
  ],
  "limitations": [
    "As the host instructed, I used no tools and explored nothing new this round, because Graphify is not available in my toolchain; the review covers only the revised text and earlier evidence.",
    "I have not verified whether any writer today emits the reserved keys (origin, locked, decision_id, profile_version) in stored plans. Round-1 reads showed none in the inspected writers, but layout_captions.py and historical plan versions were not inspected.",
    "Editor.tsx imports (lines 1–59) were never read, so whether the esbuild harness can bundle Editor is unverified.",
    "This was a static plan review: no build, tests or Playwright were run, and no results are claimed."
  ]
}
```
Disposición: R3-1 se difiere; se aplica la definición conservadora del cierre (si una ventana ya está saturada, no se admiten nuevas entradas). El aviso explicará esta limitación. No se altera el plan aprobado.

## Implementación y pruebas del host

Typecheck, catálogos TS/Python, contratos TS/Python y Playwright pasan. 22 fixtures de perfil compartidos;6testsPython nuevos y6previos;8escenarios navegador. Evidencia sintética en work/personalization-20261016 (ignorada por Git). No ejecución de IA editorial ni nube real.

La inspección visual detectó un resumen de propuesta viejo tras deshacer: se limpió también en undo/redo/drag y se agregó assert de regresión; nueva captura sin ese aviso obsoleto. Python distingue además plan.json nulo de archivo ausente y conserva el snapshot ya leído al escribirlo.

Supabase: changelog consultado; cambio TLS anunciado para10nov no cambia esta lógica. Referencia maybeSingle: https://supabase.com/docs/reference/javascript/maybesingle. React best practices aplicado para estado, refs y avisos accesibles; sin nueva dependencia de producto.

## Inspección1 (sesión fresca)
Resultado: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-33j5hzqe/result.json
Snapshot: d35921eab4dd59aed0d82c0cbf6da843d5b3331ea29c5a37ae98719973806398
Modelo observado: ['claude-opus-5-5']
```json
{
  "verdict": "REVISE",
  "summary": "This increment mostly does what the plan asks. Absent and present-but-invalid profiles are now kept apart in TS (profileFile.ts, profileState.ts, profile.ts) and in Python (plan_io.read_preferences_file/require_preferences, worker adapters, pink_edit's checks before conform). The shared fixtures give the same result in both languages for null, {}, `1.0`, bool/string versions, prototype-named keys and UTF-16 edge lengths. The proxy, auth callback/confirm, billing, /app, requireOnboarding, /estilo + ProfileRecovery and the upload/startPipeline snapshot behave as the plan requires. The propose route checks same-origin, caps the body by bytes counted while reading, and validates the draft before the API-key check and before Anthropic is created. evaluateProposal only adds suggestions and keeps every existing event exactly as it was. It also covers ID collisions, overlaps, the sliding density window, the 60-event total, photo exclusion, literal counter numbers and the precedence of present emphasis. The Editor sends the visible draft, drops late responses, uses try/finally and clears a stale report on undo/redo/edit.\n\nOne medium defect remains. The proxy and readProfile treat every getUser error that is not AuthSessionMissingError as an auth-service outage. A user whose credentials are invalid or revoked therefore gets a 503 JSON response, and on some paths this never ends, including /login. The low findings are:\n- raw JSON 503 responses on page navigations instead of a retry screen;\n- startPipeline profile/IO failures mapped to 409, with the raw fs error and its absolute path returned to the client;\n- a non-atomic local profile write that can now surface as a hard \"invalid profile\" error.",
  "findings": [
    {
      "id": "F1-auth-error-classification",
      "severity": "medium",
      "path": "proxy.ts",
      "evidence": "proxy.ts:30 returns 503 «No se pudo comprobar tu sesión» for any authError whose name is not AuthSessionMissingError. readProfile does the same (app/_lib/profile.ts:17). Supabase getUser also returns 4xx credential errors that are not service failures: an AuthApiError for a revoked/expired refresh token (refresh_token_not_found), and for a JWT whose user was deleted or whose signing key rotated (user_not_found / bad_jwt). For a revoked refresh token, auth-js removes the session and `finish` copies the clearing cookies, so the user gets one spurious 503 page or API response instead of the /login redirect or a 401. For user_not_found/bad_jwt the session is not removed, so every matched path returns 503 indefinitely, including /login (it is in the matcher and the 503 check runs before any path logic). The user cannot reach the login form until they clear cookies by hand. Plan R1 asks to separate auth-service errors from absence of a session. The code instead treats every non-missing-session error, including invalid credentials, as a service error. (This is from my knowledge of supabase-js error behaviour; I did not inspect node_modules, which was out of the authorized scope.)",
      "fix": "Return 503 only for retryable/infrastructure errors: AuthRetryableFetchError, status >= 500, or network failures (e.g. `isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500`). Treat AuthApiError 4xx and AuthSessionMissingError as 'no user', so the existing 401 / redirect-to-/login / demo branches run. At minimum, never block /login itself on an auth error. Apply the same classification in profile.ts readProfile. Add proxy tests with an AuthApiError(400 refresh_token_not_found) and a 403 user_not_found double, expecting 401 for /api/* and a /login redirect for pages."
    },
    {
      "id": "F2-proxy-503-json-on-pages",
      "severity": "low",
      "path": "proxy.ts",
      "evidence": "When auth really is unavailable (proxy.ts:30), page navigations such as /app, /cuenta, /edit/x and /login get a raw `NextResponse.json` 503 body. Plan R1 asks for a retry screen on infrastructure failures in page flows. Profile-read failures on pages correctly redirect to /estilo?perfil=lectura, but this auth branch does not branch on `/api/`.",
      "fix": "For non-/api/ paths, redirect to a retry page (or return a minimal HTML response with a «Volver a intentar» link) instead of JSON. Keep the JSON 503 for /api/*."
    },
    {
      "id": "F3-startPipeline-error-mapping-leak",
      "severity": "low",
      "path": "app/api/jobs/upload/route.ts",
      "evidence": "startPipeline (app/_lib/jobs.ts:253) calls readProfileFile() again and rethrows non-ENOENT fs errors unchanged. The upload route's catch (upload/route.ts:51-53) turns any startPipeline error into 409 `{ error: error.message }`. Scenario: the pre-check at line 16 passes, then the profile becomes unreadable (EACCES) or invalid while the body streams in. The client gets 409 instead of 503/422, with a raw message like «EACCES: permission denied, open '/Users/…/work/_profile.json'» that exposes the absolute local path. GET /api/profile and the pre-check sanitize this through profileFailure; this path does not.",
      "fix": "In the upload route's catch, check for profile failures (`error instanceof ProfileError`, or an errno code from readProfileFile) and answer with profileFailure(error) and its status (422/503). Use 409 only for the busy-engine case. Alternatively, have readProfileFile wrap non-ENOENT errors in a typed read error with a sanitized message."
    },
    {
      "id": "F4-non-atomic-local-profile-write",
      "severity": "low",
      "path": "app/_lib/profile.ts",
      "evidence": "saveProfile writes work/_profile.json directly with fs.writeFile (profile.ts:44). Before this increment, a truncated or partial file read as null. Now readProfileFile throws ProfileError («El archivo no contiene JSON válido») on any partial read. A concurrent GET /api/profile, /app render or upload during a save, or a crash mid-write, now produces a hard «tu estilo necesita revisión» state (422, redirect to /estilo?perfil=invalido, upload blocked) instead of a transient one.",
      "fix": "Write to a temp file in the same directory, then fs.rename over _profile.json (atomic replace), as heads.py already does for timelines."
    }
  ],
  "coverage": [
    "Read the dedicated increment diff /tmp/cutkind-personalization-change.diff in full (all 1696 lines), including the new tests and fixtures",
    "proxy.ts (full), app/_lib/profile.ts, profileFile.ts, profileState.ts, account.ts, billing-request.ts (via diff), request-security.ts, cloud.ts",
    "app/_lib/jobs.ts (full: validatePlan, startPipeline, readJob)",
    "app/_lib/proposalPlan.ts, propose.ts, proposalRequest.ts, app/api/jobs/[id]/propose/route.ts",
    "app/api/profile/route.ts, app/api/jobs/upload/route.ts, app/api/jobs/route.ts, app/estilo/page.tsx, app/app/page.tsx, app/edit/[id]/page.tsx, app/cuenta/page.tsx, app/auth/callback and confirm (via diff)",
    "app/_components/Editor.tsx (diff plus planRef/history call sites), ProfileRecovery.tsx, StyleQuiz.tsx (tracked diff)",
    "scripts/worker.py (full), scripts/pink_edit.py (full), scripts/plan_io.py (diff)",
    "src/preferences.ts checkPreferences vs plan_io.check_preferences, compared case by case for null/optional keys, catalog_version, UTF-16 lengths and prototype keys",
    "scripts/test_personalization_contract.mjs/.py, test_personalization_browser.mjs, test_support/load_ts.mjs, fixtures/personalization-profiles.json (read, not executed)"
  ],
  "limitations": [
    "I did not execute any test, typecheck or Playwright run. The host reports exit 0 for all of them, and I have not verified that.",
    "I did not inspect @supabase/auth-js in node_modules (outside the authorized scope). F1 relies on known supabase-js behaviour: refresh_token_not_found, user_not_found and bad_jwt come back as AuthApiError, and only a missing session comes back as AuthSessionMissingError.",
    "Because of the Graphify-only rule I could not grep for other callers of startPipeline('prepare') or other /api/jobs/<x> routes. If some other route under /api/jobs/<x> creates new videos, it would skip the proxy's onboarding gate because of the existingVideo exemption; I could not confirm whether such a route exists.",
    "I did not inspect cloud RLS, the deployed Supabase, Next SSR behaviour or the real Anthropic API, all out of scope per the plan. The browser harness simulates navigation, preview and APIs.",
    "The deferred R3-1 decision (a draft that is already saturated blocks all additions) and the excluded v2/memory/MP4 work were not treated as defects, per the host's instructions."
  ]
}
```
Disposición: F1-F4 aceptados. Además el host reprodujo .5→5 aceptado incorrectamente; se corrige coincidencia numérica completa. Ninguna modificación durante inspección; cambios siguientes requieren inspección fresca2.

## Correcciones tras inspección1

F1-F4 corregidos y probados; comparación numérica completa añadida. Fuentes oficiales de Auth consultadas (links en INSPECCION-2.md). Typecheck y contratos pasan; no cambios UI posteriores al último Playwright. Segunda inspección requerida, fresca, mismo modelo Opus5.5 high.

## Inspección final 2 — cierre

Claude Opus 5.5 high, sesión fresca 9b937e56-1fd0-4cd8-b7a5-c1c2274c24ca, APPROVED, 254.85 segundos. Modelo observado: claude-opus-5-5.

Plan SHA256: `0fa0fc161b3ac9f9dc413a405c5bd210201f6dbf498fcb7aa5c3c77718e12cfd`. Snapshot SHA256: `ef099e9f62111b540e3daf684b22c419d411a4e93ee42ac438952aeea7597687`. Ningún archivo del snapshot cambió durante la inspección ni antes de registrar este cierre; 30 archivos del incremento verificados por SHA256.

Respuesta completa del inspector:

```json
{
  "verdict": "APPROVED",
  "summary": "I found no high or medium defects in this increment's current code. The plan's contract points are met in the code I read:\n- Profile handling: an absent file or row is distinct from an invalid one (null, {}, unknown or reserved keys, broken JSON) and from a read failure. ProfileError maps to 422 and ProfileReadError to 503. TS and Python share the fixtures, and the Python and TS validators agree on every case I checked, including UTF-16 lengths and catalog_version 1.0, true and \"1\".\n- Engine paths: readProfileFile is called before the upload body is read and again in startPipeline before spawn, and the snapshot is written to the job folder. pink_edit validates the requested file and the stored snapshot (by key presence) before stage('conform'), and a missing explicit path fails. The worker's adapters reject a present null.\n- Proposal route: same-origin is checked first. The body is limited to 512 KiB (Content-Length plus counted read). Reserved provenance keys are rejected, and draftShapeErrors and validatePlan (including preferences) run before the ANTHROPIC_API_KEY check. A missing body falls back to the stored plan.\n- evaluateProposal: purely additive. It copies the arrays without mutating the original and keeps existing emphasis (including []). New IDs are checked against every group including zooms, and photo is excluded. Each candidate is checked for range, take crossing, enums, label ≤80 and meaning ≤1000, and counters must match a whole numeric token. Limits count existing events, the 60 cap includes zooms, density uses half-open windows at the timeline fps, and new backgrounds and cuts/cards cannot overlap. The report status order matches R10.\n- Editor: takes a planRef snapshot, discards late responses, uses try/finally, and clears a stale report on edit, undo and redo. Profile errors show as a persistent alert.\n- Proxy: skips the account profile for /edit/[id] and /api/jobs/[id]/*, returns 409/422/503 elsewhere, and treats an invalid session differently from an auth outage.\n- ProfileRecovery: only opens StyleQuiz after an explicit click and offers only a retry for read failures.\n\nThree low, non-blocking items remain. The billing endpoint returns 401 instead of 503 during an auth outage (and requireAccount ignores auth errors; impact only in a narrow race). Raw non-JSON errors can reach the editor's alert. Python file-read errors are not sanitized.",
  "findings": [
    {
      "id": "L1-billing-auth-outage",
      "severity": "low",
      "path": "app/_lib/billing-request.ts",
      "evidence": "billingUser (line 10) destructures only data.user from getUser() and ignores `error`. /api/billing/* is not in the proxy.ts matcher, so nothing earlier converts an auth-service failure into a 503. With AuthRetryableFetchError (network) or a 5xx/429, user is null and the checkout and portal routes answer 401 'Inicia sesión.' instead of 503. This contradicts R1 ('Auth-service error se distingue de ausencia de sesión'; 'Billing responde 422/503'). The same pattern is in app/_lib/account.ts requireAccount (line 8), which redirects to /login on an outage. For pages the proxy normally returns its HTML 503 first, so there the impact is only a narrow race.",
      "fix": "Destructure `error` from getUser(). If error && !invalidSession(error), return a 503 'No se pudo comprobar tu sesión' in billingUser, and throw (or show a retry screen) in requireAccount instead of redirecting to /login. Add a double for AuthRetryableFetchError to the billing test."
    },
    {
      "id": "L2-editor-nonjson-profile-error",
      "severity": "low",
      "path": "app/_components/Editor.tsx",
      "evidence": "The profile effect calls `await response.json()` before checking response.ok. If /api/profile returns a non-JSON body (for example a Next 500 HTML page or a gateway error), json() throws a SyntaxError. Its raw message (\"Unexpected token '<'…\") is then shown in the role=alert notice in place of a readable profile-failure message.",
      "fix": "Parse with `.json().catch(() => ({}))`, or catch parse errors and fall back to 'No se pudo cargar tu estilo.' when body.error is missing."
    },
    {
      "id": "L3-python-read-error-message",
      "severity": "low",
      "path": "scripts/plan_io.py",
      "evidence": "read_preferences_file only converts FileNotFoundError. Other OSErrors such as PermissionError or IsADirectoryError, and UnicodeDecodeError from read_text, propagate with their raw text, e.g. \"[Errno 13] Permission denied: '/Users/.../preferences-snapshot.json'\". pink_edit's __main__ writes str(error) into status.json, which the web shows to the user, and worker.run_engine forwards it as the job error. The TS side was sanitized under F3, but the Python side was not. Failing is correct here; only the message leaks a local path.",
      "fix": "Catch OSError and UnicodeDecodeError in read_preferences_file (after the FileNotFoundError branch) and raise a ValueError with a fixed message such as 'No se pudo leer el archivo de preferencias.', chaining the original exception for the log."
    }
  ],
  "coverage": [
    "Read in full: app/_lib/profileState.ts, profileFile.ts, proposalRequest.ts, account.ts, billing-request.ts, profile.ts, proposalPlan.ts; app/_components/ProfileRecovery.tsx; app/auth/confirm/route.ts; app/_lib/request-security.ts; app/cuenta/page.tsx; proxy.ts; app/api/profile/route.ts; app/api/jobs/route.ts; app/api/jobs/[id]/propose/route.ts; app/api/billing/checkout/route.ts; scripts/pink_edit.py; scripts/fixtures/personalization-profiles.json; scripts/test_personalization_contract.mjs; scripts/test_personalization_contract.py",
    "Read partially: app/_lib/jobs.ts lines 130-240 (checkPlan, validatePlan, savePlan); scripts/worker.py lines 55-284 (adapters, analyze, render, process); scripts/plan_io.py lines 1-60 (check_preferences)",
    "From the tracked diff: Editor.tsx propose/profile/undo/redo/live changes, propose.ts prompt and zod enum, upload route, app/app/page.tsx, edit/[id]/page.tsx, estilo/page.tsx, auth/callback, src/preferences.ts checkPreferences, plan_io read_preferences_file/require_preferences/empty_plan",
    "Targeted greps inside authorized files: Editor.tsx (planRef/setPlan/busy flows), BillingActions.tsx (401 handling), test_personalization_browser.mjs (no product routes, no work/ access)",
    "Cross-checked TS↔Python validator parity for optional keys, null values, booleans, the catalog_version 1.0 float, UTF-16 lengths and prototype-named keys",
    "Traced the stale-response guard against every plan mutation path in Editor (change, live, undo, redo, addPhoto, save)"
  ],
  "limitations": [
    "I did not run any test, typecheck or Playwright. The pass results come from the host's report and I have not verified them.",
    "No Glob or Grep outside the authorized paths, per the Graphify rule. I could not list every route under app/api/jobs/* or every startPipeline('prepare') caller, so a new-video-creating route under /api/jobs/<segment> (which the proxy would skip for the profile check) or another prepare caller can't be ruled out.",
    "Did not read app/_lib/cloud.ts, app/_components/StyleQuiz.tsx in full, scripts/test_support/load_ts.mjs, the full body of scripts/test_personalization_browser.mjs, the dedicated diff at /tmp/cutkind-personalization-change.diff or the baseline copies. Changes attributable to earlier user work (branding, transcription, photos, timeline-from) were treated as out of scope.",
    "Could not verify real Supabase auth-js error classes and statuses at runtime, RLS, deployed proxy behaviour or real Anthropic responses. I relied on code reading and the host's cited sources.",
    "Did not read .env*, work/, public/client/, media or transcripts, as instructed."
  ]
}
```

Disposición del host: se acepta el veredicto APPROVED con tres observaciones low pendientes. L1 se difiere como endurecimiento de errores de auth en billing/requireAccount; la separación de errores de perfil sí está implementada, pero no se afirma cobertura completa de indisponibilidad de auth en todos los callers. L2 se difiere como mejora de mensaje ante respuesta HTML/no JSON. L3 se difiere como sanitización adicional de errores de archivo en Python. Son limitaciones conocidas, no corregidas ni probadas como resueltas. No se cambió código después de la inspección; sólo documentación de cierre.

Presupuesto consumido: tres revisiones de plan, dos inspecciones frescas, una ronda de correcciones de código. Codex es autor del incremento y ejecutó las pruebas; Claude inspeccionó código sin ejecutar tests. Se mantiene R3-1: densidad existente excesiva bloquea toda nueva adición. Las limitaciones de nube, Next SSR y MP4 permanecen. No commit, push ni despliegue. Graphify actualizado: 26.432 nodos, 86.727 relaciones y 744 comunidades; advertencias del parser registradas fuera del alcance del incremento.
