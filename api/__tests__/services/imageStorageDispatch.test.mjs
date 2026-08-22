import { eq } from 'drizzle-orm';
import { db } from '../../lib/db/index.js';
import { IMAGE_DATA, IMAGE_METADATA } from '../../lib/db/schema.js';
import DatabaseService from '../../src/services/databaseService.js';
import {
  clearTaskData,
  createTestDeliverable,
  createTestTask,
  resetProjectDefaults,
} from '../helpers/testDatabase.js';

// Fake object storage injected at the objectStorageService boundary
// (testing.md pre-authorizes mocking this path); everything below it stays
// real, including the zazz_board_test database. Injection is used instead
// of vi.mock because setup.pactum.mjs preloads databaseService (and its
// objectStorageService import) before test-file mocks can register.
const putObjectMock = vi.fn();
const getObjectMock = vi.fn();
const deleteObjectMock = vi.fn();
const dbService = new DatabaseService({
  objectStorage: {
    putObject: putObjectMock,
    getObject: getObjectMock,
    deleteObject: deleteObjectMock,
  },
});

// 1x1 PNG fixture reused from __tests__/routes/image-scoping.test.mjs.
const SAMPLE_IMAGE = {
  originalName: 'tiny.png',
  contentType: 'image/png',
  fileSize: 68,
  base64Data:
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBgU6m4QAAAABJRU5ErkJggg==',
};
const SAMPLE_BYTES = Buffer.from(SAMPLE_IMAGE.base64Data, 'base64');
// Marker bytes the mocked object store returns, distinct from IMAGE_DATA
// bytes, proving which store served a read.
const NEON_OBJECT_BYTES = Buffer.from('neon-object-bytes');

const savedBackend = process.env.STORAGE_BACKEND;

function setStorageBackend(value) {
  if (value === undefined) {
    delete process.env.STORAGE_BACKEND;
  } else {
    process.env.STORAGE_BACKEND = value;
  }
}

async function fetchMetadataRow(imageId) {
  const [row] = await db.select().from(IMAGE_METADATA).where(eq(IMAGE_METADATA.id, imageId));
  return row;
}

async function fetchDataRow(imageId) {
  const [row] = await db.select().from(IMAGE_DATA).where(eq(IMAGE_DATA.id, imageId));
  return row;
}

/** Store one local task image and one neon deliverable image in the same database. */
async function storeMixedImages() {
  const deliverable = await createTestDeliverable(1, { name: 'Mixed storage deliverable' });
  const task = await createTestTask(1, { deliverableId: deliverable.id, title: 'Mixed storage task' });

  setStorageBackend(undefined);
  const localImage = await dbService.storeTaskImage(task.id, SAMPLE_IMAGE, '/projects/ZAZZ/images');

  setStorageBackend('neon');
  const neonImage = await dbService.storeDeliverableImage(
    deliverable.id,
    SAMPLE_IMAGE,
    '/projects/ZAZZ/images'
  );

  return { deliverable, task, localImage, neonImage };
}

beforeEach(async () => {
  await clearTaskData();
  await resetProjectDefaults();
  vi.clearAllMocks();
});

afterEach(() => {
  setStorageBackend(savedBackend);
});

describe('image storage dispatch on write', () => {
  it('should upload bytes to object storage and record the key without an IMAGE_DATA row when backend is neon', async () => {
    setStorageBackend('neon');
    const deliverable = await createTestDeliverable(1, { name: 'Neon write deliverable' });

    const stored = await dbService.storeDeliverableImage(
      deliverable.id,
      SAMPLE_IMAGE,
      '/projects/ZAZZ/images'
    );

    expect(putObjectMock).toHaveBeenCalledTimes(1);
    const [key, body, contentType] = putObjectMock.mock.calls[0];
    expect(key).toBe(`attachments/${stored.id}`);
    expect(body.equals(SAMPLE_BYTES)).toBe(true);
    expect(contentType).toBe('image/png');

    expect(stored.storageType).toBe('neon');
    expect(stored.url).toBe(`attachments/${stored.id}`);

    const metadataRow = await fetchMetadataRow(stored.id);
    expect(metadataRow.storage_type).toBe('neon');
    expect(metadataRow.url).toBe(`attachments/${stored.id}`);
    expect(await fetchDataRow(stored.id)).toBeUndefined();
  });

  it('should write IMAGE_DATA and skip object storage entirely when backend is unset', async () => {
    setStorageBackend(undefined);
    const deliverable = await createTestDeliverable(1, { name: 'Local write deliverable' });
    const task = await createTestTask(1, { deliverableId: deliverable.id, title: 'Local write task' });

    const stored = await dbService.storeTaskImage(task.id, SAMPLE_IMAGE, '/projects/ZAZZ/images');

    expect(putObjectMock).not.toHaveBeenCalled();
    expect(stored.storageType).toBe('local');
    expect(stored.url).toBe(`/projects/ZAZZ/images/${stored.id}`);

    const dataRow = await fetchDataRow(stored.id);
    expect(dataRow.data).toBe(SAMPLE_IMAGE.base64Data);
    const metadataRow = await fetchMetadataRow(stored.id);
    expect(metadataRow.storage_type).toBe('local');
  });

  it('should also work for task-owned images under the neon backend', async () => {
    setStorageBackend('neon');
    const deliverable = await createTestDeliverable(1, { name: 'Neon task write deliverable' });
    const task = await createTestTask(1, { deliverableId: deliverable.id, title: 'Neon task write task' });

    const stored = await dbService.storeTaskImage(task.id, SAMPLE_IMAGE, '/projects/ZAZZ/images');

    expect(putObjectMock).toHaveBeenCalledWith(
      `attachments/${stored.id}`,
      SAMPLE_BYTES,
      'image/png'
    );
    expect(stored.taskId).toBe(task.id);
    expect(stored.storageType).toBe('neon');
    expect(await fetchDataRow(stored.id)).toBeUndefined();
  });
});

