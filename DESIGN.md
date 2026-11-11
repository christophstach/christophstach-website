# Design

The design brief for christophstach.de. Read it before changing or adding UI, and follow it
over any general design advice. `CLAUDE.md` covers how the CSS is organized; this file covers
how things should look and why.

## Subject

The site of a senior software engineer, read by recruiters and hiring engineers who decide
quickly. Its job is to make the CV easy to find, read and download. The desk is a private
tool for one person, who edits CV content and checks how it prints.

## Direction: Terminal

An engineering console: monospaced structure, a phosphor-green accent, charcoal surfaces and
a faint graph-paper grid. The terminal is the site's one bold idea, so everything around it
stays quiet. It shows in the structure and small wording, never as a costume: no scanlines,
typing effects, ASCII art or fake boot sequences. Content stays easy to read.

There are three surfaces, and each uses the direction differently:

| Surface                     | Character                                           | Theme          |
| --------------------------- | --------------------------------------------------- | -------------- |
| Public (`/`, `/curriculum`) | The most expressive: terminal window, shell wording | Light and dark |
| Desk (`/desk`)              | A calm work tool: panels, forms, plain wording      | Light and dark |
| Paper (CV, cover letter)    | A printed document: the same fonts and green only   | Always light   |

## Color

Components use only the semantic aliases in `src/assets/css/tokens.css`, so they theme
automatically. No hex values or primitives in components; the paper is the one exception.

| Role                    | Alias                             | Light     | Dark      |
| ----------------------- | --------------------------------- | --------- | --------- |
| Page                    | `--color-bg`                      | `#f5f7f7` | `#080b0a` |
| Panels, raised areas    | `--color-surface`                 | `#e9eded` | `#0f1514` |
| Headings                | `--color-heading`                 | `#0f1514` | `#f5f7f7` |
| Text                    | `--color-text`, `-soft`, `-muted` | `#283133` | `#d4dadb` |
| Links, actions, success | `--color-accent`                  | `#087a5e` | `#34e6a3` |
| Warnings, errors        | `--color-signal`                  | `#a14a08` | `#ffb454` |
| Delete actions          | `--color-danger`                  | `#b4232a` | `#ff7b7b` |

- Green is the only accent. It marks what can be acted on and what is fine, so keep it rare.
- Amber is only for what needs attention, never for decoration.
- Red is only for actions that delete something, so it reads as a warning before the click.
- Don't add a color for a new meaning. If these don't cover it, use text.
- Small text in the accent, the signal or the danger color must clear 4.5:1 on both `--color-bg` and
  `--color-surface`.

## Type

- **JetBrains Mono** carries structure: headings, labels, buttons, navigation, metadata.
- **IBM Plex Sans** carries reading: paragraphs, CV text, form input.
- Use the `--text-*` scale and the weights the fonts load (400 to 700).
- No all-caps labels on the site. The printed CV is the one place that uses them.
- The PDF can only use these two fonts: the serverless Chromium has no system fonts.

## Layout

- Public pages sit in `.container` (`--container-max`, 68rem), with reading text narrower
  (`--content-max`, 46rem). Desk pages use `.desk-page`.
- Space comes from the `--space-*` scale. Corners stay crisp (`--radius-sm` to `--radius-lg`);
  only small tags and status dots are fully round.
- Structure comes from hairline borders and rules (`--color-border`, `-strong`, `--color-rule`),
  not shadows. A control that only its outline shows (an input, an outline button, a step
  strip) takes `--color-border-control`, which keeps 3:1 against the page. Shadows are for what floats above the page (menus, the save bar, a dragged row,
  the hero terminal) and the paper sheet in the desk, never for ordinary panels.
- Everything works from a phone upward; the shared breakpoints are 40rem and 48rem. Long text
  must not push a column past the screen (`minmax(0, 1fr)`, `overflow-wrap`).

### In the desk, content sits on panels

The graph-paper background is for the page, not for reading on. Lists, stats, forms and empty
states all sit in a `.panel` above the background. Only the page head (`.desk-head`: path,
title, one line) sits directly on it.

- Form sections: `DeskFormSection`.
- Lists: `.panel__rows` with `.panel-row`, where each whole row is a link.
- Nothing to list: `.panel__empty`, inside the panel, so the page keeps its shape.
- Page checks: `.desk-status`, a dot and a short text in the tone of the result.

## Components

Reuse before inventing, and move a pattern to `components.css` once two components share it.

| Need                   | Use                                                         |
| ---------------------- | ----------------------------------------------------------- |
| Main action            | `.button--primary`, at most one per view                    |
| Other actions          | `.button--outline` (its `$` is a prompt), `.button--icon`   |
| Icon-only control      | `.icon-button` with an `aria-label`                         |
| Link in text           | `.text-link`                                                |
| Public section heading | `.section-label` (its `//` is a code comment)               |
| Technology tag         | `.chip--accent`                                             |
| Role of a CV           | `.role-tag`                                                 |
| Form field             | `.field`, `.field__label`, `.input`                         |
| Icons                  | Tabler, inlined as components in `src/components/icons.tsx` |

## Wording

Words stay plain and specific. The terminal voice has fixed places:

- **Public pages** may speak shell where it reads as a command and still makes sense:
  `$ whoami`, `./curriculum`, `stats --summary`. Actual content is ordinary sentences.
- **The desk** is sentence case and says what things do: "New CV", "No CVs yet."
  Its only shell touches are the `~/desk` path and lowercase panel titles.
- **Paper** has no terminal wording at all.
- Errors say what went wrong and how to fix it. Don't apologize.

## Motion

- On load, the page's first elements rise in once (`.reveal`, staggered with `animation-delay`).
  Below the fold, `.reveal--scroll` ties the same movement to scrolling.
- Everything else only answers an action: `--transition-fast` on hover and focus.
- Respect reduced motion. `base.css` covers ordinary animations; scroll-driven ones need their
  own override, as `.reveal--scroll` has.
- The desk doesn't animate on load: it's a work tool.

## Accessibility

- Keyboard focus is always visible (`:focus-visible` in `base.css`); don't remove it. Where a
  row fills its container, move the outline inside (`outline-offset: -2px`).
- Check every change in light and dark.
- Every layout has the skip link, and decorative icons and marks are `aria-hidden`.

## Paper

The CV and cover letters print from `.cv-paper`, with their own fixed palette and px sizes,
because they're laid out for A4. All CVs render through `CvDocument.tsx`, so a CV
changes content, never the design. A CV fills its pages with its layout steps; don't tune
the CSS spacing to move a page break.

## Before you finish

1. Does it use semantic tokens and existing classes?
2. In the desk, does the content sit on a panel?
3. Does it work in light, in dark, and at phone width?
4. Does anything added only decorate? Take it out.
