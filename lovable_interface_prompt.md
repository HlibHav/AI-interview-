# Lovable Interface Design Prompt: AI Interview Assistant

Build a modern, professional web application for conducting AI-powered qualitative research interviews. The interface should be clean, intuitive, and support both researcher (admin) and participant (respondent) workflows.

## Core Requirements

### Tech Stack
- **Framework**: Next.js 14+ with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui or similar headless component library
- **Icons**: Lucide React
- **State Management**: React hooks (useState, useEffect)
- **Forms**: react-hook-form with zod validation
- **Animations**: Framer Motion for smooth transitions

### Color Palette
- **Primary**: Blue (#3B82F6) for professional/admin areas
- **Secondary**: Green (#10B981) for participant interfaces
- **Accents**: Purple (#8B5CF6) for special features
- **Background**: Light gray/blue gradients for modern feel

## Main Application Structure

### 1. Landing Page (`/`)

**Design**: Clean, modern hero section with gradient background

**Components**:
- Hero section with large title "AI Interview Assistant"
- Subtitle explaining the value proposition
- Two prominent action cards:
  1. **Admin Dashboard** (Blue theme) - "Create & Analyze"
  2. **Interview Session** (Green theme) - "Start Interview"
- Features section with 3 cards showing key benefits:
  - AI-Powered Interviewing (Brain icon)
  - Psychological Profiling (Chart icon)
  - Real-time Analysis (Mic icon)

**Visual Design**:
```
[Background: gradient from-blue-50 to-indigo-100]
┌──────────────────────────────────────────────┐
│  AI Interview Assistant                      │
│  [Hero text with gradient text effect]      │
│                                              │
│  [Admin Card]    [Interview Card]           │
│                                              │
│  Features:                                   │
│  [Icon] [Icon] [Icon]                        │
└──────────────────────────────────────────────┘
```

### 2. Admin Dashboard (`/admin`)

**Layout**: Sidebar navigation + main content area

**Sidebar Navigation** (Fixed left, 256px wide):
- Research Goal (active indicator)
- Clarification
- Interview Script
- Sessions
- Analytics (link to separate page)

**Main Content Area** (flex-1, scrollable):

#### Step 1: Research Goal Definition
- Large card with form
- **Research Goal**: Large textarea (4 rows, min 10 chars)
- Three column grid below:
  - **Target Audience**: Text input (placeholder: "e.g., Young professionals")
  - **Duration**: Select dropdown (5, 10, 15, 20, 30 minutes)
  - **Sensitivity Level**: Select (Low, Medium, High)
- Submit button (blue, with Send icon)
- Loading state: Button shows spinner + "Generating..."

#### Step 2: Clarification Chat
- Chat interface with message bubbles
- **Agent messages**: Left-aligned, gray background
- **User messages**: Right-aligned, blue background
- Auto-scroll to bottom
- Input field at bottom with Send button
- Loading indicator shows "AI is thinking..." message
- Error states: Red alert banner at top
- Transitions smoothly between messages

#### Step 3: Interview Script
- **Introduction Section**: Highlighted blue box with rounded corners
- **Questions List**: Numbered cards with border, showing:
  - Question number and topic
  - Full question text in quotes
  - Follow-ups (if available) in smaller gray text
- **Actions** at bottom:
  - "Regenerate Script" button (gray outline)
  - "Approve & Generate Link" button (green, primary)
- Success state: Green banner with session link and copy button
- Editing: Full script is editable before approval

#### Session Status Page
- Empty state with Users icon and message
- Future: Table of sessions with status badges

### 3. Respondent Interface (`/respondent?sessionId=xxx`)

**Email Input Screen**:
- Centered card (max-w-md)
- Green gradient background
- Mic icon in circular badge (green)
- Research topic shown in blue info box
- Email input field
- "Start Interview" button
- Error handling: Red alert for missing email

**Camera Permission Screen**:
- Full-screen camera prompt component
- Clear instructions with visual indicators
- Permission buttons (Allow/Deny)

**Interview Room** (Active state):
- Video component integrated
- Live transcript display
- Progress indicator
- Controls: Pause, End Interview
- Participant webcam view (top-right corner)
- AI avatar/video display (main area)

**Visual Hierarchy**:
```
┌─────────────────────────────────────────┐
│  [AI Avatar Video - Large]             │
│                                         │
│  [Controls: Pause | End]                │
│  [Progress: Question 3/8]               │
│  [Transcript: scrollable area]          │
└─────────────────────────────────────────┘
```

## Component Specifications

### Buttons
- **Primary**: `bg-blue-600 hover:bg-blue-700` with white text
- **Secondary**: `border-2 border-gray-300 hover:bg-gray-50`
- **Success**: `bg-green-600 hover:bg-green-700`
- **Loading state**: Spinner + disabled opacity
- Padding: `px-6 py-3`
- Border radius: `rounded-md` or `rounded-lg`
- Font weight: `font-medium`

### Form Inputs
- Border: `border border-gray-300`
- Focus: `focus:outline-none focus:ring-2 focus:ring-blue-500`
- Padding: `px-3 py-2`
- Border radius: `rounded-md`
- Placeholder color: `placeholder:text-gray-500`
- Error state: Red border + error message below

### Cards
- Background: `bg-white`
- Shadow: `shadow-lg` or `shadow-sm`
- Border: `border border-gray-200`
- Border radius: `rounded-lg` or `rounded-xl`
- Padding: `p-8` for large cards

### Loading States
- Spinner: `animate-spin rounded-full border-b-2 border-[color]`
- Skeleton: Pulse effect with gray background
- Full-page loader: Centered with animation

### Chat Interface
- **Container**: Max height with `overflow-y-auto`
- **Message**: `max-w-xs lg:max-w-md` with rounded corners
- **Agent**: Left-aligned, `bg-gray-100`
- **User**: Right-aligned, `bg-blue-600 text-white`
- **Timestamp**: Small, semi-transparent, below message

### Navigation
- Active state: Blue background with border
- Inactive: Gray text, hover shows light background
- Icons: `h-5 w-5` with 3-unit margin-right

## Responsive Design

### Mobile (< 640px)
- Single column layout
- Stacked form fields
- Full-width buttons
- Smaller font sizes
- Hidden sidebar (drawer menu)

### Tablet (640px - 1024px)
- Two-column form layouts
- Adjusted card sizes
- Collapsible sidebar

### Desktop (> 1024px)
- Full layout with fixed sidebar
- Three-column grids
- Spacious padding

## Micro-interactions

1. **Button Hover**: Slight scale (1.02) + shadow increase
2. **Card Hover**: Border color change + shadow lift
3. **Message Send**: Slide in animation from bottom
4. **Step Transitions**: Fade out/in with 300ms duration
5. **Loading**: Pulse animation on placeholder elements
6. **Success**: Green checkmark animation + slide in

## Accessibility

- All interactive elements keyboard navigable
- ARIA labels on icons and buttons
- Color contrast meets WCAG AA standards
- Focus indicators visible on all inputs
- Screen reader support for dynamic content
- Alt text for all images/icons

## Error Handling

- **Inline Errors**: Red text below inputs
- **Toast Notifications**: For API errors (top-right corner)
- **Banner Alerts**: Full-width colored banners for critical errors
- **Empty States**: Friendly messages with helpful icons
- **Loading States**: Clear indication of what's happening

## Example Code Structure

```tsx
// page.tsx
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI Interview Assistant
        </h1>
        {/* Action Cards */}
      </section>
    </div>
  );
}

// admin/page.tsx structure
<div className="min-h-screen bg-gray-50">
  <Header />
  <div className="flex">
    <Sidebar />
    <MainContent>
      {step === "goal" && <GoalForm />}
      {step === "clarification" && <ClarificationChat />}
      {step === "script" && <ScriptViewer />}
    </MainContent>
  </div>
</div>
```

## Special Features

1. **Auto-save**: Script edits save automatically
2. **Link Copy**: One-click copy of session links
3. **Progress Indicators**: Visual progress for multi-step processes
4. **Real-time Updates**: Chat messages appear instantly
5. **Responsive Images**: Optimized for different screen sizes
6. **Dark Mode Ready**: Structure supports future dark theme

## Testing Considerations

- Form validation shows immediately
- API errors display user-friendly messages
- Loading states appear for all async operations
- Empty states provide clear guidance
- All interactive elements are clickable/tappable
- Mobile navigation works with hamburger menu

## Assets Needed

- Clean, minimal AI interviewer avatar (for branding)
- Illustrations for empty states
- Loading spinners (animations)
- Icon set from Lucide React (already included)

Build this interface with attention to detail, smooth animations, and an intuitive user experience that makes AI-powered interviews feel natural and professional.


