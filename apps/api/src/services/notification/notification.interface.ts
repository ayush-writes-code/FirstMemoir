export interface INotificationProviderResult {
  success: boolean;
  providerRef?: string;
  error?: string;
}

export interface ISmsProvider {
  name: string;
  sendSms(to: string, message: string): Promise<INotificationProviderResult>;
}

export interface IEmailProvider {
  name: string;
  sendEmail(to: string, subject: string, body: string): Promise<INotificationProviderResult>;
}

export interface INotificationService {
  dispatchOrderConfirmed(orderId: string): Promise<void>;
  dispatchOrderProcessing(orderId: string): Promise<void>;
  dispatchOrderShipped(orderId: string): Promise<void>;
  dispatchOrderDelivered(orderId: string): Promise<void>;
}
