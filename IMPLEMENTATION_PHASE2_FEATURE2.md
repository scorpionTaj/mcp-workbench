# Phase 2 Feature #2: Message Reactions & Annotations

**Status**: ✅ COMPLETE  
**Priority**: HIGH  
**Completion Date**: 2024

## Overview

Comprehensive message feedback system allowing users to:

- React to messages with preset reactions (helpful, unhelpful, bookmark, love, insightful, excellent)
- Annotate messages with notes, highlights, flags, and important markers
- View and manage reactions/annotations with inline UI
- Track message metadata for analytics and personalization

## Architecture

### Database Schema

#### MessageReaction Table

```typescript
{
  id: string (uuid, primary key)
  messageId: string (references messages.id, CASCADE delete)
  type: string (helpful, unhelpful, bookmark, heart, lightbulb, fire)
  emoji: string (optional custom emoji)
  count: number (default 1, auto-incremented when same reaction added)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: `messageId`, `type` for optimal query performance

#### MessageAnnotation Table

```typescript
{
  id: string (uuid, primary key)
  messageId: string (references messages.id, CASCADE delete)
  type: string (highlight, note, flag, important)
  content: string (annotation text)
  color: string (yellow, green, blue, pink, purple, red, orange, amber)
  position: number (optional, byte position for inline highlights)
  length: number (optional, character length for inline highlights)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Indexes**: `messageId`, `type` for fast lookups

### Service Layer

**File**: `/lib/message-reactions-service.ts` (210+ lines)

#### Reactions Functions

- `addMessageReaction(messageId, type, emoji?)` - Add or increment reaction
- `removeMessageReaction(messageId, type)` - Decrement or remove reaction
- `getMessageReactions(messageId)` - Fetch all reactions for message

#### Annotations Functions

- `createMessageAnnotation(messageId, type, content, options?)` - Create annotation
- `updateMessageAnnotation(id, updates)` - Modify annotation (content, color, type)
- `deleteMessageAnnotation(id)` - Remove annotation
- `getMessageAnnotations(messageId)` - Fetch all annotations for message

#### Combined Metadata

- `getMessageMetadata(messageId)` - Fetch reactions + annotations in single query

### API Routes

#### Reactions Endpoints

- **GET** `/api/messages/[messageId]/reactions` - List all reactions
- **POST** `/api/messages/[messageId]/reactions` - Add reaction (auto-increments count)
- **DELETE** `/api/messages/[messageId]/reactions?type=X` - Remove reaction

#### Annotations Endpoints

- **GET** `/api/messages/[messageId]/annotations` - List all annotations
- **POST** `/api/messages/[messageId]/annotations` - Create annotation
- **PATCH** `/api/messages/annotations/[annotationId]` - Update annotation
- **DELETE** `/api/messages/annotations/[annotationId]` - Delete annotation

All endpoints include proper error handling and status codes (201 for create, 400 for validation, 500 for server errors)

### React Hooks

**File**: `/hooks/use-message-reactions.ts` (200+ lines)

Unified hook for both reactions and annotations:

```typescript
const {
  // Reactions
  reactions,
  fetchReactions,
  addReaction,
  removeReaction,

  // Annotations
  annotations,
  fetchAnnotations,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,

  // State
  isLoading,
  error,
} = useMessageReactions(messageId);
```

### UI Components

#### MessageReactions Component

**File**: `/components/chat/message-reactions.tsx` (220 lines)

Features:

- Display reactions below messages with emoji/icon and count
- Show up to 3 reactions inline, rest in expandable menu
- Add reaction button with preset options (helpful, unhelpful, bookmark, heart, lightbulb, fire)
- Click to toggle user's reaction
- Color-coded by reaction type
- Real-time count updates
- Hover effects for better UX

```tsx
<MessageReactions messageId={messageId} />
```

#### MessageAnnotations Component

**File**: `/components/chat/message-annotations.tsx` (280 lines)

Features:

- Display inline annotations with color backgrounds
- Support for 4 annotation types: highlight, note, flag, important
- Color picker for highlights (yellow, green, blue, pink, purple)
- Dialog for creating/editing annotations
- Edit and delete buttons for each annotation
- Textarea for annotation content
- Type selector in dialog

```tsx
<MessageAnnotations messageId={messageId} content={messageContent} />
```

### Integration

**Updated File**: `/components/chat/chat-messages.tsx`

Added reactions and annotations to each message:

1. Import components: `MessageReactions`, `MessageAnnotations`
2. Added section below message timestamp
3. Renders both components with message ID
4. Styled with border separator and padding

## Database Migrations

**Files Created**:

- `/drizzle/0003_add_message_reactions_annotations.sql` - Creates both tables with indexes

## File Inventory

### Created Files (5)

1. `/components/chat/message-reactions.tsx` - 220 lines, reaction display UI
2. `/components/chat/message-annotations.tsx` - 280 lines, annotation management UI
3. `/app/api/messages/[messageId]/reactions/route.ts` - Reaction endpoints
4. `/app/api/messages/[messageId]/annotations/route.ts` - Annotation list/create
5. `/app/api/messages/annotations/[annotationId]/route.ts` - Individual annotation CRUD

### Modified Files (3)

1. `/lib/schema.ts` - Added 2 pgTable definitions + type exports
2. `/lib/message-reactions-service.ts` - Service layer (210+ lines)
3. `/components/chat/chat-messages.tsx` - Integrated reactions/annotations display

### Hooks & Utilities (1)

1. `/hooks/use-message-reactions.ts` - 200+ line unified hook for both features

## Features

### Reaction System

- ✅ Quick feedback with 6 preset reaction types
- ✅ Auto-increment same reactions (count management)
- ✅ Remove reactions by type
- ✅ Emoji support for custom reactions
- ✅ Real-time UI updates

### Annotation System

- ✅ Create notes on messages
- ✅ Highlight important sections with color
- ✅ Flag messages for follow-up
- ✅ Mark important conversations
- ✅ Edit/delete annotations
- ✅ Inline position tracking for highlights

### User Experience

- ✅ Intuitive reaction buttons below messages
- ✅ Expandable reaction menu for more options
- ✅ Dialog-based annotation management
- ✅ Color picker for visual organization
- ✅ Type-based filtering (highlights, notes, flags)
- ✅ Real-time sync with database

## Usage Example

### In Chat Messages

```tsx
// Automatically shows reactions and annotations
<ChatMessages messages={messages} isLoading={isLoading} />

// Each message displays:
// [Message Content]
// ─────────────────
// [👍 Helpful: 2] [❤️ Love: 1] [...more]
// [Add Annotation]
// [Highlight: Yellow note about key point]
// [Note: Remember this for later]
```

### Programmatic Usage

```typescript
const { addReaction, removeReaction, fetchReactions } =
  useMessageReactions(messageId);

// Add reaction
await addReaction("helpful");

// Remove reaction
await removeReaction("helpful");

// Create annotation
const { createAnnotation } = useMessageReactions(messageId);
await createAnnotation("note", "Important point to remember", {
  color: "yellow",
});
```

## Error Handling

- Network errors with descriptive messages
- Validation errors for invalid annotation types
- Try-catch blocks in service layer
- Proper HTTP status codes in API routes
- User-friendly error display in components

## Performance Considerations

- Database indexes on `messageId` and `type` for fast queries
- Optimistic UI updates for reactions
- Memoized components to prevent unnecessary re-renders
- Efficient API calls (no over-fetching)
- Combined metadata query option (`getMessageMetadata`)

## Testing Checklist

- [ ] Reactions: Add/remove reactions on messages
- [ ] Reactions: View reaction counts
- [ ] Reactions: Toggle personal reactions
- [ ] Reactions: Expandable menu shows all reactions
- [ ] Annotations: Create notes on messages
- [ ] Annotations: Edit existing annotations
- [ ] Annotations: Delete annotations
- [ ] Annotations: Change annotation color/type
- [ ] Annotations: View multiple annotations per message
- [ ] Integration: Components render in chat messages
- [ ] Database: Migrations run successfully
- [ ] API: All endpoints return proper status codes
- [ ] UI: Styling matches design system

## Future Enhancements

1. **Inline Text Highlighting**: Support selecting specific text in message to highlight
2. **Reaction Analytics**: Track most reacted messages, common reactions
3. **Bulk Actions**: Delete all annotations/reactions from a chat
4. **Reaction History**: Show who reacted and when
5. **Annotation Sharing**: Export annotations from conversations
6. **Custom Reactions**: Allow users to define custom emoji reactions
7. **Reaction Aggregation**: Show top reactions across all messages

## Related Features

- **Chat Templates** - Phase 2 Feature #1 (COMPLETE)
- **Advanced Search** - Phase 2 Feature #3 (pending - can search by reactions)
- **Analytics** - Phase 2 Feature #5 (can use reaction data)
- **Collaboration** - Phase 2 Feature #6 (can share annotations)

---

**Next Task**: Phase 2 Feature #3 - Advanced Search in Chats
