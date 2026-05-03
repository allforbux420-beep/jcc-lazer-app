const express = require("express");
const Stripe = require("stripe");
const cloudinary = require("cloudinary").v2;

const app = express();

// ==========================
// MIDDLEWARE
// ==========================
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

// ==========================
// STRIPE
// ==========================
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ==========================
// CLOUDINARY
// ==========================
cloudinary.config({
cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
api_key: process.env.CLOUDINARY_API_KEY,
api_secret: process.env.CLOUDINARY_API_SECRET
});

// ==========================
// ROUTES
// ==========================
app.post("/create-checkout-session", async (req, res) => {
try {
const { item, size, price, image } = req.body;


    console.log("DATA RECEIVED:", { item, size, price });

    let imageUrl = null;

    if (image) {
        try {
            const upload = await cloudinary.uploader.upload(image, {
                folder: "jcc-orders"
            });
            imageUrl = upload.secure_url;
        } catch (e) {
            console.error("Cloudinary upload failed:", e.message);
        }
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
                unit_amount: Math.round(Number(price || 0) * 100)
            },
            quantity: 1
        }],
        mode: "payment",
        success_url: "https://jcc-lazer-app.onrender.com?success=true",
        cancel_url: "https://jcc-lazer-app.onrender.com?cancel=true"
    });

    console.log("SESSION URL:", session.url);

    res.json({ url: session.url });

} catch (err) {
    console.error("FULL ERROR:", err);
    res.status(500).json({ error: err.message });
}


});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
console.log("Server running on port", PORT);
});
