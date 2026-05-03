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

// Route
app.post("/create-checkout-session", async (req, res) => {
    try {
        const { item, size, price, image } = req.body;

        console.log("DATA RECEIVED:", { item, size, price });

        let imageUrl = null;

        if (image) {
            const upload = await cloudinary.uploader.upload(image, {
                folder: "jcc-orders",
                resource_type: "image"
            });

            imageUrl = upload.secure_url;
            console.log("Uploaded image:", imageUrl);
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
        console.error("FULL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));