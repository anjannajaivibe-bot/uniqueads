import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.UNIQUEADS_WORK_PHOTO_BUCKET!;

export const workPhotoBucket = bucket;

export const storageClient = new S3Client({
  region: process.env.AWS_REGION!,
  endpoint: process.env.AWS_ENDPOINT_URL_S3!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
});

export function storageUrlForKey(key: string) {
  return `s3://${bucket}/${key}`;
}

export function keyFromStorageUrl(value: string) {
  const prefix = `s3://${bucket}/`;
  if (value.startsWith(prefix)) return value.slice(prefix.length);
  return value;
}

export async function presignWorkPhotoUpload(
  key: string,
  contentType: string
) {
  return getSignedUrl(
    storageClient,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 600 }
  );
}

export async function presignWorkPhotoDownload(value: string) {
  const key = keyFromStorageUrl(value);
  return getSignedUrl(
    storageClient,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
}

export async function verifyStoredWorkPhoto(key: string) {
  return storageClient.send(
    new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}
