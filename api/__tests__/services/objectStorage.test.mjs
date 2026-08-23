import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import {
  createObjectStorageService,
  validateStorageConfig,
} from '../../src/services/objectStorageService.js';

const apiDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Fixture credentials only — never real keys.
const FULL_ENV = {
  NEON_STORAGE_BUCKET: 'zazz-board-attachments-test',
  AWS_ACCESS_KEY_ID: 'test-access-key-id',
  AWS_SECRET_ACCESS_KEY: 'test-secret-access-key',
  AWS_ENDPOINT_URL_S3: 'https://br-fake.storage.c-5.us-east-2.aws.neon.tech',
  AWS_REGION: 'us-east-2',
};

const REQUIRED_VARS = [
  'NEON_STORAGE_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_ENDPOINT_URL_S3',
  'AWS_REGION',
];

// Fake S3 client injected at the objectStorageService boundary; no real
// network is touched by this suite.
const sendMock = vi.fn();
const clientConstructs = [];

function makeService(env = FULL_ENV) {
  return createObjectStorageService(env, {
    s3ClientFactory(options) {
      clientConstructs.push(options);
      return { send: sendMock };
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  clientConstructs.length = 0;
});

describe('storage config validation', () => {
  it('should abort naming every missing variable when nothing is configured', () => {
    let message = '';
    try {
      createObjectStorageService({});
    } catch (error) {
      message = error.message;
    }
    expect(message).not.toBe('');
    for (const name of REQUIRED_VARS) {
      expect(message).toContain(name);
    }
  });

  it.each(REQUIRED_VARS)('should name %s when only that variable is missing', (missing) => {
    const env = { ...FULL_ENV };
    delete env[missing];
    expect(() => createObjectStorageService(env)).toThrow(missing);
  });

  it('should not construct an S3 client when validation fails', () => {
    expect(() => createObjectStorageService({})).toThrow();
    expect(clientConstructs).toHaveLength(0);
  });

  it('should accept a complete configuration', () => {
    expect(() => validateStorageConfig(FULL_ENV)).not.toThrow();
    expect(() => createObjectStorageService(FULL_ENV)).not.toThrow();
  });

  it('should abort server startup from a real process when neon storage env is incomplete', () => {
    const env = { ...process.env, NODE_ENV: 'development', STORAGE_BACKEND: 'neon' };
    for (const name of REQUIRED_VARS) delete env[name];
    const result = spawnSync(
      process.execPath,
      ['-e', "import('./src/services/databaseService.js').then(() => process.exit(0), () => process.exit(1))"],
      { cwd: apiDir, encoding: 'utf8', env }
    );
    expect(result.status).toBe(1);
  });
});

describe('object storage service with an injected S3 client', () => {
  it('should construct the client from the endpoint, region, and credentials', () => {
    makeService();
    expect(clientConstructs[0]).toEqual({
      region: FULL_ENV.AWS_REGION,
      endpoint: FULL_ENV.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: FULL_ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: FULL_ENV.AWS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  });

  it('should put objects with the bucket, derived key, bytes, and content type', async () => {
    const service = makeService();
    const body = Buffer.from('png-bytes');
    await service.putObject('attachments/7', body, 'image/png');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual({
      Bucket: FULL_ENV.NEON_STORAGE_BUCKET,
      Key: 'attachments/7',
      Body: body,
      ContentType: 'image/png',
    });
  });

  it('should get objects and return their bytes as a Buffer', async () => {
    sendMock.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([104, 105]) },
    });
    const service = makeService();

    const bytes = await service.getObject('attachments/7');

    expect(Buffer.isBuffer(bytes)).toBe(true);
    expect(bytes.toString()).toBe('hi');
    const command = sendMock.mock.calls[0][0];
    expect(command.input).toEqual({
      Bucket: FULL_ENV.NEON_STORAGE_BUCKET,
      Key: 'attachments/7',
    });
  });

  it('should delete objects by key in the configured bucket', async () => {
    const service = makeService();
    await service.deleteObject('attachments/7');

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0];
    expect(command).toBeInstanceOf(DeleteObjectCommand);
    expect(command.input).toEqual({
      Bucket: FULL_ENV.NEON_STORAGE_BUCKET,
      Key: 'attachments/7',
    });
  });
});
