# terraform/modules/n8n-instance/outputs.tf
output "alb_dns_name" {
  value = aws_lb.n8n.dns_name
}

output "db_endpoint" {
  value = aws_db_instance.n8n.endpoint
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.n8n.name
}

output "ecs_service_name" {
  value = aws_ecs_service.n8n.name
}

output "vpc_id" {
  value = aws_vpc.n8n_vpc.id
}

output "task_definition_arn" {
  value = aws_ecs_task_definition.n8n.arn
}