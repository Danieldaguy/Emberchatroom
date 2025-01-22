import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import '../styles/globals.css';

export default function Chatroom() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('');
    const [profilePicture, setProfilePicture] = useState('');

    useEffect(() => {
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
        if (!newMessage.trim() || !username.trim() || !profilePicture.trim()) return;

        await supabase
            .from('messages')
            .insert([{ username, message: newMessage, profile_picture: profilePicture }]);
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

            <div id="profile-picture-container">
                Profile Picture URL:
                <input
                    type="text"
                    id="profile-picture-input"
                    placeholder="Enter image URL"
                    value={profilePicture}
                    onChange={(e) => setProfilePicture(e.target.value)}
                    required
                />
            </div>

            <div id="messages">
                {messages.map((msg) => (
                    <div key={msg.id} className="message">
                        <img
                            src={msg.profile_picture || '/default-avatar.png'}
                            alt="PFP"
                            className="pfp"
                        />
                        <div>
                            <strong>{msg.username}:</strong> {msg.message}
                        </div>
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