const API_BASE = "http://localhost:3000";

let currentUser = null;
let memories = [];
let documents = [];
let passwords = [];

const views = document.querySelectorAll(".view");
const navButtons = document.querySelectorAll(".nav button");

const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");

const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");

const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const modalContent = document.getElementById("modalContent");

const modalCancel = document.getElementById("modalCancel");
const modalSave = document.getElementById("modalSave");

const pageInfo = {
    overview: [
        "Overview",
        "Your private digital life, organized securely."
    ],

    ai: [
        "Legacy Lens AI",
        "Your private AI assistant."
    ],

    vault: [
        "Secure Vault",
        "Protected credentials and sensitive information."
    ],

    memories: [
        "Memories",
        "Preserve the moments you never want to forget."
    ],

    documents: [
        "Documents",
        "Keep important information organized securely."
    ],

    passwords: [
        "Password Manager",
        "Store your important credentials securely."
    ],

    account: [
        "Account",
        "Manage your Legacy Lens AI account information."
    ],

    security: [
        "Security",
        "Review your account protection."
    ]
};

function showToast(text, type = "success") {
    if (!toast) return;

    toast.textContent = text;
    toast.className = "toast show " + type;

    setTimeout(() => {
        toast.className = "toast";
    }, 3500);
}

function navigate(viewName) {
    views.forEach(view => {
        view.classList.toggle(
            "active",
            view.id === viewName
        );
    });

    navButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === viewName
        );
    });

    if (pageInfo[viewName]) {
        pageTitle.textContent = pageInfo[viewName][0];
        pageSubtitle.textContent = pageInfo[viewName][1];
    }

    sidebar?.classList.remove("open");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

navButtons.forEach(button => {
    button.addEventListener("click", () => {
        navigate(button.dataset.view);
    });
});

document
    .querySelectorAll("[data-view-target]")
    .forEach(button => {
        button.addEventListener("click", () => {
            navigate(button.dataset.viewTarget);
        });
    });

document
    .getElementById("mobileMenu")
    ?.addEventListener("click", () => {
        sidebar?.classList.toggle("open");
    });

function initials(name) {
    if (!name) return "U";

    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

async function api(path, options = {}) {
    const requestOptions = {
        credentials: "include",
        ...options,
        headers: {
            ...(options.body
                ? {
                    "Content-Type": "application/json"
                }
                : {}),
            ...(options.headers || {})
        }
    };

    let response;

    try {
        response = await fetch(
            API_BASE + path,
            requestOptions
        );
    } catch (error) {
        console.error("Network error:", error);

        throw new Error(
            "Cannot connect to the Legacy Lens AI backend. Make sure your Node.js server is running."
        );
    }

    let data = {};

    const contentType =
        response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
        try {
            data = await response.json();
        } catch {
            data = {};
        }
    } else {
        try {
            const text = await response.text();

            data = {
                message: text
            };
        } catch {
            data = {};
        }
    }

    if (!response.ok) {
        throw new Error(
            data?.message ||
            data?.error ||
            `Request failed with status ${response.status}.`
        );
    }

    return data;
}

async function checkBackend() {
    try {
        const data = await api("/api/health");

        console.log(
            "Backend health:",
            data
        );

        if (data.aiConfigured === false) {
            console.warn(
                "Backend is running, but GROQ_API_KEY is not configured."
            );
        }

        return true;

    } catch (error) {
        console.error(
            "Backend health check failed:",
            error.message
        );

        return false;
    }
}

async function loadAccount() {
    try {
        const data = await api("/api/auth/me");

        if (data?.success && data?.user) {
            currentUser = data.user;
            renderAccount();
            return true;
        }

        console.warn(
            "No authenticated user returned by /api/auth/me."
        );

        return false;

    } catch (error) {
        console.warn(
            "Account information could not be loaded:",
            error.message
        );

        /*
            IMPORTANT:

            We DO NOT redirect to index.html here.

            The dashboard is allowed to remain open.

            index.html is only opened by logout().
        */

        return false;
    }
}

