// import dotenv from "dotenv";
// dotenv.config();
// import express from "express";
// import mongoose from "mongoose";
// import nodemailer from "nodemailer";
// import { google } from "googleapis";
// import cors from "cors";

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Conexión a MongoDB Atlas
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// // Esquema de mensaje
// const Message = mongoose.model("Message", {
//   name: String,
//   email: String,
//   message: String,
//   date: { type: Date, default: Date.now },
// });

// // Configuración OAuth2 para Gmail
// const oAuth2Client = new google.auth.OAuth2(
//   process.env.CLIENT_ID,
//   process.env.CLIENT_SECRET,
//   "https://developers.google.com/oauthplayground"
// );
// oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });

// async function sendMail({ name, email, message }) {
//   const accessToken = await oAuth2Client.getAccessToken();
//   const transporter = nodemailer.createTransport({
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

//   await transporter.sendMail({
//     from: `"Contacto Web" <${process.env.EMAIL_USER}>`,
//     to: process.env.EMAIL_TO,
//     subject: "Nuevo mensaje de contacto",
//     text: `Nombre: ${name}\nEmail: ${email}\nMensaje: ${message}`,
//   });
// }

// // Endpoint para recibir mensajes
// app.post("/api/contact", async (req, res) => {
//   const { name, email, message } = req.body;
//   const newMsg = new Message({ name, email, message });
//   await newMsg.save();
//   try {
//     await sendMail({ name, email, message });
//     res.json({ ok: true });
//   } catch (err) {
//     res.status(500).json({ ok: false, error: err.message });
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log("Servidor corriendo en puerto", PORT));
