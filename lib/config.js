console.log('⚙️ config.js loaded');

import { s3ReadJson } from './storage.js';

// ---------- defaultConfig is used on first run or if S3 file missing ----------
export const defaultConfig = {
    monitors: [
        {
            id: 'center-sell-appartment', // Unique identifier, used for S3 file name
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
            id: 'centre-sell-house', // Unique identifier, used for S3 file name
            name: 'Centrs Pardod Māju', // User-friendly name for display/emails
            type: 'house',
            url: 'https://www.ss.com/lv/real-estate/homes-summer-residences/riga/centre/sell/',
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
    ],
    globals: {
        emailSender: 'hi@resend.aina.rs',
        sendEmailMode: 'preview',
        scrapeDelayMs: 1500,
        ssBaseUrl: 'https://www.ss.com',
        maxSeenListings: 100,
    },
};

// ---------- load JSON from S3 (top-level await; Node 14+ / Next.js 15 OK) ----------
const s3Data = await s3ReadJson('config/config.json', {});

// Merge S3 data on top of defaults for missing keys
const remoteCfg = {
    monitors: Array.isArray(s3Data.monitors) && s3Data.monitors.length > 0 ? s3Data.monitors : defaultConfig.monitors,
    globals: {
        ...defaultConfig.globals, // Start with defaults (including emailSender)
        ...((typeof s3Data.globals === 'object' && s3Data.globals) || {}), // Overlay S3 globals
    },
};

// ---------- export exactly what other files expect ----------
export const monitors = remoteCfg.monitors;
export const globals = {
    // Start with the merged config (defaults + S3)
    ...remoteCfg.globals,
    // Environment variables OVERRIDE specific keys
    resendApiKey: process.env.RESEND_API_KEY,
    // Use env var if present, otherwise keep the value from remoteCfg (which came from S3 or default)
    emailSender: process.env.EMAIL_SENDER || remoteCfg.globals.emailSender,
    cronSecret: process.env.CRON_SECRET,
    s3BucketName: process.env.S3_BUCKET_NAME,
    // Allow runtime override via env for scrapeDelayMs specifically
    scrapeDelayMs: parseInt(process.env.SCRAPE_DELAY_MS ?? remoteCfg.globals.scrapeDelayMs, 10),
};

// ---------- validation block remains exactly as before ----------
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
