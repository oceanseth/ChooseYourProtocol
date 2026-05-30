# ChooseYourProtocol

**Level up your people, your systems, and your culture — one micro-activity at a time.**

> The modern smoke break. An agent watches how your team works, learns what everyone is trying to grow into, and pulls two people away from their desks for 90 seconds of movement, novel connection, and a guided conversation — then turns that moment into a reward and a knowledge asset.

[chooseyourprotocol.com](https://chooseyourprotocol.com)

---

## The Problem

Modern organizations leak two things constantly: **context** and **connection**.

- The knowledge that lives in people's heads never makes it into a usable knowledge base.
- People sit at their desks all day, rarely move, and rarely meet anyone outside their immediate team.
- "Personal growth," "team health," and "company growth" are treated as separate initiatives that nobody has time for.

The old smoke break solved part of this by accident: it got people up, mixed teams, and sparked conversation. ChooseYourProtocol rebuilds that ritual on purpose — measurable, goal-aligned, and rewarding.

---

## How it works

1. **The agent captures context.** A desktop agent — built on the **OpenAI Agents SDK** — runs on your machines, observing how you work and posting privacy-respecting work-context signals to the platform. A *Knowledge Agent* synthesizes those signals into knowledge-base entries for each person, and a *Coordinator Agent* reasons over who's free right now to time level-up opportunities.
2. **You set personal goals.** Pick what you want to grow in three categories — **fitness**, **social**, and **business**. Fitness breaks down further (flexibility, strength, endurance), so a "flexibility" goal can spawn a toe-touch stretch.
3. **A level-up opportunity fires.** Using realtime user data and company goals set by administrators, the agent decides the right moment in the day to send a **"level-up opportunity"** alert — an invitation to step away and grow.
4. **You get matched for a micro-activity.** The system pairs you in realtime with someone in your org who shares the goal (same org, same objective) for a short physical + social activity with a guided conversation topic.
5. **You earn a reward.** Complete the activity and the active **incentive protocol** pays out. The first protocol is **PokeVibe** (below).
6. **The knowledge base grows.** The conversation you just had becomes a source feeding the knowledge bases you both contributed to — so the company gets smarter every time its people do.

---

## What it does

- 🧭 **Personal goals in three lanes** — fitness, social, and business, with fitness sub-goals (flexibility, strength, endurance) that generate concrete activities.
- ⚡ **Agent-timed level-up alerts** — the "modern smoke break," fired throughout the day based on realtime signals, not a fixed schedule.
- 🤝 **Realtime 2-person matchmaking** — pairs people in the same org pursuing the same goal for a guided micro-activity.
- 🏢 **Company goals for admins** — administrators set organization-level objectives; the agent works to maximize growth, measures progress, and generates reports.
- 🧱 **Multi-tenant by design** — every organization has its own users and data, isolated from the rest.
- 🎁 **Pluggable incentive protocols** — the reward layer is selectable; PokeVibe is the first.

---

## PokeVibe (the first incentive protocol)

PokeVibe is the flagship incentive system — the reward layer is pluggable, and this is the one we ship first.

When you accept a level-up opportunity, you and your match complete an agent-suggested activity together: for example, **both people hold a plank while discussing an agent-selected topic.** When you finish, the protocol reads the **vibe of your conversation** and you earn a rare Pokémon based on it — an **AI-generated 3D "child" you just gave birth to** together.

Each one goes into your **collection** (displayable, brag-worthy, rare) and — here's the twist — it isn't just a trophy. The creature becomes a **source feeding the knowledge bases** you contributed to with that conversation. The better the vibe and the richer the exchange, the more the company learns.

> Collect creatures. Grow people. Feed the knowledge base. Same loop.

---

## Multi-tenancy & onboarding

ChooseYourProtocol is multi-tenant: **each organization has its own users.** On your first login with an email address, the platform checks for an organization tied to that email's domain:

- **No org exists for your domain?** It's created on the spot, and you become its **admin**.
- **Org already exists?** You join it as a member under the existing tenant.

Admins then set company goals and watch the agent drive — and measure — growth.

---

## Architecture & Stack

A pragmatic, fully-provisioned cloud stack built for a hackathon timeline but wired like production.

| Layer | Technology |
| --- | --- |
| **Frontend** | Vite + React single-page app, hosted on **AWS S3 + CloudFront**, domain via **Route53 / ACM**, all provisioned with Terraform |
| **Auth** | **Firebase Authentication** (email + Google) |
| **Database** | **Cloud Firestore**, multi-tenant (Firebase project id: `chooseyourprotocol`) |
| **API** | **AWS Lambda + API Gateway v2**, using the **Firebase Admin SDK** (service-account credentials pulled from **AWS SSM Parameter Store**) |
| **Matchmaking** | Realtime 2-person matching via **Firestore** |
| **Desktop agent** | **Node + OpenAI Agents SDK** (with an optional Electron tray shell): a Knowledge Agent that fills each person's knowledge base and a Coordinator Agent that schedules level-ups when teammates are free; degrades to plain signal-posting without an `OPENAI_API_KEY` |
| **Infrastructure** | **Terraform** infra-as-code |
| **CI/CD** | **GitHub Actions** |

**Flow at a glance:** desktop agent → API (Lambda) → Firestore → realtime match → activity → incentive protocol → knowledge base.

---

## Repository layout

```
.
├── src/          # Vite + React SPA (the web app)
├── api/          # AWS Lambda handlers (API Gateway v2, Firebase Admin SDK)
├── agent/        # Desktop agent (OpenAI Agents SDK + Electron shell)
├── terraform/    # Infrastructure-as-code (S3, CloudFront, Route53/ACM, Lambda, API GW)
├── scripts/      # Helper and ops scripts
└── .github/      # GitHub Actions CI/CD workflows
```

---

## Local development

Requirements: Node.js (LTS), npm, and Firebase credentials for the `chooseyourprotocol` project.

```bash
# 1. Install dependencies
npm install

# 2. Run the Vite frontend and the API together
npm run dev
```

`npm run dev` brings up the Vite dev server (React SPA) alongside the API so you can develop the full loop locally. Configure your Firebase web config and any required environment variables before starting.

To run the desktop agent locally:

```bash
cd agent
npm install
npm start
```

---

## Deployment

Infrastructure is managed with Terraform, and application deploys ship through GitHub Actions.

```bash
# Provision / update cloud infrastructure
cd terraform
terraform init
terraform apply
```

Once infrastructure exists, **pushing to the repository triggers GitHub Actions** to build the frontend and deploy it to S3 + CloudFront and update the Lambda-backed API. Firebase Admin credentials are read at runtime from **AWS SSM Parameter Store**, so no secrets live in the repo.

---

## License

See repository for license details.

---

<p align="center"><strong>ChooseYourProtocol</strong> — choose your goal, choose your protocol, level up together.</p>
