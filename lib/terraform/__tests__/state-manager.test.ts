import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManagerError } from '@/types/infrastructure';

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the module under test
// ---------------------------------------------------------------------------

const mockS3Send = vi.fn();
const mockDynamoSend = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function (this: Record<string, unknown>) { this.send = mockS3Send; }),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn().mockImplementation(function (this: Record<string, unknown>) { this.send = mockDynamoSend; }),
  PutItemCommand: vi.fn(),
  DeleteItemCommand: vi.fn(),
  AttributeValue: {},
}));

// Import *after* mocks are in place
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { StateManager } from '../state-manager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INSTANCE_ID = 'inst-123';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  mockS3Send.mockReset();
  mockDynamoSend.mockReset();

  // Preserve original env values so we can restore them later
  for (const key of ['TF_STATE_BUCKET', 'AWS_REGION']) {
    savedEnv[key] = process.env[key];
  }

  process.env.TF_STATE_BUCKET = 'test-bucket';
  process.env.AWS_REGION = 'us-east-1';
});

afterEach(() => {
  for (const [key, val] of Object.entries(savedEnv)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
});

// ===========================================================================
// Tests
// ===========================================================================

describe('StateManager', () => {
  // -------------------------------------------------------------------------
  // configureRemoteState
  // -------------------------------------------------------------------------
  describe('configureRemoteState', () => {
    it('returns local backend when TF_STATE_BUCKET is not set', async () => {
      delete process.env.TF_STATE_BUCKET;

      const manager = new StateManager();
      const result = await manager.configureRemoteState(INSTANCE_ID);

      expect(result).toEqual({
        backend: 'local',
        config: {
          path: `./terraform/workspaces/${INSTANCE_ID}/terraform.tfstate`,
        },
      });
    });

    it('returns S3 backend config with correct bucket, key, and dynamodb_table', async () => {
      const manager = new StateManager();
      const result = await manager.configureRemoteState(INSTANCE_ID);

      expect(result).toEqual({
        backend: 's3',
        config: {
          bucket: 'test-bucket',
          key: `instances/${INSTANCE_ID}/terraform.tfstate`,
          region: 'us-east-1',
          encrypt: true,
          dynamodb_table: 'terraform-locks',
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // lockState
  // -------------------------------------------------------------------------
  describe('lockState', () => {
    it('sends PutItemCommand with correct LockID and ConditionExpression', async () => {
      mockDynamoSend.mockResolvedValue({});

      const manager = new StateManager();
      await manager.lockState(INSTANCE_ID);

      expect(PutItemCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'terraform-locks',
          Item: expect.objectContaining({
            LockID: { S: `instances/${INSTANCE_ID}/terraform.tfstate-md5` },
          }),
          ConditionExpression: 'attribute_not_exists(LockID)',
        }),
      );
      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
    });

    it('throws StateManagerError when lock already exists (ConditionalCheckFailedException)', async () => {
      const conditionalError = new Error('Conditional check failed');
      (conditionalError as Record<string, unknown>).name = 'ConditionalCheckFailedException';
      mockDynamoSend.mockRejectedValue(conditionalError);

      const manager = new StateManager();

      try {
        await manager.lockState(INSTANCE_ID);
        expect.fail('Expected lockState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe(`State is already locked for instance ${INSTANCE_ID}`);
        expect(smError.operation).toBe('lock');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });

    it('throws StateManagerError with message from other AWS errors', async () => {
      const awsError = new Error('DynamoDB throttled');
      mockDynamoSend.mockRejectedValue(awsError);

      const manager = new StateManager();

      try {
        await manager.lockState(INSTANCE_ID);
        expect.fail('Expected lockState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('DynamoDB throttled');
        expect(smError.operation).toBe('lock');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });

    it('throws StateManagerError with "Unknown error" for errors without message', async () => {
      mockDynamoSend.mockRejectedValue({});

      const manager = new StateManager();

      try {
        await manager.lockState(INSTANCE_ID);
        expect.fail('Expected lockState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('Unknown error occurred while locking state');
        expect(smError.operation).toBe('lock');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });
  });

  // -------------------------------------------------------------------------
  // unlockState
  // -------------------------------------------------------------------------
  describe('unlockState', () => {
    it('sends DeleteItemCommand with correct LockID', async () => {
      mockDynamoSend.mockResolvedValue({});

      const manager = new StateManager();
      await manager.unlockState(INSTANCE_ID);

      expect(DeleteItemCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'terraform-locks',
          Key: {
            LockID: { S: `instances/${INSTANCE_ID}/terraform.tfstate-md5` },
          },
        }),
      );
      expect(mockDynamoSend).toHaveBeenCalledTimes(1);
    });

    it('throws StateManagerError on AWS error with message', async () => {
      const awsError = new Error('Access denied');
      mockDynamoSend.mockRejectedValue(awsError);

      const manager = new StateManager();

      try {
        await manager.unlockState(INSTANCE_ID);
        expect.fail('Expected unlockState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('Access denied');
        expect(smError.operation).toBe('unlock');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });

    it('throws StateManagerError with "Unknown error" for errors without message', async () => {
      mockDynamoSend.mockRejectedValue({});

      const manager = new StateManager();

      try {
        await manager.unlockState(INSTANCE_ID);
        expect.fail('Expected unlockState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('Unknown error occurred while unlocking state');
        expect(smError.operation).toBe('unlock');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });
  });

  // -------------------------------------------------------------------------
  // getState
  // -------------------------------------------------------------------------
  describe('getState', () => {
    it('returns null when TF_STATE_BUCKET is not set', async () => {
      delete process.env.TF_STATE_BUCKET;

      const manager = new StateManager();
      const result = await manager.getState(INSTANCE_ID);

      expect(result).toBeNull();
      expect(mockS3Send).not.toHaveBeenCalled();
    });

    it('returns Buffer when state exists (transformToByteArray)', async () => {
      const stateContent = '{"version": 4, "terraform_version": "1.5.0"}';
      const mockBody = {
        transformToByteArray: vi.fn().mockResolvedValue(new Uint8Array(Buffer.from(stateContent))),
      };

      mockS3Send.mockResolvedValue({ Body: mockBody });

      const manager = new StateManager();
      const result = await manager.getState(INSTANCE_ID);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: `instances/${INSTANCE_ID}/terraform.tfstate`,
      });
      expect(result).toBeInstanceOf(Buffer);
      expect(result!.toString()).toBe(stateContent);
    });

    it('returns null when response has no Body', async () => {
      mockS3Send.mockResolvedValue({ Body: undefined });

      const manager = new StateManager();
      const result = await manager.getState(INSTANCE_ID);

      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // saveState
  // -------------------------------------------------------------------------
  describe('saveState', () => {
    it('throws StateManagerError when TF_STATE_BUCKET is not set', async () => {
      delete process.env.TF_STATE_BUCKET;

      const manager = new StateManager();
      const stateBuffer = Buffer.from('{"version": 4}');

      try {
        await manager.saveState(INSTANCE_ID, stateBuffer);
        expect.fail('Expected saveState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('TF_STATE_BUCKET not configured');
        expect(smError.operation).toBe('save');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });

    it('sends PutObjectCommand with correct bucket, key, body, and AES256 encryption', async () => {
      mockS3Send.mockResolvedValue({});
      const stateBuffer = Buffer.from('{"version": 4}');

      const manager = new StateManager();
      await manager.saveState(INSTANCE_ID, stateBuffer);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: `instances/${INSTANCE_ID}/terraform.tfstate`,
        Body: stateBuffer,
        ServerSideEncryption: 'AES256',
      });
      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it('throws StateManagerError on AWS error with message', async () => {
      const awsError = new Error('S3 write failed');
      mockS3Send.mockRejectedValue(awsError);
      const stateBuffer = Buffer.from('{"version": 4}');

      const manager = new StateManager();

      try {
        await manager.saveState(INSTANCE_ID, stateBuffer);
        expect.fail('Expected saveState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('S3 write failed');
        expect(smError.operation).toBe('save');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });
  });

  // -------------------------------------------------------------------------
  // deleteState
  // -------------------------------------------------------------------------
  describe('deleteState', () => {
    it('throws StateManagerError when TF_STATE_BUCKET is not set', async () => {
      delete process.env.TF_STATE_BUCKET;

      const manager = new StateManager();

      try {
        await manager.deleteState(INSTANCE_ID);
        expect.fail('Expected deleteState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('TF_STATE_BUCKET not configured');
        expect(smError.operation).toBe('delete');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });

    it('sends DeleteObjectCommand with correct bucket and key', async () => {
      mockS3Send.mockResolvedValue({});

      const manager = new StateManager();
      await manager.deleteState(INSTANCE_ID);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: `instances/${INSTANCE_ID}/terraform.tfstate`,
      });
      expect(mockS3Send).toHaveBeenCalledTimes(1);
    });

    it('throws StateManagerError on AWS error with message', async () => {
      const awsError = new Error('S3 delete failed');
      mockS3Send.mockRejectedValue(awsError);

      const manager = new StateManager();

      try {
        await manager.deleteState(INSTANCE_ID);
        expect.fail('Expected deleteState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('S3 delete failed');
        expect(smError.operation).toBe('delete');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });

    it('throws StateManagerError with "Unknown error" for errors without message', async () => {
      mockS3Send.mockRejectedValue({});

      const manager = new StateManager();

      try {
        await manager.deleteState(INSTANCE_ID);
        expect.fail('Expected deleteState to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(StateManagerError);
        const smError = error as StateManagerError;
        expect(smError.message).toBe('Unknown error occurred while deleting state');
        expect(smError.operation).toBe('delete');
        expect(smError.instanceId).toBe(INSTANCE_ID);
      }
    });
  });
});
