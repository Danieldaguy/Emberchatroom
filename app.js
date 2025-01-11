import { createClient } from '@supabase/supabase-js'

// Debug logger utility
const debug = (functionName, message, data = null) => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [${functionName}] ${message}`, data ? data : '')
}

// Environment validation
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('Missing required environment variables')
}

const supabaseUrl = https://jpphrvektvbpdxuvtgmw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGhydmVrdHZicGR4dXZ0Z213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDE0ODUsImV4cCI6MjA1MTA3NzQ4NX0.3gyADNnD_r9ERElETL8eg5OQVn9wQ3o3RMAC3JkNn9Q'

const supabase = createClient(supabaseUrl, supabaseKey)

debug('initialization', 'Supabase client created', { url: supabaseUrl })

// DOM Elements with validation
const getElement = (id) => {
    const element = document.getElementById(id)
    if (!element) throw new Error(`Element with id '${id}' not found`)
    return element
}

const messagesDiv = getElement('messages')
const sendForm = getElement('send-form')
const messageInput = getElement('message-input')
const usernameInput = getElement('username-input')
const pfpInput = getElement('pfp-input')
const emojiButton = getElement('emoji-button')
const emojiModal = getElement('emoji-modal')
const closeEmojiModal = getElement('close-emoji-modal')
const clearChatBtn = getElement('clear-chat-btn')

debug('DOM', 'All DOM elements successfully loaded')

// Authentication state
let currentUser = null

// Check authentication with enhanced error handling
async function checkAuth() {
    debug('checkAuth', 'Starting authentication check')
    try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
            debug('checkAuth', 'Auth error', error)
            throw error
        }

        if (!session) {
            debug('checkAuth', 'No active session, redirecting to login')
            window.location.href = '/index.html'
            return
        }

        debug('checkAuth', 'User authenticated successfully', { userId: session.user.id })
        currentUser = session.user
        await initializeChat()
    } catch (error) {
        debug('checkAuth', 'Fatal authentication error', error)
        alert('Authentication error. Please try logging in again.')
        window.location.href = '/index.html'
    }
}

async function initializeChat() {
    debug('initializeChat', 'Initializing chat interface')
    try {
        // Load user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', currentUser.id)
            .single()

        if (profileError) {
            debug('initializeChat', 'Error loading profile', profileError)
            throw profileError
        }

        debug('initializeChat', 'Profile loaded', profile)

        if (profile) {
            usernameInput.value = profile.username || ''
            pfpInput.value = profile.avatar_url || ''
        }

        await loadMessages()

        // Set up real-time subscription with error handling
        const subscription = supabase
            .channel('messages')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'messages' }, 
                (payload) => {
                    debug('realtimeUpdate', 'Received realtime update', payload)
                    loadMessages()
                }
            )
            .subscribe((status) => {
                debug('realtimeUpdate', 'Subscription status', status)
            })

        debug('initializeChat', 'Realtime subscription established')
    } catch (error) {
        debug('initializeChat', 'Initialization error', error)
        alert('Error initializing chat. Please refresh the page.')
    }
}

async function loadMessages() {
    debug('loadMessages', 'Starting message load')
    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })

        if (error) {
            debug('loadMessages', 'Error loading messages', error)
            throw error
        }

        debug('loadMessages', `Loaded ${messages.length} messages`)
        messagesDiv.innerHTML = ''
        messages.forEach(displayMessage)
    } catch (error) {
        debug('loadMessages', 'Fatal error loading messages', error)
        alert('Error loading messages. Please refresh the page.')
    }
}

function displayMessage(message) {
    debug('displayMessage', 'Displaying message', { messageId: message.id })
    try {
        const messageElement = document.createElement('div')
        messageElement.className = 'message'

        // Ensure DOMPurify is available
        if (typeof DOMPurify === 'undefined') {
            throw new Error('DOMPurify is not loaded')
        }

        const sanitizedMessage = DOMPurify.sanitize(message.content)
        const sanitizedUsername = DOMPurify.sanitize(message.username)

        messageElement.innerHTML = `
            <img src="${message.pfp || 'default-avatar.png'}" 
                 class="pfp" 
                 alt="Profile Picture"
                 onerror="this.src='default-avatar.png'">
            <div class="message-content">
                <span class="username">${sanitizedUsername}</span>
                <span class="text">${sanitizedMessage}</span>
                <span class="timestamp">${new Date(message.created_at).toLocaleString()}</span>
            </div>
        `

        messagesDiv.appendChild(messageElement)
        messagesDiv.scrollTop = messagesDiv.scrollHeight
        debug('displayMessage', 'Message displayed successfully')
    } catch (error) {
        debug('displayMessage', 'Error displaying message', error)
    }
}

// Send message handler with debouncing
let isSubmitting = false
sendForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (isSubmitting) {
        debug('sendMessage', 'Submission already in progress')
        return
    }

    debug('sendMessage', 'Starting message submission')
    isSubmitting = true

    try {
        const messageContent = messageInput.value.trim()
        if (!messageContent) {
            debug('sendMessage', 'Empty message rejected')
            return
        }

        const message = {
            content: messageContent,
            username: usernameInput.value || 'Anonymous',
            pfp: pfpInput.value || 'default-avatar.png',
            user_id: currentUser.id,
            created_at: new Date().toISOString()
        }

        debug('sendMessage', 'Submitting message', message)

        const { error: messageError } = await supabase
            .from('messages')
            .insert([message])

        if (messageError) {
            debug('sendMessage', 'Error sending message', messageError)
            throw messageError
        }

        messageInput.value = ''
        debug('sendMessage', 'Message sent successfully')

        // Update user profile
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: currentUser.id,
                username: message.username,
                avatar_url: message.pfp,
                updated_at: new Date().toISOString()
            })

        if (profileError) {
            debug('sendMessage', 'Error updating profile', profileError)
        } else {
            debug('sendMessage', 'Profile updated successfully')
        }
    } catch (error) {
        debug('sendMessage', 'Fatal error sending message', error)
        alert('Error sending message. Please try again.')
    } finally {
        isSubmitting = false
    }
})

// Emoji picker functionality with error handling
emojiButton.addEventListener('click', () => {
    debug('emojiPicker', 'Opening emoji modal')
    emojiModal.style.display = 'block'
})

closeEmojiModal.addEventListener('click', () => {
    debug('emojiPicker', 'Closing emoji modal')
    emojiModal.style.display = 'none'
})

document.querySelectorAll('.emoji').forEach(emoji => {
    emoji.addEventListener('click', () => {
        debug('emojiPicker', 'Emoji selected', { emoji: emoji.dataset.emoji })
        messageInput.value += emoji.dataset.emoji
        emojiModal.style.display = 'none'
    })
})

// Clear chat functionality with confirmation
clearChatBtn.addEventListener('click', async () => {
    debug('clearChat', 'Clear chat requested')
    
    if (!currentUser) {
        debug('clearChat', 'No user authenticated')
        return
    }

    if (!confirm('Are you sure you want to clear all your messages? This cannot be undone.')) {
        debug('clearChat', 'Clear chat cancelled by user')
        return
    }

    try {
        debug('clearChat', 'Starting message deletion')
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('user_id', currentUser.id)

        if (error) {
            debug('clearChat', 'Error clearing messages', error)
            throw error
        }

        debug('clearChat', 'Messages cleared successfully')
        await loadMessages()
    } catch (error) {
        debug('clearChat', 'Fatal error clearing messages', error)
        alert('Error clearing messages. Please try again.')
    }
})

// Initialize the application
checkAuth().catch(error => {
    debug('initialization', 'Fatal initialization error', error)
    alert('Error initializing application. Please refresh the page.')
})