import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface PaymentFailedEmailProps {
  planName: string;
  retryUrl: string;
}

export function PaymentFailedEmail({
  planName,
  retryUrl,
}: PaymentFailedEmailProps) {
  return (
    <BaseLayout preview="Action required: Payment failed for your n8n subscription">
      <Heading as="h2" style={heading}>
        Payment failed
      </Heading>
      <Text style={paragraph}>
        We were unable to process your payment for the{' '}
        <strong>{planName}</strong> plan.
      </Text>
      <Text style={paragraph}>
        To avoid interruption to your service, please update your payment
        details as soon as possible.
      </Text>
      <Link href={retryUrl} style={buttonStyle}>
        Update Payment Method
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
