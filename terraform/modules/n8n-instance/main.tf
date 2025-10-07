# terraform/modules/n8n-instance/main.tf
# VPC Configuration
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

# Subnets
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.n8n_vpc.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(var.tags, {
    Name = "${var.instance_name}-public-${count.index + 1}"
  })
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.n8n_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-public-rt"
  })
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "${var.instance_name}-alb-"
  vpc_id      = aws_vpc.n8n_vpc.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-alb-sg"
  })
}

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "${var.instance_name}-ecs-tasks-"
  vpc_id      = aws_vpc.n8n_vpc.id

  ingress {
    from_port       = 5678
    to_port         = 5678
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-ecs-sg"
  })
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.instance_name}-rds-"
  vpc_id      = aws_vpc.n8n_vpc.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  tags = merge(var.tags, {
    Name = "${var.instance_name}-rds-sg"
  })
}

resource "aws_db_subnet_group" "n8n" {
  name       = "db-subnet-${var.instance_id}"  # Add "db-subnet-" prefix
  subnet_ids = aws_subnet.public[*].id

  tags = merge(var.tags, {
    Name = "${var.instance_name}-db-subnet-group"
  })
}

resource "random_password" "db_password" {
  length  = 32
  special = true
  # Override special characters to exclude those not allowed by RDS
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_instance" "n8n" {
  identifier     = "db-${var.instance_id}"  # Add "db-" prefix to ensure it starts with a letter
  engine         = "postgres"
  engine_version = "14"
  
  instance_class    = var.db_instance_class
  allocated_storage = var.db_storage_size
  storage_encrypted = true
  
  db_name  = "n8n"
  username = "n8nadmin"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.n8n.name
  
  skip_final_snapshot = true
  deletion_protection = false
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-rds"
  })
}

resource "aws_ecs_cluster" "n8n" {
  name = "cluster-${var.instance_id}"  # Add prefix
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-ecs-cluster"
  })
}

resource "postgresql_database" "customer_db" {
  name = "n8n_${var.customer_id}"
}

resource "aws_ecs_task_definition" "n8n" {
  family                   = "task-${var.instance_id}"  # Add prefix
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_cpu
  memory                   = var.ecs_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn           = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name  = "n8n"
      image = "n8nio/n8n:${var.n8n_version}"
      
      portMappings = [
        {
          containerPort = 5678
          protocol      = "tcp"
        }
      ]
      
      environment = [
        {
          name  = "DB_TYPE"
          value = "postgresdb"
        },
        {
          name  = "DB_POSTGRESDB_HOST"
          value = aws_db_instance.n8n.address
        },
        {
          name  = "DB_POSTGRESDB_PORT"
          value = "5432"
        },
        {
          name  = "DB_POSTGRESDB_DATABASE"
          value = "n8n_${var.customer_id}" 
        },
        {
          name  = "DB_POSTGRESDB_USER"
          value = "n8nadmin"
        },
        {
          name  = "DB_POSTGRESDB_PASSWORD"
          value = random_password.db_password.result
        },
        {
          name  = "N8N_BASIC_AUTH_ACTIVE"
          value = "false"
        },
        {
          name  = "N8N_HOST"
          value = aws_lb.n8n.dns_name
        },
        {
          name  = "N8N_PROTOCOL"
          value = "http"
        },
        {
          name  = "N8N_SECURE_COOKIE"
          value = "false"
        },
        {
          name  = "WEBHOOK_URL"
          value = "http://${aws_lb.n8n.dns_name}/"
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.n8n.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "n8n"
        }
      }
    }
  ])
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-task"
  })
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "n8n" {
  name              = "/ecs/${var.instance_id}"
  retention_in_days = 7
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-logs"
  })
}

resource "aws_lb" "n8n" {
  name               = "alb-${substr(var.instance_id, 0, 28)}"  # ALB names have 32 char limit
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = aws_subnet.public[*].id
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-alb"
  })
}

resource "aws_lb_target_group" "n8n" {
  name        = "tg-${substr(var.instance_id, 0, 29)}"  # Target group names have 32 char limit
  port        = 5678
  protocol    = "HTTP"
  vpc_id      = aws_vpc.n8n_vpc.id
  target_type = "ip"
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/healthz"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 3
  }
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-tg"
  })
}

resource "aws_lb_listener" "n8n" {
  load_balancer_arn = aws_lb.n8n.arn
  port              = "80"
  protocol          = "HTTP"
  
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.n8n.arn
  }
}

resource "aws_lb_listener_rule" "customer_routing" {
  listener_arn = aws_lb_listener.n8n.arn
  priority     = var.customer_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.customer.arn
  }

  condition {
    host_header {
      values = ["${var.customer_subdomain}.yourdomain.com"]
    }
  }
}


resource "aws_ecs_service" "n8n" {
  name            = "service-${var.instance_id}"  # Add prefix
  cluster         = aws_ecs_cluster.n8n.id
  task_definition = aws_ecs_task_definition.n8n.arn
  desired_count   = 1
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = true
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.n8n.arn
    container_name   = "n8n"
    container_port   = 5678
  }
  
  depends_on = [
    aws_lb_listener.n8n,
    aws_iam_role_policy_attachment.ecs_execution
  ]
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-service"
  })
}

# IAM Roles
resource "aws_iam_role" "ecs_execution" {
  name = "role-exec-${var.instance_id}" 
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-ecs-execution-role"
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name = "role-task-${var.instance_id}"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
  
  tags = merge(var.tags, {
    Name = "${var.instance_name}-ecs-task-role"
  })
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}