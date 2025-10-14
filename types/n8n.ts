export interface NodeParameter {
  [key: string]: string | number | boolean | object | null | undefined;
}

// Node credentials
export interface NodeCredentials {
  [key: string]: {
    id: string;
    name: string;
  };
}

// Individual node in a workflow
export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: NodeParameter;
  credentials?: NodeCredentials;
  disabled?: boolean;
  notes?: string;
  notesInFlow?: boolean;
  color?: string;
  continueOnFail?: boolean;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

// Connection between nodes
export interface NodeConnection {
  node: string;
  type: string;
  index: number;
}

// Connections structure
export interface WorkflowConnections {
  [sourceNodeName: string]: {
    [outputType: string]: NodeConnection[][];
  };
}

// Workflow settings
export interface WorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveManualExecutions?: boolean;
  callerPolicy?: string;
  errorWorkflow?: string;
  timezone?: string;
  saveExecutionProgress?: boolean;
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
}

// Static data for workflow
export interface WorkflowStaticData {
  [key: string]: unknown;
}

// Complete workflow structure
export interface N8nWorkflow {
  id?: string;
  name: string;
  active?: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings?: WorkflowSettings;
  staticData?: WorkflowStaticData;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

// Generated workflow from AI (before creation)
export interface GeneratedWorkflow {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings?: WorkflowSettings;
  staticData?: WorkflowStaticData;
}

// Workflow from n8n API response
export interface N8nWorkflowResponse {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings: WorkflowSettings;
  staticData?: WorkflowStaticData;
  tags?: Array<{ id: string; name: string }>;
  createdAt: string;
  updatedAt: string;
  versionId?: string;
}

// Workflow list item (minimal data)
export interface WorkflowListItem {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: number; // Count of nodes
  tags?: string[];
}

// API Key interface
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt?: string;
  lastUsed?: string;
  expiresAt?: string;
}



export type InstanceStatus = 
  | 'PROVISIONING'
  | 'STARTING'
  | 'RUNNING'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED'
  | 'DESTROYING'
  | 'UPDATING'
  | 'DELETED';

export type InstanceSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE';

export interface ResourceLimits {
  cpu: string;
  memory: string;
  storage: string;
}

// Environment variables should be strings or numbers
export type EnvironmentVariable = string | number | boolean;

export interface InstanceConfig {
  version: string;
  size: InstanceSize;
  region: string;
  customDomain?: string | null;
  environment?: Record<string, EnvironmentVariable> | null;
  resources?: ResourceLimits | null;
}

export interface AWSResources {
  ecsTaskArn?: string | null;
  ecsCluster?: string | null;
  ecsService?: string | null;
  rdsInstanceId?: string | null;
  rdsEndpoint?: string | null;
  albDnsName?: string | null;
  albArn?: string | null;
  targetGroupArn?: string | null;
  vpcId?: string | null;
  subnetIds?: string[];
  securityGroupId?: string | null;
  s3BucketName?: string | null;
}

export interface AccessDetails {
  url?: string | null;
  adminUsername?: string | null;
  adminPasswordHash?: string | null;
  apiKey?: string | null;
  sshKeyName?: string | null;
  webhookUrl?: string | null;
}

export interface MonitoringConfig {
  metricsEnabled: boolean;
  logsRetention: number;
  alertsEnabled: boolean;
  alertEndpoints: string[];
}

export interface BillingInfo {
  monthlyCharge: number;
  hourlyRate: number;
  totalUsageHours: number;
  lastBilledAt?: Date | string | null;
  nextBillingDate?: Date | string | null;
}

export interface ResourceMetrics {
  cpuUtilization?: number | null;
  memoryUsed?: number | null;
  memoryAvailable?: number | null;
  storageUsed?: number | null;
  storageAvailable?: number | null;
  networkIn?: number | null;
  networkOut?: number | null;
}

export interface N8nMetrics {
  workflowCount?: number | null;
  executionCount?: number | null;
  failedExecutions?: number | null;
  activeUsers?: number | null;
  averageExecutionTime?: number | null;
}

export interface Metrics {
  resources: ResourceMetrics;
  n8nMetrics?: N8nMetrics | null;
  timestamp: Date | string;
}

export interface InstanceStats {
  totalExecutions: number;
  totalWorkflows: number;
  totalUptime: number;
  lastHealthCheck?: Date | string | null;
  healthStatus?: string | null;
}

// Terraform Types - Properly typed without 'any'

// Terraform attribute value can be various types
export type TerraformAttributeValue = 
  | string 
  | number 
  | boolean 
  | null
  | TerraformAttributeValue[]
  | { [key: string]: TerraformAttributeValue };

export interface TerraformResourceInstance {
  schema_version: number;
  attributes: Record<string, TerraformAttributeValue>;
  dependencies?: string[];
  private?: string;
  sensitive_attributes?: Array<{
    path: string[];
    type: string;
  }>;
}

export interface TerraformResource {
  type: string;
  name: string;
  provider: string;
  instances: TerraformResourceInstance[];
  mode?: 'managed' | 'data';
  module?: string;
}

// Terraform output value can be various types
export type TerraformOutputValue = 
  | string 
  | number 
  | boolean 
  | null
  | TerraformOutputValue[]
  | { [key: string]: TerraformOutputValue };

export interface TerraformOutputDefinition {
  value: TerraformOutputValue;
  type?: string | string[];
  sensitive?: boolean;
}

export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs?: Record<string, TerraformOutputDefinition>;
  resources?: TerraformResource[];
}

// Specific typed outputs for our infrastructure
export interface TerraformOutputs {
  instance_url?: {
    value: string;
    type?: string | string[];
    sensitive?: boolean;
  };
  database_endpoint?: {
    value: string;
    type?: string | string[];
    sensitive?: boolean;
  };
  ecs_cluster_name?: {
    value: string;
    type?: string | string[];
    sensitive?: boolean;
  };
  ecs_service_name?: {
    value: string;
    type?: string | string[];
    sensitive?: boolean;
  };
  vpc_id?: {
    value: string;
    type?: string | string[];
    sensitive?: boolean;
  };
  // Allow additional outputs with proper typing
  [key: string]: TerraformOutputDefinition | undefined;
}

export interface Instance {
  id: string;
  name: string;
  userId: string;
  status: InstanceStatus;
  
  config: InstanceConfig;
  awsResources?: AWSResources | null;
  access?: AccessDetails | null;
  
  terraformState?: TerraformState | null;
  terraformOutputs?: TerraformOutputs | null;
  
  monitoring: MonitoringConfig;
  billing: BillingInfo;
  
  latestMetrics?: Metrics | null;
  stats?: InstanceStats | null;
  
  startedAt?: Date | string | null;
  stoppedAt?: Date | string | null;
  lastDeployment?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}