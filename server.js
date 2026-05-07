const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const nodemailer = require("nodemailer");

const app = express();
app.use(express.json());
app.use(express.static("public"));

const ADMIN_TOKEN = "securetoken123";

/* =========================
   EMAIL CONFIG
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   SAVE ORDER
========================= */
function saveOrder(order){
  const file = "orders.csv";

  const line = `${order.id},${order.product},${order.status},${order.progress},${order.created},${order.image || ""},${order.text || ""},${order.tracking || ""},${order.email || ""}\n`;

  if(!fs.existsSync(file)){
    fs.writeFileSync(file,"orderId,product,status,progress,created,image,text,tracking,email\n");
  }

  fs.appendFileSync(file,line);
}

/* =========================
   ADMIN LOGIN
========================= */
app.post("/admin/login",(req,res)=>{
  if(req.body.password === "jccadmin123"){
    return res.json({ token: ADMIN_TOKEN });
  }
  res.status(401).json({ error:"Invalid password" });
});

/* =========================
   VERIFY ADMIN
========================= */
function verifyAdmin(req,res,next){
  if(req.headers.authorization !== ADMIN_TOKEN){
    return res.status(403).json({ error:"Unauthorized" });
  }
  next();
}

/* =========================
   GET ORDERS
========================= */
app.get("/admin/orders",verifyAdmin,(req,res)=>{
  let results=[];

  fs.createReadStream("orders.csv")
    .pipe(csv())
    .on("data",row=>results.push(row))
    .on("end",()=>res.json(results));
});

/* =========================
   UPDATE ORDER
========================= */
app.post("/admin/update-order",verifyAdmin,(req,res)=>{
  const { id,status,progress,tracking } = req.body;

  let orders=[];

  fs.createReadStream("orders.csv")
    .pipe(csv())
    .on("data",row=>{

      if(row.orderId === id){

        const hadTracking = row.tracking;

        row.progress = progress;

        // AUTO SHIP
        if(tracking && tracking.trim() !== ""){
          row.status = "Shipped";
          row.tracking = tracking;

          // SEND EMAIL ONLY FIRST TIME
          if(!hadTracking && row.email){

            transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: row.email,
              subject: "Your Order Has Shipped!",
              html: `
                <h2>Your order is on the way 🚚</h2>
                <p><b>Tracking Number:</b> ${tracking}</p>
                <p><a href="http://localhost:3000/track.html?id=${row.orderId}">
                Track Your Order</a></p>
              `
            });
          }

        } else {
          row.status = status;
          row.tracking = "";
        }
      }

      orders.push(row);
    })
    .on("end",()=>{

      const header="orderId,product,status,progress,created,image,text,tracking,email\n";

      const lines = orders.map(o=>
        `${o.orderId},${o.product},${o.status},${o.progress},${o.created},${o.image||""},${o.text||""},${o.tracking||""},${o.email||""}`
      ).join("\n");

      fs.writeFileSync("orders.csv",header+lines);

      res.json({ success:true });
    });
});

/* =========================
   TRACK ORDER
========================= */
app.get("/track-order/:id",(req,res)=>{
  const id=req.params.id;

  let results=[];

  fs.createReadStream("orders.csv")
    .pipe(csv())
    .on("data",row=>{
      if(row.orderId.trim()===id.trim()){
        results.push(row);
      }
    })
    .on("end",()=>{
      if(!results.length){
        return res.json({ error:"Order not found" });
      }

      const o=results[0];

      res.json({
        id:o.orderId,
        status:o.status,
        progress:o.progress,
        tracking:o.tracking,
        image:o.image
      });
    });
});

app.listen(3000,()=>console.log("Server running"));