// Minimal S3 helper with emoji logs 🤖🪣
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function s3ReadJson(key, fallback = {}) {
    try {
        const { Body } = await s3.send(new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
        }));
        const text = await new Response(Body).text();
        console.log('🪣 loaded', key);
        return JSON.parse(text);
    } catch (err) {
        console.log('🪣⚠️ using fallback for', key, err.Code || err.message);
        return fallback;
    }
}

export async function s3WriteJson(key, data) {
    await s3.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
    }));
    console.log('��✅ saved', key);
} 