const express = require("express");
const Stripe = require("stripe");
const cloudinary = require("cloudinary").v2;
const inventory = require('./inventory.json');
const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

  

// =========================
// 1️⃣ CHECKOUT ROUTE
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
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: item + " (" + size + ")",
                        images: imageUrl ? [imageUrl] : []
                    },
                    unit_amount: price * 100
                },
                quantity: 1
            }],
            mode: "payment",
            success_url: "https://jcc-lazer-app.onrender.com?success=true",
            cancel_url: "https://jcc-lazer-app.onrender.com?cancel=true"
        });

        res.json({ url: session.url });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// =========================
// 2️⃣ 👉 ADD CHAT ROUTE HERE
// =========================
app.post('/chat', (req, res) => {
    const message = req.body.message.toLowerCase();

    const match = inventory.find(item =>
        message.includes(item.item) &&
        message.includes(item.size)
    );

    if (match) {
        return res.json({
            reply: `💲 ${match.size} ${match.item} is $${match.price}`
        });
    }

    if (message.includes("price")) {
        return res.json({
            reply: "Tell me item + size (example: 4x6 slate)"
        });
    }

    return res.json({
        reply: "I can help with pricing and orders 👍"
    });
});


// =========================
// SERVER START
// =========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));