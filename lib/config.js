console.log('⚙️ config.js loaded');

const config = {
    // --- Email Configuration ---
    resendApiKey: process.env.RESEND_API_KEY,
    // List of recipient email addresses
    emailRecipients: process.env.EMAIL_RECIPIENTS ? process.env.EMAIL_RECIPIENTS.split(',') : ['klavins.ainars@gmail.com'], // Default or read from comma-separated env var
    emailSender: process.env.EMAIL_SENDER || 'hi@resend.aina.rs', // Default or read from env var
    // Control email sending: 'send' or 'preview' (or anything else for preview)
    sendEmailMode: process.env.SEND_EMAIL_MODE || 'preview',

    // --- Scraping Configuration ---
    scrapeTargetUrl: 'https://www.ss.com/lv/real-estate/flats/riga/centre/sell/',
    // Read max pages from env var, default to 10
    maxPagesToScrape: parseInt(process.env.MAX_PAGES_TO_SCRAPE, 10) || 10,
    // Delay between page fetches in milliseconds
    scrapeDelayMs: parseInt(process.env.SCRAPE_DELAY_MS, 10) || 1500, // Default to 1.5 seconds

    // --- Filtering Criteria ---
    // These could potentially be moved to a separate JSON file if they become very complex
    filterCriteria: {
        minRooms: 5,
        minSqMeters: 50,
        maxFloor: 5,
        maxM2Price: 6000,
        maxTotalPrice: 500000,
        // Define allowed districts/regions (ensure casing matches parsed output)
        allowedDistricts: ['Centrs'],
        // Optional: Filter by posting date (e.g., listings newer than 1 day)
        // maxListingAgeDays: 1,
    },

    // --- Base URL for constructing full listing links ---
    ssBaseUrl: 'https://www.ss.com',

    // --- Security ---
    cronSecret: process.env.CRON_SECRET,
};

// Basic validation for essential config
if (!config.resendApiKey) {
    console.error('❌ FATAL: RESEND_API_KEY environment variable is not set in .env.local');
    // Optional: throw new Error('Missing RESEND_API_KEY');
}
if (!config.emailRecipients || config.emailRecipients.length === 0) {
    console.error('❌ WARNING: No email recipients configured.');
}
if (!config.emailSender) {
    console.error('❌ WARNING: No email sender configured.');
}

if (!config.cronSecret) {
    console.warn('⚠️ WARNING: CRON_SECRET is not set. The /api/run-monitor endpoint is not secured.');
}

export default config;
