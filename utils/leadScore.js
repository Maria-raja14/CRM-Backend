import dayjs from "dayjs";

export const computeLeadScore = (lead) => {
  let score = 0;

  // 1️⃣ Base score by status (40% weight)
  const statusWeights = {
    Hot: 80,
    Warm: 60,
    Cold: 30,
    Junk: 5,
    Converted: 100,
  };
  score += statusWeights[lead.status] || 0;

  // 2️⃣ Source impact (20% weight)
  const highIntentSources = ["Website", "Referral", "Inbound"];
  const mediumIntentSources = ["Email", "Campaign", "Social Media"];
  if (highIntentSources.includes(lead.source)) score += 15;
  else if (mediumIntentSources.includes(lead.source)) score += 8;

  // 3️⃣ Recency of last follow-up (15% weight)
  if (lead.followUpDate) {
    const daysDiff = dayjs().diff(dayjs(lead.followUpDate), "day");
    if (daysDiff <= 3) score += 10; // very recent
    else if (daysDiff <= 7) score += 5;
    else if (daysDiff > 14) score -= 5; // overdue follow-up
  }

  // 4️⃣ Contact completeness (15% weight)
  if (lead.companyName) score += 5;
  if (lead.industry) score += 3;
  if (lead.phoneNumber) score += 2;
  if (lead.email) score += 2;

  // 5️⃣ Recent activity (10% weight)
  if (lead.lastContacted) {
    const contactDiff = dayjs().diff(dayjs(lead.lastContacted), "day");
    if (contactDiff <= 3) score += 10;
    else if (contactDiff <= 7) score += 5;
  }

  // 6️⃣ Contact frequency bonus
  if (lead.contactCount > 5) score += 5;
  else if (lead.contactCount > 2) score += 2;

  // Cap between 0–100
  return Math.max(0, Math.min(100, score));
};

// Batch update scores for all leads
export const updateAllLeadScores = async (LeadModel) => {
  try {
    const leads = await LeadModel.find({});
    let updatedCount = 0;

    for (const lead of leads) {
      const newScore = computeLeadScore(lead.toObject ? lead.toObject() : lead);
      
      if (lead.leadScore !== newScore) {
        lead.leadScore = newScore;
        lead.lastScoreUpdate = new Date();
        await lead.save();
        updatedCount++;
      }
    }

    return updatedCount;
  } catch (error) {
    console.error("Error updating lead scores:", error);
    throw error;
  }
};