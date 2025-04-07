import { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { connectDB } from "./config/db";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://new-ecommerce-client.vercel.app",
      "https://new-ecom-api.vercel.app/stripe/create-checkout-session-embedded",
    ],
    credentials: true,
  })
);

// Routes
import productRouter from "./routes/products";
import customerRouter from "./routes/customers";
import orderRouter from "./routes/orders";
import orderItemRouter from "./routes/orderItems";
import stripeRouter from "./routes/stripe";

app.use("/products", productRouter);
app.use("/customers", customerRouter);
app.use("/orders", orderRouter);
app.use("/order-items", orderItemRouter);
app.use("/stripe", stripeRouter);

// Attempt to connect to the database
connectDB();

// Vercel function export
export default async (req: VercelRequest, res: VercelResponse) => {
  app(req, res); // Handle request using express
};
