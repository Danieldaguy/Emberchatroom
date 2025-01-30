import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

  // Check user session on mount
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

    setLoading(false);
  };

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
    });

    if (error) console.error('Login error:', error.message);
  };

  const signInWithEmail = async (email) => {
    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
      console.error('Email login error:', error.message);
    } else {
      alert('Check your email for the login link!');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const timestamp = new Date().toISOString();
    const username = user.user_metadata?.full_name || user.email.split('@')[0];
    const profilePicture = user.user_metadata?.avatar_url || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117';

    await supabase
      .from('messages')
      .insert([{ username, message: newMessage, profile_picture: profilePicture, timestamp }]);
    setNewMessage('');
    scrollToBottom();
  };

  const handleTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setTypingUsers(prev => new Set(prev).add(user?.email));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user?.email);
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

  if (!user) {
    return (
      <div id="auth-container">
        <h1>🔥•LitChat V1•🔥</h1>
        <h5>By 🔥•Ember Studios•🔥</h5>
        <button onClick={signInWithDiscord}>Login with Discord</button>
        <input
          type="email"
          placeholder="Enter email for login"
          onKeyDown={(e) => e.key === 'Enter' && signInWithEmail(e.target.value)}
        />
      </div>
    );
  }

  return (
    <div id="chat-container">
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      <button onClick={signOut}>Logout</button>

      <div id="theme-selector">
        <label htmlFor="theme-dropdown">Theme:</label>
        <select
          id="theme-dropdown"
          value={theme}
          onChange={(e) => {
            const newTheme = e.target.value;
            setTheme(newTheme);
            localStorage.setItem('theme', newTheme);
            document.body.setAttribute('data-theme', newTheme);
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

      <div id="typing-indicator">
        <p>{typingUsers.size > 0 && 'Someone is typing...'}</p>
      </div>

      <div id="messages">
        {messages.map((msg) => (
          <div key={msg.id} className="message">
            <img src={msg.profile_picture} alt="PFP" className="pfp" />
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