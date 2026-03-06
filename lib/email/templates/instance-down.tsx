import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface InstanceDownEmailProps {
  instanceName: string;
  dashboardUrl: string;
}

export function InstanceDownEmail({
  instanceName,
  dashboardUrl,
}: InstanceDownEmailProps) {
  return (
    <BaseLayout
      preview={`Alert: Your n8n instance "${instanceName}" is unreachable`}
    >
      <Heading as="h2" style={heading}>
        Instance unreachable
      </Heading>
      <Text style={paragraph}>
        Your n8n instance <strong>{instanceName}</strong> is not responding to
        health checks.
      </Text>
      <Text style={paragraph}>
        It may have crashed or lost network connectivity. Visit your dashboard
        to restart or investigate.
      </Text>
      <Link href={dashboardUrl} style={buttonStyle}>
        Go to Dashboard
      </Link>
    </BaseLayout>
  );
}

const heading: React.CSSProperties = {
  marginTop: 0,
  fontSize: '18px',
  color: '#1e293b',
};

const paragraph: React.CSSProperties = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '1.6',
};
