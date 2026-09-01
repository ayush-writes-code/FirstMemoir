import { IEmailProvider, INotificationProviderResult } from '../notification.interface.js';
import { logger } from '../../../utils/logger.js';

export class MockEmailProvider implements IEmailProvider {
  name = 'MOCK_EMAIL';

  async sendEmail(to: string, subject: string, body: string): Promise<INotificationProviderResult> {
    logger.info(`[MockEmailProvider] Sending Email to ${to} | Subject: ${subject}`);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate occasional failure for testing robustness
    if (to.includes('FAIL')) {
      return { success: false, error: 'Simulated Email provider failure' };
    }

    return {
      success: true,
      providerRef: `mock_email_${Date.now()}`
    };
  }
}

export const mockEmailProvider = new MockEmailProvider();
