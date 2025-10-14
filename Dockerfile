FROM node:20-alpine

# Install system dependencies
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    wget \
    unzip

# Install Terraform
RUN wget https://releases.hashicorp.com/terraform/1.6.6/terraform_1.6.6_linux_amd64.zip && \
    unzip terraform_1.6.6_linux_amd64.zip && \
    mv terraform /usr/local/bin/ && \
    rm terraform_1.6.6_linux_amd64.zip && \
    terraform --version

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for tsx)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Create directory for Terraform state
RUN mkdir -p terraform-state

# Run the worker using existing npm script
CMD ["npm", "run", "worker"]