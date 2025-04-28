import { Resend } from 'resend';
import { globals } from './config'; // Import globals

console.log('📧 email.js loaded');

// Initialize Resend client using the global API key
const resendApiKey = globals.resendApiKey;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Global sender is sourced from globals
const FROM_EMAIL = globals.emailSender;

/**
 * Formats a number as currency (EUR) with spaces for thousands separators.
 * @param {number | string | null | undefined} value - The number to format.
 * @param {number} [maxDecimals=0] - Maximum number of decimal places to show.
 * @returns {string} - Formatted currency string or 'N/A'.
 */
function formatCurrency(value, maxDecimals = 0) {
    if (value === null || value === undefined || isNaN(Number(value))) {
        return 'N/A';
    }
    const number = Number(value);

    // Use formatToParts for better control over separators and currency symbol placement
    const parts = new Intl.NumberFormat('lv-LV', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0, // Always show at least 0 decimal places
        maximumFractionDigits: maxDecimals // Use the passed-in value
    }).formatToParts(number);

    let result = '';
    parts.forEach(part => {
        if (part.type === 'group') {
            result += ' '; // Use space for thousands separator
        } else if (part.type === 'decimal') {
            // lv-LV uses ',', ensure it's preserved if needed
            result += ',';
        } else if (part.type !== 'currency') {
            result += part.value;
        }
    });

    // Add the EUR symbol at the end with a non-breaking space
    // Check if the symbol is already included by formatToParts (some locales might)
    // For lv-LV, the symbol is typically separate, so we add it.
    return result + '€'; // Using non-breaking space €
}

/**
 * Generates stylish HTML content for the email summary.
 * @param {object[]} listings - Array of filtered listing objects.
 * @param {object} monitor - The monitor configuration object (contains recipients, id, name).
 * @returns {string} - HTML string for the email body.
 */
