import express from "express";
import type { Request, Response } from "express";
import { prisma } from "./lib/prisma.js"
import router from "./routes/routes.js";
import cors from "cors"




const app = express();
app.use(express.json()); // for JSON APIs
app.use(express.urlencoded({ extended: true })); // 🔥 for Twilio
app.use(cors())

app.use("/api", router)

app.get("/", (req, res) => { res.send("Hello") })

let count = 0;
app.get("/webhooktest", (req, res) => {
    count++;
    console.log("webhook testing successfull count : " + count);
    res.status(200).send("pass");

})




app.listen(8080, () => {
    console.log("http://localhost:8080")
})