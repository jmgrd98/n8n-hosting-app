import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface InstanceReadyEmailProps {
  instanceName: string;
  instanceUrl: string;
}

export function InstanceReadyEmail({
  instanceName,
  instanceUrl,
}: InstanceReadyEmailProps) {
  return (
    <BaseLayout
      preview={`Your n8n instance "${instanceName}" is ready`}
    >
      <Heading as="h2" style={heading}>
        Your instance is ready
      </Heading>
      <Text style={paragraph}>
        Your n8n instance <strong>{instanceName}</strong> has been successfully
        provisioned and is now running.
      </Text>
      <Text style={paragraph}>
        You can access it at the link below and start building your automations.
      </Text>
      <Link href={instanceUrl} style={buttonStyle}>
        Open n8n
      </Link>
      <Text style={urlText}>URL: {instanceUrl}</Text>
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

const urlText: React.CSSProperties = {
  marginTop: '24px',
  fontSize: '13px',
  color: '#94a3b8',
};
