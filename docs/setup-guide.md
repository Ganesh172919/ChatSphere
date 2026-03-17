# Setup Guide

Follow these steps to get ChatSphere running on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
-   **Node.js**: Version 18.x or higher
-   **npm** or **yarn** (Node Package Manager)
-   **Git**

You will also need administrative access or accounts for the following services:
-   **MongoDB**: A local MongoDB server or a cloud cluster on [MongoDB Atlas](https://cloud.mongodb.com).
-   **Google AI Studio**: For obtaining the Gemini API key.
-   **Google Cloud Console**: For configuring OAuth 2.0 credentials.

---

## 1. Clone the Repository

```bash
git clone <repository-url>
cd ChatSphere
```

---

## 2. Backend Setup

1.  **Navigate to the backend directory and install dependencies**:
    ```bash
    cd backend
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env` file in the root of the `backend` directory. Populate it with the following keys:
    ```env
    PORT=3000
    MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/chatsphere?retryWrites=true&w=majority
    GEMINI_API_KEY=your_google_gemini_api_key
    JWT_ACCESS_SECRET=your_super_secret_access_key
    JWT_REFRESH_SECRET=your_super_secret_refresh_key
    GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
    GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
    CLIENT_URL=http://localhost:5173
    ```

    *   **MONGO_URI**: Replace with your local `mongodb://localhost:27017/chatsphere` or Atlas connection string.
    *   **JWT Secrets**: Generate secure random strings for these values.
    *   **Google Credentials**: See the "Google OAuth Setup" section below.

3.  **Start the Backend Server**:
    ```bash
    # For development (with nodemon, if installed)
    npm run dev 
    
    # Or standard start
    node index.js
    ```
    You should see terminal outputs indicating MongoDB connection success and the server running on port 3000.

---

## 3. Frontend Setup

1.  **Navigate to the frontend directory and install dependencies**:
    Open a *new* terminal window/tab:
    ```bash
    cd frontend
    npm install
    ```

2.  **Environment Variables (Optional)**:
    If your backend is running on a port other than 3000, you may need to configure Vite. Typically, Vite leverages proxying or you can set a `.env` in the `frontend` directory:
    ```env
    VITE_API_URL=http://localhost:3000
    ```
    *(Check frontend `vite.config.ts` or API service logic to confirm if this is required; usually setup defaults assume backend is on :3000)*

3.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
    The frontend should now be running, typically accessible at `http://localhost:5173`.

---

## Google OAuth Setup Guide

To enable Google Sign-In:

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Create a new Project (or select an existing one).
3.  Navigate to **APIs & Services > Credentials**.
4.  Click **Create Credentials** -> **OAuth client ID**.
5.  If prompted, configure your "OAuth consent screen" (App name: ChatSphere, add your email, save).
6.  For Application Type, select **Web application**.
7.  Under **Authorized JavaScript origins**, add:
    -   `http://localhost:5173` (Your frontend URL)
8.  Under **Authorized redirect URIs**, add:
    -   `http://localhost:3000/api/auth/google/callback` (Must match your `.env`)
9.  Click **Create**.
10. Copy the generated **Client ID** and **Client Secret** into your backend `.env` file.
