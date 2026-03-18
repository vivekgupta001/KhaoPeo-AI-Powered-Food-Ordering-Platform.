// ===========================================================================================
// LOCAL DATABASE STORAGE SYSTEM - Using Browser's localStorage API
// ===========================================================================================
// This is a local database implementation that stores all application data in the browser's
// localStorage. localStorage is a built-in browser API that persists data locally on the user's machine.
// Key characteristics:
// - Data persists even after browser closes
// - Stores up to ~5-10MB per domain
// - Synchronous access (no async/await needed)
// - Key-value pair storage (strings only)
// ===========================================================================================

// Define the database key for localStorage
const DB_KEY = 'Zaikalok_data';

/**
 * LOCALHOST DATABASE: Get all data from browser's localStorage
 * @returns {Array} Array of all stored records
 */
function getAllData() {
    // Retrieve stringified JSON from localStorage using DB_KEY
    const data = localStorage.getItem(DB_KEY);
    // Parse JSON string back to array, or return empty array if no data exists
    return data ? JSON.parse(data) : [];
}

/**
 * LOCALHOST DATABASE: Save data to browser's localStorage
 * @param {Array} dataArray - Array of records to save
 */
function saveData(dataArray) {
    // Convert array to JSON string and save to localStorage
    localStorage.setItem(DB_KEY, JSON.stringify(dataArray));
}

/**
 * LOCALHOST DATABASE: Create a new record in localStorage
 * @param {Object} record - Record object to create
 * @returns {Object} Created record with generated __backendId
 */
function createRecord(record) {
    // Retrieve all existing data from localStorage
    const allData = getAllData();
    // Generate unique ID for the record
    const newRecord = {
        ...record,
        __backendId: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    // Add new record to the array
    allData.push(newRecord);
    // Save updated array back to localStorage
    saveData(allData);
    return newRecord;
}

/**
 * LOCALHOST DATABASE: Update an existing record in localStorage
 * @param {Object} record - Record object to update (must have __backendId)
 * @returns {Boolean} True if updated, false if not found
 */
function updateRecord(record) {
    // Retrieve all data from localStorage
    const allData = getAllData();
    // Find index of record with matching __backendId
    const index = allData.findIndex(item => item.__backendId === record.__backendId);
    if (index !== -1) {
        // Replace the record at the found index
        allData[index] = record;
        // Save updated array back to localStorage
        saveData(allData);
        return true;
    }
    return false;
}

/**
 * LOCALHOST DATABASE: Delete a record from localStorage
 * @param {Object} record - Record object to delete (must have __backendId)
 * @returns {Boolean} Always returns true
 */
function deleteRecord(record) {
    // Retrieve all data from localStorage
    const allData = getAllData();
    // Filter out the record with matching __backendId
    const filtered = allData.filter(item => item.__backendId !== record.__backendId);
    // Save filtered array back to localStorage
    saveData(filtered);
    return true;
}

// Global State Variables
let currentUser = null;
let currentView = 'landing';
let cart = [];
let wishlist = [];

// Search and filter state
let searchQuery = '';
let selectedCuisine = 'all';
let priceFilter = { min: 0, max: 10000 };

// Promo codes state
let appliedPromoCode = null;
let promoCodeDiscount = 0;

// ===========================================================================================
// CHATBOT SYSTEM - Role-based Assistant with Voice Support
// ===========================================================================================

let chatbotState = {
    isOpen: false,
    isMuted: false,
    isListening: false,
    userRole: null, // 'guest', 'customer', 'owner', 'delivery'
    messages: [],
    isProcessing: false,
    recognition: null
};

// Initialize Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        chatbotState.recognition = new SpeechRecognition();
        chatbotState.recognition.continuous = false;
        chatbotState.recognition.interimResults = true;
        chatbotState.recognition.language = 'en-US';
        
        chatbotState.recognition.onstart = function() {
            chatbotState.isListening = true;
            const micBtn = document.getElementById('chatbot-mic-btn');
            if (micBtn) {
                micBtn.classList.add('listening');
                micBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
            }
        };
        
        chatbotState.recognition.onend = function() {
            chatbotState.isListening = false;
            const micBtn = document.getElementById('chatbot-mic-btn');
            if (micBtn) {
                micBtn.classList.remove('listening');
                micBtn.style.background = '';
            }
        };
        
        chatbotState.recognition.onresult = function(event) {
            let interimTranscript = '';
            let finalTranscript = '';
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update input field with better accumulation
            const input = document.getElementById('chatbot-input');
            if (input) {
                if (finalTranscript) {
                    // Accumulate final results properly
                    input.value = (input.value + ' ' + finalTranscript).trim();
                    
                    // Auto-send when speech is final
                    if (event.isFinal && input.value.trim().length > 0) {
                        setTimeout(() => {
                            sendChatbotMessage();
                        }, 300);
                    }
                } else if (interimTranscript) {
                    // Show real-time interim results
                    input.placeholder = 'Listening: ' + interimTranscript;
                }
            }
        };
        
        chatbotState.recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            const micBtn = document.getElementById('chatbot-mic-btn');
            if (micBtn) {
                micBtn.style.background = '';
                micBtn.classList.remove('listening');
            }
            showToast('Microphone access denied or not supported', 'error');
        };
    }
}

// Toggle Voice Input
function toggleVoiceInput() {
    if (!chatbotState.recognition) {
        showToast('Voice input not supported on your browser', 'error');
        return;
    }
    
    if (chatbotState.isListening) {
        chatbotState.recognition.stop();
    } else {
        chatbotState.recognition.start();
    }
}

// Chatbot Knowledge Base
const chatbotKnowledge = {
    landing: {
        questions: [
            { q: "What is Zaikalok?", a: "Zaikalok is a food ordering platform that connects customers with restaurants and delivery partners. We make ordering food quick, easy, and convenient!" },
            { q: "How do I register as a customer?", a: "Click on 'Sign Up' button, select 'Customer', enter your email, password, and phone number. Verify your email and you're ready to order!" },
            { q: "How do I register as a restaurant owner?", a: "Go to Sign Up, select 'Restaurant Owner', provide your restaurant details including name, address, cuisine type, and banking information for receiving payments." },
            { q: "How do I register as a delivery partner?", a: "Click Sign Up, select 'Delivery Partner', provide your identification, vehicle details, and bank account. Complete verification and start accepting delivery orders!" },
            { q: "How do I reset my password?", a: "Click 'Forgot Password' on the login page, enter your email, and we'll send you a reset link. Check your email and follow the instructions." },
            { q: "Who created Zaikalok?", a: "Zaikalok was created by a dedicated team of developers and entrepreneurs, Vinit and Vivek, who are passionate about revolutionizing food delivery in campus areas." },
            { q: "How can I contact customer support?", a: "You can reach our support team via email at support@Zaikalok.com or use the 'Help' section in your account for live chat support." },
            { q: "What payment methods do you accept?", a: "We accept credit cards, debit cards, UPI, digital wallets, and cash on delivery options depending on your location." },
            { q: "Is my data secure on Zaikalok?", a: "Yes! We use industry-standard encryption and follow all data protection regulations to keep your information safe and secure." }
        ]
    },
    customer: {
        questions: [
            { q: "How do I place an order?", a: "Browse restaurants, select items, add to cart, review your order, and click checkout. Choose delivery time and payment method to complete." },
            { q: "Can I track my order?", a: "Yes! Once confirmed, you'll see real-time tracking of your order status and delivery partner's location on the map." },
            { q: "What if my order is wrong or late?", a: "Report the issue immediately through the app. Our support team will help with refunds, replacements, or compensation as applicable." },
            { q: "Can I modify my order after placing it?", a: "You can modify orders up to 2 minutes after placing them. After that, contact support immediately to request changes." },
            { q: "What are the delivery charges?", a: "Delivery charges vary based on distance and demand. You'll see the exact charge before confirming your order." },
            { q: "Can I schedule orders in advance?", a: "Yes! You can schedule orders up to 7 days in advance. Select your preferred delivery time during checkout." },
            { q: "How do I view my order history?", a: "Go to 'My Orders' section in your account to see all past orders, re-order favorites, and track refunds." },
            { q: "Can I apply promo codes?", a: "Absolutely! Enter promo codes during checkout. Look for special offers in the 'Deals' section of the app." },
            { q: "How do I save favorite restaurants?", a: "Click the heart icon on any restaurant to add it to your favorites for quick access later." }
        ]
    },
    owner: {
        questions: [
            { q: "How do I manage my restaurant menu?", a: "Log in to your dashboard, go to 'Menu Management', add/edit/delete items with prices, descriptions, and photos." },
            { q: "How do I see incoming orders?", a: "New orders appear in real-time on your dashboard. You can accept, reject, or mark as ready for delivery." },
            { q: "How do I withdraw my earnings?", a: "Go to 'Payments' section, view your account balance, and request withdrawal. Funds transfer within 2-3 business days." },
            { q: "What commission does Zaikalok charge?", a: "Our standard commission is 15-20% depending on your restaurant tier. Premium restaurants get better rates." },
            { q: "Can I set different delivery times for different areas?", a: "Yes! Use the 'Delivery Zones' feature to set custom delivery times and charges for different areas." },
            { q: "How do I update my restaurant information?", a: "Edit your restaurant profile including name, description, address, phone, and operating hours in the settings." },
            { q: "What analytics are available?", a: "Access comprehensive analytics showing daily orders, revenue, popular items, customer feedback, and traffic insights." },
            { q: "How do I handle customer complaints?", a: "Respond to reviews and complaints through the dashboard. Our support team can assist with dispute resolution." },
            { q: "Can I temporarily close my restaurant?", a: "Yes! Use 'Go Offline' to pause accepting orders. Your restaurant will be hidden from customer search temporarily." }
        ]
    },
    delivery: {
        questions: [
            { q: "How do I start accepting deliveries?", a: "Go online in the app, set your availability, and delivery requests will start appearing. Accept orders and navigate using the in-app map." },
            { q: "How do I track my earnings?", a: "View daily, weekly, and monthly earnings in the 'Earnings' section. You can see payment breakdown per delivery." },
            { q: "When do I get paid?", a: "Earnings are processed daily. Payments transfer to your bank account every Friday and Tuesday." },
            { q: "What if I can't deliver an order?", a: "Let the system know immediately by clicking 'Can't Deliver'. A nearby delivery partner will take over the order." },
            { q: "How are delivery fees calculated?", a: "Fees are based on distance and current demand. You'll see exact payment before accepting each order." },
            { q: "Can I choose my delivery zones?", a: "Yes! Set your preferred delivery areas in settings to get relevant delivery requests." },
            { q: "What safety features are available?", a: "We provide in-app messaging, emergency SOS button, real-time location sharing, and 24/7 support." },
            { q: "How do I contact support while on delivery?", a: "Tap the 'Support' button in the app for live chat, phone support, or emergency assistance." },
            { q: "Can I schedule my working hours?", a: "Yes! Set your available hours and days. You'll receive orders only during your scheduled time." }
        ]
    }
};

// Voice synthesis setup
function speakResponse(text) {
    if (chatbotState.isMuted) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
}

// Stop Voice Response
function stopVoiceResponse() {
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }
}

// Get relevant questions based on user role and page
function getRelevantQuestions() {
    let questions = [];
    
    if (!currentUser) {
        questions = chatbotKnowledge.landing.questions;
    } else if (currentUser.role === 'customer') {
        questions = [...chatbotKnowledge.customer.questions, ...chatbotKnowledge.customer.questions];
    } else if (currentUser.role === 'owner') {
        questions = [...chatbotKnowledge.owner.questions, ...chatbotKnowledge.owner.questions];
    } else if (currentUser.role === 'delivery') {
        questions = [...chatbotKnowledge.delivery.questions, ...chatbotKnowledge.delivery.questions];
    }
    
    return questions;
}

// Find answer from knowledge base with enhanced matching and support fallback
function findAnswer(userMessage) {
    const questions = getRelevantQuestions();
    const normalizedInput = userMessage.toLowerCase().trim();
    
    let bestMatch = null;
    let bestScore = 0;
    let matchPercentage = 0;
    
    // Step 1: Try exact match first (highest priority)
    for (let qa of questions) {
        if (normalizedInput === qa.q.toLowerCase()) {
            return qa.a;
        }
    }
    
    // Step 2: Try substring match (if question contains user input or vice versa)
    for (let qa of questions) {
        const qLower = qa.q.toLowerCase();
        // If user question is contained in knowledge base question or vice versa
        if (qLower.includes(normalizedInput) || normalizedInput.includes(qLower)) {
            return qa.a;
        }
    }
    
    // Step 3: Enhanced keyword matching with better algorithm
    // Remove only ultra-common stop words, keep important words like "how", "what", "can", "do"
    const ultraStopWords = ['the', 'a', 'an', 'is', 'are', 'i', 'my', 'to', 'of', 'and', 'or', 'on', 'at', 'by'];
    const inputWords = normalizedInput.split(/\s+/)
        .filter(word => !ultraStopWords.includes(word) && word.length > 1)
        .map(w => w.trim());
    
    for (let qa of questions) {
        const qWords = qa.q.toLowerCase()
            .split(/\s+/)
            .filter(word => !ultraStopWords.includes(word) && word.length > 1)
            .map(w => w.trim());
        
        // Calculate match score
        let matchedWords = 0;
        let totalScore = 0;
        
        for (let word of inputWords) {
            for (let qWord of qWords) {
                // Exact word match (highest score)
                if (word === qWord) {
                    matchedWords++;
                    totalScore += 5;
                }
                // Word starts with same letters (good match)
                else if (qWord.startsWith(word) && word.length > 2) {
                    totalScore += 3;
                }
                else if (word.startsWith(qWord) && qWord.length > 2) {
                    totalScore += 3;
                }
                // Substring match (partial match)
                else if (qWord.includes(word) && word.length > 3) {
                    totalScore += 2;
                }
                else if (word.includes(qWord) && qWord.length > 3) {
                    totalScore += 2;
                }
            }
        }
        
        // Calculate match percentage (how many input words were matched)
        const currentMatchPercentage = inputWords.length > 0 ? (matchedWords / inputWords.length) * 100 : 0;
        
        if (totalScore > bestScore) {
            bestScore = totalScore;
            bestMatch = qa;
            matchPercentage = currentMatchPercentage;
        }
    }
    
    // Step 4: Return best match if we have reasonable match
    // Lower threshold: if any significant keyword matched (score >= 2) or at least 50% of words matched
    if (bestMatch && (bestScore >= 2 || matchPercentage >= 50)) {
        return bestMatch.a;
    }
    
    // Step 5: If still no good match, return helpful response with suggestions
    const supportResponse = `I couldn't find a direct answer to "${userMessage}" in my knowledge base.\n\n📞 **Contact Customer Support:**\n\n📧 Email: support@Zaikalok.com\n📱 Phone: +1-800-Zaikalok\n⏰ Hours: Monday-Friday 9AM-9PM IST\n💬 Live Chat: Available in Help section\n🌐 Website: www.Zaikalok.com/support\n\nOur support team will help you with any questions! You can also try asking similar questions from the suggestions below.`;
    
    return supportResponse;
}

