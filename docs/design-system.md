# VRPI HRMS - Design System & UI/UX Guidelines

## 1. Brand Identity & Principles
VRPI HRMS delivers a clean, high-density enterprise SaaS user experience inspired by modern human resource workflows.
- **Clarity Over Clutter**: Restrained use of color, purposeful whitespace, and strong visual hierarchy.
- **Low Overhead**: Avoid excessive blur filters, heavy gradients, or 60fps animations that degrade performance on low-end Android hardware.
- **Accessibility**: Minimum WCAG 2.1 AA contrast across all text and interactive states.
- **Touch Ergonomics**: All interactive elements on mobile adhere to minimum 48x48 dp touch targets.

---

## 2. Color Palette & Design Tokens

### 2.1 Primary & Brand Colors
- **Primary Brand**: `#1E3A8A` (Deep Sapphire Blue)
- **Primary Hover**: `#1D4ED8` (Royal Blue)
- **Primary Subtle / Tint**: `#EFF6FF` (Ice Blue)
- **Primary Foreground**: `#FFFFFF`

### 2.2 Neutral & Surface Tones
- **Background (Canvas)**: `#F8FAFC` (Light Slate) / Dark: `#0F172A`
- **Surface (Card / Sheet)**: `#FFFFFF` / Dark: `#1E293B`
- **Border**: `#E2E8F0` / Dark: `#334155`
- **Text Primary**: `#0F172A` / Dark: `#F8FAFC`
- **Text Muted**: `#64748B` / Dark: `#94A3B8`

### 2.3 Semantic Status Indicators
- **Success (Present / Approved)**:
  - Text/Icon: `#059669` (Emerald 600)
  - Background Tint: `#ECFDF5` (Emerald 50)
  - Border: `#A7F3D0`
- **Warning (Late / Half-Day / Pending)**:
  - Text/Icon: `#D97706` (Amber 600)
  - Background Tint: `#FFFBEB` (Amber 50)
  - Border: `#FDE68A`
- **Destructive (Absent / Rejected / Cancelled)**:
  - Text/Icon: `#DC2626` (Red 600)
  - Background Tint: `#FEF2F2` (Red 50)
  - Border: `#FECACA`
- **Info (Shift / Announcement)**:
  - Text/Icon: `#2563EB` (Blue 600)
  - Background Tint: `#EFF6FF` (Blue 50)

---

## 3. Typography Scale

Using system fonts with fallbacks (`Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`):

| Token | Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `display` | 32px (2rem) | 40px | 700 Bold | Welcome banner, Top-level KPIs |
| `h1` | 24px (1.5rem) | 32px | 700 Bold | Page headers, Major modal titles |
| `h2` | 20px (1.25rem) | 28px | 600 SemiBold | Section headers, Drawer titles |
| `h3` | 16px (1rem) | 24px | 600 SemiBold | Card headers, Table column headers |
| `body` | 14px (0.875rem) | 20px | 400 Regular | Data tables, form labels, general copy |
| `caption` | 12px (0.75rem) | 16px | 500 Medium | Timestamps, metadata, badges |

---

## 4. Spacing & Elevation

Base 4px increment scale:
- `space-1`: 4px
- `space-2`: 8px
- `space-3`: 12px
- `space-4`: 16px (Standard mobile screen padding)
- `space-5`: 20px
- `space-6`: 24px (Standard desktop card padding)
- `space-8`: 32px
- `space-12`: 48px

**Shadows**:
- `shadow-sm`: `0 1px 2px 0 rgb(0 0 0 / 0.05)` (Cards, form inputs)
- `shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.1)` (Dropdowns, popovers)
- `shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1)` (Modals, bottom sheets)

---

## 5. Mobile Component Guidelines (React Native)
1. **Touch Targets**: All pressables (`TouchableOpacity`, `Pressable`, `Button`) must have `minHeight: 48` and `minWidth: 48`.
2. **Offline Banner**: Sticky top banner displaying network failure with amber background when `NetInfo.isConnected === false`.
3. **Form Fields**: Clear labels, inline error messages, keyboard avoiding views on Android.
4. **Attendance Action Card**: High contrast, one-tap check-in/out button with immediate loading feedback and timestamp display.
