## Relevant Files

- `tailwind.config.js` - To configure the design system color tokens for use with Tailwind's utility classes.
- `src/app/page.tsx` - Contains multiple buttons for todo actions that need responsive styles.
- `src/app/components/AuthForm.tsx` - Contains the main authentication buttons.
- `src/app/components/Toast.tsx` - Contains a close button that needs styling.
- `src/app/components/ErrorBoundary.tsx` - Contains buttons for error recovery.
- `src/app/components/ConflictResolver.tsx` - Contains buttons for managing data conflicts.
- `src/app/components/OfflineStatusIndicator.tsx` - Contains buttons related to offline actions.
- `src/app/components/SyncProgress.tsx` - Contains buttons for sync management.
- `src/app/components/SyncStatusIndicator.tsx` - Contains buttons for manual sync actions.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Configure Tailwind Theme for Design System Tokens
  - [x] 1.1 Audit `tailwind.config.js` to see which color tokens from `Design_System.md` are missing.
  - [x] 1.2 Add all required color tokens (`bg`, `text`, `border`, `brand`, `state`) to the `theme.extend.colors` object in `tailwind.config.js`.
- [x] 2.0 Implement Responsive Styles in `src/app/page.tsx`
  - [x] 2.1 Identify all button elements in `src/app/page.tsx`.
  - [x] 2.2 Classify each button (Primary, Secondary, Ghost, etc.) and apply the correct `hover:` and `active:` classes according to the design system.
- [x] 3.0 Implement Responsive Styles in Core Components (`AuthForm`, `Toast`, `ErrorBoundary`)
  - [x] 3.1 Update buttons in `src/app/components/AuthForm.tsx`.
  - [x] 3.2 Update buttons in `src/app/components/Toast.tsx`.
  - [x] 3.3 Update buttons in `src/app/components/ErrorBoundary.tsx`.
- [x] 4.0 Implement Responsive Styles in Sync & Status Components (`ConflictResolver`, `OfflineStatusIndicator`, `SyncProgress`, `SyncStatusIndicator`)
  - [x] 4.1 Update buttons in `src/app/components/ConflictResolver.tsx`.
  - [x] 4.2 Update buttons in `src/app/components/OfflineStatusIndicator.tsx`.
  - [x] 4.3 Update buttons in `src/app/components/SyncProgress.tsx`.
  - [x] 4.4 Update buttons in `src/app/components/SyncStatusIndicator.tsx`.
- [x] 5.0 Final Visual Audit and Verification
  - [x] 5.1 Manually verify all buttons in the application to ensure hover and active states work as expected and match the design system. 