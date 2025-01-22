import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState(localStorage.getItem('username') || '');  // Load from localStorage
    const [profilePicture, setProfilePicture] = useState(localStorage.getItem('profilePicture') || '');  // Load from localStorage
    const [admin, setAdmin] = useState(false);  // Flag to check if user is admin

    useEffect(() => {
        fetchMessages();

        const channel = supabase
            .channel('realtime:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                setMessages((prev) => [...prev, payload.new]);
            })
            .subscribe();

        // Check if the user is an admin based on username
        if (username === 'adminUsername') {
            setAdmin(true);  // Replace 'adminUsername' with the actual admin username
        }

        return () => {
            supabase.removeChannel(channel);
        };
    }, [username]);

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

        // Ensure username is unique
        const { data: existingUser } = await supabase
            .from('messages')
            .select('username')
            .eq('username', username)
            .single();

        if (existingUser) {
            alert('Username is already taken!');
            return;
        }

        await supabase
            .from('messages')
            .insert([{ username, message: newMessage, profile_picture: profilePicture }]);
        setNewMessage('');
    };

    // Save username and profile picture to localStorage
    const handleUsernameChange = (e) => {
        setUsername(e.target.value);
        localStorage.setItem('username', e.target.value);
    };

    const handleProfilePictureChange = (e) => {
        setProfilePicture(e.target.value);
        localStorage.setItem('profilePicture', e.target.value);
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
                    onChange={handleUsernameChange}
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
                    onChange={handleProfilePictureChange}
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
                            {admin && (
                                <button onClick={() => deleteMessage(msg.id)}>Delete</button>  // Admin deletes messages
                            )}
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

            {admin && (
                <div id="admin-panel">
                    <button onClick={clearChat}>Clear Chat</button>
                    <button onClick={banUser}>Ban User</button>
                    <button onClick={muteUser}>Mute User</button>
                </div>
            )}
        </div>
    );

    // Admin functions
    const clearChat = async () => {
        await supabase.from('messages').delete();
        setMessages([]);
    };

    const deleteMessage = async (messageId) => {
        await supabase.from('messages').delete().eq('id', messageId);
        setMessages(messages.filter(msg => msg.id !== messageId));
    };

    const banUser = () => {
        // Implement banning logic here
        alert('User banned');
    };

    const muteUser = () => {
        // Implement mute logic here
        alert('User muted');
    };
}