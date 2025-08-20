# Twitter-clone (based on the Udemy course)

Small blogging/following application (Twitter-like) built with Node.js, Express, MongoDB and EJS.

## Features

- Session-based authentication (express-session + connect-mongo)
- Private routes and middleware for authentication
- Create, edit, delete posts
- Follow/unfollow users and view followers/following lists
- Full-text post search
- Gravatar-based avatars

## Quick demo

Local development: run the app and open http://localhost:5000

## Setup and run (development)

1. Install dependencies

```bash
npm install
```

2. Build frontend bundle (webpack)

If you encounter OpenSSL-related errors with Webpack on newer Node versions, run:

```bash
export NODE_OPTIONS=--openssl-legacy-provider
npx webpack
```

3. Add environment variables

Create a `.env` file in the project root with the following (example):

```env
CONNECTIONSTRING="MONGODB_URL"
PORT=5000
```

4. Start the app

```bash
npm start
```

or for development with auto-reload and webpack watch (if configured):

```bash
npm run dev
```

## License

MIT
