# AI Interview Assistant Frontend

A modern Next.js frontend for an AI-powered interview platform that integrates LiveKit for real-time audio/video streaming and Beyond Presence for AI avatar interactions.

## Features

### Product Manager Dashboard
- **Research Goal Definition**: Define research objectives with target audience and duration
- **AI Clarification Chat**: Interactive chat with AI to refine research goals
- **Script Editor**: Review and customize AI-generated interview scripts
- **Session Management**: Create and monitor interview sessions
- **Analytics Dashboard**: View results, transcripts, and psychometric insights

### Interviewee Interface
- **Camera & Microphone Access**: Secure permission handling for media devices
- **LiveKit Integration**: Real-time audio/video streaming
- **Beyond Presence AI Avatar**: Interactive AI interviewer with speech recognition
- **Session Management**: Join interviews via unique session links

## Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Real-time Communication**: LiveKit.io
- **AI Avatar**: Beyond Presence API
- **UI Components**: Radix UI + Lucide React icons
- **State Management**: React hooks

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ 
- npm or yarn
- LiveKit server instance
- Beyond Presence API access

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
```

### 3. Environment Configuration

Update `.env.local` with your credentials:

```env
# LiveKit Configuration
NEXT_PUBLIC_LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Beyond Presence API Configuration
BEYOND_PRESENCE_API_KEY=your-beyond-presence-api-key
BEYOND_PRESENCE_API_URL=https://api.beyondpresence.com

# Backend API Configuration
BACKEND_API_URL=http://localhost:8000
```

### 4. Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### 5. Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── livekit-token/          # LiveKit token generation
│   │   └── beyond-presence/        # Beyond Presence API integration
│   ├── product-manager/            # Product manager dashboard
│   ├── interviewee/                # Interviewee interface
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Landing page
├── components/
│   ├── ResearchGoalForm.tsx        # Research goal input form
│   ├── ClarificationChat.tsx       # AI clarification chat
│   ├── ScriptEditor.tsx            # Interview script editor
│   ├── SessionList.tsx             # Session management
│   ├── ResultsAnalytics.tsx        # Analytics dashboard
│   ├── LiveKitRoom.tsx             # LiveKit integration
│   ├── CameraPermissionPrompt.tsx  # Permission handling
│   └── BeyondPresenceAvatar.tsx    # AI avatar component
└── lib/                            # Utility functions
```

## Key Features

### LiveKit Integration
- Real-time audio/video streaming
- Automatic token generation
- Participant management
- Media device controls

### Beyond Presence Integration
- AI avatar initialization
- Speech-to-text processing
- Real-time AI responses
- Avatar video streaming

### Responsive Design
- Mobile-first approach
- Dark theme for interview interface
- Accessible UI components
- Modern gradient backgrounds

## API Endpoints

### LiveKit Token Generation
- `POST /api/livekit-token` - Generate access tokens for LiveKit rooms

### Beyond Presence Integration
- `POST /api/beyond-presence/initialize` - Initialize AI agent
- `POST /api/beyond-presence/process-speech` - Process user speech
- `GET /api/beyond-presence/stream/[agentId]` - Stream AI responses

## Usage

### For Product Managers

1. Navigate to `/product-manager`
2. Define your research goal
3. Answer AI clarification questions
4. Review and customize the interview script
5. Generate session links for participants
6. Monitor sessions and view results

### For Interviewees

1. Click on a session link (e.g., `/interviewee?session=session-123`)
2. Grant camera and microphone permissions
3. Enter email (optional)
4. Start the interview
5. Interact with the AI interviewer

## Browser Support

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Security Considerations

- HTTPS required for camera/microphone access
- Secure token generation for LiveKit
- API key protection
- Session validation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.