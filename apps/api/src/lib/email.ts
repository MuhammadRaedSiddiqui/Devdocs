// apps/api/src/lib/email.ts
import { Resend } from 'resend';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'DevDocs AI <noreply@devdocs.ai>';

/**
 * Send a welcome email when a user signs up
 */
export async function sendWelcomeEmail(email: string, name: string) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ email }, 'Resend API key not configured, skipping welcome email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: 'Welcome to DevDocs AI',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Thanks for signing up for DevDocs AI.</p>
        <p>We're excited to help you create comprehensive technical documentation for your projects.</p>
        <p>Get started by creating your first project and starting the AI-powered interview process.</p>
        <p>Best regards,<br>The DevDocs AI Team</p>
      `,
    });

    logger.info({ email }, 'Welcome email sent successfully');
  } catch (err) {
    logger.error({ err, email }, 'Failed to send welcome email');
  }
}

/**
 * Send an email when project documentation is complete
 */
export async function sendProjectCompleteEmail(
  email: string,
  projectName: string,
  projectId: string
) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ email, projectId }, 'Resend API key not configured, skipping completion email');
    return;
  }

  const projectUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/project/${projectId}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your documentation for ${projectName} is ready`,
      html: `
        <h1>Documentation Complete!</h1>
        <p>Your documentation for <strong>${projectName}</strong> is ready.</p>
        <p>You can now view, edit, and export your documentation.</p>
        <p><a href="${projectUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Documentation</a></p>
        <p>Best regards,<br>The DevDocs AI Team</p>
      `,
    });

    logger.info({ email, projectId }, 'Project completion email sent successfully');
  } catch (err) {
    logger.error({ err, email, projectId }, 'Failed to send project completion email');
  }
}

/**
 * Send a notification when API key is added or updated
 */
export async function sendApiKeyUpdateEmail(
  email: string,
  provider: string
) {
  if (!process.env.RESEND_API_KEY) {
    logger.warn({ email, provider }, 'Resend API key not configured, skipping API key update email');
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `${provider} API Key Updated`,
      html: `
        <h1>API Key Updated</h1>
        <p>Your ${provider} API key has been updated successfully.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        <p>Best regards,<br>The DevDocs AI Team</p>
      `,
    });

    logger.info({ email, provider }, 'API key update email sent successfully');
  } catch (err) {
    logger.error({ err, email, provider }, 'Failed to send API key update email');
  }
}
