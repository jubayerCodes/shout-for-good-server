"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStripeReceiptEmailHTML = generateStripeReceiptEmailHTML;
function formatCurrency(cents, currency) {
    const dollars = cents / 100;
    const symbols = {
        AUD: "A$",
        USD: "$",
        GBP: "£",
        EUR: "€",
    };
    const symbol = symbols[currency.toUpperCase()] || `${currency.toUpperCase()} `;
    return `${symbol}${dollars.toFixed(2)}`;
}
function generateStripeReceiptEmailHTML(data) {
    const amount = formatCurrency(data.amount, data.currency);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Donation Receipt</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  
  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%); padding: 40px 30px; text-align: center;">
              <div style="width: 56px; height: 56px; background-color: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 16px; line-height: 56px; font-size: 24px;">
                ✓
              </div>
              <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #ffffff;">Thank You for Your Generosity!</h1>
              <p style="margin: 0; font-size: 15px; color: #ccfbf1;">Your donation of <strong>${amount}</strong> has been received.</p>
            </td>
          </tr>

          <!-- Receipt Link -->
          <tr>
            <td style="padding: 32px 30px;">
              <p style="margin: 0 0 20px; font-size: 15px; color: #374151; line-height: 1.6;">
                Your payment has been processed successfully. You can view and download your official receipt using the button below.
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 24px;">
                    <a href="${data.receiptUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0d9488, #0f766e); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 36px; border-radius: 8px; letter-spacing: 0.3px;">
                      View Receipt
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; font-size: 12px; color: #0d9488; word-break: break-all;">
                <a href="${data.receiptUrl}" target="_blank" style="color: #0d9488; text-decoration: underline;">${data.receiptUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 30px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 30px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #374151;">Princes Court Together</p>
              <p style="margin: 0 0 16px; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                Thank you for supporting our mission.<br />
                Your generosity makes a real difference.
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                This is an automated email. Please keep your receipt for your records.<br />
                If you have any questions, please contact us.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
