import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Helmet } from 'react-helmet';
import { AlertCircle, Send, LogOut, Settings, User } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function Chatroom() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'default');
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isOnline, setIsOnline] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(null);
  
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);
  const messageInputRef = useRef(null);
  const typingTimeout = 2000;

  // Enhanced authentication check
  const checkAuth = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (session) {
        const { user: authUser } = session;
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        let userData = {
          id: authUser.id,
          email: authUser.email,
          username: profile?.username || authUser.user_metadata?.username,
          display_name: profile?.display_name || authUser.user_metadata?.display_name,
          avatar_url: profile?.avatar_url || authUser.user_metadata?.avatar_url
        };

        if (!userData.username || !userData.avatar_url) {
          userData = await setupUserProfile(authUser);
        }

        setUser(userData);
        await updateOnlineStatus(userData.id, true);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setError('Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup user profile if incomplete
  const setupUserProfile = async (authUser) => {
    const username = authUser.user_metadata?.username || 
                    prompt('Choose your unique username:');
    const avatar_url = authUser.user_metadata?.avatar_url || 
                      `https://api.dicebear.com/7.x/avatars/svg?seed=${username}`;
    
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.id,
        username,
        display_name: username,
        avatar_url,
        updated_at: new Date()
      })
      .select()
      .single();

    if (error) throw error;
    
    await supabase.auth.updateUser({
      data: { username, avatar_url }
    });

    return data;
  };

  // Enhanced message fetching with pagination
  const fetchMessages = useCallback(async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          message,
          timestamp,
          user_id,
          profiles (
            username,
            display_name,
            avatar_url
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;

      setMessages(data.reverse() || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages. Please refresh.');
    }
  }, []);

  // Real-time subscriptions and presence
  useEffect(() => {
    checkAuth();

    const messagesChannel = supabase
      .channel('messages')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages' 
      }, handleMessageChange)
      .subscribe();

    const presenceChannel = supabase
      .channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        updateTypingUsers(presenceState);
      })
      .subscribe();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(presenceChannel);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [checkAuth]);

  // Message handlers
  const handleMessageChange = (payload) => {
    if (payload.eventType === 'INSERT') {
      setMessages(prev => [...prev, payload.new]);
      handleNewMessage(payload.new);
    } else if (payload.eventType === 'DELETE') {
      setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
    } else if (payload.eventType === 'UPDATE') {
      setMessages(prev => prev.map(msg => 
        msg.id === payload.new.id ? payload.new : msg
      ));
    }
  };

  const handleNewMessage = (message) => {
    if (document.hidden) {
      setUnreadCount(prev => prev + 1);
      if (Notification.permission === 'granted') {
        new Notification('New Message', {
          body: `${message.profiles.display_name}: ${message.message}`,
          icon: message.profiles.avatar_url
        });
      }
    }
    scrollToBottom();
  };

  // Message sending with retry logic
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    const messageData = {
      user_id: user.id,
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    try {
      setNewMessage('');
      const { error } = await supabase.from('messages').insert([messageData]);
      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Retrying...');
      
      // Retry logic
      setTimeout(async () => {
        try {
          const { error: retryError } = await supabase
            .from('messages')
            .insert([messageData]);
          
          if (retryError) throw retryError;
          setError('');
        } catch (retryError) {
          setError('Message failed to send. Please try again.');
          setNewMessage(messageData.message);
        }
      }, 2000);
    }
  };

  // Utility functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = useCallback(() => {
    if (!user) return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    setTypingUsers(prev => new Set(prev).add(user.username));

    typingTimerRef.current = setTimeout(() => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.username);
        return newSet;
      });
    }, typingTimeout);
  }, [user]);

  // Online/Offline handlers
  const handleOnline = () => {
    setIsOnline(true);
    checkAuth();
  };

  const handleOffline = () => {
    setIsOnline(false);
    setError('You are offline. Messages will be sent when you reconnect.');
  };

  const handleWindowFocus = () => {
    setUnreadCount(0);
    setLastReadTimestamp(new Date().toISOString());
  };

  const handleWindowBlur = () => {
    if (user) {
      updateOnlineStatus(user.id, false);
    }
  };

  const updateOnlineStatus = async (userId, isOnline) => {
    try {
      await supabase
        .from('profiles')
        .update({ last_seen: isOnline ? new Date().toISOString() : null })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">🔥 Loading LitChat... 🔥</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-2 bg-gray-200 rounded">
              <div className="w-1/2 h-full bg-blue-500 rounded animate-pulse"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`LitChat ${unreadCount ? `(${unreadCount})` : ''}`}</title>
        <meta name="description" content="Join LitChat and connect with your friends!" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
        {!isOnline && (
          <Alert variant="destructive" className="m-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are currently offline. Messages will be sent when you reconnect.
            </AlertDescription>
          </Alert>
        )}

        {!user ? (
          <Card className="max-w-md mx-auto mt-20 p-6">
            <CardHeader>
              <CardTitle className="text-center">🔥•LitChat V1•🔥</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full"
                onClick={() => supabase.auth.signInWithOAuth({ provider: 'discord' })}
              >
                Login with Discord
              </Button>

              <div className="space-y-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email for login"
                  onKeyDown={(e) => e.key === 'Enter' && signInWithEmail()}
                />
                <Button 
                  className="w-full"
                  onClick={() => signInWithEmail()}
                >
                  Submit
                </Button>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  <Input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                  />
                  <Button 
                    className="w-full"
                    onClick={() => verifyOtp()}
                  >
                    Verify OTP
                  </Button>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto p-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>🔥•LitChat V1•🔥</CardTitle>
                <div className="flex items-center space-x-2">
                  <select
                    className="p-2 rounded"
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
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                <div className="h-[60vh] overflow-y-auto mb-4 space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-start space-x-2 ${
                        message.user_id === user.id ? 'justify-end' : ''
                      }`}
                    >
                      <img
                        src={message.profiles.avatar_url}
                        alt="avatar"
                        className="w-8 h-8 rounded-full"
                      />
                      <div className={`max-w-[70%] ${
                        message.user_id === user.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200'
                      } rounded-lg p-2`}>
                        <div className="font-semibold text-sm">
                          {message.profiles.display_name}
                        </div>
                        <div className="break-words">{message.message}</div>
                        <div className="text-xs opacity-75">
                          {new Date(message.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {typingUsers.size > 0 && (
                  <div className="text-sm text-gray-500 italic mb-2">
                    {Array.from(typingUsers).map((username, index) => (
                      <span key={username}>
                        {index > 0 && index === typingUsers.size - 1 ? ' and ' : index > 0 ? ', ' : ''}
                        {username}
                      </span>
                    ))}
                    {typingUsers.size === 1 ? ' is ' : ' are '}
                    typing...
                  </div>
                )}

                <form onSubmit={sendMessage} className="flex space-x-2">
                  <Input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

// Types for TypeScript support
interface Message {
  id: string;
  message: string;
  timestamp: string;
  user_id: string;
  profiles: {
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string;
}