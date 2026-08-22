import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// Neon Object Storage speaks the S3 API; the credential and endpoint
// variables are exactly what `neon env pull` emits (standard AWS SDK v3
// env names), so the standard SDK chain reads them natively.
const REQUIRED_STORAGE_VARS = [
  'NEON_STORAGE_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ENDPOINT_URL_S3',
  'AWS_REGION',
];

/**
 * Fail fast when the neon storage backend lacks configuration. Names every
 * missing variable at once so a boot-time abort is actionable in one pass.
 * The local backend requires nothing and never calls this.
 * @param {Record<string, string | undefined>} env
 * @returns {void} Throws when any required variable is missing.
 */
export function validateStorageConfig(env = process.env) {
  const missing = REQUIRED_STORAGE_VARS.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `STORAGE_BACKEND=neon is missing required storage configuration: ${missing.join(', ')}`
    );
  }
}

/** @param {any} options */
function defaultS3ClientFactory(options) {
  return new S3Client(options);
}

/**
 * Create the S3-compatible object storage client for Neon Object Storage.
 * The client factory is injectable so tests can substitute a fake S3
 * client at exactly this boundary; production uses the AWS SDK v3 client.
 * @param {Record<string, string | undefined>} env
 * @param {{ s3ClientFactory?: (options: any) => any }} [injection]
 * @returns {{
 *   putObject: (key: string, body: Buffer, contentType: string) => Promise<void>,
 *   getObject: (key: string) => Promise<Buffer>,
 *   deleteObject: (key: string) => Promise<void>,
 * }}
 */
export function createObjectStorageService(env = process.env, { s3ClientFactory = defaultS3ClientFactory } = {}) {
  validateStorageConfig(env);

  const client = s3ClientFactory({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    credentials: {
      accessKeyId: /** @type {string} */ (env.AWS_ACCESS_KEY_ID),
      secretAccessKey: /** @type {string} */ (env.AWS_SECRET_ACCESS_KEY),
    },
    forcePathStyle: true,
  });
  const bucket = /** @type {string} */ (env.NEON_STORAGE_BUCKET);

  return {
    async putObject(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
      );
    },

    async getObject(key) {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return Buffer.from(await response.Body.transformToByteArray());
    },

    async deleteObject(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
