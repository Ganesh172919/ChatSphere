# ChatSphere Architecture

## Overall Architecture

ChatSphere is a modern full-stack web application designed for high-performance real-time messaging and deep AI reasoning. It follows a client-server model with a persistent data layer and real-time bidirectional event-based communication.

1.  **Client Layer (Frontend)**: React 18 single-page application built with Vite and TypeScript. It manages global state via Zustand, handles routing, and provides a highly interactive and aesthetic user interface using TailwindCSS and Framer Motion.
2.  **Server Layer (Backend)**: Express.js REST API coupled with a Socket.IO WebSocket server. It handles authentication, business logic, API routing, and AI integration with Google Gemini.
3.  **Data Layer (Database)**: MongoDB Atlas cluster, interacted with via Mongoose ODM. It provides document-oriented persistent storage for users, rooms, messages, and AI chat histories.
4.  **AI Layer**: Google Gemini 1.5 Flash API for advanced reasoning, content generation, and conversational capabilities within solo and group contexts.

## Frontend Architecture

The frontend is structured into several core directories to enforce separation of concerns:

-   `src/components/`: Reusable UI components (buttons, modals, message bubbles, etc.).
-   `src/pages/`: Top-level route components (Landing, Login, Register, SoloChat, GroupChat, etc.).
-   `src/store/`: Zustand stores for managing global state slices (`authStore`, `chatStore`, `roomStore`).
-   `src/hooks/`: Custom React hooks encapsulating complex logic, particularly around real-time connections (`useSocket`) and chat interactions (`useChat`).
-   `src/api/`: Axios instances and API service modules for interacting with the backend REST endpoints.
-   `src/context/`: React context providers, such as the Theme context for dark mode toggling.

## Backend Architecture

The backend utilizes an MVC-like structure tailored for real-time and API-driven applications:

-   `config/`: Configuration files for database connections (`db.js`) and third-party integrations (`passport.js` for Google OAuth).
-   `models/`: Mongoose schemas defining the structure of MongoDB collections (`User`, `Room`, `Message`, `Conversation`, `RefreshToken`).
-   `middleware/`: Express middleware functions for request interception, such as JWT authentication (`auth.js`) and Socket.IO connection authorization (`socketAuth.js`).
-   `routes/`: Express router modules grouping endpoint definitions by core resource (`auth`, `chat`, `conversations`, `rooms`).
-   `services/`: Encapsulated business logic and third-party service interactions (`gemini.js` for the AI integration).
-   `index.js`: The application entry point, bootstrapping Express, configuring middleware, setting up Socket.IO, and starting the server.

## Authentication Flow

ChatSphere employs a robust dual-strategy authentication system:

1.  **Email & Password**: Traditional registration and login using bcrypt for password hashing.
2.  **Google OAuth2**: One-click social login using Passport.js.

Both strategies converge into a **JWT (JSON Web Token)** pattern:
-   **Access Token**: Short-lived token attached to every authorized request (via Authorization header) and Socket.IO connection.
-   **Refresh Token**: Long-lived token stored securely (often as an HTTP-only cookie or in secure storage) used to obtain new Access Tokens without requiring re-authentication, auto-expiring based on TTL.
