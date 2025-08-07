const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const session = require("express-session");
const { Pool } = require("pg");
const dotenv = require("dotenv");
const cors = require("cors");
const nodemailer = require("nodemailer");
const csv = require("fast-csv");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

dotenv.config();
const app = express();
const upload = multer({ dest: "uploads/" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(cors());
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true }));

// Submit Feedback
app.post("/submit", upload.single("image"), async (req, res) => {
  const { name, comment, latitude, longitude } = req.body;
  let image_url = "";

  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path);
    image_url = result.secure_url;
  }

  await pool.query("INSERT INTO feedback (name, comment, latitude, longitude, image_url) VALUES ($1, $2, $3, $4, $5)", 
    [name, comment, latitude, longitude, image_url]);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_USER,
    subject: "New Tourist Feedback Submitted",
    text: "A new feedback has been received. Please check the admin dashboard."
  };
  transporter.sendMail(mailOptions);

  res.json({ message: "Feedback submitted successfully!" });
});

// Admin Login
app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
