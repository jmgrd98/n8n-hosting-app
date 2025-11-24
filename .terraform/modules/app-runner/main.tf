# terraform/modules/n8n-instance/main.tf
# VPC Configuration - Still needed for RDS
resource "aws_vpc" "n8n_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.tags, {
    Name = "${var.instance_name}-vpc"
  })
}

# Internet Gateway
resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.n8n_vpc.id

  tags = merge(var.tags, {
    Name = "${var.instance_name}-igw"
  })
}

# Subnets for RDS
resource "aws_subnet" "private" {
  count             = length(var.public_subnet_cidrs)
  vpc_id            = aws_vpc.n8n_vpc.id
  cidr_block        = var.public_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(var.tags, {
    Name = "${var.instance_name}-private-${count.index + 1}"
  })
}

# Route Table
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.n8n_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-private-rt"
  })
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name_prefix = "${var.instance_name}-rds-"
  vpc_id      = aws_vpc.n8n_vpc.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # App Runner will connect from AWS IP range
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-rds-sg"
  })
}

# DB Subnet Group
resource "aws_db_subnet_group" "n8n" {
  name       = "db-subnet-${var.instance_id}"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(var.tags, {
    Name = "${var.instance_name}-db-subnet-group"
  })
}

# Random password for database
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# RDS PostgreSQL Instance
resource "aws_db_instance" "n8n" {
  identifier              = "db-${var.instance_id}"
  engine                  = "postgres"
  engine_version          = "14"
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_storage_size
  storage_encrypted       = true
  db_name                 = "n8n"
  username                = "n8nadmin"
  password                = random_password.db_password.result
  vpc_security_group_ids  = [aws_security_group.rds.id]
  db_subnet_group_name    = aws_db_subnet_group.n8n.name
  skip_final_snapshot     = true
  deletion_protection     = false
  publicly_accessible     = true # Needed for App Runner to connect

  tags = merge(var.tags, {
    Name = "${var.instance_name}-rds"
  })
}

# VPC Connector for App Runner (allows private VPC access)
resource "aws_apprunner_vpc_connector" "n8n" {
  vpc_connector_name = "vpc-connector-${var.instance_id}"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.rds.id]

  tags = merge(var.tags, {
    Name = "${var.instance_name}-vpc-connector"
  })
}

# IAM Role for App Runner
resource "aws_iam_role" "apprunner_instance" {
  name = "apprunner-instance-${var.instance_id}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.instance_name}-apprunner-instance-role"
  })
}

# IAM Role for App Runner access (pulling images)
resource "aws_iam_role" "apprunner_access" {
  name = "apprunner-access-${var.instance_id}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.instance_name}-apprunner-access-role"
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr" {
  role       = aws_iam_role.apprunner_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# App Runner Service
resource "aws_apprunner_service" "n8n" {
  service_name = "apprunner-${var.instance_id}"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access.arn
    }

    image_repository {
      image_identifier      = "public.ecr.aws/docker/library/n8nio/n8n:${var.n8n_version}"
      image_repository_type = "ECR_PUBLIC"

      image_configuration {
        port = "5678"

        runtime_environment_variables = {
          DB_TYPE                 = "postgresdb"
          DB_POSTGRESDB_HOST      = aws_db_instance.n8n.address
          DB_POSTGRESDB_PORT      = "5432"
          DB_POSTGRESDB_DATABASE  = "n8n"
          DB_POSTGRESDB_USER      = "n8nadmin"
          DB_POSTGRESDB_PASSWORD  = random_password.db_password.result
          N8N_BASIC_AUTH_ACTIVE   = "false"
          N8N_PROTOCOL            = "https"
          N8N_SECURE_COOKIE       = "true"
          WEBHOOK_URL             = "https://${var.instance_id}.${var.aws_region}.awsapprunner.com/"
          N8N_DIAGNOSTICS_ENABLED = "false"
          N8N_PERSONALIZATION_ENABLED = "false"
        }
      }
    }

    auto_deployments_enabled = false
  }

  instance_configuration {
    cpu               = var.ecs_cpu
    memory            = var.ecs_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.n8n.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/healthz"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-apprunner"
  })

  depends_on = [
    aws_db_instance.n8n
  ]
}

# Auto Scaling Configuration (Optional)
resource "aws_apprunner_auto_scaling_configuration_version" "n8n" {
  auto_scaling_configuration_name = "autoscale-${var.instance_id}"

  max_concurrency = 100
  max_size        = 3
  min_size        = 1

  tags = merge(var.tags, {
    Name = "${var.instance_name}-autoscale"
  })
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}