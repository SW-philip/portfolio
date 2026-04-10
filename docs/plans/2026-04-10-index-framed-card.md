# Index Framed Card Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wrap the landing page content in a `--surface` card with a vertical bare-text nav at the bottom.

**Architecture:** Single file edit to `index.html` — restructure the `.center` div into a `.card` with two internal zones (`.card-body`, `.card-nav`), update CSS accordingly. Email footer drops below the card.

**Tech Stack:** Vanilla HTML/CSS, no build step, no dependencies.

---

### Task 1: Restructure the HTML

**Files:**
- Modify: `index.html`

**Step 1: Replace the `.center` wrapper and its contents**

Current structure:
```html
<div class="center">
  <p class="who">Who is<span class="dots" id="dots"></span></p>
  <h1 class="name">philip<span>j</span>repko.com</h1>
  <div class="divider"></div>
  <p class="answer">The answer will <em>neither surprise nor bore you.</em> It's coming though. Give it a minute.</p>
  <div class="footer">
    <a href="mailto:me@philipjrepko.com">me@philipjrepko.com</a>
  </div>
</div>
```

Replace with:
```html
<div class="card">
  <div class="card-body">
    <p class="who">Who is<span class="dots" id="dots"></span></p>
    <h1 class="name">philip<span>j</span>repko.com</h1>
    <div class="divider"></div>
    <p class="answer">The answer will <em>neither surprise nor bore you.</em> It's coming though. Give it a minute.</p>
  </div>
  <nav class="card-nav">
    <a href="/work">Work</a>
    <a href="/writing">Writing</a>
    <a href="/projects">Projects</a>
  </nav>
</div>
<p class="card-footer"><a href="mailto:me@philipjrepko.com">me@philipjrepko.com</a></p>
```

**Step 2: Verify the HTML renders without errors**

Open `index.html` in a browser. You should see the content, unstyled card structure, and nav links.

---

### Task 2: Update the CSS

**Files:**
- Modify: `index.html` (the `<style>` block)

**Step 1: Remove old classes, add new ones**

Remove these class definitions from the `<style>` block:
- `.center`
- `.footer`

Add these in their place:

```css
.card {
  max-width: 520px;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--hl-med);
  border-radius: 12px;
  overflow: hidden;
}

.card-body {
  padding: 36px 40px 40px;
}

.card-nav {
  border-top: 1px solid var(--hl-med);
  padding: 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-nav a {
  font-size: 14px;
  color: var(--subtle);
  text-decoration: none;
  transition: color 0.15s;
}

.card-nav a:hover {
  color: var(--text);
}

.card-footer {
  margin-top: 20px;
  font-size: 13px;
  color: var(--muted);
  text-align: left;
}

.card-footer a {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--hl-med);
}

.card-footer a:hover {
  color: var(--subtle);
}
```

**Step 2: Update body layout**

The body currently aligns to center. Change it to align the card + footer as a column:

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: var(--base);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 28px;
}
```

**Step 3: Verify layout in browser**

- Card should be visible as a framed panel on the `--base` background
- Nav links should stack vertically inside the card, separated from the content by a border
- Email should appear below the card, small and muted
- Animated dots on "Who is" should still work
- Gold `j` in the name should still be gold

---

### Task 3: Commit

```bash
git add index.html
git commit -m "feat: frame index landing in surface card with vertical nav"
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-04-10-index-framed-card.md`.**

**1. Subagent-Driven (this session)** — dispatch a fresh subagent per task, review between tasks

**2. Parallel Session (separate)** — open new session with executing-plans, batch execution with checkpoints

Which approach?
