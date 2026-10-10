import { neon } from '@neondatabase/serverless'
import { randomBytes, scrypt as nodeScrypt } from 'node:crypto'
import { promisify } from 'node:util'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const scrypt = promisify(nodeScrypt)
const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL
if (!connection) {
  console.error('Set DATABASE_URL (or POSTGRES_URL) in the current PowerShell session before bootstrapping.')
  process.exit(1)
}
const password = String(process.env.BOOTSTRAP_ADMIN_PASSWORD || '')
if (!password) {
  console.error('Set BOOTSTRAP_ADMIN_PASSWORD temporarily from a secure prompt before running this command. Do not put the password in source code or an .env file.')
  process.exit(1)
}
const sql = neon(connection)
const admins = await sql`SELECT count(*)::int AS count FROM app_users WHERE role='admin' AND status='active'`
if (Number(admins[0]?.count || 0) > 0) {
  console.error('An active admin already exists. For safety, this bootstrap can only create the first admin once.')
  process.exit(1)
}
const rl = createInterface({ input, output })
try {
  const fullName = (await rl.question('Admin full name: ')).trim()
  const username = (await rl.question('Admin username (3-32 chars): ')).trim().toLowerCase()
  const email = (await rl.question('Admin email: ')).trim().toLowerCase()
  const mobile = (await rl.question('Admin mobile with country code if needed: ')).trim().replace(/[\s()-]/g,'')
  if (fullName.length < 2 || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[0-9]{10,15}$/.test(mobile)) throw new Error('One or more entered values are invalid.')
  if (password.length < 12 || password.length > 128 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new Error('Use a 12-128 character password containing letters and numbers.')
  const duplicates = await sql`SELECT 1 FROM app_users WHERE lower(username)=${username} OR lower(email)=${email} LIMIT 1`
  if (duplicates.length) throw new Error('That username or email already exists.')
  const salt = randomBytes(16).toString('hex')
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  const encoded = `scrypt$16384$${salt}$${Buffer.from(derived).toString('hex')}`
  await sql`INSERT INTO app_users (username,email,mobile,full_name,role,status,password_hash,must_change_password,session_version,approved_at,created_at)
    VALUES (${username},${email},${mobile},${fullName},'admin','active',${encoded},false,1,now(),now())`
  console.log(`Created first active admin '${username}'. Store the password securely; it is not written to the repository.`)
} finally {
  rl.close()
}
