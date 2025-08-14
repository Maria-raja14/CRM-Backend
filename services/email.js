import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER, // set in .env
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  if (!to) return;
  await transporter.sendMail({
    from: process.env.MAIL_FROM || "no-reply@crm.local",
    to,
    subject,
    text,
    html: html || `<p>${text}</p>`,
  });
}
