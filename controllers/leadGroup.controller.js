import LeadGroup from "../models/leadGroup.models.js";

export default {
    getLeadGroups: async (req, res) => {
        try {
            const leadGroups = await LeadGroup.find();
            res.status(200).json(leadGroups); 
        } catch (error) {
            console.error("Error fetching lead groups:", error);
            res.status(500).json({ message: "Error fetching lead groups" });
        }
    },

    addLeadGroup: async (req, res) => {
        try {
            let { name, leadClass } = req.body;
            if (!name) return res.status(400).json({ message: "Name is required" });

            leadClass = leadClass ? leadClass.toLowerCase() : "primary";
            const newLeadGroup = new LeadGroup({ name, leadClass });

            await newLeadGroup.save();
            res.status(201).json({ message: "Lead Group Created", data: newLeadGroup });
        } catch (error) {
            console.error("Error adding lead group:", error);
            res.status(500).json({ message: "Internal Server Error" });
        }
    },

    editLeadGroup: async (req, res) => {
        try {
            const { id } = req.params;
            let { name, leadClass } = req.body;

            leadClass = leadClass ? leadClass.toLowerCase() : undefined;

            const updatedLeadGroup = await LeadGroup.findByIdAndUpdate(
                id,
                { name, leadClass },
                { new: true, runValidators: true }
            );

            if (!updatedLeadGroup) {
                return res.status(404).json({ message: "Lead Group not found" });
            }

            res.status(200).json({ message: "Lead Group Updated", data: updatedLeadGroup });
        } catch (error) {
            console.error("Error updating lead group:", error);
            res.status(500).json({ message: "Error updating lead group" });
        }
    },

    deleteLeadGroup: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedLeadGroup = await LeadGroup.findByIdAndDelete(id);

            if (!deletedLeadGroup) {
                return res.status(404).json({ message: "Lead Group not found" });
            }

            res.status(200).json({ message: "Lead Group Deleted" });
        } catch (error) {
            console.error("Error deleting lead group:", error);
            res.status(500).json({ message: "Error deleting lead group" });
        }
    }
};
