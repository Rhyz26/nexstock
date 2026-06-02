<div align="center">

<img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/PostgreSQL-Neon-00E5B4?style=for-the-badge&logo=postgresql&logoColor=white" />
<img src="https://img.shields.io/badge/Deployed-Vercel-black?style=for-the-badge&logo=vercel&logoColor=white" />
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />

<br /><br />

# 🏪 Nexstock

### All-in-one business management for Ugandan small businesses

Nexstock helps shop owners, market vendors, and small business operators in Uganda track their inventory, issue invoices, record mobile money payments, and understand their business — all from a phone or computer browser, with no app download required.

**Built by a Ugandan developer, for Ugandan businesses.**

[Live Demo](#) · [Report a Bug](../../issues) · [Request a Feature](../../issues)

<br />

![Nexstock Dashboard Preview](https://placehold.co/900x500/1971C2/ffffff?text=Nexstock+Dashboard)

</div>

---

## 📋 Table of Contents

- [The Problem](#-the-problem)
- [The Solution](#-the-solution)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Deployment](#-deployment)
- [Revenue Model](#-revenue-model)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚨 The Problem

Over **1 million small businesses** operate across Uganda. Most of them still manage their stock in notebooks, send invoices over WhatsApp, and have no clear picture of whether they made a profit today.

Existing business software is either:
- Too expensive for small businesses
- Built for Western markets (no UGX, no mobile money support)
- Too complex for a shop owner with no accounting background

---

## 💡 The Solution

Nexstock is a **Progressive Web App (PWA)** — it works in any browser and installs on a phone like a native app, no Play Store or App Store needed. It is designed specifically for the Ugandan market:

- Prices in **Uganda Shillings (UGX)**
- Accepts **MTN Mobile Money** and **Airtel Money** payments
- Sends invoices via **WhatsApp or SMS**
- Works on **slow or intermittent internet**
- Affordable subscription starting at **UGX 30,000/month**

---

## ✨ Features

### 📦 Inventory Management
- Add, edit, and delete products with SKU, category, buying price, and selling price
- Real-time stock tracking — every sale automatically reduces stock
- Low stock alerts with configurable thresholds per product
- Full stock movement history with timestamps
- Barcode/QR scan support via phone camera
- Bulk CSV import for adding hundreds of products at once

### 🧾 Invoicing & POS
- Create professional branded invoices in seconds
- Quick POS mode for walk-in customers
- Generate and share PDF invoices and receipts
- Send invoices via WhatsApp link or SMS
- Track overdue invoices automatically
- Credit sales tracking per customer

### 💸 Payments & Mobile Money
- Record cash, MTN Mobile Money, Airtel Money, and bank transfer payments
- Auto-reconcile payments against open invoices
- Daily cash drawer summary across all payment methods
- Profit & loss calculated automatically

### 👥 Customer Management
- Full customer database with purchase history
- Track credit balances per customer
- Search by name or phone number

### 📊 Reports & Analytics
- Daily, weekly, and monthly revenue charts
- Top selling products by quantity and revenue
- Expense breakdown by category
- Export any report to PDF or Excel
- Automated weekly email summary

### 👨‍💼 Staff Management
- Invite staff by email with assigned roles
- Role-based access: Owner → Manager → Cashier
- Each role sees only what they need

### ⚙️ Business Settings
- Business profile, logo, and contact details
- Configurable tax rates
- Subscription plan management

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| UI Library | [Mantine UI v7](https://mantine.dev) |
| Styling | [Tailwind CSS v3](https://tailwindcss.com) |
| Charts | [Recharts](https://recharts.org) |
| Database | [PostgreSQL](https://postgresql.org) via [Neon](https://neon.tech) |
| ORM | [Prisma](https://prisma.io) |
| Authentication | [NextAuth.js](https://next-auth.js.org) |
| Icons | [Tabler Icons](https://tabler-icons.io) |
| Deployment | [Vercel](https://vercel.com) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher — [nodejs.org](https://nodejs.org)
- Git — [git-scm.com](https://git-scm.com)
- A free [Neon](https://neon.tech) account for the database

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/YOUR_USERNAME/nexstock.git
cd nexstock
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env.local
```
Fill in your values — see [Environment Variables](#-environment-variables) below.

**4. Push the database schema**
```bash
npm run db:push
```

**5. Seed demo data (optional)**
```bash
npm run db:seed
```

**6. Start the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Demo credentials**
```
Email:    demo@nexstock.co.ug
Password: password123
```

---

## 🔐 Environment Variables

Create a `.env.local` file at the root of the project:

```env
# PostgreSQL — get your free database at neon.tech
DATABASE_URL="postgresql://user:password@host/nexstock?sslmode=require"

# Generate with: openssl rand -base64 32
NEXTAUTH_SECRET="your-generated-secret"

# Your app URL
NEXTAUTH_URL="http://localhost:3000"

# Optional — SMS via AfricasTalking (africastalking.com)
AT_API_KEY=""
AT_USERNAME=""

# Optional — Payments via Flutterwave (flutterwave.com)
FLW_PUBLIC_KEY=""
FLW_SECRET_KEY=""
```

> ⚠️ Never commit `.env.local` to version control. It is already in `.gitignore`.

---

## 📁 Project Structure

```
nexstock/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── login/page.js           # Login page
│   │   │   └── register/page.js        # Registration page
│   │   ├── dashboard/page.js           # Main dashboard + charts
│   │   ├── inventory/page.js           # Product management
│   │   ├── invoices/page.js            # Invoicing + POS
│   │   ├── customers/page.js           # Customer CRM
│   │   ├── expenses/page.js            # Expense tracking
│   │   ├── reports/page.js             # Analytics + reports
│   │   ├── staff/page.js               # Staff management
│   │   ├── settings/page.js            # Business settings
│   │   └── api/                        # REST API routes
│   │       ├── auth/[...nextauth]/     # NextAuth handler
│   │       ├── auth/register/          # User registration
│   │       ├── products/               # Inventory CRUD
│   │       ├── customers/              # Customer CRUD
│   │       ├── invoices/               # Invoice CRUD
│   │       ├── payments/               # Payment recording
│   │       ├── expenses/               # Expense CRUD
│   │       ├── reports/                # Report queries
│   │       ├── dashboard/              # Dashboard stats
│   │       ├── staff/                  # Staff management
│   │       └── settings/               # Business settings
│   ├── components/
│   │   └── layout/
│   │       ├── DashboardShell.js       # App shell with sidebar
│   │       └── SessionWrapper.js       # NextAuth session provider
│   └── lib/
│       ├── prisma.js                   # Prisma client singleton
│       ├── auth.js                     # NextAuth configuration
│       └── apiHelper.js                # Auth + response utilities
├── prisma/
│   ├── schema.prisma                   # Database schema
│   └── seed.js                         # Demo data seeder
├── public/
│   └── manifest.json                   # PWA manifest
├── .env.example                        # Environment variable template
└── README.md
```

---

## 🌍 Deployment

Nexstock is designed to be deployed free of charge using:

| Service | Purpose | Free Tier |
|---|---|---|
| [Vercel](https://vercel.com) | Hosts the Next.js app | Unlimited deploys |
| [Neon](https://neon.tech) | PostgreSQL database | 3GB storage |
| [GitHub](https://github.com) | Code repository | Unlimited private repos |

**Total monthly cost at launch: UGX 0**

### Deploy to Vercel

**1. Push your code to GitHub**
```bash
git add .
git commit -m "feat: initial nexstock"
git remote add origin https://github.com/YOUR_USERNAME/nexstock.git
git push -u origin main
```

**2. Import on Vercel**
- Go to [vercel.com](https://vercel.com) and sign up with GitHub
- Click **Add New Project** → import your `nexstock` repo
- Vercel auto-detects Next.js — click **Deploy**

**3. Add environment variables**

In Vercel: Project → Settings → Environment Variables, add:
```
DATABASE_URL      → your Neon connection string
NEXTAUTH_SECRET   → your generated secret
NEXTAUTH_URL      → https://your-project.vercel.app
```

**4. Redeploy** — Deployments tab → 3-dot menu → Redeploy

Your app is live at `https://your-project.vercel.app` 🎉

### Custom Domain (.co.ug)

Register `nexstock.co.ug` at [registry.co.ug](https://www.registry.co.ug) (~UGX 50,000/year) then add it in Vercel under Project → Settings → Domains.

---

## 💰 Revenue Model

Nexstock is a SaaS product with three revenue streams:

### Subscription Plans

| Plan | Price | Includes |
|---|---|---|
| Starter | UGX 30,000/mo | 1 staff, 200 products, invoicing, basic reports |
| Growth | UGX 60,000/mo | 5 staff, unlimited products, MoMo reconciliation, full reports |
| Pro | UGX 100,000/mo | Unlimited staff, multi-branch, API access, priority support |

### SMS Credits
Each plan includes a monthly SMS bundle. Additional messages are charged at UGX 50/SMS (buying from AfricasTalking at ~UGX 25/SMS = UGX 25 margin per message).

### Setup & Training Fees
One-time onboarding fee of UGX 50,000–150,000 for hands-on business setup and staff training.

### Revenue Projections

| Businesses | Monthly Revenue |
|---|---|
| 50 | ~UGX 3,000,000 |
| 200 | ~UGX 12,000,000 |
| 500 | ~UGX 30,000,000 |

---

## 🗺 Roadmap

- [x] Inventory management
- [x] Invoicing and POS
- [x] Customer management
- [x] Expense tracking
- [x] Reports and analytics
- [x] Staff roles and permissions
- [x] PWA (installs on phone)
- [ ] MTN Mobile Money API integration
- [ ] Airtel Money API integration
- [ ] SMS invoices via AfricasTalking
- [ ] Subscription billing via Flutterwave
- [ ] Barcode scanner (camera)
- [ ] Offline mode with sync
- [ ] Multi-branch support
- [ ] Clinic management module
- [ ] Android app (React Native)

---

## 🤝 Contributing

Contributions are welcome. To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow the existing code style and keep components in JavaScript (not TypeScript).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Built with 🇺🇬 in Uganda.

If Nexstock helps your business, consider starring the repo ⭐ — it helps other developers find it.

---

<div align="center">
  <sub>Built with Next.js · Deployed on Vercel · Database on Neon</sub>
</div>
