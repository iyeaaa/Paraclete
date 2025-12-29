This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Socket.IO** for real-time communication
- **WebRTC** for peer-to-peer video/audio streaming
- **ROI Selection** - Region of Interest cropping for screen sharing ([Demo](https://youtu.be/SdQgGRilE1M))
- **tRPC** for type-safe API calls
- **Tailwind CSS** for styling

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

This will start both the Next.js application and the TypeScript-based signaling server.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Signaling Server

The project includes a TypeScript-based signaling server (`signaling_server.ts`) that handles:
- WebRTC signaling for peer-to-peer connections
- Room management for video/audio sessions
- Real-time communication via Socket.IO

The server runs on the same port (3000) as the Next.js application.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
