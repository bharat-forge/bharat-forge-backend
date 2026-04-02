import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getS3Client, getBucketName, getAwsRegion } from '../configs/s3';
import crypto from 'crypto';
import path from 'path';

export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  originalName: string,
  mimetype: string,
  folder: string = 'general'
): Promise<string> => {
  const s3Client = getS3Client();
  const bucketName = getBucketName();
  const region = getAwsRegion();

  const fileExtension = path.extname(originalName);
  const uniqueName = `${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
  const key = `${folder}/${uniqueName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);

  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};