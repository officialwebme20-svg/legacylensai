require("dotenv").config();

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

const app = express();

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

let firebaseReady = false;

try {
    if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
    ) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
            })
        });

        firebaseReady = true;
        console.log("Firebase Admin initialized.");
    } else {
        console.log("Firebase Admin credentials not configured.");
    }
} catch (error) {
    console.error("Firebase initialization error:", error.message);
}

const database = {
    users: new Map()
};

function getUserDatabase(uid) {
    if (!database.users.has(uid)) {
        database.users.set(uid, {
            memories: [],
            documents: [],
            passwords: []
        });
    }

    return database.users.get(uid);
}

async function authenticate(req, res, next) {
    try {
        if (!firebaseReady) {
            return res.status(503).json({
                success: false,
                message: "Authentication service is not configured."
            });
        }

        const authorization = req.headers.authorization || "";

        if (!authorization.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        const token = authorization.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing."
            });
        }

        const decodedToken =
            await admin.auth().verifyIdToken(token);

        req.user = decodedToken;

        next();

    } catch (error) {
        console.error("Authentication error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Your session has expired. Please sign in again."
        });
    }
}

app.get("/", (req, res) => {
    res.json({
        success: true,
        service: "Legacy Lens AI Backend",
        status: "online"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        status: "healthy"
    });
});

app.get("/api/auth/me", authenticate, async (req, res) => {
    try {
        const user = req.user;

        let firebaseUser = null;

        try {
            firebaseUser =
                await admin.auth().getUser(user.uid);
        } catch {}

        res.json({
            success: true,
            user: {
                uid: user.uid,
                id: user.uid,
                email:
                    firebaseUser?.email ||
                    user.email ||
                    "",
                displayName:
                    firebaseUser?.displayName ||
                    user.name ||
                    "User",
                name:
                    firebaseUser?.displayName ||
                    user.name ||
                    "User",
                photoURL:
                    firebaseUser?.photoURL ||
                    user.picture ||
                    "",
                emailVerified:
                    firebaseUser?.emailVerified ??
                    user.email_verified ??
                    false,
                provider:
                    firebaseUser?.providerData?.[0]?.providerId ||
                    "firebase"
            }
        });

    } catch (error) {
        console.error("Account error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load account information."
        });
    }
});

app.post("/api/auth/logout", (req, res) => {
    res.json({
        success: true,
        message: "Signed out successfully."
    });
});

app.get("/api/memories", authenticate, (req, res) => {
    const userData =
        getUserDatabase(req.user.uid);

    res.json({
        success: true,
        memories: userData.memories
    });
});

app.post("/api/memories", authenticate, (req, res) => {
    const {
        title,
        content
    } = req.body;

    if (!title || !content) {
        return res.status(400).json({
            success: false,
            message: "Title and content are required."
        });
    }

    const userData =
        getUserDatabase(req.user.uid);

    const memory = {
        id: Date.now().toString(),
        title: String(title).trim(),
        content: String(content).trim(),
        createdAt: new Date().toISOString()
    };

    userData.memories.unshift(memory);

    res.status(201).json({
        success: true,
        memory
    });
});

app.delete("/api/memories/:id", authenticate, (req, res) => {
    const userData =
        getUserDatabase(req.user.uid);

    const before =
        userData.memories.length;

    userData.memories =
        userData.memories.filter(
            item => item.id !== req.params.id
        );

    if (
        before ===
        userData.memories.length
    ) {
        return res.status(404).json({
            success: false,
            message: "Memory not found."
        });
    }

    res.json({
        success: true
    });
});

app.get("/api/documents", authenticate, (req, res) => {
    const userData =
        getUserDatabase(req.user.uid);

    res.json({
        success: true,
        documents: userData.documents
    });
});

app.post("/api/documents", authenticate, (req, res) => {
    const {
        name,
        description
    } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: "Document name is required."
        });
    }

    const userData =
        getUserDatabase(req.user.uid);

    const document = {
        id: Date.now().toString(),
        name: String(name).trim(),
        description:
            String(description || "").trim(),
        createdAt: new Date().toISOString()
    };

    userData.documents.unshift(document);

    res.status(201).json({
        success: true,
        document
    });
});

app.delete("/api/documents/:id", authenticate, (req, res) => {
    const userData =
        getUserDatabase(req.user.uid);

    const before =
        userData.documents.length;

    userData.documents =
        userData.documents.filter(
            item => item.id !== req.params.id
        );

    if (
        before ===
        userData.documents.length
    ) {
        return res.status(404).json({
            success: false,
            message: "Document not found."
        });
    }

    res.json({
        success: true
    });
});

app.get("/api/passwords", authenticate, (req, res) => {
    const userData =
        getUserDatabase(req.user.uid);

    res.json({
        success: true,
        passwords: userData.passwords
    });
});

app.post("/api/passwords", authenticate, (req, res) => {
    const {
        name,
        username,
        password,
        notes
    } = req.body;

    if (
        !name ||
        !username ||
        !password
    ) {
        return res.status(400).json({
            success: false,
            message:
                "Website, username and password are required."
        });
    }

    const userData =
        getUserDatabase(req.user.uid);

    const passwordItem = {
        id: Date.now().toString(),
        name: String(name).trim(),
        username: String(username).trim(),
        password: String(password),
        notes: String(notes || "").trim(),
        createdAt: new Date().toISOString()
    };

    userData.passwords.unshift(passwordItem);

    res.status(201).json({
        success: true,
        password: passwordItem
    });
});

app.delete("/api/passwords/:id", authenticate, (req, res) => {
    const userData =
        getUserDatabase(req.user.uid);

    const before =
        userData.passwords.length;

    userData.passwords =
        userData.passwords.filter(
            item => item.id !== req.params.id
        );

    if (
        before ===
        userData.passwords.length
    ) {
        return res.status(404).json({
            success: false,
            message: "Password not found."
        });
    }

    res.json({
        success: true
    });
});

app.post("/api/ai/chat", authenticate, async (req, res) => {
    try {
        const {
            message
        } = req.body;

        if (!message || !String(message).trim()) {
            return res.status(400).json({
                success: false,
                message: "Message is required."
            });
        }

        if (!GROQ_API_KEY) {
            return res.status(500).json({
                success: false,
                message:
                    "AI service is not configured."
            });
        }

        const response =
            await fetch(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        "Authorization":
                            `Bearer ${GROQ_API_KEY}`
                    },
                    body: JSON.stringify({
                        model:
                            "llama-3.3-70b-versatile",
                        messages: [
                            {
                                role: "system",
                                content:
                                    "You are Legacy Lens AI, a secure personal AI assistant. Give helpful, accurate, clear answers. Never expose API keys, passwords, authentication tokens, or private credentials."
                            },
                            {
                                role: "user",
                                content:
                                    String(message).trim()
                            }
                        ],
                        temperature: 0.7
                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            return res.status(response.status).json({
                success: false,
                message:
                    data?.error?.message ||
                    "AI request failed."
            });
        }

        res.json({
            success: true,
            reply:
                data?.choices?.[0]?.message?.content ||
                "I could not generate a response."
        });

    } catch (error) {
        console.error(
            "AI error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Unable to connect to Legacy Lens AI."
        });
    }
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found."
    });
});

app.listen(PORT, () => {
    console.log(
        `Legacy Lens AI backend running on port ${PORT}.`
    );
});
