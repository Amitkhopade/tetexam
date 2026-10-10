# Accounts, Public Website, Database and Payments — Deployment Guide

This change adds server-backed accounts and account approval, a public marketing home page, and an optional paid-assessment path to the existing Question Paper Navigator. It is an additive change: the existing static H/K/L/M/N question JSON and exam execution/scoring code remain the source of truth for those five free mock tests.

## Architecture decisions

- **Frontend:** existing React + Vite app, built to `frontend/dist`.
- **Backend:** Vercel Functions in the repository-root `api/` folder. Set the Vercel Root Directory to the repository root (the folder containing this `package.json`, `api/`, `frontend/`, `db/`, and `vercel.json`). Do not set the Root Directory to `frontend/`, or the API routes will not deploy.
- **Database:** Neon Postgres through the Vercel Marketplace integration. The Marketplace listing currently advertises a free plan / plans starting at $0; usage limits and prices may change. See https://vercel.com/changelog/neon-now-available-on-vercel-marketplace and https://changelog.vercel.com/marketplace/neon.
- **Passwords/sessions:** passwords are scrypt-hashed; session tokens are signed server-side and placed in HttpOnly cookies. The browser does not become the authority for the user role.
- **Account approval:** a registration form creates a pending request. An existing admin approves it and chooses the role. The server emails a single-use activation link; the recipient sets their own unique password. A shared production default password such as `Student@123` is intentionally not used because it would let anyone who knew the shared password enter another user's account. This activation step is the first-time password setup.
- **Admin bootstrap:** the first admin is created once using `scripts/bootstrap-admin.mjs`; only an existing admin can invite/approve subsequent admins.
- **Email:** Resend sends activation/reset links. SMS/OTP mobile verification is not included in the low-cost MVP; the mobile number is collected but not marked verified.
- **Payments:** Razorpay Checkout starts in test mode. Server-side signature verification, an independent captured-payment check and signed webhooks grant database entitlements. See Razorpay's signature guidance: https://razorpay.com/docs/server-integration/python/test-app/.
- **Existing H/K/L/M/N mock tests:** are protected in the API as permanently free and are never eligible for a paid product. New paid assessments can be stored in the private database and attached to a product in Admin → Accounts & Access → Products.
- **AI generated datasets:** the Admin AI provider key is sent only with that request and not persisted in the database by this change. In Vercel, use **Save Private Assessment** to store a validated non-free exam privately. The existing **Save to Local Project** action remains available in local development only. A new *free static* dataset must still be downloaded and placed in the static data repository during a later content release.

## 1. Configure Vercel

1. Open the Vercel project that serves the website.
2. In Settings → General, set **Root Directory** to the repository root containing `vercel.json` and the root `package.json`.
3. Keep the Vite build output as `frontend/dist`; `vercel.json` configures the build and output directory.
4. Install Neon from the Vercel Marketplace and create a database. Use the pooled connection URL provided by the integration.
5. In the Neon SQL Editor for the selected database, run the complete `db/schema.sql` once.
6. In Vercel → Settings → Environment Variables, set the server-only values below for Production (and Preview if you test in Preview). Do not prefix these values with `VITE_`.

Required environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled Postgres URL injected/copied from the Vercel integration |
| `AUTH_SESSION_SECRET` | Random secret, at least 32 characters, used to sign session cookies |
| `APP_BASE_URL` | Exact canonical URL, e.g. `https://exam.example.com` (no trailing slash) |
| `RESEND_API_KEY` | Email provider key for account activation and password reset |
| `EMAIL_FROM` | Sender such as `Question Paper Navigator <accounts@your-verified-domain.com>` |
| `RAZORPAY_KEY_ID` | Razorpay test key ID initially; public ID is returned to Checkout, secret stays server-side |
| `RAZORPAY_KEY_SECRET` | Server-only Razorpay secret |
| `RAZORPAY_WEBHOOK_SECRET` | Separate webhook signing secret configured in Razorpay |

Generate a session secret in PowerShell:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Set `APP_BASE_URL` to the exact active deployment URL before testing email links. If you later attach a custom domain, change `APP_BASE_URL` to the canonical custom domain and redeploy.

## 2. Create the first administrator

Do not commit a password or database URL into the project. In a private PowerShell session, make the database URL available in the environment from your password manager/Vercel dashboard, and set the bootstrap password with a secure prompt:

```powershell
$env:DATABASE_URL = Read-Host "Paste the Neon pooled connection URL"
$secure = Read-Host "Enter a unique admin password (12+ chars, letters and numbers)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  node scripts/bootstrap-admin.mjs
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
  Remove-Item Env:BOOTSTRAP_ADMIN_PASSWORD -ErrorAction SilentlyContinue
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
}
```

The script asks for admin name, username, email and mobile, then hashes the password with scrypt. It refuses to create another initial admin if one already exists. Run it from a trusted machine with the package dependencies installed. Do not put these values in a committed `.env` file.

## 3. Account lifecycle

1. Public user opens **Create free account** and submits name, username, email, mobile and optional note.
2. The record is stored in `signup_requests` as pending; it cannot log in yet.
3. Admin opens `/admin-upload.html` → **Accounts & Access** → **Approval requests**.
4. Admin approves and selects `student`, `educator` or `admin`, or rejects the request.
5. The server sends a time-limited, single-use activation URL by email.
6. User sets a unique password on `/activate`; only the password hash is stored.
7. User signs in and receives an HttpOnly server session. Password reset links revoke existing sessions by incrementing `session_version`.
8. Admin can change roles, disable accounts, invite accounts, and resend activation links. Public users cannot self-assign an admin role.

