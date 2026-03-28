# ChatSphere Features

ChatSphere is designed to provide a rich, real-time messaging experience augmented with deep AI reasoning, comprehensive moderation tools, and analytics.

## 1. Deep Reasoning AI
Powered by Google's Gemini 2.5 Pro, the internal AI is capable of understanding complex queries, providing structured multi-angle analyses, and persisting context across conversational turns. It is optimized for both speed and reasoning depth.

## 2. Solo Chat (Private AI Conversations)
Users can engage in one-on-one sessions with the Gemini AI. 
-   **Markdown Rendering**: Rich text formatting, tables, lists, and inline styles are fully supported.
-   **Code Highlighting**: Beautiful syntax highlighting for code snippets across multiple languages.
-   **Persistent History**: Solo chats are saved as distinct conversations, allowing users to revisit and continue past discussions at any time.

## 3. Group Rooms (Multiplayer Chat)
Real-time, persistent chat rooms where multiple users can collaborate.
-   **Room Management**: Users can create new rooms (with name, description, tags, capacity limits) or join existing ones.
-   **AI Summoning**: By utilizing the `@ai` tag within a message, users can loop the Gemini AI into the group conversation. The AI reads the room context and provides a relevant, public response.
-   **Persistent Context**: The AI remembers the history of the room (last 40 entries), allowing for continuous collaborative problem-solving.
-   **Member Roles**: Rooms support `admin`, `moderator`, and `member` roles with hierarchical permissions for managing members and content.

## 4. Real-time Capabilities
Seamless, instant communication built on Socket.IO.
-   **Live Messaging**: Messages appear instantly across all connected clients without page reloads.
-   **Emoji Reactions**: Users can react to messages in real-time with emojis (e.g., 👍, 🔥, 🤯, 💡), creating a more dynamic and expressive chat environment. Reactions toggle on/off.
-   **Threaded Replies**: Organize conversations with inline replies to specific messages. Reply previews show parent message context.
-   **Typing Indicators**: Visual indicators showing when other users are typing, with 3-second auto-expire.
-   **Live Presence**: Online/offline status tracked globally — users see who is online across the platform and within each room.
-   **Message Pinning**: Pin important messages in rooms for quick reference. Pinned messages are accessible via a dedicated panel.
-   **Read Receipts**: Messages transition through `sent → delivered → read` states with real-time status updates visible to the sender.

## 5. Polls
Interactive polling within group rooms.
-   **Create Polls**: Pose a question with 2–10 options for room members to vote on.
-   **Voting**: Toggle votes on/off; optionally allow multiple votes per user.
-   **Anonymous Mode**: Hide voter identities for unbiased polling.
-   **Auto-Expiry**: Set a timer (in minutes) after which the poll automatically closes.
-   **Creator Controls**: Only the poll creator can manually close a poll.

## 6. AI-Powered Tools
Advanced AI features that augment the chat experience beyond simple messaging.
-   **Smart Reply Suggestions**: AI generates 3 contextual quick-reply suggestions based on recent conversation (one casual, one informative, one engaging).
-   **Sentiment Analysis**: Analyzes the emotional tone of messages with a confidence score and matching emoji badge (positive, negative, neutral, excited, confused, angry).
-   **Grammar Check**: AI reviews messages for grammar and spelling errors, offering corrected text and explanations.
-   All AI tools can be individually enabled/disabled in user settings.

## 7. Dashboard
A personalized activity hub for logged-in users.
-   **Stats Overview**: Total solo conversations, rooms, messages sent, messages today, online users.
-   **Recent Rooms**: Quick access to the 5 most recently created rooms.
-   **Activity Feed**: The 10 most recent messages sent by the user across all rooms, enriched with room names.

## 8. Search
Full-text search across all messages in the platform.
-   **Text Search**: MongoDB text index-powered search with relevance scoring.
-   **Filters**: Filter by room, user, and date range.
-   **Pagination**: Navigate through large result sets.
-   **Context**: Results include room names and usernames for easy navigation.

## 9. User Profiles
Customizable user identity.
-   **Display Name**: Set a formatted name (up to 50 chars) separate from the username.
-   **Bio**: Share a short bio (up to 200 chars).
-   **Avatar**: Upload a profile image (base64 data URL, max ~375KB).
-   **Public Profiles**: View other users' profiles with their online status and activity info.

## 10. Settings & Personalization
Fine-grained control over the application experience.
-   **Theme**: Choose between dark, light, or system-preferred mode with custom theme variants.
-   **Accent Color**: Set a custom accent color (hex) for UI highlights.
-   **Notifications**: Toggle sound, desktop notifications, mention alerts, and reply alerts independently.
-   **AI Feature Toggles**: Enable or disable smart replies, sentiment analysis, and grammar checking.

## 11. Data Export
Export chat data for backup or analysis.
-   **Solo Conversations**: Download all personal AI conversations as a structured JSON file with metadata.
-   **Room Messages**: Export any room's full message history as JSON, including message content, timestamps, and sender info.

## 12. Moderation
Tools to maintain a safe and respectful community.
-   **Report Content**: Report users or messages for spam, harassment, hate speech, inappropriate content, impersonation, or other reasons. Includes duplicate report prevention.
-   **Block Users**: Block specific users to prevent interaction. View and manage your blocked list.
-   **Admin Review**: Reports enter a `pending → reviewed → action_taken/dismissed` lifecycle, managed by admins.

## 13. Admin Panel
Platform administration for users with the `isAdmin` flag.
-   **Global Stats**: Total users, rooms, messages, pending reports, and online users at a glance.
-   **Report Management**: View, filter (by status), and resolve reports with review notes. Paginated.
-   **User Management**: Search users by username/email/display name, view details, paginated listing.
-   **Recent Users**: Quick view of the 5 most recently registered users.

## 14. Analytics
Data-driven insights into platform activity.
-   **Messages Per Day**: Line chart of message volume over the last 30–90 days with gap-filling for zero-activity days.
-   **Active Users Per Day**: Daily unique user count based on message activity.
-   **Top Rooms**: Ranked rooms by total message count with last activity timestamps.

## 15. Security & Authentication
A production-ready security posture.
-   **Google OAuth**: Frictionless sign-up and login via Google accounts.
-   **JWT Rotation**: Secure Access + Refresh token architecture, minimizing the risk of token theft while maintaining a smooth user experience.
-   **Password Hashing**: Bcrypt with 12 salt rounds for secure one-way encryption of user passwords.
-   **Admin Access Control**: Admin routes protected by dual middleware (JWT auth + admin check).
-   **Role-Based Room Permissions**: Hierarchical role system (creator > admin > moderator > member) for room actions.

## 16. Premium UI / UX
A meticulously crafted interface focusing on aesthetics and usability.
-   **Dark Mode**: A sleek, modern dark theme designed to reduce eye strain.
-   **Grain Texture & Glow Effects**: Subtle visual enhancements providing a premium, native-app feel.
-   **Framer Motion Animations**: Smooth, fluid transitions and micro-interactions that make the application feel responsive and alive.
-   **Responsive Design**: Adapts to desktop screens with sidebar navigation and content areas.
