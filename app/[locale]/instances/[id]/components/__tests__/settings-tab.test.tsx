import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsTab } from '../settings-tab';

const instanceWithMonitoring = {
  name: 'Test Instance',
  monitoring: {
    metricsEnabled: true,
    logsRetention: 30,
    alertsEnabled: false,
  },
};

const mockOnDelete = vi.fn();

describe('SettingsTab', () => {
  it('renders settings title', () => {
    render(
      <SettingsTab instance={instanceWithMonitoring} onDelete={mockOnDelete} />
    );

    expect(
      screen.getByText('instance.settingsTab.title')
    ).toBeInTheDocument();
  });

  it('renders monitoring section with metrics and alerts status', () => {
    render(
      <SettingsTab instance={instanceWithMonitoring} onDelete={mockOnDelete} />
    );

    // Section heading
    expect(
      screen.getByText('instance.settingsTab.monitoring')
    ).toBeInTheDocument();

    // Metrics label and description
    expect(
      screen.getByText('instance.settingsTab.enableMetrics')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.settingsTab.enableMetricsDescription')
    ).toBeInTheDocument();

    // Alerts label and description
    expect(
      screen.getByText('instance.settingsTab.enableAlerts')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.settingsTab.enableAlertsDescription')
    ).toBeInTheDocument();

    // metricsEnabled is true -> "enabled" badge, alertsEnabled is false -> "disabled" badge
    expect(
      screen.getByText('instance.settingsTab.enabled')
    ).toBeInTheDocument();
    expect(
      screen.getByText('instance.settingsTab.disabled')
    ).toBeInTheDocument();
  });

  it('renders logs retention with days count', () => {
    render(
      <SettingsTab instance={instanceWithMonitoring} onDelete={mockOnDelete} />
    );

    expect(
      screen.getByText('instance.settingsTab.logsRetention')
    ).toBeInTheDocument();

    // The translation mock returns the full key. When params are provided,
    // it tries to replace {key} placeholders in the full key string. Since
    // "instance.settingsTab.days" does not literally contain "{count}", the
    // mock returns the key as-is.
    expect(
      screen.getByText('instance.settingsTab.days')
    ).toBeInTheDocument();
  });

  it('renders delete instance button in danger zone', () => {
    render(
      <SettingsTab instance={instanceWithMonitoring} onDelete={mockOnDelete} />
    );

    // Danger zone heading
    expect(
      screen.getByText('instance.settingsTab.dangerZone')
    ).toBeInTheDocument();

    // Delete warning
    expect(
      screen.getByText('instance.settingsTab.deleteWarning')
    ).toBeInTheDocument();

    // Delete button
    expect(
      screen.getByRole('button', {
        name: /instance\.settingsTab\.deleteInstance/i,
      })
    ).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <SettingsTab instance={instanceWithMonitoring} onDelete={mockOnDelete} />
    );

    const deleteButton = screen.getByRole('button', {
      name: /instance\.settingsTab\.deleteInstance/i,
    });

    await user.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledOnce();
  });
});
