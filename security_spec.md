# Security Spec for Foma Velo Firestore Rules

## 1. Data Invariants
- Each user can only read and write their own data under `/users/{userId}/`.
- Anonymous or unauthenticated users have NO read or write permissions to any user collections.
- `userId` path variable must match `request.auth.uid`.
- Activity entities must contain required numerical fields (dateMillis, movingTimeSec, etc.) and not exceed string length limits.

## 2. Dirty Dozen Test Payloads
1. Unauthenticated write to `/users/user123/activities/act1` -> DENIED
2. User A writing to User B's `/users/userB/activities/act1` -> DENIED
3. User A reading User B's `/users/userB/settings/user_settings` -> DENIED
4. Activity payload with non-string `name` -> DENIED
5. Activity payload with `name` length > 300 chars -> DENIED
6. User B deleting User A's activity -> DENIED
7. User updating activity with invalid path ID -> DENIED
8. Unauthenticated list query on `/users/user123/activities` -> DENIED
9. User attempting to write ghost field on activity -> DENIED
10. Settings write missing required field `ftp` -> DENIED
11. Settings write with negative FTP -> DENIED
12. Global catch-all wildcard read on random collection -> DENIED
