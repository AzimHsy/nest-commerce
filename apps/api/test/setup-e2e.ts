import { config } from 'dotenv';

// Load apps/api/.env, then force the API to talk to the TEST database.
// @nestjs/config gives precedence to process.env over .env file values,
// so overriding DATABASE_URL here routes every e2e suite to nest_commerce_test.
config();
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

// e2e suites hammer the API far harder than a browser would — raise the global
// throttle so rate limiting (verified live in Unit 8) never flakes the tests.
process.env.THROTTLE_LIMIT = '100000';
