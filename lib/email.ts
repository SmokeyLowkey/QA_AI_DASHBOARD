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
  const fromEmail = from || process.env.EMAIL_FROM || 'noreply@example.com';
  
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
