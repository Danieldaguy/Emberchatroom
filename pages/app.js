import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // Import Supabase client

const IndexPage = () => {
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fetch initial messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }
      setMessages(data);
    };

    fetchMessages();

    // Listen for new messages
    const subscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        fetchMessages();
      })
      .subscribe();

    // Cleanup on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleMessageSubmit = async (e) => {
    e.preventDefault();

    if (!message || !username) {
      alert('Please fill in all fields!');
      return;
    }

    const { error } = await supabase.from('messages').insert([
      { username, message, timestamp: new Date().toISOString() },
    ]);

    if (error) {
      console.error('Error sending message:', error);
    }

    setMessage('');
  };

  const handleClearChat = async () => {
    if (username !== 'EmberAdmin') {
      alert('You must be an admin to clear the chat!');
      return;
    }

    const { error } = await supabase.from('messages').delete().neq('id', 0);
    if (error) {
      console.error('Error clearing chat:', error);
    }
  };

  return (
    <div>
      <h1>🔥•LitChat V1•🔥</h1>
      <h5>By 🔥•Ember Studios•🔥</h5>

      <div>
        <label>Username: </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
        />
      </div>

      <div>
        <form onSubmit={handleMessageSubmit}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>

      <div id="messages">
        {messages.map(({ username, message, timestamp }) => (
          <div key={timestamp}>
            <strong>{username}</strong>: {message} <small>{new Date(timestamp).toLocaleString()}</small>
          </div>
        ))}
      </div>

      <button onClick={handleClearChat} style={{ display: username === 'EmberAdmin' ? 'block' : 'none' }}>
        Clear Chat
      </button>
    </div>
  );
};

export default IndexPage;