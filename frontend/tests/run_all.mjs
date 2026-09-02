// Aerostake Frontend Master Test Suite Runner
import { runAuthRoleTests } from './auth_role.test.mjs';
import { runApiClientTests } from './api_client.test.mjs';
import { runLifecycleTests } from './lifecycle.test.mjs';

console.log('====================================================');
console.log('  🚀 RUNNING AEROSTAKE FRONTEND TEST SUITES');
console.log('====================================================\n');

try {
  runAuthRoleTests();
  console.log('');
  runApiClientTests();
  console.log('');
  runLifecycleTests();
  console.log('\n====================================================');
  console.log('  ✨ ALL FRONTEND TEST SUITES PASSED (100% SUCCESS)');
  console.log('====================================================');
  process.exit(0);
} catch (err) {
  console.error('\n❌ TEST SUITE FAILURE:', err);
  process.exit(1);
}
