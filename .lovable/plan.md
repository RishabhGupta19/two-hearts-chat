

# Couple Communication App — Implementation Plan

## Design System Setup
- Custom color palette (warm cream, sand-brown, peach) with Angry Mode override colors
- Playfair Display (headings) + Inter (body) from Google Fonts
- 8px spacing grid, 16px card radius, 999px pill buttons, soft shadows
- Framer Motion for all transitions (fade+slide, crossfade, stagger, scale)

## Screens & Features

### 1. Login / Signup Screen
- Centered card with app branding, name/email/password fields
- Tagline: "A space just for the two of you."
- Routes to Role Selection after auth

### 2. Role Selection Screen
- Two large pill toggles: 💜 GF / 💙 BF
- First user gets generated Couple Code badge
- Second user enters code to link — heart pulse confirmation animation

### 3. Onboarding Assessment (once per user)
- Step-by-step single-question flow with progress bar
- 6-8 questions (radio/slider) about conflict style, love language, etc.
- Stores answers as RAG profile JSON in context

### 4. Home Dashboard
- Top bar with logo + avatar/online indicator
- Partner connection status display
- Two CTA cards: 💬 Start Chatting / 🎯 View Goals

### 5. Chat Screen — Normal (Calm) Mode
- Full-height chat with user/AI bubbles
- Mode toggle pill in top bar (😊 Calm | 😤 Vent)
- Collapsible "Set a Goal" section below input with tags (Growth/Us/Personal)

### 6. Chat Screen — Angry (Vent) Mode
- Animated crossfade to dark red theme (#2C1A1A backgrounds)
- Pulsing red border glow on chat container (3s breathing animation)
- Dismissible safe-space banner, AI tone shifts to validating
- "Feeling better?" button in top bar triggers Resolution Modal

### 7. Resolution Modal
- Scale+fade modal: "Has this been resolved? 🌿"
- "Yes, we're good" → clears context, CSS confetti, back to Calm
- "Not yet" → dismisses, continues session

### 8. Goals Screen
- Grid of GoalCards with tag badges, dates, status toggles
- Sections: "Partner's Goals for You" + "Goals You Set"
- Hover scale animation, empty state message

## State & Architecture
- React Context for: mode (calm/vent), user role, couple ID, partner status, RAG profile
- Local state for: chat messages, goal input, modals
- All data stored client-side (mock/local storage) — ready for backend integration later
- Reusable components: ModeToggle, ChatBubble, AssessmentStep, GoalCard, ResolutionModal, CoupleLinker, ModeWrapper

## Responsive
- Mobile-first, works at 375px
- Chat: full viewport height, input pinned bottom
- Cards/grids stack vertically on mobile

