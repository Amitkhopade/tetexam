
import { neon } from '@neondatabase/serverless';

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.NEON_DATABASE_URL;

if (!url) {
  console.error('FAIL: No database URL found.');
  process.exit(1);
}

try {
  // Connect to Neon.
  const sql = neon(url);

  // Test database connectivity and verify the table.
  const connection = await sql`
    SELECT
      1 AS connection_test,
      current_database() AS database_name,
      to_regclass('public.app_users') AS users_table
  `;

  const db = connection[0];

  console.log('\n--- DATABASE CHECK ---');
  console.log(
    'Connection:',
    Number(db.connection_test) === 1 ? 'PASS' : 'FAIL'
  );
  console.log('Database:', db.database_name);
  console.log(
    'app_users table:',
    db.users_table ? 'FOUND' : 'NOT FOUND'
  );

  if (!db.users_table) {
    process.exitCode = 1;
  } else {
    // Check the admin record without revealing its password.
    const admins = await sql`
      SELECT
        username,
        role,
        status,
        (password_hash IS NOT NULL) AS has_password
      FROM public.app_users
      WHERE lower(username) = 'amit'
      LIMIT 1
    `;

    console.log('\n--- ADMIN ACCOUNT CHECK ---');

    if (admins.length === 0) {
      console.log('Admin account: NOT FOUND');
    } else {
      const admin = admins[0];

      console.log('Username:', admin.username);
      console.log('Role:', admin.role);
      console.log('Status:', admin.status);
      console.log(
        'Password hash stored:',
        admin.has_password ? 'YES' : 'NO'
      );
    }
  }
} catch (error) {
  console.error('\nFAIL: Database test encountered an error.');
  console.error('Error:', error.message);
  process.exitCode = 1;
}
