import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface BaseLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>n8n Cloud</Heading>
          </Section>
          <Section style={content}>{children}</Section>
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You&apos;re receiving this because you have an account on n8n Cloud.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export const buttonStyle: React.CSSProperties = {
  display: 'inline-block',
  marginTop: '20px',
  padding: '12px 28px',
  backgroundColor: '#7c3aed',
  color: '#ffffff',
  textDecoration: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  fontSize: '14px',
};

const body: React.CSSProperties = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  backgroundColor: '#f8fafc',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  maxWidth: '560px',
  margin: '40px auto',
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,.1)',
};

const header: React.CSSProperties = {
  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
  padding: '32px',
  textAlign: 'center' as const,
};

const headerTitle: React.CSSProperties = {
  color: '#ffffff',
  margin: 0,
  fontSize: '22px',
  fontWeight: 700,
};

const content: React.CSSProperties = {
  padding: '32px',
  color: '#1e293b',
  lineHeight: '1.6',
};

const hr: React.CSSProperties = {
  borderColor: '#e2e8f0',
  margin: 0,
};

const footer: React.CSSProperties = {
  padding: '20px 32px',
  textAlign: 'center' as const,
};

const footerText: React.CSSProperties = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: 0,
};
