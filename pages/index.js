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
  const [reactions, setReactions] = useState({});
  const [polls, setPolls] = useState([]);
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data) setUser(data);
      setLoading(false);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageData = {
      user_id: user.id,
      content: newMessage,
      created_at: new Date().toISOString(),
    };

    await supabase.from('messages').insert([messageData]);
    setMessages([...messages, messageData]);
    setNewMessage('');
  };

  const handleTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);

    setTypingUsers(new Set([...typingUsers, user.email]));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user.email);
        return newSet;
      });
    }, typingTimeout);
  };

  const handleReaction = (messageId, reaction) => {
    setReactions((prev) => ({
      ...prev,
      [messageId]: reaction,
    }));
  };

  const createPoll = (question, options) => {
    const newPoll = {
      id: polls.length + 1,
      question,
      options: options.map((option) => ({ text: option, votes: 0 })),
    };
    setPolls([...polls, newPoll]);
  };

  const votePoll = (pollId, optionIndex) => {
    setPolls((prevPolls) =>
      prevPolls.map((poll) =>
        poll.id === pollId
          ? {
              ...poll,
              options: poll.options.map((opt, i) =>
                i === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
              ),
            }
          : poll
      )
    );
  };

  return (
    <>
      <Helmet>
        <title>Chatroom</title>
      </Helmet>

      {loading ? (
        <div id="loading-screen">
          <h1>Loading...</h1>
          <div id="loading-bar"><span></span></div>
        </div>
      ) : (
        <div id="chat-container">
          <h1>Chatroom</h1>
          
          {/* Theme Selector */}
          <div id="theme-selector">
            <label>Theme:</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="default">Default</option>
              <option value="sunset">Sunset</option>
              <option value="fire">Fire</option>
              <option value="blue-fire">Blue Fire</option>
              <option value="void">Void</option>
              <option value="light">Light</option>
              <option value="acid">Acid</option>
            </select>
          </div>

          {/* Messages */}
          <div id="messages">
            {messages.map((msg) => (
              <div key={msg.id} className="message">
                <img src={`https://api.dicebear.com/5.x/bottts/svg?seed=${msg.user_id}`} alt="PFP" className="pfp" />
                <div>
                  <p className="username">{msg.user_id}</p>
                  <p>{msg.content}</p>
                  <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  <button onClick={() => handleReaction(msg.id, '👍')}>👍</button>
                  <button onClick={() => handleReaction(msg.id, '❤️')}>❤️</button>
                  <button onClick={() => handleReaction(msg.id, '😂')}>😂</button>
                  {reactions[msg.id] && <span>{reactions[msg.id]}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <p className="typing-indicator">{[...typingUsers].join(', ')} is typing...</p>
          )}

          {/* Polls */}
          <div id="polls">
            {polls.map((poll) => (
              <div key={poll.id} className="poll">
                <h3>{poll.question}</h3>
                {poll.options.map((option, index) => (
                  <button key={index} onClick={() => votePoll(poll.id, index)}>
                    {option.text} ({option.votes})
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Input Field */}
          <div id="input-container">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleTyping}
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}