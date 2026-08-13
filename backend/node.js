require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 10000;

const FRONTEND_URL =
    process.env.FRONTEND_URL ||
    "https://legacylensai.onrender.com";

const GROQ_API_KEY =
    process.env.GROQ_API_KEY;

const GROQ_URL =
    "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL =
    "llama-3.3-70b-versatile";

app.use(
    cors({
        origin: FRONTEND_URL,
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS"
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization"
        ]
    })
);

app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Legacy Lens AI backend is running.",
        service: "Legacy Lens AI Backend",
        aiConfigured: Boolean(GROQ_API_KEY),
        frontend: FRONTEND_URL
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        backend: "online",
        aiConfigured: Boolean(GROQ_API_KEY),
        frontendConfigured: Boolean(FRONTEND_URL),
        model: GROQ_MODEL
    });
});

app.get("/api/ai/status", (req, res) => {
    res.status(200).json({
        success: true,
        online: true,
        configured: Boolean(GROQ_API_KEY),
        model: GROQ_MODEL
    });
});

app.post("/api/ai/chat", async (req, res) => {
    try {
        const message = req.body?.message;

        if (
            typeof message !== "string" ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Message is required."
            });
        }

        if (!GROQ_API_KEY) {
            console.error(
                "GROQ_API_KEY is missing."
            );

            return res.status(500).json({
                success: false,
                message:
                    "AI service is not configured on the server."
            });
        }

        console.log(
            "AI request received:",
            message.trim().slice(0, 100)
        );

        const groqResponse = await fetch(
            GROQ_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${GROQ_API_KEY}`
                },

                body: JSON.stringify({
                    model: GROQ_MODEL,

                    messages: [
                        {
                            role: "system",

                            content:
                                "You are Legacy Lens AI, a helpful, intelligent and secure personal AI assistant. " +
                                "Give clear, accurate and useful answers. " +
                                "Be conversational and professional. " +
                                "Never reveal API keys, passwords, environment variables, server secrets or private credentials."
                        },

                        {
                            role: "user",

                            content:
                                message.trim()
                        }
                    ],

                    temperature: 0.7,

                    max_completion_tokens: 2048,

                    top_p: 1
                })
            }
        );

        let data;

        try {
            data =
                await groqResponse.json();
        } catch (error) {
            console.error(
                "Could not parse Groq response:",
                error
            );

            return res.status(502).json({
                success: false,
                message:
                    "The AI service returned an invalid response."
            });
        }

        if (!groqResponse.ok) {
            console.error(
                "Groq API error:",
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            return res.status(
                groqResponse.status
            ).json({
                success: false,

                message:
                    data?.error?.message ||
                    "Groq AI request failed.",

                provider: "Groq"
            });
        }

        const reply =
            data?.choices?.[0]?.message?.content;

        if (
            typeof reply !== "string" ||
            !reply.trim()
        ) {
            console.error(
                "Groq returned no usable reply:",
                JSON.stringify(
                    data,
                    null,
                    2
                )
            );

            return res.status(502).json({
                success: false,
                message:
                    "The AI returned an empty response."
            });
        }

        console.log(
            "AI response generated successfully."
        );

        return res.status(200).json({
            success: true,
            reply: reply.trim()
        });

    } catch (error) {
        console.error(
            "Legacy Lens AI backend error:"
        );

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Unable to connect to the AI service."
        });
    }
});

app.use(
    (req, res) => {
        res.status(404).json({
            success: false,
            message:
                "API route not found."
        });
    }
);

app.use(
    (error, req, res, next) => {
        console.error(
            "Express error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Internal server error."
        });
    }
);

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            "========================================"
        );

        console.log(
            "Legacy Lens AI Backend"
        );

        console.log(
            `Port: ${PORT}`
        );

        console.log(
            `Frontend: ${FRONTEND_URL}`
        );

        console.log(
            `AI configured: ${Boolean(GROQ_API_KEY)}`
        );

        console.log(
            `Model: ${GROQ_MODEL}`
        );

        console.log(
            "========================================"
        );
    }
);
