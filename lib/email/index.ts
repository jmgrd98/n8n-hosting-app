import { Resend } from 'resend';
import { render } from '@react-email/components';
import { WelcomeEmail } from './templates/welcome';
import { PasswordChangedEmail } from './templates/password-changed';
import { InstanceReadyEmail } from './templates/instance-ready';
import { InstanceFailedEmail } from './templates/instance-failed';
import { InstanceDeletedEmail } from './templates/instance-deleted';
import { InstanceDownEmail } from './templates/instance-down';
import { PaymentFailedEmail } from './templates/payment-failed';
import { SubscriptionCreatedEmail } from './templates/subscription-created';
import { SubscriptionCancelledEmail } from './templates/subscription-cancelled';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? 'n8n Cloud <no-reply@yourdomain.com>';

export const email = {
  // Auth
  async welcome(to: string, name: string) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
    const html = await render(WelcomeEmail({ name, dashboardUrl }));
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Welcome to n8n Cloud!',
      html,
    });
  },

  async passwordChanged(to: string, name: string) {
    const html = await render(PasswordChangedEmail({ name }));
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Your n8n Cloud password has been changed',
      html,
    });
  },

  // Instance lifecycle
  async instanceReady(to: string, instanceName: string, instanceUrl: string) {
    const html = await render(
      InstanceReadyEmail({ instanceName, instanceUrl })
    );
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your n8n instance "${instanceName}" is ready`,
      html,
    });
  },

  async instanceFailed(to: string, instanceName: string) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
    const html = await render(
      InstanceFailedEmail({ instanceName, dashboardUrl })
    );
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Provisioning failed for your n8n instance "${instanceName}"`,
      html,
    });
  },

  async instanceDeleted(to: string, instanceName: string) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
    const html = await render(
      InstanceDeletedEmail({ instanceName, dashboardUrl })
    );
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your n8n instance "${instanceName}" has been deleted`,
      html,
    });
  },

  async instanceDown(to: string, instanceName: string, dashboardUrl: string) {
    const html = await render(
      InstanceDownEmail({ instanceName, dashboardUrl })
    );
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Alert: Your n8n instance "${instanceName}" is unreachable`,
      html,
    });
  },

  // Billing
  async paymentFailed(to: string, planName: string, retryUrl: string) {
    const html = await render(PaymentFailedEmail({ planName, retryUrl }));
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Action required: Payment failed for your n8n subscription',
      html,
    });
  },

  async subscriptionCreated(
    to: string,
    planName: string,
    instanceLimit: number
  ) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL}/dashboard`;
    const html = await render(
      SubscriptionCreatedEmail({ planName, instanceLimit, dashboardUrl })
    );
    await resend.emails.send({
      from: FROM,
      to,
      subject: `Your ${planName} subscription is now active`,
      html,
    });
  },

  async subscriptionCancelled(to: string, planName: string) {
    const pricingUrl = `${process.env.NEXTAUTH_URL}/pricing`;
    const html = await render(
      SubscriptionCancelledEmail({ planName, pricingUrl })
    );
    await resend.emails.send({
      from: FROM,
      to,
      subject: 'Your n8n Cloud subscription has been cancelled',
      html,
    });
  },
};
