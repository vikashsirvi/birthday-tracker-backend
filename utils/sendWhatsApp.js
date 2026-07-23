let client = null;

const getClient = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  // Only initialize if credentials look valid (Twilio SIDs always start with "AC")
  if (!sid || !token || !sid.startsWith('AC')) {
    return null;
  }

  if (!client) {
    const twilio = require('twilio');
    client = twilio(sid, token);
  }

  return client;
};

// phone must be in E.164 format e.g. +919876543210
const sendWhatsApp = async ({ to, message }) => {
  const twilioClient = getClient();

  if (!twilioClient) {
    console.warn('⚠️ WhatsApp not sent — Twilio credentials are missing or invalid in .env. Skipping.');
    return false;
  }

  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${to}`,
      body: message,
    });
    console.log(`✅ WhatsApp sent to ${to}`);
    return true;
  } catch (error) {
    console.error(`❌ WhatsApp failed for ${to}:`, error.message);
    return false;
  }
};

module.exports = sendWhatsApp;