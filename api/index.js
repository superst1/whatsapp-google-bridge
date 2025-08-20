const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.get('/api', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

app.post('/api', async (req, res) => {
  try {
    const body = req.body;
    if (body.object && body.entry[0].changes[0].value.messages) {
      const message = body.entry[0].changes[0].value.messages[0];
      const from = message.from;
      const msg_body = message.text.body;

      const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
      const scriptResponse = await axios.post(googleScriptUrl, {
        message: msg_body,
        from: `whatsapp:${from}`
      });
      
      const reply = scriptResponse.data.reply;
      const whatsappToken = process.env.WHATSAPP_API_TOKEN;
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

      await axios.post(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, 
        { messaging_product: "whatsapp", to: from, text: { body: reply } },
        { headers: { 'Authorization': `Bearer ${whatsappToken}` } }
      );
    }
    res.sendStatus(200);
  } catch (error) {
   // console.error('Error:', error.message);
    //    res.sendStatus(500);
    //nuevo cod
    console.error('❌ Status:', error.response?.status);
    console.error('❌ Headers:', error.response?.headers);
    console.error('❌ Body:', error.response?.data);
    console.error('❌ Payload enviado:', {
      messaging_product: "whatsapp",
      to: from,
      text: { body: reply }
    });
    return res.sendStatus(500);
    //fin nuevo cod
  }
});

module.exports = app;
