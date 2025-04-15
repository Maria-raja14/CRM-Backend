import Organization from "../models/organization.models.js";
import LeadGroup from "../models/leadGroup.models.js";


export default {

    createOrganization: async (req, res) => {
        try {
            const { organizationName, leadGroupId, owner, addressDetails, customFields } = req.body;
    
            // Validate input
            if (!organizationName || !leadGroupId) {
                return res.status(400).json({ message: "Organization name and LeadGroup ID are required" });
            }
    
            // Check if leadGroupId exists
            const leadGroup = await LeadGroup.findById(leadGroupId);
            if (!leadGroup) {
                return res.status(404).json({ message: "LeadGroup not found" });
            }
    
            // Create and save the organization
            const newOrganization = new Organization({
                organizationName,
                leadGroup: leadGroup._id, // Store only the ID
                owner,
                addressDetails,
                customFields
            });
    
            const savedOrganization = await newOrganization.save();
            await savedOrganization.populate("leadGroup"); // Optional: Populate leadGroup details in response
    
            res.status(201).json(savedOrganization);
        } catch (error) {
            if (error.name === "ValidationError") {
                return res.status(400).json({ message: "Validation error", errors: error.errors });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    },
    
    
    // Get all organizations
 getAllOrganizations : async (req, res) => {
        try {
            const organizations = await Organization.find().populate("leadGroup");
            res.status(200).json(organizations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    
    // Get an organization by ID
     getOrganizationById :async (req, res) => {
        try {
            const organization = await Organization.findById(req.params.id).populate("leadGroup");
            if (!organization) return res.status(404).json({ message: "Organization not found" });
            res.status(200).json(organization);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    
    // Update an organization
     updateOrganization : async (req, res) => {
        try {
            const updatedOrganization = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!updatedOrganization) return res.status(404).json({ message: "Organization not found" });
            res.status(200).json(updatedOrganization);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    },
    
    // Delete an organization
     deleteOrganization : async (req, res) => {
        try {
            const deletedOrganization = await Organization.findByIdAndDelete(req.params.id);
            if (!deletedOrganization) return res.status(404).json({ message: "Organization not found" });
            res.status(200).json({ message: "Organization deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    },
    
    
    
     bulkUploadOrganizations : async (req, res) => {
      try {
        const { organizations } = req.body;
    
        if (!organizations || !Array.isArray(organizations) || organizations.length === 0) {
          return res.status(400).json({ message: "Invalid or empty file data" });
        }
    
        
        const newOrganizations = organizations.map(org => ({
            organizationName: org.organizationName,  
            leadGroup: org.leadGroup, 
            owner: "zebra forest",  
            /* created_by_email: org.created_by_email,   */
           /*  owner_email: org.owner_email, */
            addressDetails: {
              country: org.addressDetails.country || "",
              city: org.addressDetails.city || "",
              state: org.addressDetails.state || "",
              zipCode: org.addressDetails.zipCode || "",
            },
          }));
          
        const savedOrganizations = await Organization.insertMany(newOrganizations);
    
        res.status(201).json({
          message: "Organizations uploaded successfully",
          data: savedOrganizations,
        });
    
      } catch (error) {
        res.status(500).json({
          message: "Server Error",
          error: error.message,
        });
      }
    }
    

}




// Create a new organization using leadGroup ID



