# Ephemeral Diary - Project TODO

## Core Features
- [x] Database schema for messages with timestamps and expiration tracking
- [x] Backend API endpoint to create anonymous messages
- [x] Backend API endpoint to retrieve active messages (not expired)
- [x] Backend API endpoint to delete individual messages
- [x] Automatic cleanup job to remove expired messages every minute
- [x] Frontend message posting form with text input
- [x] Frontend real-time message feed display
- [x] Countdown timer display for each message (hours:minutes:seconds)
- [x] Visual time-remaining indicator (progress bar or fading effect)
- [x] Elegant minimalist UI design reflecting ephemeral nature
- [x] Footer section with Instagram handle 1_s44d as clickable link
- [x] Responsive design for mobile and desktop

## Testing & Quality
- [x] Vitest unit tests for message creation logic
- [x] Vitest unit tests for message expiration logic
- [x] Manual testing of message posting and deletion
- [x] Manual testing of countdown timer accuracy
- [x] Manual testing of automatic cleanup job

## Deployment
- [x] Final checkpoint and project delivery


## Optional User Authentication (New Feature)
- [x] Update database schema: add userId to messages table, add user preferences table
- [x] Backend API endpoint for user dashboard (get user's messages with expiration times)
- [x] Backend API endpoint for notification preferences (enable/disable notifications)
- [ ] Backend API endpoint to send expiration notifications (24 hours before expiry)
- [x] Frontend: Add login/logout button in header
- [x] Frontend: Create user dashboard page showing message history
- [x] Frontend: Add notification settings page
- [ ] Frontend: Display "Posted by you" indicator on user's own messages
- [ ] Frontend: Show expiration notification alerts
- [x] Vitest tests for user dashboard and notification logic


## Design Enhancement & Engagement Features
- [x] Update database schema: add likes/dislikes table and CAPTCHA verification tracking
- [x] Backend API endpoint for Like/Dislike functionality
- [ ] Backend API endpoint for CAPTCHA token verification
- [x] Require authentication for posting (protectedProcedure)
- [x] Enhance overall UI design with better colors, typography, and layout
- [ ] Add CAPTCHA verification widget before posting
- [x] Implement Like/Dislike buttons on message cards
- [x] Display like/dislike counts on each message
- [x] Prevent unauthenticated users from posting (show login prompt)
- [ ] Vitest tests for Like/Dislike and CAPTCHA logic

## OAuth & Error Handling Improvements
- [x] Enhanced OAuth callback error logging
- [x] Added environment variable validation
- [x] Improved context creation logging
- [x] Better error messages for debugging
