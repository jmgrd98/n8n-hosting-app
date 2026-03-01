import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';

// ---------------------------------------------------------------------------
// Mocks – must be declared before importing the module under test
// ---------------------------------------------------------------------------

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    access: vi.fn(),
    rm: vi.fn(),
    copyFile: vi.fn(),
  },
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  access: vi.fn(),
  rm: vi.fn(),
  copyFile: vi.fn(),
}));
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  const mod = {
    ...actual,
    exec: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
    spawn: vi.fn(),
  };
  return { ...mod, default: mod };
});
vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  const mod = { ...actual, promisify: (fn: unknown) => fn };
  return { ...mod, default: mod };
});

// Import *after* mocks are in place
import fs from 'fs/promises';
import { exec, spawn } from 'child_process';
import { TerraformExecutor } from '../executor';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const INSTANCE_ID = 'inst-test-123';

/**
 * Minimal TerraformVariables config used by most tests.
 * Matches the shape expected by executor.ts.
 */
function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    instanceId: INSTANCE_ID,
    name: 'my-instance',
    size: 'MEDIUM' as const,
    version: '1.40.0',
    region: 'us-east-1',
    userId: 'user-42',
    ...overrides,
  };
}

// Typed shortcuts to the mocked functions
const mockExec = vi.mocked(exec);
const mockSpawn = vi.mocked(spawn);
const mockMkdir = vi.mocked(fs.mkdir);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockReaddir = vi.mocked(fs.readdir);
const mockAccess = vi.mocked(fs.access);
const mockRm = vi.mocked(fs.rm);
const mockCopyFile = vi.mocked(fs.copyFile);

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.clearAllMocks();

  // Preserve original env values so we can restore them later
  for (const key of [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'TERRAFORM_STATE_BUCKET',
    'AWS_REGION',
    'VERCEL',
  ]) {
    savedEnv[key] = process.env[key];
  }

  // Set required env vars
  process.env.AWS_ACCESS_KEY_ID = 'test-key';
  process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
  process.env.TERRAFORM_STATE_BUCKET = 'test-bucket';
  process.env.AWS_REGION = 'us-east-1';
  delete process.env.VERCEL;

  // Default fs mock implementations – individual tests can override
  mockMkdir.mockResolvedValue(undefined as unknown as string);
  mockWriteFile.mockResolvedValue(undefined);
  // readdir returns an empty array by default (no module files to copy)
  mockReaddir.mockResolvedValue([] as never);
  mockAccess.mockResolvedValue(undefined);
  mockRm.mockResolvedValue(undefined);
  mockCopyFile.mockResolvedValue(undefined);

  // exec resolves successfully by default
  (mockExec as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    stdout: '',
    stderr: '',
  });
});

afterEach(() => {
  // Restore original env
  for (const [key, val] of Object.entries(savedEnv)) {
    if (val === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = val;
    }
  }
});

// ===========================================================================
// Tests
// ===========================================================================

