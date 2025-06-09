// src/core/lib/aws/s3.service.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../../../config.js";
import { AppError, HttpCode } from "../../error/app.error.js";
import { Readable } from "stream";

export class S3Service {
  private s3Client: S3Client;
  public readonly bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.bucketName = config.aws.s3BucketName;
  }

  /**
   * Retrieves a file from S3 as a Node.js Readable stream.
   * Ideal for large files that should be processed in chunks.
   * The caller is responsible for handling the stream (e.g., processing chunks, error handling on the stream).
   *
   * @param key The key of the S3 object.
   * @returns A Promise that resolves to a Readable stream of the S3 object's body.
   */
  async getFile(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      const response: GetObjectCommandOutput = await this.s3Client.send(command);

      if (!response.Body) {
        throw new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `S3 Body not found for key: ${key}`,
        });
      }

      if (!(response.Body instanceof Readable)) {
        console.error(
          `S3Service Error - getFile for key ${key}: response.Body is not a Readable stream.`
        );

        throw new AppError({
          httpCode: HttpCode.INTERNAL_SERVER_ERROR,
          description: `S3 object body for key '${key}' is not a readable stream.`,
          isOperational: false,
        });
      }

      return response.Body;
    } catch (error) {
      console.error(`S3Service Error - getFile for key ${key}:`, error);
      if (error instanceof AppError) throw error;

      if (error instanceof Error && error.name === "NoSuchKey") {
        throw new AppError({
          httpCode: HttpCode.NOT_FOUND,
          description: `File not found in S3: ${key}`,
        });
      }

      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Failed to get file from S3: ${key}`,
        isOperational: false,
      });
    }
  }

  async generatePresignedUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    try {
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error(`S3Service Error - generatePresignedUrl for key ${key}:`, error);
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Failed to generate presigned URL for S3: ${key}`,
        isOperational: false,
      });
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
    } catch (error) {
      console.error(`S3Service Error - deleteFile for key ${key}:`, error);
      throw new AppError({
        httpCode: HttpCode.INTERNAL_SERVER_ERROR,
        description: `Failed to delete file from S3: ${key}`,
        isOperational: false,
      });
    }
  }
}
