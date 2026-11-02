# Beatbox design rules

## Icons

Use **Iconoir** (`@iconoir/vue`) for all UI icons. The app root wraps with `IconoirProvider` in `app/app.vue`.

- Import named icons: `import { Xmark, Settings, Plus } from '@iconoir/vue'`
- Size with Tailwind classes on the component: `<Xmark class="w-4 h-4" />` or `w-5 h-5`
- Prefer existing usages for the same action (close → `Xmark`, settings → `Settings`, add → `Plus`)
- Do **not** paste one-off inline `<svg>` paths for standard UI actions
- Do **not** invent parallel icon components for icons Iconoir already has
- Exceptions: brand/platform marks that are not in Iconoir (for example `IconApple`, `IconWindows`), and decorative illustrations

Browse icons: https://iconoir.com

## Text links

All interactive text links use the shared `.text-link` utility (`app/assets/css/tailwind.css`).

- Default color is **amber/gold**: `text-amber-400`, hover `text-amber-300`
- Use `class="text-link"` (add `no-underline` when the link should not be underlined)
- Do **not** leave links on grey (`text-neutral-400` / `text-neutral-300`) while other links are gold
- Do **not** reinvent link colors per screen; rely on `.text-link` so Sign in, Forgot password, Change, fair use, and similar actions match
- Exceptions only when the action is destructive (`text-red-400`) or intentionally quiet secondary copy (document why inline)
