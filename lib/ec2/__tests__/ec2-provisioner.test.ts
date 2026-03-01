import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the CloudFormation SDK
const mockSend = vi.fn();
vi.mock('@aws-sdk/client-cloudformation', () => {
  return {
    CloudFormationClient: class MockCloudFormationClient {
      send = mockSend;
      constructor() {}
    },
    CreateStackCommand: vi.fn().mockImplementation(function(this: unknown, input: unknown) { return { input, _type: 'CreateStack' }; }),
    DeleteStackCommand: vi.fn().mockImplementation(function(this: unknown, input: unknown) { return { input, _type: 'DeleteStack' }; }),
    DescribeStacksCommand: vi.fn().mockImplementation(function(this: unknown, input: unknown) { return { input, _type: 'DescribeStacks' }; }),
    DescribeStackEventsCommand: vi.fn().mockImplementation(function(this: unknown, input: unknown) { return { input, _type: 'DescribeStackEvents' }; }),
  };
});

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('mock-template-content'),
  },
}));

import { EC2Provisioner } from '../ec2-provisioner';
import { CreateStackCommand } from '@aws-sdk/client-cloudformation';

const MOCK_OUTPUTS = [
  { OutputKey: 'InstancePublicIP', OutputValue: '54.123.45.67' },
  { OutputKey: 'N8NURL', OutputValue: 'http://54.123.45.67' },
  { OutputKey: 'EC2InstanceId', OutputValue: 'i-0abc123def456' },
  { OutputKey: 'BackupBucketName', OutputValue: 'n8n-backup-test-123-123456789' },
  { OutputKey: 'SecurityGroupId', OutputValue: 'sg-0abc123' },
  { OutputKey: 'VPCId', OutputValue: 'vpc-0abc123' },
];

