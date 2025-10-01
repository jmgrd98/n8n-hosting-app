import { exec, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { SizeConfig, TerraformOutputs, TerraformVariables } from '@/types/infrastructure';
import { InstanceSize } from '@prisma/client';
// Import types from above

const execAsync = promisify(exec);

const SIZE_CONFIGS: Record<InstanceSize, SizeConfig> = {
  SMALL: {
    ecs_cpu: '512',
    ecs_memory: '1024',
    db_instance_class: 'db.t3.micro',
    db_storage_size: 20,
  },
  MEDIUM: {
    ecs_cpu: '1024',
    ecs_memory: '2048',
    db_instance_class: 'db.t3.small',
    db_storage_size: 50,
  },
  LARGE: {
    ecs_cpu: '2048',
    ecs_memory: '4096',
    db_instance_class: 'db.t3.medium',
    db_storage_size: 100,
  },
  XLARGE: {
    ecs_cpu: '4096',
    ecs_memory: '8192',
    db_instance_class: 'db.t3.large',
    db_storage_size: 200,
  },
};

export class TerraformExecutor {
  private workspaceDir: string;
  private instanceId: string;
  
  constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.workspaceDir = path.join(process.cwd(), 'terraform', 'workspaces', instanceId);
  }
  
  async initWorkspace(config: TerraformVariables): Promise<void> {
    // Create workspace directory
    await fs.mkdir(this.workspaceDir, { recursive: true });
    
    // Copy terraform modules
    const modulesDir = path.join(process.cwd(), 'terraform', 'modules');
    await this.copyDirectory(modulesDir, path.join(this.workspaceDir, 'modules'));
    
    // Generate Terraform files
    await this.generateVariablesTf();
    await this.generateMainTf(config);
    await this.generateTfVars(config);
    
    // Initialize Terraform
    await this.runCommand('terraform init');
  }
  
  private async generateVariablesTf(): Promise<void> {
    const variablesTf = `
variable "instance_id" {
  description = "Unique identifier for the instance"
  type        = string
}

variable "instance_name" {
  description = "Name of the instance"
  type        = string
}

variable "instance_size" {
  description = "Size of the instance"
  type        = string
}

variable "n8n_version" {
  description = "Version of n8n"
  type        = string
}

variable "aws_region" {
  description = "AWS Region"
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "Public subnet CIDR blocks"
  type        = list(string)
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "db_storage_size" {
  description = "RDS storage size"
  type        = number
}

variable "ecs_cpu" {
  description = "ECS task CPU units"
  type        = string
}

variable "ecs_memory" {
  description = "ECS task memory"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
`;
    
    await fs.writeFile(path.join(this.workspaceDir, 'variables.tf'), variablesTf);
  }
  
  private async generateMainTf(config: TerraformVariables): Promise<void> {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    
    if (!accessKey || !secretKey) {
      throw new Error('AWS credentials not configured');
    }
    
    const mainTf = `
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region
  access_key = "${accessKey}"
  secret_key = "${secretKey}"
}

module "n8n_instance" {
  source = "./modules/n8n-instance"
  
  instance_id    = var.instance_id
  instance_name  = var.instance_name
  instance_size  = var.instance_size
  n8n_version    = var.n8n_version
  aws_region     = var.aws_region
  
  vpc_cidr       = var.vpc_cidr
  public_subnet_cidrs = var.public_subnet_cidrs
  
  db_instance_class = var.db_instance_class
  db_storage_size   = var.db_storage_size
  
  ecs_cpu        = var.ecs_cpu
  ecs_memory     = var.ecs_memory
  
  tags = var.tags
}

output "instance_url" {
  value = module.n8n_instance.alb_dns_name
  description = "The URL to access the n8n instance"
}

output "database_endpoint" {
  value = module.n8n_instance.db_endpoint
  description = "The database endpoint"
}

output "ecs_cluster_name" {
  value = module.n8n_instance.ecs_cluster_name
  description = "The ECS cluster name"
}

output "ecs_service_name" {
  value = module.n8n_instance.ecs_service_name
  description = "The ECS service name"
}
`;
    
    await fs.writeFile(path.join(this.workspaceDir, 'main.tf'), mainTf);
  }
  
  private async generateTfVars(config: TerraformVariables): Promise<void> {
    const sizeConfig = SIZE_CONFIGS[config.size] || SIZE_CONFIGS.SMALL;
    
    const tfvars = `
instance_id    = "${this.instanceId}"
instance_name  = "${config.name}"
instance_size  = "${config.size.toLowerCase()}"
n8n_version    = "${config.version}"
aws_region     = "${config.region || 'us-east-1'}"

vpc_cidr = "${config.vpc_cidr || '10.0.0.0/16'}"
public_subnet_cidrs = ${JSON.stringify(config.public_subnet_cidrs || ['10.0.1.0/24', '10.0.2.0/24'])}

ecs_cpu        = "${config.ecs_cpu || sizeConfig.ecs_cpu}"
ecs_memory     = "${config.ecs_memory || sizeConfig.ecs_memory}"
db_instance_class = "${config.db_instance_class || sizeConfig.db_instance_class}"
db_storage_size   = ${config.db_storage_size || sizeConfig.db_storage_size}

tags = {
  Environment = "production"
  ManagedBy   = "terraform"
  InstanceId  = "${this.instanceId}"
  UserId      = "${config.userId}"
}
`;
    
    await fs.writeFile(path.join(this.workspaceDir, 'terraform.tfvars'), tfvars);
  }
  
  async plan(): Promise<string> {
    const { stdout } = await this.runCommand('terraform plan -out=tfplan');
    return stdout;
  }
  
  async apply(): Promise<TerraformOutputs> {
    console.log('Starting Terraform apply - this will take 5-15 minutes...');
    
    return new Promise((resolve, reject) => {
      const terraform: ChildProcessWithoutNullStreams = spawn('terraform', ['apply', '-auto-approve', 'tfplan'], {
        cwd: this.workspaceDir,
        env: {
          ...process.env,
          AWS_REGION: process.env.AWS_REGION || 'us-east-1',
        },
      });
      
      terraform.stdout.on('data', (data: Buffer) => {
        console.log(`[TERRAFORM]: ${data.toString()}`);
      });
      
      terraform.stderr.on('data', (data: Buffer) => {
        console.error(`[TERRAFORM ERROR]: ${data.toString()}`);
      });
      
      terraform.on('close', async (code: number | null) => {
        if (code === 0) {
          console.log('Terraform apply completed successfully');
          const outputs = await this.getOutputs();
          resolve(outputs);
        } else {
          reject(new Error(`Terraform apply failed with code ${code}`));
        }
      });
    });
  }
  
  async destroy(): Promise<void> {
    await this.runCommand('terraform destroy -auto-approve');
    await fs.rm(this.workspaceDir, { recursive: true, force: true });
  }
  
  async getOutputs(): Promise<TerraformOutputs> {
    const { stdout } = await this.runCommand('terraform output -json');
    return JSON.parse(stdout) as TerraformOutputs;
  }
  
  private async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    console.log(`Running: ${command} in ${this.workspaceDir}`);
    return await execAsync(command, {
      cwd: this.workspaceDir,
      env: {
        ...process.env,
        AWS_REGION: process.env.AWS_REGION || 'us-east-1',
      },
    });
  }
  
  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}
