import { NextResponse } from 'next/server';
import { monitors, globals } from '@/lib/config'; // Import new config structure
import { scrapeListingPages } from '@/lib/scraper';
import { processAndFilterListings } from '@/lib/filter';
import { sendListingSummaryEmail } from '@/lib/email';
import { readSeenListingsFromS3, writeSeenListingsToS3 } from '@/lib/s3Helper';

console.log('🚦 API route handler loaded: /api/run-monitor');

export async function GET(request) {
    console.log('▶️ Received request to /api/run-monitor');

    // --- Authorization Check (using globals.cronSecret) --- 
    const expectedSecret = globals.cronSecret;
    const authHeader = request.headers.get('authorization');

    if (expectedSecret) {
        if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
            console.warn('🚫 Unauthorized attempt to trigger monitor job.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        console.log('🔑 Authorization successful.');
    } else {
        console.warn('⚠️ Monitor job endpoint is unsecured (CRON_SECRET not set in globals).');
    }
    // --- End Authorization Check ---

    const results = []; // Store results for each monitor
    let overallStatus = 'success'; // Track if any monitor fails

    // --- Loop through each monitor defined in config --- 
    console.log(`🏁 Starting processing for ${monitors.length} monitor(s)...`);

    for (const monitor of monitors) {
        const monitorId = monitor.id;
        console.log(`
--- Processing Monitor: ${monitorId} ---`);
        let monitorResult = {
            monitorId: monitorId,
            status: 'success',
            message: '',
            pagesScraped: 0,
            listingsMatchingCriteria: 0,
            newListingCount: 0,
            emailPreviewHtml: null,
            errorDetails: null,
        };

        try {
            // 1. Read previously seen listings from S3 for this monitor
            console.log(`[${monitorId} - Step 1/6] Reading seen listings from S3...`);
            const seenUrlsSet = await readSeenListingsFromS3(monitorId);
            console.log(`[${monitorId} - Step 1/6] Loaded ${seenUrlsSet.size} previously seen URLs.`);

            // 2. Scrape pages using monitor config
            console.log(`[${monitorId} - Step 2/6] Scraping up to ${monitor.maxPages} pages...`);
            const htmlPages = await scrapeListingPages(monitor);
            monitorResult.pagesScraped = htmlPages.length;

            if (htmlPages.length === 0) {
                console.warn(`[${monitorId} - Step 2/6] No pages were successfully scraped. Skipping further processing for this monitor.`);
                monitorResult.message = 'Scraping completed, but no pages fetched.';
                results.push(monitorResult); // Add result and continue to next monitor
                continue;
            }
            console.log(`[${monitorId} - Step 2/6] Scraping completed.`);

            // 3. Filter listings based on monitor criteria
            console.log(`[${monitorId} - Step 3/6] Processing and filtering listings by criteria...`);
            // Pass monitor.filters, monitorId, AND monitor.type
            const criteriaFilteredListings = processAndFilterListings(htmlPages, monitor.filters, monitorId, monitor.type);
            monitorResult.listingsMatchingCriteria = criteriaFilteredListings.length;
            console.log(`[${monitorId} - Step 3/6] Found ${criteriaFilteredListings.length} listings matching criteria.`);

            // 4. Filter out already seen listings
            console.log(`[${monitorId} - Step 4/6] Filtering out previously seen listings...`);
            let newListingUrls = [];
            const newUnseenListings = criteriaFilteredListings.filter(listing => {
                if (!listing.link) return false;
                const hasBeenSeen = seenUrlsSet.has(listing.link);
                if (!hasBeenSeen) {
                    newListingUrls.push(listing.link); // Track new URLs
                }
                return !hasBeenSeen;
            });
            monitorResult.newListingCount = newUnseenListings.length;
            console.log(`[${monitorId} - Step 4/6] Found ${newUnseenListings.length} new, unseen listings.`);

            // 5. Send email summary (or generate preview) ONLY for new listings
            console.log(`[${monitorId} - Step 5/6] Processing email step for new listings...`);
            if (newUnseenListings.length > 0) {
                // Pass the monitor object for recipients etc.
                monitorResult.emailPreviewHtml = await sendListingSummaryEmail(newUnseenListings, monitor);
                console.log(`[${monitorId} - Step 5/6] Email step completed.`);
            } else {
                console.log(`[${monitorId} - Step 5/6] No new listings, email step skipped.`);
            }

            // 6. Update seen list in S3 if new listings were found
            console.log(`[${monitorId} - Step 6/6] Processing S3 update step...`);
            if (newListingUrls.length > 0) {
                console.log(`[${monitorId} - Step 6/6] Updating seen listings in S3...`);
                newListingUrls.forEach(url => seenUrlsSet.add(url));
                // Pass monitorId for the file key
                await writeSeenListingsToS3(seenUrlsSet, monitorId);
                console.log(`[${monitorId} - Step 6/6] S3 update complete.`);
            } else {
                console.log(`[${monitorId} - Step 6/6] No new listings found, S3 update not required.`);
            }

            monitorResult.message = 'Monitor processed successfully.';

        } catch (error) {
            console.error(`❌ [${monitorId}] Error during processing:`, error);
            monitorResult.status = 'error';
            monitorResult.message = `Error processing monitor: ${error.message}`;
            monitorResult.errorDetails = error.stack; // Include stack trace for debugging
            overallStatus = 'partial_error'; // Mark overall job as having issues
            // Optionally send an error notification specific to this monitor failure
        }

        results.push(monitorResult);
        console.log(`--- Finished Monitor: ${monitorId} | Status: ${monitorResult.status} ---`);

    } // End of loop through monitors

    // --- Final Response --- 
    console.log(`
🏁🏁 Finished processing all monitors. Overall status: ${overallStatus}`);

    const responseBody = {
        overallStatus: overallStatus,
        results: results,
    };

    // Conditionally remove preview HTML if in 'send' mode before sending response
    if (globals.sendEmailMode === 'send') {
        responseBody.results.forEach(res => { res.emailPreviewHtml = null; });
    }

    return NextResponse.json(responseBody);
}
