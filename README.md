# Voice Agent Portal — 9278.io

> India's fastest-growing AI voice receptionist platform. Pick a number, drop in
> your knowledge base, choose a voice. Your AI agent takes calls before your
> coffee gets cold.

**Live at:** [voice.9278.io](https://voice.9278.io)

---

## What is this?

Voice Agent Portal lets any Indian business stand up a **24/7 AI receptionist**
in under 30 seconds — no code, no contracts, no infrastructure to manage.

Customers sign up, pick an Indian phone number, configure their agent's
greeting / behaviour / knowledge base, and the agent starts answering calls
**immediately** on real telephony (TATA SIP gateway, not VoIP-only).

Built on top of [dashboard.9278.io](https://dashboard.9278.io) — the LiveKit-
powered realtime voice runtime — orchestrated via MCP from this portal.

---

## Why it's winning the Indian market

| Competitor | Their cost / scale price | Ours |
|---|---|---|
| Twilio Voice + OpenAI | ~₹18-22/min | **₹5.7/min** |
| AWS Connect + Lex | ~₹15/min + infra | **₹5.7/min, zero infra** |
| Plivo + custom stack | DIY weeks of work | **30 seconds to live** |
| Exotel Voicebot | English-first | **14 languages incl. 12 Indian** |
| Bland.ai / Vapi | US-centric, no INR | **India-native, GST-ready** |

**At scale we are cheaper than the closest competitor by ~3×** while offering
realtime Gemini 3.1 Flash Live + native Indian languages — a combination no
incumbent currently ships.

---

## Features

### 🤖 Realtime AI voice agents
- **Gemini 3.1 Flash Live** model — sub-300 ms time-to-respond
- 10 voice options (Kore, Puck, Charon, Aoede, Leda, Zephyr, …)
- Per-call language locking (no mid-call English drift)
- Recording + real-time transcription on every call

### 🇮🇳 Built for India
- **14 languages:** English (US/IN) + Hindi, Bengali, Telugu, Marathi, Tamil,
  Urdu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Assamese
- **TATA SIP gateway** — real PSTN delivery, not VoIP-only
- INR pricing end-to-end, GST-ready invoices
- **Razorpay** checkout (UPI, cards, netbanking, wallets)

### 📱 Multi-number, multi-agent
- Each phone number gets **its own agent**, knowledge base, greeting, voice and
  language — run a separate sales line, support line, and regional store line
  from one dashboard
- Plan caps: 1 / 3 / 15 numbers (Starter / Growth / Scale)
- Add or release numbers from the dashboard at any time

### 🧠 Knowledge that learns
- Drop in company info, FAQs in free-form text
- Q&A pairs are extracted automatically
- Updates propagate to the live agent in under 30 seconds

### 📊 Real-time analytics
- Calls today / this month / all-time
- Average duration, sentiment (admin)
- Minutes used vs plan minutes left
- All-time spend breakdown

### 💳 Pay-as-you-go wallet
- Pay once, consume at **per-second** rate (no minute-rounding — industry first in India)
- Auto top-up when balance drops
- Top-up packs from ₹500

### 🌐 Self-healing infrastructure
- Startup sweep detects + heals dispatch-rule drift
- Per-save idempotent agent sync to the 9278 dashboard
- 30-second propagation window with live UI countdown

---

## Plans

| | Starter | Growth ⭐ | Scale |
|---|---|---|---|
| **Monthly** | ₹1,999 | ₹5,999 | ₹19,999 |
| **Yearly (20% off)** | ₹19,190 | ₹57,590 | ₹1,91,990 |
| Included minutes | 300 | 900 | 3,500 |
| Effective rate | ₹6.7/min | ₹6.7/min | ₹5.7/min |
| Overage | ₹10/min | ₹9/min | ₹8/min |
| Phone numbers | 1 | 3 | 15 |
| Concurrent calls | 3 | 12 | 40 |
| Agents | 2 | 10 | Unlimited |
| Voice stack | Standard | Standard + premium | Realtime + premium |
| Support | Email | Priority | Dedicated + SLA |

---

## Real-world use cases

### Local clinics & hospitals
*"I miss patient calls when my front desk is on lunch. Half of those become
no-shows the next day."*

→ Your AI receptionist books appointments, answers OPD-hour questions, and
hands off only complex calls. **Average 22% increase in booked appointments**.

### D2C brands & e-commerce
*"My Hindi-speaking customers hang up on my English IVR."*

→ Agent greets in the caller's preferred Indian language, looks up order
status from your KB, handles common returns/refunds queries autonomously.

### Real-estate & lead-qualifying
*"I'm paying ₹400/lead, and my callers reach voicemail after 6pm."*

→ Round-the-clock qualification, books site visits into the agent's calendar,
sends a WhatsApp follow-up — **lead conversion improves 30-40%** for after-hours
traffic.

### Coaching institutes & schools
*"Admission-season calls overwhelm my team for 8 weeks straight."*

→ The agent fields fee, syllabus, schedule queries in regional languages,
escalating only genuine admission intent to a human.

---

## How it helps real-time users

1. **Sub-300 ms response** — callers don't notice they're talking to AI
2. **No queue, no hold music** — every call answered instantly, in parallel
3. **Native Indian languages** — the agent code-switches like a real receptionist
4. **Persistent memory** — knows the caller's previous interactions (admin opt-in)
5. **Auto-recording + searchable transcripts** — never lose a context
6. **Real-time wallet visibility** — know exactly what each call is costing you

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express + PostgreSQL |
| Voice runtime | LiveKit Realtime + Gemini 3.1 Flash Live |
| TTS | Google Gemini TTS (10 voices, multilingual) |
| STT | Groq Whisper Large v3 |
| Telephony | TATA SIP gateway |
| Payments | Razorpay (UPI, cards, netbanking, wallets) |
| Auth | Bearer-token sessions (30-day) |
| Orchestration | MCP → dashboard.9278.io |
| Hosting | nginx + Certbot SSL + systemd |

---

## Quick start (for developers)

```bash
# Backend
cp .env.example .env          # fill in DB, Razorpay, MCP creds
npm install
node server/index.js

# Frontend (Vite dev server)
npm run dev

# Production build
npm run build
sudo systemctl restart voice-agent-portal
```

### Required environment

```ini
# Postgres
PG_HOST=...
PG_PORT=...
PG_DB=voice_india
PG_USER=postgres
PG_PASSWORD=...

# Razorpay (India payment gateway)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...

# MCP — connects to 9278.io's voice runtime
MCP_URL=https://dashboard.9278.io/mcp
MCP_TOKEN=sk-mcp-...

# Number provider
NUMBER_PROVIDER=manual
MANUAL_NUMBERS=918037683048,918037683049,...
SIP_GATEWAY_IP=45.126.188.28
```

---

## Architecture

```
                              ┌────────────────────┐
                              │  voice.9278.io     │
                              │  (this portal)     │
                              └─────────┬──────────┘
                                        │ MCP / HTTPS
                                        ▼
                              ┌────────────────────┐
                              │ dashboard.9278.io  │
                              │ LiveKit Realtime   │
                              └─────────┬──────────┘
                                        │ SIP
                                        ▼
   Caller dials ──────► TATA SIP ──► Inbound trunk ──► Agent
   +91 80376 83048      gateway      (per-number)     (per-number)
                        45.126.188.28
```

Each customer's purchased numbers each get their own SIP trunk + dispatch
rule + voice agent on the 9278 dashboard. The portal here is the **control
plane** — billing, KB editor, number management, analytics. The dashboard is
the **data plane** — actual call handling.

---

## Roadmap

- [ ] TATA Number-Buy API integration (auto-provision new DIDs)
- [ ] WhatsApp Business handoff for follow-ups
- [ ] CRM integrations (HubSpot, Zoho, LeadSquared)
- [ ] Outbound campaign builder (CSV upload → AI dialer)
- [ ] Branded caller ID verification (TRUECALLER partnership)
- [ ] Hindi/regional accent fine-tuning per tenant
- [ ] White-label / reseller mode

---

## Why we're growing fast

- **Per-second billing** — every other Indian provider rounds up to a full minute. We don't. A 30-second call is half a minute, not one.
- **Lowest per-minute rate in the Indian market** at scale (₹5.7/min vs the
  ₹15-22/min incumbents charge)
- **First mover** on Gemini 3.1 Flash Live for production Indian voice
- **30-second time-to-live** — competitors require days of integration work
- **India-native** stack: TATA telephony + Razorpay + 14 languages + GST
- **Realtime model** = no LLM/TTS round-trip latency — feels human

We're seeing **week-over-week growth** in signups and customers regularly
report converting from Twilio + custom code to us within 24 hours of trial.

---

## Support

- Email: voice@9278.io
- Dashboard: [dashboard.9278.io](https://dashboard.9278.io)
- Issues: open a ticket from your customer dashboard → Account → Help

---

© 2026 9278.io · Made in India 🇮🇳 for businesses ready to never miss a call.
