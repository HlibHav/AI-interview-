# BEY Webhook Setup Guide

Ця інструкція описує, як налаштувати webhook для отримання транскрипції в реальному часі від BEY SDK.

## 📋 Вимоги

1. **ngrok** або інший tunnel сервіс для публічного доступу
2. **BEY API Key** та **Avatar ID**
3. **Webhook endpoint** вже налаштований в коді

## 🔧 Крок 1: Налаштування ngrok

1. Запустіть ngrok:
```bash
ngrok http 3000
```

2. Скопіюйте ваш публічний URL (наприклад: `https://deegan-uninterpretable-charles.ngrok-free.dev`)

## 🔧 Крок 2: Налаштування змінних середовища

Додайте до вашого `.env.local` файлу:

```env
# Beyond Presence Configuration
BEY_API_KEY=your_beyond_presence_api_key_here
BEY_API_URL=https://api.bey.dev
BEY_AVATAR_ID=your_avatar_id_here

# Webhook Configuration
BEY_WEBHOOK_URL=https://deegan-uninterpretable-charles.ngrok-free.dev/api/beyond-presence/webhook
BEY_WEBHOOK_SECRET=your_webhook_secret_here  # Опціонально, для безпеки

# Вимкнути polling (використовувати тільки webhook)
BEY_STREAM_TRANSCRIPTS=false
```

**Важливо:** Замініть `https://deegan-uninterpretable-charles.ngrok-free.dev` на ваш ngrok URL!

## 🔧 Крок 3: Перевірка webhook endpoint

Webhook endpoint вже налаштований і доступний за адресою:
```
/api/beyond-presence/webhook
```

### Endpoint підтримує:
- **GET** - для валідації URL (використовується BEY SDK dashboard)
- **OPTIONS** - для CORS preflight запитів
- **POST** - для отримання webhook подій

### Перевірка вручну:

```bash
# Перевірка GET (валідація)
curl https://your-ngrok-url.ngrok-free.dev/api/beyond-presence/webhook

# Очікувана відповідь:
# {"success":true,"message":"Webhook endpoint is ready","endpoint":"/api/beyond-presence/webhook"}
```

## 🔧 Крок 4: Налаштування в BEY SDK Dashboard

1. Відкрийте [BEY SDK Dashboard](https://app.bey.chat) або dashboard вашої інтеграції
2. Перейдіть до розділу **Webhooks** або **Webhook Configuration**
3. Введіть ваш webhook URL:
   ```
   https://your-ngrok-url.ngrok-free.dev/api/beyond-presence/webhook
   ```
4. Натисніть **"Validate URL"** - має пройти успішно ✅
5. Якщо використовуєте `BEY_WEBHOOK_SECRET`, вкажіть його в налаштуваннях
6. Увімкніть webhook (toggle "Enable webhook")
7. Натисніть **"Save Configuration"**

## 🔧 Крок 5: Налаштування в BEY Dashboard (обовʼязково)

Починаючи з webhook-first інтеграції, агент більше не отримує webhook URL автоматично з нашого бекенду.  
Потрібно вручну задати URL/secret у BEY dashboard (або іншому інтерфейсі BEY).

1. Відкрийте [BEY dashboard](https://app.bey.chat)  
2. Зайдіть у налаштування агента → Webhooks  
3. Введіть ваш публічний URL:
   ```
   https://your-ngrok-url.ngrok-free.dev/api/beyond-presence/webhook
   ```
4. Додайте secret, якщо використовуєте `BEY_WEBHOOK_SECRET`  
5. Увімкніть webhook і збережіть налаштування

## 📡 Формат webhook payload

BEY SDK надсилає події в такому форматі:

```json
{
  "callId": "call_123",
  "agentId": "agent_456",
  "messages": [
    {
      "text": "Hello!",
      "sender": "participant",
      "timestamp": "2025-01-01T12:00:00Z"
    },
    {
      "text": "Hi there!",
      "sender": "ai",
      "timestamp": "2025-01-01T12:00:01Z"
    }
  ]
}
```

Наш endpoint автоматично:
1. Витягує `callId`, `agentId`, та `sessionId`
2. Конвертує повідомлення в транскрипцію
3. Зберігає в Weaviate через `/api/sessions/update-transcript`
4. При подіях `call.completed` / `call_ended` автоматично викликає `/api/sessions/real-complete`, що тригерить генерацію summary, психометричного профілю та оновлення batch summary

## 🔒 Безпека

### Webhook Secret (рекомендовано)

Для додаткової безпеки встановіть `BEY_WEBHOOK_SECRET`:

```env
BEY_WEBHOOK_SECRET=your-random-secret-string
```

BEY SDK буде надсилати цей секрет у заголовку:
- `x-bey-signature`
- `x-bey-secret`
- `x-webhook-secret`

Наш endpoint автоматично перевіряє секрет, якщо він налаштований.

## 🐛 Troubleshooting

### Помилка "Network error: Load failed"

**Причина:** ngrok free tier показує warning page при першому відвідуванні.

**Рішення:**
1. Відкрийте webhook URL в браузері
2. Натисніть "Visit Site" на warning page
3. Спробуйте валідацію знову

### Webhook не отримує події

**Перевірте:**
1. Чи працює ngrok tunnel (`ngrok http 3000`)
2. Чи правильно налаштовано `BEY_WEBHOOK_URL` в `.env.local`
3. Чи збережено конфігурацію в BEY SDK dashboard
4. Перевірте логи сервера: `console.log` в `/api/beyond-presence/webhook`

### 401 Unauthorized

**Причина:** Неправильний або відсутній `BEY_WEBHOOK_SECRET`.

**Рішення:**
1. Перевірте, чи `BEY_WEBHOOK_SECRET` в `.env.local` співпадає з налаштуваннями в BEY SDK dashboard
2. Або видаліть `BEY_WEBHOOK_SECRET` з `.env.local`, якщо не використовуєте секрет

## 📊 Порівняння: Webhook vs Polling

| Параметр | Webhook | Polling |
|----------|---------|---------|
| Запитів/хвилину | 0-5 (тільки при подіях) | 20-30+ (постійно) |
| Затримка | Миттєво | До 3 секунд |
| Навантаження | Мінімальне | Високе |
| Надійність | Залежить від ngrok | Стабільна |

**Рекомендація:** Використовуйте webhook для production, polling - як fallback.

## 🔗 Корисні посилання

- [BEY SDK Webhook Examples](https://github.com/bey-dev/bey-examples/tree/main/call-events-webhook#readme)
- [ngrok Documentation](https://ngrok.com/docs)
- [BEY SDK Documentation](https://docs.bey.dev)

## ✅ Чеклист налаштування

- [ ] ngrok запущено і працює
- [ ] `BEY_WEBHOOK_URL` налаштовано в `.env.local`
- [ ] Webhook URL валідується в BEY SDK dashboard
- [ ] Webhook увімкнено в dashboard
- [ ] Конфігурацію збережено
- [ ] `BEY_STREAM_TRANSCRIPTS=false` (якщо використовуєте тільки webhook)
- [ ] Перевірено логи при тестовому виклику

---

**Примітка:** Після налаштування webhook, нові агенти автоматично отримають webhook URL при створенні через `/api/beyond-presence/create-agent`.
