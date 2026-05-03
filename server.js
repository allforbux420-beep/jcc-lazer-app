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
