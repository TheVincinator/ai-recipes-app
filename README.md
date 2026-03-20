# AI Recipes

Based on your ingredients and preferences, use AI to generate recipes and cook delicious meals.

**AI Recipes** is a full-stack web app that helps you keep a running list of everything in your kitchen. At any time, based on the ingredients you have and any allergies you specify, you can ask the AI to generate recipes tailored to your pantry. The app also provides auto-generated icons for ingredients and allergies using AI-powered image detection.

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/1e19e03c-49d3-4b8b-8042-6ce3678ed130" alt="Login" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/010e13a9-7156-4ae6-bb78-6986de45ecda" alt="Create Account" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/309a3982-84c1-45df-87e4-cf9f17f54fec" alt="Manage Ingredients" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/bafe338f-19ce-4347-ae2a-ddefbfe7c575" alt="Manage Ingredients (continued)" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/0c49a96f-27af-4ba8-9435-b2f90f1f3d25" alt="Manage Allergies" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/af6315ea-43c5-42a1-8f8b-d47c997174c9" alt="Recipe Suggestions" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/bbbba7ba-7bbd-4d09-be57-bd15cd6ea925" alt="Save Recipe" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/7ca4d852-73d9-40f4-8eb6-f2ac42d559f4" alt="Saved Recipes" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
    <td><img src="https://github.com/user-attachments/assets/fc135252-c8b6-40d2-a409-9a97183502ba" alt="Account Settings" width="300" style="border:1px solid #ccc; border-radius:6px; padding:4px;"></td>
  </tr>
</table>

---

## Features

- **User accounts** — register, log in, update profile, change password, delete account
- **Ingredient manager** — add ingredients with quantities, units, and categories; search and filter your pantry
- **Allergy manager** — track dietary restrictions with custom or preset allergens
- **AI recipe suggestions** — get recipes tailored to your pantry, filtered by meal type, cuisine, and diet; allergens are automatically excluded
- **Saved recipes** — bookmark, rename, and delete recipes
- **Auto-generated icons** — YOLOv8n object detection fetches and crops food images into icons for custom ingredients and allergies

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router, Axios, Tailwind CSS |
| Backend | Flask 3, SQLAlchemy, Flask-Migrate, PyJWT |
| Database | PostgreSQL (production) / SQLite (development) |
| AI — Recipes | DeepSeek V3 via Hugging Face API |
| AI — Icons | YOLOv8n (Ultralytics) + Pixabay API |
| Storage | Cloudflare R2 (S3-compatible) |
| Deployment | Render (backend), Vercel (frontend) |

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Hugging Face](https://huggingface.co) API key
- A [Pixabay](https://pixabay.com/service/about/api/) API key
- A Cloudflare R2 bucket (or set `USE_CLOUD_STORAGE=false` to store icons locally)

### Backend

```bash
cd ai-recipes-app/backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in `backend/`:

```env
ENV=development
DATABASE_URL=sqlite:///site.db
JWT_SECRET_KEY=your_secret_key_here

# AI recipe generation
AI_API_KEY=your_huggingface_api_key
AI_API_URL=https://router.huggingface.co/novita/v3/openai/chat/completions

# Icon generation
PIXABAY_API_KEY=your_pixabay_api_key

# Cloud storage — set to false to store icons locally during development
USE_CLOUD_STORAGE=false
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_REGION=auto
R2_BUCKET_NAME=ai-recipes-icons
R2_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com
CDN_URL=https://pub-<hash>.r2.dev
```

Run the server:

```bash
python app.py
# Runs on http://127.0.0.1:5000
```

### Frontend

```bash
cd ai-recipes-app/frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
REACT_APP_API_URL=http://127.0.0.1:5000
```

Start the dev server:

```bash
npm start
# Runs on http://localhost:3000
```

---

## Environment Variables

### Backend

| Variable | Description |
|----------|-------------|
| `ENV` | Set to `production` in prod — skips loading `.env` file |
| `DATABASE_URL` | PostgreSQL URL in production; `sqlite:///site.db` in development |
| `JWT_SECRET_KEY` | Secret for signing JWT tokens — use a long random string in production |
| `AI_API_KEY` | Hugging Face API token for recipe generation |
| `AI_API_URL` | Hugging Face inference endpoint URL |
| `PIXABAY_API_KEY` | API key for fetching food images used in icon generation |
| `USE_CLOUD_STORAGE` | `true` to store icons in R2, `false` to store locally |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key ID |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret access key |
| `R2_REGION` | R2 region (typically `auto`) |
| `R2_BUCKET_NAME` | Name of your R2 bucket |
| `R2_ENDPOINT_URL` | R2 S3-compatible endpoint URL |
| `CDN_URL` | Public R2 bucket URL for serving icons |

### Frontend

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | Backend base URL (e.g. `http://127.0.0.1:5000` locally) |

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/` | Register |
| POST | `/api/auth/login/` | Login |
| POST | `/api/auth/logout/` | Logout |
| GET / PUT / DELETE | `/api/users/<id>/` | Get, update, or delete account |
| GET / POST | `/api/users/<id>/ingredients/` | List or add ingredients |
| PUT / DELETE | `/api/users/<id>/ingredients/<id>/` | Update or delete ingredient |
| GET | `/api/users/<id>/ingredients/search/` | Search ingredients (`?q=&category=`) |
| GET / POST | `/api/users/<id>/allergies/` | List or add allergies |
| PUT / DELETE | `/api/users/<id>/allergies/<id>/` | Update or delete allergy |
| POST | `/api/users/<id>/recipe-suggestions/` | Get AI recipe suggestions |
| GET / POST | `/api/users/<id>/saved-recipes/` | List or save recipes |
| PUT / DELETE | `/api/users/<id>/saved-recipes/<id>` | Rename or delete saved recipe |
| GET | `/health` | Health check |

---

## Icon Generation

When a custom ingredient or allergy is added, the app generates an icon in the background:

1. Pixabay is searched for a food image matching the name and category
2. YOLOv8n detects and crops the most relevant food object in the image
3. The crop is resized to 256×256px
4. The icon is uploaded to Cloudflare R2 (or saved locally if `USE_CLOUD_STORAGE=false`)
5. The frontend polls every second until the icon is ready, then displays it — falling back to a placeholder after 10 failed attempts

---

## Deployment

### Backend (Render)

1. Connect your GitHub repo → **New Web Service** on Render
2. Set root directory to `ai-recipes-app/backend`
3. Build command: `pip install -r requirements.txt`
4. Start command is auto-detected from `Procfile`
5. Add all environment variables in the Render dashboard
6. Create a **Render PostgreSQL** database and set `DATABASE_URL`

### Frontend (Vercel)

1. Connect your GitHub repo to Vercel
2. Set root directory to `ai-recipes-app/frontend`
3. Set `REACT_APP_API_URL` to your Render backend URL

> **Note:** Icons are proxied through the backend rather than served directly from the CDN, so the browser does not need direct access to `r2.dev`.
