import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { Helmet } from "react-helmet";

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [theme, setTheme] = useState("default");
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState("");
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [reactions, setReactions] = useState({});
  const [polls, setPolls] = useState([]);
  const [media, setMedia] = useState(null);
  const typingTimeout = 2000;
  const typingTimerRef = useRef(null);

  // Ensure localStorage access only on client side
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);
    }
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
      const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !media) return;

    const messageData = {
      user_id: user.id,
      content: newMessage,
      media_url: media || null,
      created_at: new Date().toISOString(),
    };

    await supabase.from("messages").insert([messageData]);
    setMessages([...messages, messageData]);
    setNewMessage("");
    setMedia(null);
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
          <div id="loading-bar">
            <span></span>
          </div>
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
                  {msg.media_url && <img src={msg.media_url} alt="Media" className="media" />}
                  <span className="timestamp">{new Date(msg.created_at).toLocaleTimeString()}</span>
                  <button onClick={() => handleReaction(msg.id, "👍")}>👍</button>
                  <button onClick={() => handleReaction(msg.id, "❤️")}>❤️</button>
                  <button onClick={() => handleReaction(msg.id, "😂")}>😂</button>
                  <button onClick={() => handleReaction(msg.id, "🔥")}>🔥</button>
                  <button onClick={() => handleReaction(msg.id, "🎉")}>🎉</button>
                  {reactions[msg.id] && <span>{reactions[msg.id]}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Typing Indicator */}
          {typingUsers.size > 0 && <p className="typing-indicator">{[...typingUsers].join(", ")} is typing...</p>}

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

          {/* Image/GIF Upload */}
          <div id="media-upload">
            <input type="file" accept="image/*,video/*" onChange={(e) => setMedia(URL.createObjectURL(e.target.files[0]))} />
            {media && <img src={media} alt="Preview" className="media-preview" />}
          </div>

          {/* Input Field */}
          <div id="input-container">
            <input type="text" placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleTyping} />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}