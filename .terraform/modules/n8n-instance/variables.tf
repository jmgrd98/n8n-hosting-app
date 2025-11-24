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