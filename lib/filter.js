import * as cheerio from 'cheerio';
import config from './config';

console.log('🚀 filter.js loaded');

// Filter criteria sourced from config
const FILTER_CRITERIA = config.filterCriteria;
const SS_BASE_URL = config.ssBaseUrl;

/**
 * Parses raw HTML content from ss.com listing page using Cheerio.
 * Selectors are based on the structure observed on 2025-04-09.
 * @param {string} htmlContent - Raw HTML from a listing page.
 * @returns {object[]} - Array of listing objects.
 */
function parseListingsFromHtml(htmlContent) {
    console.log('🧐 Parsing HTML content using Cheerio...');
    const $ = cheerio.load(htmlContent);
    const listings = [];

    // Selector for listing rows (<tr> elements with id starting with "tr_")
    const listingRows = $('tr[id^="tr_"]');

    console.log(`🔎 Found ${listingRows.length} listing rows.`);

    listingRows.each((index, element) => {
        const row = $(element);
        const listing = {};

        try {
            // Extract data based on column index (td)
            const columns = row.find('td');

            // --- Data Extraction (Indices confirmed from HTML source) ---
            const linkElement = columns.eq(1).find('a');
            listing.link = linkElement.attr('href') ? SS_BASE_URL + linkElement.attr('href') : null;
            listing.imageUrl = linkElement.find('img').attr('src');

            listing.description = columns.eq(2).find('a').text().trim(); // Full description text

            listing.address = columns.eq(3).text().trim(); // Street address
            // District is assumed based on the URL for now ('Centrs')
            // If scraping multiple districts, this needs adjustment.
            listing.district = 'Centrs'; // Hardcoded based on URL scope

            const roomsText = columns.eq(4).text().trim();
            listing.rooms = roomsText.toLowerCase() === 'citi' ? NaN : parseInt(roomsText, 10);

            listing.sqMeters = parseFloat(columns.eq(5).text().trim());
            listing.floor = columns.eq(6).text().trim(); // Raw floor text e.g., "5/7"

            listing.series = columns.eq(7).text().trim();

            // Clean and parse prices (remove currency, spaces, handle commas)
            const m2PriceText = columns.eq(8).text().replace(/[^\d,.]/g, '').replace(',', '.');
            listing.m2Price = parseFloat(m2PriceText) || NaN;

            const totalPriceText = columns.eq(9).text().replace(/[^\d,.]/g, '').replace(',', '.');
            listing.totalPrice = parseFloat(totalPriceText) || NaN;

            // postingDate is not directly in the table row, requires different handling if needed
            // --- End Data Extraction ---

            // Basic validation: Ensure core data exists (link and price)
            if (listing.link && !isNaN(listing.totalPrice)) {
                listings.push(listing);
            } else {
                console.warn(`⚠️ Skipping row ${index} due to missing link or invalid price.`, row.html());
            }

        } catch (error) {
            console.error(`❌ Error parsing row ${index}:`, error.message);
            // Optional: log row.html() for detailed debugging
        }
    });

    console.log(`✅ Parsed ${listings.length} valid listings from page.`);
    return listings;
}

/**
 * Filters listings based on predefined criteria from config.
 * @param {object[]} listings - Array of listing objects.
 * @returns {object[]} - Array of filtered listing objects.
 */
function filterListings(listings) {
    console.log(`🔍 Filtering ${listings.length} listings based on criteria from config...`);

    const filtered = listings.filter(listing => {
        let passes = true;

        // --- Apply Filters (using FILTER_CRITERIA from config) ---
        // Check District (case-insensitive comparison recommended)
        if (FILTER_CRITERIA.allowedDistricts && FILTER_CRITERIA.allowedDistricts.length > 0) {
            const districtAllowed = FILTER_CRITERIA.allowedDistricts.some(
                allowed => listing.district.toLowerCase() === allowed.toLowerCase()
            );
            if (!districtAllowed) passes = false;
        }

        if (FILTER_CRITERIA.minRooms && (isNaN(listing.rooms) || listing.rooms < FILTER_CRITERIA.minRooms)) {
            passes = false;
        }
        if (FILTER_CRITERIA.minSqMeters && (isNaN(listing.sqMeters) || listing.sqMeters < FILTER_CRITERIA.minSqMeters)) {
            passes = false;
        }

        // Parse and check floor number
        if (FILTER_CRITERIA.maxFloor) {
            const floorNumber = listing.floor ? parseInt(listing.floor.split('/')[0], 10) : NaN;
            if (isNaN(floorNumber) || floorNumber > FILTER_CRITERIA.maxFloor) {
                passes = false;
            }
        }

        if (FILTER_CRITERIA.maxM2Price && (isNaN(listing.m2Price) || listing.m2Price > FILTER_CRITERIA.maxM2Price)) {
            passes = false;
        }
        if (FILTER_CRITERIA.maxTotalPrice && (isNaN(listing.totalPrice) || listing.totalPrice > FILTER_CRITERIA.maxTotalPrice)) {
            passes = false;
        }

        // Optional: Filter by date (Requires date parsing, which is not implemented yet)
        // ... date filter logic ...

        // --- End Filters ---

        // Log if a listing fails (optional for debugging)
        // if (!passes) {
        //     console.log(`🚫 Listing failed filters: ${listing.address || 'N/A'}, Price: ${listing.totalPrice}`);
        // }

        return passes;
    });

    console.log(`👍 Found ${filtered.length} listings passing filters.`);
    return filtered;
}

/**
 * Processes raw HTML pages, parses listings using Cheerio, and filters them.
 * @param {string[]} htmlPages - Array of HTML content strings.
 * @returns {object[]} - Array of filtered listing objects.
 */
export function processAndFilterListings(htmlPages) {
    console.log(`🔄 Processing ${htmlPages.length} HTML pages...`);
    let allListings = [];
    htmlPages.forEach((html, index) => {
        if (html) { // Ensure HTML content exists
            console.log(`📄 Processing page ${index + 1}`);
            try {
                const listingsOnPage = parseListingsFromHtml(html);
                allListings = allListings.concat(listingsOnPage);
            } catch (error) {
                console.error(`❌ Error processing page ${index + 1}:`, error.message);
            }
        } else {
            console.warn(`⚠️ Skipping page ${index + 1} due to missing HTML content.`);
        }
    });

    const filteredListings = filterListings(allListings);
    console.log(`✅ Filtering complete. Found ${filteredListings.length} matching listings overall.`);
    return filteredListings;
}
