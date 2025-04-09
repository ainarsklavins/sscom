import { S3Client, GetObjectCommand, PutObjectCommand, NotFound } from '@aws-sdk/client-s3';

console.log('📦 s3Helper.js loaded');

const bucketName = process.env.S3_BUCKET_NAME;
const fileKey = process.env.S3_FILE_KEY || 'seen_listings.json';

// Configure the AWS SDK S3 client
// Reads credentials and region from standard environment variables
// (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)
const s3Client = new S3Client({});

const MAX_SEEN_LISTINGS = 100; // Define the maximum number of URLs to keep

/**
 * Reads the list of seen listing URLs from S3.
 * @returns {Promise<Set<string>>} A Set containing the URLs of seen listings.
 */
export async function readSeenListingsFromS3() {
    console.log(`☁️ Attempting to read ${fileKey} from bucket ${bucketName}...`);
    if (!bucketName) {
        console.error('❌ S3_BUCKET_NAME is not configured.');
        throw new Error('S3 bucket name not configured.');
    }

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
    });

    try {
        const response = await s3Client.send(command);
        // Helper function to convert stream to string
        const streamToString = (stream) =>
            new Promise((resolve, reject) => {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('error', reject);
                stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            });

        const bodyContents = await streamToString(response.Body);
        const seenUrlsArray = JSON.parse(bodyContents);
        console.log(`☁️ Successfully read ${seenUrlsArray.length} seen URLs from S3.`);
        return new Set(seenUrlsArray);

    } catch (error) {
        // If the file doesn't exist (NoSuchKey), return an empty set - expected on first run
        if (error.Code === 'NoSuchKey') {
            console.log(`☁️ ${fileKey} not found in bucket. Assuming first run, returning empty set.`);
            return new Set();
        } else {
            console.error(`❌ Error reading ${fileKey} from S3:`, error);
            // Re-throw other unexpected errors
            throw error;
        }
    }
}

/**
 * Writes the updated list of seen listing URLs to S3, enforcing a maximum size.
 * @param {Set<string>} seenUrlsSet The Set containing all URLs (old and new) to potentially write.
 * @returns {Promise<void>}
 */
export async function writeSeenListingsToS3(seenUrlsSet) {
    console.log(`☁️ Received ${seenUrlsSet.size} total seen URLs to process for writing.`);
    if (!bucketName) {
        console.error('❌ S3_BUCKET_NAME is not configured.');
        throw new Error('S3 bucket name not configured.');
    }

    let seenUrlsArray = Array.from(seenUrlsSet);

    // Enforce maximum size limit - keep the latest entries
    if (seenUrlsArray.length > MAX_SEEN_LISTINGS) {
        console.log(`⚠️ Seen list size (${seenUrlsArray.length}) exceeds limit (${MAX_SEEN_LISTINGS}). Truncating...`);
        const startIndex = seenUrlsArray.length - MAX_SEEN_LISTINGS;
        seenUrlsArray = seenUrlsArray.slice(startIndex); // Keep the last MAX_SEEN_LISTINGS items
        console.log(`✂️ Truncated list to ${seenUrlsArray.length} items.`);
    }

    const bodyContents = JSON.stringify(seenUrlsArray, null, 2); // Pretty print JSON

    console.log(`☁️ Attempting to write ${seenUrlsArray.length} URLs to ${fileKey} in bucket ${bucketName}...`);

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: bodyContents,
        ContentType: 'application/json',
    });

    try {
        await s3Client.send(command);
        console.log(`☁️ Successfully wrote ${seenUrlsArray.length} seen URLs to S3.`);
    } catch (error) {
        console.error(`❌ Error writing ${fileKey} to S3:`, error);
        throw error;
    }
}
