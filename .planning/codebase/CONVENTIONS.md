# Conventions

- **Component Structure**: Functional React components using hooks.
- **Styling**: TailwindCSS utility classes directly in the components.
- **State Management**: React Context API (`contexts/`) for global state instead of Redux/Zustand. Local state with `useState`/`useReducer`.
- **Data Access**: Direct calls to Supabase client from components or contexts, rather than a centralized API layer.
- **File Naming**: PascalCase for React components (`ComponentName.tsx`), camelCase for utilities/services (`serviceName.ts`).
- **Database**: PostgreSQL on Supabase. SQL migrations are stored as `.sql` files in the `supabase/` directory with descriptive names.
