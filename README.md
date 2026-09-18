# NigraanOS

AI-powered civic intelligence platform for Pakistan.

NigraanOS enables citizens to report civic problems through voice, photo, video, and text; understand incidents with AI; connect related incidents; assess risk; prioritize issues; recommend actions; track responses; and verify resolution.

## Repository Structure

```
Nigraan-OS/
├── apps/mobile/      # React Native + Expo universal client
├── backend/          # FastAPI + Python API server
├── shared/           # Cross-layer domain types and validation
├── docs/             # Architecture and product documentation
├── .env.example      # Environment variable template
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 22+
- Python 3.13+
- PostgreSQL with PostGIS

### Mobile Client

```bash
cd apps/mobile
npm install
npm start
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Documentation

- [Architecture](ARCHITECTURE.md)
- [Security](SECURITY.md)
- [Product Architecture](PRODUCT_ARCHITECTURE.md)

## License

Proprietary. All rights reserved.
