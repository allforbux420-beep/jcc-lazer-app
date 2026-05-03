<<<<<<< HEAD
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import Stripe from "stripe";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// FIX __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIDDLEWARE
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ================= AI CHAT =================
app.post("/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: `
You are JCC Laser customer support.

Business info:
- We engrave slate, wood, glass, tumblers
- Turnaround time is 10–14 business days
- We do custom names, logos, and photos
- Be friendly and sales focused

Customer:
${userMessage}
`
      })
    });

    const data = await response.json();

    res.json({
      reply: data.output?.[0]?.content?.[0]?.text || "No response"
    });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Error connecting to AI." });
  }
});

// ================= STRIPE CHECKOUT =================
app.post("/create-checkout-session", async (req, res) => {
  const order = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `${order.item} engraving (${order.size})`
        },
        unit_amount: order.price * 100
      },
      quantity: 1
    }],
    mode: "payment",
    success_url: "http://localhost:3000?success=true",
    cancel_url: "http://localhost:3000?cancel=true"
  });

  res.json({ url: session.url });
});

// LOAD SITE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// START SERVER
app.listen(3000, () => console.log("Server running on port 3000"));
=======
const express = require("express");
const Stripe = require("stripe");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const app = express();
app.use(express.json({ limit: "10mb" })); // important for images
app.use(express.static("public"));

// 🔑 Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ☁️ Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 🛒 CHECKOUT ROUTE
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { item, size, price, name, image } = req.body;

        let imageUrl = null;

        // 🚀 Upload image to Cloudinary
        if (image) {
            try {
                const upload = await cloudinary.uploader.upload(image, {
                    folder: "jcc-orders"
                });

                imageUrl = upload.secure_url;
                console.log("Uploaded to Cloudinary:", imageUrl);

            } catch (err) {
                console.log("Cloudinary upload error:", err);
            }
        } else {
            console.log("No image received");
        }

        // 💳 Stripe checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: `${item} (${size}) - ${name}`
                    },
                    unit_amount: price * 100
                },
                quantity: 1
            }],
            mode: "payment",
            success_url: "https://jcc-lazer-app.onrender.com/?success=true",
            cancel_url: "https://jcc-lazer-app.onrender.com/?cancel=true"
        });

        res.json({ url: session.url });

    } catch (error) {
        console.log("Server error:", error);
        res.status(500).json({ error: "Something went wrong" });
    }
});

// 🌐 PORT (Render uses dynamic port)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Running on ${PORT}`);
});
>>>>>>> 635fb34b9d52ed3cab205bfa9ce95cd1843b645f
