# PARIVESH 3.0 Demo Checklist

Use this script to demonstrate end-to-end workflow completion.

## Pre-Demo Setup

1. Ensure Firestore rules are deployed.
2. Ensure at least one admin account exists.
3. Keep sample PDF files ready for mandatory document upload.
4. Open two browser sessions:
   - Session A: Project Proponent
   - Session B: Internal users (Scrutiny/MoM/Admin)

## Demo Flow Script

1. Admin Portal Login
- Open `/admin-login`.
- Login as admin.
- Show Admin dashboard and role scope hint.

2. Admin Configuration
- In Admin Dashboard:
  - Create or update category template (A/B1/B2).
  - Add sector parameter notes.
  - Show user role assignment controls.

3. Proponent Registration and Draft
- Open `/` in Session A.
- Register a new proponent account.
- Open Apply module.
- Fill partial form and click Save Draft.
- Re-open draft from "My Pending Actions".

4. Proponent Final Submission
- Complete all fields.
- Upload all three mandatory PDF documents.
- Verify payment using UPI/QR simulation.
- Submit application.
- Capture Application ID.

5. Scrutiny Verification and EDS
- Login as scrutiny user in Session B.
- Open Scrutiny dashboard.
- Open submitted application.
- Fill checklist, then issue EDS with remarks.

6. Proponent EDS Response
- Back in Session A, open Apply module.
- Select EDS action-required case.
- Update details/documents if needed.
- Add EDS response notes.
- Resubmit to scrutiny.

7. Scrutiny Referral
- In Session B, review PP response notes.
- Accept resubmission / move under scrutiny.
- Ensure checklist is complete.
- Refer application to meeting.

8. MoM Generation and Finalization
- Login as MoM user.
- Open MoM dashboard.
- Generate gist from admin template.
- Edit gist and save MoM.
- Download DOCX and PDF.
- Finalize MoM.

9. Tracking and Visibility
- In Session A, open Track module and verify status timeline progression.
- Confirm proponent cannot access other users' records.

## Security Proof Points to Mention

1. Permanent admin enforcement for designated email.
2. Proponent self-registration is restricted to proponent role.
3. Row-level data isolation by ownerId.
4. Scrutiny checklist and MoM fields are isolated by Firestore rules.
5. Status transitions are rule-validated at backend.

## Quick Troubleshooting

1. If writes fail, recheck deployed Firestore rules.
2. If uploads fail, verify Firebase Storage access configuration.
3. If role page is blocked, verify user role in `users` collection.
