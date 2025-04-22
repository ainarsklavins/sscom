import { scrapeListingPages } from './scraper';
import { processAndFilterListings } from './filter';
import { sendListingSummaryEmail } from './email';
import { readSeenListingsFromS3, writeSeenListingsToS3 } from './s3Helper';

console.log('🏃 Monitor runner logic loaded');

/**
 * Processes a single monitor configuration.
 * Fetches listings, filters them, checks against seen URLs, sends email, and updates seen URLs.
 * @param {object} monitor - The monitor configuration object from config.js
 * @returns {Promise<object>} - A result object summarizing the run.
 */
export async function runSingleMonitor(monitor) {
    const monitorId = monitor.id;
    console.log(`
--- Running Single Monitor: ${monitorId} ---`);
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
        // 1. Read previously seen listings from S3
        console.log(`[${monitorId} - Step 1/6] Reading seen listings...`);
        const seenUrlsSet = await readSeenListingsFromS3(monitorId);
        console.log(`[${monitorId} - Step 1/6] Loaded ${seenUrlsSet.size} seen URLs.`);

        // 2. Scrape pages
        console.log(`[${monitorId} - Step 2/6] Scraping up to ${monitor.maxPages} pages...`);
        const htmlPages = await scrapeListingPages(monitor);
        monitorResult.pagesScraped = htmlPages.length;
        if (htmlPages.length === 0) {
            console.warn(`[${monitorId} - Step 2/6] No pages scraped.`);
            monitorResult.message = 'Scraping completed, but no pages fetched.';
            return monitorResult; // Return early, no further processing
        }
        console.log(`[${monitorId} - Step 2/6] Scraping completed.`);

        // 3. Filter listings by criteria
        console.log(`[${monitorId} - Step 3/6] Processing & filtering...`);
        const criteriaFilteredListings = processAndFilterListings(htmlPages, monitor.filters, monitorId, monitor.type);
        monitorResult.listingsMatchingCriteria = criteriaFilteredListings.length;
        console.log(`[${monitorId} - Step 3/6] Found ${criteriaFilteredListings.length} listings matching criteria.`);

        // 4. Filter out seen listings
        console.log(`[${monitorId} - Step 4/6] Filtering out seen listings...`);
        let newListingUrls = [];
        const newUnseenListings = criteriaFilteredListings.filter(listing => {
            if (!listing.link) return false;
            const hasBeenSeen = seenUrlsSet.has(listing.link);
            if (!hasBeenSeen) {
                newListingUrls.push(listing.link);
            }
            return !hasBeenSeen;
        });
        monitorResult.newListingCount = newUnseenListings.length;
        console.log(`[${monitorId} - Step 4/6] Found ${newUnseenListings.length} new listings.`);

        // 5. Send email summary (or generate preview)
        console.log(`[${monitorId} - Step 5/6] Processing email step...`);
        if (newUnseenListings.length > 0) {
            monitorResult.emailPreviewHtml = await sendListingSummaryEmail(newUnseenListings, monitor);
            console.log(`[${monitorId} - Step 5/6] Email step completed.`);
        } else {
            console.log(`[${monitorId} - Step 5/6] No new listings, email skipped.`);
        }

        // 6. Update seen list in S3
        console.log(`[${monitorId} - Step 6/6] Processing S3 update...`);
        if (newListingUrls.length > 0) {
            console.log(`[${monitorId} - Step 6/6] Updating seen listings in S3...`);
            newListingUrls.forEach(url => seenUrlsSet.add(url));
            await writeSeenListingsToS3(seenUrlsSet, monitorId);
            console.log(`[${monitorId} - Step 6/6] S3 update complete.`);
        } else {
            console.log(`[${monitorId} - Step 6/6] No new listings, S3 update skipped.`);
        }

        monitorResult.message = 'Monitor processed successfully.';

    } catch (error) {
        console.error(`❌ [${monitorId}] Error running monitor:`, error);
        monitorResult.status = 'error';
        monitorResult.message = `Error: ${error.message}`;
        monitorResult.errorDetails = error.stack;
    }

    console.log(`--- Finished Single Monitor: ${monitorId} | Status: ${monitorResult.status} ---`);
    return monitorResult;
} 