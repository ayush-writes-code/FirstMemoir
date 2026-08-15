export function assertTestDatabaseSafe() {
  // 1. Must be test environment
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('FATAL: Destructive test cleanup refused. NODE_ENV is not "test".');
  }

  const dbUrl = process.env.DATABASE_TEST_URL || '';

  // 2. DATABASE_TEST_URL must exist and we must be using it
  if (!process.env.DATABASE_TEST_URL || process.env.DATABASE_URL !== process.env.DATABASE_TEST_URL) {
    throw new Error('FATAL: Destructive test cleanup refused. DATABASE_URL must strictly match DATABASE_TEST_URL.');
  }

  // 3. Must be isolated test database (fail-closed check on connection string)
  if (!dbUrl.includes('test_db') || !dbUrl.includes('localhost') || !dbUrl.includes('54320')) {
    throw new Error('FATAL: Destructive test cleanup refused. Database URL does not match the strict isolated test database configuration.');
  }

  // If all checks pass, we are safe.
}
