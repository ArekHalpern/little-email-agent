# Setup Instructions

## Prerequisites

- Node.js and npm/pnpm installed
- A Supabase account
- PostgreSQL database (provided by Supabase)
- Google Cloud Platform account

## Installation

1. Install dependencies:

pnpm install

2. Prisma setup:

npx prisma generate
npx prisma db push

3. Google Cloud Console Setup:

a. Create a new project:

- Go to [Google Cloud Console](https://console.cloud.google.com)
- Click "New Project" and follow the prompts
- Note your Project ID

b. Enable Gmail API:

- In your project, go to "APIs & Services" > "Library"
- Search for "Gmail API"
- Click "Enable"

c. Configure OAuth Consent Screen:

- Go to "APIs & Services" > "OAuth consent screen"
- Choose "External" user type
- Fill in required fields:
  - App name
  - User support email
  - Developer contact email
- Add scopes:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `email`
  - `profile`
- Add test user (your gmail) if in testing mode

d. Create OAuth 2.0 Credentials:

- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "OAuth client ID"
- Choose "Web application"
- Set name for your OAuth 2.0 client
- Add Authorized JavaScript origins:
  ```
  http://localhost:3000
  https://your-production-domain.com
  ```
- Add Authorized redirect URIs:
  ```
  http://localhost:3000/api/auth/callback
  https://your-production-domain.com/api/auth/callback
  ```
- Save your Client ID and Client Secret

4. Supabase setup:

- Create a Supabase project
- Add these env variables:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_project_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
  DATABASE_URL=your_db_url
  ```

5. Environment Variables:

- Copy .env.example to .env
- Fill in the required values:
  ```
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
  GOOGLE_CLIENT_SECRET=your_google_client_secret
  ```

6. Start the development server:

pnpm dev

## Troubleshooting

- If you get OAuth consent screen errors:

  - Ensure all required scopes are added
  - Add your email as a test user if in testing mode
  - Wait a few minutes after making changes

- If authentication fails:
  - Verify redirect URIs match exactly
  - Check if environment variables are set correctly
  - Ensure you're using the correct OAuth 2.0 client credentials

## Production Deployment

1. Update environment variables with production URLs
2. Add production domain to Google Cloud Console:
   - Update authorized JavaScript origins
   - Update authorized redirect URIs
3. Update OAuth consent screen if moving to production mode

## Additional Resources

- [Google Cloud Console Documentation](https://cloud.google.com/docs)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)

command to see the file structure:
tree -I 'node_modules|.next|.git|.vercel|.env\*' -a
