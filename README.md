# PARIVESH 3.0 - Role-Based Workflow Portal

PARIVESH 3.0 is a Next.js + Firebase prototype for end-to-end environmental clearance workflow management across Admin, Project Proponent, Scrutiny Team, and MoM Team.

## Features Implemented

- Role-based access control (Admin, Proponent, Scrutiny, MoM)
- Permanent admin enforcement for designated email
- Admin-managed gist templates by category (A, B1, B2)
- Admin-managed sector parameters
- Proponent application lifecycle with:
	- Draft save/edit
	- Mandatory technical document upload (PDF)
	- Payment simulation (UPI/QR + verification)
	- EDS response and resubmission
- Scrutiny workflow with:
	- Verification checklist
	- EDS raise/remarks
	- Referral to meeting
- MoM workflow with:
	- Template-driven gist generation
	- MoM drafting, finalization
	- DOCX and PDF generation
- Firestore security rules enforcing role boundaries and data isolation

## Tech Stack

- Next.js (App Router)
- React + TypeScript
- Firebase Auth
- Firestore
- Firebase Storage
- Tailwind CSS
- docx + jsPDF

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables:

- Copy [ .env.example ](.env.example) to `.env.local`
- Fill in Firebase project values

3. Run development server:

```bash
npm run dev
```

4. Build for production check:

```bash
npm run build
```

## Backend Service Setup

A separate Python backend is now available in [backend/app.py](backend/app.py) for server-side APIs.

1. Create and activate virtual environment:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
```

2. Install backend dependencies:

```bash
pip install -r requirements.txt
```

3. Configure backend environment:

- Copy [backend/.env.example](backend/.env.example) to `backend/.env`
- Fill Firebase Admin service account values

4. Start backend server:

```bash
python app.py
```

The backend runs on `http://localhost:5000` by default and exposes:

- `GET /api/health`
- `GET /api/locations`
- `GET /api/sectors`
- `POST /api/uploads` (PDF upload storage under `backend/uploads`)
- `POST /api/process-documents` (analyze uploaded PDFs from backend storage)
- `GET /api/process-documents-history?applicationId=<id>`

Frontend connection uses `NEXT_PUBLIC_BACKEND_URL` in [ .env.local ](.env.local).

## Firestore Rules Deploy

Rules file is [firestore.rules](firestore.rules).

Deploy command:

```bash
firebase deploy --only firestore:rules
```

## Project Structure (Key Areas)

- Apply workflow: [app/apply/page.tsx](app/apply/page.tsx)
- Scrutiny workflow: [app/scrutiny/page.tsx](app/scrutiny/page.tsx)
- MoM workflow: [app/mom/page.tsx](app/mom/page.tsx)
- Admin management: [app/admin/page.tsx](app/admin/page.tsx)
- Firebase config: [lib/firebase.ts](lib/firebase.ts)
- Workflow guards: [lib/workflow.ts](lib/workflow.ts)
- Gist rendering: [lib/gist.ts](lib/gist.ts)
- RBAC constants: [lib/rbac.ts](lib/rbac.ts)
- Security rules: [firestore.rules](firestore.rules)

## Notes

- `.env.local` is git-ignored by default.
- For production, keep Firebase keys in environment variables and avoid hardcoding values in code.
