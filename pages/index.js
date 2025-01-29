import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [profilePicture, setProfilePicture] = useState(localStorage.getItem('profilePicture') || '');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'default');
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Simulate loading screen
    setTimeout(() => setLoading(false), 2000);

    // Apply stored theme
    document.body.setAttribute('data-theme', theme);

    // Fetch messages
    fetchMessages();

    // Realtime listener
    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    // Scroll to the latest message
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Update theme dynamically
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchMessages = async () => {
    const { data, error } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim()) return;

    const timestamp = new Date().toISOString();
    const pfpToUse = profilePicture.trim() || '/default-avatar.png';

    const { error } = await supabase.from('messages').insert([
      { username, message: newMessage, profile_picture: pfpToUse, timestamp },
    ]);

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setNewMessage('');
    }
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    localStorage.setItem('username', value);
  };

  const handleProfilePictureChange = (e) => {
    setProfilePicture(e.target.value);
    localStorage.setItem('profilePicture', e.target.value);
  };

  if (loading) {
    return (
      <div id="loading-screen">
        <h1>🔥 Loading LitChat... 🔥</h1>
        <div id="loading-bar"><span></span></div>
      </div>
    );
  }

  return (
    <div id="chat-container">
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      {/* Theme Selector */}
      <div id="theme-selector">
        <label htmlFor="theme-dropdown">Theme:</label>
        <select
          id="theme-dropdown"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        >
          <option value="default">Default</option>
          <option value="sunset">Sunset</option>
          <option value="fire">Fire</option>
          <option value="blue-fire">Blue Fire</option>
          <option value="void">Void</option>
          <option value="acid">Acid</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      {/* Username Input */}
      <div id="username-container">
        <label>Username:</label>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={handleUsernameChange}
        />
      </div>

      {/* Profile Picture Input */}
      <div id="profile-picture-container">
        <label>Profile Picture URL:</label>
        <input
          type="text"
          placeholder="Enter your profile picture URL"
          value={profilePicture}
          onChange={handleProfilePictureChange}
        />
      </div>

      {/* Messages Container */}
      <div id="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <img
              src={msg.profile_picture || '/default-avatar.png'}
              alt="PFP"
              className="pfp"
            />
            <div>
              <strong className="username">{msg.username}</strong>
              <span className="timestamp">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
              <p>{msg.message}</p>
            </div>
          </div>
        ))}
        {/* Invisible div to scroll to bottom */}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Message Input Form */}
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