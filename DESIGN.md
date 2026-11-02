# Beatbox design rules

## Controls: Button, links, icon hits

Use the right primitive for the interaction:

| Need | Use |
|------|-----|
| Actions / CTAs (submit, cancel, mode switch with button chrome) | `Button` (`app/components/Button.vue`) |
| Text links (navigate or inline “forgot password” style links) | `<a>` or `NuxtLink` with `.text-link` |
| Icon-only hit targets (close, clear, menu) | A plain `<div class="p-2">` (or `<button type="button" class="p-2">` when a real button is required for forms/a11y) wrapping an Iconoir icon |

### Button

- Always use `Button` for labeled actions. Variants: `primary`, `secondary`, `ghost`, `danger`, `link`.
- Do **not** use raw `<button class="text-link …">` for full-width or chrome actions. Prefer `variant="ghost"` (or `link` when it must look like a text link but remains an action).
- Example: “Don’t have an account?” / “Already have an account?” / “Back to Sign In” → `<Button variant="ghost" class="w-full">`.

### Text links

- Navigational or inline copy links use `<a>` / `NuxtLink` with `.text-link`.
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
