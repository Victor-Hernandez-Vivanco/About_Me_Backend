const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { google } = require("googleapis");

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI;
let cachedConnection = null;

async function connectToDatabase() {
  if (cachedConnection) {
    return cachedConnection;
  }

  if (!MONGODB_URI) {
    throw new Error("MongoDB URI not found in environment variables");
  }

  try {
    const connection = await mongoose.connect(MONGODB_URI);
    cachedConnection = connection;
    return connection;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

// Contact schema
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Contact =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);

// Reutilizar OAuth2Client y transporter para mejorar performance en Vercel
let oauth2Client = null;
let cachedTransporter = null;

async function createTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });
  }

  const { token } = await oauth2Client.getAccessToken();

  if (!token) {
    throw new Error("Failed to get access token");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.EMAIL_USER,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      refreshToken: process.env.REFRESH_TOKEN,
      accessToken: token,
    },
  });

  cachedTransporter = transporter;
  return transporter;
}

async function handler(req, res) {
  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://victor-hernandez-vivanco.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const requiredEnvVars = [
    "MONGO_URI",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "REFRESH_TOKEN",
    "EMAIL_USER",
    "EMAIL_TO",
  ];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    console.error("Missing environment variables:", missingVars);
    return res.status(500).json({
      error: "Server configuration error",
      missing: missingVars,
    });
  }

  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    await connectToDatabase();

    const contact = new Contact({
      name,
      email,
      message,
    });
    await contact.save();
    console.log("Contact saved to database successfully");

    // Send email notification
    try {
      console.log("Starting email process...");
      const transporter = await createTransporter();
      console.log("Transporter created successfully");

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: `Nuevo mensaje de contacto de ${name}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${message}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
        `,
      };

      console.log("Sending email...");
      const emailResult = await transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", emailResult);
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      console.error("Error details:", emailError.message);
      console.error("Error stack:", emailError.stack);
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

module.exports = handler;
