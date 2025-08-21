const express = require('express');
const axios = require('axios');
const app = express();

// Middleware para parsear el cuerpo de la solicitud como JSON
app.use(express.json());

// Endpoint GET para la verificación del webhook de WhatsApp
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

    if (body.object && body.entry && body.entry[0] && body.entry[0].changes && 
        body.entry[0].changes[0] && body.entry[0].changes[0].value && 
        body.entry[0].changes[0].value.messages) {
      
      const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

      // ****** EL ARREGLO FINAL ********
      // Enviar el cuerpo de la solicitud como datos de formulario.
      // Esto es lo que Google Apps Script espera por defecto.
      const scriptResponse = await axios.post(
        googleScriptUrl,
        // Convertimos el objeto JSON a una cadena de texto
        `contents=${JSON.stringify(body)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const reply = scriptResponse.data.reply;
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;

      const whatsappToken = process.env.WHATSAPP_API_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
