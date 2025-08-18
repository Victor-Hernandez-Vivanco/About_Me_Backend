// import mongoose from "mongoose";
// import nodemailer from "nodemailer";
// import { google } from "googleapis";

// // MongoDB connection
// const MONGODB_URI = process.env.MONGO_URI;
// let cachedConnection = null;

// async function connectToDatabase() {
//   if (cachedConnection) {
//     return cachedConnection;
//   }

//   if (!MONGODB_URI) {
//     throw new Error("MongoDB URI not found in environment variables");
//   }

//   try {
//     const connection = await mongoose.connect(MONGODB_URI);
//     cachedConnection = connection;
//     return connection;
//   } catch (error) {
//     console.error("Database connection error:", error);
//     throw error;
//   }
// }

// // Contact schema
// const contactSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true },
//   message: { type: String, required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// const Contact =
//   mongoose.models.Contact || mongoose.model("Contact", contactSchema);

// // Email setup with OAuth2
// async function createTransporter() {
//   const oauth2Client = new google.auth.OAuth2(
//     process.env.CLIENT_ID,
//     process.env.CLIENT_SECRET,
//     "https://developers.google.com/oauthplayground"
//   );

//   oauth2Client.setCredentials({
//     refresh_token: process.env.REFRESH_TOKEN,
//   });

//   const accessToken = await oauth2Client.getAccessToken();

//   return nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       type: "OAuth2",
//       user: process.env.EMAIL_USER,
//       clientId: process.env.CLIENT_ID,
//       clientSecret: process.env.CLIENT_SECRET,
//       refreshToken: process.env.REFRESH_TOKEN,
//       accessToken: accessToken.token,
//     },
//   });
// }

// export default async function handler(req, res) {
//   // Set CORS headers
//   res.setHeader(
//     "Access-Control-Allow-Origin",
//     "https://victor-hernandez-vivanco.github.io"
//   );
//   res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");

//   // Handle preflight OPTIONS request
//   if (req.method === "OPTIONS") {
//     res.status(200).end();
//     return;
//   }

//   // Only allow POST requests for contact form
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method not allowed" });
//   }

//   try {
//     const { name, email, message } = req.body;

//     // Validate required fields
//     if (!name || !email || !message) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     // Connect to database
//     await connectToDatabase();

//     // Save contact to database
//     const contact = new Contact({
//       name,
//       email,
//       message,
//     });

//     await contact.save();

//     // Send email notification
//     try {
//       const transporter = nodemailer.createTransport();

//       const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to: process.env.EMAIL_TO,
//         subject: `Nuevo mensaje de contacto de ${name}`,
//         html: `
//           <h2>Nuevo mensaje de contacto</h2>
//           <p><strong>Nombre:</strong> ${name}</p>
//           <p><strong>Email:</strong> ${email}</p>
//           <p><strong>Mensaje:</strong></p>
//           <p>${message}</p>
//           <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
//         `,
//       };

//       await transporter.sendMail(mailOptions);
//     } catch (emailError) {
//       console.error("Email sending error:", emailError);
//       // Don't fail the request if email fails, just log it
//     }

//     res.status(200).json({
//       success: true,
//       message: "Message sent successfully!",
//     });
//   } catch (error) {
//     console.error("Contact form error:", error);
//     res.status(500).json({
//       error: "Internal server error",
//       details: error.message,
//     });
//   }
// }

import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { google } from "googleapis";

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

async function createTransporter() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.REFRESH_TOKEN,
  });

  try {
    const accessTokenResponse = await oauth2Client.getAccessToken();
    console.log("Access token response:", accessTokenResponse);

    // Extraer el token correctamente
    const accessToken =
      accessTokenResponse.token || accessTokenResponse.access_token;

    if (!accessToken) {
      throw new Error("Failed to get access token");
    }

    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: accessToken,
      },
    });
  } catch (error) {
    console.error("Error creating transporter:", error);
    throw error;
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://victor-hernandez-vivanco.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Only allow POST requests for contact form
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check required environment variables
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

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Connect to database
    await connectToDatabase();

    // Save contact to database
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
      console.log("EMAIL_TO:", process.env.EMAIL_TO);
      console.log("EMAIL_USER:", process.env.EMAIL_USER);

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
      // Don't fail the request if email fails, just log it
    }

    res.status(200).json({
      success: true,
      message: "Message sent successfully!",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}
