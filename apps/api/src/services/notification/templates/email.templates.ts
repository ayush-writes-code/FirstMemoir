export const emailTemplates = {
  wrapBase: (content: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f6f6f6; margin: 0; padding: 20px; color: #222222; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e6e6e6; }
          .header { padding: 32px 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #e6e6e6; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
          .content { padding: 40px; line-height: 1.6; }
          .footer { padding: 24px 40px; text-align: center; background-color: #fdf6e8; font-size: 12px; color: #757575; border-top: 1px solid #e6e6e6; }
          .btn { display: inline-block; background-color: #E8620A; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 999px; font-weight: 600; margin-top: 16px; }
          .data-box { background-color: #f6f6f6; border-radius: 6px; padding: 16px; margin: 24px 0; font-family: monospace; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>First Memoir</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            Crafted with care in India.<br><br>
            If you have any questions, please reply directly to this email.
          </div>
        </div>
      </body>
    </html>
  `,

  orderConfirmed: (orderId: string, customerName: string) => emailTemplates.wrapBase(`
    <p>Hi ${customerName},</p>
    <p>Thank you for your order! We are thrilled to bring your memories to life.</p>
    <p>We've successfully received your payment and our manufacturing team is preparing your custom prints right now.</p>
    <div class="data-box">
      <strong>Order Reference:</strong> ${orderId}
    </div>
    <p>We will notify you the moment your order is dispatched.</p>
    <p>Best regards,<br>The First Memoir Team</p>
  `),

  orderShipped: (orderId: string, customerName: string, awbCode: string) => emailTemplates.wrapBase(`
    <p>Hi ${customerName},</p>
    <p>Great news! Your First Memoir order is on its way.</p>
    <div class="data-box">
      <strong>Order Reference:</strong> ${orderId}<br>
      <strong>Tracking Number (AWB):</strong> ${awbCode}
    </div>
    <p>You can track the live status of your delivery using the link below.</p>
    <p><a href="https://firstmemoir.in/track-order" class="btn">Track Your Order</a></p>
    <p>Best regards,<br>The First Memoir Team</p>
  `),

  orderDelivered: (orderId: string, customerName: string) => emailTemplates.wrapBase(`
    <p>Hi ${customerName},</p>
    <p>Your First Memoir order has been marked as delivered!</p>
    <div class="data-box">
      <strong>Order Reference:</strong> ${orderId}
    </div>
    <p>We hope you love your new prints. If anything isn't absolutely perfect, or if your frame was damaged in transit, please reply to this email within 48 hours with photos of the package so we can make it right.</p>
    <p>Enjoy your memories!<br>The First Memoir Team</p>
  `),
};