function renderAccount() {
    if (!currentUser) return;

    const user = currentUser;

    const name =
        user.displayName ||
        user.name ||
        "User";

    const email =
        user.email ||
        "";

    const welcomeName =
        document.getElementById("welcomeName");

    const sideName =
        document.getElementById("sideName");

    const sideEmail =
        document.getElementById("sideEmail");

    const sideAvatar =
        document.getElementById("sideAvatar");

    const accountName =
        document.getElementById("accountName");

    const accountEmail =
        document.getElementById("accountEmail");

    const accountId =
        document.getElementById("accountId");

    const accountProvider =
        document.getElementById("accountProvider");

    const accountVerification =
        document.getElementById("accountVerification");

    const accountStatus =
        document.getElementById("accountStatus");

    const securityEmail =
        document.getElementById("securityEmail");

    if (welcomeName) {
        welcomeName.textContent =
            name.split(" ")[0];
    }

    if (sideName) {
        sideName.textContent =
            name;
    }

    if (sideEmail) {
        sideEmail.textContent =
            email;
    }

    if (sideAvatar) {
        sideAvatar.textContent =
            initials(name);
    }

    if (accountName) {
        accountName.value =
            name;
    }

    if (accountEmail) {
        accountEmail.value =
            email;
    }

    if (accountId) {
        accountId.value =
            user.uid ||
            user.id ||
            "Protected";
    }

    if (accountProvider) {
        accountProvider.value =
            user.provider ||
            user.authProvider ||
            "Account authentication";
    }

    if (accountVerification) {
        accountVerification.value =
            user.emailVerified
                ? "Verified"
                : "Not verified";
    }

    if (accountStatus) {
        accountStatus.value =
            "Active";
    }

    if (securityEmail) {
        securityEmail.textContent =
            user.emailVerified
                ? "● Verified"
                : "● Verification required";
    }
}

async function loadData() {
    const results =
        await Promise.allSettled([
            api("/api/memories"),
            api("/api/documents"),
            api("/api/passwords")
        ]);

    const memoryData = results[0];
    const documentData = results[1];
    const passwordData = results[2];

    if (memoryData.status === "fulfilled") {
        memories =
            memoryData.value?.memories ||
            memoryData.value?.data ||
            [];
    } else {
        console.warn(
            "Memories could not be loaded:",
            memoryData.reason
        );
    }

    if (documentData.status === "fulfilled") {
        documents =
            documentData.value?.documents ||
            documentData.value?.data ||
            [];
    } else {
        console.warn(
            "Documents could not be loaded:",
            documentData.reason
        );
    }

    if (passwordData.status === "fulfilled") {
        passwords =
            passwordData.value?.passwords ||
            passwordData.value?.data ||
            [];
    } else {
        console.warn(
            "Passwords could not be loaded:",
            passwordData.reason
        );
    }

    renderAll();
}

function renderAll() {
    const memoryCount =
        document.getElementById("memoryCount");

    const documentCount =
        document.getElementById("documentCount");

    const passwordCount =
        document.getElementById("passwordCount");

    if (memoryCount) {
        memoryCount.textContent =
            memories.length;
    }

    if (documentCount) {
        documentCount.textContent =
            documents.length;
    }

    if (passwordCount) {
        passwordCount.textContent =
            passwords.length;
    }

    renderMemories();
    renderDocuments();
    renderPasswords();
    renderVaultPasswords();
}

function renderMemories(filter = "") {
    const grid =
        document.getElementById("memoryGrid");

    if (!grid) return;

    const query =
        String(filter || "").toLowerCase();

    const items =
        memories.filter(item => {
            const text =
                `${item.title || ""} ${item.content || ""}`
                    .toLowerCase();

            return text.includes(query);
        });

    if (!items.length) {
        grid.innerHTML = `
            <div class="empty">
                No memories found.<br>
                Create your first memory to preserve something important.
            </div>
        `;

        return;
    }

    grid.innerHTML =
        items.map(item => `
            <div class="item-card">

                <div class="item-icon">
                    🧠
                </div>

                <div class="item-title">
                    ${escapeHTML(
                        item.title ||
                        "Untitled memory"
                    )}
                </div>

                <div class="item-desc">
                    ${escapeHTML(
                        item.content ||
                        item.description ||
                        "Private memory"
                    )}
                </div>

                <div class="item-meta">
                    ${escapeHTML(
                        item.createdAt ||
                        "Saved securely"
                    )}
                </div>

            </div>
        `).join("");
}

function renderDocuments(filter = "") {
    const grid =
        document.getElementById("documentGrid");

    if (!grid) return;

    const query =
        String(filter || "").toLowerCase();

    const items =
        documents.filter(item => {
            const text =
                `${item.name || ""} ${item.title || ""} ${item.description || ""}`
                    .toLowerCase();

            return text.includes(query);
        });

    if (!items.length) {
        grid.innerHTML = `
            <div class="empty">
                No documents found.<br>
                Add an important document to your private workspace.
            </div>
        `;

        return;
    }

    grid.innerHTML =
        items.map(item => `
            <div class="item-card">

                <div class="item-icon">
                    📄
                </div>

                <div class="item-title">
                    ${escapeHTML(
                        item.name ||
                        item.title ||
                        "Untitled document"
                    )}
                </div>

                <div class="item-desc">
                    ${escapeHTML(
                        item.description ||
                        "Protected document"
                    )}
                </div>

                <div class="item-meta">
                    ${escapeHTML(
                        item.createdAt ||
                        "Saved securely"
                    )}
                </div>

            </div>
        `).join("");
}

