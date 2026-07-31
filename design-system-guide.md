# 🎨 Portable & Modular Design System Guide

This guide describes how to integrate and use the unified **Portable Design System** in both **Hugo static sites** and **React frontend applications**. 

The system is engineered using a **three-layer design token taxonomy** (Primitives ➔ Semantics ➔ Components) [77, 78] and implements **Tactile Brutalism** alongside **Web Sustainability Guidelines (WSG)** [274, 298].

---

## 🚀 Architectural Foundations

### 1. Three-Layer Token Taxonomy
To prevent naming chaos, this system avoids flattening style definitions [77]:
*   **Primitives:** Holds raw values (e.g., `--wp-color-acid-neon: #d4ff00;`) [77, 78]. These have no usage context.
*   **Semantics:** Maps primitives to intent or role (e.g., `--color-accent-primary: var(--wp-color-acid-neon);`) [77, 78]. Mode shifts (like toggling theme palettes) happen at this layer [79].
*   **Components:** Refers only to semantic roles for specific UI parts (e.g., `--btn-bg-primary: var(--color-accent-primary);`) [77, 78].

### 2. Dark-First Sustainability (WSG)
Internet emissions are a major driver of global tech footprint [310]. This design system defaults to a **dark-first default (`#000000` background)** to match modern device hardware. True black on OLED screens shuts pixels completely off, saving up to **47% of device battery consumption** during user sessions [287, 291].

### 3. High-Accessibility Standards (WCAG 2.2 AA)
*   **Touch Targets:** Interactive elements (buttons, inputs, checkboxes) maintain a **44px height or boundary** [93, 94]. This surpasses the strict WCAG 2.2 AA minimum floor (24x24px) to support comfortable, finger-friendly layouts [93, 94].
*   **Keyboard Navigation:** Accessible focus indicator outlines (`focus-visible`) are pre-styled using high-contrast neon accents [101].
*   **High-Contrast Semantics:** Clear visual boundaries and contrast are provided natively without relying on color-only cues [213].

---

## 🛠 Integration across Platforms

Because the design system is written in standard **CSS custom properties (CSS variables)**, the assets are completely portable. There is no proprietary translation layer or heavy JS dependency required.

### 🌐 Integrating into Hugo (Static Site)
To drop this design system into a Hugo site:
1. Copy `design-system.css` into your Hugo site's `assets/css/` directory.
2. In your base template (e.g., `layouts/partials/head.html`), pull it in using Hugo asset pipelines:
   ```html
   {{ $style := resources.Get "css/design-system.css" | minify | fingerprint }}
   <link rel="stylesheet" href="{{ $style.Permalink }}" integrity="{{ $style.Data.Integrity }}">
   ```

### ⚛️ Integrating into React (Frontend App)
To pull this into React:
1. Place the `design-system.css` file in your source folder (e.g., `src/styles/design-system.css`).
2. Import it once in your app entrance file (`index.js`, `App.js`, or `main.tsx`):
   ```javascript
   import './styles/design-system.css';
   ```
3. Use the semantic utility classes directly in your JSX class lists (`className`).

---

## 📦 Copy-and-Paste Component library

### 1. Buttons
Provides ergonomic touch areas and tactile isometric depress animations on active state [246, 250].

#### HTML (Hugo)
```html
<button class="btn btn-primary" aria-label="Sign In">Sign In</button>
<button class="btn btn-secondary" aria-label="Cancel">Cancel</button>
```

#### React
```jsx
export const Button = ({ variant = 'primary', children, ...props }) => (
  <button className={`btn btn-${variant}`} {...props}>
    {children}
  </button>
);
```

---

### 2. Inputs & Form Controls
All elements are strictly styled to ensure focus readability and avoid layout-shifting [386].

#### HTML (Hugo)
```html
<div class="form-group">
  <label class="form-label" for="email">Email Address</label>
  <input class="input-field" type="email" id="email" placeholder="you@example.com" required>
</div>

<label class="checkbox-group" for="consent">
  <input type="checkbox" id="consent" required>
  <span>I accept the terms & conditions</span>
</label>
```

#### React
```jsx
export const InputField = ({ label, id, ...props }) => (
  <div className="form-group">
    {label && <label className="form-label" htmlFor={id}>{label}</label>}
    <input className="input-field" id={id} {...props} />
  </div>
);
```

---

### 3. Bento Layout & Cards
The Bento Grid (modular block layout) works by dividing dense content into neat quadrants [125]. This creates "cognitive chunking" [122] and enforces clean visual boundaries [122].

#### HTML (Hugo)
```html
<div class="bento-grid">
  <!-- Large 2x2 Hero Feature -->
  <div class="card card-brutalist bento-col-8">
    <span class="card-subtitle">Featured Dashboard</span>
    <h3 class="card-title">Transcription Activity</h3>
    <p>All transcribing processes execute in our secure, encrypted cloud enclave.</p>
  </div>
  
  <!-- Supporting 1x1 Detail -->
  <div class="card bento-col-4">
    <span class="card-subtitle">Status</span>
    <h3 class="card-title">Cloud Native</h3>
    <p>Always connected to our secure cloud enclave.</p>
  </div>
</div>
```

#### React
```jsx
export const BentoGrid = ({ children }) => (
  <div className="bento-grid">{children}</div>
);

export const Card = ({ title, subtitle, children, brutalist = false }) => (
  <div className={`card ${brutalist ? 'card-brutalist' : ''}`}>
    {subtitle && <span className="card-subtitle">{subtitle}</span>}
    {title && <h3 className="card-title">{title}</h3>}
    {children}
  </div>
);
```

---

### 4. Tables
Ideal for showing structured metadata, clinical lists, or transaction histories [125].

#### HTML (Hugo)
```html
<div class="table-container">
  <table class="table-brutalist">
    <thead>
      <tr>
        <th>Scope</th>
        <th>Audit Token</th>
        <th>Last Activity</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Admin</td>
        <td><code>73d93c03...</code></td>
        <td>July 21, 2026</td>
      </tr>
    </tbody>
  </table>
</div>
```

---

### 5. Alerts
Provides semantic feedback blocks styled for screen readers [165].

#### HTML (Hugo)
```html
<div class="alert alert-error" role="alert">
  <div class="alert-content">
    <div class="alert-title">System Alert</div>
    <span>Connection to clinical database has degraded [5].</span>
  </div>
</div>
```

#### React
```jsx
export const Alert = ({ type = 'info', title, message }) => (
  <div className={`alert alert-${type}`} role="alert">
    <div className="alert-content">
      {title && <div className="alert-title">{title}</div>}
      <span>{message}</span>
    </div>
  </div>
);
```

---

## ♻️ Best Practices for Maintainability

1.  **Do Not Bypass Tokens:** Avoid inline hardcoded hexadecimal colors or arbitrary margins. Always use `var(--color-bg-primary)` or `var(--wp-space-4)`. This guarantees unified rendering.
2.  **Zero Duplication (DRY):** Never duplicate a stylesheet module specifically for mobile view [284]. Instead, rely on standard mobile responsive flow properties (like `flex-direction: column` or CSS Grid configurations) mapped to our semantic spacing [284].
3.  **Optimize SVG Assets:** When importing icons, use `<svg>` nodes styled with our `.icon` CSS helper. This allows colors to map contextually to `--color-accent-primary` or `currentColor` natively.
