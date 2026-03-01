import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InstanceCard } from '../instance-card';
import { mockInstance, mockStoppedInstance } from '@/__tests__/helpers/mock-data';
import type { Instance } from '@/types/n8n';

// Build fully typed instances from the mock helpers.
// The mock data uses a simplified shape, so we cast to Instance after filling
// in the required fields that the component actually reads.
const runningInstance = {
  ...mockInstance,
  config: {
    ...mockInstance.config,
    size: mockInstance.config.size as unknown as Instance['config']['size'],
  },
  monitoring: {
    metricsEnabled: true,
    alertsEnabled: false,
    logsRetention: 30,
    alertEndpoints: [],
  },
  billing: {
    monthlyCharge: 29,
    hourlyRate: 0,
    totalUsageHours: 0,
  },
} as unknown as Instance;

const stoppedInstance = {
  ...mockStoppedInstance,
  config: {
    ...mockStoppedInstance.config,
    size: mockStoppedInstance.config.size as unknown as Instance['config']['size'],
  },
  access: undefined,
  monitoring: {
    metricsEnabled: true,
    alertsEnabled: false,
    logsRetention: 30,
    alertEndpoints: [],
  },
  billing: {
    monthlyCharge: 29,
    hourlyRate: 0,
    totalUsageHours: 0,
  },
} as unknown as Instance;

const mockOnAction = vi.fn<
  (instanceId: string, action: 'start' | 'stop' | 'delete') => Promise<void>
>().mockResolvedValue(undefined);

describe('InstanceCard', () => {
  it('renders instance name', () => {
    render(<InstanceCard instance={runningInstance} onAction={mockOnAction} />);

    expect(screen.getByText('My n8n Instance')).toBeInTheDocument();
  });

  it('renders instance config (size, region, version)', () => {
    render(<InstanceCard instance={runningInstance} onAction={mockOnAction} />);

    // The CardDescription renders: "{size} . {region} . v{version}"
    expect(screen.getByText(/small/)).toBeInTheDocument();
    expect(screen.getByText(/us-east-1/)).toBeInTheDocument();
    expect(screen.getByText(/v1\.94\.1/)).toBeInTheDocument();
  });

  it('renders status badge with correct status text', () => {
    render(<InstanceCard instance={runningInstance} onAction={mockOnAction} />);

    // Status is rendered as status.toLowerCase() inside a Badge
    expect(screen.getByText('running')).toBeInTheDocument();
  });

  it('renders "Open n8n" button for RUNNING instance with URL', () => {
    render(<InstanceCard instance={runningInstance} onAction={mockOnAction} />);

    const openButton = screen.getByText('instanceCard.openN8n');
    expect(openButton).toBeInTheDocument();

    // Verify the link points to the instance URL
    const link = openButton.closest('a');
    expect(link).toHaveAttribute(
      'href',
      'https://inst-abc123.n8n.example.com'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('does NOT render "Open n8n" button for STOPPED instance', () => {
    render(<InstanceCard instance={stoppedInstance} onAction={mockOnAction} />);

    expect(screen.queryByText('instanceCard.openN8n')).not.toBeInTheDocument();
  });

  it('renders created date and monthly cost', () => {
    render(<InstanceCard instance={runningInstance} onAction={mockOnAction} />);

    // The translation mock returns the full key. When params are provided,
    // it replaces {key} placeholders in the full key string. Since the key
    // "instanceCard.created" does not literally contain "{date}", the mock
    // just returns the key as-is.
    expect(screen.getByText('instanceCard.created')).toBeInTheDocument();

    // Monthly cost is rendered as "$29/month"
    expect(screen.getByText(/\$29/)).toBeInTheDocument();
  });
});
