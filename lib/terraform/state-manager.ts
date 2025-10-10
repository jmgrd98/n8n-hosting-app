import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { 
  DynamoDBClient, 
  PutItemCommand, 
  DeleteItemCommand,
  AttributeValue
} from '@aws-sdk/client-dynamodb';
import { LocalStateConfig, RemoteStateConfig, S3StateConfig, S3StreamBody, StateManagerError } from '@/types/infrastructure';
// import { Readable } from 'stream';

// Minimal LockInfo shape used by this module
interface LockInfo {
  instanceId: string;
  timestamp: string;
}

interface AwsError {
  name?: string;
  message?: string;
}

function isAwsError(error: unknown): error is AwsError {
  return typeof error === 'object' && error !== null &&
         ('name' in error || 'message' in error);
}

export class StateManager {
  private s3Client: S3Client;
  private dynamoClient: DynamoDBClient;
  private readonly tableName = 'terraform-locks';
  
  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';
    
    this.s3Client = new S3Client({ region });
    this.dynamoClient = new DynamoDBClient({ region });
  }
  
  
  async configureRemoteState(instanceId: string): Promise<RemoteStateConfig> {
    const bucket = process.env.TF_STATE_BUCKET;
    
    if (!bucket) {
      return {
        backend: 'local',
        config: {
          path: `./terraform/workspaces/${instanceId}/terraform.tfstate`,
        } as LocalStateConfig,
      };
    }
    
    return {
      backend: 's3',
      config: {
        bucket,
        key: `instances/${instanceId}/terraform.tfstate`,
        region: process.env.AWS_REGION || 'us-east-1',
        encrypt: true,
        dynamodb_table: this.tableName,
      } as S3StateConfig,
    };
  }
  
  async lockState(instanceId: string): Promise<void> {
    const lockId = `instances/${instanceId}/terraform.tfstate-md5`;
    const lockInfo: LockInfo = {
      instanceId,
      timestamp: new Date().toISOString(),
    };
    
    const item: Record<string, AttributeValue> = {
      LockID: { S: lockId },
      Info: { S: JSON.stringify(lockInfo) },
    };
    
    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(LockID)',
    });
    
    try {
      await this.dynamoClient.send(command);
    } catch (error: unknown) {
      // AWS SDK v3 throws objects that include a `name` property (string).
      const e = error as { name?: string; message?: string };
      if (e.name === 'ConditionalCheckFailedException') {
        throw new StateManagerError(
          `State is already locked for instance ${instanceId}`,
          'lock',
          instanceId
        );
      }
      if (e.message) {
        throw new StateManagerError(
          e.message,
          'lock',
          instanceId
        );
      }
      throw new StateManagerError(
        'Unknown error occurred while locking state',
        'lock',
        instanceId
      );
    }
  }
  
  async unlockState(instanceId: string): Promise<void> {
    const lockId = `instances/${instanceId}/terraform.tfstate-md5`;
    
    const key: Record<string, AttributeValue> = {
      LockID: { S: lockId },
    };
    
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: key,
    });
    
    try {
      await this.dynamoClient.send(command);
    } catch (error: unknown) {
      const e = error as { message?: string };
      if (e.message) {
        throw new StateManagerError(
          e.message,
          'unlock',
          instanceId
        );
      }
      throw new StateManagerError(
        'Unknown error occurred while unlocking state',
        'unlock',
        instanceId
      );
    }
  }
  
  async getState(instanceId: string): Promise<Buffer | null> {
    const bucket = process.env.TF_STATE_BUCKET;
    if (!bucket) return null;
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: `instances/${instanceId}/terraform.tfstate`,
    });
    
    try {
      const response: GetObjectCommandOutput = await this.s3Client.send(command);
      const stream = response.Body;
      
      if (!stream) return null;
      
      // If SDK exposes transformToByteArray (e.g., in newer runtimes)
      if (typeof stream === 'object' && stream !== null && 'transformToByteArray' in stream) {
        const s = stream as S3StreamBody & { transformToByteArray: () => Promise<Uint8Array> };
        const bytes = await s.transformToByteArray();
        return Buffer.from(bytes);
      }
      
      // Readable stream fallback (Node.js)
      // if (stream instanceof Readable) {
      //   const chunks: Buffer[] = [];
      //   for await (const chunk of stream) {
      //     chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
      //   }
      //   return Buffer.concat(chunks);
      // }
      if (typeof stream === 'object' && stream !== null && 'transformToByteArray' in stream) {
  // const s = stream as S3StreamBody & { transformToByteArray: () => Promise<Uint8Array> };

      }
      
      return null;
    } catch (error: unknown) {
      if (isAwsError(error)) {
        if (error.name === 'ConditionalCheckFailedException') {
          throw new StateManagerError(
            `State is already locked for instance ${instanceId}`,
            'lock',
            instanceId
          );
        }
        if (error.message) {
          throw new StateManagerError(error.message, 'lock', instanceId);
        }
      }
      throw new StateManagerError('Unknown error occurred while locking state', 'lock', instanceId);
    }
  }
  
  async saveState(instanceId: string, state: Buffer): Promise<void> {
    const bucket = process.env.TF_STATE_BUCKET;
    if (!bucket) {
      throw new StateManagerError(
        'TF_STATE_BUCKET not configured',
        'save',
        instanceId
      );
    }
    
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: `instances/${instanceId}/terraform.tfstate`,
      Body: state,
      ServerSideEncryption: 'AES256',
    });
    
    try {
      await this.s3Client.send(command);
    } catch (error: unknown) {
      const e = error as { message?: string };
      if (e.message) {
        throw new StateManagerError(
          e.message,
          'save',
          instanceId
        );
      }
      throw new StateManagerError(
        'Unknown error occurred while saving state',
        'save',
        instanceId
      );
    }
  }
  
  async deleteState(instanceId: string): Promise<void> {
    const bucket = process.env.TF_STATE_BUCKET;
    if (!bucket) {
      throw new StateManagerError(
        'TF_STATE_BUCKET not configured',
        'delete',
        instanceId
      );
    }
    
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: `instances/${instanceId}/terraform.tfstate`,
    });
    
    try {
      await this.s3Client.send(command);
    } catch (error: unknown) {
      const e = error as { message?: string };
      if (e.message) {
        throw new StateManagerError(
          e.message,
          'delete',
          instanceId
        );
      }
      throw new StateManagerError(
        'Unknown error occurred while deleting state',
        'delete',
        instanceId
      );
    }
  }
}
