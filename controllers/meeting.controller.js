import Meeting from '../models/meeting.models.js';
import sendMail from '../utils/sendMail.js';

const addMeeting = async (req, res) => {
  try {
    const { salesperson, clientName, clientEmail, purpose, startedAt, durationInSeconds } = req.body;

    const newMeeting = new Meeting({
      salesperson,
      clientName,
      clientEmail,
      purpose,
      startedAt,
      durationInSeconds,
    });

    // Save the meeting to the database
    await newMeeting.save();

    // Generate a unique meeting link (for example, using Jitsi)
    const meetingLink = `https://meet.jit.si/CRM-Sales-Meeting-${newMeeting._id}`;

    // Send email immediately after the meeting is created
    if (clientEmail) {
      const meetingDate = new Date(startedAt).toLocaleString();
      const duration = `${durationInSeconds / 60} minutes`;

      await sendMail({
        to: clientEmail,
        subject: `CRM Meeting Invitation`,
        text: `Dear ${clientName},\n\nYou are invited to a meeting for "${purpose}".\n\nDate & Time: ${meetingDate}\nDuration: ${duration}\nJoin the Meeting: ${meetingLink}\n\nThank you.`,
        html: `
          <h3>CRM Meeting Invitation</h3>
          <p><strong>Dear ${clientName},</strong></p>
          <p>You are invited to a meeting for <b>${purpose}</b>.</p>
          <p><b>Date & Time:</b> ${meetingDate}</p>
          <p><b>Duration:</b> ${duration}</p>
          <p><b>Join the Meeting:</b> <a href="${meetingLink}" target="_blank">Click here to join the meeting</a></p>
          <p>Thank you!</p>
        `,
      });
    }

    res.status(201).json({
      message: "Meeting saved and email sent",
      data: newMeeting,
      meetingLink, // Include meeting link in the response
    });
  } catch (error) {
    console.error("Error saving meeting:", error);
    res.status(500).json({ error: "Failed to save meeting" });
  }
};

export default {
  addMeeting,
};





