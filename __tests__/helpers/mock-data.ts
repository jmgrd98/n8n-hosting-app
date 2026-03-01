export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  image: null,
};

export const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'USER',
  },
  expires: '2099-01-01T00:00:00.000Z',
};

export const mockInstance = {
  id: 'inst-abc123',
  name: 'My n8n Instance',
  status: 'RUNNING' as const,
  userId: 'user-1',
  config: {
    version: '1.94.1',
    size: 'small',
    region: 'us-east-1',
  },
  access: {
    url: 'https://inst-abc123.n8n.example.com',
    adminEmail: 'admin@example.com',
    adminPassword: 'securepassword',
  },
  monitoring: {
    metricsEnabled: true,
    alertsEnabled: false,
    logsRetention: 30,
  },
  billing: {
    monthlyCharge: 29,
    planType: 'STARTER',
  },
  latestMetrics: {
    timestamp: '2024-01-01T00:00:00.000Z',
    resources: {
      cpuUtilization: 45.5,
      memoryUsed: 512,
      memoryAvailable: 1024,
      storageUsed: 2048,
      storageAvailable: 10240,
    },
  },
  aws: {
    vpcId: 'vpc-123',
    ecsClusterId: 'cluster-123',
    ecsServiceId: 'service-123',
    rdsInstanceId: 'db-123',
  },
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
  deletedAt: null,
};

export const mockStoppedInstance = {
  ...mockInstance,
  id: 'inst-stopped',
  name: 'Stopped Instance',
  status: 'STOPPED' as const,
};

export const mockApiKey = {
  id: 'key-1',
  name: 'Production API Key',
  apiKey: 'n8n_api_abc123def456',
  instanceId: 'inst-abc123',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastUsedAt: '2024-01-15T00:00:00.000Z',
};
