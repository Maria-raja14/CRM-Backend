// controllers/stageController.js

import Proposal from "../models/proposal.js";
import Stage from "../models/stageModel.js";

export default {
  // 🔁 Group proposals by their stage
  getAllStages: async (req, res) => {
    try {
      // Get all stages
      const stages = await Stage.find();

      // Get all proposals with their stage info
      const proposals = await Proposal.find().populate("stage");

      // Group proposals by stage ID
      const grouped = stages.map(stage => ({
        _id: stage._id,
        name: stage.name,
        proposals: proposals.filter(p => p.stage?._id?.toString() === stage._id.toString()),
      }));

      res.json(grouped);
    } catch (error) {
      console.error("❌ Fetch Error:", error);
      res.status(500).json({ error: "Failed to group proposals by stages" });
    }
  },

  // 🔁 Move proposal between stages
  moveProposal: async (req, res) => {
    const { proposalId, toStageId } = req.body;

    try {
      const proposal = await Proposal.findByIdAndUpdate(
        proposalId,
        { stage: toStageId },
        { new: true }
      );

      res.json({ message: "Proposal moved", proposal });
    } catch (error) {
      res.status(500).json({ error: "Failed to move proposal" });
    }
  }
};
