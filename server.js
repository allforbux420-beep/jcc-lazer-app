const express = require("express");
const Stripe = require("stripe");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// CHECKOUT
app.post("/create-checkout-session", async (req, res) => {
    const { item, size, price } = req.body;

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
        success_url: "https://your-app.onrender.com?success=true",
        cancel_url: "https://your-app.onrender.com?cancel=true"
    });

    res.json({ url: session.url });
});

app.listen(3000, () => console.log("Running on 3000"));
