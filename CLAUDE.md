# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Start development server with Turbopack (faster builds)
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

### Testing
No dedicated test scripts are configured. Tests are run via:
- Hook files: `src/app/hooks/useSync.test.ts`
- Library tests: `src/app/lib/sync.test.ts`, `src/app/lib/network.test.ts`
- Manual testing for drag and drop functionality

## Project Architecture

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19 with TypeScript
- **Styling**: Tailwind CSS 4
- **Backend/Database**: Firebase (Firestore + Auth)
- **State Management**: Custom React hooks with local storage fallback
- **Icons**: Lucide React
- **Drag & Drop**: HTML5 Drag and Drop API with React DnD patterns

### Core Architecture Patterns

**Dual Storage Strategy**: The app operates with a dual-storage architecture supporting both authenticated and guest users:
- **Guest users**: Tasks stored in localStorage only
- **Authenticated users**: Tasks stored in Firestore with offline queue for synchronization

**Offline-First Design**: Built around network resilience:
- Tasks work fully offline via localStorage
- Network detection with automatic queue processing via NetworkReconnectionHandler
- Optimistic updates with rollback on failures
- Background synchronization without user-facing sync indicators
- Seamless reconnection handling when network is restored

**Task Synchronization**: Simplified sync system with background processing:
- Automatic synchronization via NetworkReconnectionHandler
- Offline queue processing when network is available
- Retry logic with exponential backoff for failed operations
- Silent sync operations to maintain seamless user experience

### Key Directories

**`src/app/`** - Main application directory
- `page.tsx` - Main todo list interface with drag & drop, calendar, task management, auth integration
- `firebase.ts` - Firebase configuration and initialization
- `layout.tsx` - Root layout with font setup
- `auth/` - Authentication pages and components

**`src/app/components/`** - Reusable UI components
- `Toast.tsx` - Notification system with multiple types
- `LoadingSpinner.tsx` - SVG-based loading spinner
- Removed: AuthForm, StatusIndicators, ConflictResolver (simplified architecture)

**`src/app/hooks/`** - Custom React hooks
- `useLocalStorage.ts` - Local storage operations for tasks
- `useOfflineQueue.ts` - Queue management for offline actions
- Removed: useSync (replaced with automatic background sync)

**`src/app/lib/`** - Core business logic
- `firestore.ts` - Firebase operations with retry logic, validation, and task ordering
- `localStorage.ts` - Local storage utilities
- `network.ts` - Network detection and connection quality assessment
- `offlineQueue.ts` - Queue processing for offline operations
- `networkReconnection.ts` - Background network reconnection and sync handling
- Removed: sync.ts (replaced with simpler background sync)

### Design System Implementation

The app follows a comprehensive dark-theme design system defined in `Design_System.md`:

**Colors**: Uses OKLCH color space with CSS custom properties:
- Background: `bg-900` (#0E1015), `bg-800` (#141720), `bg-700` (#1B1F29)
- Text: `text-100` (#E5E7EB), `text-200` (#9CA3AF), `text-300` (#6B7280)
- Brand: `brand-500` (#2DD4BF), `brand-600` (#14B8A6), `brand-700` (#0D9488)

**Typography**: Inter font family with specific sizing and spacing scales

**Components**: Follow atomic design principles with consistent interaction patterns

### State Management Patterns

**Local Storage Hook**: `useLocalStorage` provides CRUD operations with error handling
**Offline Queue Hook**: `useOfflineQueue` manages pending actions when offline
**Network Reconnection Handler**: Automatic background synchronization without user-facing indicators

Tasks flow through these layers:
1. UI action → Optimistic local update
2. Online: Direct Firestore operation
3. Offline: Queue action for later processing
4. Sync: Resolve conflicts and merge changes

### Network Architecture

**Connection Management**: 
- Real-time network state tracking via NetworkManager
- Connection quality assessment (can sync vs basic connectivity)
- Automatic retry mechanisms with exponential backoff
- Background reconnection handling via NetworkReconnectionHandler
- Silent sync operations to maintain seamless UX

**Firebase Integration**:
- Authentication via email/password
- Firestore subcollections: `/users/{userId}/tasks`
- Security rules enforce user-level isolation
- Retry logic with validation for all operations

### Key Features

**Task Management**: Full CRUD with rich editing (multi-line support, due dates, notes)
**Drag & Drop**: Complete implementation with:
  - HTML5 Drag and Drop API integration
  - Visual drag handles and drop zones
  - Smooth animations and transitions
  - Custom drag previews showing full task cards
  - Automatic reordering with proper spacing
  - Touch-friendly mobile support
**Calendar Integration**: Custom calendar component with date selection
**Responsive Design**: Mobile-first with accessible interactions
**Authentication**: Optional sign-in via dedicated /auth route with local storage fallback

## Development Guidelines

### File Organization
- Main logic stays in `src/app/page.tsx` - avoid splitting unless absolutely necessary
- New components go in `src/app/components/`
- Business logic belongs in `src/app/lib/`
- Custom hooks in `src/app/hooks/`
- Authentication pages in `src/app/auth/`
- Drag and drop logic integrated directly in main page component

### Code Style
- Follow existing TypeScript patterns
- Use Tailwind classes consistently with design system tokens
- Implement proper error handling with user-friendly messages
- Maintain accessibility (ARIA labels, keyboard navigation)

### Testing Approach
- Unit tests for core utilities (`*.test.ts` files)
- Integration testing for sync operations
- Manual accessibility testing required

### Firebase Development
- Use environment variables for configuration (with fallbacks for development)
- All Firestore operations include retry logic and validation
- Security rules located in `firestore.rules`
- Task ordering system using `order` field with automatic migration
- Batch operations for efficient task reordering

## Important Patterns

**Optimistic Updates**: All user actions show immediate feedback, then sync/rollback
**Error Recovery**: Failed operations show toast messages with retry options
**Progressive Enhancement**: App works without authentication, enhances with cloud sync
**Accessibility**: Comprehensive ARIA labeling, keyboard navigation, screen reader support
**Drag & Drop Patterns**: 
  - Draggable items with proper ARIA attributes
  - Visual feedback during drag operations
  - Smooth animations using CSS transitions
  - Touch event handling for mobile devices
  - Proper cleanup of event listeners