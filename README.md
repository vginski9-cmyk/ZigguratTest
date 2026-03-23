# Ziggurat

A multi-agent AI pipeline that transforms raw job descriptions into deeply contextualized, actionable skill profiles aligned to education programs.

The name reflects the architecture: each layer builds on the one below it, producing progressively richer and more structured output.

## What It Does

1. **You paste a job description** into the submission form
2. **Agent 1 (Ziggurat Classifier)** analyzes it across 27 context layers — company type, role level, cognitive load, regulatory environment, work mode, and more — producing an Enriched Job Context Profile (EJCP)
3. **A human reviewer validates** the EJCP at Gate 1, correcting any misclassifications
4. **Agent 2 (Skill Profiler)** takes the validated EJCP and generates structured skill profiles with proficiency levels, KSA requirements, learning modalities, education program mappings, and partnership viability scores
5. **A human reviewer validates** the skill profiles at Gate 2, approving/rejecting individual skills
6. **The published profile** is available for employers, educators, and workforce developers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| AI | Claude (Anthropic API) — claude-haiku-4-5 |
| Styling | Tailwind CSS 4 |
| Fonts | DM Sans / DM Serif Display |

## Quick Start

```bash
cd ziggurat
npm install

# Create .env.local with your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" > .env.local

# Push the database schema
npm run db:push

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
ZigguratTest/
├── docs/
│   ├── PRODUCT_REQUIREMENTS.md   # Original PRD and vision
│   ├── DEVELOPER_GUIDE.md        # Architecture, data flow, extending the system
│   └── SETUP.md                  # Environment setup and deployment
├── ziggurat/                     # Next.js application
│   ├── src/
│   │   ├── app/                  # Pages and API routes
│   │   │   ├── api/              # Backend API endpoints
│   │   │   ├── submit/           # JD submission page
│   │   │   ├── review/           # Gate 1 & Gate 2 review pages
│   │   │   └── profiles/         # Published profile pages
│   │   ├── components/           # Reusable UI components
│   │   ├── lib/
│   │   │   ├── agents/           # Agent prompts and invocation logic
│   │   │   ├── db/               # Database schema and initialization
│   │   │   └── ziggurat/         # Enums, types, and domain logic
│   │   └── styles/               # Global CSS and Tailwind config
│   ├── ziggurat.db               # SQLite database (auto-created)
│   ├── drizzle.config.ts         # Drizzle ORM configuration
│   └── package.json
└── README.md
```

## Documentation

- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** — Architecture, data flow, agent system, component reference, and how to extend the pipeline
- **[Setup Guide](docs/SETUP.md)** — Environment setup, database management, deployment, and troubleshooting
- **[Product Requirements](docs/PRODUCT_REQUIREMENTS.md)** — Original vision, system architecture, and schema definitions

## The Pipeline

```
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │   AGENT 1    │     │   AGENT 2    │     │   AGENT 3    │
 │   Context    │────▶│   Skill      │────▶│   Education  │
 │   Enricher   │     │   Profiler   │     │   Mapper     │
 └──────┬───────┘     └──────┬───────┘     └──────────────┘
        │                    │                (not yet built)
   ┌────▼────┐          ┌────▼────┐
   │ GATE 1  │          │ GATE 2  │
   │ Review  │          │ Review  │
   └─────────┘          └─────────┘
```

**Agent 1** and **Agent 2** are fully implemented with human review gates. **Agent 3** (Education Mapper) is defined in the PRD but not yet built — this is a clear next step for contributors.

## Key Concepts

- **27 Ziggurat Context Layers** — A comprehensive framework for classifying job context across 4 categories: Company & Economic Role, Role & Work Architecture, Compensation & Job Quality, and Measurement & Training
- **EJCP (Enriched Job Context Profile)** — The structured output of Agent 1; a complete contextualization of a job description
- **BGI Taxonomy** — Skills are categorized as Core Role-Specific, Baseline Applied, Foundational & Leadership, or Specialization
- **Provenance Tracking** — Every classification carries confidence scores and evidence (extracted from JD text, inferred from context, or unknown)
- **Version History** — Every EJCP and skill profile maintains version history through the review process

## License

Private — all rights reserved.
