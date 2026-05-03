app.post("/create-checkout-session", async (req, res) => {
    try {
        const { item, size, price, image } = req.body;

        console.log("DATA RECEIVED:", { item, size, price });

        let imageUrl = null;

        // Upload to Cloudinary
        if (image) {
            const upload = await cloudinary.uploader.upload(image, {
                folder: "jcc-orders",
                resource_type: "image"
            });

            imageUrl = upload.secure_url;
            console.log("Uploaded image:", imageUrl);
        }

        // Create Stripe session
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