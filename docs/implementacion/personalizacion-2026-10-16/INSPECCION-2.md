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


## Segunda y última inspección fresca, después de correcciones

Primera inspección REVISE: /var/folders/xd/h5n7pp0n1lb4p24m8qcfjl780000gn/T/claudex-33j5hzqe/result.json. Evaluar el código actual y regresiones; no atribuir la aprobación anterior a estos cambios.

- F1 aceptado: invalidSession reconoce AuthSessionMissingError, AuthInvalidCredentialsError, AuthInvalidJwtError y AuthApiError 4xx excepto408/429. Error invalida user aunque venga poblado. readProfile devuelve ausencia de sesión; proxy retorna401 a APIs, login/demo a páginas y deja /login accesible. Unknown/network/5xx/429 siguen siendo indisponibilidad. Consultadas fuentes oficiales https://supabase.com/docs/guides/auth/debugging/error-codes y https://github.com/supabase/auth-js/blob/master/src/lib/errors.ts. Pruebas400 refresh_token_not_found,403 user_not_found/bad_jwt,429,503,network y /login. app/login/page.tsx también localizado/leído por host: formulario client, sin gate servidor adicional.
- F2 aceptado: fallos reales de auth conservan JSON503 en API y HTML503 con reintento en páginas; /login permanece accesible. HTML estático sin interpolar URL/datos del usuario.
- F3 aceptado: ProfileReadError sanitiza IO noENOENT. Upload captura ProfileError/ProfileReadError también al fallar startPipeline tras la subida, responde422/503. Pruebas de fallo en segunda lectura verifican ausencia de rutas locales.
- F4 aceptado: saveProfile local usa UUID temp en mismo directorio con wx + rename, cleanup finally. Fallo rename deja perfil previo intacto; test de20 escrituras concurrentes y lecturas JSON válidas. No escritura cloud ni schema cambió.
- Hallazgo propio adicional: el regex numérico permitía .5→5. Ahora valida token completo tras quitar puntuación externa; no extrae subcifras ni cambia signo/separadores. Fixtures .5, ,5, -0.5, 1.000, (30%), y1e3. Typecheck y pruebas de contrato volvieron a pasar.

No hubo modificaciones UI después de la última captura/Playwright pasada. No hay nueva entrega MP4 que evaluar. Los cambios posteriores a primera inspección son sólo los cuatro fixes y el match numérico con sus regresiones. Mismos límites de Graphify: sólo files autorizados, no búsquedas nuevas ni secretos. No exigir los paquetes futuros excluidos. Última inspección según presupuesto2; reportar límites honestamente.
