import AllDeals from "../models/alldeals.models.js";

export default {
    
    getDeals: async (req, res) => {
        try {
            const deals = await AllDeals.find();
            res.status(200).json(deals);
        } catch (error) {
            console.error("Error fetching deals:", error);
            res.status(500).json({ message: "Error fetching deals" });
        }
    },

 
    getDealById: async (req, res) => {
        try {
            const { id } = req.params;
            const deal = await AllDeals.findById(id);

            if (!deal) {
                return res.status(404).json({ message: "Deal not found" });
            }

            res.status(200).json(deal);
        } catch (error) {
            console.error("Error fetching deal:", error);
            res.status(500).json({ message: "Error fetching deal" });
        }
    },

    
    addDeal: async (req, res) => {
        try {
            const { title, description, leadType, dealsValue, stage, expectingClosingDate, owner, personId, organizationId } = req.body;
    
            //  Validate required fields
            if (!title || !description || !leadType || !dealsValue || !stage || !expectingClosingDate || !owner) {
                return res.status(400).json({ message: "All required fields must be provided." });
            }
    
            //  Ensure valid leadType
            if (leadType === "person" && !personId) {
                return res.status(400).json({ message: "Person selection is required for lead type 'person'." });
            }
            if (leadType === "organization" && !organizationId) {
                return res.status(400).json({ message: "Organization selection is required for lead type 'organization'." });
            }
            if (personId && organizationId) {
                return res.status(400).json({ message: "Only one of Person or Organization can be selected." });
            }
    
            //  Validate stage value
            req.body.stage = req.body.stage.trim();
            const validStages = ["Visit Scheduled", "Visit Completed", "Customer No Show"];
            if (!validStages.includes(req.body.stage)) {
                return res.status(400).json({ message: "Invalid stage value." });
            }
    
            //  Create new deal
            const newDeal = new AllDeals({
                title,
                description,
                leadType,
                personId: leadType === "person" ? personId : null,
                organizationId: leadType === "organization" ? organizationId : null,
                dealsValue,
                stage,
                expectingClosingDate,
                owner
            });
    
            // Save to database
            const savedDeal = await newDeal.save();
            //  Return only data (including _id) directly
            res.status(201).json(savedDeal);  
            
        } catch (error) {
            console.error("Error adding deal:", error);
            res.status(500).json({ message: "Error adding deal" });
        }
    },
    
  
    updateDeal: async (req, res) => {
        try {
            const { id } = req.params;
            const updatedDeal = await AllDeals.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });

            if (!updatedDeal) {
                return res.status(404).json({ message: "Deal not found" });
            }

            res.status(200).json({ message: "Deal updated successfully", data: updatedDeal });
        } catch (error) {
            console.error("Error updating deal:", error);
            res.status(500).json({ message: "Error updating deal" });
        }
    },

    
    deleteDeal: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedDeal = await AllDeals.findByIdAndDelete(id);

            if (!deletedDeal) {
                return res.status(404).json({ message: "Deal not found" });
            }

            res.status(200).json({ message: "Deal deleted successfully" });
        } catch (error) {
            console.error("Error deleting deal:", error);
            res.status(500).json({ message: "Error deleting deal" });
        }
    }
};
