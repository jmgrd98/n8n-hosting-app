import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    rm: vi.fn(),
  },
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  access: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  const mod = {
    ...actual,
    exec: vi.fn().mockImplementation((_cmd: string, _opts: unknown, cb?: (err: Error | null, result: { stdout: string; stderr: string }) => void) => {
      if (cb) {
        cb(null, { stdout: '0.0.0.0:49152\n', stderr: '' });
      }
      return { stdout: '0.0.0.0:49152\n', stderr: '' };
    }),
  };
  return { ...mod, default: mod };
});

vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  const mod = {
    ...actual,
    promisify: (fn: unknown) => fn,
  };
  return { ...mod, default: mod };
});

import fs from 'fs/promises';
import { exec } from 'child_process';
import { DockerProvisioner } from '../docker-provisioner';

const mockExec = vi.mocked(exec);
const mockMkdir = vi.mocked(fs.mkdir);
const mockWriteFile = vi.mocked(fs.writeFile);
const mockAccess = vi.mocked(fs.access);
const mockRm = vi.mocked(fs.rm);

describe('DockerProvisioner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined as unknown as string);
    mockWriteFile.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);

    // Default: docker commands succeed and port command returns a port
    (mockExec as ReturnType<typeof vi.fn>).mockResolvedValue({
      stdout: '0.0.0.0:49152\n',
      stderr: '',
    });

    // Mock fetch for health check
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('creates project directory and writes docker-compose.yml', async () => {
      const provisioner = new DockerProvisioner('test-123');
      await provisioner.create({ version: 'latest', size: 'SMALL' });

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('test-123'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('docker-compose.yml'),
        expect.stringContaining('n8nio/n8n:latest')
      );
    });

    it('runs docker compose up and returns URL with assigned port', async () => {
      const provisioner = new DockerProvisioner('test-123');
      const result = await provisioner.create({ version: '1.40.0', size: 'SMALL' });

      expect(result.url).toBe('http://localhost:49152');
      expect(result.port).toBe(49152);
    });

    it('runs docker compose version check before creating', async () => {
      const provisioner = new DockerProvisioner('test-123');
      await provisioner.create({ version: 'latest', size: 'SMALL' });

      const calls = (mockExec as ReturnType<typeof vi.fn>).mock.calls;
      // First call should be docker compose version check
      expect(calls[0][0]).toBe('docker compose version');
    });

    it('runs docker compose up -d --wait', async () => {
      const provisioner = new DockerProvisioner('test-123');
      await provisioner.create({ version: 'latest', size: 'SMALL' });

      const calls = (mockExec as ReturnType<typeof vi.fn>).mock.calls;
      const upCall = calls.find((c: string[]) => c[0].includes('up -d --wait'));
      expect(upCall).toBeDefined();
      expect(upCall[0]).toContain('n8n-test-123');
    });

    it('throws when Docker is not available', async () => {
      (mockExec as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('command not found: docker'));

      const provisioner = new DockerProvisioner('test-123');
      await expect(provisioner.create({ version: 'latest', size: 'SMALL' }))
        .rejects.toThrow('Docker is not available');
    });
  });

  describe('destroy', () => {
    it('runs docker compose down -v and removes project directory', async () => {
      const provisioner = new DockerProvisioner('test-123');
      await provisioner.destroy();

      const calls = (mockExec as ReturnType<typeof vi.fn>).mock.calls;
      const downCall = calls.find((c: string[]) => c[0].includes('down -v'));
      expect(downCall).toBeDefined();
      expect(downCall[0]).toContain('n8n-test-123');

      expect(mockRm).toHaveBeenCalledWith(
        expect.stringContaining('test-123'),
        { recursive: true, force: true }
      );
    });

    it('handles non-existent project directory gracefully', async () => {
      mockAccess.mockRejectedValueOnce(new Error('ENOENT'));
      // The fallback docker compose down should also fail (no containers)
      (mockExec as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('no such project'));

      const provisioner = new DockerProvisioner('nonexistent');
      // Should not throw
      await expect(provisioner.destroy()).resolves.not.toThrow();
    });
  });

  describe('restart', () => {
    it('runs docker compose restart and returns URL', async () => {
      const provisioner = new DockerProvisioner('test-123');
      const result = await provisioner.restart();

      const calls = (mockExec as ReturnType<typeof vi.fn>).mock.calls;
      const restartCall = calls.find((c: string[]) => c[0].includes('restart'));
      expect(restartCall).toBeDefined();

      expect(result.url).toBe('http://localhost:49152');
      expect(result.port).toBe(49152);
    });
  });

  describe('stop', () => {
    it('runs docker compose stop', async () => {
      const provisioner = new DockerProvisioner('test-123');
      await provisioner.stop();

      const calls = (mockExec as ReturnType<typeof vi.fn>).mock.calls;
      const stopCall = calls.find((c: string[]) => c[0].includes('stop'));
      expect(stopCall).toBeDefined();
      expect(stopCall[0]).toContain('n8n-test-123');
    });
  });
});
