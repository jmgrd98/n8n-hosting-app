import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface InstanceDeletedEmailProps {
  instanceName: string;
  dashboardUrl: string;
}

export function InstanceDeletedEmail({
  instanceName,
  dashboardUrl,
}: InstanceDeletedEmailProps) {
  return (
    <BaseLayout
      preview={`Your n8n instance "${instanceName}" has been deleted`}
    >
      <Heading as="h2" style={heading}>
        Instance deleted
      </Heading>
      <Text style={paragraph}>
        Your n8n instance <strong>{instanceName}</strong> has been successfully
        deleted. All associated resources have been cleaned up.
      </Text>
      <Text style={paragraph}>
        If this was a mistake, you can create a new instance from your
        dashboard. Note that any data from the deleted instance cannot be
        recovered.
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
