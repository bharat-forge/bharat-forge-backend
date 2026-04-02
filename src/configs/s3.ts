import './env';
import { S3Client } from '@aws-sdk/client-s3';

let s3ClientInstance: S3Client | null = null;

export const getS3Client = () => {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });
  }
  return s3ClientInstance;
};

export const getBucketName = () => {
  return process.env.AWS_S3_BUCKET as string;
};

export const getAwsRegion = () => {
  return process.env.AWS_REGION as string;
};