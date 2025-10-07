resource "aws_db_parameter_group" "shared" {
  name   = "n8n-shared-db-parameter-group"
  family = "postgres14"

  parameter {
    name  = "max_connections"
    value = "200"
  }
}

resource "aws_db_instance" "shared" {
  identifier        = "n8n-shared-db"
  engine            = "postgres"
  engine_version    = "14"
  instance_class    = "db.t3.medium"
  allocated_storage = 100

  # Associate the parameter group with the db_instance
  parameter_group_name = aws_db_parameter_group.shared.name

  tags = {
    Name = "n8n-shared-database"
    Type = "multi-tenant"
  }
}