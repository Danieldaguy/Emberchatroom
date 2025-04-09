import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [warnings, setWarnings] = useState(0); // Track user warnings
  const [spamTimer, setSpamTimer] = useState(null); // Timer for spam detection
  const [showWarning, setShowWarning] = useState(false); // Show warning modal
  const maxMessageLength = 200; // Character limit for messages
  const badWords = ['n!gga', 'nigga', 'nigger','nigg@','n!gg@','nigg3r','n!gger','n!gg3r','fag','f@g','f@gg0t','fagg0t','f@ggot']; // Replace with actual bad words
  const spamCooldown = 3000; // 3 seconds cooldown between messages

  useEffect(() => {
    checkAuth();
    fetchMessages();

    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
    if (!error) setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    // Check for character limit
    if (newMessage.length > maxMessageLength) {
      alert(`Message exceeds the ${maxMessageLength} character limit.`);
      return;
    }

    // Check for bad words
    const containsBadWords = badWords.some((word) => newMessage.toLowerCase().includes(word));
    if (containsBadWords) {
      alert('Your message contains inappropriate language. Please revise it.');
      return;
    }

    // Check for spam
    if (spamTimer) {
      setWarnings((prev) => prev + 1);
      setShowWarning(true);
      return;
    }

    // Set spam cooldown
    setSpamTimer(setTimeout(() => setSpamTimer(null), spamCooldown));

    const timestamp = new Date().toISOString();
    const username = user.user_metadata?.full_name || user.email.split('@')[0];
    const profilePicture =
      user.user_metadata?.avatar_url || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117';

    const payload = {
      username,
      email: user.email,
      message: newMessage,
      profile_picture: profilePicture,
      timestamp,
    };

    const { error } = await supabase.from('messages').insert([payload]);

    if (error) {
      console.error('Error inserting message:', error.message);
      return;
    }

    setNewMessage('');
  };

  const handleWarningClose = () => {
    setShowWarning(false);
    if (warnings >= 3) {
      alert('You have been temporarily muted for spamming.');
      // Add logic to mute the user if necessary
    }
  };

  return (
    <div id="chat-container">
      <header id="chat-header">
        <h1>🔥 LitChat 🔥</h1>
        <h5>By Ember Studios</h5>
        <button onClick={() => supabase.auth.signOut()}>Logout</button>
      </header>

      <div id="messages">
        {messages.map((message, index) => (
          <div className="message" key={index}>
            <img className="pfp" src={message.profile_picture} alt="profile" />
            <div>
              <strong className="username">{message.username}</strong>
              <p>{message.message}</p>
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>

      {/* Warning Modal */}
      {showWarning && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--container-bg)',
            padding: '20px',
            borderRadius: '12px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
          }}
        >
          <h3 style={{ color: 'var(--accent-color)' }}>Warning</h3>
          <p>You are sending messages too quickly. Please slow down.</p>
          <button
            onClick={handleWarningClose}
            style={{
              padding: '10px 20px',
              background: 'var(--danger-color)',
              color: 'var(--bg-color)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}