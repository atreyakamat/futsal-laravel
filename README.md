# FutsalGoa - Laravel AI Booking Platform

This project is a modern futsal booking platform upgraded from legacy to a cutting-edge **Laravel 13 AI SDK** architecture. It integrates AI-driven chat assistance to help users check arena availability, pricing, and seamless booking.

## Features
- **AI Booking Assistant**: Chat interface powered by Laravel AI SDK to query pricing and availability.
- **Modern UI**: Dark-themed, responsive user interface built with Tailwind CSS and Alpine.js.
- **Smart Agent Management (SAM)**: Pre-configured SAM agent workflows (.agent/skills, .cursor/rules, and Claude commands) for TDD-driven development.
- **Complete Test Coverage**: Feature and Unit tests for both traditional controllers and the AI agent flow using `Promptable::fake()`.

## Prerequisites
- PHP 8.2+
- Composer
- Node.js & NPM
- SQLite (or your preferred DB configured in `.env`)
- OpenAI API Key (or supported AI Provider Key)

## Installation & Setup

1. **Clone the repository and install dependencies**
   ```bash
   composer install
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

   **Crucial:** Add your AI provider API key to `.env`. For example, if using OpenAI:
   ```env
   OPENAI_API_KEY="sk-your-api-key"
   ```

3. **Database Setup**
   ```bash
   php artisan migrate --seed
   ```
   *(Note: The seeder populates dummy arenas and pricing data)*

4. **Build Frontend Assets**
   ```bash
   npm run build
   ```
   *or for development:*
   ```bash
   npm run dev
   ```

5. **Start the Application**
   ```bash
   php artisan serve
   ```
   Visit `http://localhost:8000` to view the application.

## Usage
- **Home Page**: Browse featured futsal arenas.
- **AI Assistant**: Click on "AI ASSISTANT" in the navbar to interact with the FutsalGoa AI. Try asking:
  - *"What is the price for Assagao arena at 18:00-19:00?"*
  - *"Is Mapusa arena available tomorrow at 20:00?"*

## Running Tests
This project employs strict Test-Driven Development via SAM. To run the automated test suite:

```bash
php artisan test
```

## Agent Configuration (SAM)
The project includes multi-platform configuration for **SAM (Smart Agent Manager)**.
- **Gemini CLI / Antigravity**: Uses `/sam-tdd-pipeline` or `/sam-orchestrator`
- **Claude Code**: Try `/sam:core:workflows:autonomous-tdd`
- **Cursor**: Use `@sam-tdd`

Enjoy your modernized AI booking experience!
