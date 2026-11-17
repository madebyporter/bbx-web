# Beatbox design rules

## Controls: Button, links, icon hits

Use the right primitive for the interaction:

| Need | Use |
|------|-----|
| Actions / CTAs (submit, cancel, mode switch with button chrome) | `Button` (`app/components/Button.vue`) |
| Text links (navigate or inline “forgot password” style links) | `<a>` or `NuxtLink` with `.text-link` |
| Action that should *look* like a link (no button chrome) | `Button variant="link"` (gold, same as `.text-link`) |
| Icon-only hit targets (close, clear, menu) | A plain `<div class="p-2">` (or `<button type="button" class="p-2">` when a real button is required for forms/a11y) wrapping an Iconoir icon |

### Button hierarchy

Pick the lightest chrome that still makes the job obvious. Don’t stack several equal-weight buttons in one cluster when a link would do.

| Level | Variant | When to use | Examples |
|-------|---------|-------------|----------|
| **Primary** | `primary` (amber fill) | The one thing that needs to be done **now** on this surface | Sync selected, Save Changes, Generate video (when blocking sync) |
| **Secondary** | `secondary` (neutral fill) | What comes **after** the primary, or a solid alternate path that still needs button chrome | Connect platform, Generate cover, Cancel with filled weight |
| **Tertiary** | `ghost` (+ optional outline border) | **AI / delegated** helpers, quiet chrome, or low-priority actions beside a primary | Analyze / Detect (CircleSpark), Done / Change / Edit outlined, Disconnect |
| **Link** | `link` or `.text-link` | Paragraph / inline actions, or when you **don’t** want another button in a crowded group | View on YouTube, View plans, Settings / Support in nav |

Rules of thumb:

- One primary per drawer/footer/section whenever possible.
- Prefer **link** over another ghost/secondary button when the action sits next to existing button chrome and is not an analyze/detect action.
- **AI analyze / detect is always the same tertiary control:** outlined `ghost` + Iconoir `CircleSpark`, fixed **square** hit target (`size-10 !p-0`) for BPM, Key, Mood, and any future audio analyze. Do not use a gold text link for analyze/detect.
- Destructive confirms stay `danger` (not in the hierarchy table above).

### Button

- Always use `Button` for labeled actions. Variants: `primary`, `secondary`, `ghost`, `danger`, `link`.
- Do **not** use raw `<button class="text-link …">` for full-width or chrome actions. Prefer `variant="ghost"` for quiet chrome, or `variant="link"` when it must look like a gold text link but remains an action.
- Example: “Don’t have an account?” / “Already have an account?” / “Back to Sign In” → `<Button variant="ghost" class="w-full">` (auth mode switch) or `variant="link"` when gold link styling is intended.

### Text links

- Navigational or inline copy links use `<a>` / `NuxtLink` with `.text-link`.
- Action-as-link (same gold look, stays a `<button>`) → `Button variant="link"`.
- Default color is **amber/gold**: `text-amber-400`, hover `text-amber-300` (defined in `app/assets/css/tailwind.css`).
- Add `no-underline` when the link should not be underlined.
- Do **not** leave some links grey and others gold.
- Exceptions: destructive (`text-red-400`) or intentionally quiet secondary copy (document why inline).

### Icon hit targets

- Prefer a simple padded wrapper, not `Button`, for icon-only controls.
- Pattern (AuthModal close):

```html
<div
  role="button"
  tabindex="0"
  class="p-2 cursor-pointer"
  aria-label="Close"
  @click="…"
>
  <Xmark class="size-5 text-white" />
</div>
```

- Use Iconoir inside (`@iconoir/vue`). Size with `size-5` / `w-4 h-4`.
- Do **not** paste one-off inline `<svg>` paths for standard UI actions.
- Exceptions: brand/platform marks not in Iconoir (`IconApple`, `IconWindows`), and decorative illustrations.

Browse icons: https://iconoir.com
