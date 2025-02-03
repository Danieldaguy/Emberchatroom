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
  const [profileModal, setProfileModal] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [gifsOpen, setGifsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [admin, setAdmin] = useState(false);
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

  useEffect(() => {
    checkAuth();
    fetchMessages();

    const channel = supabase
      .channel('realtime:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser(session.user);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setUser((prev) => ({ ...prev, ...data }));
        setAdmin(data.role === 'admin');
      }
    }
    setLoading(false);
  };

  const signInWithDiscord = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'discord' });
    if (error) setError(error.message);
  };

  const signInWithEmail = async () => {
    if (!email) {
      setError('Please enter a valid email.');
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      setError('Error sending OTP. Please try again.');
    } else {
      setOtpSent(true);
      setError('');
      alert('Check your email for the OTP!');
    }
  };

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

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!existingUser) {
        const username = prompt('Enter your unique username:');
        const profilePicture = prompt('Enter your profile picture URL:');
        await supabase.from('users').insert([
          { id: data.user.id, username, profile_picture: profilePicture, display_name: username },
        ]);
      }
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
    const { username, display_name, profile_picture } = user;

    await supabase
      .from('messages')
      .insert([{ username, display_name, message: newMessage, profile_picture, timestamp }]);

    setNewMessage('');
    scrollToBottom();
  };

  const handleTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setTypingUsers((prev) => new Set(prev).add(user?.id));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user?.id);
        return newSet;
      });
    }, typingTimeout);
  };

  const banUser = async (username) => {
    if (!admin) return;
    await supabase.from('banned_users').insert([{ username }]);
    alert(`User ${username} has been banned.`);
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
      </div>
    );
  }

  if (!user) {
    return (
      <div id="auth-container">
        <h1>🔥•LitChat V1•🔥</h1>
        <button onClick={signInWithDiscord}>Login with Discord</button>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" />
        <button onClick={signInWithEmail}>Submit</button>
        {otpSent && (
          <>
            <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
            <button onClick={verifyOtp}>Verify OTP</button>
          </>
        )}
        {error && <p className="error-message">{error}</p>}
      </div>
    );
  }

  return (
    <div id="chat-container">
      <h1>🔥•LitChat V1•🔥</h1>
      <button onClick={signOut}>Logout</button>
      <button onClick={() => setProfileModal(user)}>Profile</button>
      <div id="messages">
        {messages.map((msg, index) => (
          <div className="message" key={index}>
            <img className="pfp" src={msg.profile_picture} alt="profile" onClick={() => setProfileModal(msg)} />
            <strong className="display-name">{msg.display_name}</strong>
            <small className="username">{msg.username}</small>: {msg.message}
          </div>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleTyping} placeholder="Type a message..." />
        <button type="submit">Send</button>
        <button onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}>😀</button>
      </form>
      {profileModal && (
        <div id="profile-modal">
          <h2>Profile</h2>
          <img src={profileModal.profile_picture} alt="profile" />
          <p>Display Name: {profileModal.display_name}</p>
          <p>Username: {profileModal.username}</p>
          {admin && <button onClick={() => banUser(profileModal.username)}>Ban</button>}
          <button onClick={() => setProfileModal(null)}>Close</button>
        </div>
      )}
    </div>
  );
}