describe('EC2Provisioner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('sets stack name from instanceId', () => {
      const provisioner = new EC2Provisioner('test-123');
      // Verify by calling getStatus which uses the stack name
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE' }],
      });
      provisioner.getStatus();
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('calls CreateStack with correct parameters', async () => {
      // First call: CreateStack succeeds
      mockSend.mockResolvedValueOnce({ StackId: 'arn:aws:cloudformation:...' });
      // Second call: DescribeStacks returns CREATE_COMPLETE
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });
      // Third call: getOutputs DescribeStacks
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });

      const provisioner = new EC2Provisioner('test-123');
      const result = await provisioner.create({
        name: 'My n8n',
        version: '1.40.0',
        size: 'SMALL',
      });

      expect(result.instancePublicIP).toBe('54.123.45.67');
      expect(result.n8nUrl).toBe('http://54.123.45.67');
      expect(result.ec2InstanceId).toBe('i-0abc123def456');
      expect(result.backupBucketName).toBe('n8n-backup-test-123-123456789');

      // Verify CreateStackCommand was called
      expect(CreateStackCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          StackName: 'n8n-ec2-test-123',
          Capabilities: ['CAPABILITY_NAMED_IAM'],
          TimeoutInMinutes: 15,
        })
      );
    });

    it('maps SMALL size to t3.micro', async () => {
      mockSend.mockResolvedValueOnce({ StackId: 'arn:aws:...' });
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });

      const provisioner = new EC2Provisioner('test-123');
      await provisioner.create({ name: 'test', version: 'latest', size: 'SMALL' });

      expect(CreateStackCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Parameters: expect.arrayContaining([
            { ParameterKey: 'InstanceType', ParameterValue: 't3.micro' },
            { ParameterKey: 'VolumeSize', ParameterValue: '20' },
          ]),
        })
      );
    });

    it('maps LARGE size to t3.medium', async () => {
      mockSend.mockResolvedValueOnce({ StackId: 'arn:aws:...' });
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });

      const provisioner = new EC2Provisioner('test-123');
      await provisioner.create({ name: 'test', version: 'latest', size: 'LARGE' });

      expect(CreateStackCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Parameters: expect.arrayContaining([
            { ParameterKey: 'InstanceType', ParameterValue: 't3.medium' },
            { ParameterKey: 'VolumeSize', ParameterValue: '50' },
          ]),
        })
      );
    });

    it('passes domain name when provided', async () => {
      mockSend.mockResolvedValueOnce({ StackId: 'arn:aws:...' });
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });

      const provisioner = new EC2Provisioner('test-123');
      await provisioner.create({
        name: 'test',
        version: 'latest',
        size: 'SMALL',
        domainName: 'n8n.example.com',
      });

      expect(CreateStackCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Parameters: expect.arrayContaining([
            { ParameterKey: 'DomainName', ParameterValue: 'n8n.example.com' },
          ]),
        })
      );
    });

    it('throws on stack creation failure', async () => {
      mockSend.mockResolvedValueOnce({ StackId: 'arn:aws:...' });
      // DescribeStacks returns ROLLBACK_COMPLETE
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'ROLLBACK_COMPLETE' }],
      });
      // DescribeStackEvents for failure reason
      mockSend.mockResolvedValueOnce({
        StackEvents: [
          {
            ResourceStatus: 'CREATE_FAILED',
            ResourceStatusReason: 'Instance type not available in AZ',
          },
        ],
      });

      const provisioner = new EC2Provisioner('test-123');
      await expect(
        provisioner.create({ name: 'test', version: 'latest', size: 'SMALL' })
      ).rejects.toThrow('Stack creation failed');
    });
  });

  describe('destroy', () => {
    it('calls DeleteStack and waits for completion', async () => {
      // DeleteStack succeeds
      mockSend.mockResolvedValueOnce({});
      // DescribeStacks returns DELETE_COMPLETE
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'DELETE_COMPLETE' }],
      });

      const provisioner = new EC2Provisioner('test-123');
      await provisioner.destroy();

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('handles already-deleted stack', async () => {
      mockSend.mockResolvedValueOnce({});
      // DescribeStacks throws "does not exist"
      mockSend.mockRejectedValueOnce(new Error('Stack n8n-ec2-test-123 does not exist'));

      const provisioner = new EC2Provisioner('test-123');
      await expect(provisioner.destroy()).resolves.not.toThrow();
    });

    it('throws on DELETE_FAILED', async () => {
      mockSend.mockResolvedValueOnce({});
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'DELETE_FAILED' }],
      });
      mockSend.mockResolvedValueOnce({
        StackEvents: [
          {
            ResourceStatus: 'DELETE_FAILED',
            ResourceStatusReason: 'S3 bucket not empty',
          },
        ],
      });

      const provisioner = new EC2Provisioner('test-123');
      await expect(provisioner.destroy()).rejects.toThrow('Stack deletion failed');
    });
  });

  describe('getStatus', () => {
    it('returns stack status', async () => {
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE' }],
      });

      const provisioner = new EC2Provisioner('test-123');
      const status = await provisioner.getStatus();
      expect(status).toBe('CREATE_COMPLETE');
    });

    it('returns NOT_FOUND for non-existent stack', async () => {
      mockSend.mockRejectedValueOnce(new Error('Stack does not exist'));

      const provisioner = new EC2Provisioner('nonexistent');
      const status = await provisioner.getStatus();
      expect(status).toBe('NOT_FOUND');
    });
  });

  describe('getOutputs', () => {
    it('parses stack outputs into typed object', async () => {
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_COMPLETE', Outputs: MOCK_OUTPUTS }],
      });

      const provisioner = new EC2Provisioner('test-123');
      const outputs = await provisioner.getOutputs();

      expect(outputs).toEqual({
        instancePublicIP: '54.123.45.67',
        n8nUrl: 'http://54.123.45.67',
        ec2InstanceId: 'i-0abc123def456',
        backupBucketName: 'n8n-backup-test-123-123456789',
        securityGroupId: 'sg-0abc123',
        vpcId: 'vpc-0abc123',
      });
    });

    it('throws when no outputs exist', async () => {
      mockSend.mockResolvedValueOnce({
        Stacks: [{ StackStatus: 'CREATE_IN_PROGRESS' }],
      });

      const provisioner = new EC2Provisioner('test-123');
      await expect(provisioner.getOutputs()).rejects.toThrow('No outputs found');
    });
  });
});
