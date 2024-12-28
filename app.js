import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// Enhanced security configuration
const securityConfig = {
  maxMessageLength: 1000,
  maxUsernameLength: 20,
  messageRateLimit: 3000, // milliseconds between messages
  bannedWords: ['script', 'eval', 'onload', 'onerror', 'alert', 'javascript:', 'vbscript:', 'data:'],
  maxMessagesPerUser: 50,
  maxImageSize: 2 * 1024 * 1024, // 2MB in bytes
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxConcurrentRequests: 5
};

// Rate limiting and security tracking
const messageTimestamps = new Map();
const userMessageCounts = new Map();
const requestCount = { current: 0 };
const bannedIPs = new Set();
const suspiciousActivity = new Map();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAw6IN7sKZ3q8kcC0yuLB6cNhxLJ0QHUQU",
  authDomain: "ember-studios-chatroom-73885.firebaseapp.com",
  databaseURL: "https://ember-studios-chatroom-73885-default-rtdb.firebaseio.com",
  projectId: "ember-studios-chatroom-73885",
  storageBucket: "ember-studios-chatroom-73885.appspot.com",
  messagingSenderId: "563168350862",
  appId: "1:563168350862:web:c801f8696f7ab9f5e8efdf",
  measurementId: "G-LQDGZVJ2JM"
};

// Initialize Firebase with enhanced security
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Security utility functions
function sanitizeHTML(str) {
  return DOMPurify.sanitize(str, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    USE_PROFILES: { html: false }
  });
}

function isRateLimited(userId) {
  const now = Date.now();
  const userTimestamps = messageTimestamps.get(userId) || [];
  
  // Clean up old timestamps
  const recentTimestamps = userTimestamps.filter(ts => now - ts < securityConfig.messageRateLimit);
  messageTimestamps.set(userId, recentTimestamps);
  
  // Check rate limit
  if (recentTimestamps.length >= 3) { // Max 3 messages per rate limit window
    return true;
  }
  
  // Add new timestamp
  recentTimestamps.push(now);
  messageTimestamps.set(userId, recentTimestamps);
  return false;
}

async function validateRequest() {
  if (requestCount.current >= securityConfig.maxConcurrentRequests) {
    throw new Error('Too many concurrent requests');
  }
  requestCount.current++;
  
  try {
    // Add request validation logic here
    return true;
  } finally {
    requestCount.current--;
  }
}

function validateInput(input, type = 'message') {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Initial sanitization
  const sanitized = sanitizeHTML(input);
  
  // Length checks
  const maxLength = type === 'message' ? securityConfig.maxMessageLength : securityConfig.maxUsernameLength;
  if (sanitized.length === 0 || sanitized.length > maxLength) {
    return false;
  }

  // Check for banned words and patterns
  const containsBannedWord = securityConfig.bannedWords.some(word => 
    sanitized.toLowerCase().includes(word.toLowerCase())
  );
  if (containsBannedWord) {
    return false;
  }

  // Pattern checks
  const maliciousPatterns = [
    /<[^>]*>/,                 // HTML tags
    /javascript:/i,            // JavaScript protocol
    /data:/i,                 // Data protocol
    /vbscript:/i,            // VBScript protocol
    /on\w+\s*=/i,           // Event handlers
    /&#x[0-9a-f]+;/i,      // Hex encoded characters
    /\\x[0-9a-f]{2}/i,    // Hex escape sequences
    /expression\s*\(/i,   // CSS expressions
    /url\s*\(/i          // CSS URLs
  ];

  if (maliciousPatterns.some(pattern => pattern.test(sanitized))) {
    return false;
  }

  // For usernames, additional restrictions
  if (type === 'username') {
    const usernamePattern = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernamePattern.test(sanitized)) {
      return false;
    }
  }

  return sanitized;
}

async function validateImage(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol !== 'https:') {
      return false;
    }

    const response = await fetch(url, {
      method: 'HEAD',
      headers: { 'Accept': 'image/*' }
    });

    if (!response.ok) return false;

    const contentType = response.headers.get('content-type');
    if (!securityConfig.allowedImageTypes.includes(contentType)) {
      return false;
    }

    const contentLength = response.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) > securityConfig.maxImageSize) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Image validation error:', error);
    return false;
  }
}

