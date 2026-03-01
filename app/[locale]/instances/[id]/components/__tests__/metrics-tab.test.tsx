import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsTab } from '../metrics-tab';
import { mockInstance, mockStoppedInstance } from '@/__tests__/helpers/mock-data';
import { Instance } from '@/types/n8n';

const runningInstance = mockInstance as Instance;
const stoppedInstance = mockStoppedInstance as Instance;

describe('MetricsTab', () => {
  it('shows no metrics message when instance is not running', () => {
    render(<MetricsTab instance={stoppedInstance} />);

    expect(
      screen.getByText('instance.metricsTab.noMetrics')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.metricsTab.noMetricsDescription')
    ).toBeInTheDocument();
  });

  it('renders resource usage section when running', () => {
    render(<MetricsTab instance={runningInstance} />);

    expect(
      screen.getByText('instance.metricsTab.resourceUsage')
    ).toBeInTheDocument();
  });

  it('renders CPU, Memory, Storage labels', () => {
    render(<MetricsTab instance={runningInstance} />);

    expect(
      screen.getByText('instance.metricsTab.cpuUsage')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.metricsTab.memoryUsage')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.metricsTab.storageUsage')
    ).toBeInTheDocument();
  });

  it('renders stat cards (avgResponseTime, successRate, activeWebhooks)', () => {
    render(<MetricsTab instance={runningInstance} />);

    expect(
      screen.getByText('instance.metricsTab.avgResponseTime')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.metricsTab.successRate')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.metricsTab.activeWebhooks')
    ).toBeInTheDocument();
  });
});
