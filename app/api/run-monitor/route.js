import { NextResponse } from 'next/server';
import config from '@/lib/config'; // Import config
import { scrapeListingPages } from '@/lib/scraper';
import { processAndFilterListings } from '@/lib/filter';
import { sendListingSummaryEmail } from '@/lib/email';
import { readSeenListingsFromS3, writeSeenListingsToS3 } from '@/lib/s3Helper'; // Import S3 helpers

console.log('🚦 API route handler loaded: /api/run-monitor');

export async function GET(request) {
    console.log('▶️ Received request to /api/run-monitor');

    // --- Authorization Check --- 
    const expectedSecret = config.cronSecret;
    const authHeader = request.headers.get('authorization');

    // --- DEBUGGING LOGS ---
    console.log(`[DEBUG] Expected Secret (from config): '${expectedSecret}'`);
    console.log(`[DEBUG] Received Authorization Header: '${authHeader}'`);
    console.log(`[DEBUG] Comparison String: 'Bearer ${expectedSecret}'`);
    // --- END DEBUGGING LOGS ---

    if (expectedSecret) { // Only check if CRON_SECRET is configured
        if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
            console.warn('🚫 Unauthorized attempt to trigger monitor job.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('🔑 Authorization successful.');
    } else {
        console.warn('⚠️ Monitor job endpoint is unsecured (CRON_SECRET not set).');
    }
    // --- End Authorization Check --- 

    let emailPreviewHtml = null;
    let seenUrlsSet = new Set();
    let newListingUrls = [];

    try {
        // 0. Read previously seen listings from S3
        console.log('[Step 0/4] Reading seen listings from S3...');
        seenUrlsSet = await readSeenListingsFromS3();
        console.log(`[Step 0/4] Loaded ${seenUrlsSet.size} previously seen URLs.`);

        // 1. Scrape pages using config
        const maxPagesToScrape = config.maxPagesToScrape;
        console.log(`[Step 1/4] Scraping up to ${maxPagesToScrape} pages...`);
        const htmlPages = await scrapeListingPages(maxPagesToScrape);

        if (!htmlPages || htmlPages.length === 0) {
            console.warn('⚠️ No pages were successfully scraped. Skipping further processing.');
            // Optionally, still write the (unchanged) seen list back to S3 if desired, but likely unnecessary
            return NextResponse.json({ message: 'Scraping completed, but no pages fetched.', pagesScraped: 0, listingsFound: 0, newListingCount: 0 });
        }
        console.log(`[Step 1/4] Scraping completed. Fetched ${htmlPages.length} pages.`);

        // 2. Filter listings based on criteria (price, rooms, etc.)
        console.log('[Step 2/4] Processing and filtering listings by criteria...');
        const criteriaFilteredListings = processAndFilterListings(htmlPages);
        console.log(`[Step 2/4] Found ${criteriaFilteredListings.length} listings matching criteria.`);

        // 3. Filter out already seen listings
        console.log('[Step 3/4] Filtering out previously seen listings...');
        const newUnseenListings = criteriaFilteredListings.filter(listing => {
            if (!listing.link) return false; // Skip if link is missing
            const hasBeenSeen = seenUrlsSet.has(listing.link);
            if (!hasBeenSeen) {
                newListingUrls.push(listing.link); // Keep track of new URLs to add later
            }
            return !hasBeenSeen;
        });
        console.log(`[Step 3/4] Found ${newUnseenListings.length} new, unseen listings.`);

        // 4. Send email summary (or generate preview) ONLY for new listings
        console.log('[Step 4/4] Processing email step for new listings...');
        emailPreviewHtml = await sendListingSummaryEmail(newUnseenListings);
        console.log('[Step 4/4] Email step completed.');

        // 5. Update seen list in S3 if new listings were found
        if (newListingUrls.length > 0) {
            console.log(`[Step 5/5] Updating seen listings in S3...`);
            newListingUrls.forEach(url => seenUrlsSet.add(url));
            await writeSeenListingsToS3(seenUrlsSet);
            console.log(`[Step 5/5] S3 update complete.`);
        } else {
            console.log(`[Step 5/5] No new listings found, S3 update not required.`);
        }

        // Respond successfully
        return NextResponse.json({
            message: 'Monitoring process completed successfully.',
            pagesScraped: htmlPages.length,
            listingsMatchingCriteria: criteriaFilteredListings.length,
            newListingCount: newUnseenListings.length,
            emailPreviewHtml: config.sendEmailMode !== 'send' ? emailPreviewHtml : null,
        });

    } catch (error) {
        console.error('❌ Error during monitoring process execution:', error);
        // Consider sending an error notification email here
        // await sendErrorNotificationEmail(error); 
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
