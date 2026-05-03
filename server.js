const express = require("express");
const Stripe = require("stripe");
const cloudinary = require("cloudinary").v2;
const OpenAI = require("openai");
const inventory = require("./inventory.json");

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
// CHECKOUT
// =========================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { item, size, price, image } = req.body;

    const product = inventory.find(p =>
      p.item === item && p.size === size
    );

    if (!product || product.stock <= 0) {
      return res.status(400).json({
        error: "Item out of stock"
      });
    }

    let imageUrl = null;

    if (image) {
      const upload = await cloudinary.uploader.upload(image, {
        folder: "jcc-orders",
        resource_type: "image"
      });
      imageUrl = upload.secure_url;
    }

    // 🔥 reduce stock AFTER purchase attempt
    product.stock -= 1;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${item} (${size})`,
              images: imageUrl ? [imageUrl] : []
            },
            unit_amount: Math.round(price * 100)
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: "https://jcc-lazer-app.onrender.com?success=true",
      cancel_url: "https://jcc-lazer-app.onrender.com?cancel=true"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// =========================
// CHAT WITH STOCK LOGIC
// =========================
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message.toLowerCase();

    // 🔹 MATCH ITEM
    const match = inventory.find(item =>
      message.includes(item.item) &&
      message.includes(item.size)
    );

    if (match) {
      if (match.stock <= 0) {
        // suggest alternative
        const alternative = inventory.find(i =>
          i.item === match.item && i.stock > 0
        );

        return res.json({
          reply: alternative
            ? `❌ ${match.name} is out of stock.\nTry ${alternative.name} for $${alternative.price} 👍`
            : `❌ ${match.name} is currently out of stock.`
        });
      }

      return res.json({
        reply: `💲 ${match.name} is $${match.price} (${match.stock} left)`
      });
    }

    // 🔹 INVENTORY TEXT FOR AI
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
You are a sales assistant for a laser engraving business.

RULES:
- ONLY recommend items that are in stock
- NEVER mention out-of-stock items
- Always guide user to available products
- Keep answers SHORT
- Be persuasive but natural

Available inventory:
${inventoryText}
`
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    const reply = completion.choices[0].message.content;

    res.json({ reply });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    res.json({ reply: "Something went wrong" });
  }
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});