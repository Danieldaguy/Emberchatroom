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
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

  useEffect(() => {
    console.log('Effect running: Checking authentication...');
    checkAuth();
    fetchMessages();

    const channel = supabase
      .channel('realtime:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        console.log('Real-time message received:', payload);
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      console.log('Effect cleanup: Removing Supabase channel...');
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    console.log('Checking auth session...');
    const { data: { session }, error } = await supabase.auth.getSession();
    console.log('Session data:', session);
    if (error) {
      console.log('Error checking session:', error.message);
    }
    if (session) {
      const { user } = session;
      let { username, display_name, avatar_url } = user.user_metadata;

      if (!username) {
        console.log('No username found for user, prompting for username...');
        if (user.app_metadata.provider === 'discord') {
          username = user.user_metadata.full_name;
          avatar_url = user.user_metadata.avatar_url;
          console.log('Discord user detected. Username:', username);
        } else {
          username = prompt('Choose your unique username (Support required to change it):');
          avatar_url = prompt('Enter your profile picture URL:');
          console.log('User chose username:', username);
          await supabase.auth.updateUser({ data: { username, avatar_url } });
        }
      }

      setUser({ id: user.id, username, display_name: display_name || username, avatar_url });
      console.log('User logged in:', user);
    }
    setLoading(false);
    console.log('Authentication check complete, loading finished.');
  };

  const signInWithDiscord = async () => {
    console.log('Attempting Discord login...');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'discord' });
    if (error) {
      console.log('Discord login error:', error.message);
      setError(error.message);
    } else {
      console.log('Discord login successful');
    }
  };

  const signInWithEmail = async () => {
    console.log('Attempting email login...');
    if (!email) {
      console.log('No email entered for login.');
      setError('Please enter a valid email.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      console.log('Error sending OTP:', error.message);
      setError('Error sending OTP. Please try again.');
    } else {
      setOtpSent(true);
      setError('');
      alert('Check your email for the OTP!');
      console.log('OTP sent to:', email);
    }
  };

  const verifyOtp = async () => {
    console.log('Attempting OTP verification...');
    if (!otp || !email) {
      console.log('OTP or email missing.');
      setError('Please enter the OTP sent to your email.');
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    console.log('OTP verification response:', data);

    if (error) {
      console.log('OTP verification failed:', error.message);
      setError('Invalid OTP, please try again!');
    } else {
      setUser(data.user);
      setError('');
      alert('Login successful!');
      console.log('OTP verified, user logged in:', data.user);
    }
  };

  const signOut = async () => {
    console.log('Attempting to sign out...');
    await supabase.auth.signOut();
    setUser(null);
    console.log('User signed out');
  };

  const fetchMessages = async () => {
    console.log('Fetching messages...');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('timestamp', { ascending: true });

    if (error) {
      console.log('Error fetching messages:', error.message);
    } else {
      setMessages(data || []);
      console.log('Messages fetched:', data);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    console.log('Attempting to send message:', newMessage);

    if (!newMessage.trim() || !user) {
      console.log('Invalid message or user not logged in.');
      return;
    }

    const timestamp = new Date().toLocaleString();
    const { username, avatar_url, display_name } = user;

    await supabase.from('messages').insert([{ username, display_name, message: newMessage, profile_picture: avatar_url, timestamp }]);
    setNewMessage('');
    scrollToBottom();
    console.log('Message sent:', newMessage);
  };

  const handleTyping = () => {
    console.log('User typing...');
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      console.log('Previous typing timer cleared.');
    }

    setTypingUsers((prev) => new Set(prev).add(user?.username));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user?.username);
        console.log('User stopped typing:', user?.username);
        return newSet;
      });
    }, typingTimeout);
    console.log('Typing timer set for', typingTimeout, 'milliseconds');
  };

  const scrollToBottom = () => {
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      console.log('Scrolled to bottom of messages.');
    }
  };

  const renderTypingIndicator = () => {
    const typingArray = Array.from(typingUsers);
    if (typingArray.length === 1) {
      console.log('Rendering typing indicator for 1 user...');
      return <p>{typingArray[0]} is typing...</p>;
    }
    if (typingArray.length === 2) {
      console.log('Rendering typing indicator for 2 users...');
      return <p>{typingArray[0]} & {typingArray[1]} are typing...</p>;
    }
    if (typingArray.length >= 3) {
      console.log('Rendering typing indicator for multiple users...');
      return <p>Multiple people are typing...</p>;
    }
    return null;
  };

  if (loading) {
    console.log('Loading screen visible...');
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
    <>
      <div id="ad-container">
        <h3>📢 Sponsored Ad 📢</h3>
        <iframe
          src="https://www.profitablecpmrate.com/tq25px6u6?key=5a7c351a7583310280f5929a563e481f"
          width="100%"
          height="90"
          style={{ border: 'none', marginBottom: '10px' }}
        ></iframe>
      </div>

      {!user ? (
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
              <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
              <button onClick={verifyOtp}>Verify OTP</button>
            </div>
          )}
          {error && <p className="error-message">{error}</p>}
        </div>
      ) : (
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
console.log('Theme changed to:', newTheme);
              }}
            >
              <option value="default">Default</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div id="messages-container" className="messages">
            <div id="messages">
              {messages.map((msg, index) => (
                <div key={index} className="message">
                  <div className="message-header">
                    <img src={msg.profile_picture || '/default-avatar.png'} alt="User Avatar" className="avatar" />
                    <strong>{msg.display_name || msg.username}</strong>
                  </div>
                  <p>{msg.message}</p>
                  <span className="timestamp">{msg.timestamp}</span>
                </div>
              ))}
            </div>

            {renderTypingIndicator()}

            <div id="message-input-container">
              <textarea
                id="new-message-input"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    sendMessage(e);
                  }
                }}
              ></textarea>
              <button id="send-button" onClick={sendMessage}>Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}