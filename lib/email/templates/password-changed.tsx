import { Heading, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout } from './base-layout';

interface PasswordChangedEmailProps {
  name: string;
}

export function PasswordChangedEmail({ name }: PasswordChangedEmailProps) {
  return (
    <BaseLayout preview="Your n8n Cloud password has been changed">
      <Heading as="h2" style={heading}>
        Password changed
      </Heading>
      <Text style={paragraph}>
        Hi {name || 'there'},
      </Text>
      <Text style={paragraph}>
        Your n8n Cloud password was successfully changed. If you made this
        change, no further action is needed.
      </Text>
      <Text style={warningText}>
        If you did not change your password, please contact support immediately
        to secure your account.
      </Text>
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

const warningText: React.CSSProperties = {
  color: '#dc2626',
  fontSize: '14px',
  lineHeight: '1.6',
  fontWeight: 600,
};