// Initialize secure user state
let pfp = localStorage.getItem("pfp") || "";
if (!pfp) {
  const defaultPfp = "aHR0cHM6Ly90ci5yYnhjZG4uY29tLzE4MERBWS1hMzFjMThkMmI5YTFiM2MzODM3OTljMzIwNmJlY2VlYy80MjAvNDIwL0ltYWdlL1BuZy9ub0ZpbHRlcg";
  pfp = defaultPfp;
  localStorage.setItem("pfp", defaultPfp);
}

// Secure DOM element access
const elements = {
  messagesDiv: document.getElementById("messages"),
  messageInput: document.getElementById("message-input"),
  sendForm: document.getElementById("send-form"),
  usernameInput: document.getElementById("username-input"),
  pfpInput: document.getElementById("pfp-input"),
  emojiButton: document.getElementById("emoji-button"),
  emojiModal: document.getElementById("emoji-modal"),
  closeEmojiModal: document.getElementById("close-emoji-modal"),
  emojiList: document.getElementById("emoji-list"),
  clearChatBtn: document.getElementById("clear-chat-btn")
};

// Verify all required elements exist
Object.entries(elements).forEach(([key, element]) => {
  if (!element) {
    throw new Error(`Required element "${key}" not found. Possible tampering detected.`);
  }
});

// Database references
const messagesRef = ref(db, "messages");
const usernamesRef = ref(db, "usernames");
const bannedUsersRef = ref(db, "bannedUsers");

// Get stored username with validation
let username = validateInput(localStorage.getItem("username"), 'username') || "";

// Event listener for username input with enhanced security
elements.usernameInput.addEventListener("input", async () => {
  if (!(await validateRequest())) return;

  const newUsername = elements.usernameInput.value.trim();
  const sanitizedUsername = validateInput(newUsername, 'username');
  
  if (!sanitizedUsername) {
    alert("Invalid username. Please use 3-20 characters (letters, numbers, underscore, hyphen).");
    elements.usernameInput.value = username;
    return;
  }

  if (newUsername && newUsername !== username) {
    try {
      // Check if user is banned
      const bannedSnapshot = await get(ref(db, `bannedUsers/${newUsername.toLowerCase()}`));
      if (bannedSnapshot.exists()) {
        alert("This username is not available.");
        elements.usernameInput.value = username;
        return;
      }

      const usernameExists = await checkUsernameUnique(sanitizedUsername);
      if (usernameExists) {
        alert("Username is already taken, please choose another.");
        return;
      }

      if (username) {
        await remove(ref(db, `usernames/${username.toLowerCase()}`));
      }

      username = sanitizedUsername;
      localStorage.setItem("username", username);
      
      await update(ref(db, `usernames/${username.toLowerCase()}`), {
        username: sanitizedUsername,
        lastUpdated: Date.now()
      });
      
      toggleClearChatButton(username);
    } catch (error) {
      console.error('Username update error:', error);
      alert("Failed to update username. Please try again.");
    }
  }
});

// Profile picture input with enhanced security
elements.pfpInput.addEventListener("input", async () => {
  if (!(await validateRequest())) return;

  const newPfp = elements.pfpInput.value.trim();
  
  try {
    if (!(await validateImage(newPfp))) {
      alert("Invalid image URL or file too large. Please use a valid HTTPS image under 2MB.");
      elements.pfpInput.value = atob(pfp);
      return;
    }
    
    const base64encodedpfp = btoa(newPfp);
    
    if (pfp) {
      await remove(ref(db, `pfps/${pfp.toLowerCase()}`));
    }

    pfp = base64encodedpfp;
    localStorage.setItem("pfp", base64encodedpfp);
    
    await update(ref(db, `pfps/${base64encodedpfp.toLowerCase()}`), {
      pfp: base64encodedpfp,
      lastUpdated: Date.now()
    });
  } catch (error) {
    console.error('Profile picture update error:', error);
    alert("Failed to update profile picture. Please try again.");
  }
});

