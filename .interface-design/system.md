# Compass Cloud Design System

## Direction & Feel

A developer-focused task management interface. Markdown-native, designed to work alongside terminals and Claude Code agents. Text-forward, dense, scannable. The UI reads like a well-structured document, not a colorful SaaS product.

**Who:** Solo developers and small technical teams. They live in editors and terminals. When they open the web UI, they want to see the shape of their work quickly, then get back to building.

**Core verb:** Scan, triage, organize. Not "explore" or "discover."

**Feel:** Quiet, professional, high-contrast text on restrained surfaces. Closer to Linear than Asana. The interface gets out of the way.

---

## Typography

**Typeface:** Plus Jakarta Sans (Google Fonts). Geometric sans-serif with a slight softness. Chosen for readability at small sizes and clean rendering on screens.

**Hierarchy:**
- Page titles: `text-2xl font-bold tracking-tight` or `text-3xl` for hero contexts
- Section headers: `text-sm font-semibold` (used in sidebar nav, collapsible group headers, column headers)
- Body text: `text-sm` (default)
- Metadata / IDs: `font-mono text-xs text-muted-foreground` (task keys like T00001, timestamps)
- Labels: `text-xs font-medium`
- Muted copy: `text-sm text-muted-foreground`

**Display IDs** always render in monospace (`font-mono text-xs`) to reinforce their code-like nature.

---

## Color Tokens

### Light Mode
| Token | Value | Role |
|---|---|---|
| `--background` | `#fafbfd` | Page canvas. Cool off-white, not pure white |
| `--foreground` | `#0f172a` | Primary text. Slate-900 |
| `--card` | `#ffffff` | Elevated surfaces (cards, popovers) |
| `--card-foreground` | `#0f172a` | Text on cards |
| `--primary` | `#1e40af` | Deep sapphire. Actions, links, focus rings |
| `--primary-foreground` | `#ffffff` | Text on primary surfaces |
| `--secondary` | `#f1f5f9` | Subtle background fills (filters, badges) |
| `--secondary-foreground` | `#0f172a` | Text on secondary |
| `--muted` | `#f1f5f9` | Disabled backgrounds, count pills |
| `--muted-foreground` | `#64748b` | Secondary text, placeholders. Slate-500 |
| `--accent` | `#eff6ff` | Hover states, active nav items. Blue-50 tint |
| `--accent-foreground` | `#0f172a` | Text on accent |
| `--destructive` | `#ef4444` | Delete actions, error states |
| `--border` | `#e2e8f0` | All borders. Slate-200 |
| `--input` | `#e2e8f0` | Input borders (same as border) |
| `--ring` | `#1e40af` | Focus ring color (matches primary) |

### Dark Mode
| Token | Value | Role |
|---|---|---|
| `--background` | `#0b1120` | Deep navy canvas |
| `--foreground` | `#f1f5f9` | Primary text. Slate-100 |
| `--card` | `#111827` | Elevated surfaces. Gray-900 |
| `--primary` | `#2563eb` | Brighter sapphire for dark backgrounds |
| `--secondary` | `#1e293b` | Subtle fills. Slate-800 |
| `--muted` | `#1e293b` | Same as secondary |
| `--muted-foreground` | `#94a3b8` | Secondary text. Slate-400 |
| `--accent` | `#1e293b` | Hover states (same hue as secondary) |
| `--destructive` | `#991b1b` | Muted red for dark mode |
| `--border` | `#1e293b` | Borders. Slate-800 |

### Sidebar Tokens
Sidebar has its own token set to allow subtle differentiation from the main canvas:
- Light: `--sidebar: #f8fafc` (slightly cooler than background)
- Dark: `--sidebar: #0f172a` (slightly lighter than background)
- Matching accent, primary, border, and ring tokens scoped to sidebar

### Semantic Colors (Inline, Not Tokenized)
Status and priority badges use direct Tailwind colors, not design tokens:
- **Open:** green-100/800 (light), green-900/200 (dark)
- **In Progress:** amber-100/800 (light), amber-900/200 (dark)
- **Closed:** gray-100/600 (light), gray-800/400 (dark)
- **P0:** red-100/800
- **P1:** orange-100/800
- **P2:** yellow-100/800
- **P3:** blue-100/800

### Chart Colors
5 chart tokens for data visualization:
- Light: `#2563eb`, `#0d9488`, `#334155`, `#f59e0b`, `#f97316`
- Dark: `#3b82f6`, `#34d399`, `#e2e8f0`, `#a78bfa`, `#fb923c`

---

## Depth Strategy

**Borders-first with minimal shadow.** Cards use `border` + `shadow-sm`. Premium and clean, but through restraint rather than embellishment.

