const express = require("express");
const Stripe = require("stripe");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// CREATE FOLDERS IF NOT EXIST
if (!fs.existsSync("orders")) fs.mkdirSync("orders");
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

// CHECKOUT
app.post("/create-checkout-session", async (req, res) => {
    const { item, size, price, image, name } = req.body;

    let imagePath = null;

    // SAVE IMAGE
    if (image) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const fileName = `upload_${Date.now()}.png`;
        imagePath = path.join("uploads", fileName);

        fs.writeFileSync(imagePath, base64Data, "base64");
    }

    // SAVE ORDER
    const orderData = {
        item,
        size,
        price,
        name,
        image: imagePath,
        date: new Date()
    };

    const orderFile = `orders/order_${Date.now()}.json`;
    fs.writeFileSync(orderFile, JSON.stringify(orderData, null, 2));

    // STRIPE SESSION
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
            price_data: {
                currency: "usd",
                product_data: {
                    name: `${item} (${size})`
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
});

// PORT FIX (IMPORTANT)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Running on " + PORT));
