# Make-up Class System (DPM-USTP-ACAD-003) — Node + Express + MongoDB

## Run locally
1. Install Node.js and MongoDB Community Server (or make a free MongoDB Atlas cluster).
2. In VS Code terminal: `npm install`
3. Copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_SECRET`.
4. `npm start` then open http://localhost:3000

On first start it creates the collections `users` and `requests` and seeds demo logins:
admin/admin123, faculty1, head1, incharge1, dean1 (pass123). Change them in **Manage users**.

## Structure
- `models/User.js`, `models/Request.js` – Mongoose schemas
- `server.js` – REST API, JWT login, workflow rules (who can approve what)
- `public/index.html` – interface

## Deploy (so everyone can use it)
- Database: MongoDB Atlas (free tier). Allow your server's IP in Network Access.
- App: Render / Railway / any VPS. Set env vars `MONGODB_URI`, `JWT_SECRET`, `PORT`. Start command: `npm start`.
- Use HTTPS (Render/Railway provide it).
