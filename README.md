# Herbo India - Fullstack Ayurvedic Sexual Wellness & Clinical Platform

A luxury, responsive, dynamic multilingual web platform created for **Herbo India**. Specially crafted for men suffering from sexual wellness problems such as premature ejaculation, erectile dysfunction / lack of hardness, penile weakness from masturbation, small size & girth, and nervous fatigue.

---

## 🏗️ Architecture: Clean Frontend & Backend Separation

The repository is organized into distinct **Frontend Client** and **Backend Server** services:

```
Herbo India/
├── frontend/                     # Frontend Client Web Application (Port 5173)
│   ├── index.html               # Main Customer Landing Page
│   ├── admin.html               # Clinical Doctor & Admin Portal
│   ├── css/
│   │   └── style.css            # Responsive, Mobile-Optimized Styles
│   ├── js/
│   │   ├── app.js               # Customer UI Controller & Form Submissions
│   │   ├── admin.js             # Doctor Admin Dashboard & Role-Based Auth
│   │   └── translations.js      # English & Hindi Clinical Translations
│   ├── assets/                  # Product photography, clinical certificates & logos
│   ├── server.js                # Frontend dev server (Port 5173) with API reverse-proxy
│   └── package.json             # Frontend package definition
│
├── backend/                      # Backend API & Database Engine (Port 3000)
│   ├── server.js                # Node.js HTTP/REST Server & MongoDB Atlas Client
│   ├── package.json             # Backend dependencies (mongodb, express, nodemailer, cors, dotenv)
│   ├── package-lock.json        # Dependency lockfile
│   ├── .env.example             # Configuration template
│   └── data/                    # Zero-downtime offline storage fallback (gitignored)
│
├── package.json                  # Root orchestration & convenience scripts
├── start_dev.js                  # Concurrent runner for both frontend & backend
└── README.md                     # Documentation
```

---

## 🚀 How to Run

### Option 1: Run Frontend and Backend Separately (Recommended by Request)

#### 1. Run Backend Server:
```bash
cd backend
npm install   # If running for the first time
npm start
```
- **Backend API**: Runs on `http://localhost:3000`
- **Connected Database**: MongoDB Atlas cluster with automatic local fallback

#### 2. Run Frontend Client:
```bash
cd frontend
npm start
```
- **Customer Portal**: Opens at `http://localhost:5173/`
- **Doctor & Admin Portal**: Opens at `http://localhost:5173/admin.html`
- Automatically routes API calls to `http://localhost:3000` via intelligent dynamic API configuration and reverse-proxy.

---

### Option 2: Run Both Simultaneously from Root

```bash
npm run dev
# or
npm start
```

You can also run individual services from the root folder:
```bash
npm run frontend   # Starts only the frontend client (Port 5173)
npm run backend    # Starts only the backend server (Port 3000)
```

---

## 🔒 Security & Medical Portal Features

1. **MongoDB Database Persistence**:
   - Stores all customer consultations and Cash-on-Delivery (COD) orders directly in MongoDB Atlas.
   - Collections: `enquiries`, `admin_users`, `admin_otps`, `admin_sessions`.

2. **Enterprise-Grade Admin Authentication**:
   - Salted PBKDF2 password hashing with SHA-512 and 100,000 iterations.
   - Cryptographically random 32-byte session tokens.
   - Role-Based Access Control (RBAC):
     - **Master Admin (`herboindia03@gmail.com`)**: Full access, can register new sub-admin doctors, revoke credentials, and request OTPs.
     - **Sub-Admin Doctors**: Restricted access to clinical patient enquiries only.

3. **Production Privacy & Discreet Support**:
   - 100% discreet courier packaging guarantees.
   - Direct encrypted WhatsApp integration (`+91 9920086376`).
   - HIPAA & Indian Medical Teleconsultation aligned anonymous patient consultation forms.

---

## 🌐 Cloud Deployment (Render + Frontend)

### 1. Deploy Backend to Render:
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`
- **Environment Variables on Render**:
  - `PORT`: `3000` (or leave default, Render sets this automatically)
  - `NODE_ENV`: `production`
  - `MONGODB_URI`: `mongodb+srv://...`
  - `DB_NAME`: `herboindia`
  - `CLIENT_URL`: `https://your-frontend-domain.vercel.app,http://localhost:5173` *(Allowed frontend domains for CORS)*
  - `ADMIN_EMAIL`: `herboindia03@gmail.com`
  - `ADMIN_USERNAME`: `admin`
  - `ADMIN_DEFAULT_PASSWORD`: `HerboIndia@2026!`

### 2. Connect Frontend to Render Backend:
You can connect the frontend to your live Render backend in either of two easy ways:

- **Method A (No build step needed)**: Open `frontend/config.js` and set:
  ```javascript
  window.VITE_API_URL = "https://your-backend-app.onrender.com";
  ```
- **Method B (For Vite / Vercel / Netlify environment variables)**:
  Set `VITE_API_URL` in `frontend/.env` or in your hosting provider's dashboard:
  ```ini
  VITE_API_URL=https://your-backend-app.onrender.com
  ```

---

## 📋 Environment Configuration (`backend/.env`)

Copy `backend/.env.example` to `backend/.env`:
```ini
PORT=3000
NODE_ENV=production
CLIENT_URL=http://localhost:5173,https://your-frontend-domain.vercel.app
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/herboindia?retryWrites=true&w=majority
DB_NAME=herboindia
ADMIN_EMAIL=herboindia03@gmail.com
ADMIN_USERNAME=admin
ADMIN_DEFAULT_PASSWORD=HerboIndia@2026!
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=herboindia03@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM="Herbo India Medical Portal <herboindia03@gmail.com>"
```
