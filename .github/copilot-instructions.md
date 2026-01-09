# Copilot Instructions for RentFlow

## Project Overview

- **RentFlow** is a multi-role property management platform (landlord, tenant, admin, super admin) built with React, TypeScript, Vite, Tailwind CSS, and Supabase (PostgreSQL, Auth, Storage).
- The codebase is organized by feature and role: see `src/components/`, `src/pages/`, and `src/services/` for domain logic and UI separation.
- Data flows from Supabase (backend) to React Query (frontend caching/fetching) to UI components. Most business logic is in `src/services/` and `src/lib/`.

## Key Patterns & Conventions

- **Role-based UI**: Components and pages are grouped by user role (e.g., `src/pages/landlord/`, `src/components/tenant/`).
- **API Services**: All backend communication is abstracted in `src/services/` (e.g., `propertyService.ts`, `paymentService.ts`). Use these for data access, not direct fetch calls.
- **Supabase Integration**: Use the shared client in `src/lib/supabase.ts`. Auth state is managed in `src/contexts/AuthContext.tsx`.
- **Validation**: Use Zod for client-side validation (`zod`), and TypeScript types from `src/types/` for type safety.
- **Forms**: Use React Hook Form for all forms. See examples in `src/components/` and `src/pages/`.
- **Notifications**: Use the Notification context (`src/contexts/NotificationContext.tsx`) for in-app messages.
- **Styling**: Use Tailwind CSS utility classes. Shared UI components are in `src/components/ui/`.
- **Testing**: Seed users and data with `database/seed.sql`. Test users are listed in the README.

## Developer Workflows

- **Start dev server**: `npm run dev` (Vite, port 8080)
- **Build**: `npm run build` (output in `dist/`)
- **Lint**: `npm run lint`
- **Preview production build**: `npm run preview`
- **Database setup**: Run `database/schema.sql` and `database/seed.sql` in Supabase SQL editor. See `database/SETUP.md` for details.
- **RLS Fixes**: If you hit permission errors, run `database/complete-rls-setup.sql` in Supabase.
- **Diagnostics**: Visit `/diagnostics` route in the app for automated checks.

## Integration Points

- **Payments**: Handled via Paystack, integrated in `src/services/paymentService.ts`.
- **Authentication**: Supabase Auth, managed in `src/contexts/AuthContext.tsx` and `src/lib/auth.ts`.
- **Notifications**: Real-time and scheduled, see `src/hooks/useRealtimeNotifications.ts` and `src/services/notificationService.ts`.
- **Deployment**: Vercel is recommended. See `docs/DEPLOYMENT.md`.

## Project-Specific Advice

- Always use service and context layers for data access and state management—avoid direct API or context mutations in components.
- When adding new features, follow the role-based folder structure and update relevant service, type, and context files.
- For new database tables or policies, update `database/schema.sql` and document in `database/README.md`.
- Reference the README and `/docs` for up-to-date workflows and troubleshooting.

---

For more details, see the main [README.md](../README.md), [database/README.md](../database/README.md), and [docs/SETUP_WALKTHROUGH.md](../docs/SETUP_WALKTHROUGH.md).
