# Setup Instructions

## Prerequisites

- Node.js and npm installed
- A Supabase account
- PostgreSQL database (provided by Supabase)

## Installation

1. Install dependencies:

npm install

prisma:
npx prisma generate
npx prisma db push

supabase:
- Create a Supabase project
- Add these env variables:
  NEXT_PUBLIC_SUPABASE_URL=your_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  DATABASE_URL=your_db_url

env:
- Copy .env.example to .env
- Fill in the required values

command to see the file structure:
tree -I 'node_modules|.next|.git|.vercel|.env\*' -a
