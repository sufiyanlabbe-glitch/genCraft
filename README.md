# CreatorAI – AI-Powered Content & Media Studio

> **College Mini Project**  
> A full-stack, modern, responsive web application for generating, refining, organizing, and saving digital content with AI.

---

## 🌟 Overview & Key Features

**CreatorAI** is an AI-powered SaaS dashboard crafted for content creators, marketers, students, and writers. It centralizes five specialized creative engines into a unified workspace:

1. **AI Content Writer**: Drafts blogs, articles, essays, creative stories, and eCommerce product descriptions with customizable tone (Professional, Friendly, Creative, Casual, Academic), languages (English, Hindi, Hinglish), and target word counts.
2. **AI Text Summarizer**: Condenses lengthy reports, documents, or articles into Short (executive summary), Medium (bulleted highlights), or Detailed summaries.
3. **Social Media Caption Generator**: Generates 3 platform-tailored captions and a curated set of hashtags for Instagram, LinkedIn, YouTube, and Facebook. Allows copying captions and hashtags separately.
4. **AI Content Rewriter**: Refactors draft text into Professional, Simple, Creative, Concise, or Friendly voices.
5. **AI Image Studio**: Designed for image generation models (Stability AI), featuring complete transparent setup instructions and no fabricated results.
6. **Project History & Saved Favorites**: Stores every creation in MongoDB with user-level isolation, real-time search, tool-type filtering, favorite bookmarking, and deletion confirmation modals.
7. **Interactive Dashboard**: Real-time metric cards, tool usage breakdown, and quick access to recent work.
8. **Secure Authentication**: Registration and login using modern `scrypt` password hashing and HTTP-only session cookies.
9. **Dark / Light Theme Toggle**: Persistent theme switching with smooth transitions and glassmorphism accents.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | HTML5, Tailwind CSS, Vanilla JavaScript (ES6+), Lucide Icons, Fetch API |
| **Backend** | Python 3.14+, Flask 3.0, Flask-CORS, Flask-Session, python-dotenv, Werkzeug |
| **Database** | MongoDB (Local Community Server or MongoDB Atlas Cloud) via PyMongo |
| **AI Services**| Google Gemini API (`gemini-1.5-flash`) via `google-generativeai` + Stability AI integration |
| **Testing** | Pytest, Flask Test Client |

---

## 📁 Project Architecture

```
creatorai/
│
├── app.py                     # Flask application factory and page route bindings
├── config.py                  # Environment-driven configuration
├── requirements.txt           # Python package dependencies
├── .env.example               # Example environment variables template
├── .gitignore                 # Excludes secrets, venv, and cache
├── README.md                  # Comprehensive setup & project guide
│
├── database/
│   ├── __init__.py
│   └── mongo.py               # MongoDB client, ping check, and collection indexing
│
├── routes/
│   ├── __init__.py
│   ├── auth_routes.py         # /api/auth (register, login, logout, me)
│   ├── ai_routes.py           # /api/ai (text, summarize, captions, rewrite, image)
│   ├── content_routes.py      # /api/contents (CRUD, favorites, pagination, clear-all)
│   └── dashboard_routes.py    # /api/dashboard (metrics, recent creations)
│
├── services/
│   ├── __init__.py
│   ├── ai_service.py          # Google Gemini AI integration with labeled Demo Mode fallback
│   └── image_service.py       # Stability AI image generation module & setup guide
│
├── utils/
│   ├── __init__.py
│   └── validators.py          # Input validation, regex, ObjectId check, login_required decorator
│
├── templates/
│   ├── base.html              # Core layout: responsive sidebar, theme toggle, modals
│   ├── index.html             # High-converting landing page
│   ├── login.html             # User sign-in page
│   ├── register.html          # New account registration page
│   ├── dashboard.html         # User dashboard with live stats and quick launch
│   ├── ai_writer.html         # Long-form & short-form AI writer
│   ├── summarizer.html        # Text summarizer
│   ├── caption_generator.html # Multi-platform captions & hashtags
│   ├── rewriter.html          # Style-based content rewriter
│   ├── image_generator.html   # Image generator studio
│   ├── history.html           # Project history, favorites, and search
│   └── settings.html          # Account profile, theme, and API instructions
│
├── static/
│   ├── css/
│   │   └── styles.css         # Glassmorphism, animations, scrollbars
│   └── js/
│       ├── app.js             # Global utilities (toast, modal, theme, copy, download)
│       ├── auth.js            # Registration and login client handlers
│       ├── dashboard.js       # Dynamic dashboard metric loaders
│       ├── ai_writer.js       # AI writer sliders and generation actions
│       ├── summarizer.js      # Summarizer word counter and controls
│       ├── caption_generator.js # Caption generator and separate copy tools
│       ├── rewriter.js        # Rewriter style handler
│       ├── image_generator.js # Image preview and setup guide display
│       └── history.js         # Library search, filter, pagination, and deletion dialogs
│
└── tests/
    └── test_routes.py         # Pytest suite for validators, auth, AI fallbacks, and sessions
```

---

## 🚀 Step-by-Step Installation & Setup

### Step 1: Clone or Navigate to the Workspace
Open PowerShell or your terminal:
```powershell
cd "c:\SUFIYAN\mini project\creatorai"
```

### Step 2: Create a Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

