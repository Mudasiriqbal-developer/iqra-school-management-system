const nodemailer = require('nodemailer');

// Create a reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

/**
 * Send teacher invitation email with activation link.
 * @param {string} toEmail 
 * @param {string} teacherName 
 * @param {string} activationLink 
 */
const sendTeacherInvitationEmail = async (toEmail, teacherName, activationLink) => {
  try {
    const fromName = process.env.EMAIL_FROM_NAME || 'IHASS - Iqra Hadiqa Tul Atfal School';
    const fromEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: "You're invited to IHASS - Activate your account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333333;">Welcome to IHASS, ${teacherName}!</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            An account has been created for you on the <strong>IHASS (Iqra Hadiqa Tul Atfal School) School Management System</strong>.
          </p>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            Please activate your account and set your password by clicking the button below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationLink}" style="background-color: #4A90E2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;">
              Activate Account
            </a>
          </div>
          <p style="color: #999999; font-size: 14px; line-height: 1.5;">
            If the button doesn't work, copy and paste this link into your browser: <br/>
            <a href="${activationLink}" style="color: #4A90E2;">${activationLink}</a>
          </p>
          <p style="color: #ff3b30; font-size: 14px; font-weight: bold; margin-top: 20px;">
            Note: This activation link will expire in 48 hours.
          </p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="color: #999999; font-size: 12px; text-align: center;">
            IHASS - Iqra Hadiqa Tul Atfal School Management System
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Invitation email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    // Throw error so caller knows it failed, but caller can catch and ignore
    throw error;
  }
};

/**
 * Send activation confirmation email.
 * @param {string} toEmail 
 * @param {string} teacherName 
 */
const sendActivationConfirmationEmail = async (toEmail, teacherName) => {
  try {
    const fromName = process.env.EMAIL_FROM_NAME || 'IHASS - Iqra Hadiqa Tul Atfal School';
    const fromEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: 'Account Activated - IHASS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #4cd964;">Account Activated!</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            Hello ${teacherName},
          </p>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            Your account on the <strong>IHASS School Management System</strong> has been successfully activated. 
            You can now log in using your email and the password you set.
          </p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="color: #999999; font-size: 12px; text-align: center;">
            IHASS - Iqra Hadiqa Tul Atfal School Management System
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Activation confirmation email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending activation confirmation email:', error);
    // Fail silently or throw, caller will handle
    throw error;
  }
};

module.exports = {
  sendTeacherInvitationEmail,
  sendActivationConfirmationEmail,
};
