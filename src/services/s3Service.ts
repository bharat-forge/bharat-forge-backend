import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { getS3Client, getBucketName, getAwsRegion } from '../configs/s3';

export const uploadFileToS3 = async (file: Express.Multer.File): Promise<string> => {
  const s3Client = getS3Client();
  const key = `uploads/${uuidv4()}-${file.originalname.replace(/\s+/g, '-')}`;

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3Client.send(command);

  return `https://${getBucketName()}.s3.${getAwsRegion()}.amazonaws.com/${key}`;
};