*(On Linux / macOS: `source venv/bin/activate`)*

### Step 3: Install Required Dependencies
```powershell
pip install -r requirements.txt
```

---

## 🗄️ Database Setup (MongoDB)

You can use either a **Local MongoDB** installation or a free **MongoDB Atlas Cloud** cluster.

### Option A: Local MongoDB
1. Download and install [MongoDB Community Server](https://www.mongodb.com/try/download/community).
2. Start the MongoDB service.
3. In your `.env` file, set:
   ```env
   MONGO_URI=mongodb://localhost:27017/creatorai
   ```

### Option B: MongoDB Atlas (Free Cloud Database)
1. Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas) and register for a free M0 cluster.
2. In **Database Access**, create a database user (e.g., username `admin` and a secure password).
3. In **Network Access**, add IP `0.0.0.0/0` (allow from anywhere) or your current IP.
4. Click **Connect** → **Drivers** (Python) and copy your connection string.
5. In your `.env` file, set:
   ```env
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/creatorai?retryWrites=true&w=majority
   ```

---

## 🔑 AI API Key Configuration

### 1. Google Gemini API (Text, Summaries, Captions, Rewriter)
1. Visit [Google AI Studio](https://aistudio.google.com/).
2. Click **Get API key** and generate a free API key.
3. In your `.env` file:
   ```env
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   GEMINI_MODEL=gemini-1.5-flash
   ```

> 💡 **Demo Mode:** If `GEMINI_API_KEY` is not provided, CreatorAI will activate a **clearly labeled Demo Mode**. It will indicate to the user that sample output is being displayed due to an unconfigured key, rather than pretending it is real output.

### 2. Stability AI (Optional for AI Image Generation)
1. Visit [Stability AI Platform](https://platform.stability.ai/).
2. Create an API key.
3. In your `.env` file:
   ```env
   STABILITY_API_KEY=sk-...your_key_here
   IMAGE_PROVIDER=stability
   ```

---

## ⚙️ Setting Up Environment Variables

Create your `.env` file from `.env.example`:
```powershell
Copy-Item .env.example .env
```
Edit `.env` to supply your settings:
```env
FLASK_SECRET_KEY=college-mini-project-secret-key-2026
FLASK_ENV=development
FLASK_DEBUG=1

MONGO_URI=mongodb://localhost:27017/creatorai
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

---

## ▶️ Running the Application

Start the Flask development server:
```powershell
python app.py
```

Open your browser and navigate to:
```
http://localhost:5000
```

- Landing Page: `http://localhost:5000/`
- Register: `http://localhost:5000/register`
- Login: `http://localhost:5000/login`
- Studio Dashboard: `http://localhost:5000/dashboard`

---

## 🧪 Running Automated Tests

Run the backend test suite with Pytest:
```powershell
pytest -v
```

This verifies:
- Email and password input validators
- String sanitization and ObjectId checks
- Registration error conditions (duplicate, invalid email, weak password)
- 401 Unauthorized protection on private endpoints
- AI service demo fallbacks when unconfigured
- Image service transparent error reporting

---

## 🌐 REST API Endpoints Reference

### Authentication
- `POST /api/auth/register` – Register a new user (`name`, `email`, `password`)
- `POST /api/auth/login` – Sign in and establish session (`email`, `password`)
- `POST /api/auth/logout` – Clear session
- `GET /api/auth/me` – Retrieve current authenticated user profile

### AI Tools
- `POST /api/ai/generate-text` – Generate long/short form text (`topic`, `content_type`, `tone`, `language`, `word_count`)
- `POST /api/ai/summarize` – Summarize text (`text`, `length`)
- `POST /api/ai/generate-caption` – Social media captions & hashtags (`description`, `platform`, `tone`)
- `POST /api/ai/rewrite` – Rewrite text with new style (`text`, `style`)
- `POST /api/ai/generate-image` – Generate image from prompt (`prompt`, `style`)

### Content Library
- `GET /api/contents` – List user items (query params: `page`, `limit`, `tool_type`, `is_favorite`, `search`)
- `POST /api/contents` – Save a creation (`title`, `tool_type`, `input_text`, `output_text`, `is_favorite`)
- `GET /api/contents/<id>` – Retrieve a single saved project
- `PUT /api/contents/<id>` – Update project title or text
- `DELETE /api/contents/<id>` – Delete project
- `PATCH /api/contents/<id>/favorite` – Toggle favorite status
- `DELETE /api/contents/clear-all` – Clear all user saved history

### Dashboard
- `GET /api/dashboard/stats` – Aggregated counts and tool distribution
- `GET /api/dashboard/recent` – Latest user creations

---

## ❓ Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Could not connect to MongoDB` | MongoDB service is not started | Start MongoDB locally via `net start MongoDB` (Windows Services) or verify your MongoDB Atlas URI in `.env`. |
| `Demo Mode banner visible` | `GEMINI_API_KEY` is not set | Add your real Gemini key to `.env` from [Google AI Studio](https://aistudio.google.com/) and restart Flask. |
| `Port 5000 already in use` | Another process is occupying port 5000 | Change the port in `app.py` (e.g. `port=5001`) or stop the occupying process. |
| `ModuleNotFoundError` | Dependencies not installed in active environment | Activate your venv (`.\venv\Scripts\Activate.ps1`) and run `pip install -r requirements.txt`. |

