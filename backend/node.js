require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post("/api/ai/chat", async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "Message is required."
            });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "AI service is not configured."
            });
        }

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "system",
                            content: "You are Legacy Lens AI, a secure personal AI assistant."
                        },
                        {
                            role: "user",
                            content: message
                        }
                    ],
                    temperature: 0.7
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message: data?.error?.message || "AI request failed."
            });
        }

        res.json({
            success: true,
            reply:
                data.choices?.[0]?.message?.content ||
                "I could not generate a response."
        });

    } catch (error) {
        console.error("AI error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to connect to Legacy Lens AI."
        });
    }
});

app.listen(
    process.env.PORT || 3000,
    () => {
        console.log("Legacy Lens AI backend running.");
    }
);
