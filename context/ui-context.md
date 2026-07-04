# UI Context

> **This project is backend-first.** The storefront (`apps/web`) exists to exercise the API. This file is deliberately minimal — and that minimalism is a spec, not an omission.

## Theme

Light only. Plain, unstyled-feeling utility UI — closer to a technical demo than a brand. Whitespace, system font, black text on white. If a page looks "designed", it has gone too far.

## Colors

Tailwind defaults only — no custom tokens, no brand palette.

| Role            | Class                     |
| --------------- | ------------------------- |
| Page background | `bg-white`                |
| Surface/cards   | `bg-gray-50`              |
| Primary text    | `text-gray-900`           |
| Muted text      | `text-gray-500`           |
| Action buttons  | `bg-gray-900 text-white`  |
| Border          | `border-gray-200`         |
| Error           | `text-red-600`            |
| Success         | `text-green-600`          |
| Sold out        | `text-gray-400` + disabled |

## Typography

System font stack (Tailwind default `font-sans`). No webfonts, no display faces.

## Border Radius

`rounded-md` everywhere interactive, `rounded-lg` for cards. Don't think about it beyond that.

## Component Library

**None.** No shadcn, no Radix. Plain JSX + Tailwind utilities. Components live in `apps/web/components/` only when used on 2+ pages.

## Layout Patterns

- Every page: centered `max-w-4xl mx-auto px-4` column, simple top nav (store name + cart count)
- Product list: `grid grid-cols-2 md:grid-cols-3 gap-4`
- Cart/checkout: single column form, native inputs
- Feedback: inline text messages (no toasts, no modals)

## Icons

None, or plain text/emoji if something needs a marker. Do not add an icon library.

## HARD CONSTRAINTS

- ❌ No Framer Motion, GSAP, Lenis, or any animation library — no CSS animations beyond default hover/focus states
- ❌ No design polish passes. The storefront is DONE when the flow works, not when it looks good
- ⏱ Storefront total effort budget: ≤ 20% of the project. If it's exceeding that, stop and cut scope
