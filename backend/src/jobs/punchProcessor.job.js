const cron = require('node-cron');
const { processPunchLogs } = require('../modules/attendance/attendance.service');

// Run every 5 minutes
// Cron expression: "*/5 * * * *"  =>  minute divisible by 5, any hour, any day
cron.schedule('*/5 * * * *', async () => {
    console.log(`[CRON] ${new Date().toISOString()} — Processing punch logs...`);
    await processPunchLogs();
});

console.log('📅  Punch log processor scheduled: every 5 minutes');
