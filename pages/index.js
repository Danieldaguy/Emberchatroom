import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Helmet } from 'react-helmet';

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'default');
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      if (!error) {
        setMessages(data);
        setLoading(false);
      }
    }

    fetchMessages();

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleSendMessage = async () => {
    if (newMessage.trim() === '') return;

    const { error } = await supabase.from('messages').insert([{ user: user.email, content: newMessage }]);
    if (!error) setNewMessage('');
  };

  const handleTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    supabase.from('typing').insert([{ user: user.email }], { upsert: true });

    typingTimerRef.current = setTimeout(() => {
      supabase.from('typing').delete().eq('user', user.email);
    }, typingTimeout);
  };

  const handleLogin = async () => {
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setOtpSent(true);
  };

  const handleVerifyOtp = async () => {
    setError('');
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp });
    if (error) setError(error.message);
    else setUser(data.user);
  };

  const handleThemeChange = (event) => {
    setTheme(event.target.value);
  };

  return (
    <>
      <Helmet>
        <title>Chatroom</title>
      </Helmet>

      <div id="chat-container">
        {loading ? (
          <div id="loading-screen">
            <h1>Loading...</h1>
            <div id="loading-bar"><span></span></div>
          </div>
        ) : user ? (
          <>
            <div id="theme-selector">
              <label>Theme:</label>
              <select value={theme} onChange={handleThemeChange}>
                <option value="default">Default</option>
                <option value="sunset">Sunset</option>
                <option value="fire">Fire</option>
                <option value="blue-fire">Blue Fire</option>
                <option value="void">Void</option>
                <option value="light">Light</option>
                <option value="acid">Acid</option>
              </select>
            </div>

            <div id="messages">
              {messages.map((msg, index) => (
                <div className="message" key={index}>
                  <img className="pfp" src={`https://api.dicebear.com/7.x/identicon/svg?seed=${msg.user}`} alt="PFP" />
                  <div>
                    <span className="username">{msg.user}</span>
                    <p>{msg.content}</p>
                    <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef}></div>
            </div>

            <div id="typing-indicator">
              {typingUsers.size > 0 && <p>Someone is typing...</p>}
            </div>

            <div id="input-container">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleTyping}
                placeholder="Type a message..."
              />
              <button onClick={handleSendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div id="auth-container">
            <input
              id="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
            <button id="email-submit" onClick={handleLogin}>Get OTP</button>

            {otpSent && (
              <>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                />
                <button onClick={handleVerifyOtp}>Verify</button>
              </>
            )}

            {error && <p className="error">{error}</p>}
          </div>
        )}
      </div>
    </>
  );
}