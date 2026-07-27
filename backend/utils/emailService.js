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

const sendInvitationEmail = async (toEmail, userName, roleName, activationLink) => {
  try {
    const fromName = process.env.EMAIL_FROM_NAME || 'IHASS - Iqra Hadiqa Tul Atfal School';
    const fromEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: "You're invited to IHASS - Activate your account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333333;">Welcome to IHASS, ${userName}!</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            An account has been created for you as a <strong>${roleName}</strong> on the <strong>IHASS (Iqra Hadiqa Tul Atfal School) School Management System</strong>.
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
    throw error;
  }
};

const sendResetPasswordEmail = async (toEmail, userName, resetLink) => {
  try {
    const fromName = process.env.EMAIL_FROM_NAME || 'IHASS - Iqra Hadiqa Tul Atfal School';
    const fromEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: 'Reset Password - IHASS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333333;">Reset your IHASS password</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            Hello ${userName},
          </p>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            You requested to reset your password for the <strong>IHASS School Management System</strong>.
            Click the button below to set a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4A90E2; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #999999; font-size: 14px; line-height: 1.5;">
            If you did not request this reset, please ignore this email. Your password will remain unchanged.
          </p>
          <p style="color: #ff3b30; font-size: 14px; font-weight: bold; margin-top: 20px;">
            Note: This reset link will expire in 1 hour.
          </p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="color: #999999; font-size: 12px; text-align: center;">
            IHASS - Iqra Hadiqa Tul Atfal School Management System
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Reset password email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};

const sendSupportTicketNotificationEmail = async (adminEmails, ticket, user) => {
  try {
    const fromName = process.env.EMAIL_FROM_NAME || 'IHASS - Iqra Hadiqa Tul Atfal School';
    const fromEmail = process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: adminEmails.join(','),
      subject: `New Support Ticket: [${ticket.category}] - ${ticket.subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #00215E;">New Support Ticket Submitted</h2>
          <p style="color: #555555; font-size: 16px; line-height: 1.5;">
            A new support ticket has been created on the <strong>IHASS School Management System</strong>.
          </p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; width: 30%;">Ticket ID:</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${ticket._id}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Submitted By:</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${user.name} (${user.email})</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">User Role:</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0; text-transform: capitalize;">${user.role}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Category:</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;">${ticket.category}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold;">Subject:</td>
              <td style="padding: 10px; border: 1px solid #e0e0e0;"><strong>${ticket.subject}</strong></td>
            </tr>
          </table>
          <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #00215E; margin: 20px 0; border-radius: 4px;">
            <h4 style="margin-top: 0; color: #333;">Message:</h4>
            <p style="color: #555; white-space: pre-wrap; margin-bottom: 0;">${ticket.message}</p>
          </div>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="color: #999999; font-size: 12px; text-align: center;">
            IHASS - Iqra Hadiqa Tul Atfal School Management System
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Support ticket email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending support ticket email:', error);
    throw error;
  }
};

module.exports = {
  sendTeacherInvitationEmail,
  sendActivationConfirmationEmail,
  sendInvitationEmail,
  sendResetPasswordEmail,
  sendSupportTicketNotificationEmail,
};
