import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [theme, setTheme] = useState('default'); // Add theme state
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 2000); // Simulated loading screen
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) setTheme(storedTheme);

    const storedUsername = localStorage.getItem('username');
    const storedProfilePicture = localStorage.getItem('profilePicture');
    setUsername(storedUsername || '');
    setProfilePicture(storedProfilePicture || '');

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

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim() || !profilePicture.trim()) return;

    const timestamp = new Date().toISOString();
    await supabase
      .from('messages')
      .insert([{ username, message: newMessage, profile_picture: profilePicture, timestamp }]);
    setNewMessage('');
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  if (loading) {
    return <div id="loading-screen">🔥 Loading LitChat... 🔥</div>;
  }

  return (
    <div id="chat-container">
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      <div id="username-container">
        <label>Username:</label>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            localStorage.setItem('username', e.target.value);
          }}
        />
      </div>

      <div id="profile-picture-container">
        <label>Profile Picture URL:</label>
        <input
          type="text"
          placeholder="Enter image URL"
          value={profilePicture}
          onChange={(e) => {
            setProfilePicture(e.target.value);
            localStorage.setItem('profilePicture', e.target.value);
          }}
        />
      </div>

      <div>
        <label>Theme:</label>
        <select value={theme} onChange={(e) => changeTheme(e.target.value)}>
          <option value="default">Default</option>
          <option value="sunset">Sunset</option>
          <option value="fire">Fire</option>
          <option value="void">Void</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <div id="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <img
              src={msg.profile_picture || '/default-avatar.png'}
              alt="PFP"
              className="pfp"
            />
            <div>
              <strong className="username">{msg.username}</strong>{' '}
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              <p>{msg.message}</p>
            </div>
          </div>
        ))}
      </div>

      <form id="send-form" onSubmit={sendMessage}>
        <input
          type="text"
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}