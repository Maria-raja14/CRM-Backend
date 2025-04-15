import express from 'express'
import dotenv from 'dotenv'
import  connectDB  from './config/db.js';
import routes from './routes/index.routes.js'
import profileRoutes from "./routes/Myprofileform.route.js";
import cors from 'cors'
import passwordRoutes from "./routes/PasswordChange.route.js";
import socialLinksRoutes from "./routes/SocialLinks.route.js";
import expenseRoutes from "./routes/Expenses.routes.js"; 
import areaExpensesRoutes from "./routes/AreaExpenses.route.js";
dotenv.config();

const app=express();

app.use(express.json());
app.use(cors({origin:"http://localhost:5173"}
  
));
//middleware
app.use("/api",routes)
app.use("/api/auth",routes)
app.use("/api", profileRoutes);  
app.use("/api", passwordRoutes);
app.use("/api", socialLinksRoutes);
app.use("/api", expenseRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api", areaExpensesRoutes);

const PORT=process.env.PORT || 5000;


app.listen(PORT,async()=>{
    console.log(`Server Running on ${PORT}`)
    await connectDB();
})
