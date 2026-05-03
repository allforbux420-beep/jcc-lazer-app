const express = require("express");
const Stripe = require("stripe");
const cloudinary = require("cloudinary").v2;
const OpenAI = require("openai");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =========================
// LOAD INVENTORY FROM CSV
// =========================
let inventory = [];

function loadInventory() {
  inventory = [];

  fs.createReadStream("inventory.csv")
    .pipe(csv())
    .on("data", (row) => {
      inventory.push({
        name: row["Variant Name"],
        item: (row["Base Product"] || "").toLowerCase(),
        size: (row["Material"] || "").toLowerCase(),
        price: parseFloat((row["Sell Price"] || "0").replace("$", "")) || 0,
        stock: parseInt(row["Stock"] || "0")
      });
    })
    .on("end", () => {
      console.log("Inventory loaded:", inventory.length);
    });
}

loadInventory();

// =========================
// CHECKOUT
// =========================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { item, size } = req.body;

    const product = inventory.find(p =>
      p.item.includes(item) && p.size.includes(size)
    );

    if (!product || product.stock <= 0) {
      return res.status(400).json({ error: "Out of stock" });
    }

    product.stock -= 1;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: product.name },
          unit_amount: Math.round(product.price * 100)
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: "https://jcc-lazer-app.onrender.com",
      cancel_url: "https://jcc-lazer-app.onrender.com"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// CHAT
// =========================
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message.toLowerCase();

    const match = inventory.find(p =>
      message.includes(p.item) && message.includes(p.size)
    );

    if (match) {
      if (match.stock <= 0) {
        return res.json({
          reply: `❌ ${match.name} is out of stock`
        });
      }

      return res.json({
        reply: `💲 ${match.name} is $${match.price} (${match.stock} left)`
      });
    }

    const inventoryText = inventory
      .filter(i => i.stock > 0)
      .map(i => `${i.name} - $${i.price} (${i.stock} left)`)
      .join("\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Only recommend items from this inventory:

${inventoryText}

Keep answers short and helpful.
`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (err) {
    console.error(err);
    res.json({ reply: "Error" });
  }
});

// =========================
// START
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});