# Package Dependencies & Configuration

> Complete dependency list and configuration for the Sales AI Dashboard

## Package.json

```json
{
  "name": "sales-ai-dashboard",
  "version": "1.0.0",
  "description": "Enterprise Sales AI Dashboard with Voltagent Integration",
  "main": "index.js",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "e2e": "playwright test",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "analyze": "cross-env ANALYZE=true next build",
    "clean": "rimraf .next out dist",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@emotion/react": "^11.11.1",
    "@emotion/styled": "^11.11.0",
    "@hookform/resolvers": "^3.3.2",
    "@mui/icons-material": "^5.14.19",
    "@mui/material": "^5.14.20",
    "@mui/system": "^5.14.20",
    "@mui/x-data-grid": "^6.18.1",
    "@mui/x-date-pickers": "^6.18.1",
    "@prisma/client": "^5.6.0",
    "@tanstack/react-query": "^5.8.4",
    "@vercel/analytics": "^1.1.1",
    "date-fns": "^2.30.0",
    "framer-motion": "^10.16.5",
    "next": "^14.0.3",
    "next-auth": "^4.24.5",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.48.2",
    "react-hot-toast": "^2.4.1",
    "recharts": "^2.8.0",
    "swr": "^2.2.4",
    "uuid": "^9.0.1",
    "ws": "^8.14.2",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^14.0.3",
    "@playwright/test": "^1.40.1",
    "@storybook/addon-essentials": "^7.5.3",
    "@storybook/addon-interactions": "^7.5.3",
    "@storybook/addon-links": "^7.5.3",
    "@storybook/blocks": "^7.5.3",
    "@storybook/nextjs": "^7.5.3",
    "@storybook/react": "^7.5.3",
    "@storybook/testing-library": "^0.2.2",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "@types/jest": "^29.5.8",
    "@types/node": "^20.9.4",
    "@types/react": "^18.2.38",
    "@types/react-dom": "^18.2.17",
    "@types/uuid": "^9.0.7",
    "@types/ws": "^8.5.10",
    "@typescript-eslint/eslint-plugin": "^6.12.0",
    "@typescript-eslint/parser": "^6.12.0",
    "autoprefixer": "^10.4.16",
    "cross-env": "^7.0.3",
    "eslint": "^8.54.0",
    "eslint-config-next": "^14.0.3",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.1",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0",
    "postcss": "^8.4.31",
    "prettier": "^3.1.0",
    "prisma": "^5.6.0",
    "rimraf": "^5.0.5",
    "storybook": "^7.5.3",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.3.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/your-org/sales-ai-dashboard.git"
  },
  "keywords": [
    "sales",
    "ai",
    "dashboard",
    "crm",
    "voltagent",
    "react",
    "nextjs",
    "typescript"
  ],
  "author": "Your Organization",
  "license": "MIT",
  "homepage": "https://your-sales-ai-dashboard.com"
}
```

## TypeScript Configuration

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "ES6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/pages/*": ["./src/pages/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/store/*": ["./src/store/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### Type Declarations

```typescript
// src/types/global.d.ts
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
  
  namespace NodeJS {
    interface ProcessEnv {
      NEXTAUTH_SECRET: string;
      NEXTAUTH_URL: string;
      DATABASE_URL: string;
      ANTHROPIC_API_KEY: string;
      VOLTAGENT_API_URL: string;
      REDIS_URL: string;
      SENDGRID_API_KEY: string;
    }
  }
}

export {};
```

## Next.js Configuration

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Image optimization
  images: {
    domains: [
      'media.licdn.com',
      'avatars.githubusercontent.com',
      'lh3.googleusercontent.com'
    ],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Add custom webpack rules
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    
    return config;
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  
  // Experimental features
  experimental: {
    appDir: false,
    serverComponentsExternalPackages: ['prisma'],
  },
};

module.exports = withBundleAnalyzer(nextConfig);
```

## Testing Configuration

### jest.config.js

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### jest.setup.js

```javascript
import '@testing-library/jest-dom';

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));
```

## Linting Configuration

### .eslintrc.json

```json
{
  "extends": [
    "next/core-web-vitals",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "react-hooks/exhaustive-deps": "warn",
    "prefer-const": "error",
    "no-var": "error"
  },
  "ignorePatterns": [
    "node_modules/",
    ".next/",
    "out/",
    "public/"
  ]
}
```

### .prettierrc

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid"
}
```

## Environment Configuration

### .env.example

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/sales_ai_db"
REDIS_URL="redis://localhost:6379"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
ANTHROPIC_API_KEY="your-anthropic-api-key"
VOLTAGENT_API_URL="http://localhost:8000"

# Email Services
SENDGRID_API_KEY="your-sendgrid-api-key"

# Analytics
VERCEL_ANALYTICS_ID="your-analytics-id"

# Feature Flags
ENABLE_VOICE_CAPTURE=true
ENABLE_BUSINESS_CARD_SCAN=true
ENABLE_LINKEDIN_EXTENSION=true

# Development
NODE_ENV=development
LOG_LEVEL=debug
```

## Database Configuration

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  leads     Lead[]
  sequences EmailSequence[]
  
  @@map("users")
}

model Lead {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  email           String?
  phone           String?
  company         String?
  position        String?
  score           Int      @default(0)
  status          String   @default("new")
  source          String
  notes           String?
  linkedinUrl     String?
  profileImageUrl String?
  location        Json?
  aiInsights      Json?
  extractedData   Json?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  userId String
  user   User   @relation(fields: [userId], references: [id])
  
  @@map("leads")
}

model EmailSequence {
  id            String   @id @default(cuid())
  name          String
  description   String?
  status        String   @default("draft")
  steps         Json
  enrolledCount Int      @default(0)
  responseRate  Float    @default(0)
  tags          String[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  userId String
  user   User   @relation(fields: [userId], references: [id])
  
  @@map("email_sequences")
}
```

## Deployment Configuration

### Dockerfile

```dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/sales_ai_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      POSTGRES_DB: sales_ai_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## Development Scripts

### scripts/setup.sh

```bash
#!/bin/bash

echo "Setting up Sales AI Dashboard..."

# Install dependencies
npm install

# Set up environment
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "Created .env.local - please update with your values"
fi

# Set up database
npx prisma generate
npx prisma db push

# Run initial setup
npm run build

echo "Setup complete! Run 'npm run dev' to start development."
```

This comprehensive configuration provides everything needed to run the Sales AI Dashboard in development and production environments with proper tooling, testing, and deployment setup.