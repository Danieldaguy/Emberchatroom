import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

const messagesDiv = document.getElementById("messages");
const sendForm = document.getElementById("send-form");
const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username-input");
const pfpInput = document.getElementById("pfp-input");
const clearChatBtn = document.getElementById("clear-chat-btn");

// Fetch messages from Supabase
async function fetchMessages() {
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("timestamp", { ascending: true }); // Sort by timestamp

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    // Clear current messages
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

// Send a new message
sendForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  const username = usernameInput.value.trim();
  const pfp = pfpInput.value.trim();

  if (!message || !username || !pfp) {
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

    messageInput.value = ""; // Clear input
    await fetchMessages(); // Refresh chat
  } catch (err) {
    console.error("Unexpected error sending message:", err);
  }
});

// Clear all messages (admin feature)
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

// Listen for real-time updates
supabase
  .channel("public:messages")
  .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
    console.log("Realtime update detected, fetching messages...");
    fetchMessages();
  })
  .subscribe();

// Fetch initial messages
fetchMessages();