## 4. Email setup

1. Verify your sending domain in Resend and add the DNS records it supplies.
2. Create an API key and set `RESEND_API_KEY` and `EMAIL_FROM` in Vercel.
3. The address in `EMAIL_FROM` must be allowed by the verified Resend domain.
4. Trigger a new deployment after adding/updating environment variables.
5. Test a signup request with an email address you control, approve it as admin, and confirm the activation link. Then test forgot-password/reset.

If email is not configured in production, account approval/invitation/password reset calls fail with an actionable server response rather than pretending a message was sent.

## 5. Payment setup (test mode first)

1. Create/enable a Razorpay merchant account and use **test** keys initially.
2. Set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and a separate `RAZORPAY_WEBHOOK_SECRET` in Vercel. Never put the secret in frontend code or a `VITE_*` variable.
3. Configure a webhook URL: `https://YOUR_CANONICAL_DOMAIN/api/payments/webhook`.
4. Subscribe to `payment.captured` and `order.paid` events. Use the webhook secret configured for that endpoint.
5. Deploy/redeploy and visit Pricing. Checkout remains disabled until payment configuration exists.
6. As admin, first save a **new, non-free** assessment privately from the AI generator or Accounts & Access. Then create a product and attach one or more of those private assessment IDs to the price.
7. Sign in with a separate student test account and buy using Razorpay test payment credentials. Confirm the order is recorded as paid and the entitlement is created. Then open the purchased exam.
8. Test a canceled/failed checkout and verify access is **not** granted. Verify webhook retries do not create duplicate grants.
9. Only after test mode works end-to-end, switch to live Razorpay credentials and verify current merchant/KYC and payment provider terms.

The app verifies the Checkout signature on the server, fetches payment status from Razorpay, checks amount/currency/order identity against the database, and processes signed webhook notifications. Do not change it to trust a `success` flag sent by the browser.

## 6. Free and paid content rules

- The existing H/K/L/M/N mock tests remain free. API validation prevents publishing these IDs as paid.
- Paid private assessment data (question JSON, answer-key JSON and metadata JSON) is stored in `paid_assessments` JSONB columns. It does not become a public static file.
- A product's `paper_ids` array references private assessment `paper_id` values. Entitlements map a user to a product after verified payment.
- On the public catalog, a paid assessment is only listed when it is published and associated with an active product. On load, the API checks the signed-in user's entitlement (admins may preview).
- Vercel serverless request payloads are limited; the AI generation and private assessment endpoints set a 4 MiB JSON request cap. This includes base64 overhead for PDFs. Large scanned documents should use a local extraction workflow or be moved to an object-storage upload architecture instead of sending entire files through a function request.

## 7. Public homepage and placeholder content

The public page includes paper catalogue/search, pricing, placeholder blog/news, illustrative testimonials, terms/privacy/contact pages, theme toggle, notification placeholder, cookie preference banner, newsletter signup and a simulated chat widget. Before a public commercial launch:

- Replace illustrative testimonial/blog content with approved real content. It is labeled as illustrative in the UI and must not be represented as verified reviews.
- Have the Terms of Service and Privacy Policy reviewed for your actual legal entity, data retention, account requests, payment/refund terms and contact details.
- Add an unsubscribe flow before using newsletter addresses for marketing.
- Decide whether/how to verify mobile numbers (SMS/OTP is not included in this MVP).
- Add proper customer support ownership instead of treating the simulated chat bubble as live support.
- Confirm any cookie/analytics requirements before adding analytics; this implementation does not add analytics cookies.

## 8. Local testing

Install root/backend and frontend dependencies, then run the Vercel development runtime so root `api/` functions are available:

```powershell
npm run install:all
npx vercel dev
```

`npm run dev` starts Vite only; it does not emulate the database-backed `/api/*` functions. For UI-only work, Vite is enough, but authentication/payment integration tests should use Vercel Dev or a deployed Preview.

Run non-provider tests:

```powershell
npm run validate
npm run test:datasets
npm run test:admin-ai
npm run test:session
npm run test:bundle
npm run test:auth-billing
python -m pytest -q processor/tests
npm run build
```

Use a test database and Razorpay test keys in Preview. Never use production payment keys for automated/manual acceptance tests.

## 9. Custom domain

1. In Vercel project Settings → Domains, add the domain you own.
2. Follow the exact DNS records Vercel displays at your registrar. Do not guess A/CNAME values.
3. Wait for Vercel to verify the domain and provision HTTPS.
4. Pick the canonical host (`www` or non-`www`) and configure a redirect from the alternate host if appropriate.
5. Set `APP_BASE_URL` to the canonical HTTPS URL, then redeploy; activation/reset emails use this setting.
6. Test root, `/register`, `/login`, `/pricing`, `/activate?token=...`, `/reset-password?token=...`, `/admin-upload.html`, and `/api/health` on the new domain.

## Known MVP limitations

- This is not a claim that all security risk is removed. The patch adds rate limits, role checks, same-origin checking, server-side password hashes, HttpOnly sessions, admin audit events, payment verification and secret separation. A public commercial launch still needs independent security testing and operational monitoring.
- Phone numbers are collected but not SMS-verified.
- Admin and provider operations require the database/email/provider configuration above.
- The public site's testimonials, blog content, legal terms and support chat are placeholders.
- A paid assessment payload larger than the configured Vercel request cap will be rejected; use an object storage upload flow for large PDFs/datasets.
