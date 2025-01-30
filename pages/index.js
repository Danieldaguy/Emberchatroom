import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState('https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117');
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 3000);

    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        console.log('Stored theme:', storedTheme);
        setTheme(storedTheme);
        document.body.setAttribute('data-theme', storedTheme);
      }

      const storedUsername = localStorage.getItem('username');
      const storedProfilePicture = localStorage.getItem('profilePicture');
      setUsername(storedUsername || '');
      setProfilePicture(storedProfilePicture || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117');
    }

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

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !username.trim()) return;

    const timestamp = new Date().toISOString();
    const pfpToUse = profilePicture.trim() || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117';

    await supabase
      .from('messages')
      .insert([{ username, message: newMessage, profile_picture: pfpToUse, timestamp }]);
    setNewMessage('');
    scrollToBottom();
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    if (typeof window !== 'undefined') {
      localStorage.setItem('username', value);
    }
  };

  const handleProfilePictureChange = (e) => {
    setProfilePicture(e.target.value);
  };

  const handleTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setTypingUsers(prev => new Set(prev).add(username));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(username);
        return newSet;
      });
    }, typingTimeout);
  };

  const scrollToBottom = () => {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  };

  console.log('Current theme:', theme);

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

  const typingText = () => {
    const typingArray = Array.from(typingUsers);
    if (typingArray.length === 1) {
      return `${typingArray[0]} is typing...`;
    } else if (typingArray.length === 2) {
      return `${typingArray.join(' and ')} are typing...`;
    } else if (typingArray.length > 2) {
      return 'Multiple people are typing...';
    }
    return '';
  };

  return (
    <div id="chat-container">
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      <div id="theme-selector">
        <label htmlFor="theme-dropdown">Theme:</label>
        <select
          id="theme-dropdown"
          value={theme}
          onChange={(e) => {
            const newTheme = e.target.value;
            setTheme(newTheme);
            if (typeof window !== 'undefined') {
              localStorage.setItem('theme', newTheme);
              document.body.setAttribute('data-theme', newTheme);
              console.log('Applied theme:', newTheme);
            }
          }}
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

      <div id="typing-indicator">
        <p>{typingText()}</p>
      </div>

      <div id="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <img
              src={msg.profile_picture || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117'}
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
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}