function generateEmailHtml(listings, monitor) {
    // Use monitor name in title if available, fallback to ID
    const monitorDisplayName = monitor.name || monitor.id;
    console.log(`📝 [${monitor.id}] Generating stylish email HTML for ${listings.length} listings...`);
    const hasListings = listings && listings.length > 0;

    // Basic CSS Reset and Font styles (applied inline where possible)
    const bodyStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; line-height: 1.6; color: #333;`;
    const containerStyle = `max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;`;
    const headingStyle = `color: #1a1a1a; margin-top: 0; margin-bottom: 15px;`;
    const paragraphStyle = `margin: 0 0 10px 0; color: #555;`;
    const listStyle = `list-style: none; padding: 0; margin: 0;`;
    const listItemStyle = `margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; display: block;`; // Use block for simpler mobile stacking initially
    // Note: For better 2-column on desktop AND stacking on mobile, requires media queries, which are poorly supported. Flex is kept but might break on some clients.
    const listItemFlexStyle = `display: flex; align-items: flex-start;`;
    const imageColumnStyle = `flex: 0 0 170px; margin-right: 20px;`; // Slightly smaller image column
    const imageStyle = `width: 150px; max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; display: block;`;
    const noImageStyle = `width: 150px; height: 110px; background-color: #f0f0f0; border: 1px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #aaa; font-size: 0.9em;`;
    const detailsColumnStyle = `flex: 1 1 auto;`;
    const detailsHeadingStyle = `margin-top: 0; margin-bottom: 8px; font-size: 1.05em; color: #222; font-weight: 600;`;
    const detailParagraphStyle = `margin: 3px 0; font-size: 0.95em;`;
    const seriesStyle = `font-size: 0.85em; color: #666;`;
    const buttonStyle = `display: inline-block; margin-top: 12px; padding: 10px 18px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-size: 0.95em; font-weight: 500;`;

    let htmlContent;
    if (!hasListings) {
        console.log(`✉️ [${monitor.id}] No new listings to include in email.`);
        htmlContent = `
            <div style="${containerStyle}">
                <h1 style="${headingStyle}">Real Estate Update (${monitorDisplayName})</h1>
                <p style="${paragraphStyle}">No new listings found matching your criteria today.</p>
            </div>
        `;
    } else {
        let itemsHtml = '';
        listings.forEach((listing) => {
            itemsHtml += `
                <li style="${listItemStyle} ${listItemFlexStyle}">
                    <div style="${imageColumnStyle}">
                        ${listing.imageUrl ? `<img src="${listing.imageUrl}" alt="Listing image" style="${imageStyle}">` : `<div style="${noImageStyle}">No Image</div>`}
                    </div>
                    <div style="${detailsColumnStyle}">
                        <h2 style="${detailsHeadingStyle}">${listing.district ? listing.district : 'N/A'} - ${listing.address ? listing.address : 'Address N/A'}</h2>
                        <p style="${detailParagraphStyle}"><strong>Price:</strong> ${formatCurrency(listing.totalPrice)}</p>
                        <p style="${detailParagraphStyle}">${listing.m2Price ? `<strong>Price/m²:</strong> ${formatCurrency(listing.m2Price, 2)}` : '<strong>Price/m²:</strong> N/A'}</p>
                        <p style="${detailParagraphStyle}"><strong>Rooms:</strong> ${listing.rooms && !isNaN(listing.rooms) ? listing.rooms : 'N/A'}</p>
                        <p style="${detailParagraphStyle}"><strong>Area:</strong> ${listing.sqMeters ? `${listing.sqMeters} m²` : 'N/A'}</p>
                        <p style="${detailParagraphStyle}"><strong>Floor:</strong> ${listing.floor ? listing.floor : 'N/A'}</p>
                        <p style="${detailParagraphStyle} ${seriesStyle}">Series: ${listing.series ? listing.series : 'N/A'}</p>
                        <p style="margin-top: 15px;">
                            <a href="${listing.link ? listing.link : '#'}" target="_blank" rel="noopener noreferrer" style="${buttonStyle}">View Listing</a>
                        </p>
                    </div>
                </li>
            `;
        });

        htmlContent = `
            <div style="${containerStyle}">
                <h1 style="${headingStyle}">${monitorDisplayName}</h1>
                <p style="${paragraphStyle}">Found ${listings.length} new listing(s) matching your criteria:</p>
                <ul style="${listStyle}">
                    ${itemsHtml}
                </ul>
            </div>
        `;
    }

    // Wrap content in basic HTML structure
    const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${monitorDisplayName}</title>
        </head>
        <body style="${bodyStyle} margin: 0; padding: 0; background-color: #f4f4f4;">
            ${htmlContent}
        </body>
        </html>
    `;

    console.log(`✅ [${monitor.id}] Stylish email HTML generated.`);
    return fullHtml;
}

/**
 * Sends the listing summary email for a specific monitor or returns HTML for preview.
 * Behavior depends on globals.sendEmailMode ('send' or 'preview').
 * @param {object[]} filteredListings - Array of new, unseen, filtered listing objects.
 * @param {object} monitor - The monitor configuration object (contains recipients, id, name).
 * @returns {Promise<string|null>} - Returns email HTML if in preview mode, null otherwise (or on error).
 */
export async function sendListingSummaryEmail(filteredListings, monitor) {
    const monitorId = monitor.id;
    const monitorName = monitor.name || monitorId; // Use name, fallback to id
    const TO_EMAILS = monitor.recipients; // Use recipients from the specific monitor

    // Generate HTML using the internal function (Pass monitor object)
    const emailHtml = generateEmailHtml(filteredListings, monitor);

    // If not in 'send' mode (based on global setting), return the HTML for preview
    if (globals.sendEmailMode !== 'send') {
        console.log(`✉️ [${monitorId}] Preview mode enabled. Returning generated email HTML.`);
        return emailHtml;
    }

    // --- Proceed with sending email --- 
    if (!resend) {
        console.error(`❌ [${monitorId}] Cannot send email. Resend client not initialized (check RESEND_API_KEY in globals).`);
        return null; // Return null on error in send mode
    }
    if (!TO_EMAILS || TO_EMAILS.length === 0) {
        console.error(`❌ [${monitorId}] Cannot send email. No recipients configured for this monitor.`);
        return null;
    }
    if (!FROM_EMAIL) {
        console.error(`❌ [${monitorId}] Cannot send email. Global sender email not configured (check EMAIL_SENDER in globals).`);
        return null;
    }

    console.log(`📬 [${monitorId}] Sending summary email to ${TO_EMAILS.join(', ')}...`);
    // Use monitorName in the subject line
    const subject = `Real Estate Alert (${monitorName}) - ${filteredListings.length} New Listings`;

    try {
        const { data, error } = await resend.emails.send({
            from: `SSCOM newsletter <${FROM_EMAIL}>`, // Use desired name and global sender email
            to: TO_EMAILS, // Use monitor-specific recipients
            subject: subject,
            html: emailHtml,
        });

        if (error) {
            console.error(`❌ [${monitorId}] Error sending email via Resend:`, error);
            return null;
        }

        console.log(`✅ [${monitorId}] Email sent successfully! ID: ${data?.id}`);
        return null; // Indicate email was sent, no HTML to return
    } catch (error) {
        console.error(`❌ [${monitorId}] Failed to send email (exception):`, error);
        return null;
    }
}
