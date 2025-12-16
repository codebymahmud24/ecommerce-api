import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { OrderStatus } from 'src/common/enums/orderStatus.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    this.logger.log('Email service initialized');
  }

  private getEmailTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Your Store</h1>
          </div>
          <div style="padding: 25px;">
            ${content}
          </div>
          <div style="background-color: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            © ${new Date().getFullYear()} Your Store | <a href="mailto:support@yourstore.com" style="color: #667eea; text-decoration: none;">Contact Support</a>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendOrderStatusUpdate(orderId: string, userEmail: string, status: OrderStatus) {
    try {
      const statusConfig = {
        [OrderStatus.PROCESSING]: {
          title: 'Processing',
          icon: '⏳',
          color: '#3182ce',
          message: 'Your order is being prepared',
        },
        [OrderStatus.SHIPPED]: {
          title: 'Shipped',
          icon: '🚚',
          color: '#38a169',
          message: 'Your order is on its way',
        },
        [OrderStatus.DELIVERED]: {
          title: 'Delivered',
          icon: '📦',
          color: '#48bb78',
          message: 'Your order has been delivered',
        },
        [OrderStatus.CANCELLED]: {
          title: 'Cancelled',
          icon: '❌',
          color: '#e53e3e',
          message: 'Your order has been cancelled',
        },
      };

      const config = statusConfig[status];

      const content = `
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="width: 50px; height: 50px; background-color: ${config.color}; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px;">${config.icon}</span>
          </div>
          <h2 style="color: #333; margin: 0 0 5px 0; font-size: 22px;">${config.title}</h2>
          <p style="color: #666; margin: 0; font-size: 14px;">${config.message}</p>
        </div>

        <div style="background-color: #f9f9f9; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0; color: #666; font-size: 14px;">Order Number</td>
              <td style="padding: 5px 0; text-align: right; color: #333; font-weight: bold; font-size: 14px;">#${orderId}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #666; font-size: 14px;">Status</td>
              <td style="padding: 5px 0; text-align: right;">
                <span style="background-color: ${config.color}; color: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${status}</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="https://yourstore.com/orders/${orderId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 10px 25px; border-radius: 5px; font-size: 14px; font-weight: 600;">View Order</a>
        </div>
      `;

      await this.transporter.sendMail({
        from: `"Your Store" <${this.configService.get<string>('SMTP_FROM')}>`,
        to: userEmail,
        subject: `Order ${config.title} #${orderId}`,
        html: this.getEmailTemplate(content),
      });

      this.logger.log(`Status update email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(`Failed to send status update to ${userEmail}`, error);
    }
  }
}