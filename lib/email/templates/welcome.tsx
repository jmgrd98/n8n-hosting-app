import { Heading, Link, Text } from '@react-email/components';
import * as React from 'react';
import { BaseLayout, buttonStyle } from './base-layout';

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <BaseLayout preview="Welcome to n8n Cloud - let's get started!">
      <Heading as="h2" style={heading}>
        Welcome to n8n Cloud!
      </Heading>
      <Text style={paragraph}>
        Hi {name || 'there'},
      </Text>
      <Text style={paragraph}>
        Your account has been created and you&apos;re all set to start building
        powerful automations with n8n.
      </Text>
      <Text style={paragraph}>
        Here&apos;s what you can do next:
      </Text>
      <Text style={listItem}>1. Create your first n8n instance</Text>
      <Text style={listItem}>2. Choose a plan that fits your needs</Text>
      <Text style={listItem}>3. Start building workflows</Text>
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

const listItem: React.CSSProperties = {
  color: '#475569',
  fontSize: '14px',
  lineHeight: '1.6',
  paddingLeft: '8px',
  margin: '4px 0',
};
