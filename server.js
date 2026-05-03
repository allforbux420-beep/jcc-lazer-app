const express = require("express");
const Stripe = require("stripe");
const path = require("path");
const cloudinary = require("cloudinary").v2;

const app = express();

// ✅ REQUIRED for image upload
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// ✅ STRIPE
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ✅ CLOUDINARY CONFIG
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==========================
// CHECKOUT ROUTE
// ==========================
app.post("/create-checkout-session", async (req, res) => {
try {

```
    const { item, size, price, image } = req.body;

    console.log("DATA RECEIVED:", { item, size, price });

    let imageUrl = null;

    // 🔥 Upload image (SAFE)
    if (image) {
        try {
            const upload = await cloudinary.uploader.upload(image, {
                folder: "jcc-orders"
            });
            imageUrl = upload.secure_url;
            console.log("Uploaded image:", imageUrl);
        } catch (uploadErr) {
            console.error("Cloudinary error:", uploadErr.message);
        }
    }

    // ✅ CREATE STRIPE SESSION
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
            price_data: {
                currency: "usd",
                product_data: {
                    name: item + " (" + size + ")",
                    images: imageUrl ? [imageUrl] : []
                },
                unit_amount: Math.round(Number(price || 0) * 100)
            },
            quantity: 1
        }],
        mode: "payment",
        success_url: "https://jcc-lazer-app.onrender.com?success=true",
        cancel_url: "https://jcc-lazer-app.onrender.com?cancel=true"
    });

    console.log("SESSION URL:", session.url);

    // ✅ SEND URL BACK TO FRONTEND
    res.json({ url: session.url });

} catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ error: err.message });
}
```

});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on port", PORT));