- Cards: `rounded-xl border shadow-sm` on `bg-card`
- Kanban cards: `rounded-md border shadow-sm` with `hover:shadow-md transition-shadow`
- Drag overlay: `border shadow-lg` for lift during drag
- Popovers/dropdowns: Inherit from shadcn (border + shadow)
- Kanban columns: `rounded-lg bg-muted/50 p-2` (tinted surface, no border)
- Drop zones: `bg-primary/10` on hover (primary tint feedback)

**No mixed strategies.** Shadows are only used on cards and overlays. Everything else uses borders or background shifts for hierarchy.

---

## Spacing

**Base unit: 4px (Tailwind default).** Multiples used throughout:

| Context | Values Used |
|---|---|
| Micro (icon gaps) | `gap-1` (4px), `gap-1.5` (6px), `gap-2` (8px) |
| Component internal | `gap-2` (8px), `gap-3` (12px), `px-3 py-2` (12px/8px) |
| Card padding | `py-6 px-6` (24px) |
| Section spacing | `space-y-1` (4px) for dense lists, `space-y-4` (16px) for sections |
| Page padding | `px-4` (16px) topbar, `px-6` (24px) content areas |
| Major separation | `py-16` (64px) empty states, `py-20` (80px) landing sections |

---

## Border Radius

**Scale based on `--radius: 0.625rem` (10px):**

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Inputs, small buttons, badges (via `rounded-md`) |
| `--radius-md` | 8px | Standard components |
| `--radius-lg` | 10px | Cards use `rounded-xl` |
| Badges | `rounded-full` | Pill shape for status/priority badges |

General rule: larger containers get rounder corners. Badges are always pills. Inputs and buttons use `rounded-md`.

---

## Layout

### Shell
- **Sidebar + Topbar + Content** layout
- Sidebar: left rail, `w-56` expanded / `w-14` collapsed, `border-r`, `bg-sidebar`
- Topbar: `h-14`, `border-b`, `bg-background`, fixed at top
- Content: fills remaining space
- Collapse state persisted to `localStorage`

### Sidebar Navigation
- 4 top-level items: Dashboard, Projects, Members, Settings
- Context-aware: shows project sub-items (Overview, Tasks, Board, Documents) when inside a project
- Sub-items nest under Projects with `border-l` indent
- Active state: `bg-sidebar-accent font-medium`
- Inactive: `text-sidebar-foreground/70` with `hover:bg-sidebar-accent/50`
- Icons: Lucide, `h-4 w-4` for main items, `h-3.5 w-3.5` for sub-items

### Topbar
- Left: mobile menu trigger (hidden on md+)
- Right: search button, org switcher, theme toggle, user avatar dropdown
- Search: outline button with `Cmd+K` kbd hint (hidden on mobile, icon-only fallback)

### Mobile
- Sidebar hidden, replaced by Sheet (drawer) triggered from topbar hamburger
- Search collapses to icon button
- Breakpoint: `md` (768px) for sidebar visibility

---

## Component Patterns

### Buttons (CVA variants)
| Variant | Usage |
|---|---|
| `default` | Primary actions (New Task, Save) |
| `outline` | Secondary actions (Search, Load more) |
| `ghost` | Tertiary actions (sidebar toggle, icon buttons, inline actions) |
| `destructive` | Delete, remove |
| `secondary` | Alternative secondary |
| `link` | Inline text links |

**Sizes:** `default` (h-9), `sm` (h-8), `xs` (h-6), `lg` (h-10), `icon` (9x9), `icon-sm` (8x8), `icon-xs` (6x6)

### Badges
- shadcn Badge with `outline` variant as the primary style for status/priority
- Status badges: `outline` variant + semantic color classes
- Epic marker: `secondary` variant, inline with task title
- Count pills: `rounded-full bg-muted px-2 py-0.5 text-xs font-medium` (not using Badge component)

### Data Display

**Task List (DataTable):**
- Column-based table with sortable headers
- Columns: ID (mono), Title, Status (badge), Priority (badge), Created (date)
- Row click navigates to detail view
- Sort indicators: ArrowUp/Down/UpDown icons, `h-3 w-3`

**Task Row (Inline, used in grouped views):**
- `flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 cursor-pointer`
- Key (mono, w-24) | Title (flex-1, truncate) | Status badge | Priority badge
- Draggable via @dnd-kit

**Kanban Card:**
- `rounded-md border bg-card p-3 shadow-sm hover:shadow-md`
- Top row: key (mono) + priority badge
- Title: `text-sm font-medium line-clamp-2`
- Optional epic breadcrumb: `text-xs text-muted-foreground truncate`

### Collapsible Sections
- Used for status groups and epic groups in task list
- Trigger: `flex items-center gap-2 w-full py-2 px-3 rounded-md hover:bg-muted/50`
- ChevronRight icon rotates 90deg when open
- Count pill on the right side
- Epic sections include a Progress bar (`w-20 h-1.5`) with completion fraction

### Empty States
- Centered, `py-16`
- Icon: `h-10 w-10 text-muted-foreground`
- Title: `text-lg font-semibold`
- Description: `text-sm text-muted-foreground max-w-sm`
- Optional action button below

