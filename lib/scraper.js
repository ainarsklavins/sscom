import { globals } from './config'; // Import globals instead of the default config

console.log('🚀 scraper.js loaded');

/**
 * Fetches HTML content from multiple pages for a specific monitor configuration.
 * @param {object} monitor - The monitor configuration object (contains url, maxPages).
 * @returns {Promise<string[]>} - Array of HTML content strings for each successfully fetched page.
 */
export async function scrapeListingPages(monitor) {
    const { url: baseUrl, maxPages } = monitor;
    const delayMs = globals.scrapeDelayMs; // Use delay from globals

    console.log(`🚀 [${monitor.id}] Starting scraping up to ${maxPages} pages from ${baseUrl}...`);

    const page_contents = [];

    for (let n = 1; n <= maxPages; n++) {
        // Construct URL: page 1 is base, subsequent pages add page{n}.html
        const page_url = n === 1 ? `${baseUrl}` : `${baseUrl}page${n}.html`;
        console.log(`⏳ [${monitor.id}] Fetching page: ${page_url}`);

        try {
            const response = await fetch(page_url);
            if (!response.ok) {
                console.error(`❌ [${monitor.id}] HTTP error! Status: ${response.status} for ${page_url}`);
                page_contents.push(null); // Indicate failure for this page
            } else {
                const htmlContent = await response.text();
                page_contents.push(htmlContent);
                console.log(`📄 [${monitor.id}] Fetched content for page ${n}. Size: ${htmlContent.length} bytes.`);
            }
        } catch (error) {
            console.error(`❌ [${monitor.id}] Network or fetch error for ${page_url}:`, error.message);
            page_contents.push(null); // Indicate failure for this page
        }

        // Add delay if not the last page and delay is configured
        if (n < maxPages && delayMs > 0) {
            console.log(`⏱️ [${monitor.id}] Waiting ${delayMs}ms before next request...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    const successfulPages = page_contents.filter(content => content !== null).length;
    console.log(`✅ [${monitor.id}] Scraping finished. Successfully fetched ${successfulPages}/${maxPages} pages.`);
    // Return only successfully fetched pages
    return page_contents.filter(content => content !== null);
}
