# Email: plugging in a provider

The app sends email through one provider-agnostic service (`backend/email_service.py`).

- **No provider set** (default, `EMAIL_PROVIDER=` empty): every investor email and weekly digest is still written to `email_log` with status `queued`. The UI says "logged — not sent", and the CRM card records it.
- **Any SMTP server**: set `EMAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, and `SMTP_STARTTLS` (true/false).
- **Your own API provider**: add a class with `name` and `async send(to, subject, text, reply_to=None) -> str`, register it with `register_provider("yourname")`, then set `EMAIL_PROVIDER=yourname`.

Endpoints: `GET /api/email/status`, `POST /api/email/send`, `GET /api/email/log`.

Weekly digest: `PUT/GET /api/digest/settings`, `PUT /api/digest/snapshot`, `GET /api/digest/preview`, `POST /api/digest/send-now`, `GET /api/digest/history`.

An hourly platform cron (`.emergent/crons.yml`) calls `POST /api/cron/digest`, which is protected by `WEBHOOK_CRON_SECRET`. It sends each digest at the day and hour the user picked, in the user's own timezone, at most once per ISO week.
