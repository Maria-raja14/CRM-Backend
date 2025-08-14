// import express from 'express'
// import dotenv from 'dotenv'
// import  connectDB  from './config/db.js';
// import routes from './routes/index.routes.js'
<<<<<<< HEAD
=======

// import cors from 'cors'
// import passwordRoutes from "./routes/PasswordChange.route.js";
// import socialLinksRoutes from "./routes/SocialLinks.route.js";
// import expenseRoutes from "./routes/Expenses.routes.js"; 
// import areaExpensesRoutes from "./routes/AreaExpenses.route.js";
// dotenv.config();

// const app=express();

// app.use(express.json());
// app.use(cors());
// app.use(express.urlencoded({ extended: true }));

// //middleware
// app.use("/api",routes)
// // app.use("/api/users", userRoutes);
// // app.use("/api/roles", roleRoutes);
// // app.use("/api", profileRoutes);  
// // app.use("/api", passwordRoutes);
// // app.use("/api", socialLinksRoutes);
// // app.use("/api", expenseRoutes);

// app.use("/uploads", express.static("uploads"));

// app.use("/api/leads", leadsRoutes);


// const PORT=process.env.PORT || 5000;


// app.listen(PORT,async()=>{
//     console.log(`Server Running on ${PORT}`)
//     await connectDB();
// })




import express from 'express'
import dotenv from 'dotenv'
import  connectDB  from './config/db.js';
import routes from './routes/index.routes.js'
>>>>>>> 739d14c4e31a5629804aff47fdf666c3b10a9432

// import cors from 'cors'



// dotenv.config();

// const app=express();

// app.use(express.json());
// app.use(cors());
// app.use(express.urlencoded({ extended: true }));

// //middleware
// app.use("/api",routes)


// app.use("/uploads", express.static("uploads"));




// const PORT=process.env.PORT || 5000;


// app.listen(PORT,async()=>{
//     console.log(`Server Running on ${PORT}`)
//     await connectDB();
// })




import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import routes from './routes/index.routes.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';   // ✅ add this
import { initSocket } from './realtime/socket.js'; // your socket file
import { startFollowUpCron } from './controllers/followups.cron.js'; // cron

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api", routes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Server Error" });
});

// ✅ Create HTTP server for Socket.IO
const server = http.createServer(app);

// ✅ Initialize Socket.IO
initSocket(server);

// ✅ Start cron jobs
startFollowUpCron();

<<<<<<< HEAD
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
};
startServer();
=======

>>>>>>> 739d14c4e31a5629804aff47fdf666c3b10a9432
