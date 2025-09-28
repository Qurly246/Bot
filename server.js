const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Fuse = require('fuse.js');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Загрузка базы знаний
let knowledgeBase = {};
const topics = [
  'intelligent-systems-types',
  'intelligent-systems-models',
  'intelligent-systems-architecture',
  'intelligent-systems-functioning',
  'intelligent-systems-examples',
  'knowledge-representation-models',
  'knowledge-representation-types',
  'knowledge-inference',
  'knowledge-database-methods',
  'formal-grammar-knowledge',
  'production-rules',
  'syntax-trees-parsing',
  'expert-systems-components',
  'expert-systems-limitations',
  'expert-systems-economic',
  'static-dynamic-expert-systems',
  'knowledge-acquisition',
  'expert-knowledge-engineer',
  'uncertainty-problems',
  'uncertainty-methods',
  'subjective-probabilities',
  'bayesian-estimation',
  'bayes-theorem'
];

// Загрузка всех тем
topics.forEach(topic => {
  try {
    const data = fs.readFileSync(`knowledge/${topic}.json`, 'utf8');
    knowledgeBase[topic] = JSON.parse(data);
  } catch (error) {
    console.error(`Ошибка загрузки темы ${topic}:`, error.message);
  }
});

// Создание индекса для fuzzy search
const allQuestions = [];
Object.keys(knowledgeBase).forEach(topic => {
  if (knowledgeBase[topic].questions) {
    knowledgeBase[topic].questions.forEach(q => {
      allQuestions.push({
        question: q.question,
        answer: q.answer,
        topic: topic,
        keywords: q.keywords || []
      });
    });
  }
});

const fuse = new Fuse(allQuestions, {
  keys: ['question', 'keywords'],
  threshold: 0.4,
  includeScore: true
});

// Функция поиска по ключевым словам
function searchByKeywords(query, topic = null) {
  const results = [];
  const searchTopics = topic ? [topic] : Object.keys(knowledgeBase);
  
  searchTopics.forEach(topicKey => {
    if (knowledgeBase[topicKey] && knowledgeBase[topicKey].questions) {
      knowledgeBase[topicKey].questions.forEach(q => {
        const keywords = q.keywords || [];
        const questionText = q.question.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // Проверка точного совпадения в вопросе
        if (questionText.includes(queryLower)) {
          results.push({
            question: q.question,
            answer: q.answer,
            topic: topicKey,
            score: 1.0,
            type: 'exact'
          });
        }
        // Проверка совпадения с ключевыми словами
        else if (keywords.some(keyword => 
          keyword.toLowerCase().includes(queryLower) || 
          queryLower.includes(keyword.toLowerCase())
        )) {
          results.push({
            question: q.question,
            answer: q.answer,
            topic: topicKey,
            score: 0.8,
            type: 'keyword'
          });
        }
      });
    }
  });
  
  return results.sort((a, b) => b.score - a.score);
}

// Функция нечеткого поиска
function fuzzySearch(query) {
  const results = fuse.search(query);
  return results.map(result => ({
    question: result.item.question,
    answer: result.item.answer,
    topic: result.item.topic,
    score: 1 - result.score,
    type: 'fuzzy'
  }));
}

// Функция выбора случайного ответа
function getRandomResponse(responses) {
  if (!responses || responses.length === 0) return null;
  return responses[Math.floor(Math.random() * responses.length)];
}

// API маршруты
app.get('/api/topics', (req, res) => {
  const topicsList = Object.keys(knowledgeBase).map(topic => ({
    id: topic,
    title: knowledgeBase[topic].title || topic,
    description: knowledgeBase[topic].description || ''
  }));
  res.json(topicsList);
});

app.get('/api/topic/:id', (req, res) => {
  const topicId = req.params.id;
  if (knowledgeBase[topicId]) {
    res.json(knowledgeBase[topicId]);
  } else {
    res.status(404).json({ error: 'Тема не найдена' });
  }
});

app.post('/api/chat', (req, res) => {
  const { message, topic } = req.body;
  
  if (!message || message.trim() === '') {
    return res.json({
      answer: 'Пожалуйста, задайте вопрос или выберите тему для изучения.',
      type: 'error'
    });
  }

  // Имитация задержки ответа
  setTimeout(() => {
    let results = [];
    
    // Поиск по ключевым словам
    const keywordResults = searchByKeywords(message, topic);
    results = results.concat(keywordResults);
    
    // Нечеткий поиск, если нет точных совпадений
    if (results.length === 0) {
      const fuzzyResults = fuzzySearch(message);
      results = results.concat(fuzzyResults.slice(0, 3)); // Берем топ-3 результата
    }
    
    // Фильтрация и сортировка результатов
    results = results
      .filter((result, index, self) => 
        index === self.findIndex(r => r.question === result.question)
      )
      .sort((a, b) => b.score - a.score);
    
    let response;
    
    if (results.length > 0 && results[0].score > 0.3) {
      // Выбираем лучший результат
      const bestResult = results[0];
      response = {
        answer: bestResult.answer,
        topic: bestResult.topic,
        type: 'answer',
        confidence: bestResult.score
      };
    } else {
      // Если ничего не найдено
      const fallbackResponses = [
        'К сожалению, я не смог найти точный ответ на ваш вопрос. Попробуйте переформулировать вопрос или выберите одну из тем для изучения.',
        'Ваш вопрос не совсем понятен. Можете ли вы уточнить или выбрать тему из списка?',
        'Я не нашел подходящей информации по вашему запросу. Давайте изучим одну из доступных тем.',
        'Попробуйте использовать другие ключевые слова или выберите конкретную тему для изучения.'
      ];
      
      response = {
        answer: getRandomResponse(fallbackResponses),
        type: 'fallback',
        suggestions: Object.keys(knowledgeBase).slice(0, 5).map(topic => ({
          id: topic,
          title: knowledgeBase[topic].title || topic
        }))
      };
    }
    
    res.json(response);
  }, 1000 + Math.random() * 2000); // Задержка от 1 до 3 секунд
});

// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});