function renderPasswords() {
    const list =
        document.getElementById("passwordList");

    if (!list) return;

    if (!passwords.length) {
        list.innerHTML = `
            <div class="empty">
                No saved passwords yet.<br>
                Add one so you never have to worry about forgetting it.
            </div>
        `;

        return;
    }

    list.innerHTML =
        passwords.map(
            (item, index) => `
                <div class="password-item">

                    <div
                        class="item-icon"
                        style="margin:0;"
                    >
                        🔑
                    </div>

                    <div class="password-site">

                        <strong>
                            ${escapeHTML(
                                item.name ||
                                item.website ||
                                "Saved account"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.username ||
                                item.email ||
                                "Private credential"
                            )}
                        </span>

                    </div>

                    <div class="password-hidden">
                        ••••••••
                    </div>

                    <div class="item-actions">

                        <button
                            class="small-button"
                            data-password-index="${index}"
                        >
                            View
                        </button>

                    </div>

                </div>
            `
        ).join("");

    list
        .querySelectorAll(
            "[data-password-index]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.passwordIndex
                        );

                    openPasswordViewer(
                        passwords[index]
                    );
                }
            );
        });
}

function renderVaultPasswords() {
    const target =
        document.getElementById(
            "vaultPasswordList"
        );

    if (!target) return;

    if (!passwords.length) {
        target.innerHTML = `
            <div class="empty">
                Your secure vault is empty.
            </div>
        `;

        return;
    }

    target.innerHTML =
        passwords.map(
            (item, index) => `
                <div class="password-item">

                    <div
                        class="item-icon"
                        style="margin:0;"
                    >
                        🔐
                    </div>

                    <div class="password-site">

                        <strong>
                            ${escapeHTML(
                                item.name ||
                                item.website ||
                                "Credential"
                            )}
                        </strong>

                        <span>
                            ${escapeHTML(
                                item.username ||
                                item.email ||
                                ""
                            )}
                        </span>

                    </div>

                    <div class="password-hidden">
                        ••••••••
                    </div>

                    <button
                        class="small-button"
                        data-vault-index="${index}"
                    >
                        View
                    </button>

                </div>
            `
        ).join("");

    target
        .querySelectorAll(
            "[data-vault-index]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.vaultIndex
                        );

                    openPasswordViewer(
                        passwords[index]
                    );
                }
            );
        });
}

function openPasswordViewer(item) {
    if (!item) return;

    openModal(
        "Saved Password",
        "Sensitive credentials should only be displayed after backend authorization.",
        `
            <div class="field">

                <label>
                    Website / Service
                </label>

                <input
                    value="${escapeAttribute(
                        item.name ||
                        item.website ||
                        ""
                    )}"
                    readonly
                >

            </div>

            <div
                class="field"
                style="margin-top:12px;"
            >

                <label>
                    Username / Email
                </label>

                <input
                    value="${escapeAttribute(
                        item.username ||
                        item.email ||
                        ""
                    )}"
                    readonly
                >

            </div>

            <div
                class="field"
                style="margin-top:12px;"
            >

                <label>
                    Password
                </label>

                <input
                    value="${escapeAttribute(
                        item.password ||
                        ""
                    )}"
                    type="password"
                    id="viewPasswordField"
                    readonly
                >

            </div>
        `,
        null,
        true
    );
}

function openModal(
    title,
    subtitle,
    content,
    saveHandler = null,
    hideSave = false
) {
    if (!modal) return;

    modalTitle.textContent =
        title;

    modalSubtitle.textContent =
        subtitle;

    modalContent.innerHTML =
        content;

    modalSave.style.display =
        hideSave
            ? "none"
            : "block";

    modal.classList.add("show");

    modalSave.onclick =
        saveHandler ||
        (() => closeModal());
}

function closeModal() {
    if (!modal) return;

    modal.classList.remove("show");

    modalContent.innerHTML = "";

    modalSave.onclick = null;
}

modalCancel?.addEventListener(
    "click",
    closeModal
);

modal?.addEventListener(
    "click",
    event => {

        if (
            event.target === modal
        ) {
            closeModal();
        }

    }
);

