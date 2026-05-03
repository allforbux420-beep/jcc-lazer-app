const express = require("express");
const Stripe = require("stripe");
const cloudinary = require("cloudinary").v2;
const OpenAI = require("openai");
const inventory = require("./inventory.json");

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// =========================
// STRIPE
// =========================
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// =========================
// CLOUDINARY
// =========================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// =========================
// OPENAI (CHATGPT)
// =========================
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// =========================
// CHECKOUT ROUTE
// =========================
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { item, size, price, image } = req.body;

    let imageUrl = null;

    if (image) {
      const upload = await cloudinary.uploader.upload(image, {
        folder: "jcc-orders",
        resource_type: "image"
      });
      imageUrl = upload.secure_url;
    }

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
// CHAT ROUTE (AI + INVENTORY)
// =========================
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message.toLowerCase();

    // 🔹 FIRST: try exact inventory match
    const match = inventory.find(item =>
      message.includes(item.item) &&
      message.includes(item.size)
    );

    if (match) {
      return res.json({
        reply: `💲 ${match.name} is $${match.price}`
      });
    }

    // 🔹 FORMAT INVENTORY FOR AI CONTEXT
    const inventoryText = inventory
      .map(i => `${i.name} - $${i.price}`)
      .join("\n");

    // 🔹 AI RESPONSE
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are a helpful sales assistant for a laser engraving business.

Available inventory:
${inventoryText}

Rules:
- Be friendly and helpful
- Recommend products when user is unsure
- Suggest upgrades (bigger sizes look better for photos)
- If user asks price, use inventory above
- Keep responses short and natural
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