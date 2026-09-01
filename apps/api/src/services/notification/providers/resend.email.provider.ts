import { Resend } from 'resend';
import { IEmailProvider, INotificationProviderResult } from '../notification.interface.js';

export class ResendEmailProvider implements IEmailProvider {
  name = 'RESEND_EMAIL';
  private resend: Resend;
  private fromEmail: string;

  constructor(apiKey: string, fromEmail: string) {
    this.resend = new Resend(apiKey);
    this.fromEmail = fromEmail;
  }

  async sendEmail(to: string, subject: string, body: string): Promise<INotificationProviderResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to,
        subject,
        html: body,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, providerRef: data?.id };
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown Resend error' };
    }
  }
}
