const express = require('express');
const axios = require('axios');
const app = express();

// Middleware para parsear el cuerpo de la solicitud como JSON
app.use(express.json());

// Endpoint GET para la verificación del webhook de WhatsApp
// No necesita cambios, ya que maneja la verificación inicial
app.get('/api', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('Webhook verificado!');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// Endpoint POST para recibir los mensajes de WhatsApp
app.post('/api', async (req, res) => {
  try {
    const body = req.body;

    // Asegúrate de que el mensaje es válido antes de procesar
    if (body.object && body.entry && body.entry[0] && body.entry[0].changes && 
        body.entry[0].changes[0] && body.entry[0].changes[0].value && 
        body.entry[0].changes[0].value.messages) {
      
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;

      // URL de la aplicación web de Google Apps Script, obtenida de las variables de entorno
      const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

      // ******* LA CLAVE DEL ARREGLO *******
      // En lugar de construir un nuevo objeto, reenviamos el 'body' completo de la
      // solicitud original de WhatsApp a nuestro script de Google Apps Script.
      // Esto asegura que el script de Apps Script reciba la estructura de datos
      // que espera.
      const scriptResponse = await axios.post(googleScriptUrl, body);
      
      const reply = scriptResponse.data.reply;
      const whatsappToken = process.env.WHATSAPP_API_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      // Envía la respuesta generada por Apps Script de vuelta a WhatsApp
      await axios.post(
        `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
        { messaging_product: "whatsapp", to: from, text: { body: reply } },
        { headers: { 'Authorization': `Bearer ${whatsappToken}` } }
      );
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('Error en el endpoint /api:', error.message);
    res.sendStatus(500);
  }
});

module.exports = app;
