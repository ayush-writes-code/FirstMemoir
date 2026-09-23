import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function run() {
  try {
    const res = await s3.send(new GetBucketCorsCommand({ Bucket: process.env.R2_BUCKET_NAME }));
    console.log("Current CORS:", JSON.stringify(res.CORSRules, null, 2));
  } catch (err) {
    console.error("Error reading CORS:", err.message);
  }
}
run();
