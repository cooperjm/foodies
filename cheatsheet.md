# Foodies Project Cheatsheet

This cheatsheet covers the specific technologies, patterns, and conventions used in the **Foodies** codebase.

## 🛠 Tech Stack

- **Framework**: [Next.js 14 (App Router)](https://nextjs.org/docs)
- **UI Library**: React 18
- **Database**: SQLite (via `better-sqlite3`)
- **Styling**: CSS Modules & Global CSS
- **Utilities**: `slugify` (URL slugs), `xss` (Sanitization)

---

## 📂 Project Structure

- **`app/`**: App Router pages and layouts.
    - `page.js`: The UI for a route.
    - `layout.js`: Shared UI (wrappers, html/body tags).
    - `loading-out.js`: Loading UI (wrapped in Suspense automatically).
    - `error.js`: Error UI boundary.
    - `not-found.js`: 404 UI.
    - `[slug]/`: Dynamic route segments (e.g., `app/meals/[mealSlug]`).
- **`components/`**: Reusable React components.
    - `meals/`: Meal-specific components (grids, items).
- **`lib/`**: Backend logic and utilities.
    - `meals.js`: Database queries.
    - `actions.js`: Server Actions for form mutations.
- **`public/`**: Static assets (images).
- **`meals.db`**: SQLite database file.

---

## 🚀 Next.js Patterns

### 1. Routing & Pages
Routes are defined by the folder structure in `app/`.

```javascript
// app/meals/page.js -> /meals
export default function MealsPage() {
  return <h1>Meals</h1>;
}

// app/meals/[mealSlug]/page.js -> /meals/burger
export default function MealDetails({ params }) {
  return <h1>Meal: {params.mealSlug}</h1>;
}
```

### 2. Data Fetching (Server Components)
Fetch data directly in async components. No `useEffect` needed.

```javascript
// app/meals/page.js
import { getMeals } from '@/lib/meals';

export default async function MealsPage() {
  const meals = await getMeals(); // Direct DB call
  return <MealsGrid meals={meals} />;
}
```

### 3. Loading States (Suspense)
Wrap slow parts in `<Suspense>` or use `loading.js`.

```javascript
// app/meals/page.js
import { Suspense } from 'react';

<Suspense fallback={<p>Loading meals...</p>}>
  <Meals />
</Suspense>
```

### 4. Server Actions (Mutations)
Handle form submissions on the server.

```javascript
// lib/actions.js
'use server'; // Directive required

export async function shareMeal(formData) {
  const meal = {
    title: formData.get('title'),
    // ...
  };
  await saveMeal(meal);
  revalidatePath('/meals'); // Purge cache
  redirect('/meals');
}
```

```javascript
// Component using the action
<form action={shareMeal}>
  <input name="title" />
  <button>Share</button>
</form>
```

### 5. Metadata (SEO)
Export a `metadata` object from `page.js` or `layout.js`.

```javascript
export const metadata = {
  title: 'All Meals',
  description: 'Browse delicious meals.',
};
```

### 6. Dynamic Metadata
For pages with dynamic routes (e.g., `[slug]`), use `generateMetadata`.

```javascript
// app/meals/[mealSlug]/page.js
export async function generateMetadata({ params }) {
  const meal = getMeal(params.mealSlug);
  
  if (!meal) {
    notFound();
  }

  return {
    title: meal.title,
    description: meal.summary,
  };
}
```

---

## 📝 Form Handling & Mutations

### 1. Server Actions with State (`useFormState`)
Used for handling form submissions and displaying server-side validation errors.

```javascript
// app/meals/share/page.js
'use client';
import { useFormState } from 'react-dom';
import { shareMeal } from '@/lib/actions';

export default function SharePage() {
  const [state, formAction] = useFormState(shareMeal, { message: null });

  return (
    <form action={formAction}>
      {/* ...inputs... */}
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

> [!NOTE]
> **React 19 Update**: In newer versions (React 19+), `useFormState` is replaced by **`useActionState`**.
> `useActionState` also returns an `isPending` boolean as the third value, often removing the need for `useFormStatus` if you are in the same component.
>
> ```javascript
> const [state, formAction, isPending] = useActionState(action, initialState);
> ```

### 2. Pending State (`useFormStatus`)
Must be used in a **child component** of the form to access status.

```javascript
// components/meals/meals-form-submit.js
'use client';
import { useFormStatus } from 'react-dom';

export default function SubmitButton() {
  const { pending } = useFormStatus();
  return <button disabled={pending}>{pending ? 'Submitting...' : 'Share'}</button>;
}
```

### 3. Input Validation
Validation happens on the server in the action.

```javascript
// lib/actions.js
function isInvalidText(text) {
  return !text || text.trim() === '';
}

export async function shareMeal(prevState, formData) {
  const meal = { ... };

  if (isInvalidText(meal.title) || ... ) {
    return { message: 'Invalid input.' };
  }
  // ... save logic
}
```

---

## 🧩 Custom Components

### Image Picker
A client component pattern for handling file inputs with previews.
- Uses a hidden `<input type="file">`.
- Uses `FileReader` to generate a preview URL.
- Triggered by a custom button via `ref`.

```javascript
// components/meals/image-picker.js
'use client';
import { useRef, useState } from 'react';

export default function ImagePicker({ name }) {
  const [pickedImage, setPickedImage] = useState();
  const imageInput = useRef();

  function handlePick() {
    imageInput.current.click();
  }

  function handleImageChange(event) {
    const file = event.target.files[0];
    // ... FileReader logic to setPickedImage
  }

  return (
    <>
      <input 
        type="file" 
        ref={imageInput} 
        onChange={handleImageChange} 
        name={name} 
        className={classes.input} // hidden via CSS
      />
      <button type="button" onClick={handlePick}>Pick Image</button>
    </>
  );
}
```

Styles are scoped to the component using `[name].module.css`.

```css
/* app/page.module.css */
.header {
  color: red;
}
```

```javascript
// app/page.js
import classes from './page.module.css';

<header className={classes.header}>...</header>
```

Global styles are in `app/globals.css`.

---

## 💾 Database (SQLite)

Located in `lib/meals.js`. Uses `better-sqlite3` for synchronous queries (fast in Node context) but wrapped in async functions for simulation or future-proofing in this project.

```javascript
import sql from 'better-sqlite3';
const db = sql('meals.db');

// Fetch all
db.prepare('SELECT * FROM meals').all();

// Fetch one
db.prepare('SELECT * FROM meals WHERE slug = ?').get(slug);

// Insert
db.prepare('INSERT INTO meals ...').run(meal);
```

---

## 🖼 Image Handling

- Users upload images via forms.
- Images are stored in `public/images` (filesystem).
- Path stored in DB: `/images/filename.png`.
- **Note**: In production (Vercel/Netlify), filesystem storage won't persist. You'd need S3/Cloudinary.
