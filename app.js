import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const messagesDiv = document.getElementById('messages')
const sendForm = document.getElementById('send-form')
const messageInput = document.getElementById('message-input')
const usernameInput = document.getElementById('username-input')
const pfpInput = document.getElementById('pfp-input')
const emojiButton = document.getElementById('emoji-button')
const emojiModal = document.getElementById('emoji-modal')
const closeEmojiModal = document.getElementById('close-emoji-modal')
const clearChatBtn = document.getElementById('clear-chat-btn')

// Check authentication
let currentUser = null
supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session) {
        window.location.href = '/index.html'
        return
    }
    currentUser = session.user
    initializeChat()
})

async function initializeChat() {
    // Load user profile if exists
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', currentUser.id)
        .single()

    if (profile) {
        usernameInput.value = profile.username || ''
        pfpInput.value = profile.avatar_url || ''
    }

    // Load messages
    loadMessages()

    // Set up real-time subscription
    supabase
        .channel('messages')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'messages' }, 
            loadMessages
        )
        .subscribe()
}

async function loadMessages() {
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })

    if (error) {
        console.error('Error loading messages:', error)
        return
    }

    messagesDiv.innerHTML = ''
    messages.forEach(displayMessage)
}

function displayMessage(message) {
    const messageElement = document.createElement('div')
    messageElement.className = 'message'
    
    const sanitizedMessage = DOMPurify.sanitize(message.content)
    const sanitizedUsername = DOMPurify.sanitize(message.username)
    
    messageElement.innerHTML = `
        <img src="${message.pfp || 'default-avatar.png'}" class="pfp" alt="Profile Picture">
        <div class="message-content">
            <span class="username">${sanitizedUsername}</span>
            <span class="text">${sanitizedMessage}</span>
        </div>
    `
    
    messagesDiv.appendChild(messageElement)
    messagesDiv.scrollTop = messagesDiv.scrollHeight
}

// Send message handler
sendForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    if (!messageInput.value.trim()) return
    
    const message = {
        content: messageInput.value,
        username: usernameInput.value || 'Anonymous',
        pfp: pfpInput.value || 'default-avatar.png',
        user_id: currentUser.id
    }
    
    const { error } = await supabase
        .from('messages')
        .insert([message])
    
    if (error) {
        console.error('Error sending message:', error)
        return
    }
    
    messageInput.value = ''

    // Update user profile
    await supabase
        .from('profiles')
        .upsert({
            id: currentUser.id,
            username: message.username,
            avatar_url: message.pfp,
            updated_at: new Date()
        })
})

// Emoji picker functionality
emojiButton.addEventListener('click', () => {
    emojiModal.style.display = 'block'
})

closeEmojiModal.addEventListener('click', () => {
    emojiModal.style.display = 'none'
})

document.querySelectorAll('.emoji').forEach(emoji => {
    emoji.addEventListener('click', () => {
        messageInput.value += emoji.dataset.emoji
        emojiModal.style.display = 'none'
    })
})

// Clear chat functionality
clearChatBtn.addEventListener('click', async () => {
    if (!currentUser) return
    
    const { error } = await supabase
        .from('messages')
        .delete()
        .eq('user_id', currentUser.id)
    
    if (error) {
        console.error('Error clearing messages:', error)
        return
    }
    
    loadMessages()
})