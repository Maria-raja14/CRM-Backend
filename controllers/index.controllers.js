import leadsController from "./leads.controller.js";
import usersController from "./user.controller.js";
import roleController from "./role.controller.js";
import invoiceController from "./invoice.controller.js";


import activityController from "./activity.controller.js";
import proposalController from "./proposal.controller.js";
import dealsController from "./deals.controller.js";
import adminDashboardController from "./adminDashboard.controller.js";
import salesReportsController from "./salesReports.controller.js"
import googleAuthController from './googleAuth.controller.js';
import whatsappController from './whatsapp.controller.js';  // Add this line

export default {
  usersController,
  roleController,
  leadsController,
  dealsController,
  activityController,
  invoiceController,
  proposalController,
  adminDashboardController,
  salesReportsController,
  googleAuthController,
 whatsappController
  
};
