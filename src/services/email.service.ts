import nodemailer from 'nodemailer';
import path from 'path';
import { config } from '../config';
import { logger } from '../config/logger';

class EmailService {
  private transporter: nodemailer.Transporter;
  private logoPath: string;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });

    this.logoPath = path.join(__dirname, '..', 'assets', 'logo.png');
    logger.info(`SMTP transporter configured for ${config.smtp.host}:${config.smtp.port}`);
  }

  private getTemplate(otp: string, userName: string, purpose: '2fa' | 'login' | 'register' | 'reset'): string {
    const purposeConfig = {
      '2fa': {
        title: 'Two-Factor Authentication',
        headline: 'Secure Your Account',
        message: 'You\'re adding an extra layer of security to your account. Use the verification code below to enable two-factor authentication.',
        action: 'Enable 2FA',
        iconCid: 'shieldicon',
        subject: '2FA Verification',
        accentColor: '#009A44',
        iconBg: '#e8f5e9',
      },
      'login': {
        title: 'Login Verification',
        headline: 'Welcome Back!',
        message: 'We detected a sign-in attempt to your account. Use the verification code below to complete your login securely.',
        action: 'Complete Sign-In',
        iconCid: 'lockicon',
        subject: 'Login Verification',
        accentColor: '#1565C0',
        iconBg: '#e3f2fd',
      },
      'register': {
        title: 'Account Verification',
        headline: 'Welcome to AfDB!',
        message: 'Thank you for creating an account with the African Development Bank. Use the verification code below to verify your email address and activate your account.',
        action: 'Verify Email',
        iconCid: 'userplusicon',
        subject: 'Registration Verification',
        accentColor: '#009A44',
        iconBg: '#e8f5e9',
      },
      'reset': {
        title: 'Password Reset',
        headline: 'Reset Your Password',
        message: 'We received a request to reset the password for your account. Use the verification code below to set a new password. If you didn\'t make this request, please ignore this email.',
        action: 'Reset Password',
        iconCid: 'keyicon',
        subject: 'Password Reset',
        accentColor: '#E65100',
        iconBg: '#fff3e0',
      },
    };

    const cfg = purposeConfig[purpose];
    const currentYear = new Date().getFullYear();

    return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${cfg.subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }

    /* Base styles */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f0f2f5;
      color: #333333;
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-body { padding: 20px !important; }
      .otp-code-cell { font-size: 28px !important; letter-spacing: 6px !important; }
      .header-cell { padding: 24px 20px !important; }
      .footer-cell { padding: 20px !important; }
      .info-box { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f5;">
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    Your AfDB verification code: ${otp} — expires in 10 minutes.
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f2f5;">
    <tr>
      <td align="center" style="padding: 20px 10px 40px;">
        <table role="presentation" class="email-container" cellpadding="0" cellspacing="0" width="560" style="width: 560px; max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">

          <!-- Header with logo -->
          <tr>
            <td class="header-cell" align="center" style="padding: 32px 40px; background: linear-gradient(135deg, #009A44 0%, #007a36 50%, #005c28 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <img src="cid:afdblogo" alt="African Development Bank" width="140" style="display: block; width: 140px; max-width: 140px; height: auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="email-body" style="padding: 20px 40px 24px;">
              <!-- Icon badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 16px;">
                <tr>
                  <td align="center" valign="middle" style="width: 56px; height: 56px; background-color: ${cfg.iconBg}; border-radius: 50%; text-align: center; vertical-align: middle;">
                    <img src="cid:${cfg.iconCid}" alt="Icon" width="24" height="24" style="display:block; margin:auto;" />
                  </td>
                </tr>
              </table>

              <!-- Headline -->
              <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #1a1a2e; text-align: center; line-height: 1.3;">
                ${cfg.headline}
              </h2>

              <!-- Greeting & message -->
              <p style="margin: 0 0 8px; font-size: 15px; color: #333; line-height: 1.6; text-align: center;">
                Hello <strong>${userName}</strong>,
              </p>
              <p style="margin: 0 0 28px; font-size: 14px; color: #555; line-height: 1.7; text-align: center;">
                ${cfg.message}
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 24px;">
                <tr>
                  <td align="center" style="padding: 24px 16px; background-color: #f8faf8; border: 2px dashed ${cfg.accentColor}; border-radius: 12px;">
                    <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 1.5px;">Verification Code</p>
                    <p class="otp-code-cell" style="margin: 0; font-size: 34px; font-weight: 800; color: ${cfg.accentColor}; letter-spacing: 10px; font-family: 'SF Mono', 'Fira Code', 'Courier New', monospace;">
                      ${otp}
                    </p>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #999;">Expires in 10 minutes</p>
                  </td>
                </tr>
              </table>

              <!-- Action info -->
              <table role="presentation" class="info-box" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 0 20px;">
                <tr>
                  <td style="padding: 14px 18px; background-color: #f0f7ff; border-radius: 8px; border: 1px solid #c0d8f0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 20px; vertical-align: top; padding-right: 10px;">
                          <img src="cid:infoicon" alt="Info" width="18" height="18" style="display:block;" />
                        </td>
                        <td>
                          <p style="margin: 0; font-size: 12px; color: #1e40af; line-height: 1.6;">
                            <strong>What to do:</strong> Enter this code on the ${cfg.title.toLowerCase()} page to ${cfg.action.toLowerCase()}. If you didn't request this, please ignore this email or contact support.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Security notice -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 0;">
                <tr>
                  <td style="padding: 14px 18px; background-color: #fff8f0; border-radius: 8px; border: 1px solid #ffe0c0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="width: 20px; vertical-align: top; padding-right: 10px;">
                          <img src="cid:warningicon" alt="Warning" width="18" height="18" style="display:block;" />
                        </td>
                        <td>
                          <p style="margin: 0; font-size: 12px; color: #8a6d3b; line-height: 1.6;">
                            <strong>Security Reminder:</strong> Never share this code with anyone. AfDB staff will never ask for your verification code via email, phone, or chat.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: #eef0f2;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer-cell" align="center" style="padding: 24px 40px 28px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 6px; font-size: 13px; font-weight: 600; color: #333;">African Development Bank Group</p>
                    <p style="margin: 0 0 12px; font-size: 11px; color: #999; line-height: 1.5;">
                      Avenue Jean Paul II 1501, Abidjan, Côte d'Ivoire<br/>
                      www.afdb.org
                    </p>
                    <p style="margin: 0; font-size: 10px; color: #bbb; line-height: 1.5;">
                      This is an automated message from AfDB Security Services.<br/>
                      &copy; ${currentYear} African Development Bank. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendOtp(to: string, otp: string, userName?: string, purpose: '2fa' | 'login' | 'register' | 'reset' = '2fa'): Promise<boolean> {
    try {
      const displayName = userName || 'User';
      const cfg = {
        '2fa': { subject: '2FA Verification', iconFile: 'shield-check.svg', iconCid: 'shieldicon' },
        'login': { subject: 'Login Verification', iconFile: 'lock.svg', iconCid: 'lockicon' },
        'register': { subject: 'Registration Verification', iconFile: 'user-plus.svg', iconCid: 'userplusicon' },
        'reset': { subject: 'Password Reset', iconFile: 'key.svg', iconCid: 'keyicon' },
      };
      const subjectLine = `${otp} is your AfDB ${cfg[purpose].subject} Code`;

      const htmlContent = this.getTemplate(otp, displayName, purpose);
      const iconsPath = path.join(__dirname, '..', 'assets', 'icons');

      const info = await this.transporter.sendMail({
        from: `"AfDB Security" <${config.smtp.from}>`,
        to,
        subject: subjectLine,
        text: `Your AfDB ${cfg[purpose].subject} code is: ${otp}\n\nThis code will expire in 10 minutes.\nDo not share this code with anyone.\n\nAfrican Development Bank Group\nwww.afdb.org`,
        html: htmlContent,
        attachments: [
          {
            filename: 'afdb-logo.png',
            path: this.logoPath,
            cid: 'afdblogo',
          },
          {
            filename: cfg[purpose].iconFile,
            path: path.join(iconsPath, cfg[purpose].iconFile),
            cid: cfg[purpose].iconCid,
          },
          {
            filename: 'info.svg',
            path: path.join(iconsPath, 'info.svg'),
            cid: 'infoicon',
          },
          {
            filename: 'warning.svg',
            path: path.join(iconsPath, 'warning.svg'),
            cid: 'warningicon',
          },
        ],
      });

      logger.info(`${purpose} OTP email sent to ${to}, messageId: ${info.messageId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send ${purpose} OTP email to ${to}:`, error);
      return false;
    }
  }
}

export default new EmailService();
