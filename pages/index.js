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
  const [showSettings, setShowSettings] = useState(false); // State to toggle settings tab
  const [newUsername, setNewUsername] = useState(''); // State for new username
  const [currentPassword, setCurrentPassword] = useState(''); // State for current password
  const [newPassword, setNewPassword] = useState(''); // State for new password
  const [profilePicture, setProfilePicture] = useState(''); // State for profile picture
  const [profilePictureFile, setProfilePictureFile] = useState(null); // State for file upload
  const [replyTo, setReplyTo] = useState(null); // State to track the message being replied to
  const [showSettingsModal, setShowSettingsModal] = useState(false); // State for settings modal
  const [showRulesModal, setShowRulesModal] = useState(false); // State for rules modal
  const [rulesAccepted, setRulesAccepted] = useState(false); // State to track if rules are accepted

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
        const newMessage = payload.new;
        setMessages((prev) => [...prev, newMessage]);

        // Check if the new message is a reply to the current user's message
        if (newMessage.reply_to) {
          const repliedMessage = messages.find((m) => m.id === newMessage.reply_to);
          if (repliedMessage && repliedMessage.username === user.user_metadata?.full_name) {
            notifyUser(newMessage);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messages, user]);

  useEffect(() => {
    scrollToBottom(); // Ensure the chat is scrolled to the bottom when messages are updated
  }, [messages]);

  useEffect(() => {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notifications enabled.');
        } else {
          console.log('Notifications disabled.');
        }
      });
    }
  }, []);

  useEffect(() => {
    if (user && !rulesAccepted) {
      setShowRulesModal(true); // Show rules modal if user logs in for the first time
    }
  }, [user]);

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
      alert('Error logging in: ' + error.message);
    } else {
      alert('Login successful!');
    }
  };

  const signUpWithEmail = async (email, password) => {
    // Check if the email is already registered
    const { data: existingUsers, error: checkError } = await supabase
      .from('users') // Supabase's `auth.users` table
      .select('email')
      .eq('email', email);
  
    if (checkError) {
      alert('Error checking existing accounts: ' + checkError.message);
      return;
    }
  
    if (existingUsers && existingUsers.length > 0) {
      alert('An account with this email already exists. Please log in instead.');
      return;
    }
  
    // Proceed with sign-up if no existing account is found
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
  
    if (error) {
      alert('Error signing up: ' + error.message);
    } else {
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
  
    console.log({
      username,
      message: newMessage,
      profile_picture: profilePicture,
      timestamp,
      reply_to: replyTo ? replyTo.id : null,
    });
  
    await supabase.from('messages').insert([{
      username,
      message: newMessage,
      profile_picture: profilePicture,
      timestamp,
      reply_to: replyTo ? replyTo.id : null, // Include the ID of the message being replied to
    }]);
  
    setNewMessage('');
    setReplyTo(null); // Clear the reply state
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

  const updateUsername = async () => {
    if (!newUsername.trim()) {
      alert('Please enter a valid username.');
      return;
    }
  
    const { error } = await supabase.auth.updateUser({
      data: { full_name: newUsername },
    });
  
    if (error) {
      alert('Error updating username: ' + error.message);
    } else {
      alert('Username updated successfully!');
      setNewUsername('');
    }
  };
  
  const updatePassword = async () => {
    if (!currentPassword || !newPassword) {
      alert('Please enter your current and new password.');
      return;
    }
  
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
  
    if (error) {
      alert('Error updating password: ' + error.message);
    } else {
      alert('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  const updateProfilePicture = async () => {
    if (!profilePicture && !profilePictureFile) {
      alert('Please provide an image URL or upload a file.');
      return;
    }
  
    let uploadedUrl = profilePicture;
  
    if (profilePictureFile) {
      const fileName = `${user.id}-${Date.now()}`;
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, profilePictureFile);
  
      if (error) {
        alert('Error uploading file: ' + error.message);
        return;
      }
  
      const { publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);
      uploadedUrl = publicUrl;
    }
  
    const { error } = await supabase.auth.updateUser({
      data: { avatar_url: uploadedUrl },
    });
  
    if (error) {
      alert('Error updating profile picture: ' + error.message);
    } else {
      alert('Profile picture updated successfully!');
      setProfilePicture('');
      setProfilePictureFile(null);
    }
  };

  const notifyUser = (message) => {
    if (document.hidden && Notification.permission === 'granted') {
      new Notification('New Reply', {
        body: `${message.username} replied to your message: "${message.message}"`,
        icon: message.profile_picture,
      });
    }
  };

  const acceptRules = () => {
    setRulesAccepted(true);
    setShowRulesModal(false);
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
        <button onClick={() => setShowSettingsModal(true)} style={{ marginTop: '10px' }}>Settings</button>
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
              {message.reply_to && (
                <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  Replying to: {messages.find((m) => m.id === message.reply_to)?.message || 'Deleted message'}
                </p>
              )}
              <span className="timestamp">
                {new Date(message.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })}
              </span>
              <button
                onClick={() => setReplyTo(message)}
                style={{
                  marginTop: '5px',
                  padding: '5px 10px',
                  background: 'var(--accent-color)',
                  color: 'var(--bg-color)',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                Reply
              </button>
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
            width: '300px',
            height: '400px',
            overflowY: 'auto',
          }}
        >
          <button
            onClick={() => setShowEmojiModal(false)}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--text-color)',
            }}
          >
            ✖
          </button>
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

      {replyTo && (
        <div
          style={{
            marginBottom: '10px',
            padding: '10px',
            background: 'var(--container-bg)',
            borderLeft: '4px solid var(--accent-color)',
            borderRadius: '8px',
          }}
        >
          <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>
            Replying to: {replyTo.message}
          </p>
          <button
            onClick={() => setReplyTo(null)}
            style={{
              marginTop: '5px',
              padding: '5px 10px',
              background: 'var(--danger-color)',
              color: 'var(--bg-color)',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}
      {console.log('ReplyTo Object:', replyTo)}

      {/* Settings Tab */}
      <div id="settings-tab" style={{ marginTop: '20px' }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            padding: '10px 20px',
            background: 'var(--accent-color)',
            color: 'var(--bg-color)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '10px',
          }}
        >
          {showSettings ? 'Close Settings' : 'Open Settings'}
        </button>

        {showSettings && (
          <div
            style={{
              padding: '20px',
              background: 'var(--container-bg)',
              borderRadius: '12px',
              boxShadow: '0 8px 25px rgba(0, 0, 0, 0.6)',
              marginTop: '10px',
            }}
          >
            <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>Settings</h3>

            {/* Update Username */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="new-username" style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>
                New Username:
              </label>
              <input
                type="text"
                id="new-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter new username"
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
                onClick={updateUsername}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent-color)',
                  color: 'var(--bg-color)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Update Username
              </button>
            </div>

            {/* Update Password */}
            <div>
              <label htmlFor="current-password" style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>
                Current Password:
              </label>
              <input
                type="password"
                id="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
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
              <label htmlFor="new-password" style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>
                New Password:
              </label>
              <input
                type="password"
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
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
                onClick={updatePassword}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent-color)',
                  color: 'var(--bg-color)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Update Password
              </button>
            </div>

            {/* Update Profile Picture */}
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="profile-picture" style={{ display: 'block', marginBottom: '5px', color: 'var(--text-color)' }}>
                Profile Picture (URL or Upload):
              </label>
              <input
                type="text"
                id="profile-picture"
                value={profilePicture}
                onChange={(e) => setProfilePicture(e.target.value)}
                placeholder="Enter image URL"
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
                type="file"
                onChange={(e) => setProfilePictureFile(e.target.files[0])}
                style={{
                  marginBottom: '10px',
                }}
              />
              <button
                onClick={updateProfilePicture}
                style={{
                  padding: '10px 20px',
                  background: 'var(--accent-color)',
                  color: 'var(--bg-color)',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Update Profile Picture
              </button>
            </div>
          </div>
        )}
      </div>

{/* Rules Modal */}
{showRulesModal && (
  <div
    id="rules-modal"
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
      width: '400px',
      fontFamily: 'Times New Roman, Times, serif',
    }}
  >
    <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>Chatroom Rules</h3>
    <div
      style={{
        maxHeight: '300px', // Set a maximum height for the rules container
        overflowY: 'auto', // Enable vertical scrolling
        marginBottom: '20px',
        paddingRight: '10px', // Add padding for better readability
      }}
    >
      <ul style={{ color: 'var(--text-color)', lineHeight: '1.6' }}>
        <li><strong>No bullying or harassment</strong> of any kind (sexual, verbal, or involving personal information).</li>
        <li><strong>No NSFW or 18+ content.</strong></li>
        <li>
          <strong>No doxxing or DDoS attacks.</strong> Leaking someone's information without their consent will result in severe punishments:
          <ul>
            <li>Leaking minor information (e.g., a name) will result in a warning.</li>
            <li>Leaking sensitive information (e.g., IP address, home address, or bank details) will result in an immediate ban.</li>
          </ul>
        </li>
        <li>
          <strong>No impersonation.</strong> First-time offenders will receive a warning. Further actions depend on the severity of the impersonation and may include a 24-hour timeout or a permanent ban.
        </li>
        <li>
          <strong>No racism, sexism, or discrimination of any kind.</strong> Violations will result in warnings, and repeated offenses will lead to more severe punishments.
        </li>
        <li>
          <strong>No distribution of pirated content.</strong> Sharing pirated content is illegal and will result in a ban.
        </li>
        <li>
          <strong>Report self-harm or harm to others.</strong> If you see someone discussing self-harm or harm to others, report it immediately and provide them with the national suicide helpline number.
        </li>
        <li>
          <strong>No hacking.</strong> This includes:
          <ul>
            <li>XSS attacks</li>
            <li>DDoS attacks</li>
            <li>Privacy invasions</li>
            <li>Password stealing</li>
            <li>Finding information through unauthorized means</li>
          </ul>
        </li>
        <li>
          <strong>No discussions of extreme or upsetting topics</strong> unless in private messages (DMs).
        </li>
        <li>
          <strong>No extreme profanity or slurs.</strong>
        </li>
        <li>
          <strong>No begging for items.</strong> Do not ask for money, in-game items (e.g., Robux, V-Bucks), or other valuables in public channels.
        </li>
      </ul>
    </div>
    <button
      onClick={acceptRules}
      style={{
        padding: '10px 20px',
        background: 'var(--accent-color)',
        color: 'var(--bg-color)',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
      }}
    >
      Accept Rules
    </button>
  </div>
)}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          id="settings-modal"
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
            width: '400px',
          }}
        >
          <h3 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>Settings</h3>
          <button
            onClick={() => setShowSettingsModal(false)}
            style={{
              padding: '10px 20px',
              background: 'var(--danger-color)',
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
    </div>
  );
}