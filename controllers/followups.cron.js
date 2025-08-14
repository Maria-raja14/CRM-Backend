// import cron from "node-cron";
// import dayjs from "dayjs";
// import Lead from "../models/leads.model.js";
// import { notifyUser } from "../socket.js";

// export function startFollowUpCron() {
//   cron.schedule("*/5 * * * *", async () => {
//     const now = dayjs();
//     const in15 = now.add(15, "minute");

//     const dueLeads = await Lead.find({
//       followUpDate: { $gte: now.toDate(), $lte: in15.toDate() },
//       $or: [
//         { lastReminderAt: { $exists: false } },
//         { lastReminderAt: { $lt: now.subtract(30, "minute").toDate() } },
//       ],
//     }).populate("assignTo", "firstName lastName email");

//     for (const lead of dueLeads) {
//       const userId = lead.assignTo?._id?.toString();
//       if (userId)
//         notifyUser(userId, "followup:due", {
//           leadId: lead._id,
//           leadName: lead.leadName,
//           when: lead.followUpDate,
//         });

//       lead.lastReminderAt = new Date();
//       await lead.save();
//     }
//   });
// }

import cron from "node-cron";
import dayjs from "dayjs";
import Lead from "../models/leads.model.js";
import { notifyUser } from "../realtime/socket.js";
import { sendEmail } from "../services/email.js";

export function startFollowUpCron() {
  // run every 1 minute for testing
  cron.schedule("* * * * *", async () => {
    console.log("🕒 Cron running..."); // to check in console

    const now = dayjs();
    const in1 = now.add(1, "minute"); // check leads in next 1 minute

    try {
      const dueLeads = await Lead.find({
        followUpDate: { $gte: now.toDate(), $lte: in1.toDate() },
        $or: [
          { lastReminderAt: { $exists: false } },
          { lastReminderAt: { $lt: now.subtract(1, "minute").toDate() } }, // avoid spam within 1 min
        ],
      }).populate("assignTo", "firstName lastName email");

      // for (const lead of dueLeads) {
      //   const assignUserId = lead.assignTo?._id?.toString();

      //   // popup (socket)
      //   if (assignUserId) {
      //     console.log("Payload being sent:", {
      //       leadId: lead._id,
      //       leadName: lead.leadName,
      //       when: lead.followUpDate,
      //     });
      //     notifyUser(assignUserId, "followup:due", {
      //       leadId: lead._id,
      //       leadName: lead.leadName,
      //       when: lead.followUpDate,
      //     });
      //   }

      //   // email (optional)
      //   if (lead.assignTo?.email) {
      //     await sendEmail({
      //       to: lead.assignTo.email,
      //       subject: `⏰ Follow-up due: ${lead.leadName}`,
      //       text: `You have a follow-up scheduled at ${dayjs(
      //         lead.followUpDate
      //       ).format("MMM D, h:mm A")}`,
      //     });
      //   }

      //   // mark reminded
      //   lead.lastReminderAt = new Date();
      //   await lead.save();
      // }

      for (const lead of dueLeads) {
  const assignUserId = lead.assignTo?._id?.toString();

  if (assignUserId) {
    notifyUser(assignUserId, "followup:due", {
      leadId: lead._id,
      leadName: lead.leadName,   // real lead name
     when: lead.followUpDate.toISOString(), // <-- important
      message: `Follow-up is due for ${lead.leadName}!`,
    });
  }
}

    } catch (err) {
      console.error("followUp cron error", err.message);
    }
  });
}
