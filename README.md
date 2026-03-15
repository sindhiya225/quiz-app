# QuizAI — AI-Powered Quiz Application

A fullstack quiz application where users generate AI-powered multiple-choice quizzes on any topic, take them with live progress tracking, and review their performance history.

**Stack:** Next.js 14 · Django 4.2 · PostgreSQL · Google Gemini API · JWT Auth

---

## Live Demo

- **Frontend:** https://quiz-app.vercel.app
- **Backend API:** https://quiz-app.onrender.com

---

## Screenshots

### Register
![Register](screenshots/Register.png)

### Login
![Login](screenshots/Login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)
![Dashboard](screenshots/dashboard2.png)

### Create Quiz
![Create Quiz](screenshots/create-quiz.png)

### Taking a Quiz
![Quiz](screenshots/quiz-taking1.png)
![Quiz](screenshots/quiz-taking2.png)

### Review
![Review](screenshots/review.png)
![Review](screenshots/review2.png)

### Results
![Results](screenshots/results.png)

---

## Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL running locally
- Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone the repository

```bash
git clone https://github.com/sindhiya225/quiz-app.git
cd quiz-app
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and fill in your values:
#   DB_NAME, DB_USER, DB_PASSWORD — your local PostgreSQL credentials
#   GEMINI_API_KEY — your Gemini API key
#   SECRET_KEY — any long random string

# Create the database
createdb quizapp   # or use psql: CREATE DATABASE quizapp;

# Run migrations
python manage.py migrate

# Start the server
python manage.py runserver
```

Backend runs at `http://localhost:8000`

### 3. Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# .env.local content:
# NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Frontend runs at `http://localhost:3000`

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register/` | Register + receive JWT | No |
| POST | `/api/auth/login/` | Login + receive JWT | No |
| GET | `/api/auth/me/` | Get current user | Yes |
| GET | `/api/quizzes/` | List user's quizzes | Yes |
| POST | `/api/quizzes/` | Create AI-generated quiz | Yes |
| GET | `/api/quizzes/:id/` | Get quiz with questions | Yes |
| POST | `/api/quizzes/:id/attempts/` | Start a quiz attempt | Yes |
| POST | `/api/attempts/:id/answers/` | Submit a single answer | Yes |
| POST | `/api/attempts/:id/complete/` | Finish quiz, get score | Yes |
| GET | `/api/attempts/:id/` | Get attempt results | Yes |
| GET | `/api/attempts/` | List completed attempts | Yes |

---

## Database Design

### Models

```
User (extends AbstractUser)
  └── Quiz (topic, difficulty, num_questions)
        └── Question (text, options JSON, correct_option_index, explanation)
  └── QuizAttempt (status, score, started_at, completed_at)
        └── Answer (question FK, selected_option_index, is_correct)
```

### Key decisions

**Why `AbstractUser` instead of a separate Profile model?**  
Extending `AbstractUser` keeps auth simple — one table, standard Django auth works out of the box. A separate profile table would add a join on every auth check for no current benefit.

**Why store question options as a JSON array instead of a separate table?**  
Options are always read together with their question, never queried individually. A separate `QuestionOption` table would add complexity (ordering, joins) without any query benefit. JSON keeps it simple and fast.

**Why store `correct_option_index` as an integer (0–3) instead of storing the correct text?**  
Indices are more robust — if option text ever changes, an integer index still points to the right answer. It also makes `is_correct` evaluation a simple comparison (`selected == correct`).

**Why separate `Answer` from `QuizAttempt`?**  
An attempt stores *summary* data (total score, timestamps). Answers store *per-question* data. Keeping them separate lets us: (1) review individual answers on the results page, (2) update a single answer without touching the attempt row, and (3) query "which questions do users get wrong most often" if we wanted analytics later.

**Why is `correct_option_index` excluded from the quiz-taking serializer?**  
Security. If it were included in the API response when fetching quiz questions, a user could inspect the network tab and see all answers before submitting. It's only included in the results serializer, after the attempt is complete.

**Why allow `update_or_create` on Answer submission?**  
This makes answer submission idempotent — users can change their answer before moving to the next question, and network retries won't create duplicate rows.

---

## Architecture Overview

```
Next.js (Vercel)
    │  JWT in localStorage
    │  axios interceptor attaches Bearer token
    ▼
Django REST API (Render)
    │  JWT validation on each request
    │  User-scoped queries (quiz.user = request.user)
    ▼
PostgreSQL (Render managed DB)

Django → Google Gemini API
    Prompt: topic + difficulty + count
    Response: JSON array of questions
    Validation: structure check before saving
```

### Quiz generation flow
1. User submits topic, difficulty, question count
2. Django builds a structured prompt and calls Gemini 1.5 Flash
3. Response is parsed, validated (4 options, valid index, required fields)
4. Quiz + Question rows are created in the DB
5. Frontend immediately starts an attempt and redirects to the quiz

### Answer flow
- Answers are submitted one at a time as the user selects options (not batched at the end)
- This means partial progress is saved if the user closes the browser mid-quiz
- `is_correct` is computed server-side to prevent client-side manipulation
- The attempt is finalised with a separate `/complete/` call that counts correct answers

---

## Challenges & Solutions

**Gemini returning markdown-wrapped JSON**  
Gemini sometimes wraps its JSON response in ` ```json ``` ` code blocks. Solution: a `_clean_json_response()` function strips those with regex before parsing.

**Preventing answer leaking**  
The quiz-taking serializer (`QuestionSerializer`) deliberately omits `correct_option_index`. A separate `QuestionWithAnswerSerializer` exists for results. This is enforced at the serializer level, not just in views.

**Re-taking quizzes**  
`StartAttemptView` checks for an existing `in_progress` attempt before creating a new one, preventing duplicate attempts from double-clicks. Each retake creates a fresh `QuizAttempt` row, preserving history.

---

## Features Implemented

- [x] User registration and login with JWT
- [x] AI quiz generation via Google Gemini
- [x] Topic, difficulty, and question count selection
- [x] Quiz-taking with progress bar and question navigation dots
- [x] Per-question answer submission (progress saved in real time)
- [x] Results page with score, percentage, and answer review
- [x] Expandable per-question explanations on results page
- [x] Quiz history with scores
- [x] Retake quizzes (new attempt each time)
- [x] Dashboard with stats (total quizzes, attempts, average score)

## Features Skipped 

- **Email verification** — adds complexity (SMTP setup, token flow) without helping evaluate core skills
- **Leaderboard** — out of scope for the personal quiz tracker use case
- **Timer per question** — nice UX addition but not in core requirements
- **Dark mode** — time constraint; core flow was prioritised

---

## Project Structure

```
quiz-app/
├── backend/
│   ├── apps/
│   │   ├── authentication/   # User model, register, login, JWT
│   │   └── quizzes/          # Quiz, Question, Attempt, Answer + AI service
│   ├── quiz_project/         # Django settings, URLs
│   ├── requirements.txt
│   ├── render.yaml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/     # Login page
    │   │   ├── (auth)/register/  # Register page
    │   │   ├── dashboard/        # Quiz list + history
    │   │   └── quiz/
    │   │       ├── create/       # Quiz creation form
    │   │       └── [id]/
    │   │           ├── take/     # Quiz-taking experience
    │   │           └── results/  # Score + answer review
    │   ├── components/ui/        # Navbar
    │   ├── lib/                  # axios client, AuthContext
    │   └── types/                # TypeScript interfaces
    ├── package.json
    └── .env.local.example
```