function openMemoryCreator() {
    openModal(
        "Create memory",
        "Preserve something important for your future self.",
        `
            <div class="field">

                <label>
                    Memory title
                </label>

                <input
                    id="memoryTitleInput"
                    placeholder="Example: My first day at university"
                >

            </div>

            <div
                class="field"
                style="margin-top:13px;"
            >

                <label>
                    Memory
                </label>

                <textarea
                    id="memoryContentInput"
                    placeholder="Write the memory you want to preserve..."
                ></textarea>

            </div>
        `,
        saveMemory
    );
}

async function saveMemory() {
    const title =
        document.getElementById(
            "memoryTitleInput"
        )?.value.trim();

    const content =
        document.getElementById(
            "memoryContentInput"
        )?.value.trim();

    if (!title || !content) {
        showToast(
            "Enter a title and memory.",
            "error"
        );

        return;
    }

    try {
        const data =
            await api(
                "/api/memories",
                {
                    method: "POST",
                    body: JSON.stringify({
                        title,
                        content
                    })
                }
            );

        memories.unshift(
            data.memory || {
                title,
                content,
                createdAt: "Just now"
            }
        );

        closeModal();
        renderAll();

        showToast(
            "Memory saved securely."
        );

    } catch (error) {

        console.error(
            "Save memory error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save memory.",
            "error"
        );
    }
}

function openDocumentCreator() {
    openModal(
        "Add document",
        "Store information about an important document.",
        `
            <div class="field">

                <label>
                    Document name
                </label>

                <input
                    id="documentNameInput"
                    placeholder="Example: Passport"
                >

            </div>

            <div
                class="field"
                style="margin-top:13px;"
            >

                <label>
                    Description
                </label>

                <textarea
                    id="documentDescriptionInput"
                    placeholder="Add useful information about this document..."
                ></textarea>

            </div>
        `,
        saveDocument
    );
}

async function saveDocument() {
    const name =
        document.getElementById(
            "documentNameInput"
        )?.value.trim();

    const description =
        document.getElementById(
            "documentDescriptionInput"
        )?.value.trim();

    if (!name) {
        showToast(
            "Enter the document name.",
            "error"
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/documents",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        description
                    })
                }
            );

        documents.unshift(
            data.document || {
                name,
                description,
                createdAt: "Just now"
            }
        );

        closeModal();
        renderAll();

        showToast(
            "Document information saved."
        );

    } catch (error) {

        console.error(
            "Save document error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save document.",
            "error"
        );
    }
}

function openPasswordCreator() {
    openModal(
        "Save password",
        "Store a credential so you never have to worry about forgetting it.",
        `
            <div class="field">

                <label>
                    Website / Service
                </label>

                <input
                    id="passwordNameInput"
                    placeholder="Example: Google"
                >

            </div>

            <div
                class="field"
                style="margin-top:12px;"
            >

                <label>
                    Username / Email
                </label>

                <input
                    id="passwordUsernameInput"
                    placeholder="Your username or email"
                >

            </div>

            <div
                class="field"
                style="margin-top:12px;"
            >

                <label>
                    Password
                </label>

                <input
                    id="passwordValueInput"
                    type="password"
                    placeholder="Enter password"
                >

            </div>

            <div
                class="field"
                style="margin-top:12px;"
            >

                <label>
                    Notes
                </label>

                <textarea
                    id="passwordNotesInput"
                    style="min-height:90px;"
                    placeholder="Optional notes"
                ></textarea>

            </div>
        `,
        savePassword
    );
}

async function savePassword() {
    const name =
        document.getElementById(
            "passwordNameInput"
        )?.value.trim();

    const username =
        document.getElementById(
            "passwordUsernameInput"
        )?.value.trim();

    const password =
        document.getElementById(
            "passwordValueInput"
        )?.value;

    const notes =
        document.getElementById(
            "passwordNotesInput"
        )?.value.trim();

    if (
        !name ||
        !username ||
        !password
    ) {
        showToast(
            "Website, username and password are required.",
            "error"
        );

        return;
    }

    try {

        const data =
            await api(
                "/api/passwords",
                {
                    method: "POST",
                    body: JSON.stringify({
                        name,
                        username,
                        password,
                        notes
                    })
                }
            );

        passwords.unshift(
            data.password || {
                name,
                username,
                password,
                notes
            }
        );

        closeModal();
        renderAll();

        showToast(
            "Password saved securely."
        );

    } catch (error) {

        console.error(
            "Save password error:",
            error
        );

        showToast(
            error.message ||
            "Unable to save password.",
            "error"
        );
    }
}

