import { ISmsProvider, INotificationProviderResult } from '../notification.interface.js';
import { logger } from '../../../utils/logger.js';

export class MockSmsProvider implements ISmsProvider {
  name = 'MOCK_SMS';

  async sendSms(to: string, message: string): Promise<INotificationProviderResult> {
    logger.info(`[MockSmsProvider] Sending SMS to ${to}: "${message}"`);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Simulate occasional failure for testing robustness (in tests we might want a predictable way to fail,
    // but for now we'll just mock success unless specifically asked)
    if (to.includes('FAIL')) {
      return { success: false, error: 'Simulated SMS provider failure' };
    }

    return {
      success: true,
      providerRef: `mock_sms_${Date.now()}`
    };
  }
}

export const mockSmsProvider = new MockSmsProvider();
