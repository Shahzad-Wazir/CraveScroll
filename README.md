# CraveScroll — Short-Video Food Discovery & Ordering Platform (MERN)

**CraveScroll** (*Discover Food. Watch It. Crave It. Order It.*) is a full-stack MERN food discovery and delivery platform that blends restaurant menu ordering with vertical short-video food reels. Customers can explore kitchens, watch short dish reels, add items straight to their cart, and track live doorstep deliveries, while Restaurants and Delivery Partners manage preparation and fulfillment through dedicated role-based workflows.

**Live Application:** [https://crave-scroll-topaz.vercel.app/](https://crave-scroll-topaz.vercel.app/)  
*(Note: The backend is hosted on Render's free tier, so the first request after inactivity may take ~30–50 seconds to wake up.)*

---

## Key Features

### 1. Dual Discovery Experience
- **Explore & Restaurant Storefronts:** Browse restaurants, search dishes with debounced live filtering (category, diet type, availability), view store menus, and manage a single-restaurant cart with switch confirmation.
- **Vertical Food Reels Feed:** Full-screen vertical video feed with floating **Order Now** dish cards, likes, saves, comments drawer, kitchen follows, keyboard navigation (`ArrowUp`/`ArrowDown`/`M`), and windowed `<video>` mounting for smooth scrolling.

### 2. Three-Role Order & Delivery Lifecycle
- **Customer (`user`):** Browse, cart, checkout, live order tracking with status stepper and history, saved reels, and profile management.
- **Food Partner (`foodpartner`):** Upload food reels (ImageKit cloud media with magic-byte validation), manage dish catalog & open/closed availability, and progress incoming orders (`Order Placed` → `Preparing`).
- **Delivery Partner (`deliverypartner`):** Dedicated delivery queue to claim ready orders, update transit status (`Out for Delivery` → `Delivered`), and record timestamped delivery milestones.

### 3. Production-Grade Engineering & Security
- **Idempotent Social APIs & Counter Integrity:** Explicit `PUT`/`DELETE` endpoints for likes, saves, and follows backed by unique compound indexes, MongoDB transactions (with standalone fallback), and a counter reconciliation utility (`npm run reconcile`).
- **Safe Media Lifecycle:** Real file-header signature verification (MP4/MOV/WebM/JPG/PNG/WebP), DB-first deletion with `OrphanedMedia` tracking (`npm run cleanup:media`), and rollback-safe avatar updates.
- **Security Hardening:** Role-based JWT authentication with `jti` token revocation on logout (`RevokedToken` TTL index), `httpOnly`/`secure`/`sameSite` cookies, double-submit CSRF + Origin validation, Zod schema validation, Helmet security headers, and rate limiting.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19 (Vite), React Router, Axios, Custom Dark-Mode Design System |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose |
| **Validation & Security** | JWT + `jti` Revocation, bcryptjs, Zod, Helmet, CORS Allowlist, Double-Submit CSRF, Express Rate Limit |
| **Media & Testing** | ImageKit Cloud Storage, Multer, Jest + Supertest |

---

## Project Structure

```text
CraveScroll/
├── backend/
│   ├── public/demo-videos/  # Bundled vertical HD sample food reels
│   ├── src/
│   │   ├── controllers/     # Auth, food, food-partner, and order controllers
│   │   ├── db/              # MongoDB connection & optional demo seeder
│   │   ├── middlewares/     # JWT auth, CSRF, error handling, and upload validation
│   │   ├── models/          # Mongoose schemas (User, FoodPartner, DeliveryPartner, Food, Order, etc.)
│   │   ├── routes/          # Express REST API routes
│   │   ├── services/        # ImageKit cloud storage integration
│   │   └── utils/           # Validators, cookies, transactions, file-signature & maintenance scripts
│   ├── tests/               # Jest + Supertest API test suite
│   ├── .env.example         # Backend environment variable template
│   └── server.js            # Express server entry point
├── frontend/
│   ├── public/              # Brand SVG assets
│   ├── src/
│   │   ├── api/             # Axios client with cookie & CSRF handling
│   │   ├── components/      # ReelFeed, BottomNav, CommentsDrawer, ProtectedRoute
│   │   ├── context/         # Auth, Cart, and Toast contexts
│   │   ├── pages/           # Auth portals, Explore, Reels, Cart, Orders, Partner Dashboard
│   │   ├── routes/          # Role-guarded application routes
│   │   └── styles/          # Centralized Midnight Craving theme stylesheet
│   ├── .env.example         # Frontend environment variable template
│   └── vercel.json          # SPA rewrite rules for Vercel deployment
└── render.yaml              # Render Web Service deployment blueprint
```

---

## Local Development Setup

### Prerequisites
- Node.js (v18+ recommended)
- MongoDB Atlas cluster or local MongoDB instance
- ImageKit account *(required only for uploading new videos/avatars)*

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```
Update `backend/.env` with your `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and ImageKit credentials, then run:
```bash
npm run dev
```
*(Runs on `http://localhost:3000` by default; health check available at `GET /health`.)*

Optional utilities:
```bash
npm run seed           # Seeds sample kitchens, 56 dishes/reels & orders (requires SEED_DEMO_PASSWORD in local .env)
npm test               # Runs Jest + Supertest API test suite
npm run reconcile      # Verifies and recalculates social counters
npm run cleanup:media  # Retries cleanup of any orphaned ImageKit files
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
```
Verify `VITE_API_URL=http://localhost:3000/api` in `frontend/.env`, then start the dev server:
```bash
npm run dev
```
*(Runs on `http://localhost:5173` by default.)*

---

## Deployment Architecture

- **Backend (Render Web Service):** Root directory `backend`, build command `npm install`, start command `npm start`, health check path `/health`. Set `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`, `CLIENT_URL`, `BACKEND_URL`, and ImageKit credentials in Render Environment Variables.
- **Frontend (Vercel):** Root directory `frontend`, build command `npm run build`, output directory `dist`. Set `VITE_API_URL` to `https://<your-render-service>.onrender.com/api`.
- **Database (MongoDB Atlas):** Use a dedicated database name (e.g., `/cravescroll`) and ensure Atlas Network Access permits connections from your hosting provider.

---

## Security Practices

- All secrets, database URIs, and ImageKit keys are managed strictly via environment variables (`.env` is gitignored).
- Passwords are hashed with `bcryptjs` and never exposed in API responses or logs.
- Authenticated sessions use signed JWTs with token revocation, strict CORS allowlisting, and CSRF protection on mutating requests.
