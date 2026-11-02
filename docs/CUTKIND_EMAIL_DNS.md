# Correo de Cutkind con picos.cc

Remitente previsto: `Cutkind <hola@picos.cc>`.
Dominio añadido a Resend; falta verificar los siguientes registros en Spaceship.
No sustituyas los registros MX del dominio raíz; los de envío usan los nombres indicados.

| Tipo | Nombre | Valor | Prioridad |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDaBBJv21A5TGDiNGGIDo+AcxVxlIfQlrAfAxa4TMkKRuCuD+qaBjMsjOHJYwJuzFhsAWOFvKrDvU1DJqu1Pt+0eo/eQJAwgiKWFu60/W+ODaXxlJ1moRIx5L8FnnX5mb5t1t91XV5bjvJx4ExJkD+cs9Fd/OkZJ6VA7iv1PaxnOwIDAQAB` | — |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |
| CNAME | `rsend` | `send.forge.rmta.net` | — |

TTL: automático. Después, verificar el dominio en Resend y configurar SMTP en Supabase.
Los correos públicos permanecen desactivados hasta validar el envío.