describe('image storage dispatch on read', () => {
  it.each([
    { storageType: 'local', fetchesFromObjectStorage: false },
    { storageType: 'neon', fetchesFromObjectStorage: true },
  ])(
    'should serve $storageType rows from the right byte store while both kinds coexist',
    async ({ storageType, fetchesFromObjectStorage }) => {
      getObjectMock.mockResolvedValue(NEON_OBJECT_BYTES);
      const { localImage, neonImage } = await storeMixedImages();
      const target = storageType === 'local' ? localImage : neonImage;

      const read = await dbService.getImageWithData(target.id);

      expect(read).not.toBeNull();
      expect(read.storageType).toBe(storageType);
      if (fetchesFromObjectStorage) {
        expect(getObjectMock).toHaveBeenCalledWith(`attachments/${target.id}`);
        expect(read.data.equals(NEON_OBJECT_BYTES)).toBe(true);
      } else {
        expect(getObjectMock).not.toHaveBeenCalled();
        expect(read.data.equals(SAMPLE_BYTES)).toBe(true);
      }
      expect(Buffer.isBuffer(read.data)).toBe(true);
    }
  );

  it('should return null bytes for a local row with no IMAGE_DATA row', async () => {
    const { localImage } = await storeMixedImages();
    await db.delete(IMAGE_DATA).where(eq(IMAGE_DATA.id, localImage.id));

    const read = await dbService.getImageWithData(localImage.id);

    expect(read).not.toBeNull();
    expect(read.data).toBeNull();
  });

  it('should list metadata for both kinds without touching object storage', async () => {
    const { deliverable, task, localImage, neonImage } = await storeMixedImages();

    const taskImages = await dbService.getTaskImages(task.id);
    expect(taskImages.map((image) => image.id)).toContain(localImage.id);
    expect(taskImages[0].storageType).toBe('local');

    const deliverableImages = await dbService.getDeliverableImages(deliverable.id);
    expect(deliverableImages.map((image) => image.id)).toEqual([neonImage.id]);
    expect(deliverableImages[0].storageType).toBe('neon');
    expect(deliverableImages[0].url).toBe(`attachments/${neonImage.id}`);

    expect(getObjectMock).not.toHaveBeenCalled();
    expect(putObjectMock).toHaveBeenCalledTimes(1);
  });
});

describe('image storage dispatch on delete', () => {
  it('should remove the object and both row records for a neon image', async () => {
    const { neonImage } = await storeMixedImages();

    const deleted = await dbService.deleteImage(neonImage.id);

    expect(deleteObjectMock).toHaveBeenCalledWith(`attachments/${neonImage.id}`);
    expect(deleted.id).toBe(neonImage.id);
    expect(await fetchMetadataRow(neonImage.id)).toBeUndefined();
    expect(await fetchDataRow(neonImage.id)).toBeUndefined();
  });

  it('should keep local deletes off object storage and drop the IMAGE_DATA row', async () => {
    const { localImage } = await storeMixedImages();

    const deleted = await dbService.deleteImage(localImage.id);

    expect(deleteObjectMock).not.toHaveBeenCalled();
    expect(deleted.id).toBe(localImage.id);
    expect(await fetchMetadataRow(localImage.id)).toBeUndefined();
    expect(await fetchDataRow(localImage.id)).toBeUndefined();
  });

  it('should return null when deleting an unknown image id', async () => {
    expect(await dbService.deleteImage(99999999)).toBeNull();
  });
});
