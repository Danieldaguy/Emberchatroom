import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://jpphrvektvbpdxuvtgmw.supabase.co"; // Replace with your Supabase URL
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGhydmVrdHZicGR4dXZ0Z213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDE0ODUsImV4cCI6MjA1MTA3NzQ4NX0.3gyADNnD_r9ERElETL8eg5OQVn9wQ3o3RMAC3JkNn9Q
"; // Replace with your Supabase anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// DOM Elements
const usernameInput = document.getElementById("username-input");
const messageInput = document.getElementById("message-input");
const messagesDiv = document.getElementById("messages");
const sendForm = document.getElementById("send-form");
const clearChatBtn = document.getElementById("clear-chat-btn");

// Fetch messages from Supabase and display them
async function fetchMessages() {
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return;
  }

  messagesDiv.innerHTML = "";
  messages.forEach((message) => {
    const messageElement = document.createElement("div");
    messageElement.innerHTML = `<strong>${message.username}:</strong> ${message.message}`;
    messagesDiv.appendChild(messageElement);
  });
}

// Send a new message
sendForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = DOMPurify.sanitize(usernameInput.value.trim());
  const message = DOMPurify.sanitize(messageInput.value.trim());

  if (!username || !message) {
    alert("Please enter a username and message.");
    return;
  }

  const { error } = await supabase.from("messages").insert([
    {
      username,
      message,
      timestamp: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error("Error sending message:", error);
    return;
  }

  messageInput.value = ""; // Clear the input field
  await fetchMessages(); // Refresh the chat
});

// Clear all messages (optional, admin feature)
clearChatBtn.addEventListener("click", async () => {
  const { error } = await supabase.from("messages").delete().neq("id", 0);

  if (error) {
    console.error("Error clearing messages:", error);
    return;
  }

  await fetchMessages();
});

// Listen for real-time updates
supabase
  .channel("public:messages")
  .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchMessages)
  .subscribe();

// Fetch initial messages
fetchMessages();