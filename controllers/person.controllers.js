import Person from "../models/person.models.js";
import LeadGroup from "../models/leadGroup.models.js";
import Organization from "../models/organization.models.js";



export const createPerson = async (req, res) => {
    try {
        let { personName, leadGroupId, organizationId, contactInfo, owner, customFields, ...rest } = req.body;
        const leadGroup = await LeadGroup.findById(leadGroupId);
        if (!leadGroup) return res.status(404).json({ message: "LeadGroup not found" });

        const organization = await Organization.findById(organizationId);
        if (!organization) return res.status(404).json({ message: "Organization not found" });
        const processedCustomFields = {
            cardlead: rest.cardlead?.trim() || customFields?.cardlead?.trim() || "N/A",
            admin: rest.admin?.trim() || customFields?.admin?.trim() || "N/A",
            dbut: rest.dbut?.trim() || customFields?.dbut?.trim() || "N/A",
            fin: rest.fin?.trim() || customFields?.fin?.trim() || "N/A"
        };

        const newPerson = new Person({
            personName,
            leadGroup: leadGroup._id,
            organization: organization._id,
            contactInfo,
            owner,
            customFields: processedCustomFields
        });

        const savedPerson = await newPerson.save();
        res.status(201).json(savedPerson);
    } catch (error) {
        console.error("Error creating person:", error);
        res.status(400).json({ message: error.message });
    }
};


export const getAllPersons = async (req, res) => {
    try {
        const persons = await Person.find()
            .populate("leadGroup")
            .populate("organization")
            .lean();

        // console.log("Fetched Persons:", JSON.stringify(persons, null, 2)); // Log the fetched persons

        res.status(200).json(persons);
    } catch (error) {
        console.error("Error fetching persons:", error);
        res.status(500).json({ message: error.message });
    }
};






// Get a person by ID
export const getPersonById = async (req, res) => {
    try {
        const person = await Person.findById(req.params.id).populate("leadGroup").populate("organization");
        if (!person) return res.status(404).json({ message: "Person not found" });
        res.status(200).json(person);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a person
export const updatePerson = async (req, res) => {
    try {
        const updatedPerson = await Person.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedPerson) return res.status(404).json({ message: "Person not found" });
        res.status(200).json(updatedPerson);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a person
export const deletePerson = async (req, res) => {
    try {
        const deletedPerson = await Person.findByIdAndDelete(req.params.id);
        if (!deletedPerson) return res.status(404).json({ message: "Person not found" });
        res.status(200).json({ message: "Person deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