// Initialize chatbot UI - Global chatbot that persists across all pages
function initChatbot() {
    // Check if chatbot already exists (don't duplicate)
    if (document.getElementById('chatbot-widget')) {
        // Chatbot already initialized, just update it for current user role
        updateChatbotForCurrentUser();
        return;
    }
    
    // Create chatbot container that persists outside main app content
    let chatbotContainer = document.getElementById('chatbot-container');
    if (!chatbotContainer) {
        chatbotContainer = document.createElement('div');
        chatbotContainer.id = 'chatbot-container';
        document.body.appendChild(chatbotContainer);
    }
    
    const chatbotHTML = `
        <div id="chatbot-widget" class="chatbot-widget">
            <div class="chatbot-header">
                <div class="chatbot-title">Zaikalok Assistant</div>
                <div class="chatbot-controls">
                    <button id="chatbot-mute-btn" class="chatbot-btn" title="Mute/Unmute Voice">
                        <span class="mute-icon">🔊</span>
                    </button>
                    <button id="chatbot-end-btn" class="chatbot-btn" title="End Chat">
                        <span>✕</span>
                    </button>
                </div>
            </div>
            
            <div class="chatbot-messages" id="chatbot-messages">
                <div class="chatbot-message assistant">
                    <div class="message-content">
                        ${!currentUser 
                            ? "👋 Welcome to Zaikalok! I'm here to help. What would you like to know?" 
                            : `👋 Welcome back! I'm here to help with your ${currentUser.role} needs.`}
                    </div>
                </div>
            </div>
            
            <div class="chatbot-suggestions" id="chatbot-suggestions">
                ${getRelevantQuestions().slice(0, 3).map((qa, idx) => `
                    <button class="suggestion-btn" onclick="handleChatbotSuggestion('${qa.q.replace(/'/g, "\\'")}')">${qa.q}</button>
                `).join('')}
            </div>
            
            <div class="chatbot-input-area">
                <input 
                    type="text" 
                    id="chatbot-input" 
                    class="chatbot-input" 
                    placeholder="Ask me anything or use voice..."
                    onkeypress="handleChatbotKeypress(event)"
                >
                <button id="chatbot-mic-btn" class="chatbot-mic-btn" onclick="toggleVoiceInput()" title="Voice to Text">🎤</button>
                <button id="chatbot-send-btn" class="chatbot-send-btn" onclick="sendChatbotMessage()">📤</button>
            </div>
        </div>
        
        <button id="chatbot-toggle-btn" class="chatbot-toggle-btn" onclick="toggleChatbot()" title="Open Chat">🍽️</button>
    `;
    
    chatbotContainer.innerHTML = chatbotHTML;
    attachChatbotEventListeners();
    initSpeechRecognition();
}

// Update chatbot for current user role and context
function updateChatbotForCurrentUser() {
    const messagesDiv = document.getElementById('chatbot-messages');
    const suggestionsDiv = document.getElementById('chatbot-suggestions');
    const inputDiv = document.querySelector('.chatbot-input-area input');
    
    if (messagesDiv && !messagesDiv.querySelector('.user-updated')) {
        // Add welcome message for new user role
        const welcomeMsg = document.createElement('div');
        welcomeMsg.className = 'chatbot-message assistant user-updated';
        welcomeMsg.innerHTML = `<div class="message-content">
            ${!currentUser 
                ? "👋 Welcome to Zaikalok! I'm here to help. What would you like to know?" 
                : `👋 Welcome back! I'm here to help with your ${currentUser.role} needs.`}
        </div>`;
        
        // Clear old messages and show welcome message
        if (messagesDiv.children.length > 0) {
            messagesDiv.innerHTML = '';
        }
        messagesDiv.appendChild(welcomeMsg);
    }
    
    // Update suggestions for new user role
    if (suggestionsDiv) {
        const questions = getRelevantQuestions().slice(0, 3);
        suggestionsDiv.innerHTML = questions.map(qa => `
            <button class="suggestion-btn" onclick="handleChatbotSuggestion('${qa.q.replace(/'/g, "\\'")}')">${qa.q}</button>
        `).join('');
    }
}

// Attach event listeners
function attachChatbotEventListeners() {
    const muteBtn = document.getElementById('chatbot-mute-btn');
    const endBtn = document.getElementById('chatbot-end-btn');
    
    if (muteBtn) {
        muteBtn.addEventListener('click', function() {
            chatbotState.isMuted = !chatbotState.isMuted;
            muteBtn.querySelector('.mute-icon').textContent = chatbotState.isMuted ? '🔇' : '🔊';
            
            // Stop any ongoing voice response when muting
            if (chatbotState.isMuted) {
                stopVoiceResponse();
            }
        });
    }
    
    if (endBtn) {
        endBtn.addEventListener('click', function() {
            closeChatbot();
        });
    }
}

// Toggle chatbot visibility
function toggleChatbot() {
    const widget = document.getElementById('chatbot-widget');
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    
    if (widget.style.display === 'none' || widget.style.display === '') {
        widget.style.display = 'flex';
        toggleBtn.style.display = 'none';
        chatbotState.isOpen = true;
    }
}

// Close chatbot
function closeChatbot() {
    const widget = document.getElementById('chatbot-widget');
    const toggleBtn = document.getElementById('chatbot-toggle-btn');
    
    widget.style.display = 'none';
    toggleBtn.style.display = 'flex';
    chatbotState.isOpen = false;
}

// Handle chatbot message sending
function sendChatbotMessage() {
    const input = document.getElementById('chatbot-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Reset placeholder to normal
    input.placeholder = 'Ask me anything or use voice...';
    
    addChatbotMessage(message, 'user');
    input.value = '';
    
    // Add typing indicator
    const messagesContainer = document.getElementById('chatbot-messages');
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chatbot-message assistant typing';
    typingIndicator.innerHTML = '<div class="message-content"><span></span><span></span><span></span></div>';
    typingIndicator.id = 'typing-indicator';
    messagesContainer.appendChild(typingIndicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Processing delay with enhanced response
    setTimeout(() => {
        // Remove typing indicator
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
        
        const response = findAnswer(message);
        addChatbotMessage(response, 'assistant');
        speakResponse(response);
        updateChatbotSuggestions();
    }, 800);
}

// Handle keypress in chatbot input
function handleChatbotKeypress(event) {
    if (event.key === 'Enter') {
        sendChatbotMessage();
    }
}

// Handle suggestion button click
function handleChatbotSuggestion(question) {
    const input = document.getElementById('chatbot-input');
    input.value = question;
    sendChatbotMessage();
}

// Add message to chatbot
function addChatbotMessage(text, sender) {
    const messagesDiv = document.getElementById('chatbot-messages');
    const messageEl = document.createElement('div');
    messageEl.className = `chatbot-message ${sender}`;
    messageEl.innerHTML = `<div class="message-content">${text}</div>`;
    messagesDiv.appendChild(messageEl);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    chatbotState.messages.push({ sender, text, timestamp: new Date() });
}

// Update suggestions - Show next set of questions to user
function updateChatbotSuggestions() {
    const suggestionsDiv = document.getElementById('chatbot-suggestions');
    if (suggestionsDiv) {
        const questions = getRelevantQuestions();
        // Show first 3 questions from current role (more consistent and helpful for users)
        const displayedQuestions = questions.slice(0, 3);
        suggestionsDiv.innerHTML = displayedQuestions.map(qa => `
            <button class="suggestion-btn" onclick="handleChatbotSuggestion('${qa.q.replace(/'/g, "\\'")}')">${qa.q}</button>
        `).join('');
    }
}
let ratingFilter = 0;
let sortOption = 'newest';
let availabilityFilter = true;

// Force clear old demo data to load new 7 food items
const demoVersion = localStorage.getItem('demoVersion');
if (demoVersion !== '5.2') {
    localStorage.clear();
    localStorage.setItem('demoVersion', '5.2');
}

let allData = getAllData();

// Configuration
const config = {
    app_title: "Zaikalok",
    tagline: "Order Food from Campus & Beyond",
    admin_username: "admin",
    admin_password: "admin123"
};

// Seed Demo Data (runs only once)
function seedDemoData() {
    const allData = getAllData();
    
    // Check if demo data already exists
    const demoRestaurants = allData.filter(item => item.type === 'user' && item.isDemoData === true);
    if (demoRestaurants.length > 0) {
        return; // Demo data already seeded
    }
    
    // Create Demo Restaurants with FIXED IDs (IMPORTANT: DO NOT CHANGE THESE)
    const demoRestaurant1 = {
        type: 'user',
        role: 'restaurant',
        name: 'Taj Biryani House',
        email: 'taj@biryani.com',
        phone: '9876543210',
        username: 'tajbiryani_demo',
        password: 'demo123',
        address: 'Near Central Park, Mumbai',
        restaurantName: 'Taj Biryani House',
        cuisine: 'Indian Biryani',
        status: 'approved',
        isDemoData: true,
        __backendId: 'demo_restaurant_taj_biryani'
    };
    
    const demoRestaurant2 = {
        type: 'user',
        role: 'restaurant',
        name: 'Pizza Paradise',
        email: 'pizza@paradise.com',
        phone: '9876543211',
        username: 'pizzaparadise_demo',
        password: 'demo123',
        address: 'Downtown City Center, Mumbai',
        restaurantName: 'Pizza Paradise',
        cuisine: 'Italian Pizza',
        status: 'approved',
        isDemoData: true,
        __backendId: 'demo_restaurant_pizza_paradise'
    };
    
    const demoRestaurant3 = {
        type: 'user',
        role: 'restaurant',
        name: 'Burger Hub',
        email: 'burger@hub.com',
        phone: '9876543212',
        username: 'burgerhub_demo',
        password: 'demo123',
        address: 'Tech Park, Bangalore',
        restaurantName: 'Burger Hub',
        cuisine: 'Fast Food Burgers',
        status: 'approved',
        isDemoData: true,
        __backendId: 'demo_restaurant_burger_hub'
    };
    
    createRecord(demoRestaurant1);
    createRecord(demoRestaurant2);
    createRecord(demoRestaurant3);
    
    // Get updated data with new restaurants
    const updatedData = getAllData();
    const rest1 = updatedData.find(r => r.isDemoData && r.restaurantName === 'Taj Biryani House');
    const rest2 = updatedData.find(r => r.isDemoData && r.restaurantName === 'Pizza Paradise');
    const rest3 = updatedData.find(r => r.isDemoData && r.restaurantName === 'Burger Hub');
    
    // Demo Food Items for Restaurant 1 (Biryani)
    const biryaniItems = [
        {
            type: 'food',
            restaurantId: rest1.__backendId,
            name: 'Hyderabadi Biryani',
            category: 'Biryani',
            price: 250,
            description: 'Authentic Hyderabadi biryani with fragrant basmati rice',
            imageUrl: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        }
    ];
    
    // Demo Food Items for Restaurant 2 (Pizza)
    const pizzaItems = [
        {
            type: 'food',
            restaurantId: rest2.__backendId,
            name: 'Margherita Pizza',
            category: 'Vegetarian Pizza',
            price: 300,
            description: 'Classic pizza with mozzarella cheese and fresh basil',
            imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        },
        {
            type: 'food',
            restaurantId: rest2.__backendId,
            name: 'Pepperoni Pizza',
            category: 'Non-Vegetarian Pizza',
            price: 350,
            description: 'Delicious pizza loaded with pepperoni slices',
            imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        },
        {
            type: 'food',
            restaurantId: rest2.__backendId,
            name: 'BBQ Chicken Pizza',
            category: 'Non-Vegetarian Pizza',
            price: 380,
            description: 'Smoky BBQ sauce with tender chicken and cheese',
            imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        }
    ];
    
    // Demo Food Items for Restaurant 3 (Burgers)
    const burgerItems = [
        {
            type: 'food',
            restaurantId: rest3.__backendId,
            name: 'Classic Burger',
            category: 'Vegetarian Burger',
            price: 180,
            description: 'Delicious burger with fresh vegetables and cheese',
            imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        },
        {
            type: 'food',
            restaurantId: rest3.__backendId,
            name: 'Chicken Burger',
            category: 'Non-Vegetarian Burger',
            price: 220,
            description: 'Juicy grilled chicken burger with special sauce',
            imageUrl: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        },
        {
            type: 'food',
            restaurantId: rest3.__backendId,
            name: 'Spicy Burger',
            category: 'Non-Vegetarian Burger',
            price: 240,
            description: 'Fiery burger with jalapeños and hot sauce',
            imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=500&h=400&fit=crop',
            imageApprovalStatus: 'approved',
            available: true,
            isDemoData: true
        }
    ];
    
    // Add all demo food items
    biryaniItems.forEach(item => createRecord(item));
    pizzaItems.forEach(item => createRecord(item));
    burgerItems.forEach(item => createRecord(item));
    
    // Demo Promo Codes for Restaurants
    const demoPromos = [
        // Promos for Taj Biryani House
        {
            type: 'promo',
            restaurantId: rest1.__backendId,
            code: 'BIRYANI50',
            description: '50% off on first order',
            discountType: 'percentage',
            discountValue: 50,
            minOrderValue: 300,
            maxDiscount: 250,
            expiryDate: '2026-12-31',
            isDemoData: true
        },
        {
            type: 'promo',
            restaurantId: rest1.__backendId,
            code: 'SAVE100',
            description: 'Rs100 off on orders above Rs500',
            discountType: 'fixed',
            discountValue: 100,
            minOrderValue: 500,
            maxDiscount: 100,
            expiryDate: '2026-12-31',
            isDemoData: true
        },
        // Promos for Pizza Paradise
        {
            type: 'promo',
            restaurantId: rest2.__backendId,
            code: 'PIZZA30',
            description: '30% off on all pizzas',
            discountType: 'percentage',
            discountValue: 30,
            minOrderValue: 400,
            maxDiscount: 200,
            expiryDate: '2026-12-31',
            isDemoData: true
        },
        {
            type: 'promo',
            restaurantId: rest2.__backendId,
            code: 'DELIVERY25',
            description: 'Rs25 off on delivery',
            discountType: 'fixed',
            discountValue: 25,
            minOrderValue: 350,
            maxDiscount: 25,
            expiryDate: '2026-12-31',
            isDemoData: true
        },
        // Promos for Burger Hub
        {
            type: 'promo',
            restaurantId: rest3.__backendId,
            code: 'BURGER40',
            description: '40% off on burgers',
            discountType: 'percentage',
            discountValue: 40,
            minOrderValue: 350,
            maxDiscount: 180,
            expiryDate: '2026-12-31',
            isDemoData: true
        },
        {
            type: 'promo',
            restaurantId: rest3.__backendId,
            code: 'FREEBITE',
            description: 'Rs150 off on orders above Rs600',
            discountType: 'fixed',
            discountValue: 150,
            minOrderValue: 600,
            maxDiscount: 150,
            expiryDate: '2026-12-31',
            isDemoData: true
        }
    ];
    
    // Add all demo promo codes
    demoPromos.forEach(promo => createRecord(promo));
    
    allData = getAllData();
}

// Initialize App
function initApp() {
    allData = getAllData();
    
    // Seed demo data (runs only once)
    seedDemoData();
    
    // Check if user is logged in (from session storage)
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        navigateToDashboard(currentUser.role);
    } else {
        renderLandingPage();
    }
}

// Render Landing Page
function renderLandingPage() {
    currentView = 'landing';
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="landing-page">
            <div class="landing-header">
                <div class="logo-container">
                    <span class="logo-icon">🍛</span>
                    <span class="logo-text">${config.app_title}</span>
                </div>
                <p>${config.tagline}</p>
                <div class="feature-tags">
                    <div class="feature-tag">⚡ Fast Delivery</div>
                    <div class="feature-tag">🍽️ Multiple Restaurants</div>
                    <div class="feature-tag">💳 Easy Payments</div>
                </div>
            </div>
            <div class="role-selection">
                <div class="role-card" onclick="navigateToLogin('admin')">
                    <div class="role-icon">👨‍💼</div>
                    <h3>Admin</h3>
                    <p>Manage restaurants, users, and orders</p>
                </div>
                <div class="role-card" onclick="navigateToLogin('restaurant')">
                    <div class="role-icon">🍽️</div>
                    <h3>Restaurant Owner</h3>
                    <p>Manage menu and orders</p>
                </div>
                <div class="role-card" onclick="navigateToLogin('customer')">
                    <div class="role-icon">🛒</div>
                    <h3>Customer</h3>
                    <p>Browse and order food</p>
                </div>
                <div class="role-card" onclick="navigateToLogin('delivery')">
                    <div class="role-icon">🏍️</div>
                    <h3>Delivery Partner</h3>
                    <p>Deliver orders to customers</p>
                </div>
            </div>
        </div>
    `;
}

