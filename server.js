// deploy fix
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
