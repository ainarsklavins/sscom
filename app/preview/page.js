import config from '@/lib/config';
import { scrapeListingPages } from '@/lib/scraper';
import { processAndFilterListings } from '@/lib/filter';
import { sendListingSummaryEmail } from '@/lib/email';

// Ensure this page always uses preview mode for email generation
// Temporarily override config for this specific page load if needed,
// although the default is 'preview'
const effectiveEmailMode = 'preview'; // Force preview for this page

async function getPreviewData() {
    console.log('⚡️ Generating data for /preview page...');
    let emailPreviewHtml = '<p>Error generating preview.</p>';
    let statusMessage = 'Starting...';
    let listingsFound = 0;
    let pagesScraped = 0;

    try {
        // --- Simulate the API route logic --- 

        // 1. Scrape pages
        const maxPages = config.maxPagesToScrape; // Use configured max pages
        statusMessage = `[1/3] Scraping up to ${maxPages} pages...`;
        console.log(statusMessage);
        const htmlPages = await scrapeListingPages(maxPages);
        pagesScraped = htmlPages.length;

        if (!htmlPages || htmlPages.length === 0) {
            statusMessage = `[Completed] Scraping finished, but no pages fetched. Generating empty preview.`;
            console.warn(statusMessage);
            // Generate preview for empty list, forcing preview mode
            emailPreviewHtml = await sendListingSummaryEmail([]);
        } else {
            statusMessage = `[1/3] Scraping completed. Fetched ${pagesScraped} pages.`;
            console.log(statusMessage);

            // 2. Filter listings
            statusMessage = `[2/3] Processing and filtering listings...`;
            console.log(statusMessage);
            const filteredListings = processAndFilterListings(htmlPages);
            listingsFound = filteredListings.length;
            statusMessage = `[2/3] Filtering completed. Found ${listingsFound} listings matching criteria.`;
            console.log(statusMessage);

            // 3. Generate email preview HTML
            statusMessage = `[3/3] Generating email preview HTML...`;
            console.log(statusMessage);
            // Force preview mode by temporarily setting config or passing a flag if function supported it
            // Since sendListingSummaryEmail now checks config internally, we rely on the default 'preview'
            // or ensure SEND_EMAIL_MODE is not 'send' in .env.local
            emailPreviewHtml = await sendListingSummaryEmail(filteredListings);
            statusMessage = `[Completed] Preview generated.`;
            console.log(statusMessage);
        }

    } catch (error) {
        statusMessage = `Error during preview generation: ${error.message}`;
        console.error('❌ Error generating preview:', error);
        emailPreviewHtml = `<p>Error generating preview: ${error.message}</p><pre>${error.stack}</pre>`;
    }

    return { emailPreviewHtml, statusMessage, listingsFound, pagesScraped };
}

// This is an async Server Component
export default async function PreviewPage() {
    const { emailPreviewHtml, statusMessage, listingsFound, pagesScraped } = await getPreviewData();

    return (
        <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
            <h1>Email Preview</h1>
            <p><strong>Status:</strong> {statusMessage}</p>
            <p><strong>Pages Scraped:</strong> {pagesScraped}</p>
            <p><strong>Listings Found (Matching Filters):</strong> {listingsFound}</p>
            <hr style={{ margin: '20px 0' }} />
            <h2>Rendered Email HTML:</h2>
            <div
                style={{ border: '1px solid #ccc', padding: '15px', marginTop: '10px', backgroundColor: '#f9f9f9' }}
                dangerouslySetInnerHTML={{ __html: emailPreviewHtml || '<p>No preview HTML generated.</p>' }}
            />
        </div>
    );
}

// Optional: Force dynamic rendering if needed, though usually not required for this
// export const dynamic = 'force-dynamic';