### Markdown Editor
- Three modes: Edit, Split, Preview (toggle buttons)
- Monaco Editor for editing, react-vscode-markdown for preview
- Fixed 300px height
- Theme-aware (vs-dark / light)
- Border wraps the editor area

### Search (Command Palette)
- `Cmd+K` global shortcut
- cmdk-based CommandDialog
- Debounced search (300ms)
- Results grouped by type: Projects, Tasks, Documents
- Each result shows type icon + key (mono) + title + metadata

### Filters
- shadcn Select components side by side
- Status filter: All / Open / In Progress / Closed
- Group by: None / Status / Epic
- GroupBy preference persisted per-project in localStorage

### Pagination
- "Load more" button, centered, `variant="outline"`
- Cursor-based (infinite scroll pattern with manual trigger)

---

## Interaction Patterns

### Drag and Drop
- @dnd-kit with PointerSensor (5px activation distance)
- Optimistic UI: local state overrides during drag, cache update on drop
- Drag overlay: elevated card/row with `shadow-lg`
- Drop zone feedback: `bg-primary/10` or `bg-muted` tint
- Dragging item: `opacity: 0.3-0.4`

### Navigation
- Sidebar links for primary navigation
- Row clicks for entity navigation (task list -> task detail)
- Command palette for cross-entity search
- Back navigation via browser/sidebar (no explicit back buttons observed)

### State Management
- React Query for server state (with query key conventions: `["tasks", projectKey, status]`)
- useState for local UI state (filters, form open, collapse)
- localStorage for persistence (sidebar collapse, groupBy preference)
- Optimistic updates for drag-and-drop operations
- Toast notifications (Sonner) for error feedback

---

## Icon System

**Library:** Lucide React
**Sizes:** `h-4 w-4` standard, `h-3.5 w-3.5` sub-nav, `h-3 w-3` inline/sort indicators, `h-5 w-5` feature cards, `h-10 w-10` empty states

Key icons used:
- Navigation: LayoutDashboard, FolderKanban, Users, Settings, Eye, ListTodo, Columns3, FileText
- Actions: Plus, Menu, Search, LogOut, PanelLeft, PanelLeftClose
- Data: ArrowUp, ArrowDown, ArrowUpDown, ChevronRight, Loader2
- Types: Folder (project), CheckSquare (task), FileText (document)
- Feature: GitCommitHorizontal, GitBranch, Building2, Terminal

---

## Animation

**Philosophy: instant navigation, micro-animation only.** Page transitions should feel immediate. No fade-ins, no slide-ups, no staggered content reveals. Hard swaps between pages. Premium but fast. Animation is reserved for small, functional feedback on interactive elements.

- `transition-colors` on interactive elements (nav items, task rows)
- `transition-shadow` on kanban cards (hover shadow change)
- `transition-all duration-200` on sidebar width change
- `transition-transform` on chevron rotation
- Theme transitions disabled (`disableTransitionOnChange`) to prevent flash
- Drag: CSS.Transform from @dnd-kit, opacity fade on dragging item
- Loading: `animate-spin` on Loader2 icon
- **No page-level transitions.** No layout animations. No content fade-ins. Pages swap hard.

---

## Providers & Infrastructure

- **ThemeProvider** (next-themes): `attribute="class"`, `defaultTheme="system"`, `enableSystem`
- **QueryProvider** (React Query)
- **AuthProvider** (custom context)
- **Toaster** (Sonner) at root level
- **cn()** utility: `clsx` + `tailwind-merge` for safe class composition

---

## File Organization

```
src/components/
  ui/           # shadcn base components (19 files). Do not modify patterns here.
  layout/       # Shell components: sidebar, topbar, org-switcher
  tasks/        # Task-specific: list, kanban, filters, badges, forms, group views
  editor/       # Markdown editor + renderer
  documents/    # Document list + form
  projects/     # Project list + form
  members/      # Member list, invite form, invitation list
  settings/     # Org settings, API key management
  search/       # Command palette
  shared/       # Reusable: DataTable, EmptyState, Pagination, LoadingSkeleton, ConfirmDialog
  versions/     # Version history + diff viewer
  orgs/         # Create org dialog
```

---

## What NOT to Do

- Do not add new color tokens. Use the existing palette. Semantic colors (status, priority) use inline Tailwind classes, not custom tokens.
- Do not use shadows heavier than `shadow-md` except on drag overlays (`shadow-lg`).
- Do not change the sidebar to a different background color from the canvas. It uses `bg-sidebar` with a `border-r` separator.
- Do not use gradients on interactive surfaces. The only gradient is the landing page hero background fade.
- Do not introduce a second icon library. Lucide only.
- Do not use `rounded-lg` on cards. Cards are `rounded-xl`. Kanban cards and inline elements are `rounded-md`.
- Do not add animation libraries. Use Tailwind transitions. The only exception is @dnd-kit's transform utilities.
