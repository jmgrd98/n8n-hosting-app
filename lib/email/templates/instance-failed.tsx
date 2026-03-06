import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface InstanceFailedEmailProps {
  instanceName: string;
  dashboardUrl: string;
}

export function InstanceFailedEmail({
  instanceName,
  dashboardUrl,
}: InstanceFailedEmailProps) {
  return (
    <BaseLayout
      preview={`Provisioning failed for your n8n instance "${instanceName}"`}
    >
      <Heading as="h2" style={heading}>
        Instance provisioning failed
      </Heading>
      <Text style={paragraph}>
        We were unable to provision your n8n instance{' '}
        <strong>{instanceName}</strong>. This could be due to a temporary
        infrastructure issue.
      </Text>
      <Text style={paragraph}>
        You can try creating the instance again from your dashboard. If the
        problem persists, please contact our support team.
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
