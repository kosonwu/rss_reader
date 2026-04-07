# UI Coding Standards

## Component Library

**Only shadcn/ui components** may be used for UI elements in this project. Do not create custom components under any circumstances.

- Use components from shadcn/ui (e.g., `Button`, `Card`, `Badge`, `Input`, `Dialog`, etc.)
- Install additional shadcn/ui components via `npx shadcn@latest add <component>` as needed
- Do not build wrapper components, custom primitives, or one-off styled elements

## Date Formatting

All dates must be formatted using **date-fns**. Do not use `Date.prototype.toLocaleDateString`, `Intl.DateTimeFormat`, or any other date formatting approach.

### Format

Dates must be rendered in the following style:

```
1st Sep 2025
2nd Aug 2025
3rd Jan 2026
4th Jun 2024
```

### Implementation

Use the `do` (ordinal day), `MMM` (short month), and `yyyy` (4-digit year) format tokens:

```ts
import { format } from "date-fns";

format(date, "do MMM yyyy");
// e.g. "1st Sep 2025", "22nd Mar 2026"
```
