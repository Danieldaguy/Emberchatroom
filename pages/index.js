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
      const { user } = session; 
      let { username, display_name, avatar_url } = user.user_metadata;

      if (!username) {
        if (user.app_metadata.provider === 'discord') {
          username = user.user_metadata.full_name;
          avatar_url = user.user_metadata.avatar_url;
        } else {
          username = prompt('Choose your unique username (Support required to change it):');
          avatar_url = prompt('Enter your profile picture URL:');
          await supabase.auth.updateUser({ data: { username, avatar_url } });
        }
      }

      setUser({ id: user.id, username, display_name: display_name || username, avatar_url });
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

    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });

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
    const { username, avatar_url, display_name } = user;
    const newMsg = { username, display_name, message: newMessage, profile_picture: avatar_url, timestamp };

    setMessages((prev) => [...prev, newMsg]);

    const { error } = await supabase.from('messages').insert([newMsg]);

    if (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => prev.filter((msg) => msg.timestamp !== timestamp));
    } else {
      setNewMessage('');
      scrollToBottom();
    }
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

  const getFormattedTime = (timestamp) => { 
    const date = new Date(timestamp); 
    const hours = date.getHours().toString().padStart(2, '0'); 
    const minutes = date.getMinutes().toString().padStart(2, '0'); 
    return `${hours}:${minutes}`; 
  };

  const getTypingText = () => { 
    const typingArray = Array.from(typingUsers); 
    if (typingArray.length === 1) { 
      return `${typingArray[0]} is typing...`; 
    } else if (typingArray.length === 2) { 
      return `${typingArray[0]} & ${typingArray[1]} are typing...`; 
    } else if (typingArray.length > 2) { 
      return 'Multiple people are typing...'; 
    } 
    return ''; 
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
    <> 
      <div id="ad-container"> 
        <h3>📢 Sponsored Ad 📢</h3> 
        <iframe src="https://www.profitablecpmrate.com/tq25px6u6?key=5a7c351a7583310280f5929a563e481f" width="100%" height="90" style={{ border: 'none', marginBottom: '10px' }} ></iframe> 
      </div>

      {!user ? (
        <div id="auth-container">
          <h1>🔥•LitChat V1•🔥</h1>
          <h5>By 🔥•Ember Studios•🔥</h5>
          <button onClick={signInWithDiscord}>Login with Discord</button>
          <div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email for login" onKeyDown={(e) => e.key === 'Enter' && signInWithEmail()} />
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

          <div id="typing-indicator">
            <p>{getTypingText()}</p>
          </div>

          <div id="messages">
            {messages.map((message, index) => (
              <div className="message" key={index}>
                <img className="pfp" src={message.profile_picture} alt="profile" />
                <strong className="username">{message.display_name}</strong>: {message.message} <span className="timestamp">({getFormattedTime(message.timestamp)})</span>
              </div>
            ))}
          </div>

          <form onSubmit={sendMessage}>
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." onKeyDown={handleTyping} />
            <button type="submit">Send</button>
          </form>
        </div>
      )}
    </>
  ); 
}