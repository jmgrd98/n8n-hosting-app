import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TerraformExecutor } from '@/lib/terraform/executor';
import { waitForLocalStack } from './helpers/localstack';
import fs from 'fs/promises';
import path from 'path';

describe('TerraformExecutor init (integration with LocalStack)', () => {
  const INSTANCE_ID = 'tf-init-integration-test';
  const baseDir = process.cwd();
  const workspaceDir = path.join(baseDir, 'terraform', 'workspaces', INSTANCE_ID);
  const modulesDir = path.join(baseDir, 'terraform', 'modules', 'n8n-instance');

  beforeAll(async () => {
    await waitForLocalStack();

    // Create a minimal module stub so terraform init can resolve the module source
    await fs.mkdir(modulesDir, { recursive: true });

    const stubExists = await fs.access(path.join(modulesDir, 'main.tf'))
      .then(() => true)
      .catch(() => false);

    if (!stubExists) {
      await fs.writeFile(
        path.join(modulesDir, 'main.tf'),
        `
variable "instance_id" { type = string }
variable "instance_name" { type = string }
variable "instance_size" { type = string }
variable "n8n_version" { type = string }
variable "aws_region" { type = string }
variable "vpc_cidr" { type = string }
variable "public_subnet_cidrs" { type = list(string) }
variable "db_instance_class" { type = string }
variable "db_storage_size" { type = number }
variable "ecs_cpu" { type = string }
variable "ecs_memory" { type = string }
variable "tags" { type = map(string) default = {} }

output "alb_dns_name" { value = "test.localstack" }
output "db_endpoint" { value = "db.localstack:5432" }
output "ecs_cluster_name" { value = "test-cluster" }
output "ecs_service_name" { value = "test-service" }
output "vpc_id" { value = "vpc-test" }
`
      );
    }
  });

  afterAll(async () => {
    // Clean up workspace directory
    try {
      await fs.rm(workspaceDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('generates main.tf with LocalStack endpoint overrides', async () => {
    const executor = new TerraformExecutor(INSTANCE_ID);

    // Only test HCL generation — initWorkspace also runs terraform init
    // which requires the terraform binary. We test the generated files directly.
    await fs.mkdir(workspaceDir, { recursive: true });

    // Access private method via casting — generate the main.tf
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (executor as any).generateMainTf();

    const mainTfContent = await fs.readFile(
      path.join(workspaceDir, 'main.tf'),
      'utf-8'
    );

    // Verify LocalStack-specific config is present
    expect(mainTfContent).toContain('backend "s3"');
    expect(mainTfContent).toContain('force_path_style');
    expect(mainTfContent).toContain('http://localhost:4566');
    expect(mainTfContent).toContain('skip_credentials_validation');
    expect(mainTfContent).toContain('skip_metadata_api_check');
    expect(mainTfContent).toContain('skip_requesting_account_id');

    // Verify provider also has LocalStack config
    expect(mainTfContent).toContain('provider "aws"');
    expect(mainTfContent).toContain('endpoints {');

    // Verify state bucket is configured correctly
    expect(mainTfContent).toContain('n8n-terraform-state-test');
    expect(mainTfContent).toContain(`instances/${INSTANCE_ID}/terraform.tfstate`);
  });

  it('generates tfvars with correct instance configuration', async () => {
    const executor = new TerraformExecutor(INSTANCE_ID);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (executor as any).generateTfVars({
      instanceId: INSTANCE_ID,
      name: 'integration-test-instance',
      size: 'SMALL',
      version: '1.40.0',
      region: 'us-east-1',
      userId: 'test-user',
    });

    const tfvarsContent = await fs.readFile(
      path.join(workspaceDir, 'terraform.tfvars'),
      'utf-8'
    );

    expect(tfvarsContent).toContain(`instance_id    = "${INSTANCE_ID}"`);
    expect(tfvarsContent).toContain('instance_name  = "integration-test-instance"');
    expect(tfvarsContent).toContain('instance_size  = "small"');
    expect(tfvarsContent).toContain('n8n_version    = "1.40.0"');
    expect(tfvarsContent).toContain('ecs_cpu        = "512"');
    expect(tfvarsContent).toContain('ecs_memory     = "1024"');
  });
});
