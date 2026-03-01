import { describe, it, expect } from 'vitest';
import { generateComposeFile } from '../compose-template';

describe('generateComposeFile', () => {
  it('generates YAML with correct n8n version', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: '1.40.0',
      projectName: 'n8n-test-123',
    });

    expect(yaml).toContain('n8nio/n8n:1.40.0');
    expect(yaml).toContain('Instance: test-123');
  });

  it('uses latest tag when specified', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-456',
      n8nVersion: 'latest',
      projectName: 'n8n-test-456',
    });

    expect(yaml).toContain('n8nio/n8n:latest');
  });

  it('includes PostgreSQL with health check', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: 'latest',
      projectName: 'n8n-test-123',
    });

    expect(yaml).toContain('postgres:16-alpine');
    expect(yaml).toContain('pg_isready -U n8n');
    expect(yaml).toContain('DB_TYPE=postgresdb');
    expect(yaml).toContain('DB_POSTGRESDB_HOST=postgres');
  });

  it('uses random port mapping by default', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: 'latest',
      projectName: 'n8n-test-123',
    });

    expect(yaml).toContain('"0:5678"');
  });

  it('uses custom port when specified', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: 'latest',
      projectName: 'n8n-test-123',
      n8nPort: '5680',
    });

    expect(yaml).toContain('"5680:5678"');
  });

  it('includes custom environment variables', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: 'latest',
      projectName: 'n8n-test-123',
      environment: { N8N_LOG_LEVEL: 'debug', CUSTOM_VAR: 'value' },
    });

    expect(yaml).toContain('N8N_LOG_LEVEL=debug');
    expect(yaml).toContain('CUSTOM_VAR=value');
  });

  it('includes named volumes for persistence', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: 'latest',
      projectName: 'n8n-test-123',
    });

    expect(yaml).toContain('n8n_data:');
    expect(yaml).toContain('postgres_data:');
  });

  it('includes n8n health check', () => {
    const yaml = generateComposeFile({
      instanceId: 'test-123',
      n8nVersion: 'latest',
      projectName: 'n8n-test-123',
    });

    expect(yaml).toContain('healthz');
    expect(yaml).toContain('start_period: 30s');
  });
});
