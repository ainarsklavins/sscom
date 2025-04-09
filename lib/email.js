import { Resend } from 'resend';
import config from './config';

console.log('📧 email.js loaded');

// Config values are sourced from config.js
const resendApiKey = config.resendApiKey;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const TO_EMAILS = config.emailRecipients;
const FROM_EMAIL = config.emailSender;

/**
 * Generates HTML content for the email summary with a two-column layout.
 * @param {object[]} listings - Array of filtered listing objects.
 * @returns {string} - HTML string for the email body.
 */
function generateEmailHtml(listings) {
    console.log('📝 Generating email HTML...');
    if (!listings || listings.length === 0) {
        console.log('✉️ No new listings to include in email.');
        return '<p>No new listings found matching your criteria today.</p>';
    }

    let html = '<h1>New Real Estate Listings Summary</h1>';
    html += `<p>Found ${listings.length} new listing(s) matching your criteria:</p>`;
    html += '<ul style="list-style: none; padding: 0; margin: 0;">'; // Reset default list styles

    listings.forEach((listing, index) => {
        html += `
            <li style="margin-bottom: 30px; border-bottom: 1px solid #eee; padding-bottom: 20px; display: flex; align-items: flex-start;">
                <div class="image-column" style="flex: 0 0 220px; margin-right: 20px;">
                    ${listing.imageUrl ? `<img src="${listing.imageUrl}" alt="Listing image" style="width: 200px; max-width: 100%; height: auto; border: 1px solid #ddd; display: block;">` : '<div style="width: 200px; height: 150px; background-color: #f0f0f0; border: 1px solid #ddd; display: flex; align-items: center; justify-content: center; color: #aaa;">No Image</div>'}
                </div>
                <div class="details-column" style="flex: 1 1 auto;">
                    <h2 style="margin-top: 0; margin-bottom: 10px; font-size: 1.1em;">${listing.district ? listing.district : 'N/A'} - ${listing.address ? listing.address : 'Address N/A'}</h2>
                    <p style="margin: 4px 0;"><strong>Price:</strong> ${listing.totalPrice ? listing.totalPrice.toLocaleString('lv-LV', { style: 'currency', currency: 'EUR' }) : 'N/A'}</p>
                    <p style="margin: 4px 0;">${listing.m2Price ? `<strong>Price per m²:</strong> ${listing.m2Price.toLocaleString('lv-LV', { style: 'currency', currency: 'EUR' })}` : ''}</p>
                    <p style="margin: 4px 0;"><strong>Rooms:</strong> ${listing.rooms && !isNaN(listing.rooms) ? listing.rooms : 'N/A'}</p>
                    <p style="margin: 4px 0;"><strong>Area:</strong> ${listing.sqMeters ? `${listing.sqMeters} m²` : 'N/A'}</p>
                    <p style="margin: 4px 0;"><strong>Floor:</strong> ${listing.floor ? listing.floor : 'N/A'}</p>
                    <p style="margin: 4px 0; font-size: 0.9em; color: #555;">Series: ${listing.series ? listing.series : 'N/A'}</p>
                    <p style="margin-top: 15px;">
                        <a href="${listing.link ? listing.link : '#'}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 0.95em;">View Listing on ss.com</a>
                    </p>
                </div>
            </li>
        `;
    });

    html += '</ul>';
    console.log('✅ Email HTML generated with new layout.');
    return html;
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
