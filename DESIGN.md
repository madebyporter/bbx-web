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
