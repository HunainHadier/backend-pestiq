import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// HTML template for OTP email
const getOtpTemplate = (otp, name, purpose = "verification") => {
  const purposeText = purpose === "password_reset" ? "password reset" : "account verification";
  
  return `
    <div style="font-family: Arial, sans-serif; background:#f8f9fa; padding: 20px; border-radius: 8px;">
      <h2 style="color:#667eea;">Hi ${name || "User"},</h2>
      <p style="color:#333;">Your ${purposeText} code is:</p>
      <h1 style="letter-spacing:4px; background:#fff; display:inline-block; padding:10px 20px; border-radius:6px; border:1px solid #ccc;">
        ${otp}
      </h1>
      <p style="margin-top:20px; color:#666;">This OTP will expire in <strong>10 minutes</strong>.</p>
      <p style="color:#999; font-size:12px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
};

export async function sendOtpEmail(toEmail, otp, name, purpose = "verification") {
  const subject = purpose === "password_reset" 
    ? " Your Password Reset Code" 
    : " Your Pestiq Verification Code";

  const mailOptions = {
    from: `"Pestiq App" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: subject,
    html: getOtpTemplate(otp, name, purpose),
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` OTP sent to: ${toEmail}`);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("❌ OTP email failed:", error.message);
    return { success: false, message: error.message };
  }
}

// For backward compatibility
export async function sendResetEmail(toEmail, resetLink) {
  const mailOptions = {
    from: `"Pestiq App" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: " Reset Your Password",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2 style="color:#667eea;">Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background:#667eea; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">
          Reset Password
        </a>
        <p style="margin-top:20px; color:#666;">This link will expire in 1 hour.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(` Reset email sent to: ${toEmail}`);
    return { success: true, message: "Reset email sent successfully" };
  } catch (error) {
    console.error("❌ Reset email failed:", error.message);
    return { success: false, message: error.message };
  }
}