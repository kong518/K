# Security Spec for 복지기록노트

## Data Invariants
- A record must belong to the authenticated user (`userId == request.auth.uid`).
- `title` must be a non-empty string (max 500 chars).
- `disabilityTypes` must be a list of strings (max 15 items).
- `completed` must be a boolean.
- `createdAt` is immutable and must be set to server time on creation.
- `updatedAt` must be updated to server time on every modification.
- Users can only read/list their own records.

## The Dirty Dozen Payloads (Expected: PERMISSION_DENIED)

1. **Spoofing Owner**: Create record with `userId: "other_user_id"`.
2. **Missing Title**: Create record without `title`.
3. **Invalid Disability Types**: Create record with `disabilityTypes: "Physical"` (string instead of list).
4. **Change Owner**: Update record to change `userId`.
5. **Change Creation Date**: Update record to change `createdAt`.
6. **Stealing Record**: Read record where `userId != auth.uid`.
7. **Mass Scraping**: List all records without `where('userId', '==', auth.uid)`.
8. **Type Confusion (completed)**: Set `completed: "true"` (string).
9. **ID Poisoning**: Create record with `recordId` as a 2KB junk string.
10. **Schema Corruption**: Add `isVerified: true` to a record update.
11. **Time Travel**: Set `createdAt` to a year in the future.
12. **Unauthorized Deletion**: Delete record where `userId != auth.uid`.
