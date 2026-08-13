require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Legacy Lens AI backend is running."
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        backend: "online",
        aiConfigured: Boolean(GROQ_API_KEY)
    });
});

app.post("/api/ai/chat", async (req, res) => {
    try {
        const { message } = req.body;

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Message is required."
            });
        }

        if (!GROQ_API_KEY) {
            console.error("GROQ_API_KEY is missing.");

            return res.status(500).json({
                success: false,
                message: "AI service is not configured on the server."
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
                            content:
                                "You are Legacy Lens AI, a helpful, intelligent and secure personal AI assistant. Give clear, useful and accurate answers. Never reveal API keys, server secrets, environment variables, or private credentials."
                        },
                        {
                            role: "user",
                            content: message.trim()
                        }
                    ],

                    temperature: 0.7,

                    max_tokens: 2048
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "Groq API error:",
                JSON.stringify(data, null, 2)
            );

            return res.status(response.status).json({
                success: false,
                message:
                    data?.error?.message ||
                    "Groq AI request failed."
            });
        }

        const reply =
            data?.choices?.[0]?.message?.content;

        if (!reply) {
            return res.status(500).json({
                success: false,
                message: "The AI returned an empty response."
            });
        }

        return res.json({
            success: true,
            reply: reply
        });

    } catch (error) {
        console.error(
            "Legacy Lens AI error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to connect to the AI service."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found."
    });
});

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `Legacy Lens AI backend running on port ${PORT}`
        );
    }
);
