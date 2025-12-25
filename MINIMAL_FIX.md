# Minimal Friend Request Fix

## Changes Made:

### File: server.js
**Line 246**: Changed `res.redirect('/dashboard')` to `res.status(200).json({ success: true })`
- Returns JSON response instead of redirect for AJAX requests

### File: views/dashboard.ejs

1. **Added data attributes** (line ~258):
   - Added `data-user-id` to form and button for identification

2. **JavaScript functionality** (lines ~268-295):
   - On page load: Restores button states from localStorage
   - On submit: Prevents default, sends fetch request, updates button text
   - Saves to localStorage to persist across reloads

## How It Works:
1. User clicks button → Button immediately changes to "Friend Request Sent"
2. Request sent to backend (async, no waiting)
3. Saved to localStorage → Persists after reload
4. On reload → Script checks localStorage and restores "sent" state

Bare minimum functionality - button jumps directly to "sent" state.