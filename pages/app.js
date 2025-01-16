import React, { useEffect, useState } from 'react'; // Import React
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');

  const messagesDiv = React.useRef(null); // To scroll the messages container

  // Fetch messages from Supabase
  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data); // Update state with messages
    } catch (err) {
      console.error('Unexpected error fetching messages:', err);
    }
  }

  // Send a message
  const sendMessage = async (event) => {
    event.preventDefault();

    if (!message || !username) {
      alert('Please fill in all fields!');
      return;
    }

    try {
      const { error } = await supabase.from('messages').insert([
        {
          username: username,
          message: message,
          timestamp: new Date().toISOString(),
        },
      ]);

      if (error) {
        console.error('Error sending message:', error);
        return;
      }

      setMessage(''); // Clear the message input
      fetchMessages(); // Refresh the messages
    } catch (err) {
      console.error('Unexpected error sending message:', err);
    }
  };

  // Clear chat (admin only feature)
  const clearChat = async () => {
    try {
      const { error } = await supabase.from('messages').delete().neq('id', 0);

      if (error) {
        console.error('Error clearing messages:', error);
        return;
      }

      fetchMessages(); // Refresh the messages
    } catch (err) {
      console.error('Unexpected error clearing chat:', err);
    }
  };

  // Subscribe to real-time updates from Supabase
  useEffect(() => {
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, fetchMessages)
      .subscribe();

    fetchMessages(); // Initial fetch

    // Cleanup on component unmount
    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Scroll to the bottom when new messages arrive
  useEffect(() => {
    if (messagesDiv.current) {
      messagesDiv.current.scrollTop = messagesDiv.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div>
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      <div id="chat-container">
        <div id="username-container">
          Username:
          <input
            type="text"
            id="username-input"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div id="messages" ref={messagesDiv}>
          {messages.map(({ id, username, message, timestamp }) => (
            <div key={id}>
              <strong>{username}:</strong> {message}
              <small>{new Date(timestamp).toLocaleString()}</small>
            </div>
          ))}
        </div>

        <form id="send-form" onSubmit={sendMessage}>
          <input
            type="text"
            id="message-input"
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <button type="submit">Send</button>
        </form>

        <button
          id="clear-chat-btn"
          style={{ display: username === 'EmberAdmin' ? 'block' : 'none' }}
          onClick={clearChat}
        >
          Clear Chat
        </button>
      </div>
    </div>
  );
}