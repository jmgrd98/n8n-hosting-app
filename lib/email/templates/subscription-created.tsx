import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface SubscriptionCreatedEmailProps {
  planName: string;
  instanceLimit: number;
  dashboardUrl: string;
}

export function SubscriptionCreatedEmail({
  planName,
  instanceLimit,
  dashboardUrl,
}: SubscriptionCreatedEmailProps) {
  const limitText =
    instanceLimit === -1 ? 'unlimited instances' : `up to ${instanceLimit} instances`;

  return (
    <BaseLayout
      preview={`Your ${planName} subscription is now active`}
    >
      <Heading as="h2" style={heading}>
        Subscription activated
      </Heading>
      <Text style={paragraph}>
        Your <strong>{planName}</strong> plan is now active. You can create{' '}
        {limitText}.
      </Text>
      <Text style={paragraph}>
        Head over to your dashboard to create a new n8n instance and start
        automating.
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
