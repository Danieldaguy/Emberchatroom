import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/globals.css'; // Import your CSS file globally

export default function Chatroom() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('');

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('realtime:messages') // Create a new channel
            .on(
                'postgres_changes', // Listen to changes
                { event: 'INSERT', schema: 'public', table: 'messages' }, // Subscribe to insert events
                (payload) => {
                    setMessages((prev) => [...prev, payload.new]);
                }
            )
            .subscribe(); // Subscribe to real-time updates

        // Cleanup on component unmount
        return () => {
            supabase.removeChannel(channel); // Remove the channel when component unmounts
        };
    }, []);

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .order('timestamp', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error);
            return;
        }

        setMessages(data || []);
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !username.trim()) return;

        await supabase
            .from('messages')
            .insert([{ username, message: newMessage }]);
        setNewMessage('');
    };

    return (
        <div id="chat-container">
            <h1>🔥•LitChat V1•🔥</h1>
            <h5>By 🔥•Ember Studios•🔥</h5>

            <div id="username-container">
                Username:
                <input
                    type="text"
                    id="username-input"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
            </div>

            <div id="messages">
                {messages.map((msg) => (
                    <div key={msg.id}>
                        <strong>{msg.username}:</strong> {msg.message}
                    </div>
                ))}
            </div>

            <form id="send-form" onSubmit={sendMessage}>
                <input
                    type="text"
                    id="message-input"
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    required
                />
                <button type="submit">Send</button>
            </form>

            <button id="clear-chat-btn" onClick={() => setMessages([])}>
                Clear Chat
            </button>
        </div>
    );
}
