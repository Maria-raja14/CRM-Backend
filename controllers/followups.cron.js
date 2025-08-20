


// import cron from "node-cron";
// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import { notifyUser } from "../realtime/socket.js";
// import { sendEmail } from "../services/email.js";




// export function startFollowUpCron() {
//   cron.schedule("* * * * *", async () => { // run every minute
//     console.log("🕒 Cron running...");
//     const now = dayjs();
//     const in1 = now.add(1, "minute");

//     try {
//       const dueLeads = await Lead.find({
//         followUpDate: { $gte: now.toDate(), $lte: in1.toDate() },
//         $or: [
//           { lastReminderAt: { $exists: false } },
//           { lastReminderAt: { $lt: now.subtract(1, "minute").toDate() } },
//         ],
//       }).populate("assignTo", "firstName lastName email");

//       for (const lead of dueLeads) {
//         const assignUserId = lead.assignTo?._id?.toString();

//         // 📧 send email to customer (lead.email)
//         if (lead.email) {
//           await sendEmail({
//             to: lead.email,
//             subject: `Follow-up Reminder: ${lead.leadName}`,
//             text: `Hi ${lead.leadName},\n\nWe are following up as your lead status is ${lead.status}. Our team will connect with you soon!`
//           });
//           console.log("📧 Email sent to customer:", lead.email);
//         }

//         // 📢 notify employee also
//         if (assignUserId) {
//           notifyUser(assignUserId, "followup:due", {
//             leadId: lead._id,
//             leadName: lead.leadName || "Unnamed Lead",
//             when: lead.followUpDate ? lead.followUpDate.toISOString() : "No Date",
//             message: `⏰ Follow-up is due for ${lead.leadName || "Unnamed Lead"}!`,
//           });
//         }

//         // update reminder timestamp
//         lead.lastReminderAt = new Date();
//         await lead.save();
//       }
//     } catch (err) {
//       console.error("❌ followUp cron error:", err.message);
//     }
//   });
// }



  import cron from "node-cron";
  import dayjs from "dayjs";
  import Lead from "../models/leads.model.js";
  import sendEmail from "../services/email.js";
  import { notifyUser } from "../realtime/socket.js";

  // Helper to avoid duplicate reminders for the same minute run
  const SHOULD_REMIND_EVERY_MINUTES = 60; // e.g., 60 minutes gap between reminders

  export function startFollowUpCron() {
    // Runs every minute (testing). For prod, prefer: "0 9 * * *" (9 AM daily)
    cron.schedule("* * * * *", async () => {
      const now = dayjs();
      console.log("🕒 Follow-up Cron:", now.format("YYYY-MM-DD HH:mm:ss"));

      try {
        // Due or overdue followups
        const dueLeads = await Lead.find({
          followUpDate: { $lte: now.toDate() },
          status: { $in: ["Hot", "Warm", "Cold"] }, // only those with reminders
          $or: [
            { lastReminderAt: { $exists: false } },
            {
              lastReminderAt: {
                $lt: now.subtract(SHOULD_REMIND_EVERY_MINUTES, "minute").toDate(),
              },
            },
          ],
        }).populate("assignTo", "firstName lastName email");

 

    for (const lead of dueLeads) {
  const assignUserId = lead.assignTo?._id?.toString();

  // Email to customer
  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: `Follow-up Reminder: ${lead.leadName}`,
      text: `Hi ${lead.leadName || ""},\n\nThis is a friendly reminder from our team. Your lead is currently ${lead.status}. We'll reach out shortly.`,
    });
    console.log("📧 Email sent to:", lead.email);
  }

  // ✅ Real-time notification to assigned user
  if (assignUserId) {
    notifyUser(assignUserId, "followup_reminder", {
      title: "Follow-up Reminder",
      message: `⏰ You have a follow-up due for Lead: ${lead.leadName || "Unnamed Lead"}`,
      leadId: lead._id.toString(),
      followUpAt: lead.followUpDate?.toISOString() || new Date().toISOString(),
    });
  }

  // Mark this reminder time
  lead.lastReminderAt = new Date();
  await lead.save();
}

      } catch (err) {
        console.error("❌ followUp cron error:", err.message);
      }
    });
  }
