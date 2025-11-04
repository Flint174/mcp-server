# README.md

## Обзор проекта

Этот проект представляет собой серверную часть на TypeScript, который использует базу данных PostgreSQL.

## Необходимые зависимости

- Node.js
- TypeScript
- PostgreSQL
- ollama
- vscode + расширение continue

## Инструкция по установке

1. Клонируйте репозиторий на свой локальный компьютер.
2. Установите необходимые зависимости, выполнив команду `npm install` или `yarn install` в корневой директории проекта.
3. Создайте новый файл с именем `.env` в корневой директории проекта и добавьте свои учетные данные для базы данных (см. файл `.env.example`).
4. Соберите проект, выполнив команду `npm build` или `yarn build`

## Настройка PostgreSQL

Создайте базу данных:

```sql
CREATE DATABASE mcp_demo;
```

Создайте тестовую таблицу:

```sql
\c mcp_demo;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    price DECIMAL(10,2),
    category VARCHAR(50)
);

-- Добавьте тестовые данные
INSERT INTO users (name, email) VALUES
('Иван Петров', 'ivan@example.com'),
('Мария Сидорова', 'maria@example.com');

INSERT INTO products (name, price, category) VALUES
('Ноутбук', 1500.00, 'Электроника'),
('Книга', 25.50, 'Литература');
```

## Настройка Ollama

Лучше всего себя показала модель llama3.1:8b

```bash
ollama pull llama3.1:8b
```

## Настройка расширения Continue

### Подключение модели

```yaml
name: Local Config
version: 1.0.0
schema: v1
models:
  - name: llama3.1:8b
    provider: ollama
    model: llama3.1:8b
    roles:
      - chat
      - edit
      - apply
      - autocomplete

context:
  - provider: file
  - provider: code
  - provider: diff
  - provider: currentFile
  - provider: open
  - provider: tree
  - provider: problems
  - provider: terminal
  - provider: repo-map
    params:
      includeSignatures: false # default true
```

### Подключение MCP сервера

В настройках перейдите в раздел tools, там создайте новый MCP сервер. В настройках MCP сервера укажите

```yaml
name: New MCP server
version: 0.0.1
schema: v1
mcpServers:
  - name: New MCP server
    command: node
    args:
      - "/path/to/dist/server.js"
    env:
      {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "mcp_demo",
        "DB_USER": "postgres",
        "DB_PASSWORD": "dp_password",
      }
```

## Тестирование

### Промпт для проверка

Используя MCP инструменты, посмотри какие таблицы есть в локальной базе данных и покажи данные из таблицы users здесь в чате. Не пиши код, не выполняй запрос в терминале, не делай запрос в интернет

### Пример ответа

Performed 3 actions
Continue used the New MCP server get_tables tool
Continue read the current file
Continue searched for "users"

Таблицы в локальной базе данных:

users
products
Данные из таблицы users:

id name email

1. Иван Петров ivan@example.com
2. Мария Сидорова maria@example.com