// Navigate to Login
function navigateToLogin(role) {
    currentView = `login-${role}`;
    const app = document.getElementById('app');
    
    const roleNames = {
        admin: 'Admin',
        restaurant: 'Restaurant Owner',
        customer: 'Customer',
        delivery: 'Delivery Partner'
    };
    
    app.innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <div class="login-header">
                    <h2>${roleNames[role]} Login</h2>
                    <p>${config.app_title}</p>
                </div>
                <form id="loginForm" onsubmit="handleLogin(event, '${role}')">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        Login
                    </button>
                    ${role === 'customer' || role === 'restaurant' || role === 'delivery' ? `
                        <div class="register-link">
                            Don't have an account? <a href="#" onclick="navigateToRegister('${role}'); return false;">Register</a>
                        </div>
                        <div class="forgot-password-link">
                            <a href="#" onclick="navigateToForgotPassword('${role}'); return false;">Forgot Password?</a>
                        </div>
                    ` : ''}
                    <button type="button" class="btn btn-secondary" onclick="renderLandingPage()">
                        Back
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Navigate to Register
function navigateToRegister(role) {
    currentView = `register-${role}`;
    const app = document.getElementById('app');
    
    const roleNames = {
        restaurant: 'Restaurant Owner',
        customer: 'Customer',
        delivery: 'Delivery Partner'
    };
    
    let extraFields = '';
    if (role === 'restaurant') {
        extraFields = `
            <div class="form-group">
                <label for="restaurantName">Restaurant Name</label>
                <input type="text" id="restaurantName" oninput="validateRestaurantName()" required>
                <small class="warning-message" id="restaurantNameWarning" style="display:none;"></small>
            </div>
            <div class="form-group">
                <label for="cuisine">Cuisine Type</label>
                <input type="text" id="cuisine" placeholder="e.g., Italian, Chinese, Indian" oninput="validateCuisine()" required>
                <small class="warning-message" id="cuisineWarning" style="display:none;"></small>
            </div>
        `;
    }
    
    app.innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <div class="login-header">
                    <h2>${roleNames[role]} Registration</h2>
                    <p>${config.app_title}</p>
                </div>
                <form id="registerForm" onsubmit="handleRegister(event, '${role}')">
                    <div class="form-group">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" placeholder="e.g., John Doe" oninput="validateFullName()" required>
                        <small class="warning-message" id="nameWarning" style="display:none;"></small>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" placeholder="e.g., user@example.com" oninput="validateEmail()" required>
                        <small class="warning-message" id="emailWarning" style="display:none;"></small>
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" placeholder="e.g., 1234567890" oninput="validatePhone()" required>
                        <small class="warning-message" id="phoneWarning" style="display:none;"></small>
                    </div>
                    ${extraFields}
                    <div class="form-group">
                        <label for="address">Address</label>
                        <input type="text" id="address" placeholder="e.g., 123 Main St, City" oninput="validateAddress()" required>
                        <small class="warning-message" id="addressWarning" style="display:none;"></small>
                    </div>
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" placeholder="e.g., john_doe123" oninput="validateUsername()" required>
                        <small class="warning-message" id="usernameWarning" style="display:none;"></small>
                    </div>
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" placeholder="Minimum 6 characters" oninput="validatePassword()" required>
                        <small class="warning-message" id="passwordWarning" style="display:none;"></small>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        Register
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="navigateToLogin('${role}')">
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Navigate to Forgot Password
function navigateToForgotPassword(role) {
    currentView = `forgot-password-${role}`;
    const app = document.getElementById('app');
    
    const roleNames = {
        restaurant: 'Restaurant Owner',
        customer: 'Customer',
        delivery: 'Delivery Partner'
    };
    
    app.innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <div class="login-header">
                    <h2>Forgot Password</h2>
                    <p>${config.app_title}</p>
                </div>
                <form id="forgotPasswordForm" onsubmit="handleForgotPassword(event, '${role}')">
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" placeholder="Enter your username" required>
                    </div>
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" placeholder="Enter your registered email" required>
                    </div>
                    <button type="submit" class="btn btn-primary">
                        Verify Account
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="navigateToLogin('${role}')">
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Handle Forgot Password
function handleForgotPassword(event, role) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    
    allData = getAllData();
    const user = allData.find(item => item.type === 'user' && item.role === role && item.username === username && item.email === email);
    
    if (user) {
        navigateToResetPassword(role, user.__backendId);
    } else {
        showToast('Username or email not found', 'error');
    }
}

// Navigate to Reset Password
function navigateToResetPassword(role, userId) {
    currentView = `reset-password-${role}`;
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="login-page">
            <div class="login-container">
                <div class="login-header">
                    <h2>Reset Password</h2>
                    <p>${config.app_title}</p>
                </div>
                <form id="resetPasswordForm" onsubmit="handleResetPassword(event, '${role}', '${userId}')">
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" placeholder="Enter new password" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" placeholder="Confirm new password" required minlength="6">
                    </div>
                    <button type="submit" class="btn btn-primary">
                        Reset Password
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="navigateToLogin('${role}')">
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    `;
}

// Handle Reset Password
function handleResetPassword(event, role, userId) {
    event.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showToast('Password must be at least 6 characters long', 'error');
        return;
    }
    
    allData = getAllData();
    const user = allData.find(item => item.__backendId === userId);
    
    if (user) {
        user.password = newPassword;
        updateRecord(user);
        showToast('Password reset successfully! Please login with your new password.', 'success');
        navigateToLogin(role);
    } else {
        showToast('Error resetting password. Please try again.', 'error');
    }
}

// ===== REGISTRATION FORM VALIDATION FUNCTIONS =====

// Validate Full Name (letters and spaces only)
function validateFullName(isSubmit = false) {
    const nameInput = document.getElementById('name');
    const nameWarning = document.getElementById('nameWarning');
    const value = nameInput.value.trim();
    
    if (!isSubmit && !nameWarning) return true;
    
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    
    if (value === '') {
        if (nameWarning) {
            nameWarning.textContent = 'Full name is required';
            nameWarning.style.display = 'block';
        }
        return false;
    } else if (!nameRegex.test(value)) {
        if (nameWarning) {
            nameWarning.textContent = 'Name should contain only letters and spaces (2-50 characters)';
            nameWarning.style.display = 'block';
        }
        return false;
    } else {
        if (nameWarning) {
            nameWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Email
function validateEmail(isSubmit = false) {
    const emailInput = document.getElementById('email');
    const emailWarning = document.getElementById('emailWarning');
    const value = emailInput.value.trim();
    
    if (!isSubmit && !emailWarning) return true;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (value === '') {
        if (emailWarning) {
            emailWarning.textContent = 'Email is required';
            emailWarning.style.display = 'block';
        }
        return false;
    } else if (!emailRegex.test(value)) {
        if (emailWarning) {
            emailWarning.textContent = 'Please enter a valid email address (e.g., user@example.com)';
            emailWarning.style.display = 'block';
        }
        return false;
    } else {
        if (emailWarning) {
            emailWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Phone Number (10 digits)
function validatePhone(isSubmit = false) {
    const phoneInput = document.getElementById('phone');
    const phoneWarning = document.getElementById('phoneWarning');
    const value = phoneInput.value.trim();
    
    if (!isSubmit && !phoneWarning) return true;
    
    const phoneRegex = /^[0-9]{10}$/;
    
    if (value === '') {
        if (phoneWarning) {
            phoneWarning.textContent = 'Phone number is required';
            phoneWarning.style.display = 'block';
        }
        return false;
    } else if (!phoneRegex.test(value)) {
        if (phoneWarning) {
            phoneWarning.textContent = 'Please enter a valid 10-digit phone number';
            phoneWarning.style.display = 'block';
        }
        return false;
    } else {
        if (phoneWarning) {
            phoneWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Address
function validateAddress(isSubmit = false) {
    const addressInput = document.getElementById('address');
    const addressWarning = document.getElementById('addressWarning');
    const value = addressInput.value.trim();
    
    if (!isSubmit && !addressWarning) return true;
    
    if (value === '') {
        if (addressWarning) {
            addressWarning.textContent = 'Address is required';
            addressWarning.style.display = 'block';
        }
        return false;
    } else if (value.length < 5 || value.length > 100) {
        if (addressWarning) {
            addressWarning.textContent = 'Address should be between 5-100 characters';
            addressWarning.style.display = 'block';
        }
        return false;
    } else {
        if (addressWarning) {
            addressWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Username
function validateUsername(isSubmit = false) {
    const usernameInput = document.getElementById('username');
    const usernameWarning = document.getElementById('usernameWarning');
    const value = usernameInput.value.trim();
    
    if (!isSubmit && !usernameWarning) return true;
    
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    
    if (value === '') {
        if (usernameWarning) {
            usernameWarning.textContent = 'Username is required';
            usernameWarning.style.display = 'block';
        }
        return false;
    } else if (!usernameRegex.test(value)) {
        if (usernameWarning) {
            usernameWarning.textContent = 'Username should be 3-20 characters (letters, numbers, and underscore only)';
            usernameWarning.style.display = 'block';
        }
        return false;
    } else {
        if (usernameWarning) {
            usernameWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Password
function validatePassword(isSubmit = false) {
    const passwordInput = document.getElementById('password');
    const passwordWarning = document.getElementById('passwordWarning');
    const value = passwordInput.value;
    
    if (!isSubmit && !passwordWarning) return true;
    
    if (value === '') {
        if (passwordWarning) {
            passwordWarning.textContent = 'Password is required';
            passwordWarning.style.display = 'block';
        }
        return false;
    } else if (value.length < 6) {
        if (passwordWarning) {
            passwordWarning.textContent = 'Password must be at least 6 characters long';
            passwordWarning.style.display = 'block';
        }
        return false;
    } else if (value.length > 50) {
        if (passwordWarning) {
            passwordWarning.textContent = 'Password should not exceed 50 characters';
            passwordWarning.style.display = 'block';
        }
        return false;
    } else {
        if (passwordWarning) {
            passwordWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Restaurant Name
function validateRestaurantName(isSubmit = false) {
    const restaurantInput = document.getElementById('restaurantName');
    const restaurantWarning = document.getElementById('restaurantNameWarning');
    
    if (!restaurantInput) return true;
    
    const value = restaurantInput.value.trim();
    
    if (!isSubmit && !restaurantWarning) return true;
    
    if (value === '') {
        if (restaurantWarning) {
            restaurantWarning.textContent = 'Restaurant name is required';
            restaurantWarning.style.display = 'block';
        }
        return false;
    } else if (value.length < 3 || value.length > 50) {
        if (restaurantWarning) {
            restaurantWarning.textContent = 'Restaurant name should be between 3-50 characters';
            restaurantWarning.style.display = 'block';
        }
        return false;
    } else {
        if (restaurantWarning) {
            restaurantWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Cuisine Type
function validateCuisine(isSubmit = false) {
    const cuisineInput = document.getElementById('cuisine');
    const cuisineWarning = document.getElementById('cuisineWarning');
    
    if (!cuisineInput) return true;
    
    const value = cuisineInput.value.trim();
    
    if (!isSubmit && !cuisineWarning) return true;
    
    const cuisineRegex = /^[a-zA-Z\s,]{3,50}$/;
    
    if (value === '') {
        if (cuisineWarning) {
            cuisineWarning.textContent = 'Cuisine type is required';
            cuisineWarning.style.display = 'block';
        }
        return false;
    } else if (!cuisineRegex.test(value)) {
        if (cuisineWarning) {
            cuisineWarning.textContent = 'Cuisine should contain only letters and commas (3-50 characters)';
            cuisineWarning.style.display = 'block';
        }
        return false;
    } else {
        if (cuisineWarning) {
            cuisineWarning.style.display = 'none';
        }
        return true;
    }
}

// Handle Login
function handleLogin(event, role) {
    event.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (role === 'admin') {
        if (username === config.admin_username && password === config.admin_password) {
            currentUser = { role: 'admin', username, name: 'Administrator' };
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            showToast('Login successful!', 'success');
            navigateToDashboard('admin');
        } else {
            showToast('Invalid admin credentials', 'error');
        }
        return;
    }
    
    allData = getAllData();
    const users = allData.filter(item => item.type === 'user' && item.role === role);
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        if (role === 'restaurant' && user.status === 'blocked') {
            showToast('Your account has been blocked', 'error');
            return;
        }
        
        if (role === 'restaurant' && user.status === 'pending') {
            showToast('Your account is pending approval', 'error');
            return;
        }
        
        currentUser = user;
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        showToast('Login successful!', 'success');
        navigateToDashboard(role);
    } else {
        showToast('Invalid credentials', 'error');
    }
}

// Handle Register
function handleRegister(event, role) {
    event.preventDefault();
    
    // Get all form values
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    
    // Validate all fields
    if (!validateFullName(true) || !validateEmail(true) || !validatePhone(true) || 
        !validateAddress(true) || !validateUsername(true) || !validatePassword(true)) {
        showToast('Please correct the errors in the form', 'error');
        return;
    }
    
    // Check for restaurant-specific fields
    if (role === 'restaurant') {
        if (!validateRestaurantName(true) || !validateCuisine(true)) {
            showToast('Please correct the errors in the form', 'error');
            return;
        }
    }
    
    allData = getAllData();
    const existingUser = allData.find(item => item.type === 'user' && item.username === username);
    
    if (existingUser) {
        document.getElementById('usernameWarning').textContent = 'Username already exists';
        document.getElementById('usernameWarning').style.display = 'block';
        showToast('Username already exists', 'error');
        return;
    }
    
    const userData = {
        type: 'user',
        role: role,
        username: username,
        password: password,
        name: name,
        email: email,
        phone: phone,
        address: address,
        status: role === 'restaurant' ? 'pending' : 'approved'
    };
    
    if (role === 'restaurant') {
        userData.restaurantName = document.getElementById('restaurantName').value.trim();
        userData.cuisine = document.getElementById('cuisine').value.trim();
    }
    
    createRecord(userData);
    allData = getAllData();
    showToast('Registration successful! Please login.', 'success');
    navigateToLogin(role);
}

// Navigate to Dashboard
function navigateToDashboard(role) {
    switch(role) {
        case 'admin':
            renderAdminDashboard();
            break;
        case 'restaurant':
            renderRestaurantDashboard();
            break;
        case 'customer':
            renderCustomerDashboard();
            break;
        case 'delivery':
            renderDeliveryDashboard();
            break;
    }
    
    // Update chatbot for the new user role
    setTimeout(() => {
        updateChatbotForCurrentUser();
    }, 100);
}

// Render Admin Dashboard
function renderAdminDashboard() {
    currentView = 'admin-dashboard';
    allData = getAllData();
    const app = document.getElementById('app');
    
    const users = allData.filter(item => item.type === 'user');
    const restaurants = allData.filter(item => item.type === 'user' && item.role === 'restaurant');
    const deliveryPartners = allData.filter(item => item.type === 'user' && item.role === 'delivery');
    const customers = allData.filter(item => item.type === 'user' && item.role === 'customer');
    const orders = allData.filter(item => item.type === 'order');
    const pendingImages = allData.filter(item => item.type === 'food' && item.imageApprovalStatus === 'pending');
    
    app.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Admin Panel</h2>
                    <p>${currentUser.name}</p>
                </div>
                <ul class="sidebar-menu">
                    <li class="active" onclick="showAdminSection('overview')">📊 Overview</li>
                    <li onclick="showAdminSection('restaurants')">🍽️ Restaurants</li>
                    <li onclick="showAdminSection('delivery')">🏍️ Delivery Partners</li>
                    <li onclick="showAdminSection('images')">🖼️ Image Approvals ${pendingImages.length > 0 ? `<span style="background: #ef4444; color: white; padding: 0.125rem 0.5rem; border-radius: 12px; margin-left: 0.5rem; font-size: 0.75rem;">${pendingImages.length}</span>` : ''}</li>
                    <li onclick="showAdminSection('orders')">📦 All Orders</li>
                    <li onclick="showAdminSection('users')">👥 Customers</li>
                    <li onclick="logout()">🚪 Logout</li>
                </ul>
            </div>
            <div class="main-content">
                <div class="content-header">
                    <h1>Dashboard Overview</h1>
                    <p>Manage your platform</p>
                </div>
                <div class="content-body" id="adminContent">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Restaurants</span>
                                <span class="stat-icon">🍽️</span>
                            </div>
                            <div class="stat-value">${restaurants.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Delivery Partners</span>
                                <span class="stat-icon">🏍️</span>
                            </div>
                            <div class="stat-value">${deliveryPartners.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Customers</span>
                                <span class="stat-icon">👥</span>
                            </div>
                            <div class="stat-value">${customers.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Total Orders</span>
                                <span class="stat-icon">📦</span>
                            </div>
                            <div class="stat-value">${orders.length}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show Admin Section
function showAdminSection(section) {
    allData = getAllData();
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('adminContent');
    
    switch(section) {
        case 'overview':
            const restaurants = allData.filter(item => item.type === 'user' && item.role === 'restaurant');
            const deliveryPartners = allData.filter(item => item.type === 'user' && item.role === 'delivery');
            const customers = allData.filter(item => item.type === 'user' && item.role === 'customer');
            const orders = allData.filter(item => item.type === 'order');
            
            content.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Restaurants</span>
                            <span class="stat-icon">🍽️</span>
                        </div>
                        <div class="stat-value">${restaurants.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Delivery Partners</span>
                            <span class="stat-icon">🏍️</span>
                        </div>
                        <div class="stat-value">${deliveryPartners.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Customers</span>
                            <span class="stat-icon">👥</span>
                        </div>
                        <div class="stat-value">${customers.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Total Orders</span>
                            <span class="stat-icon">📦</span>
                        </div>
                        <div class="stat-value">${orders.length}</div>
                    </div>
                </div>
            `;
            break;
            
        case 'restaurants':
            renderRestaurantsManagement(content);
            break;
            
        case 'delivery':
            renderDeliveryPartnersManagement(content);
            break;
            
        case 'images':
            renderImageApprovals(content);
            break;
            
        case 'orders':
            renderAllOrders(content);
            break;
            
        case 'users':
            renderUsersManagement(content);
            break;
    }
}

// Render Image Approvals
function renderImageApprovals(container) {
    const pendingImages = allData.filter(item => item.type === 'food' && item.imageApprovalStatus === 'pending');
    
    if (pendingImages.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🖼️</div>
                <h3>No Pending Image Approvals</h3>
                <p>All food images have been reviewed</p>
            </div>
        `;
        return;
    }
    
    let imageCards = '';
    pendingImages.forEach(food => {
        const restaurant = allData.find(r => r.__backendId === food.restaurantId);
        
        imageCards += `
            <div class="food-card">
                <div class="food-image" style="display: flex; align-items: center; justify-content: center;">
                    ${food.imageUrl ? `<img src="${food.imageUrl}" crossOrigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="font-size: 3rem;">🍽️</span>'}
                </div>
                <div class="food-info">
                    <div class="food-name">${food.name}</div>
                    <div class="food-restaurant">${restaurant?.restaurantName || 'Unknown Restaurant'}</div>
                    <div class="food-price">₹${food.price}</div>
                    <div style="margin-bottom: 1rem;">
                        <span class="status-badge status-pending">Pending Approval</span>
                    </div>
                    <p style="font-size: 0.875rem; color: #666; margin-bottom: 1rem;">${food.description}</p>
                    <div class="food-actions">
                        <button class="btn-small btn-approve" onclick="approveImage('${food.__backendId}')">Approve</button>
                        <button class="btn-small btn-block" onclick="rejectImage('${food.__backendId}')">Reject</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <h3 style="font-size: 1.5rem; color: #333; margin-bottom: 0.5rem;">Pending Image Approvals</h3>
            <p style="color: #666;">Review and approve food images before they appear to customers</p>
        </div>
        <div class="food-grid">
            ${imageCards}
        </div>
    `;
}

// Approve Image
function approveImage(foodId) {
    const food = allData.find(item => item.__backendId === foodId);
    if (food) {
        food.imageApprovalStatus = 'approved';
        updateRecord(food);
        allData = getAllData();
        showToast('Image approved successfully', 'success');
        const content = document.getElementById('adminContent');
        renderImageApprovals(content);
    }
}

// Reject Image
function rejectImage(foodId) {
    const food = allData.find(item => item.__backendId === foodId);
    if (food) {
        food.imageApprovalStatus = 'rejected';
        food.imageUrl = '';
        updateRecord(food);
        allData = getAllData();
        showToast('Image rejected successfully', 'success');
        const content = document.getElementById('adminContent');
        renderImageApprovals(content);
    }
}

// Render Delivery Partners Management
function renderDeliveryPartnersManagement(container) {
    const deliveryPartners = allData.filter(item => item.type === 'user' && item.role === 'delivery');
    
    let tableRows = '';
    deliveryPartners.forEach(partner => {
        const assignedOrders = allData.filter(item => 
            item.type === 'order' && 
            item.deliveryPartnerId === partner.__backendId
        );
        
        const activeDeliveries = assignedOrders.filter(o => o.orderStatus === 'out-for-delivery').length;
        const completedDeliveries = assignedOrders.filter(o => o.orderStatus === 'delivered').length;
        const totalEarnings = completedDeliveries * 50;
        
        tableRows += `
            <tr>
                <td>${partner.name}</td>
                <td>${partner.username}</td>
                <td>${partner.phone}</td>
                <td>${partner.email}</td>
                <td>
                    <span style="color: #f59e0b; font-weight: 600;">${activeDeliveries}</span>
                </td>
                <td>
                    <span style="color: #10b981; font-weight: 600;">${completedDeliveries}</span>
                </td>
                <td>
                    <span style="color: #667eea; font-weight: 600;">₹${totalEarnings}</span>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3>Delivery Partners Management</h3>
            </div>
            ${deliveryPartners.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Active Deliveries</th>
                            <th>Completed</th>
                            <th>Earnings</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">🏍️</div>
                    <h3>No Delivery Partners Yet</h3>
                    <p>No delivery partners have registered yet</p>
                </div>
            `}
        </div>
    `;
}

// Render Restaurants Management
function renderRestaurantsManagement(container) {
    const restaurants = allData.filter(item => item.type === 'user' && item.role === 'restaurant');
    
    let tableRows = '';
    restaurants.forEach(restaurant => {
        tableRows += `
            <tr>
                <td>${restaurant.restaurantName}</td>
                <td>${restaurant.name}</td>
                <td>${restaurant.cuisine}</td>
                <td>${restaurant.phone}</td>
                <td>
                    <span class="status-badge status-${restaurant.status}">
                        ${restaurant.status.toUpperCase()}
                    </span>
                </td>
                <td>
                    ${restaurant.status === 'pending' ? `
                        <button class="btn-small btn-approve" onclick="approveRestaurant('${restaurant.__backendId}')">
                            Approve
                        </button>
                    ` : ''}
                    ${restaurant.status === 'approved' ? `
                        <button class="btn-small btn-block" onclick="blockRestaurant('${restaurant.__backendId}')">
                            Block
                        </button>
                    ` : ''}
                    ${restaurant.status === 'blocked' ? `
                        <button class="btn-small btn-approve" onclick="approveRestaurant('${restaurant.__backendId}')">
                            Unblock
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3>Restaurants Management</h3>
            </div>
            ${restaurants.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Restaurant Name</th>
                            <th>Owner Name</th>
                            <th>Cuisine</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">🍽️</div>
                    <h3>No Restaurants Yet</h3>
                    <p>No restaurants have registered yet</p>
                </div>
            `}
        </div>
    `;
}

// Approve Restaurant
function approveRestaurant(restaurantId) {
    const restaurant = allData.find(item => item.__backendId === restaurantId);
    if (restaurant) {
        restaurant.status = 'approved';
        updateRecord(restaurant);
        allData = getAllData();
        showToast('Restaurant approved successfully', 'success');
        const content = document.getElementById('adminContent');
        renderRestaurantsManagement(content);
    }
}

// Block Restaurant
function blockRestaurant(restaurantId) {
    const restaurant = allData.find(item => item.__backendId === restaurantId);
    if (restaurant) {
        restaurant.status = 'blocked';
        updateRecord(restaurant);
        allData = getAllData();
        showToast('Restaurant blocked successfully', 'success');
        const content = document.getElementById('adminContent');
        renderRestaurantsManagement(content);
    }
}

// Render All Orders
function renderAllOrders(container) {
    const orders = allData.filter(item => item.type === 'order');
    
    let tableRows = '';
    orders.forEach(order => {
        const customer = allData.find(u => u.__backendId === order.customerId);
        const restaurant = allData.find(r => r.__backendId === order.restaurantId);
        
        tableRows += `
            <tr>
                <td>#${order.id ? order.id.slice(0, 8) : 'N/A'}</td>
                <td>${customer?.name || 'Unknown'}</td>
                <td>${restaurant?.restaurantName || 'Unknown'}</td>
                <td>₹${order.totalAmount}</td>
                <td>
                    <span class="status-badge status-${order.orderStatus}">
                        ${order.orderStatus.toUpperCase()}
                    </span>
                </td>
                <td>${new Date(order.timestamp).toLocaleString()}</td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3>All Orders</h3>
            </div>
            ${orders.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Customer</th>
                            <th>Restaurant</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No Orders Yet</h3>
                    <p>No orders have been placed yet</p>
                </div>
            `}
        </div>
    `;
}

// Render Users Management
function renderUsersManagement(container) {
    const users = allData.filter(item => item.type === 'user' && item.role !== 'restaurant');
    
    let tableRows = '';
    users.forEach(user => {
        tableRows += `
            <tr>
                <td>${user.name}</td>
                <td>${user.username}</td>
                <td>${user.role.toUpperCase()}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.address}</td>
                <td>
                    <button class="btn-small btn-info" onclick="viewCustomerDetails('${user.__backendId}')">View</button>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3>Users Management</h3>
            </div>
            ${users.length > 0 ? `
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Address</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            ` : `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>No Users Yet</h3>
                    <p>No users have registered yet</p>
                </div>
            `}
        </div>
    `;
}

// View Customer Details (Admin can see updated profile)
function viewCustomerDetails(userId) {
    const user = allData.find(u => u.__backendId === userId);
    
    if (!user) {
        showToast('User not found', 'error');
        return;
    }
    
    const profilePictureUrl = user.profilePicture || null;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h2>Customer Profile Details</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body">
                ${profilePictureUrl ? `
                    <div style="margin-bottom: 1.5rem; text-align: center;">
                        <img src="${profilePictureUrl}" alt="Profile Picture" class="admin-profile-picture">
                    </div>
                ` : ''}
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
                    <div>
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Full Name</label>
                        <p style="color: #1e293b; font-weight: 600;">${user.name}</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Username</label>
                        <p style="color: #1e293b; font-weight: 600;">${user.username}</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Email</label>
                        <p style="color: #1e293b; font-weight: 600;">${user.email}</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Phone Number</label>
                        <p style="color: #1e293b; font-weight: 600;">${user.phone}</p>
                    </div>
                    
                    <div style="grid-column: 1 / -1;">
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Address</label>
                        <p style="color: #1e293b; font-weight: 600;">${user.address}</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Role</label>
                        <p style="color: #1e293b; font-weight: 600;">${user.role.toUpperCase()}</p>
                    </div>
                    
                    <div>
                        <label style="display: block; font-weight: 700; color: #64748b; font-size: 0.8125rem; text-transform: uppercase; margin-bottom: 0.5rem;">Member Since</label>
                        <p style="color: #1e293b; font-weight: 600;">${new Date(parseInt(user.__backendId.substring(0, 13))).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Render Restaurant Dashboard
function renderRestaurantDashboard() {
    currentView = 'restaurant-dashboard';
    allData = getAllData();
    const app = document.getElementById('app');
    
    const foodItems = allData.filter(item => item.type === 'food' && item.restaurantId === currentUser.__backendId);
    const orders = allData.filter(item => item.type === 'order' && item.restaurantId === currentUser.__backendId);
    
    app.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>${currentUser.restaurantName}</h2>
                    <p>${currentUser.name}</p>
                </div>
                <ul class="sidebar-menu">
                    <li class="active" onclick="showRestaurantSection('overview')">📊 Overview</li>
                    <li onclick="showRestaurantSection('menu')">🍽️ Manage Menu</li>
                    <li onclick="showRestaurantSection('promos')">🎟️ Promo Codes</li>
                    <li onclick="showRestaurantSection('orders')">📦 Orders</li>
                    <li onclick="logout()">🚪 Logout</li>
                </ul>
            </div>
            <div class="main-content">
                <div class="content-header">
                    <h1>Dashboard Overview</h1>
                    <p>Manage your restaurant</p>
                </div>
                <div class="content-body" id="restaurantContent">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Menu Items</span>
                                <span class="stat-icon">🍽️</span>
                            </div>
                            <div class="stat-value">${foodItems.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Total Orders</span>
                                <span class="stat-icon">📦</span>
                            </div>
                            <div class="stat-value">${orders.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Pending Orders</span>
                                <span class="stat-icon">⏳</span>
                            </div>
                            <div class="stat-value">${orders.filter(o => o.orderStatus === 'pending').length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Revenue</span>
                                <span class="stat-icon">💰</span>
                            </div>
                            <div class="stat-value">₹${orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show Restaurant Section
function showRestaurantSection(section) {
    allData = getAllData();
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(li => li.classList.remove('active'));
    
    // Find and activate the correct menu item
    const sectionMap = {
        'overview': 'Overview',
        'menu': 'Manage Menu',
        'promos': 'Promo Codes',
        'orders': 'Orders',
        'earnings': 'Earnings',
        'settings': 'Settings',
        'logout': 'Logout'
    };
    
    for (let li of menuItems) {
        if (li.textContent.includes(sectionMap[section])) {
            li.classList.add('active');
            break;
        }
    }
    
    const content = document.getElementById('restaurantContent');
    
    switch(section) {
        case 'overview':
            const foodItems = allData.filter(item => item.type === 'food' && item.restaurantId === currentUser.__backendId);
            const orders = allData.filter(item => item.type === 'order' && item.restaurantId === currentUser.__backendId);
            
            content.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Menu Items</span>
                            <span class="stat-icon">🍽️</span>
                        </div>
                        <div class="stat-value">${foodItems.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Total Orders</span>
                            <span class="stat-icon">📦</span>
                        </div>
                        <div class="stat-value">${orders.length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Pending Orders</span>
                            <span class="stat-icon">⏳</span>
                        </div>
                        <div class="stat-value">${orders.filter(o => o.orderStatus === 'pending').length}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-header">
                            <span class="stat-label">Revenue</span>
                            <span class="stat-icon">💰</span>
                        </div>
                        <div class="stat-value">₹${orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0)}</div>
                    </div>
                </div>
            `;
            break;
            
        case 'menu':
            renderMenuManagement(content);
            break;
            
        case 'promos':
            renderPromoCodeManagement(content);
            break;
            
        case 'orders':
            renderRestaurantOrders(content);
            break;
    }
}

// Render Menu Management
function renderMenuManagement(container) {
    const foodItems = allData.filter(item => item.type === 'food' && item.restaurantId === currentUser.__backendId);
    
    let foodCards = '';
    foodItems.forEach(food => {
        let imageStatusBadge = '';
        if (food.imageUrl) {
            if (food.imageApprovalStatus === 'pending') {
                imageStatusBadge = '<span class="status-badge status-pending">Image Pending</span>';
            } else if (food.imageApprovalStatus === 'rejected') {
                imageStatusBadge = '<span class="status-badge status-blocked">Image Rejected</span>';
            }
        }
        
        foodCards += `
            <div class="food-card">
                <div class="food-image" style="display: flex; align-items: center; justify-content: center;">
                    ${food.imageUrl ? `<img src="${food.imageUrl}" crossOrigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="font-size: 3rem;">🍽️</span>'}
                </div>
                <div class="food-info">
                    <div class="food-name">${food.name}</div>
                    <div class="food-restaurant">${food.category}</div>
                    <div class="food-price">₹${food.price}</div>
                    <div style="margin-bottom: 1rem;">
                        <span class="status-badge ${food.available ? 'status-approved' : 'status-blocked'}">
                            ${food.available ? 'Available' : 'Unavailable'}
                        </span>
                        ${imageStatusBadge}
                    </div>
                    <div class="food-actions">
                        <button class="btn-small btn-edit" onclick="editFood('${food.__backendId}')">Edit</button>
                        <button class="btn-small ${food.available ? 'btn-block' : 'btn-approve'}" onclick="toggleFoodAvailability('${food.__backendId}')">
                            ${food.available ? 'Hide' : 'Show'}
                        </button>
                        <button class="btn-small btn-delete" onclick="deleteFood('${food.__backendId}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div style="margin-bottom: 2rem;">
            <button class="btn btn-primary" style="width: auto; padding: 0.75rem 2rem;" onclick="openAddFoodModal()">
                + Add New Food Item
            </button>
        </div>
        ${foodItems.length > 0 ? `
            <div class="food-grid">
                ${foodCards}
            </div>
        ` : `
            <div class="empty-state">
                <div class="empty-state-icon">🍽️</div>
                <h3>No Menu Items Yet</h3>
                <p>Add your first food item to get started</p>
            </div>
        `}
    `;
}

// Helper function to display images
function getImageDisplay(imageUrl) {
    if (imageUrl) {
        return `<img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    }
    return `<span style="font-size: 3rem;">🍽️</span>`;
}

// Preview Image from PC
function previewImage(input) {
    const preview = document.getElementById('imagePreview');
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// Preview Image from URL
function previewImageFromUrl() {
    const urlInput = document.getElementById('imageUrl');
    const preview = document.getElementById('imagePreview');
    const url = urlInput.value.trim();

    if (!url) {
        preview.innerHTML = '<div class="image-preview-placeholder">🍽️ Enter image URL and click Fetch</div>';
        return;
    }

    // Show loading state
    preview.innerHTML = '<div style="text-align: center; padding: 2rem;"><div class="loading"></div><p>Loading image...</p></div>';

    // Create an image object to test if URL is valid
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
        preview.innerHTML = `<img src="${url}" style="max-width: 100%; max-height: 100%; object-fit: contain;">`;
    };
    img.onerror = function() {
        preview.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;"><p>❌ Failed to load image. Please check the URL.</p></div>';
    };
    img.src = url;
}

// Open Add Food Modal
function openAddFoodModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Add Food Item</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="addFoodForm" onsubmit="handleAddFood(event)">
                <div class="form-group">
                    <label for="foodName">Food Name</label>
                    <input type="text" id="foodName" required>
                </div>
                <div class="form-group">
                    <label for="foodCategory">Category</label>
                    <input type="text" id="foodCategory" placeholder="e.g., Main Course, Dessert, Beverage" required>
                </div>
                <div class="form-group">
                    <label for="foodPrice">Price (₹)</label>
                    <input type="number" id="foodPrice" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="foodDescription">Description</label>
                    <input type="text" id="foodDescription" required>
                </div>
                <div class="form-group">
                    <label style="font-weight: 600; margin-bottom: 1rem; display: block;">Upload Image</label>
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <button type="button" class="filter-btn active" id="tabUpload" onclick="switchImageTab('upload')" style="flex: 1;">📁 Upload from PC</button>
                        <button type="button" class="filter-btn" id="tabUrl" onclick="switchImageTab('url')" style="flex: 1;">🔗 Image URL</button>
                    </div>
                    
                    <div id="uploadSection">
                        <input type="file" id="foodImage" accept="image/*" onchange="previewImage(this)">
                    </div>
                    
                    <div id="urlSection" style="display: none;">
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="imageUrl" placeholder="Paste Unsplash or web image URL..." style="flex: 1; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                            <button type="button" class="btn btn-primary" onclick="previewImageFromUrl()" style="width: auto; padding: 0.875rem 1.5rem;">Fetch</button>
                        </div>
                    </div>
                    
                    <div class="image-preview" id="imagePreview">
                        <div class="image-preview-placeholder">🍽️ No image selected</div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Add Food Item</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Switch Image Tab
function switchImageTab(tab) {
    const uploadSection = document.getElementById('uploadSection');
    const urlSection = document.getElementById('urlSection');
    const tabUpload = document.getElementById('tabUpload');
    const tabUrl = document.getElementById('tabUrl');
    const preview = document.getElementById('imagePreview');

    if (tab === 'upload') {
        uploadSection.style.display = 'block';
        urlSection.style.display = 'none';
        tabUpload.classList.add('active');
        tabUrl.classList.remove('active');
        preview.innerHTML = '<div class="image-preview-placeholder">🍽️ No image selected</div>';
        document.getElementById('imageUrl').value = '';
    } else {
        uploadSection.style.display = 'none';
        urlSection.style.display = 'block';
        tabUpload.classList.remove('active');
        tabUrl.classList.add('active');
        preview.innerHTML = '<div class="image-preview-placeholder">🍽️ Enter image URL and click Fetch</div>';
        document.getElementById('foodImage').value = '';
    }
}

// Handle Add Food
function handleAddFood(event) {
    event.preventDefault();
    
    const imageInput = document.getElementById('foodImage');
    const imageUrlInput = document.getElementById('imageUrl');
    let imageUrl = '';
    
    // Check if file is selected
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageUrl = e.target.result;
            
            const foodData = {
                type: 'food',
                restaurantId: currentUser.__backendId,
                name: document.getElementById('foodName').value,
                category: document.getElementById('foodCategory').value,
                price: parseFloat(document.getElementById('foodPrice').value),
                description: document.getElementById('foodDescription').value,
                imageUrl: imageUrl,
                imageApprovalStatus: 'pending',
                available: true
            };
            
            createRecord(foodData);
            allData = getAllData();
            showToast('Food item added successfully. Image pending admin approval.', 'success');
            document.querySelector('.modal').remove();
            const content = document.getElementById('restaurantContent');
            renderMenuManagement(content);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else if (imageUrlInput.value.trim()) {
        // Use URL from input
        imageUrl = imageUrlInput.value.trim();
        
        // Validate URL by trying to load it
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            const foodData = {
                type: 'food',
                restaurantId: currentUser.__backendId,
                name: document.getElementById('foodName').value,
                category: document.getElementById('foodCategory').value,
                price: parseFloat(document.getElementById('foodPrice').value),
                description: document.getElementById('foodDescription').value,
                imageUrl: imageUrl,
                imageApprovalStatus: 'pending',
                available: true
            };
            
            createRecord(foodData);
            allData = getAllData();
            showToast('Food item added successfully. Image pending admin approval.', 'success');
            document.querySelector('.modal').remove();
            const content = document.getElementById('restaurantContent');
            renderMenuManagement(content);
        };
        img.onerror = function() {
            showToast('Invalid image URL. Please check and try again.', 'error');
        };
        img.src = imageUrl;
    } else {
        // No image selected
        const foodData = {
            type: 'food',
            restaurantId: currentUser.__backendId,
            name: document.getElementById('foodName').value,
            category: document.getElementById('foodCategory').value,
            price: parseFloat(document.getElementById('foodPrice').value),
            description: document.getElementById('foodDescription').value,
            imageUrl: '',
            imageApprovalStatus: 'approved',
            available: true
        };
        
        createRecord(foodData);
        allData = getAllData();
        showToast('Food item added successfully', 'success');
        document.querySelector('.modal').remove();
        const content = document.getElementById('restaurantContent');
        renderMenuManagement(content);
    }
}

// Edit Food
function editFood(foodId) {
    const food = allData.find(item => item.__backendId === foodId);
    if (!food) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Edit Food Item</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="editFoodForm" onsubmit="handleEditFood(event, '${foodId}')">
                <div class="form-group">
                    <label for="foodName">Food Name</label>
                    <input type="text" id="foodName" value="${food.name}" required>
                </div>
                <div class="form-group">
                    <label for="foodCategory">Category</label>
                    <input type="text" id="foodCategory" value="${food.category}" required>
                </div>
                <div class="form-group">
                    <label for="foodPrice">Price (₹)</label>
                    <input type="number" id="foodPrice" value="${food.price}" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="foodDescription">Description</label>
                    <input type="text" id="foodDescription" value="${food.description}" required>
                </div>
                <div class="form-group">
                    <label style="font-weight: 600; margin-bottom: 1rem; display: block;">Update Image</label>
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
                        <button type="button" class="filter-btn active" id="tabUpload" onclick="switchImageTabEdit('upload')" style="flex: 1;">📁 Upload from PC</button>
                        <button type="button" class="filter-btn" id="tabUrl" onclick="switchImageTabEdit('url')" style="flex: 1;">🔗 Image URL</button>
                    </div>
                    
                    <div id="uploadSection">
                        <input type="file" id="foodImage" accept="image/*" onchange="previewImage(this)">
                    </div>
                    
                    <div id="urlSection" style="display: none;">
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="imageUrl" placeholder="Paste Unsplash or web image URL..." style="flex: 1; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                            <button type="button" class="btn btn-primary" onclick="previewImageFromUrl()" style="width: auto; padding: 0.875rem 1.5rem;">Fetch</button>
                        </div>
                    </div>
                    
                    <div class="image-preview" id="imagePreview">
                        ${food.imageUrl ? `<img src="${food.imageUrl}" crossOrigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<div class="image-preview-placeholder">🍽️ No image selected</div>'}
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Update Food Item</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Switch Image Tab for Edit
function switchImageTabEdit(tab) {
    const uploadSection = document.getElementById('uploadSection');
    const urlSection = document.getElementById('urlSection');
    const tabUpload = document.getElementById('tabUpload');
    const tabUrl = document.getElementById('tabUrl');
    const preview = document.getElementById('imagePreview');

    if (tab === 'upload') {
        uploadSection.style.display = 'block';
        urlSection.style.display = 'none';
        tabUpload.classList.add('active');
        tabUrl.classList.remove('active');
        document.getElementById('imageUrl').value = '';
    } else {
        uploadSection.style.display = 'none';
        urlSection.style.display = 'block';
        tabUpload.classList.remove('active');
        tabUrl.classList.add('active');
        document.getElementById('foodImage').value = '';
    }
}

// Handle Edit Food
function handleEditFood(event, foodId) {
    event.preventDefault();
    
    const food = allData.find(item => item.__backendId === foodId);
    if (food) {
        food.name = document.getElementById('foodName').value;
        food.category = document.getElementById('foodCategory').value;
        food.price = parseFloat(document.getElementById('foodPrice').value);
        food.description = document.getElementById('foodDescription').value;
        
        const imageInput = document.getElementById('foodImage');
        const imageUrlInput = document.getElementById('imageUrl');
        
        // Check if file is selected
        if (imageInput.files && imageInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                food.imageUrl = e.target.result;
                food.imageApprovalStatus = 'pending';
                
                updateRecord(food);
                allData = getAllData();
                showToast('Food item updated. New image pending admin approval.', 'success');
                document.querySelector('.modal').remove();
                const content = document.getElementById('restaurantContent');
                renderMenuManagement(content);
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else if (imageUrlInput.value.trim()) {
            // Use URL from input
            const imageUrl = imageUrlInput.value.trim();
            
            // Validate URL by trying to load it
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                food.imageUrl = imageUrl;
                food.imageApprovalStatus = 'pending';
                
                updateRecord(food);
                allData = getAllData();
                showToast('Food item updated. New image pending admin approval.', 'success');
                document.querySelector('.modal').remove();
                const content = document.getElementById('restaurantContent');
                renderMenuManagement(content);
            };
            img.onerror = function() {
                showToast('Invalid image URL. Please check and try again.', 'error');
            };
            img.src = imageUrl;
        } else {
            // No new image selected
            updateRecord(food);
            allData = getAllData();
            showToast('Food item updated successfully', 'success');
            document.querySelector('.modal').remove();
            const content = document.getElementById('restaurantContent');
            renderMenuManagement(content);
        }
    }
}

// Toggle Food Availability
function toggleFoodAvailability(foodId) {
    const food = allData.find(item => item.__backendId === foodId);
    if (food) {
        food.available = !food.available;
        updateRecord(food);
        allData = getAllData();
        showToast(`Food item ${food.available ? 'shown' : 'hidden'} successfully`, 'success');
        const content = document.getElementById('restaurantContent');
        renderMenuManagement(content);
    }
}

// Render Promo Code Management for Restaurant Owner
function renderPromoCodeManagement(container) {
    allData = getAllData();
    const promos = allData.filter(item => item.type === 'promo' && item.restaurantId === currentUser.__backendId);
    
    let promosHTML = '';
    
    if (promos.length === 0) {
        promosHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎟️</div>
                <h3>No Promo Codes Yet</h3>
                <p>Create promo codes to offer discounts to your customers</p>
            </div>
        `;
    } else {
        promosHTML = promos.map(promo => `
            <div class="menu-item" style="background: white; padding: 1.5rem; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
                    <div style="flex: 1;">
                        <div style="font-size: 1.25rem; font-weight: 700; color: #333; margin-bottom: 0.5rem;">${promo.code}</div>
                        <div style="margin-bottom: 0.75rem;">
                            <span style="background: #e3f2fd; color: #1976d2; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem; font-weight: 600; margin-right: 0.5rem;">
                                ${promo.discountType === 'percentage' ? promo.discountValue + '%' : '₹' + promo.discountValue} OFF
                            </span>
                            ${promo.maxDiscount ? `<span style="background: #f3e5f5; color: #7b1fa2; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem; margin-right: 0.5rem;">Max: ₹${promo.maxDiscount}</span>` : ''}
                            ${promo.minOrderValue ? `<span style="background: #fff3e0; color: #e65100; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.85rem;">Min: ₹${promo.minOrderValue}</span>` : ''}
                        </div>
                        <div style="font-size: 0.95rem; color: #666; margin-bottom: 0.5rem;">${promo.description || 'Special discount offer'}</div>
                        <div style="font-size: 0.85rem; color: #999;">
                            ${promo.expiryDate ? `Expires: ${new Date(promo.expiryDate).toLocaleDateString()}` : 'No expiry date'}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                        <button class="btn btn-small" onclick="editPromoCode('${promo.__backendId}')" style="background: #667eea; color: white;">✏️ Edit</button>
                        <button class="btn btn-small" onclick="deletePromoCode('${promo.__backendId}')" style="background: #ef4444; color: white;">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    container.innerHTML = `
        <div class="menu-management">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>Promo Code Management</h2>
                <button class="btn btn-primary" onclick="openAddPromoModal()">+ Add New Promo</button>
            </div>
            <div>
                ${promosHTML}
            </div>
        </div>
    `;
}

// Open Add Promo Code Modal
function openAddPromoModal() {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Add New Promo Code</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="promoForm" onsubmit="handleAddPromo(event)">
                <div class="form-group">
                    <label for="promoCode">Promo Code *</label>
                    <input 
                        type="text" 
                        id="promoCode" 
                        placeholder="e.g., SAVE50" 
                        style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; text-transform: uppercase;"
                        required
                    >
                </div>
                
                <div class="form-group">
                    <label for="description">Description *</label>
                    <input 
                        type="text" 
                        id="description" 
                        placeholder="e.g., Get 50% off on orders above ₹500" 
                        style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        required
                    >
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="discountType">Discount Type *</label>
                        <select 
                            id="discountType" 
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                            required
                        >
                            <option value="">Select type</option>
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (₹)</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="discountValue">Discount Value *</label>
                        <input 
                            type="number" 
                            id="discountValue" 
                            placeholder="e.g., 50" 
                            min="1"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                            required
                        >
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="minOrderValue">Minimum Order Value (Optional)</label>
                        <input 
                            type="number" 
                            id="minOrderValue" 
                            placeholder="e.g., 500"
                            min="0"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="maxDiscount">Max Discount Allowed (Optional)</label>
                        <input 
                            type="number" 
                            id="maxDiscount" 
                            placeholder="e.g., 200"
                            min="0"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        >
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="expiryDate">Expiry Date (Optional)</label>
                    <input 
                        type="date" 
                        id="expiryDate"
                        style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                    >
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                    Create Promo Code
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Handle Add Promo Code
function handleAddPromo(event) {
    event.preventDefault();
    
    const code = document.getElementById('promoCode').value.trim().toUpperCase();
    const description = document.getElementById('description').value.trim();
    const discountType = document.getElementById('discountType').value;
    const discountValue = parseFloat(document.getElementById('discountValue').value);
    const minOrderValue = document.getElementById('minOrderValue').value ? parseFloat(document.getElementById('minOrderValue').value) : null;
    const maxDiscount = document.getElementById('maxDiscount').value ? parseFloat(document.getElementById('maxDiscount').value) : null;
    const expiryDate = document.getElementById('expiryDate').value || null;
    
    // Validate inputs
    if (!code || !description || !discountType || !discountValue) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    if (discountValue <= 0) {
        showToast('Discount value must be greater than 0', 'error');
        return;
    }
    
    if (discountType === 'percentage' && discountValue > 100) {
        showToast('Percentage discount cannot be more than 100%', 'error');
        return;
    }
    
    // Check if code already exists for this restaurant
    allData = getAllData();
    const existingPromo = allData.find(item => 
        item.type === 'promo' && 
        item.restaurantId === currentUser.__backendId && 
        item.code === code
    );
    
    if (existingPromo) {
        showToast('This promo code already exists', 'error');
        return;
    }
    
    const promoData = {
        type: 'promo',
        restaurantId: currentUser.__backendId,
        code: code,
        description: description,
        discountType: discountType,
        discountValue: discountValue,
        minOrderValue: minOrderValue,
        maxDiscount: maxDiscount,
        expiryDate: expiryDate,
        createdAt: Date.now(),
        active: true
    };
    
    createRecord(promoData);
    showToast('Promo code created successfully!', 'success');
    document.querySelector('.modal').remove();
    allData = getAllData();
    const content = document.getElementById('restaurantContent');
    renderPromoCodeManagement(content);
}

// Edit Promo Code
function editPromoCode(promoId) {
    allData = getAllData();
    const promo = allData.find(item => item.__backendId === promoId);
    
    if (!promo) {
        showToast('Promo code not found', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Promo Code</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="handleUpdatePromo(event, '${promoId}')">
                <div class="form-group">
                    <label for="editPromoCode">Promo Code *</label>
                    <input 
                        type="text" 
                        id="editPromoCode" 
                        value="${promo.code}"
                        style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; text-transform: uppercase;"
                        required
                        disabled
                    >
                    <small style="color: #999;">Code cannot be changed</small>
                </div>
                
                <div class="form-group">
                    <label for="editDescription">Description *</label>
                    <input 
                        type="text" 
                        id="editDescription" 
                        value="${promo.description}"
                        style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        required
                    >
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="editDiscountValue">Discount Value *</label>
                        <input 
                            type="number" 
                            id="editDiscountValue" 
                            value="${promo.discountValue}"
                            min="1"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editMaxDiscount">Max Discount Allowed</label>
                        <input 
                            type="number" 
                            id="editMaxDiscount" 
                            value="${promo.maxDiscount || ''}"
                            min="0"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        >
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                    <div class="form-group">
                        <label for="editMinOrderValue">Minimum Order Value</label>
                        <input 
                            type="number" 
                            id="editMinOrderValue" 
                            value="${promo.minOrderValue || ''}"
                            min="0"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label for="editExpiryDate">Expiry Date</label>
                        <input 
                            type="date" 
                            id="editExpiryDate"
                            value="${promo.expiryDate ? promo.expiryDate.split('T')[0] : ''}"
                            style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;"
                        >
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                    Update Promo Code
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Handle Update Promo Code
function handleUpdatePromo(event, promoId) {
    event.preventDefault();
    
    allData = getAllData();
    const promo = allData.find(item => item.__backendId === promoId);
    
    if (!promo) {
        showToast('Promo code not found', 'error');
        return;
    }
    
    const discountValue = parseFloat(document.getElementById('editDiscountValue').value);
    const maxDiscount = document.getElementById('editMaxDiscount').value ? parseFloat(document.getElementById('editMaxDiscount').value) : null;
    const minOrderValue = document.getElementById('editMinOrderValue').value ? parseFloat(document.getElementById('editMinOrderValue').value) : null;
    const expiryDate = document.getElementById('editExpiryDate').value || null;
    const description = document.getElementById('editDescription').value.trim();
    
    if (discountValue <= 0) {
        showToast('Discount value must be greater than 0', 'error');
        return;
    }
    
    if (promo.discountType === 'percentage' && discountValue > 100) {
        showToast('Percentage discount cannot be more than 100%', 'error');
        return;
    }
    
    promo.description = description;
    promo.discountValue = discountValue;
    promo.maxDiscount = maxDiscount;
    promo.minOrderValue = minOrderValue;
    promo.expiryDate = expiryDate;
    
    updateRecord(promo);
    showToast('Promo code updated successfully!', 'success');
    document.querySelector('.modal').remove();
    allData = getAllData();
    const content = document.getElementById('restaurantContent');
    renderPromoCodeManagement(content);
}

// Delete Promo Code
function deletePromoCode(promoId) {
    if (confirm('Are you sure you want to delete this promo code?')) {
        allData = getAllData();
        const promo = allData.find(item => item.__backendId === promoId);
        
        if (promo) {
            deleteRecord(promo);
            showToast('Promo code deleted successfully!', 'success');
            allData = getAllData();
            const content = document.getElementById('restaurantContent');
            renderPromoCodeManagement(content);
        }
    }
}

// Delete Food
function deleteFood(foodId) {
    const food = allData.find(item => item.__backendId === foodId);
    if (food && confirm(`Are you sure you want to delete "${food.name}"?`)) {
        deleteRecord(food);
        allData = getAllData();
        showToast('Food item deleted successfully', 'success');
        const content = document.getElementById('restaurantContent');
        renderMenuManagement(content);
    }
}

// Render Restaurant Orders
function renderRestaurantOrders(container) {
    const orders = allData.filter(item => item.type === 'order' && item.restaurantId === currentUser.__backendId);
    
    let orderCards = '';
    orders.forEach(order => {
        const customer = allData.find(u => u.__backendId === order.customerId);
        const items = JSON.parse(order.items || '[]');
        
        let itemsList = '';
        items.forEach(item => {
            itemsList += `<li>${item.name} x ${item.quantity} - ₹${item.price * item.quantity}</li>`;
        });
        
        orderCards += `
            <div class="data-table" style="margin-bottom: 1.5rem;">
                <div class="table-header">
                    <div>
                        <h3>Order #${order.id ? order.id.slice(0, 8) : 'N/A'}</h3>
                        <p style="color: #666; margin-top: 0.25rem;">${new Date(order.timestamp).toLocaleString()}</p>
                    </div>
                    <span class="status-badge status-${order.orderStatus}">
                        ${order.orderStatus.toUpperCase()}
                    </span>
                </div>
                <div style="padding: 1.5rem;">
                    <p><strong>Customer:</strong> ${customer?.name || 'Unknown'}</p>
                    <p><strong>Phone:</strong> ${customer?.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${customer?.address || 'N/A'}</p>
                    <p><strong>Payment:</strong> ${order.paymentMode} ${order.paymentStatus === 'completed' ? '✅ Paid' : ''}</p>
                    <p><strong>Items:</strong></p>
                    <ul style="margin: 0.5rem 0 1rem 1.5rem;">
                        ${itemsList}
                    </ul>
                    <p><strong>Total:</strong> ₹${order.totalAmount}</p>
                    ${order.orderStatus === 'pending' ? `
                        <button class="btn-small btn-approve" onclick="updateOrderStatus('${order.__backendId}', 'preparing')" style="margin-top: 1rem;">
                            Accept Order
                        </button>
                    ` : ''}
                    ${order.orderStatus === 'preparing' ? `
                        <button class="btn-small btn-approve" onclick="updateOrderStatus('${order.__backendId}', 'ready')" style="margin-top: 1rem;">
                            Mark as Ready
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        ${orders.length > 0 ? orderCards : `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No Orders Yet</h3>
                <p>Orders will appear here once customers place them</p>
            </div>
        `}
    `;
}

// Update Order Status
function updateOrderStatus(orderId, status) {
    const order = allData.find(item => item.__backendId === orderId);
    if (order) {
        order.orderStatus = status;
        updateRecord(order);
        allData = getAllData();
        showToast('Order status updated successfully', 'success');
        const content = document.getElementById('restaurantContent');
        renderRestaurantOrders(content);
    }
}

// Render Customer Dashboard
function renderCustomerDashboard() {
    currentView = 'customer-browse';
    allData = getAllData();
    
    // Load wishlist from localStorage
    const savedWishlist = localStorage.getItem(`wishlist_${currentUser.__backendId}`);
    wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
    
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="dashboard" id="customerDashboard">
            <div class="sidebar" id="desktopSidebar">
                <div class="sidebar-header">
                    <h2>Customer</h2>
                    <p>${currentUser.name}</p>
                </div>
                <ul class="sidebar-menu">
                    <li class="active" onclick="showCustomerSection('browse')">🍽️ Browse Food</li>
                    <li onclick="showCustomerSection('wishlist')">❤️ Wishlist <span id="wishlistCount" style="background: #ef4444; color: white; padding: 0.125rem 0.5rem; border-radius: 12px; margin-left: 0.5rem; font-size: 0.75rem;">${wishlist.length}</span></li>
                    <li onclick="showCustomerSection('cart')">🛒 Cart <span id="cartCount" style="background: #ef4444; color: white; padding: 0.125rem 0.5rem; border-radius: 12px; margin-left: 0.5rem; font-size: 0.75rem;">${cart.length}</span></li>
                    <li onclick="showCustomerSection('orders')">📦 My Orders</li>
                    <li onclick="showCustomerSection('profile')">👤 My Profile</li>
                    <li onclick="logout()">🚪 Logout</li>
                </ul>
            </div>
            <div class="main-content">
                <div class="content-header">
                    <div class="header-top-bar">
                        <button class="hamburger-btn" onclick="toggleMobileSidebar()" title="Menu">
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                        <div class="header-title">
                            <h1>Browse Restaurants</h1>
                            <p>Order your favorite food</p>
                        </div>
                        <button class="profile-icon-btn" onclick="showCustomerSection('profile')" title="View Profile">
                            <div class="profile-icon-avatar">
                                ${currentUser.profilePicture ? `<img src="${currentUser.profilePicture}" alt="Profile" class="profile-icon-img">` : `<span class="profile-icon-text">👤</span>`}
                            </div>
                            <span class="profile-icon-name">${currentUser.name}</span>
                        </button>
                    </div>
                </div>
                <div class="content-body" id="customerContent">
                    <div class="search-filter-container" id="searchFilterContainer"></div>
                    <div class="food-grid" id="foodGrid"></div>
                </div>
            </div>
        </div>
    `;
    
    renderSearchFilters();
    renderFoodItems();
    
    // Add mobile sidebar overlay
    addMobileSidebarHTML();
}

// Add mobile sidebar HTML
function addMobileSidebarHTML() {
    const app = document.getElementById('app');
    const mobileSidebarHTML = `
        <div class="mobile-sidebar-overlay" id="mobileSidebarOverlay" onclick="toggleMobileSidebar()"></div>
        <div class="mobile-sidebar" id="mobileSidebar">
            <div class="mobile-sidebar-header">
                <h2>Customer</h2>
                <p>${currentUser.name}</p>
                <button class="close-sidebar-btn" onclick="toggleMobileSidebar()">&times;</button>
            </div>
            <ul class="mobile-sidebar-menu">
                <li onclick="showCustomerSectionMobile('browse')">🍽️ Browse Food</li>
                <li onclick="showCustomerSectionMobile('wishlist')">❤️ Wishlist <span id="mobileWishlistCount">${wishlist.length}</span></li>
                <li onclick="showCustomerSectionMobile('cart')">🛒 Cart <span id="mobileCartCount">${cart.length}</span></li>
                <li onclick="showCustomerSectionMobile('orders')">📦 My Orders</li>
                <li onclick="showCustomerSectionMobile('profile')">👤 My Profile</li>
                <li onclick="logoutAndCloseSidebar()">🚪 Logout</li>
            </ul>
        </div>
    `;
    app.insertAdjacentHTML('beforeend', mobileSidebarHTML);
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    const overlay = document.getElementById('mobileSidebarOverlay');
    const sidebar = document.getElementById('mobileSidebar');
    
    if (overlay && sidebar) {
        overlay.classList.toggle('active');
        sidebar.classList.toggle('active');
    }
}

// Close sidebar when selecting menu item
function showCustomerSectionMobile(section) {
    toggleMobileSidebar();
    showCustomerSection(section);
}

// Logout and close sidebar
function logoutAndCloseSidebar() {
    toggleMobileSidebar();
    logout();
}

// Render Search & Filter UI
function renderSearchFilters() {
    const allFoods = allData.filter(item => item.type === 'food');
    const cuisines = [...new Set(allFoods.map(f => f.category))];
    const maxPrice = Math.max(...allFoods.map(f => f.price), 1000);
    
    const container = document.getElementById('searchFilterContainer');
    if (!container) return;
    
    container.innerHTML = `
        <input type="text" class="search-box" placeholder="🔍 Search restaurants or food items..." 
            value="${searchQuery}" onkeyup="handleSearch(this.value)">
        
        <div class="filter-controls">
            <div class="filter-group">
                <label>Cuisine</label>
                <select onchange="handleCuisineFilter(this.value)">
                    <option value="all">All Cuisines</option>
                    ${cuisines.map(c => `<option value="${c}" ${selectedCuisine === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            
            <div class="filter-group">
                <label>Max Price</label>
                <input type="range" min="0" max="${maxPrice}" value="${priceFilter.max}" 
                    onchange="handlePriceFilter(this.value)">
                <span style="font-size: 0.875rem; color: #64748b;">₹0 - ₹${priceFilter.max}</span>
            </div>
            
            <div class="filter-group">
                <label>Min Rating</label>
                <select onchange="handleRatingFilter(this.value)">
                    <option value="0">All Ratings</option>
                    <option value="3" ${ratingFilter >= 3 ? 'selected' : ''}>⭐ 3+</option>
                    <option value="4" ${ratingFilter >= 4 ? 'selected' : ''}>⭐ 4+</option>
                    <option value="5" ${ratingFilter >= 5 ? 'selected' : ''}>⭐ 5</option>
                </select>
            </div>
        </div>
        
        <div class="sort-controls">
            <label style="font-weight: 600; color: #1e293b;">Sort By:</label>
            <button class="sort-btn ${sortOption === 'newest' ? 'active' : ''}" onclick="handleSort('newest')">Newest</button>
            <button class="sort-btn ${sortOption === 'price-low' ? 'active' : ''}" onclick="handleSort('price-low')">Price: Low to High</button>
            <button class="sort-btn ${sortOption === 'price-high' ? 'active' : ''}" onclick="handleSort('price-high')">Price: High to Low</button>
            <button class="sort-btn ${sortOption === 'rating' ? 'active' : ''}" onclick="handleSort('rating')">Top Rated</button>
        </div>
    `;
}

// Handle Search
function handleSearch(query) {
    searchQuery = query.toLowerCase();
    renderFoodItems();
}

// Handle Cuisine Filter
function handleCuisineFilter(cuisine) {
    selectedCuisine = cuisine;
    renderFoodItems();
}

// Handle Price Filter
function handlePriceFilter(price) {
    priceFilter.max = parseInt(price);
    renderFoodItems();
}

// Handle Rating Filter
function handleRatingFilter(rating) {
    ratingFilter = parseInt(rating);
    renderFoodItems();
}

// Handle Sort
function handleSort(option) {
    sortOption = option;
    renderSearchFilters();
    renderFoodItems();
}

// Toggle Wishlist
function toggleWishlist(foodId) {
    const index = wishlist.indexOf(foodId);
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Removed from wishlist', 'success');
    } else {
        wishlist.push(foodId);
        showToast('Added to wishlist', 'success');
    }
    
    localStorage.setItem(`wishlist_${currentUser.__backendId}`, JSON.stringify(wishlist));
    updateWishlistCount();
    renderFoodItems();
}

// Update Wishlist Count
function updateWishlistCount() {
    const count = document.getElementById('wishlistCount');
    if (count) {
        count.textContent = wishlist.length;
    }
}

// Render Food Items with Search, Filter & Sort
function renderFoodItems() {
    let foodItems = allData.filter(item => 
        item.type === 'food' && 
        item.available === true &&
        (item.imageApprovalStatus === 'approved' || !item.imageUrl)
    );
    
    // Apply search filter
    if (searchQuery) {
        foodItems = foodItems.filter(item => {
            const food = item.name.toLowerCase();
            const restaurant = allData.find(r => r.__backendId === item.restaurantId)?.restaurantName.toLowerCase() || '';
            return food.includes(searchQuery) || restaurant.includes(searchQuery);
        });
    }
    
    // Apply cuisine filter
    if (selectedCuisine !== 'all') {
        foodItems = foodItems.filter(item => item.category === selectedCuisine);
    }
    
    // Apply price filter
    foodItems = foodItems.filter(item => item.price >= priceFilter.min && item.price <= priceFilter.max);
    
    // Apply rating filter
    if (ratingFilter > 0) {
        foodItems = foodItems.filter(item => {
            const avgRating = getAverageRating(item.__backendId);
            return avgRating >= ratingFilter;
        });
    }
    
    // Apply sorting
    foodItems.sort((a, b) => {
        switch(sortOption) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'rating':
                return getAverageRating(b.__backendId) - getAverageRating(a.__backendId);
            case 'newest':
            default:
                return 0;
        }
    });
    
    const foodGrid = document.getElementById('foodGrid');
    
    if (foodItems.length === 0) {
        foodGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <h3>No Items Found</h3>
                <p>Try adjusting your filters or search terms</p>
            </div>
        `;
        return;
    }
    
    let foodCards = '';
    foodItems.forEach(food => {
        const restaurant = allData.find(r => r.__backendId === food.restaurantId);
        const avgRating = getAverageRating(food.__backendId);
        const isWishlisted = wishlist.includes(food.__backendId);
        
        foodCards += `
            <div class="food-card" style="position: relative;">
                <button class="wishlist-btn ${isWishlisted ? 'active' : ''}" 
                    onclick="toggleWishlist('${food.__backendId}'); event.stopPropagation();" 
                    title="Add to wishlist">
                    ${isWishlisted ? '❤️' : '🤍'}
                </button>
                <div class="food-image" style="display: flex; align-items: center; justify-content: center;">
                    ${food.imageUrl && food.imageApprovalStatus === 'approved' ? `<img src="${food.imageUrl}" crossOrigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="font-size: 3rem;">🍽️</span>'}
                </div>
                <div class="food-info">
                    <div class="food-name">${food.name}</div>
                    <div class="food-restaurant">${restaurant?.restaurantName || 'Unknown Restaurant'}</div>
                    ${avgRating > 0 ? `
                        <div class="rating-display">
                            <span class="rating-value">⭐ ${avgRating.toFixed(1)}</span>
                            <span>(${getReviewCount(food.__backendId)} reviews)</span>
                        </div>
                    ` : ''}
                    <div class="food-price">₹${food.price}</div>
                    <button class="btn btn-primary" onclick="addToCart('${food.__backendId}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    });
    
    foodGrid.innerHTML = foodCards;
}

// Get Average Rating for Food Item
function getAverageRating(foodId) {
    const reviews = allData.filter(item => item.type === 'review' && item.foodId === foodId);
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return sum / reviews.length;
}

// Get Review Count
function getReviewCount(foodId) {
    return allData.filter(item => item.type === 'review' && item.foodId === foodId).length;
}

// Add to Cart
function addToCart(foodId) {
    const food = allData.find(item => item.__backendId === foodId);
    if (!food) return;
    
    // Store the restaurant ID for promo code display
    window.selectedRestaurantId = food.restaurantId;
    
    const existingItem = cart.find(item => item.__backendId === foodId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...food,
            quantity: 1
        });
    }
    
    updateCartCount();
    showToast('Added to cart', 'success');
}

// Update Cart Count
function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.length;
    }
}

// Show Customer Section
function showCustomerSection(section) {
    allData = getAllData();
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    const content = document.getElementById('customerContent');
    
    switch(section) {
        case 'browse':
            content.innerHTML = `
                <div class="search-filter-container" id="searchFilterContainer"></div>
                <div class="food-grid" id="foodGrid"></div>
            `;
            renderSearchFilters();
            renderFoodItems();
            break;
            
        case 'wishlist':
            renderWishlist(content);
            break;
            
        case 'cart':
            renderCart(content);
            break;
            
        case 'orders':
            renderCustomerOrders(content);
            break;
            
        case 'profile':
            renderCustomerProfile(content);
            break;
            
        case 'editProfile':
            renderEditProfileForm(content);
            break;
    }
}

// Render Wishlist
function renderWishlist(container) {
    const wishedItems = allData.filter(item => item.type === 'food' && wishlist.includes(item.__backendId));
    
    if (wishedItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❤️</div>
                <h3>No Items in Wishlist</h3>
                <p>Add your favorite items to get started</p>
            </div>
        `;
        return;
    }
    
    let wishlistHTML = '<div class="food-grid">';
    wishedItems.forEach(food => {
        const restaurant = allData.find(r => r.__backendId === food.restaurantId);
        const avgRating = getAverageRating(food.__backendId);
        
        wishlistHTML += `
            <div class="food-card" style="position: relative;">
                <button class="wishlist-btn active" 
                    onclick="toggleWishlist('${food.__backendId}'); event.stopPropagation();" 
                    title="Remove from wishlist">
                    ❤️
                </button>
                <div class="food-image" style="display: flex; align-items: center; justify-content: center;">
                    ${food.imageUrl && food.imageApprovalStatus === 'approved' ? `<img src="${food.imageUrl}" crossOrigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">` : '<span style="font-size: 3rem;">🍽️</span>'}
                </div>
                <div class="food-info">
                    <div class="food-name">${food.name}</div>
                    <div class="food-restaurant">${restaurant?.restaurantName || 'Unknown Restaurant'}</div>
                    ${avgRating > 0 ? `
                        <div class="rating-display">
                            <span class="rating-value">⭐ ${avgRating.toFixed(1)}</span>
                            <span>(${getReviewCount(food.__backendId)} reviews)</span>
                        </div>
                    ` : ''}
                    <div class="food-price">₹${food.price}</div>
                    <button class="btn btn-primary" onclick="addToCart('${food.__backendId}')">
                        Add to Cart
                    </button>
                </div>
            </div>
        `;
    });
    wishlistHTML += '</div>';
    
    container.innerHTML = wishlistHTML;
}

// Render Cart
function renderCart(container) {
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🛒</div>
                <h3>Your Cart is Empty</h3>
                <p>Add some delicious food to get started</p>
            </div>
        `;
        return;
    }
    
    let cartItems = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        cartItems += `
            <div class="cart-item">
                <div class="cart-item-image">🍽️</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">₹${item.price} each</div>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                        <span style="font-weight: 600;">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                        <button class="btn-small btn-delete" style="margin-left: auto;" onclick="removeFromCart(${index})">Remove</button>
                    </div>
                </div>
                <div style="font-size: 1.25rem; font-weight: 600; color: #667eea;">
                    ₹${itemTotal}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div class="cart-page">
            <div style="margin-bottom: 2rem;">
                ${cartItems}
            </div>
            <div class="cart-summary">
                <h3 style="margin-bottom: 1.5rem;">Order Summary</h3>
                
                <div style="background: #e7f3ff; border: 2px solid #2196F3; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="font-weight: 600; color: #1565c0; margin-bottom: 0.75rem; font-size: 0.95rem;">📋 Available Promo Codes</div>
                    <div id="availablePromosList" style="display: grid; gap: 0.5rem; margin-bottom: 0.5rem; max-height: 180px; overflow-y: auto;">
                        <div style="font-size: 0.85rem; color: #666; text-align: center; padding: 0.5rem;">Loading promo codes...</div>
                    </div>
                </div>
                
                <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; gap: 0.75rem; margin-bottom: 0.5rem;">
                        <input 
                            type="text" 
                            id="promoCodeInput" 
                            placeholder="Enter promo code"
                            style="flex: 1; padding: 0.75rem; border: 2px solid #ffc107; border-radius: 6px; font-size: 0.95rem;"
                        >
                        <button 
                            type="button"
                            class="btn btn-primary" 
                            onclick="applyPromoCode()" 
                            style="padding: 0.75rem 1.25rem; white-space: nowrap;"
                        >
                            Apply Code
                        </button>
                    </div>
                    <div id="promoMessage" style="font-size: 0.85rem; color: #856404;"></div>
                </div>
                
                <div class="summary-row">
                    <span>Subtotal</span>
                    <span>₹${total}</span>
                </div>
                <div class="summary-row">
                    <span>Delivery Fee</span>
                    <span>₹40</span>
                </div>
                ${appliedPromoCode ? `
                <div class="summary-row" style="color: #28a745;">
                    <span>Discount (${appliedPromoCode.code})</span>
                    <span>-₹${promoCodeDiscount}</span>
                </div>
                ` : ''}
                <div class="summary-row summary-total">
                    <span>Total</span>
                    <span>₹${appliedPromoCode ? (total + 40 - promoCodeDiscount) : (total + 40)}</span>
                </div>
                <button class="btn btn-primary" onclick="proceedToCheckout()" style="margin-top: 1.5rem;">
                    Proceed to Checkout
                </button>
            </div>
        </div>
    `;
    
    // Populate available promo codes for current restaurant
    populateAvailablePromos();
}

// Display available promo codes for current restaurant
function populateAvailablePromos() {
    const allData = getAllData();
    let currentRestaurantId = null;
    
    // Get current restaurant ID from selected restaurant during browsing
    if (window.selectedRestaurantId) {
        currentRestaurantId = window.selectedRestaurantId;
    }
    
    if (!currentRestaurantId) {
        return; // No restaurant selected
    }
    
    // Find promo codes for current restaurant that are not expired
    const restaurantPromos = allData.filter(item => 
        item.type === 'promo' && 
        item.restaurantId === currentRestaurantId &&
        (!item.expiryDate || new Date(item.expiryDate) >= new Date())
    );
    
    const promosList = document.getElementById('availablePromosList');
    
    if (!promosList) {
        return; // Element not found
    }
    
    if (restaurantPromos.length === 0) {
        promosList.innerHTML = `<div style="font-size: 0.85rem; color: #999; text-align: center; padding: 0.5rem;">No active promo codes available</div>`;
        return;
    }
    
    let promosHTML = '';
    restaurantPromos.forEach(promo => {
        const discountText = promo.discountType === 'percentage' 
            ? promo.discountValue + '%' 
            : '₹' + promo.discountValue;
        
        promosHTML += `
            <div style="background: white; border: 1px solid #2196F3; border-radius: 6px; padding: 0.75rem; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;" onclick="insertPromoCode('${promo.code}')" onmouseover="this.style.background='#f0f8ff'" onmouseout="this.style.background='white'">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600; color: #1565c0;">🎟️ ${promo.code}</div>
                        <div style="color: #666; font-size: 0.8rem; margin-top: 0.2rem;">${promo.description}</div>
                        <div style="color: #999; font-size: 0.75rem; margin-top: 0.3rem;">Min order: ₹${promo.minOrderValue}</div>
                    </div>
                    <div style="background: #4CAF50; color: white; padding: 0.4rem 0.8rem; border-radius: 4px; font-weight: 600; white-space: nowrap; margin-left: 0.75rem;">${discountText} OFF</div>
                </div>
            </div>
        `;
    });
    
    promosList.innerHTML = promosHTML;
}

// Insert promo code when clicked from available list
function insertPromoCode(code) {
    const input = document.getElementById('promoCodeInput');
    if (input) {
        input.value = code;
        input.focus();
    }
}

// Update Quantity
function updateQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    updateCartCount();
    const content = document.getElementById('customerContent');
    renderCart(content);
}

// Remove from Cart
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartCount();
    const content = document.getElementById('customerContent');
    renderCart(content);
}

// Apply Promo Code
function applyPromoCode() {
    const promoInput = document.getElementById('promoCodeInput');
    const promoMessage = document.getElementById('promoMessage');
    const code = promoInput.value.trim().toUpperCase();
    
    if (!code) {
        promoMessage.textContent = '❌ Please enter a promo code';
        promoMessage.style.color = '#d9534f';
        return;
    }
    
    allData = getAllData();
    const promo = allData.find(item => 
        item.type === 'promo' && 
        item.code.toUpperCase() === code && 
        item.restaurantId === cart[0]?.restaurantId
    );
    
    if (!promo) {
        promoMessage.textContent = '❌ Invalid or expired promo code';
        promoMessage.style.color = '#d9534f';
        appliedPromoCode = null;
        promoCodeDiscount = 0;
        return;
    }
    
    // Check if promo is still valid (if it has an expiry date)
    if (promo.expiryDate && new Date(promo.expiryDate) < new Date()) {
        promoMessage.textContent = '❌ Promo code has expired';
        promoMessage.style.color = '#d9534f';
        appliedPromoCode = null;
        promoCodeDiscount = 0;
        return;
    }
    
    // Calculate discount
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    
    if (promo.discountType === 'percentage') {
        discount = Math.floor((subtotal * promo.discountValue) / 100);
    } else {
        discount = promo.discountValue;
    }
    
    // Apply maximum discount cap if exists
    if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
    }
    
    // Check minimum order value
    if (promo.minOrderValue && subtotal < promo.minOrderValue) {
        promoMessage.textContent = `❌ Minimum order value ₹${promo.minOrderValue} required`;
        promoMessage.style.color = '#d9534f';
        appliedPromoCode = null;
        promoCodeDiscount = 0;
        return;
    }
    
    appliedPromoCode = promo;
    promoCodeDiscount = discount;
    
    promoMessage.textContent = `✅ Promo code applied! You saved ₹${discount}`;
    promoMessage.style.color = '#28a745';
    
    // Re-render cart to show discount
    const content = document.getElementById('customerContent');
    renderCart(content);
}

// Proceed to Checkout
function proceedToCheckout() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 40;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 650px;">
            <div class="modal-header">
                <h2>Checkout</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form id="checkoutForm" onsubmit="handleCheckout(event)">
                <div class="form-group">
                    <label for="deliveryAddress">Delivery Address</label>
                    <input type="text" id="deliveryAddress" value="${currentUser.address}" required style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                </div>
                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" value="${currentUser.phone}" required style="width: 100%; padding: 0.875rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem;">
                </div>
                
                <div style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="font-size: 1.125rem; margin-bottom: 1rem; color: #333;">Select Payment Method</h3>
                    
                    <div class="payment-option" id="codOption" style="background: white; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.3s;" onclick="selectPaymentMethod('cod')">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <input type="radio" name="paymentMethod" id="cod" value="Cash on Delivery" style="width: 20px; height: 20px; cursor: pointer;">
                            <label for="cod" style="cursor: pointer; flex: 1; margin: 0;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">💵 Cash on Delivery</div>
                                <div style="font-size: 0.875rem; color: #666;">Pay with cash when order arrives</div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="payment-option" id="cardOption" style="background: white; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.3s;" onclick="selectPaymentMethod('card')">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <input type="radio" name="paymentMethod" id="card" value="Debit/Credit Card" style="width: 20px; height: 20px; cursor: pointer;">
                            <label for="card" style="cursor: pointer; flex: 1; margin: 0;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">💳 Debit/Credit Card</div>
                                <div style="font-size: 0.875rem; color: #666;">Visa, Mastercard, Rupay accepted</div>
                            </label>
                        </div>
                    </div>
                    
                    <div class="payment-option" id="upiOption" style="background: white; padding: 1rem; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s;" onclick="selectPaymentMethod('upi')">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <input type="radio" name="paymentMethod" id="upi" value="UPI" style="width: 20px; height: 20px; cursor: pointer;">
                            <label for="upi" style="cursor: pointer; flex: 1; margin: 0;">
                                <div style="font-weight: 600; margin-bottom: 0.25rem;">📱 UPI Payment</div>
                                <div style="font-size: 0.875rem; color: #666;">Google Pay, PhonePe, Paytm</div>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div id="paymentDetails"></div>
                
                <div style="background: #f0f9ff; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 2px solid #3b82f6;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Subtotal:</span>
                        <span>₹${total - 40}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Delivery Fee:</span>
                        <span>₹40</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 1.25rem; font-weight: 700; color: #667eea; border-top: 2px solid #3b82f6; padding-top: 0.75rem; margin-top: 0.75rem;">
                        <span>Total Amount:</span>
                        <span>₹${total}</span>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary" id="placeOrderBtn" disabled style="opacity: 0.5;">
                    Select Payment Method to Continue
                </button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// Select Payment Method
function selectPaymentMethod(method) {
    // Update radio selection
    document.getElementById(method).checked = true;
    
    // Update visual selection
    const allOptions = ['codOption', 'cardOption', 'upiOption'];
    allOptions.forEach(optionId => {
        const option = document.getElementById(optionId);
        if (option) {
            option.style.borderColor = '#e0e0e0';
            option.style.background = 'white';
        }
    });
    
    const selectedOption = method + 'Option';
    document.getElementById(selectedOption).style.borderColor = '#667eea';
    document.getElementById(selectedOption).style.background = '#f0f9ff';
    
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 40;
    
    placeOrderBtn.disabled = false;
    placeOrderBtn.style.opacity = '1';
    
    if (method === 'cod') {
        placeOrderBtn.textContent = 'Place Order';
    } else if (method === 'card') {
        placeOrderBtn.textContent = 'Pay ₹' + total + ' (Demo)';
    } else if (method === 'upi') {
        placeOrderBtn.textContent = 'Pay ₹' + total + ' with UPI (Demo)';
    }
}

// Handle Checkout
function handleCheckout(event) {
    event.preventDefault();
    
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
    
    if (!paymentMethod) {
        showToast('Please select a payment method', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 40;
    
    // Group items by restaurant
    const restaurantGroups = {};
    cart.forEach(item => {
        if (!restaurantGroups[item.restaurantId]) {
            restaurantGroups[item.restaurantId] = [];
        }
        restaurantGroups[item.restaurantId].push(item);
    });
    
    // Create separate orders for each restaurant
    for (const [restaurantId, items] of Object.entries(restaurantGroups)) {
        const orderTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0) + 40;
        
        const orderData = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: 'order',
            customerId: currentUser.__backendId,
            restaurantId: restaurantId,
            items: JSON.stringify(items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price
            }))),
            totalAmount: orderTotal,
            orderStatus: 'pending',
            paymentMode: paymentMethod,
            paymentStatus: paymentMethod === 'Cash on Delivery' ? 'pending' : 'completed',
            deliveryAddress: document.getElementById('deliveryAddress').value,
            deliveryPhone: document.getElementById('phone').value,
            promoCode: appliedPromoCode ? appliedPromoCode.code : null,
            discountAmount: promoCodeDiscount,
            finalAmount: orderTotal - promoCodeDiscount,
            timestamp: Date.now()
        };
        
        createRecord(orderData);
    }
    
    allData = getAllData();
    showToast(paymentMethod === 'Cash on Delivery' ? 'Order placed successfully!' : 'Payment successful! Order placed!', 'success');
    cart = [];
    updateCartCount();
    document.querySelector('.modal').remove();
    showCustomerSection('orders');
}

// Render Customer Orders
function renderCustomerOrders(container) {
    const orders = allData.filter(item => item.type === 'order' && item.customerId === currentUser.__backendId);
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No Orders Yet</h3>
                <p>Your orders will appear here</p>
            </div>
        `;
        return;
    }
    
    let orderCards = '';
    orders.forEach(order => {
        const restaurant = allData.find(r => r.__backendId === order.restaurantId);
        const items = JSON.parse(order.items || '[]');
        
        let itemsList = '';
        items.forEach(item => {
            itemsList += `<li>${item.name} x ${item.quantity} - ₹${item.price * item.quantity}</li>`;
        });
        
        // Generate order timeline - ONLY ACTUAL STATUSES IN YOUR APP
        const allTimelineSteps = [
            { status: 'pending', title: 'Order Placed', icon: '📝', description: 'Your order has been placed' },
            { status: 'preparing', title: 'Being Prepared', icon: '👨‍🍳', description: 'Restaurant is preparing your food' },
            { status: 'ready', title: 'Ready for Delivery', icon: '📦', description: 'Your food is ready, delivery partner picking up' },
            { status: 'out-for-delivery', title: 'Out for Delivery', icon: '🏍️', description: 'On the way to you' },
            { status: 'delivered', title: 'Delivered', icon: '🎉', description: 'Order delivered successfully' }
        ];
        
        // Find current status index
        const currentStatusIndex = allTimelineSteps.findIndex(step => step.status === order.orderStatus);
        
        // Only show steps UP TO and INCLUDING current status (don't show future steps)
        const visibleSteps = allTimelineSteps.slice(0, currentStatusIndex + 1);
        
        let timelineHTML = '<div class="order-timeline">';
        visibleSteps.forEach((step, index) => {
            const isCompleted = index < currentStatusIndex;  // Past steps are completed
            const isCurrent = index === currentStatusIndex;   // Current step
            
            timelineHTML += `
                <div class="timeline-item">
                    <div class="timeline-dot ${isCompleted ? 'completed' : ''}${isCurrent ? ' pending' : ''}">
                        ${step.icon}
                    </div>
                    <div class="timeline-content">
                        <div class="timeline-title">${step.title}</div>
                        <div class="timeline-time">${step.description}</div>
                    </div>
                </div>
            `;
        });
        timelineHTML += '</div>';
        
        orderCards += `
            <div class="data-table" style="margin-bottom: 2rem;">
                <div class="table-header">
                    <div>
                        <h3>Order #${order.id ? order.id.slice(0, 8) : 'N/A'}</h3>
                        <p style="color: #666; margin-top: 0.25rem;">${new Date(order.timestamp).toLocaleString()}</p>
                    </div>
                    <span class="status-badge status-${order.orderStatus}">
                        ${order.orderStatus.toUpperCase()}
                    </span>
                </div>
                <div style="padding: 1.5rem;">
                    <p><strong>Restaurant:</strong> ${restaurant?.restaurantName || 'Unknown'}</p>
                    <p><strong>Items:</strong></p>
                    <ul style="margin: 0.5rem 0 1rem 1.5rem;">
                        ${itemsList}
                    </ul>
                    <p><strong>Total:</strong> ₹${order.totalAmount}</p>
                    <p><strong>Payment:</strong> ${order.paymentMode} ${order.paymentStatus === 'completed' ? '<span style="color: #10b981;">✅ Paid</span>' : '<span style="color: #f59e0b;">⏳ Pending</span>'}</p>
                    
                    <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #e2e8f0;">
                    
                    <h4 style="color: #1e293b; font-weight: 700; margin-bottom: 1rem;">Order Status Timeline</h4>
                    ${timelineHTML}
                    
                    ${order.orderStatus === 'delivered' && !order.reviewed ? `
                        <hr style="margin: 1.5rem 0; border: none; border-top: 1px solid #e2e8f0;">
                        <button class="btn btn-primary" style="width: auto; padding: 0.75rem 1.5rem;" onclick="openReviewModal('${order.id}')">
                            Write Review & Rating
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = orderCards;
}

// Render Customer Profile
function renderCustomerProfile(container) {
    allData = getAllData();
    const customer = allData.find(u => u.__backendId === currentUser.__backendId);
    
    if (!customer) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Profile Error</h3>
                <p>Unable to load profile</p>
            </div>
        `;
        return;
    }
    
    const profilePictureUrl = customer.profilePicture || null;
    
    container.innerHTML = `
        <div class="profile-section">
            <div class="profile-card">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${profilePictureUrl ? `<img src="${profilePictureUrl}" alt="Profile" class="avatar-image">` : `<span class="avatar-icon">👤</span>`}
                    </div>
                    <div class="profile-header-info">
                        <h2>${customer.name}</h2>
                        <p style="color: #64748b; margin-top: 0.25rem;">Customer Account</p>
                    </div>
                </div>
                
                <div class="profile-details">
                    <div class="detail-item">
                        <label>Full Name</label>
                        <p>${customer.name}</p>
                    </div>
                    
                    <div class="detail-item">
                        <label>Email</label>
                        <p>${customer.email}</p>
                    </div>
                    
                    <div class="detail-item">
                        <label>Phone Number</label>
                        <p>${customer.phone}</p>
                    </div>
                    
                    <div class="detail-item">
                        <label>Address</label>
                        <p>${customer.address}</p>
                    </div>
                    
                    <div class="detail-item">
                        <label>Username</label>
                        <p>${customer.username}</p>
                    </div>
                    
                    <div class="detail-item">
                        <label>Member Since</label>
                        <p>${new Date(parseInt(customer.__backendId.substring(0, 13))).toLocaleDateString()}</p>
                    </div>
                </div>
                
                <div class="profile-actions">
                    <button class="btn btn-primary" onclick="showCustomerSection('editProfile')" style="width: auto; padding: 0.75rem 1.5rem;">
                        ✏️ Edit Profile
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Render Edit Profile Form
function renderEditProfileForm(container) {
    allData = getAllData();
    const customer = allData.find(u => u.__backendId === currentUser.__backendId);
    
    if (!customer) {
        container.innerHTML = `<div class="empty-state"><h3>Profile Error</h3></div>`;
        return;
    }
    
    const profilePictureUrl = customer.profilePicture || null;
    
    container.innerHTML = `
        <div class="profile-section">
            <div class="profile-card">
                <div style="margin-bottom: 1.5rem;">
                    <h2 style="color: #1e293b; font-weight: 700; margin-bottom: 0.5rem;">Edit Your Profile</h2>
                    <p style="color: #64748b;">Update your personal information</p>
                </div>
                
                <form id="editProfileForm" onsubmit="handleUpdateProfile(event)">
                    <div class="form-group">
                        <label for="editProfilePicture">Profile Picture</label>
                        <div class="profile-picture-container">
                            <div class="profile-picture-preview" id="profilePicturePreview">
                                ${profilePictureUrl ? `<img src="${profilePictureUrl}" alt="Profile Picture" class="preview-image">` : `<span class="preview-placeholder">📸 No image</span>`}
                            </div>
                            <input type="file" id="editProfilePicture" accept="image/*" onchange="handleProfilePictureChange()">
                            <small style="display: block; margin-top: 0.5rem; color: #64748b; font-size: 0.8125rem;">JPG, PNG, GIF up to 2MB</small>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="editName">Full Name</label>
                        <input type="text" id="editName" value="${customer.name}" placeholder="Enter your full name" oninput="validateProfileName()" required>
                        <small class="warning-message" id="editNameWarning" style="display:none;"></small>
                    </div>
                    
                    <div class="form-group">
                        <label for="editEmail">Email</label>
                        <input type="email" id="editEmail" value="${customer.email}" placeholder="Enter your email" oninput="validateProfileEmail()" required>
                        <small class="warning-message" id="editEmailWarning" style="display:none;"></small>
                    </div>
                    
                    <div class="form-group">
                        <label for="editPhone">Phone Number</label>
                        <input type="tel" id="editPhone" value="${customer.phone}" placeholder="Enter your phone number" oninput="validateProfilePhone()" required>
                        <small class="warning-message" id="editPhoneWarning" style="display:none;"></small>
                    </div>
                    
                    <div class="form-group">
                        <label for="editAddress">Address</label>
                        <input type="text" id="editAddress" value="${customer.address}" placeholder="Enter your address" oninput="validateProfileAddress()" required>
                        <small class="warning-message" id="editAddressWarning" style="display:none;"></small>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button type="submit" class="btn btn-primary" style="flex: 1;">
                            💾 Save Changes
                        </button>
                        <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="showCustomerSection('profile')">
                            ❌ Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// Handle Profile Picture Change
function handleProfilePictureChange() {
    const fileInput = document.getElementById('editProfilePicture');
    const preview = document.getElementById('profilePicturePreview');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select an image file', 'error');
        fileInput.value = '';
        return;
    }
    
    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
        showToast('Image size must be less than 2MB', 'error');
        fileInput.value = '';
        return;
    }
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Profile Picture" class="preview-image">`;
        // Store the data URL for later use
        window.profilePictureData = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Validate Profile Name
function validateProfileName(isSubmit = false) {
    const nameInput = document.getElementById('editName');
    const nameWarning = document.getElementById('editNameWarning');
    if (!nameInput) return true;
    
    const value = nameInput.value.trim();
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    
    if (value === '') {
        if (nameWarning) {
            nameWarning.textContent = 'Full name is required';
            nameWarning.style.display = 'block';
        }
        return false;
    } else if (!nameRegex.test(value)) {
        if (nameWarning) {
            nameWarning.textContent = 'Name should contain only letters and spaces (2-50 characters)';
            nameWarning.style.display = 'block';
        }
        return false;
    } else {
        if (nameWarning) {
            nameWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Profile Email
function validateProfileEmail(isSubmit = false) {
    const emailInput = document.getElementById('editEmail');
    const emailWarning = document.getElementById('editEmailWarning');
    if (!emailInput) return true;
    
    const value = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (value === '') {
        if (emailWarning) {
            emailWarning.textContent = 'Email is required';
            emailWarning.style.display = 'block';
        }
        return false;
    } else if (!emailRegex.test(value)) {
        if (emailWarning) {
            emailWarning.textContent = 'Please enter a valid email address';
            emailWarning.style.display = 'block';
        }
        return false;
    } else {
        if (emailWarning) {
            emailWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Profile Phone
function validateProfilePhone(isSubmit = false) {
    const phoneInput = document.getElementById('editPhone');
    const phoneWarning = document.getElementById('editPhoneWarning');
    if (!phoneInput) return true;
    
    const value = phoneInput.value.trim();
    const phoneRegex = /^[0-9]{10}$/;
    
    if (value === '') {
        if (phoneWarning) {
            phoneWarning.textContent = 'Phone number is required';
            phoneWarning.style.display = 'block';
        }
        return false;
    } else if (!phoneRegex.test(value)) {
        if (phoneWarning) {
            phoneWarning.textContent = 'Please enter a valid 10-digit phone number';
            phoneWarning.style.display = 'block';
        }
        return false;
    } else {
        if (phoneWarning) {
            phoneWarning.style.display = 'none';
        }
        return true;
    }
}

// Validate Profile Address
function validateProfileAddress(isSubmit = false) {
    const addressInput = document.getElementById('editAddress');
    const addressWarning = document.getElementById('editAddressWarning');
    if (!addressInput) return true;
    
    const value = addressInput.value.trim();
    
    if (value === '') {
        if (addressWarning) {
            addressWarning.textContent = 'Address is required';
            addressWarning.style.display = 'block';
        }
        return false;
    } else if (value.length < 5 || value.length > 100) {
        if (addressWarning) {
            addressWarning.textContent = 'Address should be between 5-100 characters';
            addressWarning.style.display = 'block';
        }
        return false;
    } else {
        if (addressWarning) {
            addressWarning.style.display = 'none';
        }
        return true;
    }
}

// Handle Update Profile
function handleUpdateProfile(event) {
    event.preventDefault();
    
    // Validate all fields
    if (!validateProfileName(true) || !validateProfileEmail(true) || 
        !validateProfilePhone(true) || !validateProfileAddress(true)) {
        showToast('Please correct the errors in the form', 'error');
        return;
    }
    
    allData = getAllData();
    const customer = allData.find(u => u.__backendId === currentUser.__backendId);
    
    if (!customer) {
        showToast('Profile not found', 'error');
        return;
    }
    
    // Update customer profile
    customer.name = document.getElementById('editName').value.trim();
    customer.email = document.getElementById('editEmail').value.trim();
    customer.phone = document.getElementById('editPhone').value.trim();
    customer.address = document.getElementById('editAddress').value.trim();
    
    // Update profile picture if a new one was selected
    if (window.profilePictureData) {
        customer.profilePicture = window.profilePictureData;
        window.profilePictureData = null; // Clear the temp data
    }
    
    // Update in localStorage
    updateRecord(customer);
    
    // Update current user session
    currentUser = customer;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    showToast('Profile updated successfully!', 'success');
    
    // Refresh the dashboard
    setTimeout(() => {
        renderCustomerDashboard();
        showCustomerSection('profile');
    }, 500);
}

// Open Review Modal
function openReviewModal(orderId) {
    const order = allData.find(o => o.type === 'order' && o.id === orderId);
    if (!order) return;
    
    const items = JSON.parse(order.items || '[]');
    
    let itemsOptions = items.map(item => `<option value="${item.__backendId}">${item.name}</option>`).join('');
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Rate Your Order</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <form onsubmit="handleReviewSubmit(event, '${orderId}')">
                <div class="form-group">
                    <label>Select Item to Review</label>
                    <select id="reviewItem" required>
                        <option value="">Choose an item...</option>
                        ${itemsOptions}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Rating</label>
                    <div class="rating-stars" id="ratingStars">
                        <span class="star" data-value="1">⭐</span>
                        <span class="star" data-value="2">⭐</span>
                        <span class="star" data-value="3">⭐</span>
                        <span class="star" data-value="4">⭐</span>
                        <span class="star" data-value="5">⭐</span>
                    </div>
                    <input type="hidden" id="ratingValue" value="0" required>
                </div>
                
                <div class="form-group">
                    <label>Your Review (Optional)</label>
                    <textarea id="reviewText" style="width: 100%; padding: 0.875rem; border: 2px solid #e2e8f0; border-radius: 8px; min-height: 100px; font-size: 0.95rem;" placeholder="Share your experience..."></textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Submit Review</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Setup star rating click handlers
    document.querySelectorAll('.rating-stars .star').forEach(star => {
        star.addEventListener('click', function() {
            const value = this.dataset.value;
            document.getElementById('ratingValue').value = value;
            document.querySelectorAll('.rating-stars .star').forEach(s => s.classList.remove('active'));
            for (let i = 0; i < value; i++) {
                document.querySelectorAll('.rating-stars .star')[i].classList.add('active');
            }
        });
    });
}

// Handle Review Submit
function handleReviewSubmit(event, orderId) {
    event.preventDefault();
    
    const foodId = document.getElementById('reviewItem').value;
    const rating = parseInt(document.getElementById('ratingValue').value);
    const text = document.getElementById('reviewText').value;
    
    if (!foodId || rating === 0) {
        showToast('Please select an item and rating', 'error');
        return;
    }
    
    const review = {
        type: 'review',
        foodId: foodId,
        rating: rating,
        text: text,
        customerId: currentUser.__backendId,
        customerName: currentUser.name,
        timestamp: new Date().toISOString(),
        __backendId: 'review_' + Date.now() + Math.random().toString(36).substr(2, 9)
    };
    
    createRecord(review);
    
    // Mark order as reviewed
    const order = allData.find(o => o.type === 'order' && o.id === orderId);
    if (order) {
        order.reviewed = true;
        updateRecord(order);
    }
    
    allData = getAllData();
    showToast('Review submitted successfully!', 'success');
    document.querySelector('.modal').remove();
    const content = document.getElementById('customerContent');
    renderCustomerOrders(content);
}

// Render Delivery Dashboard
function renderDeliveryDashboard() {
    currentView = 'delivery-dashboard';
    allData = getAllData();
    const app = document.getElementById('app');
    
    const assignedOrders = allData.filter(item => 
        item.type === 'order' && 
        item.deliveryPartnerId === currentUser.__backendId
    );
    
    const availableOrders = allData.filter(item => 
        item.type === 'order' && 
        item.orderStatus === 'ready' && 
        !item.deliveryPartnerId
    );
    
    app.innerHTML = `
        <div class="dashboard">
            <div class="sidebar">
                <div class="sidebar-header">
                    <h2>Delivery Partner</h2>
                    <p>${currentUser.name}</p>
                </div>
                <ul class="sidebar-menu">
                    <li class="active" onclick="showDeliverySection('available')">📦 Available Orders</li>
                    <li onclick="showDeliverySection('assigned')">🏍️ My Deliveries</li>
                    <li onclick="showDeliverySection('history')">📋 History</li>
                    <li onclick="logout()">🚪 Logout</li>
                </ul>
            </div>
            <div class="main-content">
                <div class="content-header">
                    <h1>Available Orders</h1>
                    <p>Pick up orders for delivery</p>
                </div>
                <div class="content-body" id="deliveryContent">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Available Orders</span>
                                <span class="stat-icon">📦</span>
                            </div>
                            <div class="stat-value">${availableOrders.length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Active Deliveries</span>
                                <span class="stat-icon">🏍️</span>
                            </div>
                            <div class="stat-value">${assignedOrders.filter(o => o.orderStatus !== 'delivered').length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Completed Today</span>
                                <span class="stat-icon">✅</span>
                            </div>
                            <div class="stat-value">${assignedOrders.filter(o => o.orderStatus === 'delivered').length}</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-label">Earnings</span>
                                <span class="stat-icon">💰</span>
                            </div>
                            <div class="stat-value">₹${assignedOrders.filter(o => o.orderStatus === 'delivered').length * 50}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show Delivery Section
function showDeliverySection(section) {
    allData = getAllData();
    document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('deliveryContent');
    
    switch(section) {
        case 'available':
            renderAvailableOrders(content);
            break;
            
        case 'assigned':
            renderAssignedOrders(content);
            break;
            
        case 'history':
            renderDeliveryHistory(content);
            break;
    }
}

// Render Available Orders
function renderAvailableOrders(container) {
    const availableOrders = allData.filter(item => 
        item.type === 'order' && 
        item.orderStatus === 'ready' && 
        !item.deliveryPartnerId
    );
    
    if (availableOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <h3>No Orders Available</h3>
                <p>Check back later for delivery opportunities</p>
            </div>
        `;
        return;
    }
    
    let orderCards = '';
    availableOrders.forEach(order => {
        const restaurant = allData.find(r => r.__backendId === order.restaurantId);
        const customer = allData.find(u => u.__backendId === order.customerId);
        const items = JSON.parse(order.items || '[]');
        
        orderCards += `
            <div class="data-table" style="margin-bottom: 1.5rem;">
                <div class="table-header">
                    <div>
                        <h3>Order #${order.id ? order.id.slice(0, 8) : 'N/A'}</h3>
                        <p style="color: #666; margin-top: 0.25rem;">${restaurant?.restaurantName || 'Unknown'}</p>
                    </div>
                    <span class="status-badge status-ready">READY</span>
                </div>
                <div style="padding: 1.5rem;">
                    <p><strong>Pickup:</strong> ${restaurant?.address || 'Restaurant Address'}</p>
                    <p><strong>Delivery:</strong> ${order.deliveryAddress || customer?.address}</p>
                    <p><strong>Customer:</strong> ${customer?.name || 'Unknown'}</p>
                    <p><strong>Phone:</strong> ${order.deliveryPhone || customer?.phone}</p>
                    <p><strong>Items:</strong> ${items.length} items</p>
                    <p><strong>Amount:</strong> ₹${order.totalAmount}</p>
                    <button class="btn-small btn-approve" onclick="acceptDelivery('${order.__backendId}')" style="margin-top: 1rem;">
                        Accept Delivery
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = orderCards;
}

// Accept Delivery
function acceptDelivery(orderId) {
    const order = allData.find(item => item.__backendId === orderId);
    if (order) {
        order.deliveryPartnerId = currentUser.__backendId;
        order.orderStatus = 'out-for-delivery';
        updateRecord(order);
        allData = getAllData();
        showToast('Delivery accepted successfully', 'success');
        showDeliverySection('assigned');
    }
}

// Render Assigned Orders
function renderAssignedOrders(container) {
    const assignedOrders = allData.filter(item => 
        item.type === 'order' && 
        item.deliveryPartnerId === currentUser.__backendId &&
        item.orderStatus !== 'delivered'
    );
    
    if (assignedOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏍️</div>
                <h3>No Active Deliveries</h3>
                <p>Accept available orders to start delivering</p>
            </div>
        `;
        return;
    }
    
    let orderCards = '';
    assignedOrders.forEach(order => {
        const restaurant = allData.find(r => r.__backendId === order.restaurantId);
        const customer = allData.find(u => u.__backendId === order.customerId);
        
        orderCards += `
            <div class="data-table" style="margin-bottom: 1.5rem;">
                <div class="table-header">
                    <div>
                        <h3>Order #${order.id ? order.id.slice(0, 8) : 'N/A'}</h3>
                        <p style="color: #666; margin-top: 0.25rem;">${restaurant?.restaurantName || 'Unknown'}</p>
                    </div>
                    <span class="status-badge status-preparing">IN PROGRESS</span>
                </div>
                <div style="padding: 1.5rem;">
                    <p><strong>Pickup:</strong> ${restaurant?.address || 'Restaurant Address'}</p>
                    <p><strong>Delivery:</strong> ${order.deliveryAddress || customer?.address}</p>
                    <p><strong>Customer:</strong> ${customer?.name || 'Unknown'}</p>
                    <p><strong>Phone:</strong> ${order.deliveryPhone || customer?.phone}</p>
                    <p><strong>Amount:</strong> ₹${order.totalAmount} ${order.paymentStatus === 'pending' ? '<span style="color: #f59e0b;">(Collect Cash)</span>' : '<span style="color: #10b981;">(Prepaid)</span>'}</p>
                    <button class="btn-small btn-approve" onclick="markAsDelivered('${order.__backendId}')" style="margin-top: 1rem;">
                        Mark as Delivered
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = orderCards;
}

// Mark as Delivered
function markAsDelivered(orderId) {
    const order = allData.find(item => item.__backendId === orderId);
    if (order) {
        order.orderStatus = 'delivered';
        if (order.paymentMode === 'Cash on Delivery') {
            order.paymentStatus = 'completed';
        }
        updateRecord(order);
        allData = getAllData();
        showToast('Order marked as delivered', 'success');
        const content = document.getElementById('deliveryContent');
        renderAssignedOrders(content);
    }
}

// Render Delivery History
function renderDeliveryHistory(container) {
    const deliveredOrders = allData.filter(item => 
        item.type === 'order' && 
        item.deliveryPartnerId === currentUser.__backendId &&
        item.orderStatus === 'delivered'
    );
    
    if (deliveredOrders.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No Delivery History</h3>
                <p>Your completed deliveries will appear here</p>
            </div>
        `;
        return;
    }
    
    let tableRows = '';
    deliveredOrders.forEach(order => {
        const restaurant = allData.find(r => r.__backendId === order.restaurantId);
        const customer = allData.find(u => u.__backendId === order.customerId);
        
        tableRows += `
            <tr>
                <td>#${order.id ? order.id.slice(0, 8) : 'N/A'}</td>
                <td>${restaurant?.restaurantName || 'Unknown'}</td>
                <td>${customer?.name || 'Unknown'}</td>
                <td>₹${order.totalAmount}</td>
                <td>₹50</td>
                <td>${new Date(order.timestamp).toLocaleDateString()}</td>
            </tr>
        `;
    });
    
    container.innerHTML = `
        <div class="data-table">
            <div class="table-header">
                <h3>Delivery History</h3>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Restaurant</th>
                        <th>Customer</th>
                        <th>Amount</th>
                        <th>Earnings</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

// Logout
function logout() {
    currentUser = null;
    cart = [];
    sessionStorage.removeItem('currentUser');
    renderLandingPage();
    
    // Update chatbot for landing page (guest user)
    setTimeout(() => {
        updateChatbotForCurrentUser();
    }, 100);
    
    showToast('Logged out successfully', 'success');
}

// Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    initApp();
    // Initialize chatbot after app loads
    setTimeout(() => {
        initChatbot();
    }, 500);
});
