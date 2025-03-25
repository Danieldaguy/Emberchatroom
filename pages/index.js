import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set()); 
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

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

  useEffect(() => {
    scrollToBottom(); // Ensure the chat is scrolled to the bottom when messages are updated
  }, [messages]);

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
      options: {
        redirectTo: `${window.location.origin}/`, // Redirect back to the homepage after login
      },
    });
    if (error) setError(error.message);
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const signInWithEmail = async () => {
    if (!email || !password) {
      setError('Please enter a valid email and password.');
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError('Invalid email or password. Please try again.');
    } else {
      setUser(data.user);
      setError('');
      alert('Login successful!');
    }
  };

  const signUpWithEmail = async () => {
    if (!email || !password) {
      setError('Please enter a valid email and password.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError('Error signing up. Please try again.');
    } else {
      setError('');
      alert('Sign-up successful! Please check your email to confirm your account.');
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });

    if (!error) setMessages(data || []);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const timestamp = new Date().toISOString();
    const username = user.user_metadata?.full_name || user.email.split('@')[0];
    const profilePicture =
      user.user_metadata?.avatar_url || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117';

    await supabase.from('messages').insert([{ username, message: newMessage, profile_picture: profilePicture, timestamp }]);
    setNewMessage('');
    scrollToBottom(); // Scroll to the bottom after sending a message
  };

  const handleTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setTypingUsers((prev) => new Set(prev).add(user?.email));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers((prev) => {
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

        <div>
          <input
            type="email"
            id="email-login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
          />
          <input
            type="password"
            id="password-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />
          <button onClick={signInWithEmail}>Login</button>
          <button onClick={signUpWithEmail}>Sign Up</button>
        </div>
        {error && <p className="error-message">{error}</p>}
      </div>
    );
  }

  return (
    <div id="chat-container">
      {/* Header */}
      <header id="chat-header">
        <h1>🔥 LitChat 🔥</h1>
        <h5>By Ember Studios</h5>
        <button onClick={signOut} style={{ marginTop: '10px' }}>Logout</button>
      </header>

      {/* Theme Selector */}
      <div id="theme-selector" style={{ textAlign: 'center', marginBottom: '20px' }}>
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

      {/* Messages Section */}
      <div id="messages">
        {messages.map((message, index) => (
          <div className="message" key={index}>
            <img className="pfp" src={message.profile_picture} alt="profile" />
            <div>
              <strong className="username">{message.username}</strong>
              <p style={{ margin: '5px 0', color: 'var(--text-color)' }}>{message.message}</p>
              <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Input Section */}
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={handleTyping}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}