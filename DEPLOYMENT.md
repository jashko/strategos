# Деплой на Railway

**СТРАТЕГОС** готов к продакшену! Вот как развернуть его на railway.app за 2 минуты.

## Шаг 1: Создайте аккаунт на Railway

- Перейди на https://railway.app
- Войди через GitHub (самый простой способ)

## Шаг 2: Создай новый проект

1. Нажми **New Project**
2. Выбери **Deploy from GitHub repo**
3. Авторизуй Railway доступ к своему GitHub
4. Найди репозиторий `vibecoding/strat` (или как ты его назвал)
5. Выбери `main` ветку

## Шаг 3: Railway автоматически:

- Обнаружит `Procfile` и `package.json`
- Установит зависимости (`npm install`)
- Запустит `npm start` (server.js)
- Выдаст тебе URL вида `https://strategos-production.up.railway.app`

## Шаг 4: Готово! 🚀

Твой сайт живёт на URL, который даст Railway. Делись с однокурсниками!

---

## Что дальше

**Переменные окружения** (если добавишь API-тренер):
- Добавь в Railway `ANTHROPIC_API_KEY` через dashboard
- Код прочитает `process.env.ANTHROPIC_API_KEY` (если добавишь на бэк)

**Автодеплой**: Railway автоматически перестраивает при каждом push в main.

**Домен**: Railway даёт тебе бесплатный поддомен. Можешь подключить свой домен в настройках проекта.

---

## Локально (без Railway)

```bash
npm install
npm start
# откроется http://localhost:8742
```

Или исходный способ:
```bash
python3 -m http.server 8742
```
