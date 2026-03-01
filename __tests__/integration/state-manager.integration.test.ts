import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { StateManager } from '@/lib/terraform/state-manager';
import { StateManagerError } from '@/types/infrastructure';
import { waitForLocalStack } from './helpers/localstack';
import {
  S3Client,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import {
  DynamoDBClient,
  DeleteItemCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

const endpoint = process.env.AWS_ENDPOINT_URL || 'http://localhost:4566';
const region = 'us-east-1';
const bucket = 'n8n-terraform-state-test';

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});
const dynamo = new DynamoDBClient({
  region,
  endpoint,
  credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
});

async function clearS3Bucket(): Promise<void> {
  const { Contents } = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
  if (Contents) {
    for (const obj of Contents) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key! }));
    }
  }
}

async function clearDynamoTable(): Promise<void> {
  const { Items } = await dynamo.send(new ScanCommand({ TableName: 'terraform-locks' }));
  if (Items) {
    for (const item of Items) {
      await dynamo.send(new DeleteItemCommand({
        TableName: 'terraform-locks',
        Key: { LockID: item.LockID },
      }));
    }
  }
}

describe('StateManager (integration with LocalStack)', () => {
  beforeAll(async () => {
    await waitForLocalStack();
  });

  afterEach(async () => {
    await clearS3Bucket();
    await clearDynamoTable();
  });

  describe('configureRemoteState', () => {
    it('returns S3 backend config when TF_STATE_BUCKET is set', async () => {
      const manager = new StateManager();
      const config = await manager.configureRemoteState('test-instance-1');

      expect(config.backend).toBe('s3');
      expect(config.config).toEqual({
        bucket: 'n8n-terraform-state-test',
        key: 'instances/test-instance-1/terraform.tfstate',
        region: 'us-east-1',
        encrypt: true,
        dynamodb_table: 'terraform-locks',
      });
    });
  });

  describe('saveState / getState round-trip', () => {
    it('saves a state buffer to S3 and retrieves it identically', async () => {
      const manager = new StateManager();
      const instanceId = 'integration-roundtrip-1';
      const stateContent = JSON.stringify({
        version: 4,
        terraform_version: '1.6.6',
        serial: 1,
        lineage: 'test-lineage',
        outputs: {},
        resources: [],
      });
      const stateBuffer = Buffer.from(stateContent);

      await manager.saveState(instanceId, stateBuffer);
      const retrieved = await manager.getState(instanceId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.toString()).toBe(stateContent);
    });
  });

  describe('deleteState', () => {
    it('deletes a previously saved state from S3', async () => {
      const manager = new StateManager();
      const instanceId = 'integration-delete-1';
      const stateBuffer = Buffer.from('{"version": 4}');

      await manager.saveState(instanceId, stateBuffer);
      await manager.deleteState(instanceId);

      // After deletion, verify the object no longer exists
      const { Contents } = await s3.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `instances/${instanceId}/`,
      }));
      expect(Contents ?? []).toHaveLength(0);
    });
  });

  describe('lockState / unlockState', () => {
    it('acquires a lock successfully', async () => {
      const manager = new StateManager();
      await expect(manager.lockState('integration-lock-1')).resolves.not.toThrow();
    });

    it('throws StateManagerError when lock already exists', async () => {
      const manager = new StateManager();
      const instanceId = 'integration-lock-conflict';

      await manager.lockState(instanceId);

      try {
        await manager.lockState(instanceId);
        expect.fail('Expected lockState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toContain('already locked');
        expect(smError.operation).toBe('lock');
        expect(smError.instanceId).toBe(instanceId);
      }
    });

    it('releases a lock so it can be re-acquired', async () => {
      const manager = new StateManager();
      const instanceId = 'integration-lock-reacquire';

      await manager.lockState(instanceId);
      await manager.unlockState(instanceId);

      await expect(manager.lockState(instanceId)).resolves.not.toThrow();
    });
  });

  describe('full state lifecycle', () => {
    it('performs lock → save → get → delete → unlock cycle', async () => {
      const manager = new StateManager();
      const instanceId = 'integration-lifecycle';
      const stateData = Buffer.from(JSON.stringify({
        version: 4,
        terraform_version: '1.6.6',
        serial: 1,
        resources: [{ type: 'aws_instance', name: 'test' }],
      }));

      // 1. Acquire lock
      await manager.lockState(instanceId);

      // 2. Save state
      await manager.saveState(instanceId, stateData);

      // 3. Read it back
      const retrieved = await manager.getState(instanceId);
      expect(retrieved).not.toBeNull();
      expect(JSON.parse(retrieved!.toString())).toHaveProperty('resources');

      // 4. Delete state
      await manager.deleteState(instanceId);

      // 5. Release lock
      await manager.unlockState(instanceId);
    });
  });
});
