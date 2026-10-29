# Silent SOS - separate frontend and backend

## Folder structure
- `frontend/`: HTML, CSS, JavaScript website files
- `backend/`: Express API and MongoDB models

## 1. Set up backend
1. Install Node.js.
2. Open a terminal in the `backend` folder.
3. Run `npm install`.
4. Copy `.env.example` to a new file named `.env`.
5. Put your actual MongoDB connection string in `MONGODB_URI`. Do not share the `.env` file publicly.
6. Run `npm run dev` (or `npm start`).
7. Check `http://localhost:5000/api/health`. It should show `success: true`.

## 2. Open frontend
1. Open the `frontend` folder in VS Code.
2. Use Live Server to open `index.html`.
3. Contacts and dashboard pages use the same backend API at `http://localhost:5000/api`.
4. Add a contact on `contacts.html`, then view it on `dashboard.html`.
5. Press SOS to create a demo alert, then view it on the dashboard and test Mark Resolved.

## Important
- This code stores demo SOS alerts. It does not send real SMS or WhatsApp messages.
- Browser geolocation needs user permission and usually works on localhost or HTTPS.
- On a physical Android phone, `localhost` means the phone itself. Use your computer's local Wi-Fi IP address for local testing, or a deployed HTTPS backend URL.
- Existing MongoDB collections may have data from your old schema; back up data before changing model/schema code.
