import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [theme, setTheme] = useState('default');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [displayName, setDisplayName] = useState('');
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
      let userData = session.user;
      let userMetadata = userData.user_metadata;

      let username = userMetadata?.custom_username || userMetadata?.preferred_username || userMetadata?.full_name || userData.email.split('@')[0];
      let profilePicture = userMetadata?.avatar_url || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117';

      // Store or update user info in DB
      const { data: existingUser } = await supabase.from('users').select('id').eq('id', userData.id).single();

      if (!existingUser) {
        await supabase.from('users').insert([
          { id: userData.id, username, profile_picture: profilePicture }
        ]);
      }

      setUser({ ...userData, username, profile_picture: profilePicture });
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

    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });

    if (error) {
      setError('Error sending OTP. Please try again.');
    } else {
      setError('');
      alert('Check your email for the OTP!');
    }
  };

  const handleNewUserSetup = async (userData) => {
    let newUsername = prompt('Choose a unique username:');
    let profilePicture = prompt('Enter your profile picture URL (optional):') || 'https://static.wikia.nocookie.net/logopedia/images/d/de/Roblox_Mobile_HD.png/revision/latest?cb=20230204042117';

    if (!newUsername) {
      alert('Username is required.');
      return;
    }

    // Check if username is already taken
    const { data: existingUser } = await supabase.from('users').select('id').eq('username', newUsername).single();
    if (existingUser) {
      alert('Username is already taken. Try another.');
      return;
    }

    await supabase.from('users').insert([
      { id: userData.id, username: newUsername, profile_picture: profilePicture }
    ]);

    setUser({ ...userData, username: newUsername, profile_picture: profilePicture });
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

    await supabase.from('messages').insert([
      { 
        username: user.username, 
        display_name: displayName || user.username, 
        message: newMessage, 
        profile_picture: user.profile_picture, 
        timestamp 
      }
    ]);

    setNewMessage('');
    scrollToBottom();
  };

  const handleTyping = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setTypingUsers((prev) => new Set(prev).add(user?.username));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user?.username);
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
    return <h1>🔥 Loading LitChat... 🔥</h1>;
  }

  return (
    <>
      {!user ? (
        <div id="auth-container">
          <h1>🔥•LitChat V1•🔥</h1>
          <button onClick={signInWithDiscord}>Login with Discord</button>
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email for login"
            />
            <button onClick={signInWithEmail}>Submit</button>
          </div>
          {error && <p className="error-message">{error}</p>}
        </div>
      ) : (
        <div id="chat-container">
          <h1>🔥•LitChat V1•🔥</h1>
          <button onClick={signOut}>Logout</button>

          <label>Display Name:</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter display name"
          />

          <div id="messages">
            {messages.map((message, index) => (
              <div className="message" key={index}>
                <img className="pfp" src={message.profile_picture} alt="profile" />
                <strong className="username">{message.display_name}</strong>: {message.message}
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
      )}
    </>
  );
}