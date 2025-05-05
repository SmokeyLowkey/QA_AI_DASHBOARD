import nodemailer from 'nodemailer';
import { Resend } from 'resend';

// Initialize Resend if API key is available
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Create a nodemailer transporter as fallback
const nodemailerTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
  secure: process.env.EMAIL_SERVER_PORT === '465',
});

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

/**
 * Send an email using Resend (preferred) or Nodemailer as fallback
 */
export async function sendEmail({ to, subject, text, html, from }: SendEmailParams) {
  const fromEmail = from || process.env.EMAIL_FROM || `noreply@${process.env.RESEND_DOMAIN || 'qainsight.digital'}`;
  
  try {
    // Try to use Resend if available
    if (resend) {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>'),
      });
      
      if (error) {
        throw new Error(`Resend error: ${error.message}`);
      }
      
      return { success: true, messageId: data?.id };
    }
    
    // Fall back to nodemailer
    const info = await nodemailerTransporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

interface SendInvitationEmailParams {
  email: string;
  invitedBy: string;
  teamName: string;
  companyName: string;
  invitationLink: string;
}

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail({ 
  email, 
  invitedBy, 
  teamName, 
  companyName, 
  invitationLink 
}: SendInvitationEmailParams) {
  const subject = `Invitation to join ${teamName} at ${companyName}`;
  
  const text = `
Hello,

You have been invited by ${invitedBy} to join the ${teamName} team at ${companyName}.

To accept this invitation, please click on the link below:
${invitationLink}

This invitation link will expire in 7 days.

If you have any questions, please contact the person who invited you.

Best regards,
The ${companyName} Team
  `;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f8f9fa; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .button { display: inline-block; background-color: #007bff; color: white; text-decoration: none; padding: 10px 20px; border-radius: 4px; }
    .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>You've Been Invited!</h2>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>You have been invited by <strong>${invitedBy}</strong> to join the <strong>${teamName}</strong> team at <strong>${companyName}</strong>.</p>
      <p>To accept this invitation, please click on the button below:</p>
      <p style="text-align: center;">
        <a href="${invitationLink}" class="button">Accept Invitation</a>
      </p>
      <p>This invitation link will expire in 7 days.</p>
      <p>If you have any questions, please contact the person who invited you.</p>
      <p>Best regards,<br>The ${companyName} Team</p>
    </div>
    <div class="footer">
      <p>If you received this email by mistake, please ignore it.</p>
    </div>
  </div>
</body>
</html>
  `;
  
  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
