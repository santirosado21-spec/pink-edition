# Revisión del plan Fran → producción

Host/planificador: Codex. Revisor solicitado: Claude Opus5.5 high. Máximo2rondas. Alcance: plan y plantillas; sin implementación, compras ni subida de medios. Fuentes públicas verificadas y rutas de código localizadas con graphify.


## Round 1
Result: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-9lf71voh/result.json

```json
{
  "verdict": "REVISE",
  "summary": "The plan holds together as a staged plan. It keeps measurement apart from purchasing, keeps technical success apart from aesthetic approval, and treats autonomy apart from assisted editing. It also names the known worker and queue gaps: single worker, startup requeue by name, prepare-only analysis, and cloud proposals turned off. It still needs revision on five material points. (1) Brand isolation: in the current code, the editorial profile belongs to the user account (owner_id), or comes from one global local file. Videos from several of Fran's clients under one account would share a style. The planned cross-client test could pass falsely if it only compares two accounts. (2) The existing local cap for the Anthropic comparator is 5 calls and US$5. The plan's design needs at least 10 calls, but it never says so or asks for that cap to be raised. (3) The intake template has no field for the original recording or session, so the separation by recording that the plan requires for the development and evaluation sets cannot be checked. (4) The graphics catalog and the default style are built for health content and lean toward dense graphics. The plan does not account for this, so the 16/20 gate could be met with captions-only output on clients where the catalog does not fit. (5) The current cloud constraints (45 MB per file and a lossy re-encode of the final render) are not resolved before Fran's originals or commercial deliveries depend on them. The remaining findings are minor: human review load, how retries and repairs add up, the Ollama host and model tags, blinding, and template fields.",
  "findings": [
    {
      "id": "F1-brand-profile-keyed-by-owner",
      "severity": "high",
      "path": "scripts/worker.py",
      "evidence": "worker.py:206 `store.get_preferences(video[\"owner_id\"])` and worker.py:75 `profiles?user_id=eq.{owner_id}` apply one profile per account to every video. app/_lib/profile.ts:20,40 reads and upserts profiles with onConflict user_id, so there is one row per user. Locally, app/_lib/jobs.ts:256 `readProfileFile()` loads a single global profile for every prepare run. Scenario: the user uploads clips from client A and client B under their own account. Both get the same preferences, and any rule learned for A applies to B. That breaks the plan's 'No mezclar aprendizaje entre clientes' and 'Separar perfiles y referencias por cliente'. The planned check 'Probar acceso cruzado entre dos clientes: debe denegarse' can pass while brands still mix, because isolation by owner says nothing about brands inside one account. 'Si Fran sube directamente' also needs Fran's account to share access with the user, and owner-only ownership does not support that.",
      "fix": "Add an explicit prerequisite to Etapas 1–4. Introduce a client/brand entity, link each video to a brand_id, and key profiles and rules by brand, with a profile snapshot taken per job. In the local lab, pass each clip's brand profile snapshot explicitly instead of the global profile file. Define the cross-client test as two brands under the same account and also two separate accounts, covering profile, rules, references, storage paths and signed URLs. Describe the shared-access model needed before Fran can upload directly."
    },
    {
      "id": "F2-claude-comparator-exceeds-cap",
      "severity": "medium",
      "path": "app/_lib/editorAi.ts",
      "evidence": "editorAi.ts:10 sets MAX_CALLS = 5 and lines 85-86 reject calls once the ledger has 5 entries or more than US$5 reserved. Any entry that is not settled blocks every later call (line 84). The plan's comparator needs 1 synthetic auth/JSON call plus 5 clips × 2 repetitions = 11 calls, before up to 2 repairs per candidate. Etapa 3 would need 30 more for 10 development and 20 evaluation clips. The plan never mentions this cap. The host has said it is not raised. Partway through the lab the route will return 429, or leave the ledger blocked after an uncertain call.",
      "fix": "State in Etapa 2 that the Claude comparator is limited to the existing 5 calls / US$5 (for example: 1 synthetic call plus 4 single-run clips, no repetitions or repairs on Claude). Add a separate decision point where the user explicitly approves a new cap before any wider comparison, with call counts calculated from the lab design. List an uncertain ledger entry as a stop condition."
    },
    {
      "id": "F3-split-by-session-not-recordable",
      "severity": "medium",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLANTILLA_RECEPCION.csv",
      "evidence": "The plan requires 'Separar por grabación original/sesión, no por fragmentos vecinos'. The intake template columns are asset_id, client_id, project_id, …, dataset_split. There is no recording or session ID and no field linking a clip to its parent recording. Two clips cut from one recording session can therefore land in development and evaluation with nothing in the data to flag it, which leaks style and content into the frozen 20. The template also has no difficulty or duration-band field, yet the plan selects by low/medium difficulty and reports results by difficulty.",
      "fix": "Add recording_session_id, parent_asset_id and difficulty (and brand_id if it differs from client_id) to the intake template. Add a rule that the split is assigned per recording_session_id, with a check that no session appears in more than one split."
    },
    {
      "id": "F4-health-catalog-and-dense-default",
      "severity": "medium",
      "path": "app/_lib/propose.ts",
      "evidence": "propose.ts:12-31: the card catalog and backgrounds are health-specific (patients, illness, healing, medical crosses), and the themes are 'health'/'stress'. propose.ts:64 and :122: when there is no profile, the prompt says 'usa el estilo de la casa (dinámico, con gráficos)' and density defaults to dynamic. Two failure scenarios follow. First, a non-health client from Fran processed with a v0 sheet that has not yet been turned into preferences gets dense health graphics. Second, if the catalog fits the content poorly, the model correctly proposes almost nothing. Since the plan approves 'perfiles sobrios intencionales', the 16/20 gate can then be met by output that is effectively captions-only and was never a deliberate choice.",
      "fix": "In Etapa 1 triage, record whether the catalog fits each clip. Require every clip in the lab to have an explicit brand preferences snapshot (never the house default). In Etapa 3, separate clips where the brand sheet or reference expects graphics from clips that are sober by design. Report the captions-only rate and require the gate to hold within the graphics-expected group. Treat catalog gaps as a library task before evaluation, not as an ad hoc fix during evaluation."
    },
    {
      "id": "F5-supabase-limits-unaddressed",
      "severity": "medium",
      "path": "scripts/worker.py",
      "evidence": "worker.py:23-24: STORAGE_LIMIT defaults to 45 MB with the comment 'Límite de archivo del plan gratuito de Supabase Storage'. upload() raises an error above that size, and fit() (worker.py:177-189) re-encodes the final MP4 at a lower bitrate to fit it. Agency originals and final renders will often exceed 45 MB, so either source upload fails or the client gets a degraded MP4. The plan's 'subida directa confirmada → almacenamiento privado', its checksum requirement and its commercial delivery never mention this limit. The independence goal ('La base de datos/cola y almacenamiento persisten cuando no hay workers') also relies on the current hosted tier remaining available while idle; the plan does not verify that.",
      "fix": "Add an Etapa 4 prerequisite: measure source and render sizes from the inventory, then decide on a storage plan or tier with resumable or direct uploads for originals of that size. Ban lossy fit() for client deliverables, or record it in the manifest and QC. Include an idle-availability check for the database, queue and storage (several days with no workers) in the Mac-off test."
    },
    {
      "id": "F6-human-review-load-unsized",
      "severity": "low",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLAN.md",
      "evidence": "Etapa 2 budgets two sessions of 20–30 minutes per batch of 5–10 clips. With base, local and Claude conditions, each run twice, a batch of 5 clips at 30–90 s produces up to 25 renders, or about 12–38 minutes of playback before any timestamped marking or full audio listening. A batch of 10 doubles that. The plan never says whether the user reviews both repetitions, and gives no total human-hour estimate across Etapas 2, 3 and 5, where all 50 commercial jobs get human review.",
      "fix": "Specify that only one repetition per condition goes to blind human review, and measure variability between repetitions automatically (plan diff, element overlap). Add a rough total of human hours per stage, calculated from clip count × duration × conditions, and treat going over it as a signal to shrink the batch."
    },
    {
      "id": "F7-retry-repair-multiplication",
      "severity": "low",
      "path": "scripts/worker.py",
      "evidence": "worker.py:22 MAX_ATTEMPTS = 3 limits job attempts, and the plan separately allows 'Máximo dos reparaciones automáticas por candidato'. Unless the repair counter is stored with the candidate, a job retry resets it. Worst case is 3 × (1+2) = 9 model calls per candidate, and the batch cap is described only as 'un techo explícito'.",
      "fix": "State that repair and attempt counters live in durable job or candidate state, are shared across job retries, and count toward the batch and budget reservation. Give the batch cap as a number or a formula, for example clips × 3 calls."
    },
    {
      "id": "F8-ollama-data-boundary",
      "severity": "low",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLAN.md",
      "evidence": "The plan counts the Ollama candidate as local processing, which needs no external authorization. However, Ollama can be pointed at a remote OLLAMA_HOST, and newer versions offer cloud-hosted model tags. A configuration mistake would send transcripts outside the machine under local-only permission.",
      "fix": "Require the local adapter to fail closed: allow only a loopback host and an allowlist of pinned local model tags and digests, and test that requirement without network access."
    },
    {
      "id": "F9-blind-ab-baseline-identifiable",
      "severity": "low",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLAN.md",
      "evidence": "'El usuario compara A/B sin nombre del modelo'. The captions-only baseline is recognizable on sight, and a candidate that intentionally adds nothing is identical to it. Blinding therefore only holds between the local and Claude candidates, and preference over the baseline is not blind.",
      "fix": "Say that blinding applies only between candidate conditions. Count identical-to-baseline outputs as their own category instead of as a preference."
    },
    {
      "id": "F10-template-and-private-area-gaps",
      "severity": "low",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLANTILLA_EXPERIMENTOS.csv",
      "evidence": "The plan requires memory pressure and swap, repair count, and the decision family changed in each iteration. The experiments template has only peak_memory_mb and an ambiguous 'attempt' column (repetition or repair?). The corrections template has no decision-family column. The plan also says real rows go 'sólo en el área privada del proyecto' without naming a path. The .gitignore only covers work/ and public/work/, so a copy saved elsewhere in docs/ would be committed.",
      "fix": "Add repetition_index, repair_count, memory_pressure_max, swap_delta_mb and change_family columns. Name the private path explicitly (for example a subfolder under work/) and state that it must stay gitignored."
    }
  ],
  "coverage": [
    "Read the plan text as provided, plus every file in docs/estrategia/piloto-fran-a-produccion-2026-10-19/: the four CSV templates and FICHA_DE_MARCA.md. LOG.md was not opened.",
    "scripts/worker.py, read in full: Cloud/Local claim, requeue, worker_name, analyze --prepare-only, render with --timeline-from, STORAGE_LIMIT/fit/shrink, MAX_ATTEMPTS, x-upsert and plan insertion.",
    "app/_lib/propose.ts, read in full: catalog, house default style, prompt, reservation and accounting flow.",
    "app/_lib/editorAi.ts, via grep: MAX_CALLS = 5, RESERVE_USD, the budget check, per-job permission with data fingerprint, and the local ledger.",
    "app/api/jobs/[id]/propose/route.ts, read in full: proposals turned off in cloud mode.",
    "app/_lib/jobs.ts: savePlan versioning, startPipeline with the global profile, uploadTarget IDs built from file names.",
    "app/_lib/profile.ts, via grep: profiles keyed by user_id.",
    "docs/estrategia/edicion-real-2026-10-19/IMPLEMENTACION.md, via grep: the 5-call / US$5 cap and cloud disablement.",
    "docs/EDITING_GUIDELINES.md, via grep: only silences are cut; voice, filler words and order are preserved.",
    ".gitignore, via grep: work/ and public/work/ are ignored."
  ],
  "limitations": [
    "I could not run graphify (read-only session, no shell). Code reads were limited to the paths the host supplied, plus app/_lib/profile.ts and .gitignore to trace the profile writers and the private-data boundary.",
    "I did not inspect the Supabase migrations or the claim_next_job RPC, so I cannot say what atomicity, lease or row-level-security behaviour it provides. Finding F1 rests only on the application code keying data by owner_id and user_id.",
    "I did not read .env, work/, public/work/ or any media or transcripts, as instructed. No output quality was checked.",
    "I did not open app/api/jobs/upload/route.ts or the cloud web/editor paths, so the current upload size limits and the cloud save path are unverified.",
    "The external facts (Ollama features and model availability, the Qwen3.5 9B tag, Supabase free-tier pausing and file limits, Runpod and Remotion behaviour) come from general knowledge and the plan's links, not from fetching them in this session.",
    "No tests were run. The metrics in the plan are proposed targets, not results."
  ]
}
```

Round 1 dispositions: all F1-F10 accepted and incorporated. F1 explicit brand entity/job snapshot, same-owner separation and workspace roles; F2 existing 5 calls/USD5 cap unchanged, at most synthetic+4 single proposals, remaining quota only; F3 session/parent/difficulty/split fields; F4 explicit preferences and catalog fit, graphics-required subgroup gate; F5 master preservation, current 45 MiB code limit migration and idle persistence checks; F6 realistic review time and only one human-reviewed repetition; F7 durable total repair budget (30 initial local calls max) and stricter Claude cap; F8 local-only endpoint, disabled cloud, fixed digest and offline proof; F9 model-identity blinding only, ties; F10 CSV fields and ignored private work/fran-pilot path. User confirmed up to 10 videos/week: plan now estimates >=3 weeks to gather30 usable clips and >=5 weeks for50 operational jobs, one cloud worker min0/max1 initially. Please review revised plan only, same read-only scope. No implementation, private media, infrastructure changes or external publication. Focus unresolved material defects; this is round2 of2.


## Round 2 — APPROVED
Result: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-cfw_h8fh/result.json
Plan SHA256: b5e6db1b253f8b4ccce8e87ef44561ec5b9214f3c46435b9053e73e0899f7243
Observed models: ['claude-opus-5-5']

```json
{
  "verdict": "APPROVED",
  "summary": "All round-1 findings (F1–F10) are resolved in this revision. I checked each one against the plan text and the repository files.\n- F1: brand entity, per-job snapshots, same-owner separation and workspace roles are in place, with the matching access tests.\n- F2: the 5-call / USD 5 cap is kept, limited to remaining quota, with no ledger reset.\n- F3: the intake template now has brand_id, recording_session_id, parent_asset_id, difficulty, graphics_expected and catalog_fit.\n- F4: no implicit defaults, and there is a graphics-required gate of at least 5 cases at ≥80%.\n- F5: the 45 MiB limit, master preservation and idle-persistence checks are covered.\n- F6: the review-time arithmetic is correct (20×2×30–90 s = 20–60 min).\n- F7: a durable repair counter and a 30-call ceiling (10 runs × 3) are set.\n- F8: the local endpoint fails closed and requires an offline proof.\n- F9: blinding applies only to model identity, and identical results count as ties.\n- F10: the experiments and corrections templates have the new columns, and work/fran-pilot sits under the gitignored work/.\n\nThe volume math matches the confirmed figure of up to 10 videos per week: at least 3 weeks to collect 30 clips and at least 5 weeks for 50 jobs. The worker sizing (minimum 0, maximum 1) also fits that volume. I found no material defects. Three low-severity points could still be clarified.",
  "findings": [
    {
      "id": "R2-L1-brand-prohibitions-not-enforceable",
      "severity": "low",
      "path": "app/_lib/propose.ts",
      "evidence": "The brand sheet in Etapa 3 records permitted and prohibited uses and places 'perfil de marca' in the precedence order. The current contract carries only the structured preferences (vibe, graphics, graphic_kinds, topic, context_colors). Any other free-text note is passed to the model as 'tómalo sólo como un gusto' (propose.ts:75), and validatePlan does not check it. Example: a brand rule such as 'never use the stress theme', saved as a note, is treated as a suggestion. A proposal that breaks it would pass validation, and the plan does not say whether that breach counts as a hard error.",
      "fix": "For each prohibited use, either map it to a structured field that is validated (for example graphic_kinds, a per-brand themes allowlist, sfx or captions), or label it as guidance that only human review checks and record it as such in the rubric."
    },
    {
      "id": "R2-L2-repetition-selection-unspecified",
      "severity": "low",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLAN.md",
      "evidence": "The plan says 'Revisar humanamente una repetición por condición; comparar la segunda repetición local automáticamente'. It does not say how the reviewed repetition is chosen. If the better-looking run is picked after seeing both, the human-reviewed result is biased upward.",
      "fix": "Fix the rule in advance: always review repetition_index=1, or pick at random with the seed recorded. Record the choice before any output is rendered."
    },
    {
      "id": "R2-L3-first-proposal-definition",
      "severity": "low",
      "path": "docs/estrategia/piloto-fran-a-produccion-2026-10-19/PLAN.md",
      "evidence": "The plan says 'Registrar aceptación de la primera propuesta antes de reparar', and the gate is '16/20 primeras propuestas'. A proposal that fails the validator cannot be rendered for human review: the route returns 502 at app/api/jobs/[id]/propose/route.ts:36. So it is unclear whether 'first proposal' means the raw model output or the first valid candidate after automatic repairs. The two readings give different autonomy rates.",
      "fix": "Define 'first proposal' as the first candidate the system presents after automatic validation and repair, with no human edits. Report repair_count with it, and separately report how often the raw output was invalid."
    }
  ],
  "coverage": [
    "Read the revised PLAN.md as provided (SHA b5e6db1b…) and compared it with the round-1 findings F1–F10.",
    "Re-read all four CSV templates. PLANTILLA_RECEPCION now has brand_id, recording_session_id, parent_asset_id, difficulty, graphics_expected, catalog_fit and catalog_gap_reason. PLANTILLA_EXPERIMENTOS now has brand_id, repetition_index, repair_count, worker_attempt, memory_pressure_max, swap_delta_mb and change_family. PLANTILLA_CORRECCIONES now has brand_id and change_family. PLANTILLA_EVALUACION is unchanged but links to these through run_id.",
    "Checked the arithmetic: 5 clips × 2 runs × 3 calls = 30; 20 clips × 2 versions × 30–90 s = 20–60 min; 10 per week gives at least 3 weeks for 30 clips and at least 5 weeks for 50 jobs.",
    "Confirmed in docs/EDITING_GUIDELINES.md:77,83 that captions use Inter Display Bold at a fixed 100 px, as the plan says.",
    "Confirmed that .gitignore excludes work/, so work/fran-pilot is private.",
    "Traced who writes source_path: Home.tsx:73 inserts it, the RLS policy in supabase/migrations/20261009150000_pink_ai_cloud_mode.sql:16 requires an owner-uid prefix, and worker.py:62 downloads it with the service role. The current owner prefix protects it; the plan's workspace and member storage permissions will need to keep that protection.",
    "From round 1, still relevant: worker.py, propose.ts, the editorAi.ts cap, propose/route.ts, jobs.ts and profile.ts."
  ],
  "limitations": [
    "I could not run graphify (read-only session, no shell). Code reads were limited to the paths the host supplied, plus a grep for who writes source_path.",
    "I did not audit the claim_next_job RPC or the full RLS and storage policies. I only saw the one policy line found by the source_path grep.",
    "I could not verify the external claims in this session: the OLLAMA_NO_CLOUD flag, the qwen3.5:9b tag, Supabase plan limits and pausing, and Runpod/Remotion behaviour. The plan's offline-proof requirement reduces the risk if the Ollama flag turns out to be wrong.",
    "I did not read .env, work/, public/work/ or any private media, as instructed. No tests were run. The metrics in the plan are proposed targets, not results.",
    "I did not open LOG.md."
  ]
}
```

Host disposition: plan remains unchanged after approval. Three low-priority details remain to settle in implementation: map prohibited brand rules to validated fields or human checks; preselect repetition 1 for review rather than choosing the best; distinguish raw first-output success from autonomous repaired-candidate success. Until clarified, count invalid first outputs as first-proposal failures (conservative plan reading), and report repaired results separately. No implementation or empirical quality/capacity claim is implied by plan approval. CSV headers verified unique and empty; git check-ignore confirmed all five private data subdirectories.
