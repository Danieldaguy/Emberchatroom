import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState(''); // Initialize empty, set later in useEffect
    const [profilePicture, setProfilePicture] = useState('');
    const [admin, setAdmin] = useState(false); // Flag to check if user is admin
    const [isClient, setIsClient] = useState(false); // Detect client-side rendering

    const adminUsernames = ['adminusername1', 'adminusername2']; // List of admin usernames (case-insensitive)

    // Detect client-side rendering
    useEffect(() => {
        setIsClient(true);

        if (typeof window !== 'undefined') {
            const storedUsername = localStorage.getItem('username');
            const storedProfilePicture = localStorage.getItem('profilePicture');
            setUsername(storedUsername || '');
            setProfilePicture(storedProfilePicture || '');
        }
    }, []);

    useEffect(() => {
        if (adminUsernames.includes(username.toLowerCase())) {
            setAdmin(true);
        }
    }, [username]);

    useEffect(() => {
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

        // Check if user is banned
        const { data: user } = await supabase
            .from('users')
            .select('is_banned')
            .eq('username', username.toLowerCase())
            .single();

        if (user && user.is_banned) {
            alert('You are banned and cannot send messages.');
            return;
        }

        await supabase
            .from('messages')
            .insert([{ username, message: newMessage, profile_picture: profilePicture }]);
        setNewMessage('');
    };

    const handleUsernameChange = (e) => {
        const value = e.target.value;
        setUsername(value);
        if (isClient) {
            localStorage.setItem('username', value);
        }
    };

    const handleProfilePictureChange = (e) => {
        const value = e.target.value;
        setProfilePicture(value);
        if (isClient) {
            localStorage.setItem('profilePicture', value);
        }
    };

    const clearChat = async () => {
        await supabase.from('messages').delete();
        setMessages([]);
    };

    const deleteMessage = async (messageId) => {
        await supabase.from('messages').delete().eq('id', messageId);
        setMessages(messages.filter(msg => msg.id !== messageId));
    };

    const banUser = async (usernameToBan) => {
        const { data, error } = await supabase
            .from('users')
            .update({ is_banned: true })
            .eq('username', usernameToBan.toLowerCase());

        if (error) {
            console.error('Error banning user:', error);
            return;
        }

        alert(`${usernameToBan} has been banned.`);
    };

    const muteUser = async (usernameToMute) => {
        const { data, error } = await supabase
            .from('users')
            .update({ is_muted: true })
            .eq('username', usernameToMute.toLowerCase());

        if (error) {
            console.error('Error muting user:', error);
            return;
        }

        alert(`${usernameToMute} has been muted.`);
    };

    if (!isClient) {
        return null; // Prevent rendering on the server
    }

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
                                <div>
                                    <button onClick={() => deleteMessage(msg.id)}>Delete</button>
                                    <button onClick={() => banUser(msg.username)}>Ban User</button>
                                    <button onClick={() => muteUser(msg.username)}>Mute User</button>
                                </div>
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

            <button id="clear-chat-btn" onClick={clearChat}>
                Clear Chat
            </button>

            {admin && (
                <div id="admin-panel">
                    <button onClick={clearChat}>Clear Chat</button>
                </div>
            )}
        </div>
    );
}