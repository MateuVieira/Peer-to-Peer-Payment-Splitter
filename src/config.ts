import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    s3BucketName: process.env.AWS_S3_BUCKET_NAME || "csv-processing-bucket",
    sqsQueueUrl: process.env.AWS_SQS_QUEUE_URL || "",
    sourceEmail: process.env.AWS_SES_SOURCE_EMAIL || "",
  },
  db: {
    host: process.env.AWS_DB_HOST || "localhost",
    user: process.env.AWS_DB_USER || "postgres",
    password: process.env.AWS_DB_PASSWORD || "",
    port: Number(process.env.AWS_DB_PORT) || 5432,
    database: process.env.AWS_DB_NAME || "postgres",
  },
};
