import {
  CloudFormationClient,
  CreateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  DescribeStackEventsCommand,
} from '@aws-sdk/client-cloudformation';
import fs from 'fs/promises';
import path from 'path';
import { InstanceSize } from '@prisma/client';
import { EC2_SIZE_CONFIGS } from './ec2-size-config';

export interface EC2CreateConfig {
  name: string;
  version: string;
  size: InstanceSize;
  region?: string;
  domainName?: string;
  keyPairName?: string;
}

export interface EC2ProvisionerOutputs {
  instancePublicIP: string;
  n8nUrl: string;
  ec2InstanceId: string;
  backupBucketName: string;
  securityGroupId: string;
  vpcId: string;
}

export class EC2Provisioner {
  private client: CloudFormationClient;
  private instanceId: string;
  private stackName: string;

  constructor(instanceId: string, region?: string) {
    this.instanceId = instanceId;
    this.stackName = `n8n-ec2-${instanceId}`;
    this.client = new CloudFormationClient({
      region: region || process.env.AWS_REGION || 'us-east-1',
    });
  }

  async create(config: EC2CreateConfig): Promise<EC2ProvisionerOutputs> {
    const sizeConfig = EC2_SIZE_CONFIGS[config.size] || EC2_SIZE_CONFIGS.SMALL;

    const templatePath = path.join(
      process.cwd(),
      'cloudformation',
      'n8n-ec2-docker.yml'
    );
    const templateBody = await fs.readFile(templatePath, 'utf-8');

    await this.client.send(
      new CreateStackCommand({
        StackName: this.stackName,
        TemplateBody: templateBody,
        Parameters: [
          { ParameterKey: 'InstanceId', ParameterValue: this.instanceId },
          { ParameterKey: 'InstanceName', ParameterValue: config.name },
          { ParameterKey: 'N8NVersion', ParameterValue: config.version },
          { ParameterKey: 'InstanceType', ParameterValue: sizeConfig.instanceType },
          { ParameterKey: 'VolumeSize', ParameterValue: String(sizeConfig.volumeSizeGb) },
          { ParameterKey: 'DomainName', ParameterValue: config.domainName || '' },
          { ParameterKey: 'KeyPairName', ParameterValue: config.keyPairName || '' },
        ],
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        Tags: [
          { Key: 'ManagedBy', Value: 'n8n-hosting-app' },
          { Key: 'InstanceId', Value: this.instanceId },
        ],
        TimeoutInMinutes: 15,
      })
    );

    return await this.waitForStackComplete();
  }

  async destroy(): Promise<void> {
    await this.client.send(
      new DeleteStackCommand({ StackName: this.stackName })
    );
    await this.waitForStackDelete();
  }

  async getStatus(): Promise<string> {
    try {
      const response = await this.client.send(
        new DescribeStacksCommand({ StackName: this.stackName })
      );
      return response.Stacks?.[0]?.StackStatus || 'UNKNOWN';
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return 'NOT_FOUND';
      }
      throw error;
    }
  }

  async getOutputs(): Promise<EC2ProvisionerOutputs> {
    const response = await this.client.send(
      new DescribeStacksCommand({ StackName: this.stackName })
    );
    const outputs = response.Stacks?.[0]?.Outputs;

    if (!outputs) {
      throw new Error(`No outputs found for stack ${this.stackName}`);
    }

    const outputMap = new Map(
      outputs.map((o) => [o.OutputKey, o.OutputValue || ''])
    );

    return {
      instancePublicIP: outputMap.get('InstancePublicIP') || '',
      n8nUrl: outputMap.get('N8NURL') || '',
      ec2InstanceId: outputMap.get('EC2InstanceId') || '',
      backupBucketName: outputMap.get('BackupBucketName') || '',
      securityGroupId: outputMap.get('SecurityGroupId') || '',
      vpcId: outputMap.get('VPCId') || '',
    };
  }

  private async waitForStackComplete(timeoutMs = 900000): Promise<EC2ProvisionerOutputs> {
    const startTime = Date.now();
    const pollInterval = 15000;

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getStatus();
      console.log(`[EC2] Stack ${this.stackName} status: ${status}`);

      if (status === 'CREATE_COMPLETE') {
        return await this.getOutputs();
      }

      if (
        status.endsWith('_FAILED') ||
        status === 'ROLLBACK_COMPLETE' ||
        status === 'ROLLBACK_IN_PROGRESS'
      ) {
        const reason = await this.getFailureReason();
        throw new Error(`Stack creation failed (${status}): ${reason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timed out waiting for stack ${this.stackName} to complete`);
  }

  private async waitForStackDelete(timeoutMs = 600000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 15000;

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getStatus();
      console.log(`[EC2] Stack ${this.stackName} delete status: ${status}`);

      if (status === 'DELETE_COMPLETE' || status === 'NOT_FOUND') {
        return;
      }

      if (status === 'DELETE_FAILED') {
        const reason = await this.getFailureReason();
        throw new Error(`Stack deletion failed: ${reason}`);
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Timed out waiting for stack ${this.stackName} deletion`);
  }

  private async getFailureReason(): Promise<string> {
    try {
      const response = await this.client.send(
        new DescribeStackEventsCommand({ StackName: this.stackName })
      );
      const failedEvents = response.StackEvents?.filter(
        (e) =>
          e.ResourceStatus?.endsWith('_FAILED') && e.ResourceStatusReason
      );
      return (
        failedEvents?.map((e) => e.ResourceStatusReason).join('; ') ||
        'Unknown reason'
      );
    } catch {
      return 'Could not retrieve failure reason';
    }
  }
}
