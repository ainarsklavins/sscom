console.log('⚙️ config.js loaded');

// Array to hold configurations for each monitoring task
export const monitors = [
    {
        id: 'riga-centre-sell', // Unique identifier, used for S3 file name
        name: 'Centrs Pardod Dzivokļus', // User-friendly name for display/emails
        type: 'flat',
        url: 'https://www.ss.com/lv/real-estate/flats/riga/centre/sell/',
        maxPages: 10,
        recipients: ['klavins.ainars@gmail.com', 'zandatreija@gmail.com'],
        filters: { // Leave any field undefined or null to skip that filter
            minRooms: 5,
            minSqMeters: 50,
            maxFloor: 5,
            maxM2Price: 6000,
            maxTotalPrice: 500000,
            allowedDistricts: ['Centrs'], // Ensure casing matches if district parsing is added/refined
        },
    },
    {
        id: 'agenskalns-majas-pardod',
        name: 'Aģītis pardod mājas',
        type: 'house',
        url: 'https://www.ss.com/lv/real-estate/homes-summer-residences/riga/agenskalns/sell/',
        maxPages: 5,
        recipients: ['klavins.ainars@gmail.com', 'zandatreija@gmail.com'],
        filters: {
            // No specific filters, will just check for new unseen listings
            // minRooms: null,
            // minSqMeters: null,
            // maxFloor: null,
            // maxM2Price: null,
            // maxTotalPrice: null,
            // allowedDistricts: [],
        },
    },
    {
        id: 'agenskalns-majas-ire', // Unique identifier, used for S3 file name
        name: 'Aģītis izīrē mājas',
        type: 'house',
        url: 'https://www.ss.com/lv/real-estate/homes-summer-residences/riga/agenskalns/hand_over/',
        maxPages: 10,
        recipients: ['klavins.ainars@gmail.com', 'zandatreija@gmail.com'],
        filters: { // Leave any field undefined or null to skip that filter
            // minRooms: 5,
            // minSqMeters: 50,
            // maxFloor: 5,
            // maxM2Price: 6000,
            // maxTotalPrice: 500000,
            // allowedDistricts: ['Centrs'], // Ensure casing matches if district parsing is added/refined
        },
    },
];

// Global settings applicable across all monitors
export const globals = {
    resendApiKey: process.env.RESEND_API_KEY,
    emailSender: process.env.EMAIL_SENDER || 'hi@resend.aina.rs',
    // Control email sending: 'send' or 'preview' (or anything else for preview)
    sendEmailMode: process.env.SEND_EMAIL_MODE || 'preview',
    // Delay between page fetches in milliseconds
    scrapeDelayMs: parseInt(process.env.SCRAPE_DELAY_MS, 10) || 1500, // Default to 1.5 seconds
    // Base URL for constructing full listing links
    ssBaseUrl: 'https://www.ss.com',
    // Security token for the CRON job endpoint
    cronSecret: process.env.CRON_SECRET,
    // S3 configuration (remains global as bucket is shared)
    s3BucketName: process.env.S3_BUCKET_NAME,
    // Max number of seen URLs to store per monitor
    maxSeenListings: parseInt(process.env.MAX_SEEN_LISTINGS, 10) || 100,
};

// --- Basic Validation for Global Settings ---
if (!globals.resendApiKey) {
    console.error('❌ FATAL: RESEND_API_KEY environment variable is not set in .env.local');
    // Optional: throw new Error('Missing RESEND_API_KEY');
}
if (!globals.emailSender) {
    console.error('❌ WARNING: No global email sender configured (EMAIL_SENDER).');
}
if (!globals.s3BucketName) {
    console.error('❌ FATAL: S3_BUCKET_NAME environment variable is not set.');
    // Optional: throw new Error('Missing S3_BUCKET_NAME');
}
if (!globals.cronSecret) {
    console.warn('⚠️ WARNING: CRON_SECRET is not set. The /api/run-monitor endpoint is not secured.');
}

// Validate each monitor configuration
monitors.forEach((monitor, index) => {
    if (!monitor.id) {
        console.error(`❌ FATAL: Monitor at index ${index} is missing required 'id'.`);
        // throw new Error(`Monitor ${index} missing ID`);
    }
    if (!monitor.type || !['flat', 'house'].includes(monitor.type)) {
        console.error(`❌ FATAL: Monitor '${monitor.id}' is missing required 'type' (must be 'flat' or 'house').`);
        // Consider throwing an error here
    }
    if (!monitor.name) {
        console.warn(`⚠️ WARNING: Monitor '${monitor.id}' is missing a 'name'. Using ID as fallback.`);
        monitor.name = monitor.id; // Use id as a fallback name
    }
    if (!monitor.url) {
        console.error(`❌ FATAL: Monitor '${monitor.id}' is missing required 'url'.`);
        // throw new Error(`Monitor ${monitor.id} missing URL`);
    }
    if (!monitor.recipients || monitor.recipients.length === 0) {
        console.error(`❌ WARNING: Monitor '${monitor.id}' has no email recipients configured.`);
    }
    if (!monitor.filters) {
        console.warn(`⚠️ WARNING: Monitor '${monitor.id}' has no 'filters' object defined. Assuming no filtering needed.`);
        // Ensure filters object exists even if empty to avoid errors later
        monitor.filters = {};
    }
});

console.log(`✅ Config loaded. Found ${monitors.length} monitor(s). Global mode: ${globals.sendEmailMode}.`);

// Note: We are no longer exporting a default object.
// Import specific parts like: import { monitors, globals } from './config';
