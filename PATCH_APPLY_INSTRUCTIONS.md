# Apply the Account, Payment and Public Website Patch

## Scope

This is an overlay patch for the existing consolidated `question-paper-platform` repository. It is **not** a full project ZIP. It adds the account approval/activation flow, server-backed sessions, Vercel API routes, Neon Postgres schema, admin user/product/assessment management, Razorpay payment flow, public website sections, and deployment configuration. It preserves the existing static H/K/L/M/N datasets and exam engine. It also includes the full Master Extraction Prompt files to keep the Admin AI generator compatible.

## 1. Back up first

Make a copy of the existing project folder. Do not remove or rename `frontend/public/data/H`, `K`, `L`, `M`, or `N`.

## 2. Overlay files

Extract this ZIP **into the root of the existing `question-paper-platform` folder** (the directory containing the root `package.json`, `frontend/`, `processor/`, and `source/`). Allow files in the patch to replace matching files. Do not extract into a second nested project folder.

## 3. Install and build

From PowerShell in the project root:

```powershell
npm run install:all
npm run build
```

Use `npx vercel dev` for local integration testing because `npm run dev` starts Vite only and does not emulate the database-backed `/api/*` functions.

## 4. Vercel settings

Set the Vercel Project Root Directory to the repository root containing `vercel.json`, the root `package.json`, and `/api`. The API routes will not deploy correctly if the Root Directory is set to `frontend/`.

Add Neon Postgres from the Vercel Marketplace (current listing says plans start at $0; usage limits/pricing may change), open the database SQL editor and run `db/schema.sql` once. Configure these **server-only** variables in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET` (random secret, at least 32 characters)
- `APP_BASE_URL` (canonical HTTPS site URL)
- `RESEND_API_KEY`
- `EMAIL_FROM` (sender on a verified email domain)
- `RAZORPAY_KEY_ID` (start with test mode)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET` (different secret configured for the webhook)

Do not prefix any of these with `VITE_`; never add real secrets to the repository.

## 5. Bootstrap first admin

Read `docs/ACCOUNT_PAYMENT_DEPLOYMENT.md` section “Create the first administrator” and run the script once from a trusted terminal with the database URL and unique bootstrap password supplied through environment variables. Do not commit a default admin password. The script refuses to create another bootstrap admin if one exists.

## 6. Activation/password policy

The production flow intentionally does **not** assign the shared `Student@123` password to every account. Admin approval/invitation sends a one-time activation link; the recipient chooses their own password. This avoids shared-password account takeover. Account registration collects name, username, email and mobile, but mobile is not SMS-verified in this MVP. Activation/reset links require configured Resend and a verified sender domain.

## 7. Payments

Use Razorpay test keys first. Configure the webhook URL as `https://YOUR_CANONICAL_DOMAIN/api/payments/webhook` and subscribe to `payment.captured` and `order.paid`. Test verified payment, cancellation/failure, repeated webhook delivery, and entitlement checks before switching to live credentials. H/K/L/M/N are hard-coded as permanently free. Paid assessments created through Admin are stored privately in the database, not in public JSON.

## 8. Public website and custom domain

The patch adds public homepage/search/pricing, placeholder blog/testimonials (labeled as illustrative), Terms/Privacy/Contact/About pages, cookie preferences, theme toggle, newsletter UI, notification placeholder, and simulated support chat. Replace legal placeholders and illustrative content before commercial launch. Add the domain in Vercel Project Settings -> Domains and apply the exact DNS records shown by Vercel; set `APP_BASE_URL` to the canonical HTTPS domain and redeploy.

## 9. Test checklist

Run:

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

Then in Vercel Preview or using `npx vercel dev`, verify registration -> admin approval -> email activation -> login -> forced password change if prompted -> profile/logout -> password reset; attempt and score every H/K/L/M/N set; create a new private paid assessment; create a paid product; test Razorpay checkout and webhook; confirm free papers cannot be paywalled. Use test-mode payment credentials in Preview only.

## Limitations to understand

- The free H/K/L/M/N papers remain static/public JSON by design; they cannot be made private without changing their storage/access model.
- Vercel cannot persist new files into GitHub from a static frontend. The hosted admin saves paid assessments to the private database; a new free static exam still requires a separate content release.
- Vercel serverless JSON endpoint limit is 4 MiB for AI/private assessment payloads; large PDFs should be processed locally or moved to object storage.
- No software can eliminate every security concern. This patch adds server-side password hashing, HttpOnly sessions, role and entitlement checks, rate limiting, same-origin checks, secret separation, Razorpay signature verification, and audit events, but a real public paid launch still needs security review, tested provider configuration, incident monitoring, refund and privacy policies.
