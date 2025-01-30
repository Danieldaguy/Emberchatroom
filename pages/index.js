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
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
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

    if (error) setError(error.message);
  };

  const signInWithEmail = async (email) => {
  try {
    // Attempt to send OTP to the email
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false, // Adjust according to your needs
      },
      type: 'email',
    });

    // If there's an error during OTP sending, log it and display an alert
    if (error) {
      console.error('Error sending OTP:', error.message); // Log the specific error message
      alert(`Error: ${error.message}`); // Show user-friendly alert
      return;
    }

    // If OTP is sent successfully, inform the user
    console.log('OTP sent to:', email); // Log for debugging
    alert('Check your email for the OTP!');

  } catch (err) {
    // Log any unexpected errors that might occur during the process
    console.error('Unexpected error:', err);
    alert('Something went wrong. Please try again later.');
  }
};

// Example usage: Pass the user's email to this function
const emailInput = 'user@example.com';  // Replace with the actual email input
signInWithEmail(emailInput);
  const verifyOtp = async () => {
    if (!otp || !email) {
      setError('Please enter the OTP sent to your email.');
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });

    if (error) {
      setError('Invalid OTP, please try again!');
    } else {
      setUser(data.user);
      setError('');
      alert('Login successful!');
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

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers((prev) => new Set(prev).delete(user?.email));
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
            placeholder="Enter email for login"
            onKeyDown={(e) => e.key === 'Enter' && signInWithEmail()}
          />
          <button onClick={signInWithEmail}>Submit</button>
        </div>

        {otpSent && (
          <div>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
            />
            <button onClick={verifyOtp}>Verify OTP</button>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
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
        <p>{typingUsers.size} users typing...</p>
      </div>

      <div id="messages">
        {messages.map((message, index) => (
          <div key={index}>
            <img src={message.profile_picture} alt="profile" />
            <strong>{message.username}</strong>: {message.message}
          </div>
        ))}
      </div>

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