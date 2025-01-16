import { createClient } from "@supabase/supabase-js";

// Supabase Configuration
const supabaseUrl = "https://jpphrvektvbpdxuvtgmw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGhydmVrdHZicGR4dXZ0Z213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDE0ODUsImV4cCI6MjA1MTA3NzQ4NX0.3gyADNnD_r9ERElETL8eg5OQVn9wQ3o3RMAC3JkNn9Q";
const supabase = createClient(supabaseUrl, supabaseKey);

// HTML Elements
const messagesDiv = document.getElementById("messages");
const sendForm = document.getElementById("send-form");
const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input");
const clearChatBtn = document.getElementById("clear-chat-btn");

// Fetch Messages from Supabase
async function fetchMessages() {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Clear the current messages
    messagesDiv.innerHTML = "";

    // Render messages
    data.forEach(({ username, message, timestamp }) => {
      const messageElement = document.createElement("div");
      messageElement.innerHTML = `
        <strong>${DOMPurify.sanitize(username)}:</strong> 
        ${DOMPurify.sanitize(message)} 
        <small>${new Date(timestamp).toLocaleString()}</small>
      `;
      messagesDiv.appendChild(messageElement);
    });
  } catch (err) {
    console.error("Unexpected error fetching messages:", err);
  }
}

// Send a Message
sendForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  const username = usernameInput.value.trim();

  if (!message || !username) {
    alert("Please fill in all fields!");
    return;
  }

  try {
    const { error } = await supabase.from("messages").insert([
      {
        username: username,
        message: message,
        timestamp: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    messageInput.value = ""; // Clear the message input
    await fetchMessages(); // Refresh the messages
  } catch (err) {
    console.error("Unexpected error sending message:", err);
  }
});

// Clear Chat (Admin Feature)
clearChatBtn.addEventListener("click", async () => {
  try {
    const { error } = await supabase.from("messages").delete().neq("id", 0);

    if (error) {
      console.error("Error clearing messages:", error);
      return;
    }

    await fetchMessages();
  } catch (err) {
    console.error("Unexpected error clearing chat:", err);
  }
});

// Real-Time Updates
supabase
  .channel("public:messages")
  .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchMessages)
  .subscribe();

// Initial Fetch
fetchMessages();
