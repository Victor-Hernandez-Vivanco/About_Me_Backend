import mongoose from "mongoose";
import { createTransport } from "nodemailer";
import { google } from "googleapis";

// MongoDB connection
const MONGODB_URI = process.env.MONGO_URI;
let cachedConnection = null;

// Conexión a la base de datos
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

// Modelo de contacto
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

  // Crear el transporter
  const transporter = createTransport({
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

// Manejar las solicitudes de contacto
async function handler(req, res) {
  // Production logging - minimal debug info
  console.log(
    "Contact form request:",
    req.method,
    "from:",
    req.headers["x-real-ip"]
  );

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

  // Validar el cuerpo de la solicitud
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

    // Send email notifications
    try {
      console.log("Starting email process...");
      const transporter = await createTransporter();
      console.log("Transporter created successfully");

      // 1. Email de notificación para ti
      const notificationOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: `Nuevo mensaje de contacto de ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Nuevo mensaje de contacto</h2>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
              <p><strong>Nombre:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Mensaje:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 4px;">${message}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        `,
      };

      // 2. Email de confirmación para el usuario
      const confirmationOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Gracias por contactarme - Víctor Hernández Vivanco",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #28d7fe;">¡Gracias por contactarme!</h2>
            <p>Hola ${name},</p>
            
            <p>He recibido tu mensaje correctamente y me pondré en contacto contigo lo antes posible, generalmente en un plazo de 24-48 horas.</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #555;">Resumen de tu mensaje:</h3>
              <p><strong>Nombre:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Mensaje:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 4px; font-style: italic;">"${message}"</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>Mientras tanto, puedes:</p>
            <ul>
              <li>Visitar mi <a href="https://victor-hernandez-vivanco.github.io/about-me/" style="color: #28d7fe;">portafolio</a></li>
              <li>Conectar conmigo en <a href="https://www.linkedin.com/in/víctor-hernández-vivanco-/" style="color: #28d7fe;">LinkedIn</a></li>
              <li>Ver mis proyectos en <a href="https://github.com/Victor-Hernandez-Vivanco" style="color: #28d7fe;">GitHub</a></li>
            </ul>

            <p>¡Saludos!</p>
            <p><strong>Víctor Hernández Vivanco</strong><br>
            Data Scientist & Web Developer<br>
            <a href="mailto:victorhernandezvivanco75@gmail.com" style="color: #28d7fe;">victorhernandezvivanco75@gmail.com</a></p>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #666;">
              Este es un mensaje automático de confirmación. Por favor, no respondas a este correo.
            </p>
          </div>
        `,
      };

      // Enviar email de notificación
      const notificationResult = await transporter.sendMail(
        notificationOptions
      );
      console.log("Notification email sent:", notificationResult.messageId);

      // Enviar email de confirmación al usuario
      const confirmationResult = await transporter.sendMail(
        confirmationOptions
      );
      console.log("Confirmation email sent:", confirmationResult.messageId);
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      console.error("Error details:", emailError.message);
      console.error("Error stack:", emailError.stack);
      // No fallar el proceso si el email falla
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

export default handler;
