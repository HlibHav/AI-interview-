# Quick Start Guide

## Get Up and Running in 5 Minutes

### Prerequisites
- Node.js 18+ installed
- npm or pnpm
- LiveKit server access (or use LiveKit Cloud)
- Beyond Presence API key
- OpenAI API key

### Step 1: Install Dependencies (1 min)
```bash
cd interview
npm install
```

### Step 2: Configure Environment (2 min)

Create `.env.local` file:
```bash
cp env.example .env.local
```

**Minimum Required Configuration:**
```env
# OpenAI (Required)
OPENAI_API_KEY=sk-...

# LiveKit (Required for video)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxx
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud

# Beyond Presence (Required for avatars)
BEY_API_KEY=bey_...
BEY_API_URL=https://api.bey.dev
BEY_AVATAR_ID=avatar_...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Step 3: Start the Server (30 sec)
```bash
npm run dev
```

Visit: http://localhost:3000

### Step 4: Create Your First Interview (90 sec)

1. **Go to Admin Dashboard**
   - Navigate to http://localhost:3000/admin

2. **Define Research Goal**
   - Enter: "Understand how people manage their daily tasks"
   - Click "Start Clarification"

3. **Answer Clarification Questions**
   - Type answers in the chat
   - The AI will ask follow-up questions
   - When satisfied, it will generate a script

4. **Review & Approve Script**
   - Review the generated questions
   - Click "Approve & Generate Link"
   - Copy the interview link

5. **Test as Participant**
   - Open link in new browser/incognito
   - Enter email
   - Grant camera/microphone permissions
   - Start the interview!

## Troubleshooting

### "Failed to connect to LiveKit"
- Check `LIVEKIT_URL` is correct (must start with `wss://`)
- Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set
- Test connection: https://livekit.io/cloud

### "Beyond Presence initialization failed"
- Verify `BEY_API_KEY` is valid
- Check `BEY_AVATAR_ID` exists
- Test API: `curl -H "x-api-key: $BEY_API_KEY" https://api.bey.dev/v1/avatars`

### "Camera/Microphone access denied"
- Check browser permissions
- Use HTTPS in production (required for media access)
- Try different browser

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is valid
- Check you have credits: https://platform.openai.com/usage
- Ensure API key has proper permissions

## Getting API Keys

### LiveKit (Free Tier Available)
1. Sign up at https://livekit.io/
2. Create a project
3. Get API Key and Secret from dashboard
4. Copy WebSocket URL (wss://...)

### Beyond Presence
1. Sign up at https://bey.dev/
2. Get API key from dashboard
3. Create or select an avatar
4. Copy Avatar ID

### OpenAI
1. Sign up at https://platform.openai.com/
2. Add payment method
3. Create API key
4. Copy key (starts with sk-...)

## Next Steps

- ✅ Successfully run first interview
- 📊 View results in admin dashboard
- 🎨 Customize interview scripts
- 🔧 Configure for production
- 📈 Add database persistence
- 🔐 Add authentication

## Need Help?

1. Check `INTEGRATION_COMPLETE.md` for detailed documentation
2. Review API route files for examples
3. Check browser console for errors
4. Verify all environment variables are set

## Common Use Cases

### Research Study
Perfect for qualitative user research, product validation, and market research.

### Customer Feedback
Collect in-depth feedback from customers with AI-guided conversations.

### User Testing
Test new features and gather detailed user opinions.

### Behavioral Studies
Understand user behavior patterns through structured interviews.

---

**Ready to scale?** Consider:
- Database integration (PostgreSQL/Supabase)
- Authentication (NextAuth.js)
- Production deployment (Vercel/AWS)
- Analytics dashboard
- Email notifications