// Message listener with security enhancements
onValue(messagesRef, (snapshot) => {
  try {
    const data = snapshot.val();
    elements.messagesDiv.innerHTML = "";
    
    if (!data) return;

    for (const id in data) {
      const message = data[id];
      
      // Validate message data
      if (!message || !message.text || !message.username || !message.timestamp || !message.pfp) {
        console.warn('Invalid message data detected:', id);
        continue;
      }

      const messageElement = document.createElement("div");
      const sanitizedText = validateInput(message.text);
      if (!sanitizedText) {
        console.warn('Message failed security validation:', id);
        continue;
      }

      // Create safe HTML with limited markdown and link support
      const messageText = sanitizedText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/(https?:\/\/[^\s]+)/g, (url) => {
          try {
            const safeUrl = new URL(url);
            if (safeUrl.protocol !== 'http:' && safeUrl.protocol !== 'https:') {
              return url;
            }
            return `<a href="${safeUrl.href}" target="_blank" rel="noopener noreferrer">${safeUrl.href}</a>`;
          } catch {
            return url;
          }
        });

      const safeUsername = validateInput(message.username, 'username');
      const timestamp = new Date(message.timestamp).toLocaleTimeString();

      messageElement.innerHTML = `
        <span class="pfp-span">
          <img height=30px width=30px src="${atob(message.pfp)}" 
               onerror="this.src='default-avatar.png'" 
               alt="Profile picture">
        </span>
        <span class="username">${safeUsername}</span>: 
        <span class="message-text">${messageText}</span>
        <span class="timestamp">${timestamp}</span>
        ${message.username === username ? `
          <button class="edit-button" data-id="${id}">✍</button>
          <button class="delete-button" data-id="${id}">🗑</button>
        ` : ''}
      `;

      // Add secure event listeners for message actions
      if (message.username === username) {
        const editButton = messageElement.querySelector(".edit-button");
        const deleteButton = messageElement.querySelector(".delete-button");

        editButton?.addEventListener("click", async () => {
          if (!(await validateRequest())) return;

          const newText = prompt("Edit your message:", message.text);
          if (newText !== null) {
            const sanitizedNewText = validateInput(newText.trim());
            if (sanitizedNewText) {
              await update(ref(db, `messages/${id}`), {
                text: sanitizedNewText,
                edited: true,
                editedAt: Date.now()
              });
            } else {
              alert("Invalid message content.");
            }
          }
        });

        deleteButton?.addEventListener("click", async () => {
          if (!(await validateRequest())) return;

          if (confirm("Are you sure you want to delete this message?")) {
            await remove(ref(db, `messages/${id}`));
          }
        });
      }

      elements.messagesDiv.appendChild(messageElement);
    }
    
    elements.messagesDiv.scrollTop = elements.messagesDiv.scrollHeight;
  } catch (error) {
    console.error('Message processing error:', error);
    alert("Error loading messages. Please refresh the page.");
  }
});

// Send message with enhanced security
elements.sendForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!(await validateRequest())) return;

  if (!username) {
    alert("Please set a username first.");
    return;
  }

  const messageText = elements.messageInput.value.trim();
  const sanitizedText = validateInput(messageText);
  
  if (!sanitizedText) {
    alert("Invalid message content. Please check your message and try again.");
    return;
  }

  if (isRateLimited(username)) {
    alert("Please wait a few seconds before sending another message.");
    return;
  }

  const userCount = userMessageCounts.get(username) || 0;
  if (userCount >= securityConfig.maxMessagesPerUser) {
    alert("You have reached the maximum number of messages allowed.");
    return;
  }
  let text = sanitizedText;
  try {
    await push(messagesRef, {
      text: sanitizedText,
      username,
      timestamp: Date.now(),
      pfp,
      clientTimestamp: new Date().toISOString()
    });

    userMessageCounts.set(username, user)
    } catch {
        console.log("message sent")
    }
  });
;
