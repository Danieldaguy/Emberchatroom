import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jpphrvektvbpdxuvtgmw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwcGhydmVrdHZicGR4dXZ0Z213Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1MDE0ODUsImV4cCI6MjA1MTA3NzQ4NX0.3gyADNnD_r9ERElETL8eg5OQVn9wQ3o3RMAC3JkNn9Q'
const supabase = createClient(supabaseUrl, supabaseKey)

// DOM Elements
const discordLogin = document.getElementById('discord-login')
const googleLogin = document.getElementById('google-login')
const emailForm = document.getElementById('email-form')
const signupLink = document.getElementById('signup-link')

// Discord OAuth login
discordLogin.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'discord',
            options: {
                redirectTo: `${window.location.origin}/chat.html`
            }
        })
        if (error) throw error
    } catch (error) {
        alert('Error logging in with Discord: ' + error.message)
    }
})

// Google OAuth login
googleLogin.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/chat.html`
            }
        })
        if (error) throw error
    } catch (error) {
        alert('Error logging in with Google: ' + error.message)
    }
})

// Email login
emailForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        })
        if (error) throw error
        
        window.location.href = '/chat.html'
    } catch (error) {
        alert('Error logging in with email: ' + error.message)
    }
})

// Sign up link
signupLink.addEventListener('click', async (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const password = document.getElementById('password').value

    if (!email || !password) {
        alert('Please enter email and password to sign up')
        return
    }

    try {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                redirectTo: `${window.location.origin}/chat.html`
            }
        })
        if (error) throw error
        
        alert('Check your email for the confirmation link!')
    } catch (error) {
        alert('Error signing up: ' + error.message)
    }
})

// Check if user is already logged in
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        window.location.href = '/chat.html'
    }
})