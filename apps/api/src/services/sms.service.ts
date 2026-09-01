import { logger } from '../utils/logger.js';

export interface SmsService {
  sendOtp(phoneNumber: string, otp: string): Promise<boolean>;
}

export class MockSmsService implements SmsService {
  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    logger.info(`[MOCK SMS] OTP ${otp} sent to ${phoneNumber}`);
    return true;
  }
}

// Export a singleton - swap to MSG91 implementation later
export const smsService: SmsService = new MockSmsService();