describe('TerraformExecutor', () => {
  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------
  describe('constructor', () => {
    it('sets workspace dir using cwd() by default', () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      const expected = path.join(process.cwd(), 'terraform', 'workspaces', INSTANCE_ID);
      // We verify indirectly: initWorkspace will call mkdir with the workspace dir
      // But we can also trigger plan() and inspect the cwd passed to exec.
      // Simplest: call plan() and check exec's cwd option.
      executor.plan();
      const callArgs = (mockExec as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.objectContaining({ cwd: expected }),
      );
    });

    it('sets workspace dir under /tmp when VERCEL env var is set', () => {
      process.env.VERCEL = '1';
      const executor = new TerraformExecutor(INSTANCE_ID);
      const expected = path.join('/tmp', 'terraform', 'workspaces', INSTANCE_ID);
      executor.plan();
      const callArgs = (mockExec as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toEqual(
        expect.objectContaining({ cwd: expected }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // generateMainTf (tested via initWorkspace)
  // -------------------------------------------------------------------------
  describe('generateMainTf', () => {
    it('throws when AWS_ACCESS_KEY_ID is not set', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      const executor = new TerraformExecutor(INSTANCE_ID);
      await expect(executor.initWorkspace(makeConfig() as never)).rejects.toThrow(
        'AWS credentials not configured',
      );
    });

    it('throws when AWS_SECRET_ACCESS_KEY is not set', async () => {
      delete process.env.AWS_SECRET_ACCESS_KEY;
      const executor = new TerraformExecutor(INSTANCE_ID);
      await expect(executor.initWorkspace(makeConfig() as never)).rejects.toThrow(
        'AWS credentials not configured',
      );
    });

    it('throws when TERRAFORM_STATE_BUCKET is not set', async () => {
      delete process.env.TERRAFORM_STATE_BUCKET;
      const executor = new TerraformExecutor(INSTANCE_ID);
      await expect(executor.initWorkspace(makeConfig() as never)).rejects.toThrow(
        'TERRAFORM_STATE_BUCKET not configured',
      );
    });

    it('generates main.tf with S3 backend and correct bucket', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      const mainTfCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('main.tf'),
      );
      expect(mainTfCall).toBeDefined();

      const content = mainTfCall![1] as string;
      expect(content).toContain('backend "s3"');
      expect(content).toContain('bucket = "test-bucket"');
      expect(content).toContain(`key    = "instances/${INSTANCE_ID}/terraform.tfstate"`);
    });

    it('embeds AWS credentials in provider block', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      const mainTfCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('main.tf'),
      );
      const content = mainTfCall![1] as string;
      expect(content).toContain('access_key = "test-key"');
      expect(content).toContain('secret_key = "test-secret"');
    });
  });

  // -------------------------------------------------------------------------
  // generateTfVars
  // -------------------------------------------------------------------------
  describe('generateTfVars', () => {
    it('generates tfvars with instance config values', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      const tfvarsCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('terraform.tfvars'),
      );
      expect(tfvarsCall).toBeDefined();

      const content = tfvarsCall![1] as string;
      expect(content).toContain(`instance_id    = "${INSTANCE_ID}"`);
      expect(content).toContain('instance_name  = "my-instance"');
      expect(content).toContain('n8n_version    = "1.40.0"');
      expect(content).toContain('UserId      = "user-42"');
    });

    it('uses SIZE_CONFIGS defaults for the given size (MEDIUM)', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig({ size: 'MEDIUM' }) as never);

      const tfvarsCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('terraform.tfvars'),
      );
      const content = tfvarsCall![1] as string;

      // MEDIUM size defaults
      expect(content).toContain('ecs_cpu        = "1024"');
      expect(content).toContain('ecs_memory     = "2048"');
      expect(content).toContain('db_instance_class = "db.t3.small"');
      expect(content).toContain('db_storage_size   = 50');
    });

    it('falls back to SMALL config when size is not found', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      // Use a bogus size that does not exist in SIZE_CONFIGS
      await executor.initWorkspace(makeConfig({ size: 'UNKNOWN_SIZE' }) as never);

      const tfvarsCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('terraform.tfvars'),
      );
      const content = tfvarsCall![1] as string;

      // Falls back to SMALL
      expect(content).toContain('ecs_cpu        = "512"');
      expect(content).toContain('ecs_memory     = "1024"');
      expect(content).toContain('db_instance_class = "db.t3.micro"');
      expect(content).toContain('db_storage_size   = 20');
    });

    it('uses custom values when provided (overrides size defaults)', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(
        makeConfig({
          size: 'LARGE',
          ecs_cpu: '8192',
          ecs_memory: '16384',
          db_instance_class: 'db.r5.xlarge',
          db_storage_size: 500,
        }) as never,
      );

      const tfvarsCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('terraform.tfvars'),
      );
      const content = tfvarsCall![1] as string;

      expect(content).toContain('ecs_cpu        = "8192"');
      expect(content).toContain('ecs_memory     = "16384"');
      expect(content).toContain('db_instance_class = "db.r5.xlarge"');
      expect(content).toContain('db_storage_size   = 500');
    });
  });

  // -------------------------------------------------------------------------
  // generateVariablesTf
  // -------------------------------------------------------------------------
  describe('generateVariablesTf', () => {
    it('generates variables.tf with all 12 variable declarations', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      const varsTfCall = mockWriteFile.mock.calls.find(
        ([filePath]) => String(filePath).endsWith('variables.tf'),
      );
      expect(varsTfCall).toBeDefined();

      const content = varsTfCall![1] as string;

      const expectedVariables = [
        'instance_id',
        'instance_name',
        'instance_size',
        'n8n_version',
        'aws_region',
        'vpc_cidr',
        'public_subnet_cidrs',
        'db_instance_class',
        'db_storage_size',
        'ecs_cpu',
        'ecs_memory',
        'tags',
      ];

      for (const varName of expectedVariables) {
        expect(content).toContain(`variable "${varName}"`);
      }

      // Exactly 12 variable blocks
      const variableBlockCount = (content.match(/variable "/g) || []).length;
      expect(variableBlockCount).toBe(12);
    });
  });

  // -------------------------------------------------------------------------
  // initWorkspace
  // -------------------------------------------------------------------------
  describe('initWorkspace', () => {
    it('creates workspace directory', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining(INSTANCE_ID),
        { recursive: true },
      );
    });

    it('copies modules directory', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      // The first mkdir call is for the workspace itself, subsequent ones are
      // for the modules directory copy (copyDirectory creates the dest dir).
      const mkdirPaths = mockMkdir.mock.calls.map(([p]) => String(p));
      expect(mkdirPaths.some((p) => p.includes('modules'))).toBe(true);
    });

    it('generates all 3 tf files', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      const writtenPaths = mockWriteFile.mock.calls.map(([p]) => String(p));

      expect(writtenPaths.some((p) => p.endsWith('variables.tf'))).toBe(true);
      expect(writtenPaths.some((p) => p.endsWith('main.tf'))).toBe(true);
      expect(writtenPaths.some((p) => p.endsWith('terraform.tfvars'))).toBe(true);
    });

    it('runs terraform init', async () => {
      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.initWorkspace(makeConfig() as never);

      expect(mockExec).toHaveBeenCalledWith(
        'terraform init',
        expect.objectContaining({
          cwd: expect.stringContaining(INSTANCE_ID),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // plan
  // -------------------------------------------------------------------------
  describe('plan', () => {
    it('runs terraform plan -out=tfplan and returns stdout', async () => {
      (mockExec as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: 'Plan: 5 to add, 0 to change, 0 to destroy.',
        stderr: '',
      });

      const executor = new TerraformExecutor(INSTANCE_ID);
      const result = await executor.plan();

      expect(mockExec).toHaveBeenCalledWith(
        'terraform plan -out=tfplan',
        expect.objectContaining({
          cwd: expect.stringContaining(INSTANCE_ID),
        }),
      );
      expect(result).toBe('Plan: 5 to add, 0 to change, 0 to destroy.');
    });
  });

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------
  describe('destroy', () => {
    it('returns early when workspace does not exist', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.destroy();

      // Should not attempt to run terraform destroy
      expect(mockExec).not.toHaveBeenCalled();
      // Should not attempt to remove workspace
      expect(mockRm).not.toHaveBeenCalled();
    });

    it('cleans up workspace when no state file exists', async () => {
      // First access check (workspace) succeeds
      mockAccess.mockResolvedValueOnce(undefined);
      // Second access check (state file) fails
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));

      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.destroy();

      // Should not run terraform destroy
      expect(mockExec).not.toHaveBeenCalled();
      // Should clean up workspace
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining(INSTANCE_ID),
        { recursive: true, force: true },
      );
    });

    it('runs terraform destroy and cleans up on success', async () => {
      // Both access checks succeed
      mockAccess.mockResolvedValue(undefined);

      const executor = new TerraformExecutor(INSTANCE_ID);
      await executor.destroy();

      // Should run terraform destroy
      expect(mockExec).toHaveBeenCalledWith(
        'terraform destroy -auto-approve',
        expect.objectContaining({
          cwd: expect.stringContaining(INSTANCE_ID),
        }),
      );
      // Should clean up workspace
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining(INSTANCE_ID),
        { recursive: true, force: true },
      );
    });

    it('cleans up workspace even when destroy fails, then re-throws', async () => {
      mockAccess.mockResolvedValue(undefined);
      const destroyError = new Error('terraform destroy failed');
      (mockExec as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(destroyError);

      const executor = new TerraformExecutor(INSTANCE_ID);
      await expect(executor.destroy()).rejects.toThrow('terraform destroy failed');

      // Should still attempt workspace cleanup
      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining(INSTANCE_ID),
        { recursive: true, force: true },
      );
    });
  });

  // -------------------------------------------------------------------------
  // getOutputs
  // -------------------------------------------------------------------------
  describe('getOutputs', () => {
    it('parses JSON from terraform output -json', async () => {
      const fakeOutputs = {
        instance_url: { value: 'https://n8n.example.com', sensitive: false, type: 'string' },
        vpc_id: { value: 'vpc-abc123', sensitive: false, type: 'string' },
      };

      (mockExec as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: JSON.stringify(fakeOutputs),
        stderr: '',
      });

      const executor = new TerraformExecutor(INSTANCE_ID);
      const outputs = await executor.getOutputs();

      expect(mockExec).toHaveBeenCalledWith(
        'terraform output -json',
        expect.objectContaining({
          cwd: expect.stringContaining(INSTANCE_ID),
        }),
      );
      expect(outputs).toEqual(fakeOutputs);
    });
  });

  // -------------------------------------------------------------------------
  // apply
  // -------------------------------------------------------------------------
  describe('apply', () => {
    it('resolves with outputs on successful apply (exit code 0)', async () => {
      const fakeOutputs = {
        instance_url: { value: 'https://n8n.example.com', sensitive: false, type: 'string' },
      };

      // getOutputs is called after apply succeeds
      (mockExec as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        stdout: JSON.stringify(fakeOutputs),
        stderr: '',
      });

      // Create a mock child process with EventEmitter-like behaviour
      const stdoutHandlers: Record<string, (data: Buffer) => void> = {};
      const stderrHandlers: Record<string, (data: Buffer) => void> = {};
      const processHandlers: Record<string, (...args: unknown[]) => void> = {};

      const mockChild = {
        stdout: { on: vi.fn((event: string, cb: (data: Buffer) => void) => { stdoutHandlers[event] = cb; }) },
        stderr: { on: vi.fn((event: string, cb: (data: Buffer) => void) => { stderrHandlers[event] = cb; }) },
        on: vi.fn((event: string, cb: (...args: unknown[]) => void) => { processHandlers[event] = cb; }),
      };

      mockSpawn.mockReturnValue(mockChild as never);

      const executor = new TerraformExecutor(INSTANCE_ID);
      const applyPromise = executor.apply();

      // Simulate terraform producing output and exiting successfully
      stdoutHandlers['data']?.(Buffer.from('Apply complete!'));
      processHandlers['close']?.(0);

      const result = await applyPromise;
      expect(result).toEqual(fakeOutputs);
      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        ['apply', '-auto-approve', 'tfplan'],
        expect.objectContaining({
          cwd: expect.stringContaining(INSTANCE_ID),
        }),
      );
    });

    it('rejects when apply exits with non-zero code', async () => {
      const stdoutHandlers: Record<string, (data: Buffer) => void> = {};
      const stderrHandlers: Record<string, (data: Buffer) => void> = {};
      const processHandlers: Record<string, (...args: unknown[]) => void> = {};

      const mockChild = {
        stdout: { on: vi.fn((event: string, cb: (data: Buffer) => void) => { stdoutHandlers[event] = cb; }) },
        stderr: { on: vi.fn((event: string, cb: (data: Buffer) => void) => { stderrHandlers[event] = cb; }) },
        on: vi.fn((event: string, cb: (...args: unknown[]) => void) => { processHandlers[event] = cb; }),
      };

      mockSpawn.mockReturnValue(mockChild as never);

      const executor = new TerraformExecutor(INSTANCE_ID);
      const applyPromise = executor.apply();

      // Simulate error output and non-zero exit
      stderrHandlers['data']?.(Buffer.from('Error applying plan'));
      processHandlers['close']?.(1);

      await expect(applyPromise).rejects.toThrow('Terraform apply failed with code 1');
    });
  });
});
