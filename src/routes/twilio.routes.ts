import express from "express";
import twilio from "twilio";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// Twilio config
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const VoiceResponse = twilio.twiml.VoiceResponse;

export function sendOtp(num: string, message: string) {
  return client.messages
    .create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: num
    })
}

// =======================
// 📞 TRIGGER CALL
// =======================
router.post("/call", async (req, res) => {
  try {
    const { scheduleId } = req.body;

    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      include: { user: true },
    });

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found" });
    }

    // Create call record
    const callRecord = await prisma.call.create({
      data: {
        scheduleId: schedule.id,
        timestamp: new Date(),
        status: "pending",
      },
    });

    // 🔥 Initiate Twilio call
    const call = await client.calls.create({
      to: schedule.user.phone,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${process.env.BASE_URL}/twilio/voice?scheduleId=${schedule.id}&callId=${callRecord.id}`,
      statusCallback: `${process.env.BASE_URL}/twilio/status?callId=${callRecord.id}`,
      statusCallbackMethod: "POST",
    });

    // Save Twilio SID
    const update = await prisma.call.update({
      where: { id: callRecord.id },
      data: { twilioSid: call.sid },
    });
    console.log(update);

    return res.json({ success: true, callSid: call.sid });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
});

// =======================
// 🎙️ TWILIO VOICE (TwiML)
// =======================
router.post("/voice", async (req, res) => {
  try {
    const { scheduleId, callId } = req.query;

    const schedule = await prisma.schedule.findUnique({
      where: { id: Number(scheduleId) },
    });

    const twiml = new VoiceResponse();

    twiml.say(
      { voice: "alice" },
      schedule?.message || "Hello, this is your medication reminder."
    );

    // Gather speech input
    twiml.gather({
      input: ["dtmf"],
      numDigits: 1,
      action: `${process.env.BASE_URL}/twilio/gather?callId=${callId}`,
      method: "POST",
      timeout: 5,
    }).say("Press 1 if you have taken your medicine, or press 2 if not.");

    // Optional fallback if no input
    twiml.say("No input received. Goodbye.");
    twiml.hangup();

    res.type("text/xml");
    return res.send(twiml.toString());

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
});

// =======================
// 🧠 HANDLE SPEECH INPUT
// =======================
router.post("/gather", async (req, res) => {
  try {

    console.log("inside the gather function");

    const { callId } = req.query;
    const digit = req.body.Digits;

    if (!digit || (digit !== "1" && digit !== "2")) {
      const twiml = new VoiceResponse();

      twiml.say("Invalid input. Please press 1 for yes or 2 for no.");

      twiml.gather({
        input: ["dtmf"],
        numDigits: 1,
        action: `${process.env.BASE_URL}/twilio/gather?callId=${callId}`,
        method: "POST",
      });

      return res.type("text/xml").send(twiml.toString());
    }

    let intent: "YES" | "NO" | "UNKNOWN" = "UNKNOWN";

    if (digit === "1") intent = "YES";
    else if (digit === "2") intent = "NO";

    await prisma.response.create({
      data: {
        callId: Number(callId),
        speechText: intent,
        interpretedIntent: intent,
        timestamp: new Date(),
      },
    });

    const twiml = new VoiceResponse();
    twiml.say("Thank you. Your response has been recorded.");
    twiml.hangup();

    res.type("text/xml");
    return res.send(twiml.toString());

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error");
  }
});

// =======================
// 📊 CALL STATUS CALLBACK
// =======================
router.post("/status", async (req, res) => {
  try {
    const { callId } = req.query;
    const status = req.body.CallStatus;

    let mappedStatus: "completed" | "failed" | "pending" = "pending";

    if (status === "completed") mappedStatus = "completed";
    else if (status === "failed" || status === "no-answer") mappedStatus = "failed";

    await prisma.call.update({
      where: { id: Number(callId) },
      data: { status: mappedStatus },
    });

    return res.sendStatus(200);

  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

router.get("/avaliablecalls", async (req, res) => {

  const accountSid = process.env.ACCOUNT_SID;
  const authToken = process.env.AUTH_TOKEN;

  const client = twilio(accountSid, authToken);

  try {
    const data = await client.balance.fetch();
    console.log(`Your account balance is ${data.balance} ${data.currency}.`);
    const costPerCall = 0.0025;
    res.json({
      success: true,
      balance: data.balance,
      currency: data.currency,
      callsAvaliable: parseFloat(data.balance) / costPerCall
    })
  } catch (error) {
    console.error('Error fetching balance:', error);
  }
})

export default router;