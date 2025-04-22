import * as cheerio from 'cheerio';
import { globals } from './config'; // Import globals

console.log('🚀 filter.js loaded');

// Base URL is now sourced from globals
const SS_BASE_URL = globals.ssBaseUrl;

/**
 * Parses raw HTML content from ss.com listing page using Cheerio.
 * Selectors are based on the structure observed on 2025-04-09.
 * Relies on globals.ssBaseUrl for constructing links.
 * Handles different structures for 'flat' and 'house' types.
 * @param {string} htmlContent - Raw HTML from a listing page.
 * @param {string} monitorId - Identifier of the monitor for logging.
 * @param {string} monitorType - The type of listing ('flat' or 'house').
 * @returns {object[]} - Array of listing objects.
 */
function parseListingsFromHtml(htmlContent, monitorId, monitorType) {
    console.log(`🧐 [${monitorId}] Parsing HTML content using Cheerio (type: ${monitorType})...`);
    const $ = cheerio.load(htmlContent);
    const listings = [];

    const listingRows = $('tr[id^="tr_"]');
    console.log(`🔎 [${monitorId}] Found ${listingRows.length} listing rows.`);

    listingRows.each((index, element) => {
        const row = $(element);
        // Initialize listing object with nulls for potentially missing fields
        const listing = {
            link: null,
            imageUrl: null,
            description: null,
            address: null,
            district: 'Centrs', // Default, TODO: improve district parsing
            rooms: NaN,
            sqMeters: NaN,
            floor: null,
            series: null,
            m2Price: NaN,
            totalPrice: NaN,
            landArea: null, // New field for houses
        };

        try {
            const columns = row.find('td');
            const linkElement = columns.eq(1).find('a');

            listing.link = linkElement.attr('href') ? SS_BASE_URL + linkElement.attr('href') : null;
            listing.imageUrl = linkElement.find('img').attr('src');
            listing.description = columns.eq(2).find('a').text().trim();
            listing.address = columns.eq(3).text().trim();
            // TODO: Improve district parsing - currently hardcoded
            // listing.district = parseDistrictFromAddressOrUrl(listing.address, monitorUrl);

            // --- Type-Specific Parsing based on column indices ---
            if (monitorType === 'house') {
                // Indices based on the provided HTML for homes/summer residences
                listing.sqMeters = parseFloat(columns.eq(4).text().trim()); // Area m² is at index 4
                listing.floor = columns.eq(5).text().trim(); // Floors (Stāvi) is at index 5
                const roomsText = columns.eq(6).text().trim(); // Rooms is at index 6
                listing.rooms = roomsText.toLowerCase() === 'citi' ? NaN : parseInt(roomsText, 10);
                listing.landArea = columns.eq(7).text().trim(); // Land Area is at index 7
                const totalPriceText = columns.eq(8).text().replace(/[^\d,.]/g, '').replace(',', '.'); // Price is at index 8
                listing.totalPrice = parseFloat(totalPriceText) || NaN;
                // series and m2Price are typically not present for houses
                listing.series = null;
                listing.m2Price = NaN;

            } else { // Default to 'flat' type parsing
                const roomsText = columns.eq(4).text().trim(); // Rooms is at index 4
                listing.rooms = roomsText.toLowerCase() === 'citi' ? NaN : parseInt(roomsText, 10);
                listing.sqMeters = parseFloat(columns.eq(5).text().trim()); // Area m² is at index 5
                listing.floor = columns.eq(6).text().trim(); // Floor (range) is at index 6
                listing.series = columns.eq(7).text().trim(); // Series is at index 7
                const m2PriceText = columns.eq(8).text().replace(/[^\d,.]/g, '').replace(',', '.'); // m2 Price is at index 8
                listing.m2Price = parseFloat(m2PriceText) || NaN;
                const totalPriceText = columns.eq(9).text().replace(/[^\d,.]/g, '').replace(',', '.'); // Total Price is at index 9
                listing.totalPrice = parseFloat(totalPriceText) || NaN;
                listing.landArea = null; // Land area not applicable to flats
            }
            // --- End Type-Specific Parsing ---

            // Validation remains the same: requires link and valid total price
            if (listing.link && !isNaN(listing.totalPrice)) {
                listings.push(listing);
            } else {
                console.warn(`⚠️ [${monitorId}] Skipping row ${index} due to missing link or invalid price. Link: ${listing.link}, Price: ${columns.eq(monitorType === 'house' ? 8 : 9).text().trim()}`);
            }
        } catch (error) {
            console.error(`❌ [${monitorId}] Error parsing row ${index}:`, error.message);
        }
    });

    console.log(`✅ [${monitorId}] Parsed ${listings.length} valid listings from page.`);
    return listings;
}

