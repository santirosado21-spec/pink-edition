# Cutkind: cuentas y pagos

## Estado de esta entrega

Supabase conectado al proyecto pink-ai (`awptxbhlraiddimobwzv`). El cuestionario es obligatorio antes de entrar al panel, editor, cuenta o APIs de trabajos. La elección se guarda por usuario; al volver se entra directamente al panel. Las cuentas usan enlaces por correo.

La migración `20261015013044_cutkind_accounts_billing.sql` está aplicada. Las tablas de facturación permiten lectura únicamente al propietario; las escrituras quedan en el servidor. Los asesores de seguridad no detectaron incidencias tras la migración.

El dominio picos.cc está añadido a Resend. Falta verificar sus DNS en Spaceship, configurar SMTP y probar entrega de correo. Los registros están en CUTKIND_EMAIL_DNS.md. `NEXT_PUBLIC_AUTH_EMAIL_READY=false` mantiene el formulario desactivado hasta completar esa prueba.

Stripe dispone de rutas para Checkout, portal de clientes y webhook con firma; la cuenta consulta el estado del pago en Stripe, sin confiar en la URL de regreso. `BILLING_ENABLED=false`: falta conectar Stripe, acordar precios, configurar el webhook y probar pagos en modo de prueba. Todavía no existe contabilidad de créditos ni aplicación de cuotas de vídeo; esto debe implementarse antes de cobrar por los planes propuestos. No hay cobros reales activados.

`CLOUD_ENGINE_ENABLED=false` mantiene la creación de vídeos en nube desactivada durante esta etapa. Las mejoras del motor se realizan después.

## Variables

- Públicas: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, NEXT_PUBLIC_AUTH_EMAIL_READY.
- Solo servidor: SUPABASE_SECRET_KEY, APP_URL, BILLING_ENABLED, CLOUD_ENGINE_ENABLED.
- Pendientes de Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_IDS (lista explícita de precios permitidos, separados por comas).

APP_URL es http://localhost:3000 en local y https://pink-edition.vercel.app en producción. Los secretos no se guardan en Git ni en el paquete de despliegue.

## Validación realizada

- TypeScript: sin errores.
- Cinco pruebas de políticas de facturación: precios permitidos, origen de regreso, estado confirmado del pago, origen de solicitudes y resolución de cliente.
- Trece comprobaciones reales con dos cuentas temporales: redirecciones al cuestionario, bloqueo de trabajos, validación y guardado de preferencias, entrada al panel, aislamiento de perfiles y facturación, rechazo de escrituras de facturación del cliente y pagos desactivados.
- Las cuentas temporales se cerraron y eliminaron al terminar.

## Antes de activar cobros

Conectar la cuenta Stripe correcta, crear precios aprobados, configurar el portal y webhook, probar pago aprobado/rechazado/cancelado y eventos repetidos, implementar cuotas y consumo según el coste real del motor, y revisar reintentos/concurrencia de Checkout. Activar BILLING_ENABLED únicamente después de completar esas comprobaciones.

## Acceso temporal a la demo (15 de octubre de 2026)

`/demo` y `/demo/estilo` son públicos. El botón principal de la portada y el acceso alternativo de login llevan a la demo. En modo nube, `/app` y `/estilo` redirigen a sus vistas de demo cuando no existe sesión. Las APIs, cuentas, facturación y proyectos personales conservan la autenticación.

El cuestionario de demo guarda preferencias validadas en `localStorage` bajo `cutkind-demo-style`, sin enviar datos a Supabase. El estudio de demo muestra una biblioteca vacía y no genera vídeos. Para cerrar este acceso temporal, configurar `NEXT_PUBLIC_DEMO_ENABLED=false` y reconstruir el despliegue.

Validado: ocho comprobaciones HTTP de rutas públicas, redirecciones y rechazo de APIs privadas; recorrido visual de los ocho pasos del cuestionario y regreso al estudio al guardar; TypeScript sin errores.
