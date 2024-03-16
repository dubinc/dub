import { AwsClient } from 'aws4fetch';

class StorageClient {
    private client: AwsClient;

    constructor() {
        this.client = new AwsClient({
            accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
            service: 's3',
            region: 'auto',
        });
    }

    async upload(key: string, body: Blob | Buffer | string, contentType?: string) {
      let uploadBody;
  
      if (typeof body === 'string') {
          try {
              uploadBody = this.base64ToArrayBuffer(body);
          } catch (error) {
              throw new Error(`Invalid base64 string: ${error.message}`);
          }
      } else {
          uploadBody = body;
      }
  
      const headers = {
        'Content-Length': uploadBody.size.toString()
      };
      if (contentType) headers['Content-Type'] = contentType;
      
      await this.client.fetch(`${process.env.STORAGE_ENDPOINT}/${key}`, {
          method: 'PUT',
          headers,
          body: uploadBody,
      });

      return { 
        url: `${process.env.STORAGE_DOMAIN}/${key}`,
      }
  }

    async delete(key: string) {
        await this.client.fetch(`${process.env.STORAGE_ENDPOINT}/${key}`, {
            method: 'DELETE',
        });
    }

    private base64ToArrayBuffer(base64: string, contentType?: string) {
      const base64Data = base64.replace(/^data:.+;base64,/, '');
      const paddedBase64Data = base64Data.padEnd(base64Data.length + (4 - base64Data.length % 4) % 4, '=');

      const binaryString = atob(paddedBase64Data);
      const byteArray = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          byteArray[i] = binaryString.charCodeAt(i);
      }
      const opts = {}
      if (contentType) opts['type'] = contentType;
      return new Blob([byteArray], opts);
    }
}

export const storage = new StorageClient();