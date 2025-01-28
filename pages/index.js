import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
 
export default function Chatroom() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading screen
    setTimeout(() => setLoading(false), 3000);

    const storedTheme = localStorage.getItem('theme');
    if (storedTheme) {
      setTheme(storedTheme);
      document.body.setAttribute('data-theme', storedTheme);
    }

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

    // Add particle effects for themes with particles
    addParticles(storedTheme || 'default');

    return () => {
      supabase.removeChannel(channel);
      removeParticles();
    };
  }, []);

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

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    localStorage.setItem('username', value);
  };

  const handleProfilePictureChange = (e) => {
    const value = e.target.value;
    setProfilePicture(value);
    localStorage.setItem('profilePicture', value);
  };

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    removeParticles();
    addParticles(newTheme);
  };

  const addParticles = (theme) => {
    const container = document.createElement('div');
    container.id = 'particle-container';
    document.body.appendChild(container);

    const particleCount = theme === 'void' || theme === 'fire' || theme === 'blue-fire' || theme === 'acid' ? 50 : 0;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = `particle ${theme}-particle`;
      particle.style.left = `${Math.random() * 100}vw`;
      particle.style.animationDelay = `${Math.random() * 5}s`;
      container.appendChild(particle);
    }

    // Initialize particles.js with settings based on theme
    if (theme === 'fire' || theme === 'blue-fire' || theme === 'acid') {
      window.particlesJS('particle-container', {
        particles: {
          number: {
            value: 100,
          },
          size: {
            value: 3,
          },
          move: {
            speed: 1,
            direction: 'top',
          },
          color: {
            value: theme === 'fire' ? '#ff6347' : theme === 'blue-fire' ? '#66ccff' : '#66ff33',
          },
        },
      });
    }
  };

  const removeParticles = () => {
    const container = document.getElementById('particle-container');
    if (container) container.remove();
  };

  if (loading) {
    return (
      <div id="loading-screen">
        <h1>🔥 Loading LitChat... 🔥</h1>
        <div id="loading-bar">
          <span></span>
        </div>
      </div>
    );
  }

  return (
    <div id="chat-container">
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      <div id="theme-selector">
        <label htmlFor="theme-dropdown">Theme:</label>
        <select
          id="theme-dropdown"
          value={theme}
          onChange={(e) => changeTheme(e.target.value)}
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

      <div id="username-container">
        <label>Username:</label>
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={handleUsernameChange}
        />
      </div>

      <div id="profile-picture-container">
        <label>Profile Picture URL:</label>
        <input
          type="text"
          placeholder="Enter your profile picture URL"
          value={profilePicture}
          onChange={handleProfilePictureChange}
        />
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
              <strong className="username">{msg.username}</strong>
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