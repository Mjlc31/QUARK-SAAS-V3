# Architecture

The system is composed of a monolithic frontend and two Node.js microservices.

## Frontend (React SPA)
A Vite-based React application that handles CRM, Proposals, Engineering workflows, Financial data, and WhatsApp conversations. It communicates directly with Supabase via `@supabase/supabase-js` for most CRUD operations.

## WhatsApp Backend (`/whatsapp-backend`)
A Node.js/Express service that connects to the Evolution Go API to handle WhatsApp messaging. 
- Serves as a bridge between the frontend (via Socket.io) and Evolution Go.
- Uses `spinAgent.js` to provide automated AI replies.
- Synchronizes with Supabase for bot status and message history.
- Handles Google Calendar task notifications.

## Secondary Backend (`/backend`)
A secondary Node.js/Express service (Worker) set up for OpenAI integration and Evolution webhook processing. Currently seems to be a WIP or an alternative implementation to the primary whatsapp-backend.
