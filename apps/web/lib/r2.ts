import { S3Client, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';

export class R2 {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async upload(key: string, body: Blob | Buffer, contentType: string) {
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    });

    await this.client.send(command);
  }

  async rename(oldKey: string, newKey: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        CopySource: `${process.env.R2_BUCKET_NAME}/${oldKey}`,
        Key: newKey,
      })
    );

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: oldKey,
      })
    );
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
      })
    );
  }
}
