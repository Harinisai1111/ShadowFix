# SHADOWFIX v2.0 — Secure Deepfake Detection 🛡️

SHADOWFIX is an enterprise-grade, forensic-first deepfake detection service. It combines State-of-the-Art Vision Transformers with a **Zero-Retention Privacy Architecture**.

> **Privacy Statement**: SHADOWFIX follows a strict zero-retention policy. All media is processed in-memory and permanently discarded after analysis. No user data is ever stored on disk.

---

## 🔐 Security Features

- **JWT Authentication**: OAuth2-compliant login system with Role-Based Access Control (RBAC).
- **Zero-Retention Architecture**: Media processed via `io.BytesIO`. Temporary video files are unlinked immediately using a guaranteed cleanup pattern.
- **Strict Validation**: Whitelist-only MIME checks (JPG, PNG, MP4) and hard size limits (5MB Image / 25MB Video).
- **API Key Support**: Dedicated `X-API-KEY` header for secure machine-to-machine integrations.
- **Rate Limiting**: IP-based throttling (10 requests/min) to prevent DDoS and API abuse.
- **Secure Headers**: Hardened with CSP, X-Frame-Options, and X-Content-Type-Options.
- **No Stack Traces**: Internal errors are masked to prevent information leackage.

---

## 🚀 Setup & Running

**1. Install Dependencies**
```bash
pip install -r requirements.txt
```

**2. Configure Secrets (Optional)**
Set your environment variables:
- `SECRET_KEY`: Secure hash for JWT.
- `X_API_KEY`: Key for platform integrations.

**3. Run the Server**
```bash
python -m uvicorn app.main:app --reload
```

---

## 🛠️ How to Authenticate

### 1. User Login
Send a form-data request to `/login`:
- **Username**: `user@shadowfix.ai`
- **Password**: `shadow_password_123`

Response:
```json
{
  "access_token": "eyJhbG...",
  "token_type": "bearer"
}
```

### 2. Run Analysis
Include the token in your headers:
`Authorization: Bearer <your_token>`

---

## 📈 System Metrics (Admin Only)
Access `/admin/metrics` using the admin account:
- **Username**: `admin@shadowfix.ai`
- **Password**: `admin_secure_99`

---

## 📋 API Reference

| Endpoint | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/login` | POST | None | Grant JWT access token |
| `/analyze-image` | POST | JWT / API-KEY | Forensic image analysis (Max 5MB) |
| `/analyze-video` | POST | JWT | Forensic video analysis (Max 25MB) |
| `/health` | GET | None | System status |

---

*Powered by Hugging Face Transformers & Pydantic Security.*
