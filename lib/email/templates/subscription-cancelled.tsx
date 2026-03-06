import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface SubscriptionCancelledEmailProps {
  planName: string;
  pricingUrl: string;
}

export function SubscriptionCancelledEmail({
  planName,
  pricingUrl,
}: SubscriptionCancelledEmailProps) {
  return (
    <BaseLayout preview="Your n8n Cloud subscription has been cancelled">
      <Heading as="h2" style={heading}>
        Subscription cancelled
      </Heading>
      <Text style={paragraph}>
        Your <strong>{planName}</strong> subscription has been cancelled. Any
        running instances have been stopped.
      </Text>
      <Text style={paragraph}>
        You can still access your dashboard with free tier limits. If you&apos;d
        like to reactivate, you can subscribe to a new plan at any time.
      </Text>
      <Link href={pricingUrl} style={buttonStyle}>
        View Plans
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
