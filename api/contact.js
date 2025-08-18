// import mongoose from "mongoose";
// import nodemailer from "nodemailer";
// import { google } from "googleapis";

// let conn = null;

// const MessageSchema = new mongoose.Schema({
//   name: String,
//   email: String,
//   message: String,
//   date: { type: Date, default: Date.now },
// });

// async function connectDB() {
//   if (!conn) {
//     conn = await mongoose.connect(process.env.MONGO_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//   }
//   return conn;
// }

// export default async function handler(req, res) {
//   res.setHeader(
//     "Access-Control-Allow-Origin",
//     "https://victor-hernandez-vivanco.github.io"
//   ); // O tu dominio de GitHub Pages
//   res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
//   res.setHeader("Access-Control-Allow-Headers", "Content-Type");
//   if (req.method === "OPTIONS") {
//     res.status(200).end();
//     return;
//   }
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   try {
//     await connectDB();
//     const Message =
//       mongoose.models.Message || mongoose.model("Message", MessageSchema);
//     const { name, email, message } = req.body;
//     const newMsg = new Message({ name, email, message });
//     await newMsg.save();

//     // Configuración OAuth2 para Gmail
//     const oAuth2Client = new google.auth.OAuth2(
//       process.env.CLIENT_ID,
//       process.env.CLIENT_SECRET,
//       "https://developers.google.com/oauthplayground"
//     );
//     oAuth2Client.setCredentials({
//       refresh_token: process.env.REFRESH_TOKEN.replace(/"/g, ""),
//     });
//     const accessToken = await oAuth2Client.getAccessToken();

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         type: "OAuth2",
//         user: process.env.EMAIL_USER,
//         clientId: process.env.CLIENT_ID,
//         clientSecret: process.env.CLIENT_SECRET,
//         refreshToken: process.env.REFRESH_TOKEN.replace(/"/g, ""),
//         accessToken: accessToken.token,
//       },
//     });

//     await transporter.sendMail({
//       from: `"Contacto Web" <${process.env.EMAIL_USER}>`,
//       to: process.env.EMAIL_TO,
//       subject: "Nuevo mensaje de contacto",
//       text: `Nombre: ${name}\nEmail: ${email}\nMensaje: ${message}`,
//     });

//     res.status(200).json({ ok: true });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// }

import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { google } from "googleapis";

let conn = null;

const MessageSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  date: { type: Date, default: Date.now },
});

async function connectDB() {
  if (!conn) {
    conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
  return conn;
}

export default async function handler(req, res) {
  console.log("===> Nueva petición recibida:", req.method, req.url);

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://victor-hernandez-vivanco.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    console.log("===> Respondiendo a preflight OPTIONS");
    res.status(200).json({ ok: true, msg: "CORS test OK" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  if (req.method !== "POST") {
    console.log("===> Método no permitido:", req.method);
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  try {
    await connectDB();
    const Message =
      mongoose.models.Message || mongoose.model("Message", MessageSchema);
    const { name, email, message } = req.body;
    console.log("===> Datos recibidos:", { name, email, message });
    const newMsg = new Message({ name, email, message });
    await newMsg.save();

    // ... (resto igual)

    res.status(200).json({ ok: true });
  } catch (err) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      "https://victor-hernandez-vivanco.github.io"
    );
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    console.error("===> Error en handler:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
