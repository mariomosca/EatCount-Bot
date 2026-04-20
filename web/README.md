# DietLogger Web GUI - Sprint 3 Phase 1 (Scaffold)

Next.js 15 web interface for nutrition plan compliance tracking.

## Quick Start

### Setup

```bash
cd web
npm install
cp .env.local.example .env.local
# Edit .env.local with your API details
```

### Development

```bash
npm run dev
# Opens at http://localhost:3001
```

### Build

```bash
npm run build
npm start
```

### Type Check

```bash
npm run type-check
```

## Project Structure

```
web/
├── app/
│   ├── api/auth/[...nextauth]/   # NextAuth route handlers (skeleton)
│   ├── dashboard/                 # Dashboard - today's compliance
│   ├── login/                     # Login form (placeholder)
│   ├── layout.tsx                 # Root layout + dark mode
│   ├── page.tsx                   # Home - redirect to /dashboard or /login
│   └── globals.css                # Tailwind + shadcn base styles
├── components/
│   └── ui/                        # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       └── label.tsx
├── lib/
│   ├── api.ts                     # API wrapper (plans, compliance)
│   ├── auth.ts                    # NextAuth config (skeleton)
│   └── utils.ts                   # cn() helper
├── public/                        # Static assets (future)
├── tailwind.config.ts             # Tailwind config + design tokens
├── postcss.config.js
├── next.config.js
├── tsconfig.json
├── components.json                # shadcn CLI config
└── .env.local.example             # Env template
```

## Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
# DietLogger API endpoint
NEXT_PUBLIC_DIET_API_URL=http://localhost:3000

# Server-side API auth
DIET_API_KEY=your-api-key

# NextAuth configuration
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3001
```

## Design System

### Colors (Compliance Semantic)

- `compliance-full`: `hsl(142 76% 36%)` - Green for 100% plan adherence
- `compliance-partial`: `hsl(38 92% 50%)` - Amber for minor deviations
- `compliance-off`: `hsl(220 9% 46%)` - Gray for off-plan days

### Typography

- **Sans**: Inter (system font, responsive)
- **Mono**: JetBrains Mono (numbers, kcal values)
- **Font sizes**: Tailwind scale (text-sm through text-4xl)

### Dark Mode

Default dark mode (`class="dark"` on html). Light mode available via Tailwind config.

### Components (shadcn/ui)

- `Button` - variants: `default`, `outline`, `compliance`, `compliancePartial`, `complianceOff`
- `Card` - container with title/description/content/footer
- `Input` - text fields
- `Label` - form labels

### Responsive

Mobile-first breakpoints:
- `sm`: 640px
- `md`: 768px (dashboard compliance buttons use 3-col on md+)
- `lg`: 1024px
- `xl`: 1280px

### Accessibility

- WCAG AA contrast (dark mode compliant)
- Touch targets: minimum 44px (44-48px buttons on mobile)
- Semantic HTML + aria-labels on form elements
- Keyboard navigation: Tab through buttons, Enter to submit

## API Integration

### Plans

```typescript
// lib/api.ts
import { plans } from '@/lib/api';

// Get today's plan
const response = await plans.getToday();
// Returns: { planName, dayName, dayOfWeek, meals: [...] }

// Get specific day
const day = await plans.getDay(1); // 1=Monday

// Get specific meal type
const meal = await plans.getMeal('BREAKFAST');

// Upload PDF
const file = new File([...], 'plan.pdf');
await plans.uploadPDF(file);

// Create plan
await plans.create({ name, days: [...] });
```

### Compliance (Sprint 1)

```typescript
import { compliance } from '@/lib/api';

// Log today's compliance
await compliance.log({ status: 'FULL', deviations?: '', note?: '' });

// Get range
await compliance.getRange('2026-04-01', '2026-04-30');

// Get today
const today = await compliance.getToday();

// Get streak
const streak = await compliance.getStreak();
```

## Features (Current: Scaffold)

- [x] Auth skeleton (NextAuth + CredentialsProvider)
- [x] Login page with form
- [x] Dashboard placeholder with compliance buttons
- [x] Tailwind + dark mode default
- [x] shadcn/ui components setup
- [x] API wrapper for DietLogger REST
- [x] TypeScript strict mode
- [x] Mobile-responsive layout

## Sprint 3 Phase 2 TODO

- [ ] **Auth Real** - Implement JWT against DietLogger API
- [ ] **Dashboard Complete** - Fetch real today's plan, show meals
- [ ] **Piano Settimanale** - 7-day view with meal edit/drag
- [ ] **Storico Compliance** - 30-day heatmap with FULL/PARTIAL/OFF colors
- [ ] **Upload Piano** - Drag & drop PDF → AI parsing → review → save
- [ ] **Settings** - Target kcal, Whoop/Apple Health integration
- [ ] **Trends** - Weight graph (manual input), % compliance over time
- [ ] **Components** - Add Dialog, Tabs, Calendar from shadcn
- [ ] **Error Boundaries** - Proper error handling and user feedback
- [ ] **Loading States** - Skeleton loaders for async data
- [ ] **Deploy** - Railway or Vercel configuration
- [ ] **Tests** - Unit tests for API wrapper, E2E for compliance flow

## Quality Gates (Sprint 3.1)

- [x] `npm install` OK (no peer dependency warnings)
- [x] `npm run dev` starts on port 3001
- [x] Login page renders Card with email/password form
- [x] Dark mode default (html class="dark")
- [x] `npm run build` succeeds with no TS errors
- [x] Design tokens respected (zero hardcoded #hex colors)
- [x] Mobile responsive (buttons stack on sm, 3-col on md+)
- [x] Accessibility: 44px touch targets, semantic labels

## Notes

- NextAuth `CredentialsProvider` is skeleton. Real implementation uses DietLogger JWT in Sprint 3.2.
- Compliance logging is placeholder. Real `compliance.log()` implemented in Sprint 1.
- PDF upload parsing implemented in DietLogger backend (Sprint 2). Web UI skeleton only.
- No deployment yet. Local dev with `npm run dev`.

## References

- Next.js 15 Docs: https://nextjs.org/docs
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com
- NextAuth.js: https://authjs.dev