async function sendAIMessage() {
    const input =
        document.getElementById(
            "aiInput"
        );

    const chat =
        document.getElementById(
            "chat"
        );

    if (!input || !chat) return;

    const text =
        input.value.trim();

    if (!text) return;

    const userMessage =
        document.createElement(
            "div"
        );

    userMessage.className =
        "message user";

    userMessage.textContent =
        text;

    chat.appendChild(
        userMessage
    );

    input.value = "";

    chat.scrollTop =
        chat.scrollHeight;

    const thinking =
        document.createElement(
            "div"
        );

    thinking.className =
        "message ai";

    thinking.textContent =
        "Legacy Lens AI is thinking...";

    chat.appendChild(
        thinking
    );

    try {

        const data =
            await api(
                "/api/ai/chat",
                {
                    method: "POST",
                    body: JSON.stringify({
                        message: text
                    })
                }
            );

        if (
            data?.success === false
        ) {
            throw new Error(
                data.message ||
                "AI request failed."
            );
        }

        thinking.textContent =
            data?.reply ||
            data?.message ||
            "I could not generate a response.";

    } catch (error) {

        console.error(
            "AI request error:",
            error
        );

        thinking.textContent =
            "AI Error: " +
            (
                error.message ||
                "Unable to connect to Legacy Lens AI."
            );
    }

    chat.scrollTop =
        chat.scrollHeight;
}

document
    .getElementById("sendAI")
    ?.addEventListener(
        "click",
        sendAIMessage
    );

document
    .getElementById("aiInput")
    ?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendAIMessage();
            }

        }
    );

document
    .getElementById("newMemoryButton")
    ?.addEventListener(
        "click",
        openMemoryCreator
    );

document
    .getElementById("newDocumentButton")
    ?.addEventListener(
        "click",
        openDocumentCreator
    );

document
    .getElementById("newPasswordButton")
    ?.addEventListener(
        "click",
        openPasswordCreator
    );

document
    .getElementById("addPasswordVault")
    ?.addEventListener(
        "click",
        openPasswordCreator
    );

document
    .querySelectorAll("[data-action]")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const action =
                    button.dataset.action;

                if (
                    action === "memory"
                ) {
                    navigate("memories");
                    openMemoryCreator();
                }

                if (
                    action === "document"
                ) {
                    navigate("documents");
                    openDocumentCreator();
                }

                if (
                    action === "password"
                ) {
                    navigate("passwords");
                    openPasswordCreator();
                }

                if (
                    action === "ai"
                ) {
                    navigate("ai");
                }

            }
        );

    });

document
    .getElementById("memorySearch")
    ?.addEventListener(
        "input",
        event => {

            renderMemories(
                event.target.value
            );

        }
    );

document
    .getElementById("documentSearch")
    ?.addEventListener(
        "input",
        event => {

            renderDocuments(
                event.target.value
            );

        }
    );

document
    .getElementById("refreshAccount")
    ?.addEventListener(
        "click",
        async () => {

            const loaded =
                await loadAccount();

            if (loaded) {
                showToast(
                    "Account information refreshed."
                );
            } else {
                showToast(
                    "Account information is currently unavailable.",
                    "error"
                );
            }

        }
    );

document
    .getElementById("logoutButton")
    ?.addEventListener(
        "click",
        logout
    );

document
    .getElementById("securityLogout")
    ?.addEventListener(
        "click",
        logout
    );

async function logout() {
    try {

        await api(
            "/api/auth/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.warn(
            "Logout backend request failed:",
            error.message
        );

    } finally {

        sessionStorage.clear();

        localStorage.removeItem(
            "legacyLensUser"
        );

        window.location.href =
            "index.html";
    }
}

document
    .getElementById("searchButton")
    ?.addEventListener(
        "click",
        () => {

            navigate("memories");

            document
                .getElementById(
                    "memorySearch"
                )
                ?.focus();

        }
    );

document
    .getElementById("notificationsButton")
    ?.addEventListener(
        "click",
        () => {

            showToast(
                "No new security notifications."
            );

        }
    );

function escapeHTML(value) {
    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character])
        );
}

function escapeAttribute(value) {
    return escapeHTML(value)
        .replace(
            /`/g,
            "&#096;"
        );
}

async function initializeDashboard() {

    console.log(
        "Initializing Legacy Lens AI dashboard..."
    );

    const backendOnline =
        await checkBackend();

    if (!backendOnline) {

        showToast(
            "Backend is offline. Start your Node.js server.",
            "error"
        );

    }

    await loadAccount();

    await loadData();

    console.log(
        "Legacy Lens AI dashboard initialized."
    );
}

initializeDashboard();
