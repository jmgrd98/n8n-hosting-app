import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { generateComposeFile } from './compose-template';

const execAsync = promisify(exec);

export class DockerProvisioner {
  private instanceId: string;
  private projectDir: string;
  private projectName: string;

  constructor(instanceId: string) {
    this.instanceId = instanceId;
    this.projectName = `n8n-${instanceId}`;
    const baseDir = process.env.DOCKER_PROJECTS_DIR || path.join(process.cwd(), '.docker-instances');
    this.projectDir = path.join(baseDir, instanceId);
  }

  async create(config: { version: string; size: string }): Promise<{ url: string; port: number }> {
    await this.checkDockerAvailable();

    // Create project directory
    await fs.mkdir(this.projectDir, { recursive: true });

    // Generate and write docker-compose.yml
    const composeYaml = generateComposeFile({
      instanceId: this.instanceId,
      n8nVersion: config.version === 'latest' ? 'latest' : config.version,
      projectName: this.projectName,
      size: config.size,
    });
    await fs.writeFile(path.join(this.projectDir, 'docker-compose.yml'), composeYaml);

    // Start containers
    await this.runCommand(`docker compose -p ${this.projectName} up -d --wait`);

    // Read the assigned host port
    const port = await this.getAssignedPort();

    // Wait for n8n to be ready
    await this.waitForHealthy(port);

    const url = `http://localhost:${port}`;
    return { url, port };
  }

  async destroy(): Promise<void> {
    try {
      await fs.access(this.projectDir);
      await this.runCommand(`docker compose -p ${this.projectName} down -v --remove-orphans`);
      await fs.rm(this.projectDir, { recursive: true, force: true });
    } catch {
      // If directory doesn't exist, try to tear down by project name anyway
      try {
        await this.runCommand(`docker compose -p ${this.projectName} down -v --remove-orphans`);
      } catch {
        // Already destroyed or never existed
      }
    }
  }

  async stop(): Promise<void> {
    await this.runCommand(`docker compose -p ${this.projectName} stop`);
  }

  async restart(): Promise<{ url: string; port: number }> {
    await this.runCommand(`docker compose -p ${this.projectName} restart`);
    const port = await this.getAssignedPort();
    await this.waitForHealthy(port);
    return { url: `http://localhost:${port}`, port };
  }

  private async checkDockerAvailable(): Promise<void> {
    try {
      await execAsync('docker compose version');
    } catch {
      throw new Error(
        'Docker is not available. Make sure Docker Desktop is running and ' +
        '`docker compose` is accessible from the command line.'
      );
    }
  }

  private async getAssignedPort(): Promise<number> {
    const { stdout } = await this.runCommand(
      `docker compose -p ${this.projectName} port n8n 5678`
    );
    // Output format: "0.0.0.0:XXXXX" or ":::XXXXX"
    const match = stdout.trim().match(/:(\d+)$/);
    if (!match) {
      throw new Error(
        `Could not determine assigned port for instance ${this.instanceId}. Output: ${stdout}`
      );
    }
    return parseInt(match[1], 10);
  }

  private async waitForHealthy(port: number, maxRetries = 30, intervalMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(`http://localhost:${port}/healthz`);
        if (response.ok) {
          console.log(`n8n instance ${this.instanceId} is healthy on port ${port}`);
          return;
        }
      } catch {
        // Not ready yet
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    // Container may still be running even if healthz doesn't respond
    console.warn(
      `Health check timed out for instance ${this.instanceId}, ` +
      `but container may still be starting. Access at http://localhost:${port}`
    );
  }

  private async runCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    console.log(`[DOCKER] Running: ${command}`);
    return await execAsync(command, {
      cwd: this.projectDir,
      env: { ...process.env },
      timeout: 120000,
    });
  }
}
