# StudyBuddy - AI Study Companion

StudyBuddy is an AI-powered study companion application that helps students organize their study materials, interact with an AI tutor, and generate quizzes from their notes.

## Features

- 🔐 **Authentication**: Google Sign-In and Email/Password authentication
- 📚 **Subject Management**: Create and organize subjects for your studies
- 📝 **Notes**: Create, edit, and delete study notes for each subject
- 🤖 **AI Chat**: Interact with an AI tutor that understands your notes
- 🎯 **Quiz Generation**: Automatically generate multiple-choice quizzes from your notes
- 🔒 **Private Data**: All your data is private and secured with Firebase Security Rules

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Styling**: TailwindCSS
- **Backend**: Firebase (Authentication, Firestore)
- **AI**: OpenAI GPT-4 API
- **State Management**: React Hooks

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Firebase project created
- An OpenAI API key
- npm or yarn package manager

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd StudyBuddy
npm install
```

### 2. Firebase Setup

#### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Follow the setup wizard
4. Note your project ID

#### 2.2 Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Email/Password** provider
3. Enable **Google** provider and configure OAuth consent screen if needed

#### 2.3 Create Firestore Database

1. Go to **Firestore Database** in Firebase Console
2. Click "Create database"
3. Start in **test mode** (we'll update rules later)
4. Choose a location for your database

#### 2.4 Get Firebase Configuration

1. Go to **Project Settings** (gear icon) > **General**
2. Scroll down to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register your app and copy the Firebase configuration object

#### 2.5 (Optional) Setup Firebase Admin for Server-Side Auth

If you want to use server-side token verification in API routes:

1. Go to **Project Settings** > **Service Accounts**
2. Click "Generate new private key"
3. Download the JSON file
4. Extract the `client_email` and `private_key` values

### 3. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** section
4. Create a new API key
5. Copy the key (you won't be able to see it again)

### 4. Environment Variables

1. Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

2. Fill in your environment variables in `.env.local`:

```env
# Firebase Configuration (from step 2.4)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# OpenAI API Key (from step 3)
OPENAI_API_KEY=sk-...

# Firebase Admin (optional, from step 2.5)
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**Important**: 
- Never commit `.env.local` to version control
- The `NEXT_PUBLIC_` prefix makes variables available to the client
- `OPENAI_API_KEY` should NEVER have the `NEXT_PUBLIC_` prefix (server-side only)

### 5. Firebase Security Rules

1. Go to **Firestore Database** > **Rules** in Firebase Console
2. Replace the default rules with the content from `firestore.rules`
3. Click "Publish"

Alternatively, you can copy the rules from `firestore.rules` file and paste them in the Firebase Console.

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
StudyBuddy/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (OpenAI integration)
│   │   └── ai/
│   │       ├── chat/      # Chat API endpoint
│   │       └── quiz/      # Quiz generation API endpoint
│   ├── chat/              # Chat page
│   ├── dashboard/         # Dashboard page
│   ├── login/             # Login page
│   ├── quiz/              # Quiz display page
│   ├── settings/          # Settings page
│   └── subjects/          # Subject detail page
├── components/            # React components
│   ├── AuthGuard.tsx      # Protected route wrapper
│   ├── GenerateQuizButton.tsx
│   └── Navbar.tsx         # Navigation bar
├── lib/                   # Utility libraries
│   ├── auth.ts            # Authentication helpers
│   ├── db.ts              # Firestore database helpers
│   ├── firebaseAdmin.ts   # Firebase Admin SDK setup
│   ├── firebaseClient.ts  # Firebase Client SDK setup
│   └── openai.ts          # OpenAI SDK setup
├── firestore.rules        # Firestore security rules
└── README.md
```

## Data Model

### Collections

- **users/{uid}**: User profile information
- **subjects/{subjectId}**: Study subjects
- **notes/{noteId}**: Study notes linked to subjects
- **chats/{chatId}**: Chat sessions linked to subjects
- **chats/{chatId}/messages/{messageId}**: Chat messages
- **quizzes/{quizId}**: Generated quizzes linked to subjects

## Usage

1. **Sign Up/Login**: Create an account or sign in with Google
2. **Create Subjects**: Add subjects for different courses/topics
3. **Add Notes**: Create notes for each subject with titles and content
4. **AI Chat**: Click "AI Chat" to start a conversation with your AI tutor about the subject
5. **Generate Quiz**: Click "Generate Quiz from Notes" to create a quiz based on your notes
6. **Take Quiz**: Answer the questions and view your results with explanations

## API Endpoints

### POST `/api/ai/chat`

Sends a message to the AI tutor and receives a response.

**Request Body:**
```json
{
  "subjectId": "subject_id_here",
  "message": "Your question here"
}
```

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

### POST `/api/ai/quiz`

Generates a quiz from notes in a subject.

**Request Body:**
```json
{
  "subjectId": "subject_id_here"
}
```

**Headers:**
```
Authorization: Bearer <firebase_id_token>
```

## Troubleshooting

### Firebase Authentication Not Working

- Verify all `NEXT_PUBLIC_FIREBASE_*` environment variables are set correctly
- Check that Authentication providers are enabled in Firebase Console
- Ensure your app domain is authorized in Firebase Console

### API Routes Returning 401 Unauthorized

- Make sure Firebase Admin credentials are set up (optional but recommended)
- Check that the `Authorization` header includes a valid Firebase ID token
- Verify `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` are set if using Firebase Admin

### OpenAI API Errors

- Verify `OPENAI_API_KEY` is set in `.env.local` (without `NEXT_PUBLIC_` prefix)
- Check that your OpenAI account has credits/usage limits
- Ensure the API key has proper permissions

### Firestore Permission Denied Errors

- Verify security rules are published in Firebase Console
- Check that rules match the content in `firestore.rules`
- Ensure users are properly authenticated

## Security Notes

- All OpenAI API calls are made server-side only
- Firebase Security Rules ensure users can only access their own data
- Environment variables with sensitive keys are never exposed to the client
- Firebase ID tokens are verified on the server for API routes

## License

This project is provided as-is for educational purposes.

## Support

For issues or questions, please check the troubleshooting section or review the Firebase and OpenAI documentation.
