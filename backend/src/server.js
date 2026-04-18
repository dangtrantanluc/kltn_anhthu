const app = require('./app');
const dotenv = require('dotenv');
dotenv.config();

// Import cron jobs
require('./jobs/punchProcessor.job');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`📋  Environment: ${process.env.NODE_ENV || 'development'}`);
});
