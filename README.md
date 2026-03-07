# AI/ML Intelligence Club Platform

A shared platform for AI/ML idea collaboration, voting, and innovation. All users see one shared main dashboard with real-time updates.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-ml-club
npm install
```

### 2. Configure Environment

The `.env.local` file is already configured with your Firebase settings. Add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 3. Set Up Firebase

#### Enable Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `gen-lang-client-0811327332`
3. Navigate to **Authentication** → **Get Started**
4. Enable **Email/Password** provider
5. Enable **Google** provider (for Google Sign-in)

#### Create Firestore Database
1. Go to **Firestore Database**
2. Click **Create Database**
3. Start in **production mode**
4. Choose a location close to you

#### Deploy Security Rules
Copy `firestore.rules` content to Firebase Console:
1. Go to **Firestore > Rules**
2. Paste the contents of `firestore.rules`
3. Publish

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create Admin User

Run the seed script to create the admin user:

```bash
npm run seed
```

This creates:
- **Admin User**: Saurabh Singh
- **Email**: Saurabh.Singh@aimlclub.com
- **Password**: Saurabh@2318
- **Role**: admin (full access)

## 🔑 Features

### Authentication
- ✅ Email/Password sign up and sign in
- ✅ Google Sign-in (one-click)
- ✅ Role-based access (member, leader, admin)

### For All Users
- ✅ View global shared dashboard
- ✅ Submit AI/ML ideas
- ✅ Vote IN/OUT on ideas (one vote per idea)
- ✅ Real-time updates across all clients
- ✅ View AI/ML tech feed

### For Leaders
- ✅ Leader Control Panel access
- ✅ View high-performing ideas (15+ votes)
- ✅ View controversial ideas (high IN + OUT votes)
- ✅ View stalled ideas (7+ days inactive)
- ✅ Approve/Reject ideas
- ✅ Generate AI Drafts with Gemini

### AI Integration
- ✅ Generate refined idea descriptions
- ✅ Create discussion agendas
- ✅ Produce feasibility notes
- ✅ Graceful degradation if AI fails

## 📁 Project Structure

```
ai-ml-club/
├── app/
│   ├── (auth)/                 # Authentication pages
│   │   ├── login/page.tsx      # Login with Google option
│   │   └── signup/page.tsx     # Signup with Google option
│   ├── (dashboard)/            # Main app (requires auth)
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Global dashboard
│   │   └── ideas/new/page.tsx  # Submit idea form
│   ├── (leader)/               # Leader-only pages
│   │   ├── layout.tsx
│   │   └── leader/page.tsx     # Leader control panel
│   ├── api/ai/draft/route.ts   # Gemini AI integration
│   └── globals.css
├── components/
│   ├── layout/Header.tsx
│   └── dashboard/
│       ├── IdeaCard.tsx
│       └── TechFeedCard.tsx
├── context/AuthContext.tsx
├── lib/
│   ├── firebase/
│   │   ├── client.ts
│   │   ├── auth.ts             # Auth + Google Sign-in
│   │   └── firestore.ts
│   └── ai/gemini.ts
├── scripts/seed.ts             # Admin user creation
└── types/index.ts
```

## 🔒 Security

### Firestore Rules
- Only authenticated users can read data
- Users can only update their own profiles
- Leaders can change idea status
- One vote per user per idea (enforced by security rules)
- AI drafts can only be created by leaders

### API Security
- Gemini API key is server-side only
- All API routes validate requests

## 🧪 Testing the Workflow

1. **Run seed script** to create admin user
2. **Sign in** as admin (Saurabh.Singh@aimlclub.com / Saurabh@2318)
3. **Or use Google Sign-in** for quick access
4. **Submit ideas** from dashboard
5. **Vote** on ideas (IN or OUT)
6. **Access Leader Panel** (visible for admin/leader roles)
7. **Generate AI Draft** for approved ideas

## 👤 User Roles

| Role | Permissions |
|------|-------------|
| member | Submit ideas, vote, view dashboard |
| leader | All member permissions + Leader Panel, approve/reject ideas |
| admin | All leader permissions + manage users |

To change a user's role, edit their document in Firestore `users` collection.

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Frontend framework |
| TypeScript | Type safety |
| Firebase Auth | Authentication (Email + Google) |
| Firestore | Database + Real-time |
| Gemini AI | AI drafting |
| Tailwind CSS | Styling |
| date-fns | Date formatting |

## 🛠️ Troubleshooting

### "Permission denied" errors
- Check Firestore rules are deployed
- Ensure you're authenticated
- Verify the user exists in the `users` collection

### Google Sign-in not working
- Enable Google provider in Firebase Console
- Add authorized domains

- ✅ Produce feasibility notes
- ✅ Graceful degradation if AI fails

## 🔒 Security

### Firestore Rules
- Only authenticated users can read data
- Users can only update their own profiles
- Leaders can change idea status
- One vote per user per idea (enforced by security rules)
- AI drafts can only be created by leaders

### API Security
- Gemini API key is server-side only
- All API routes validate requests
- No client-side trust assumptions

## 🎯 Vote Threshold

Ideas with 7+ votes automatically move to "Under Review" status. Configure this in `.env.local`:

```env
NEXT_PUBLIC_VOTE_THRESHOLD=7
```

## 🧪 Testing the Workflow

1. **Sign up** multiple users
2. **Submit ideas** from different accounts
3. **Vote** on ideas (IN or OUT)
4. Watch real-time updates across browser tabs
5. **Promote a user to leader** in Firestore
6. **Access Leader Panel** to approve/reject ideas
7. **Generate AI Draft** for an approved idea

## 🛠️ Troubleshooting

### "Permission denied" errors
- Check Firestore rules are deployed
- Ensure you're authenticated
- Verify the user exists in the `users` collection

### AI Draft fails
- Check `GEMINI_API_KEY` is set correctly
- Verify the API key is valid
- Check console for error details

### Real-time updates not working
- Check browser console for Firebase errors
- Verify Firestore is enabled in Firebase Console
- Ensure you're on the same project

## 📦 Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | Frontend framework (App Router) |
| TypeScript | Type safety |
| Firebase Auth | Authentication |
| Firestore | Database + Real-time |
| Gemini AI | AI drafting |
| Tailwind CSS | Styling |
| date-fns | Date formatting |

## 🔮 Future Extensions

1. **Weighted Voting** - Reputation-based vote weight
2. **Comments** - Structured discussion on ideas
3. **Notifications** - Email/push for idea updates
4. **Calendar Integration** - Meeting scheduling
5. **Analytics Dashboard** - Voting patterns, engagement metrics
6. **External Tech Feed** - Auto-ingest from arXiv, Hacker News
7. **Mobile App** - React Native version

## 📄 License

MIT

---

Built with ❤️ for the AI/ML Intelligence Club