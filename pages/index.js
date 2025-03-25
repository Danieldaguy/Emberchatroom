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
  const [showEmojiModal, setShowEmojiModal] = useState(false); // State to toggle emoji modal
  const [selectedEmoji, setSelectedEmoji] = useState(''); // State for selected emoji

  const emojis = [
    '😁', '😂', '😎', '❤️', '🎉', '😊', '😢', '😡', '🥳', '🔥', '🤩', '✨', '💥', '🎶', '💀', '💯', '🤔', '🙌',
    '👍', '👎', '👏', '🙏', '💪', '🤷', '🤦', '😅', '😇', '😋', '😌', '😍', '😒', '😓', '😔', '😕', '😖', '😘',
    '😜', '😝', '😞', '😠', '😩', '😪', '😫', '😭', '😱', '😳', '😵', '😷', '🤐', '🤑', '🤒', '🤓', '🤕', '🤢',
    '🤧', '🤪', '🤫', '🤭', '🤯', '🥰', '🥵', '🥶', '🥴', '🧐', '🤠', '🥺', '🤤', '😈', '👿', '👻', '💩', '👽',
    '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻',
    '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥',
    '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🐢', '🐍',
    '🦎', '🦂', '🦀', '🐙', '🦑', '🦐', '🦞', '🐠', '🐟', '🐡', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓',
    '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌',
    '🐕', '🐩', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊', '🐇', '🐁', '🐀', '🐿', '🦔', '🐾', '🐉', '🐲',
    '🌵', '🎄', '🌲', '🌳', '🌴', '🌱', '🌿', '☘️', '🍀', '🎍', '🎋', '🍃', '🍂', '🍁', '🍄', '🌾', '💐', '🌷',
    '🌹', '🥀', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓',
    '🌔', '🌙', '🌎', '🌍', '🌏', '💫', '⭐', '🌟', '✨', '⚡', '🔥', '💥', '☄️', '☀️', '🌤', '⛅', '🌥', '☁️',
    '🌦', '🌧', '⛈', '🌩', '🌨', '❄️', '☃️', '⛄', '🌬', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫'
  ];

  const addEmojiToMessage = (emoji) => {
    setNewMessage((prev) => prev + emoji); // Append emoji to the message
    setShowEmojiModal(false); // Close the modal
  };

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
        redirectTo: `${window.location.origin}`, // Redirect back to your app after login
      },
    });

    if (error) {
      console.error('Error logging in with Discord:', error.message);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error.message);
      } else if (session) {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe(); // Correctly unsubscribe
      }
    };
  }, []);

  useEffect(() => {
    const session = supabase.auth.getSession();
    if (session) {
      setUser(session.user);
    }
  }, []);

  const signInWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Error logging in with email:', error.message);
    } else {
      console.log('Login successful!');
    }
  };

  const signUpWithEmail = async (email, password) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('Error signing up:', error.message);
    } else {
      console.log('Sign-up successful! Please check your email to confirm your account.');
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
      <div id="auth-container" style={{ textAlign: 'center', padding: '20px', maxWidth: '400px', margin: 'auto', background: 'var(--container-bg)', borderRadius: '12px', boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6)' }}>
        <h1 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>🔥 LitChat 🔥</h1>
        <h5 style={{ color: 'var(--text-color)', opacity: 0.8, marginBottom: '20px' }}>By Ember Studios</h5>

        <button
          onClick={signInWithDiscord}
          style={{
            background: 'var(--accent-color)',
            color: 'var(--bg-color)',
            padding: '12px 20px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
            transition: 'background-color 0.3s ease',
          }}
        >
          Login with Discord
        </button>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="email"
            id="email-login-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              border: '2px solid var(--input-bg)',
              borderRadius: '8px',
              background: 'var(--input-bg)',
              color: 'var(--text-color)',
              outline: 'none',
            }}
          />
          <input
            type="password"
            id="password-login-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              width: '100%',
              padding: '12px',
              marginBottom: '10px',
              border: '2px solid var(--input-bg)',
              borderRadius: '8px',
              background: 'var(--input-bg)',
              color: 'var(--text-color)',
              outline: 'none',
            }}
          />
          <button
            onClick={() => signInWithEmail(email, password)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent-color)',
              color: 'var(--bg-color)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '10px',
              transition: 'background-color 0.3s ease',
            }}
          >
            Login
          </button>
          <button
            onClick={() => signUpWithEmail(email, password)}
            style={{
              width: '100%',
              padding: '12px',
              background: 'var(--accent-color)',
              color: 'var(--bg-color)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.3s ease',
            }}
          >
            Sign Up
          </button>
        </div>
        {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
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

      {/* Emoji Modal */}
      {showEmojiModal && (
        <div
          id="emoji-modal"
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
            width: '300px', // Fixed width
            height: '400px', // Fixed height
            overflowY: 'auto', // Enable vertical scrolling
          }}
        >
          <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>Select an Emoji</h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            {emojis.map((emoji, index) => (
              <span
                key={index}
                style={{
                  fontSize: '2rem',
                  cursor: 'pointer',
                }}
                onClick={() => addEmojiToMessage(emoji)}
              >
                {emoji}
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowEmojiModal(false)}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: 'var(--accent-color)',
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

      {/* Input Section */}
      <form onSubmit={sendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={handleTyping}
        />
        <button type="button" onClick={() => setShowEmojiModal(true)}>😀</button> {/* Emoji Button */}
        <button type="submit">Send</button>
      </form>
    </div>
  );
}