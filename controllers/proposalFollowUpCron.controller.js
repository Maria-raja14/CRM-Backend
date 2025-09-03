// followup.cron.js
import cron from "node-cron";
import Proposal from "../models/proposal.model.js";
// import nodemailer from "nodemailer";
import moment from "moment";
import { sendNotification } from "../services/notificationService.js";

const REMIND_GAP_MINUTES = 120;

export function startProposalFollowUpCron() {
  cron.schedule("* * * * *", async () => {
    const nowUtc = moment.utc();
    console.log("📧 Proposal Follow-up Cron:", nowUtc.format("YYYY-MM-DD HH:mm:ss"));

    try {
      const dueProposals = await Proposal.find({
        followUpDate: { $lte: nowUtc.toDate() },
        $or: [
          { lastReminderAt: { $exists: false } },
          { lastReminderAt: null },
          {
            lastReminderAt: {
              $lt: nowUtc.clone().subtract(REMIND_GAP_MINUTES, "minute").toDate(),
            },
          },
        ],
      });

      if (!dueProposals.length) return;

    //   const transporter = nodemailer.createTransport({
    //     service: "gmail",
    //     host: "smtp.gmail.com",
    //     port: 587,
    //     secure: false,
    //     auth: {
    //       user: process.env.EMAIL_USER,
    //       pass: process.env.EMAIL_PASS,
    //     },
    //   });

      for (const proposal of dueProposals) {
        // 📧 Send email reminder
        // await transporter.sendMail({
        //   from: `"Your Company" <${process.env.EMAIL_USER}>`,
        //   to: proposal.email,
        //   cc: proposal.cc || "",
        //   subject: `Follow-up Reminder: ${proposal.title}`,
        //   html: `
        //     <p>Dear Client,</p>
        //     <p>This is a follow-up regarding our proposal <b>${proposal.title}</b>.</p>
        //     <p>Best regards,<br>Your Company</p>
        //   `,
        // });

        // 🔔 Send in-app notification (to admins or proposal owner)
        await sendNotification(
          proposal.deal, // or proposal.userId (depends on your schema)
          `Follow-up due for proposal: ${proposal.title}`,
          "followup",
          { proposalId: proposal._id }
        );

        // Update last reminder timestamp
        proposal.lastReminderAt = new Date();
        await proposal.save();
      }
    } catch (err) {
      console.error("❌ Proposal follow-up cron error:", err);
    }
  });
}
