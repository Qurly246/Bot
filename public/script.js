// Основные переменные
let currentTheme = 'light';
let currentTopic = null;
let isTyping = false;

// DOM элементы
const mainPage = document.getElementById('mainPage');
const chatPage = document.getElementById('chatPage');
const topicsGrid = document.getElementById('topicsGrid');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const backBtn = document.getElementById('backBtn');
const chatTitle = document.getElementById('chatTitle');
const typingIndicator = document.getElementById('typingIndicator');
const themeToggle = document.getElementById('themeToggle');

// Инициализация приложения
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadTopics();
    setupEventListeners();
});

// Инициализация приложения
function initializeApp() {
    // Загружаем сохраненную тему
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        applyTheme(currentTheme);
    }
    
    // Показываем главную страницу
    showMainPage();
}

// Загрузка тем
async function loadTopics() {
    try {
        const response = await fetch('/api/topics');
        const topics = await response.json();
        displayTopics(topics);
    } catch (error) {
        console.error('Ошибка загрузки тем:', error);
        showError('Не удалось загрузить темы. Попробуйте обновить страницу.');
    }
}

// Отображение тем
function displayTopics(topics) {
    topicsGrid.innerHTML = '';
    
    topics.forEach(topic => {
        const topicCard = document.createElement('div');
        topicCard.className = 'topic-card';
        topicCard.innerHTML = `
            <h4>${topic.title}</h4>
            <p>${topic.description}</p>
        `;
        
        topicCard.addEventListener('click', () => {
            openChat(topic);
        });
        
        topicsGrid.appendChild(topicCard);
    });
}

// Открытие чата с темой
function openChat(topic) {
    currentTopic = topic;
    chatTitle.textContent = `Чат: ${topic.title}`;
    showChatPage();
    
    // Очищаем сообщения и добавляем приветствие
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <p>Привет! Я помогу вам изучить тему <strong>"${topic.title}"</strong>.</p>
                <p>Задайте мне любой вопрос по этой теме, и я дам подробный ответ с примерами!</p>
            </div>
        </div>
    `;
}

// Показать главную страницу
function showMainPage() {
    mainPage.classList.remove('hidden');
    chatPage.classList.add('hidden');
}

// Показать страницу чата
function showChatPage() {
    mainPage.classList.add('hidden');
    chatPage.classList.remove('hidden');
    messageInput.focus();
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Отправка сообщения
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Поиск
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });
    
    // Навигация
    backBtn.addEventListener('click', showMainPage);
    
    // Переключение темы
    themeToggle.addEventListener('click', toggleTheme);
}

// Отправка сообщения
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || isTyping) return;
    
    // Добавляем сообщение пользователя
    addUserMessage(message);
    messageInput.value = '';
    
    // Показываем индикатор печати
    showTypingIndicator();
    
    try {
        // Отправляем запрос к боту
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                topic: currentTopic ? currentTopic.id : null
            })
        });
        
        const botResponse = await response.json();
        
        // Скрываем индикатор печати
        hideTypingIndicator();
        
        // Добавляем ответ бота
        addBotMessage(botResponse);
        
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
        hideTypingIndicator();
        addBotMessage({
            answer: 'Извините, произошла ошибка. Попробуйте еще раз.',
            type: 'error'
        });
    }
}

// Выполнение поиска
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    // Переходим в чат
    currentTopic = null;
    chatTitle.textContent = 'Поиск по всем темам';
    showChatPage();
    
    // Очищаем сообщения
    chatMessages.innerHTML = '';
    
    // Показываем индикатор печати
    showTypingIndicator();
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: query,
                topic: null
            })
        });
        
        const botResponse = await response.json();
        
        hideTypingIndicator();
        addBotMessage(botResponse);
        
    } catch (error) {
        console.error('Ошибка поиска:', error);
        hideTypingIndicator();
        addBotMessage({
            answer: 'Извините, произошла ошибка при поиске. Попробуйте еще раз.',
            type: 'error'
        });
    }
}

// Добавление сообщения пользователя
function addUserMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-content">
            <p>${escapeHtml(message)}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Добавление сообщения бота
function addBotMessage(response) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    let content = formatBotResponse(response);
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content bot-response">
            ${content}
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Форматирование ответа бота
function formatBotResponse(response) {
    let content = '';
    
    if (response.answer) {
        content += `<p>${formatText(response.answer)}</p>`;
    }
    
    if (response.suggestions && response.suggestions.length > 0) {
        content += `
            <div class="suggestions">
                <h5>Возможно, вас заинтересуют эти темы:</h5>
                <ul>
                    ${response.suggestions.map(suggestion => 
                        `<li><a href="#" onclick="openTopicById('${suggestion.id}')">${suggestion.title}</a></li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    if (response.confidence) {
        content += `<p><small><em>Уверенность: ${Math.round(response.confidence * 100)}%</em></small></p>`;
    }
    
    return content;
}

// Форматирование текста
function formatText(text) {
    // Экранируем HTML
    text = escapeHtml(text);
    
    // Форматируем заголовки
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Форматируем код
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Форматируем списки
    text = text.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');
    text = text.replace(/^[-*]\s+(.*)$/gm, '<li>$1</li>');
    
    // Оборачиваем списки в ul/ol
    text = text.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Форматируем переносы строк
    text = text.replace(/\n\n/g, '</p><p>');
    text = text.replace(/\n/g, '<br>');
    
    return `<p>${text}</p>`;
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Показать индикатор печати
function showTypingIndicator() {
    isTyping = true;
    typingIndicator.classList.remove('hidden');
    sendBtn.disabled = true;
    scrollToBottom();
}

// Скрыть индикатор печати
function hideTypingIndicator() {
    isTyping = false;
    typingIndicator.classList.add('hidden');
    sendBtn.disabled = false;
}

// Прокрутка вниз
function scrollToBottom() {
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 100);
}

// Открытие темы по ID
async function openTopicById(topicId) {
    try {
        const response = await fetch(`/api/topic/${topicId}`);
        const topic = await response.json();
        openChat(topic);
    } catch (error) {
        console.error('Ошибка загрузки темы:', error);
        showError('Не удалось загрузить тему.');
    }
}

// Переключение темы
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
}

// Применение темы
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

// Показать ошибку
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message bot-message';
    errorDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-exclamation-triangle"></i>
        </div>
        <div class="message-content">
            <p style="color: #dc3545;">${escapeHtml(message)}</p>
        </div>
    `;
    
    chatMessages.appendChild(errorDiv);
    scrollToBottom();
}

// Анимация появления элементов
function animateElement(element) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        element.style.transition = 'all 0.3s ease';
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 100);
}

// Обработка ошибок
window.addEventListener('error', function(e) {
    console.error('Глобальная ошибка:', e.error);
});

// Обработка необработанных промисов
window.addEventListener('unhandledrejection', function(e) {
    console.error('Необработанная ошибка промиса:', e.reason);
    e.preventDefault();
});

// Экспорт функций для глобального использования
window.openTopicById = openTopicById;
