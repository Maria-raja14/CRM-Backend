// import Temp from "../models/templateModel.js";
// import fs from "fs";

// // @desc    Create a new template with image
// // @route   POST /api/templates
// // @access  Public
// export default {
//   createTemplate: async (req, res) => {
//     try {
//       const { title, content } = req.body;
//       const imagePath = req.file ? `/uploads/${req.file.filename}` : null; // Store image path

//       const newTemplate = new Temp({ title, content, image: imagePath });
//       await newTemplate.save();

//       res.status(201).json({ message: "Template created successfully", template: newTemplate });
//     } catch (error) {
//       res.status(500).json({ message: "Error creating template", error: error.message });
//     }
//   },

//   // @desc    Get all templates
//   // @route   GET /api/templates
//   // @access  Public
//   getTemplates: async (req, res) => {
//     try {
//       const templates = await Temp.find();
//       res.status(200).json(templates);
//     } catch (error) {
//       res.status(500).json({ message: "Error fetching templates", error: error.message });
//     }
//   },

//   // @desc    Update a template
//   // @route   PUT /api/templates/:id
//   // @access  Public
//   updateTemplate: async (req, res) => {
//     try {
//       const { id } = req.params;
//       const { title, content } = req.body;

//       if (!id) {
//         return res.status(400).json({ message: "Template ID is required" });
//       }

//       const template = await Temp.findById(id);
//       if (!template) {
//         return res.status(404).json({ message: "Template not found" });
//       }

//       // Handle image update
//       let imagePath = template.image;
//       if (req.file) {
//         // Delete old image if exists
//         if (template.image) {
//           const oldImagePath = `./public${template.image}`;
//           if (fs.existsSync(oldImagePath)) {
//             fs.unlinkSync(oldImagePath);
//           }
//         }
//         imagePath = `/uploads/${req.file.filename}`;
//       }

//       // Update template
//       template.title = title || template.title;
//       template.content = content || template.content;
//       template.image = imagePath;

//       await template.save();
//       res.status(200).json({ message: "Template updated successfully", template });
//     } catch (error) {
//       res.status(500).json({ message: "Error updating template", error: error.message });
//     }
//   },

//   // @desc    Delete a template
//   // @route   DELETE /api/templates/:id
//   // @access  Public
//   deleteTemplate: async (req, res) => {
//     try {
//       const { id } = req.params;
//       if (!id) {
//         return res.status(400).json({ message: "Template ID is required" });
//       }

//       const template = await Temp.findById(id);
//       if (!template) {
//         return res.status(404).json({ message: "Template not found" });
//       }

//       // Delete image if exists
//       if (template.image) {
//         const imagePath = `./public${template.image}`;
//         if (fs.existsSync(imagePath)) {
//           fs.unlinkSync(imagePath);
//         }
//       }

//       await template.deleteOne();
//       res.status(200).json({ message: "Template deleted successfully" });
//     } catch (error) {
//       res.status(500).json({ message: "Error deleting template", error: error.message });
//     }
//   }
// };


import Temp from "../models/templateModel.js";
import fs from "fs";
import path from "path";

export default {
  createTemplate: async (req, res) => {
    try {
      const { title, content, type } = req.body;
      const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

      const newTemplate = new Temp({ 
        title, 
        content, 
        image: imagePath,
        type: type || "custom",
        owner: req.body.owner || "User"
      });
      
      await newTemplate.save();

      res.status(201).json({ message: "Template created successfully", template: newTemplate });
    } catch (error) {
      res.status(500).json({ message: "Error creating template", error: error.message });
    }
  },

  getTemplates: async (req, res) => {
    try {
      const { type } = req.query;
      let filter = {};
      
      if (type) {
        filter.type = type;
      }
      
      const templates = await Temp.find(filter).sort({ createdAt: -1 });
      res.status(200).json(templates);
    } catch (error) {
      res.status(500).json({ message: "Error fetching templates", error: error.message });
    }
  },

  getTemplateById: async (req, res) => {
    try {
      const { id } = req.params;
      const template = await Temp.findById(id);
      
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      res.status(200).json(template);
    } catch (error) {
      res.status(500).json({ message: "Error fetching template", error: error.message });
    }
  },

  updateTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, content } = req.body;

      if (!id) {
        return res.status(400).json({ message: "Template ID is required" });
      }

      const template = await Temp.findById(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      let imagePath = template.image;
      if (req.file) {
        if (template.image) {
          const oldImagePath = path.join(process.cwd(), 'public', template.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        imagePath = `/uploads/${req.file.filename}`;
      }

      template.title = title || template.title;
      template.content = content || template.content;
      template.image = imagePath;

      await template.save();
      res.status(200).json({ message: "Template updated successfully", template });
    } catch (error) {
      res.status(500).json({ message: "Error updating template", error: error.message });
    }
  },

  deleteTemplate: async (req, res) => {
    try {
      const { id } = req.params;
      if (!id) {
        return res.status(400).json({ message: "Template ID is required" });
      }

      const template = await Temp.findById(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (template.image) {
        const imagePath = path.join(process.cwd(), 'public', template.image);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      await template.deleteOne();
      res.status(200).json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting template", error: error.message });
    }
  }
};