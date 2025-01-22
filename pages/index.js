import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Chatroom() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('');
    const [profilePicture, setProfilePicture] = useState('');

    useEffect(() => {
        // Load username and PFP from localStorage if available
        const savedUsername = localStorage.getItem('username');
        const savedProfilePicture = localStorage.getItem('profilePicture');
        
        if (savedUsername) {
            setUsername(savedUsername);
        }
        if (savedProfilePicture) {
            setProfilePicture(savedProfilePicture);
        }

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

        // Fetch IP and role for checking permissions
        const { data: ipData } = await supabase.rpc('get_ip'); // Assume you have a stored procedure to fetch the user's IP
        const { data: roleData } = await supabase
            .from('roles')
            .select('role')
            .eq('ip_address', ipData)
            .single();

        const role = roleData ? roleData.role : 'user'; // Default to 'user'

        // Insert the message with username, profile picture, and role
        await supabase
            .from('messages')
            .insert([{ username, message: newMessage, profile_picture: profilePicture, ip: ipData, role }]);

        setNewMessage('');
    };

    const handleUsernameChange = (e) => {
        const newUsername = e.target.value;
        setUsername(newUsername);
        localStorage.setItem('username', newUsername); // Save username to localStorage
    };

    const handleProfilePictureChange = (e) => {
        const newPfp = e.target.value;
        setProfilePicture(newPfp);
        localStorage.setItem('profilePicture', newPfp); // Save profile picture URL to localStorage
    };

    const handleDelete = async (messageId) => {
        const { data: ipData } = await supabase.rpc('get_ip');
        const { data: roleData } = await supabase
            .from('roles')
            .select('role')
            .eq('ip_address', ipData)
            .single();

        const role = roleData ? roleData.role : 'user';

        const message = messages.find(msg => msg.id === messageId);

        if (message.username === username || role === 'admin') {
            await supabase
                .from('messages')
                .delete()
                .eq('id', messageId);
        }
    };

    const handleEdit = async (messageId) => {
        const newMessage = prompt("Edit your message:");
        if (!newMessage) return;

        const { data: ipData } = await supabase.rpc('get_ip');
        const { data: roleData } = await supabase
            .from('roles')
            .select('role')
            .eq('ip_address', ipData)
            .single();

        const role = roleData ? roleData.role : 'user';

        const message = messages.find(msg => msg.id === messageId);

        if (message.username === username || role === 'admin') {
            await supabase
                .from('messages')
                .update({ message: newMessage })
                .eq('id', messageId);
        }
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
                            {msg.username === username && (
                                <>
                                    <button onClick={() => handleEdit(msg.id)}>Edit</button>
                                    <button onClick={() => handleDelete(msg.id)}>Delete</button>
                                </>
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
        </div>
    );
}