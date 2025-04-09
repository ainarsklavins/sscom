import config from './config';

console.log('🚀 scraper.js loaded');

/**
 * Fetches HTML content from multiple pages of ss.com real estate listings.
 * @param {number} [maxPages=config.maxPagesToScrape] - Maximum number of pages to scrape.
 * @returns {Promise<string[]>} - Array of HTML content strings for each page.
 */
export async function scrapeListingPages(maxPages = config.maxPagesToScrape) {
    console.log(`🚀 Starting scraping up to ${maxPages} pages from ${config.scrapeTargetUrl}...`);
    const base_url = config.scrapeTargetUrl;
    const page_contents = [];
    const delayMs = config.scrapeDelayMs;

    for (let n = 1; n <= maxPages; n++) {
        // Construct URL: page 1 is base, subsequent pages add page{n}.html
        const page_url = n === 1 ? `${base_url}` : `${base_url}page${n}.html`;
        console.log(`⏳ Fetching page: ${page_url}`);

        try {
            const response = await fetch(page_url);
            if (!response.ok) {
                // Log specific HTTP errors
                console.error(`❌ HTTP error! Status: ${response.status} for ${page_url}`);
                // Optionally throw or handle specific statuses (e.g., 404, 503)
                // For now, we continue to the next page after logging
                page_contents.push(null);
            } else {
                const htmlContent = await response.text();
                page_contents.push(htmlContent);
                console.log(`📄 Fetched content for page ${n}. Size: ${htmlContent.length} bytes.`);
            }
        } catch (error) {
            console.error(`❌ Network or fetch error for ${page_url}:`, error.message);
            page_contents.push(null); // Add null to indicate failure for this page
        }

        // Add delay if not the last page
        if (n < maxPages && delayMs > 0) {
            console.log(`⏱️ Waiting ${delayMs}ms before next request...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    const successfulPages = page_contents.filter(content => content !== null).length;
    console.log(`✅ Scraping finished. Successfully fetched ${successfulPages}/${maxPages} pages.`);
    return page_contents.filter(content => content !== null); // Return only successfully fetched pages
}
