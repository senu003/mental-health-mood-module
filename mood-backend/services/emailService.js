import nodemailer from "nodemailer";

let cachedTransporter = null;

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS must be configured to send email.");
  }

  return {
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user,
      pass,
    },
  };
};

const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(getSmtpConfig());
  }

  return cachedTransporter;
};

export const sendAppointmentReminderEmail = async ({ to, reminder }) => {
  if (!to) {
    throw new Error("Recipient email is required.");
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  if (!from) {
    throw new Error("SMTP_FROM or SMTP_USER must be configured to send email.");
  }

  const subject = `Appointment reminder: ${reminder.title}`;
  const text = `Your appointment reminder "${reminder.title}" is scheduled for ${reminder.time}.`;

  return getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2 style="margin: 0 0 12px;">Appointment reminder</h2>
        <p style="margin: 0 0 8px;">Your appointment reminder <strong>${reminder.title}</strong> is scheduled for <strong>${reminder.time}</strong>.</p>
      </div>
    `,
  });
};