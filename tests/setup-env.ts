Object.assign(process.env,{NODE_ENV:"test"});
process.env.JWT_SECRET??="test-secret-that-is-at-least-32-characters-long";
process.env.APP_URL??="http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL??="http://localhost:3000";
process.env.PAYMENTS_ENABLED??="false";
process.env.EMAIL_ENABLED??="false";
process.env.TELEGRAM_ACCESS_ENABLED??="false";
