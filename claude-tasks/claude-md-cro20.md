# CRO-20: Next.js Project Setup & Authentication

## Issue URL
https://linear.app/crod/issue/CRO-20/phase-12-nextjs-project-setup-authentication

## Agents Required
- `nextjs-developer` (Primary)
- `react-developer` (Supporting)
- `typescript-developer` (Supporting)

## Dependencies
- **CRO-18**: Supabase Project Setup & Database Schema (MUST BE COMPLETE)

## Objective
Create the basic Next.js project structure with Supabase integration and authentication setup for the Tribe MVP.

## Context
Building a private family sharing platform. The Supabase backend is already set up (CRO-18). Now we need a modern Next.js 15 frontend with authentication, protected routes, and basic dashboard structure.

## Technology Stack
- Next.js 15 with App Router
- React 19
- TypeScript
- Tailwind CSS for styling
- Supabase for authentication and data
- Zod for validation

## Tasks

### 1. Project Initialization
- [ ] Initialize Next.js 15 project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Set up proper project structure with App Router
- [ ] Install and configure all required dependencies
- [ ] Set up linting and formatting (ESLint, Prettier)

### 2. Supabase Integration
- [ ] Install Supabase client libraries
- [ ] Create Supabase client configuration (client + server)
- [ ] Set up environment variables
- [ ] Create authentication utilities
- [ ] Test connection to Supabase project

### 3. Authentication System
- [ ] Create authentication pages (login, signup)
- [ ] Implement protected route middleware
- [ ] Set up authentication context/state management
- [ ] Create logout functionality
- [ ] Handle authentication errors and loading states

### 4. Basic App Structure
- [ ] Create protected dashboard route
- [ ] Set up navigation components
- [ ] Create basic layout components
- [ ] Implement responsive design foundations
- [ ] Add loading and error states

### 5. User Profile Integration
- [ ] Connect to profiles table from CRO-18
- [ ] Display user information in dashboard
- [ ] Test profile creation on user signup
- [ ] Verify RLS policies work with frontend

## Required Dependencies
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "next": "15.0.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "zod": "^3.22.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-config-next": "15.0.0",
    "prettier": "^3.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0"
  }
}
```

## File Structure to Create
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx (landing page)
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── AuthButton.tsx
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── auth.ts
│   ├── utils.ts
│   └── types.ts
├── middleware.ts (for protected routes)
└── hooks/
    ├── useAuth.tsx
    └── useUser.tsx
```

## Key Components to Implement

### 1. Supabase Client Setup
```typescript
// src/lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () => createClientComponentClient()
```

```typescript
// src/lib/supabase/server.ts  
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () => createServerComponentClient({ cookies })
```

### 2. Authentication Context
```typescript
// src/hooks/useAuth.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

// Implementation with Supabase auth state management
```

### 3. Protected Routes Middleware
```typescript
// src/middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Check authentication and redirect logic
  // Protect /dashboard routes
  // Redirect authenticated users away from auth pages
}
```

### 4. Login/Signup Forms
- Email/password authentication
- Form validation with Zod
- Error handling and loading states
- Redirect after successful auth
- Password reset functionality

### 5. Dashboard Layout
- Navigation bar with user info
- Logout functionality  
- Placeholder for future features
- Responsive design
- Loading states

## Authentication Flow
```
1. User visits /dashboard (protected)
   ↓
2. Middleware checks auth status
   ↓
3. If not authenticated → redirect to /login
   ↓
4. User logs in → creates session
   ↓
5. Redirect to /dashboard
   ↓
6. Dashboard loads user profile from Supabase
```

## Environment Variables
```bash
# These should already exist from CRO-18
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Add for Next.js
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Success Criteria
- [ ] ✅ Next.js project created and running locally on port 3000
- [ ] ✅ Supabase authentication working (signup/login/logout)
- [ ] ✅ Protected routes redirect unauthenticated users to login
- [ ] ✅ User profile created automatically on signup (via CRO-18 trigger)
- [ ] ✅ Basic dashboard accessible after login
- [ ] ✅ Responsive design works on mobile and desktop
- [ ] ✅ No TypeScript errors or ESLint warnings
- [ ] ✅ Clean, professional UI with Tailwind CSS

## Testing Instructions
1. Run `npm run dev` and visit http://localhost:3000
2. Try accessing /dashboard while logged out (should redirect)
3. Sign up with new email address
4. Verify profile creation in Supabase dashboard
5. Test login/logout flow
6. Verify protected route middleware works
7. Test responsive design on mobile

## Integration with CRO-18
- Uses profiles table for user data
- Leverages authentication system
- Connects to RLS policies
- Prepares for child/recipient management (future issues)

## Next Steps After Completion
- Ready for CRO-21 (Child Management System)
- Authentication foundation ready for all future features
- Dashboard prepared for core functionality

## Common Issues to Watch For
- CORS issues with Supabase (check site URL config)
- Middleware not catching protected routes
- Environment variables not loading properly
- TypeScript errors with Supabase types
- Tailwind CSS not applying styles

## Development Commands
```bash
# Start development server
npm run dev

# Build for production (test)
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```