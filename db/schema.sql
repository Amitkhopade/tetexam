-- Question Paper Navigator: account, access and payments schema.
-- Run this once in the Neon SQL Editor attached to your Vercel project.
-- Passwords are NEVER stored in clear text; app_users.password_hash stores scrypt hashes.

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  mobile text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student','educator','admin')) DEFAULT 'student',
  status text NOT NULL CHECK (status IN ('active','disabled')) DEFAULT 'active',
  password_hash text,
  must_change_password boolean NOT NULL DEFAULT false,
  session_version integer NOT NULL DEFAULT 1,
  approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_lower_uq ON app_users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS app_users_username_lower_uq ON app_users (lower(username));

CREATE TABLE IF NOT EXISTS signup_requests (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  email text NOT NULL,
  mobile text NOT NULL,
  full_name text NOT NULL,
  note text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  assigned_role text CHECK (assigned_role IN ('student','educator','admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid REFERENCES app_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS signup_pending_email_uq ON signup_requests (lower(email)) WHERE status='pending';
CREATE UNIQUE INDEX IF NOT EXISTS signup_pending_username_uq ON signup_requests (lower(username)) WHERE status='pending';

CREATE TABLE IF NOT EXISTS account_tokens (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('activate','password_reset')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS account_tokens_user_idx ON account_tokens(user_id,purpose,expires_at);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id bigserial PRIMARY KEY,
  key_hash text NOT NULL,
  scope text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx ON rate_limit_events(scope,key_hash,created_at DESC);

CREATE TABLE IF NOT EXISTS products (
  product_id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  paper_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_paper_ids_gin_idx ON products USING gin(paper_ids);

CREATE TABLE IF NOT EXISTS paid_assessments (
  paper_id text PRIMARY KEY,
  booklet_code text NOT NULL UNIQUE,
  metadata jsonb NOT NULL,
  questions_json jsonb NOT NULL,
  answer_key_json jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('draft','published','archived')) DEFAULT 'draft',
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id),
  product_id text NOT NULL REFERENCES products(product_id),
  provider_order_id text NOT NULL UNIQUE,
  provider_payment_id text UNIQUE,
  amount_paise integer NOT NULL CHECK(amount_paise > 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL CHECK(status IN ('created','paid','failed','refunded')) DEFAULT 'created',
  verification_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS payment_orders_user_idx ON payment_orders(user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS exam_entitlements (
  user_id uuid NOT NULL REFERENCES app_users(id),
  product_id text NOT NULL REFERENCES products(product_id),
  order_id uuid NOT NULL REFERENCES payment_orders(id),
  status text NOT NULL CHECK(status IN ('active','revoked')) DEFAULT 'active',
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  PRIMARY KEY(user_id,product_id)
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email text PRIMARY KEY,
  source text NOT NULL DEFAULT 'public_homepage',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON audit_events(created_at DESC);