/**
 * Filters listings based on the provided criteria object.
 * @param {object[]} listings - Array of listing objects.
 * @param {object} filterCriteria - The criteria object for this specific monitor.
 * @param {string} monitorId - Identifier of the monitor for logging.
 * @returns {object[]} - Array of filtered listing objects.
 */
function filterListings(listings, filterCriteria, monitorId) {
    // Ensure filterCriteria is an object, even if empty
    const criteria = filterCriteria || {};
    console.log(`🔍 [${monitorId}] Filtering ${listings.length} listings using criteria:`, JSON.stringify(criteria));

    // If no filters are defined (empty object), return all listings
    if (Object.keys(criteria).length === 0 || Object.values(criteria).every(v => v === null || v === undefined || (Array.isArray(v) && v.length === 0))) {
        console.log(`👍 [${monitorId}] No active filters defined. Returning all ${listings.length} parsed listings.`);
        return listings;
    }

    const filtered = listings.filter(listing => {
        let passes = true;

        // Check District (only if allowedDistricts is defined and not empty)
        if (criteria.allowedDistricts && criteria.allowedDistricts.length > 0) {
            const districtAllowed = criteria.allowedDistricts.some(
                allowed => listing.district?.toLowerCase() === allowed.toLowerCase()
            );
            if (!districtAllowed) {
                // console.log(`🚫 [${monitorId}] Filter fail (district): ${listing.address}`);
                passes = false;
            }
        }

        if (passes && criteria.minRooms && (isNaN(listing.rooms) || listing.rooms < criteria.minRooms)) {
            // console.log(`🚫 [${monitorId}] Filter fail (minRooms): ${listing.address}`);
            passes = false;
        }
        if (passes && criteria.minSqMeters && (isNaN(listing.sqMeters) || listing.sqMeters < criteria.minSqMeters)) {
            // console.log(`🚫 [${monitorId}] Filter fail (minSqMeters): ${listing.address}`);
            passes = false;
        }

        // Parse and check floor number (only if maxFloor is defined)
        if (passes && criteria.maxFloor) {
            const floorNumber = listing.floor ? parseInt(listing.floor.split('/')[0], 10) : NaN;
            if (isNaN(floorNumber) || floorNumber > criteria.maxFloor) {
                // console.log(`🚫 [${monitorId}] Filter fail (maxFloor): ${listing.address}`);
                passes = false;
            }
        }

        if (passes && criteria.maxM2Price && (isNaN(listing.m2Price) || listing.m2Price > criteria.maxM2Price)) {
            // console.log(`🚫 [${monitorId}] Filter fail (maxM2Price): ${listing.address}`);
            passes = false;
        }
        if (passes && criteria.maxTotalPrice && (isNaN(listing.totalPrice) || listing.totalPrice > criteria.maxTotalPrice)) {
            // console.log(`🚫 [${monitorId}] Filter fail (maxTotalPrice): ${listing.address}`);
            passes = false;
        }

        // Optional: Filter by date (Requires date parsing, which is not implemented yet)
        // ... date filter logic ...

        return passes;
    });

    console.log(`👍 [${monitorId}] Found ${filtered.length} listings passing filters.`);
    return filtered;
}

/**
 * Processes raw HTML pages: parses listings using Cheerio and applies specific filters.
 * @param {string[]} htmlPages - Array of HTML content strings.
 * @param {object} filters - The filter criteria object for this monitor.
 * @param {string} monitorId - Identifier of the monitor for logging.
 * @param {string} monitorType - The type of listing ('flat' or 'house').
 * @returns {object[]} - Array of filtered listing objects.
 */
export function processAndFilterListings(htmlPages, filters, monitorId, monitorType) {
    console.log(`🔄 [${monitorId}] Processing ${htmlPages.length} HTML pages (type: ${monitorType})...`);
    let allListings = [];

    htmlPages.forEach((html, index) => {
        if (html) {
            console.log(`📄 [${monitorId}] Processing page ${index + 1}`);
            try {
                // Pass monitorId and monitorType to parser
                const listingsOnPage = parseListingsFromHtml(html, monitorId, monitorType);
                allListings = allListings.concat(listingsOnPage);
            } catch (error) {
                console.error(`❌ [${monitorId}] Error processing page ${index + 1}:`, error.message);
            }
        } else {
            console.warn(`⚠️ [${monitorId}] Skipping page ${index + 1} due to missing HTML content.`);
        }
    });

    // Pass filters and monitorId to the filtering function (filter logic doesn't depend on type)
    const filteredListings = filterListings(allListings, filters, monitorId);

    console.log(`✅ [${monitorId}] Filtering complete. Found ${filteredListings.length} matching listings overall.`);
    return filteredListings;
}
