# Change Log — Account Approval, Public Site and Payments

## Added
- Public marketing homepage with public H/K/L/M/N catalogue display and search, pricing, blog/news placeholder, clearly labeled illustrative testimonials, Terms, Privacy, Contact/About, newsletter signup, notification placeholder, theme toggle, cookie preference UI, simulated chat widget and not-found page.
- Public registration flow with name, username, email, mobile number and optional reason; submissions enter the pending approval queue.
- Server-side authentication APIs for login, logout, current session, activation, password reset, and password changes.
- Admin management UI for approval/rejection, role assignment, invitations, activation link resend, disable/re-enable, private assessment upload, product pricing, and payment order history.
- Neon Postgres schema for users, signup requests, single-use activation/reset tokens, rate limiting, audit events, private assessments, products, payment orders, entitlements and newsletter records.
- Resend activation/password reset delivery.
- Razorpay checkout order creation, server signature verification, captured-payment verification, webhook verification and entitlement grant.
- Private paid assessment route with authorization check. Existing free paper IDs are protected from paid-product assignment.
- Vercel root configuration for functions, SPA deep links and basic response headers.
- `tools/test_auth_billing.mjs` covering dataset validation, free-paper protection, payment signatures, origin rejection and Vercel route config.

## Preserved
- Existing React/Vite exam engine and scoring/session logic.
- Existing H/K/L/M/N static question/answer/paper JSON files. No data files are modified by this patch.
- Existing Admin AI generator prompt and PDF-to-JSON flow. The provider request now uses an authenticated Vercel Function route; a new action can save a generated, validated new exam privately in the database for paid access. Local-only static save remains available in development.
- Existing manual JSON upload. The static file writer remains local-development-only; a hosted static site cannot write back to the Git repository.

## Security-related decisions
- No shared `Student@123` password is issued to real accounts. Approved/invited users set their own password from a single-use time-limited email link. This avoids a known shared default across student and admin accounts.
- The first admin is created through a one-time CLI bootstrap. Public registration cannot choose its own role.
- API secrets are server environment variables, never `VITE_*`; user passwords are scrypt-hashed; session cookies are HttpOnly.
- Payment access is based on server-side-verified payment plus database entitlement, not a client-side success flag.
- Phone number verification, full privacy/legal review, spam-resistant CAPTCHA and security pen-test are outside this patch and are clearly documented.
