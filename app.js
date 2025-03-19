import express from 'express'
import dotenv from 'dotenv'
import  connectDB  from './config/db.js';
import routes from './routes/index.routes.js'
import cors from 'cors'


dotenv.config();

const app=express();

app.use(express.json());
app.use(cors({origin:"http://localhost:5173"}
    
));
//middleware
app.use("/api",routes)

const PORT=process.env.PORT || 5000;


app.listen(PORT,async()=>{
    console.log(`Server Running on ${PORT}`)
    await connectDB();
})
