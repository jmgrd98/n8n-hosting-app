// types/n8n.ts

// Node parameter types
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

// Instance interface (for the instance data)
export interface Instance {
  id: string;
  name: string;
  status: string;
  access?: {
    url?: string;
    adminUsername?: string;
    apiKey?: string;
  };
  stats?: {
    totalExecutions: number;
    totalWorkflows: number;
    totalUptime: number;
    healthStatus?: string;
  };
  billing?: {
    monthlyCharge: number;
    hourlyRate: number;
    totalUsageHours: number;
  };
}

// Workflow creation request
export interface CreateWorkflowRequest {
  workflow: GeneratedWorkflow;
  originalPrompt?: string;
}

// Workflow creation response
export interface CreateWorkflowResponse {
  success: boolean;
  workflow: {
    id: string;
    name: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}

// Generate workflow request
export interface GenerateWorkflowRequest {
  prompt: string;
  apiKeyId: string;
}

// Generate workflow response
export interface GenerateWorkflowResponse {
  success: boolean;
  workflow: GeneratedWorkflow;
}