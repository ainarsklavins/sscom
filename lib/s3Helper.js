import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { globals } from './config'; // Import globals

console.log('📦 s3Helper.js loaded');

// S3 Bucket Name and Max Seen Listings count from globals
const bucketName = globals.s3BucketName;
const MAX_SEEN_LISTINGS = globals.maxSeenListings;

// S3 client (credentials and region usually handled by environment/instance profile)
const s3Client = bucketName ? new S3Client({}) : null;

if (!s3Client) {
    console.warn('⚠️ S3 client not initialized. S3_BUCKET_NAME might be missing in globals/env.');
}

/**
 * Reads the list of seen listing URLs for a specific monitor from S3.
 * @param {string} monitorId - The unique identifier for the monitor.
 * @returns {Promise<Set<string>>} A Set containing the URLs of seen listings for this monitor.
 */
export async function readSeenListingsFromS3(monitorId) {
    const fileKey = `${monitorId}-seen.json`; // Monitor-specific file key
    console.log(`☁️ [${monitorId}] Attempting to read ${fileKey} from bucket ${bucketName}...`);

    if (!s3Client) {
        console.error(`❌ [${monitorId}] S3 client not available. Cannot read seen listings.`);
        // Return empty set to allow process to continue, but log error clearly.
        // Consider throwing if S3 persistence is critical.
        return new Set();
    }

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
    });

    try {
        const response = await s3Client.send(command);
        const streamToString = (stream) =>
            new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            });

        const bodyContents = await streamToString(response.Body);
        const seenUrlsArray = JSON.parse(bodyContents);

        // Validate if it's an array
        if (!Array.isArray(seenUrlsArray)) {
            console.error(`❌ [${monitorId}] Invalid content in ${fileKey}. Expected JSON array.`);
            return new Set(); // Return empty on invalid format
        }

        console.log(`☁️ [${monitorId}] Successfully read ${seenUrlsArray.length} seen URLs from S3.`);
        return new Set(seenUrlsArray);

    } catch (error) {
        // Use error.name for standard AWS SDK v3 errors
        if (error.name === 'NoSuchKey') {
            console.log(`☁️ [${monitorId}] ${fileKey} not found. Assuming first run for this monitor, returning empty set.`);
            return new Set(); // Expected case for new monitors
        } else {
            console.error(`❌ [${monitorId}] Error reading ${fileKey} from S3:`, error);
            // Depending on policy, might return empty set or re-throw
            // Returning empty set allows the run to potentially find listings, but risks duplicates if S3 read fails intermittently.
            return new Set();
        }
    }
}

/**
 * Writes the updated list of seen listing URLs for a specific monitor to S3, enforcing a maximum size.
 * @param {Set<string>} seenUrlsSet The Set containing all URLs (old and new) for this monitor.
 * @param {string} monitorId - The unique identifier for the monitor.
 * @returns {Promise<void>}
 */
export async function writeSeenListingsToS3(seenUrlsSet, monitorId) {
    const fileKey = `${monitorId}-seen.json`; // Monitor-specific file key
    console.log(`☁️ [${monitorId}] Received ${seenUrlsSet.size} total seen URLs to process for writing to ${fileKey}.`);

    if (!s3Client) {
        console.error(`❌ [${monitorId}] S3 client not available. Cannot write seen listings.`);
        // Throw an error or return to signal failure?
        // Throwing might be better here as it prevents silent data loss.
        throw new Error(`[${monitorId}] S3 client not available for writing.`);
    }

    let seenUrlsArray = Array.from(seenUrlsSet);

    // Enforce maximum size limit using global setting - keep the latest entries
    if (seenUrlsArray.length > MAX_SEEN_LISTINGS) {
        console.log(`⚠️ [${monitorId}] Seen list size (${seenUrlsArray.length}) exceeds limit (${MAX_SEEN_LISTINGS}). Truncating...`);
        // Slice from the end to keep the most recent URLs
        seenUrlsArray = seenUrlsArray.slice(-MAX_SEEN_LISTINGS);
        console.log(`✂️ [${monitorId}] Truncated list to ${seenUrlsArray.length} items.`);
    }

    const bodyContents = JSON.stringify(seenUrlsArray, null, 2); // Pretty print JSON

    console.log(`☁️ [${monitorId}] Attempting to write ${seenUrlsArray.length} URLs to ${fileKey} in bucket ${bucketName}...`);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: bodyContents,
        ContentType: 'application/json',
    });

    try {
        await s3Client.send(command);
        console.log(`☁️ [${monitorId}] Successfully wrote ${seenUrlsArray.length} seen URLs to S3.`);
    } catch (error) {
        console.error(`❌ [${monitorId}] Error writing ${fileKey} to S3:`, error);
        throw error; // Re-throw error to be caught by the main API route handler
    }
}
