import express from 'express'
import dotenv from 'dotenv'
import  connectDB  from './config/db.js';
import routes from './routes/index.routes.js'

import cors from 'cors'

import userRoutes from "./routes/user.route.js";
import roleRoutes from "./routes/role.routes.js";


dotenv.config();

const app=express();

app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

//middleware
app.use("/api",routes)
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);
// app.use("/api", profileRoutes);  
// app.use("/api", passwordRoutes);
// app.use("/api", socialLinksRoutes);
// app.use("/api", expenseRoutes);

app.use("/uploads", express.static("uploads"));




const PORT=process.env.PORT || 5000;


app.listen(PORT,async()=>{
    console.log(`Server Running on ${PORT}`)
    await connectDB();
})
