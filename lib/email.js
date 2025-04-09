import { Resend } from 'resend';
import config from './config';

console.log('📧 email.js loaded');

// Config values are sourced from config.js
const resendApiKey = config.resendApiKey;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const TO_EMAILS = config.emailRecipients;
const FROM_EMAIL = config.emailSender;

/**
 * Generates stylish HTML content for the email summary.
 * @param {object[]} listings - Array of filtered listing objects.
 * @returns {string} - HTML string for the email body.
 */
function generateEmailHtml(listings) {
    console.log('📝 Generating stylish email HTML...');
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
        console.log('✉️ No new listings to include in email.');
        htmlContent = `
            <div style="${containerStyle}">
                <h1 style="${headingStyle}">Real Estate Update</h1>
                <p style="${paragraphStyle}">No new listings found matching your criteria today.</p>
            </div>
        `;
    } else {
        let itemsHtml = '';
        listings.forEach((listing, index) => {
            itemsHtml += `
                <li style="${listItemStyle} ${listItemFlexStyle}">
                    <div style="${imageColumnStyle}">
                        ${listing.imageUrl ? `<img src="${listing.imageUrl}" alt="Listing image" style="${imageStyle}">` : `<div style="${noImageStyle}">No Image</div>`}
                    </div>
                    <div style="${detailsColumnStyle}">
                        <h2 style="${detailsHeadingStyle}">${listing.district ? listing.district : 'N/A'} - ${listing.address ? listing.address : 'Address N/A'}</h2>
                        <p style="${detailParagraphStyle}"><strong>Price:</strong> ${listing.totalPrice ? listing.totalPrice.toLocaleString('lv-LV', { style: 'currency', currency: 'EUR' }) : 'N/A'}</p>
                        <p style="${detailParagraphStyle}">${listing.m2Price ? `<strong>Price/m²:</strong> ${listing.m2Price.toLocaleString('lv-LV', { style: 'currency', currency: 'EUR' })}` : ''}</p>
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
                <h1 style="${headingStyle}">New Real Estate Listings</h1>
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
            <title>Real Estate Summary</title>
        </head>
        <body style="${bodyStyle} margin: 0; padding: 0; background-color: #f4f4f4;">
            ${htmlContent}
        </body>
        </html>
    `;

    console.log('✅ Stylish email HTML generated.');
    return fullHtml;
}

/**
 * Sends the daily listing summary email or returns HTML for preview.
 * Behavior depends on config.sendEmailMode ('send' or 'preview').
 * @param {object[]} filteredListings - Array of filtered listing objects.
 * @returns {Promise<string|null>} - Returns email HTML if in preview mode, null otherwise (or on error).
 */
export async function sendListingSummaryEmail(filteredListings) {
    const emailHtml = generateEmailHtml(filteredListings);

    // If not in 'send' mode, return the HTML for preview
    if (config.sendEmailMode !== 'send') {
        console.log(`✉️ Preview mode enabled. Returning generated email HTML.`);
        return emailHtml;
    }

    // --- Proceed with sending email --- 
    if (!resend) {
        console.error('❌ Cannot send email. Resend client not initialized (check RESEND_API_KEY).');
        return null; // Return null on error in send mode
    }
    if (!TO_EMAILS || TO_EMAILS.length === 0) {
        console.error('❌ Cannot send email. No recipients configured (check EMAIL_RECIPIENTS).');
        return null;
    }
    if (!FROM_EMAIL) {
        console.error('❌ Cannot send email. Sender email not configured (check EMAIL_SENDER).');
        return null;
    }

    console.log(`📬 Sending summary email to ${TO_EMAILS.join(', ')}...`);
    const subject = `Daily Real Estate Alert - ${filteredListings.length} New Listings`;

    try {
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: TO_EMAILS, // Use the array of recipients
            subject: subject,
            html: emailHtml,
        });

        if (error) {
            console.error('❌ Error sending email via Resend:', error);
            return null;
        }

        console.log(`✅ Email sent successfully! ID: ${data.id}`);
        return null; // Indicate email was sent, no HTML to return
    } catch (error) {
        console.error('❌ Failed to send email (exception):', error);
        return null;
    }
}
