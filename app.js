import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove, get } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let pfp = localStorage.getItem("pfp") || "";
if (pfp === "") {
  localStorage.setItem("pfp", "aHR0cHM6Ly90ci5yYnhjZG4uY29tLzE4MERBWS1hMzFjMThkMmI5YTFiM2MzODM3OTljMzIwNmJlY2VlYy80MjAvNDIwL0ltYWdlL1BuZy9ub0ZpbHRlcg")
}

// Function to clear database
async function clearDatabase() {
  try {
    const apiKey = "AIzaSyAw6IN7sKZ3q8kcC0yuLB6cNhxLJ0QHUQU"; 
    const databaseURL = "https://ember-studios-chatroom-73885-default-rtdb.firebaseio.com/";
    const response = await fetch(`${databaseURL}.json?auth=${apiKey}`, { method: "DELETE" });

    if (response.ok) {
      console.log("Messages cleared successfully!");
    } else {
      console.error("Error clearing messages:", response.status, response.statusText);
    }
  } catch (error) {
    console.error("Request failed:", error);
  }
}

// DOM Elements
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendForm = document.getElementById("send-form");
const usernameInput = document.getElementById("username-input");
const pfpInput = document.getElementById("pfp-input");
const emojiButton = document.getElementById("emoji-button");
const emojiModal = document.getElementById("emoji-modal");
const closeEmojiModal = document.getElementById("close-emoji-modal");
const emojiList = document.getElementById("emoji-list");
const clearChatBtn = document.getElementById("clear-chat-btn");

// Reference to the "messages" and "usernames" in the database
const messagesRef = ref(db, "messages");
const usernamesRef = ref(db, "usernames");

// Get stored username from localStorage
let username = localStorage.getItem("username") || "";
// Check if username exists in Firebase and apply it
if (username) {
  usernameInput.value = username;
  toggleClearChatButton(username);
}
if (pfp) {
  pfpInput.value = atob(pfp);
}

// Event listener for username input field
usernameInput.addEventListener("input", async () => {
  const newUsername = usernameInput.value.trim();
  const sanitizedUsername = sanitizeText(newUsername);

  if (newUsername && newUsername !== username) {
    const usernameExists = await checkUsernameUnique(sanitizedUsername);
    if (usernameExists) {
      alert("Username is already taken, please choose another.");
      return;
    }

    // Remove old username from Firebase (if any)
    if (username) {
      await remove(ref(db, `usernames/${username.toLowerCase()}`));
    }

    // Save the new username to Firebase (case-insensitive)
    username = sanitizedUsername;
    localStorage.setItem("username", username);
    update(ref(db, `usernames/${username.toLowerCase()}`), { username: sanitizedUsername });
  }
});

pfpInput.addEventListener("input", async () => {
  const newPfp = pfpInput.value.trim();
  let base64encodedpfp = btoa(newPfp);
  // Remove old username from Firebase (if any)
  if (pfp) {
    await remove(ref(db, `pfps/${base64encodedpfp.toLowerCase()}`));
  }

  // Save the new username to Firebase (case-insensitive)
  pfp = base64encodedpfp;
  localStorage.setItem("pfp", base64encodedpfp);
  update(ref(db, `pfps/"${base64encodedpfp.toLowerCase()}"`), { pfp: base64encodedpfp });
});

function toggleClearChatButton(username) {
  if (username === "EmberAdmin") {
    clearChatBtn.style.display = "block";
  } else {
    clearChatBtn.style.display = "none";
  }
}

// Firebase listener for messages
onValue(messagesRef, (snapshot) => {
  const data = snapshot.val();
  messagesDiv.innerHTML = ""; // Clear messagesDiv
  for (const id in data) {
    const message = data[id];
    const messageElement = document.createElement("div");
    const sanitizedText = sanitizeText(message.text);
    const messageText = sanitizedText.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
    
    messageElement.innerHTML = `
      <span class="pfp-span"><img height=30px width=30px src="${(atob(message.pfp))}"></span>
      <span class="username">${sanitizeText(message.username)}</span>: ${messageText}
      <span class="timestamp">${message.timestamp}</span>
      <button class="edit-button" data-id="${id}">✍</button>
      <button class="delete-button" data-id="${id}">🗑</button>
    `;
    messagesDiv.appendChild(messageElement);
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
});

// Sanitize text
function sanitizeText(text) {
  return DOMPurify.sanitize(text);
}

// Check username uniqueness
async function checkUsernameUnique(username) {
  const snapshot = await get(ref(db, `usernames/${username.toLowerCase()}`));
  return snapshot.exists();
}

// Send message
sendForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const messageText = sanitizeText(messageInput.value.trim());
  if (!messageText) return;

  push(messagesRef, {
    text: messageText,
    username,
    timestamp: new Date</antArtifact>