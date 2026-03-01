#!/bin/bash
set -euo pipefail

echo "Bootstrapping LocalStack for integration tests..."

# Create S3 bucket for Terraform state
awslocal s3 mb s3://n8n-terraform-state-test

# Create DynamoDB table for Terraform state locking
awslocal dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Verify resources
echo "Verifying S3 bucket..."
awslocal s3 ls s3://n8n-terraform-state-test

echo "Verifying DynamoDB table..."
awslocal dynamodb describe-table --table-name terraform-locks --query "Table.TableStatus"

echo "LocalStack bootstrap complete!"
