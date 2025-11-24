# terraform/modules/n8n-instance/outputs.tf
output "apprunner_url" {
  description = "App Runner service URL"
  value       = "https://${aws_apprunner_service.n8n.service_url}"
}

output "apprunner_service_id" {
  description = "App Runner service ID"
  value       = aws_apprunner_service.n8n.service_id
}

output "apprunner_service_arn" {
  description = "App Runner service ARN"
  value       = aws_apprunner_service.n8n.arn
}

output "db_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.n8n.endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.n8n_vpc.id
}

output "db_password" {
  description = "Database password (sensitive)"
  value       = random_password.db_password.result
  sensitive   = true
}