# Alcance de inspección fresca

Builder: Codex. Plan aprobado en /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-cfiwf_0y/result.json; check pasó. Inspeccionar este primer incremento, no los cinco paquetes futuros. No exigir implementación v2/memoria/MP4 que están explícitamente excluidos.

El repo tenía muchos cambios previos. El diff dedicado de esta entrega está en /tmp/cutkind-personalization-change.diff y las copias pre-build en /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/cutkind-personalization-baseline-sfs42qbz. El runner añade diff contra HEAD que también contiene trabajo previo; no atribuirlo a este incremento. Scripts/test_brand_catalog.mjs sólo cambió su cargador TS por helper compartido; sus asserts anteriores permanecen.

Regla Graphify: graphify query debe preceder toda exploración. El host ya localizó y leyó los archivos siguientes y sus callers; puedes leer estos y el diff dedicado. NO hacer Grep/Glob de otros paths: tu toolchain no ofrece Graphify. Si falta evidencia pedirla o declararla como limitación. NO leer .env*, credenciales, work/, public/client/, medios ni transcripts privados. Los nuevos tests/fixtures son sintéticos y pueden leerse. No ejecutar ni modificar.

Archivos de este incremento:
proxy.ts
scripts/worker.py
scripts/pink_edit.py
scripts/plan_io.py
src/preferences.ts
app/estilo/page.tsx
app/app/page.tsx
app/_lib/account.ts
app/_lib/billing-request.ts
app/_lib/jobs.ts
app/_lib/propose.ts
app/_lib/profile.ts
app/_lib/proposalPlan.ts
app/_components/Editor.tsx
app/api/profile/route.ts
app/api/jobs/upload/route.ts
app/api/jobs/[id]/propose/route.ts
app/edit/[id]/page.tsx
app/auth/confirm/route.ts
app/auth/callback/route.ts
app/_lib/profileState.ts
app/_lib/profileFile.ts
app/_lib/proposalRequest.ts
app/_components/ProfileRecovery.tsx
scripts/test_personalization_contract.mjs
scripts/test_personalization_contract.py
scripts/test_personalization_browser.mjs
scripts/test_support/load_ts.mjs
scripts/fixtures/personalization-profiles.json
scripts/test_brand_catalog.mjs

Contexto adicional ya localizado por host: src/edit.ts, src/zooms.ts, app/_components/StyleQuiz.tsx, app/_lib/cloud.ts, app/_lib/request-security.ts, app/_lib/supabase/config.ts, schema/edit-plan.schema.json, scripts/test_brand_catalog.py. Respetar alcance de Graphify.

Pruebas host: npm run typecheck; node scripts/test_brand_catalog.mjs; node scripts/test_personalization_contract.mjs; .venv/bin/python scripts/test_brand_catalog.py; .venv/bin/python scripts/test_personalization_contract.py: todas exit0. Suite Python nueva6 + previa6;22fixtures compartidos. Playwright8 escenarios con componentes reales y red/navigation/preview simulados pasó, sin page errors. El test verifica el borrador en request, cambios durante respuesta lenta, preservación, undo y limpieza del report, fallo red, alerta y recuperación explícita/guardado. No afirma Next SSR ni API IA real, nube desplegada ni calidad audiovisual.

R3-1 low del plan se DIFIRIÓ: admisión conservadora bloquea adiciones si cualquier ventana ya excede densidad. Hay aviso y docs; no marcar esa decisión explícita como defecto nuevo. Todos los elementos actuales permanecen intactos. El plan permite claves legacy salvo metadatos de procedencia reservados, y label largo no enviado al modelo. Renderer no cambió. El screenshot descubrió report stale después de undo; se corrigió y se repitió Playwright. Codex autor de todos los cambios de este incremento; inspector fresco Claude.
