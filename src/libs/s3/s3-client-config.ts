import { S3Client } from "@aws-sdk/client-s3";

const bucketName = process.env.S3_BUCKET_NAME;

const s3Client = new S3Client({
    region: 'ap-southeast-2',
});


   