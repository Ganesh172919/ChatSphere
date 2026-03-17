# ChatSphere Features

ChatSphere is designed to provide a rich, real-time messaging experience augmenting human conversation with deep AI reasoning.

## 1. Deep Reasoning AI
Powered by Google's Gemini 1.5 Flash, the internal AI is capable of understanding complex queries, providing structured multi-angle analyses, and persisting context across conversational turns. It is optimized for both speed and reasoning depth.

## 2. Solo Chat (Private AI Conversations)
Users can engage in one-on-one sessions with the Gemini AI. 
-   **Markdown Rendering**: Rich text formatting, tables, lists, and inline styles are fully supported.
-   **Code Highlighting**: Beautiful syntax highlighting for code snippets across multiple languages.
-   **Persistent History**: Solo chats are saved as distinct conversations, allowing users to revisit and continue past discussions at any time.

## 3. Group Rooms (Multiplayer Chat)
Real-time, persistent chat rooms where multiple users can collaborate.
-   **Room Management**: Users can create new rooms or join existing ones.
-   **AI Summoning**: By utilizing the `@ai` tag within a message, users can loop the Gemini AI into the group conversation. The AI will read the context of the room and provide a relevant, public response.
-   **Persistent Context**: The AI remembers the history of the room, allowing for continuous collaborative problem-solving.

## 4. Real-time Capabilities
Seamless, instant communication built on Socket.IO.
-   **Live Messaging**: Messages appear instantly across all connected clients without page reloads.
-   **Emoji Reactions**: Users can react to messages in real-time with emojis (e.g., 👍, 🔥, 🤯, 💡), creating a more dynamic and expressive chat environment.
-   **Threaded Replies**: Organize conversations with inline replies to specific messages.
-   **Live Presence**: Visual indicators showing when other users are online or typing.

## 5. Security & Authentication
A production-ready security posture.
-   **Google OAuth**: Frictionless sign-up and login via Google accounts.
-   **JWT Rotation**: Secure Access + Refresh token architecture, minimizing the risk of token theft while maintaining a smooth user experience.
-   **Password Hashing**: Bcrypt is utilized for secure on-way encryption of user passwords.

## 6. Premium UI / UX
A meticulously crafted interface focusing on aesthetics and usability.
-   **Dark Mode**: A sleek, modern dark theme designed to reduce eye strain.
-   **Grain Texture & Glow Effects**: Subtle visual enhancements providing a premium, native-app feel.
-   **Framer Motion Animations**: Smooth, fluid transitions and micro-interactions that make the application feel responsive and alive.
