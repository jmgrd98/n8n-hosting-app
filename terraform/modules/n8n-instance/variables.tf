# terraform/modules/n8n-instance/variables.tf
variable "instance_id" {
  description = "Unique identifier for the instance"
  type        = string
}

variable "instance_name" {
  description = "Name of the n8n instance"
  type        = string
}

variable "instance_size" {
  description = "Size of the instance (small, medium, large)"
  type        = string
}

variable "customer_id" {
  description = "Unique identifier for the customer (e.g., 'customer-001', 'acme-corp')"
  type        = string
}

variable "customer_subdomain" {
  description = "Subdomain for customer access (e.g., 'acme' for acme.yourdomain.com)"
  type        = string
}

variable "customer_priority" {
  description = "Priority for ALB listener rule (must be unique per customer, e.g., 100, 101, 102)"
  type        = number
}

# Update these to reference shared resources:
variable "shared_rds_endpoint" {
  description = "Endpoint of the shared RDS instance"
  type        = string
  default     = ""  # Will be passed from shared infrastructure
}

variable "shared_rds_password" {
  description = "Password for shared RDS instance"
  type        = string
  sensitive   = true
  default     = ""
}

variable "shared_alb_arn" {
  description = "ARN of the shared Application Load Balancer"
  type        = string
  default     = ""
}

variable "shared_alb_listener_arn" {
  description = "ARN of the shared ALB listener"
  type        = string
  default     = ""
}

variable "shared_vpc_id" {
  description = "ID of the shared VPC"
  type        = string
  default     = ""
}

variable "shared_subnet_ids" {
  description = "IDs of the shared subnets"
  type        = list(string)
  default     = []
}

variable "shared_security_group_id" {
  description = "Security group ID for ECS tasks"
  type        = string
  default     = ""
}

variable "n8n_version" {
  description = "Version of n8n to deploy"
  type        = string
  default     = "latest"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "db_storage_size" {
  description = "RDS storage size in GB"
  type        = number
}

variable "ecs_cpu" {
  description = "CPU units for ECS task"
  type        = string
}

variable "ecs_memory" {
  description = "Memory for ECS task"
  type        = string
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}