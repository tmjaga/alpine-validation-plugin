# Alpine.js Validation Plugin

A lightweight, class-based form validation plugin for Alpine.js v3.  
Ported from `com.opencode.Validation` (jQuery).

---

## Installation

### NPM / bundler

```js
// app.js
import Alpine from 'alpinejs';
import AlpineValidation from './validation-alpine.js';

Alpine.plugin(AlpineValidation); // must come before Alpine.start()
Alpine.start();
```

### CDN

```html
<script src="validation-alpine.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
```

---

## Core concept

Validation rules are identified by **CSS class names** on input elements.  
Add the class to an input and the plugin handles the rest.

```html
<input class="req email" name="email" />
<!--         ^^^  ^^^^^
             |    └─ email format check
             └─ required field -->
```

The **field key** used to store errors is resolved in this order:

1. `data-field="..."` attribute
2. `name="..."` attribute
3. `id="..."` attribute

---

## Built-in rules

| Class      | Description                          | Error message                  |
| ---------- | ------------------------------------ | ------------------------------ |
| `req`      | Field is required (trims whitespace) | `"{title}" is required`        |
| `email`    | Valid email address                  | `Invalid email address`        |
| `int`      | Integer (positive or negative)       | `Invalid integer value`        |
| `float`    | Floating point number                | `Invalid floating point value` |
| `decimal`  | Decimal number                       | `Invalid decimal value`        |
| `unsigned` | No negative sign allowed             | `The value cannot be negative` |
| `nonzero`  | Value must not be zero               | `The value cannot be zero`     |

> **`req` + whitespace** — a value of `"   "` (spaces only) is treated as empty.

Multiple rules can be combined on a single input:

```html
<input class="req int unsigned" name="quantity" title="Quantity" />
<!-- required + must be integer + cannot be negative -->
```

---

## Directive: `x-validate`

Place on the `<form>` or any wrapper element that contains the validated inputs.  
Event listeners are **delegated** to this root element — no per-input attributes needed.

### Modes

#### Submit-only (default)

Validation runs only when `$validate()` is called.

```html
<form x-data x-validate @submit.prevent="$validate() && save()">
    <input class="req" name="title" title="Title" />
    <span x-text="$store.formValidation.errors.title" class="text-red-500 text-sm"></span>
    <button type="submit">Save</button>
</form>
```

#### `live: 'input'` — validate on every keystroke

Error appears immediately as the user types, from the very first character.  
Best for strict forms where instant feedback is expected.

```html
<form x-data x-validate="{ live: 'input' }" @submit.prevent="$validate() && save()">
    <input class="req int" name="age" title="Age" />
    <span x-text="$store.formValidation.errors.age" class="text-red-500 text-sm"></span>
</form>
```

#### `live: true` — blur first, then live

Error appears only after the user leaves the field for the first time (`blur`).  
After that, it updates in real time as the user corrects the value.  
Recommended default — less aggressive, better UX.

```html
<form x-data x-validate="{ live: true }" @submit.prevent="$validate() && save()">
    <input class="req email" name="email" title="Email" />
    <span x-text="$store.formValidation.errors.email" class="text-red-500 text-sm"></span>
</form>
```

#### `live: 'blur'` — blur only, no keystroke reaction

Error appears when the user leaves the field. Does not update while typing.

```html
<form x-data x-validate="{ live: 'blur' }" @submit.prevent="$validate() && save()">
    <input class="req" name="username" title="Username" />
    <span x-text="$store.formValidation.errors.username" class="text-red-500 text-sm"></span>
</form>
```

### Mode comparison

|                                 | `(none)` | `live: 'input'` | `live: true` | `live: 'blur'` |
| ------------------------------- | :------: | :-------------: | :----------: | :------------: |
| Error on first keystroke        |    ✗     |        ✓        |      ✗       |       ✗        |
| Error on blur                   |    ✗     |        ✓        |      ✓       |       ✓        |
| Updates while typing after blur |    ✗     |        ✓        |      ✓       |       ✗        |
| Error on submit                 |    ✓     |        ✓        |      ✓       |       ✓        |

---

## Magic: `$validate()`

Clears previous errors, populates `$formValidation.errors`, focuses the first invalid field, and returns `true` or `false`.

```html
<!-- Inline in template -->
<button @click.prevent="$validate() && save()">Submit</button>
```

```js
// Inside Alpine.data()
Alpine.data('myForm', () => ({
    submit() {
        if (!this.$validate()) return; // errors are already reactive
        fetch('/api/save', { method: 'POST', body: JSON.stringify(this.fields) });
    },
}));
```

---

## Magic: `$formValidation`

Shorthand for `$store.formValidation`. Available inside any Alpine component.

### Display errors

```html
<!-- Error message for a specific field -->
<span x-text="$formValidation.errors.email" class="text-red-500 text-sm"></span>

<!-- Show/hide a block when a field has an error -->
<p x-show="$formValidation.errors.price" class="text-red-500 text-sm">Please enter a valid price.</p>

<!-- Global error banner -->
<div x-show="$formValidation.hasErrors" class="rounded bg-red-50 px-4 py-3 text-red-700">Please fix the errors below before saving.</div>

<!-- Disable submit button while errors exist -->
<button :disabled="$formValidation.hasErrors" type="submit">Save</button>
```

### Touched state

`touched[fieldKey]` becomes `true` after the user leaves the field at least once.  
Useful to show errors only after interaction:

```html
<span x-show="$formValidation.touched.email && $formValidation.errors.email" x-text="$formValidation.errors.email" class="text-red-500 text-sm"> </span>
```

### Clear errors

```js
this.$formValidation.clearErrors(); // reset all errors and touched state
this.$formValidation.clearErrors('email'); // reset only the email field
```

---

## Store API: `$store.formValidation`

The same object as `$formValidation`, accessible from anywhere including outside Alpine components.

| Property / Method             | Type               | Description                                         |
| ----------------------------- | ------------------ | --------------------------------------------------- |
| `errors`                      | `Object`           | Reactive map `{ fieldKey: 'error message' }`        |
| `touched`                     | `Object`           | Reactive map `{ fieldKey: true }`                   |
| `hasErrors`                   | `boolean` (getter) | `true` if `errors` has at least one key             |
| `touch(fieldKey, el)`         | `void`             | Mark field as touched and validate it               |
| `validateField(fieldKey, el)` | `void`             | Validate one field, update `errors[fieldKey]`       |
| `validate(root?)`             | `boolean`          | Validate all fields inside `root`, return pass/fail |
| `clearErrors(field?)`         | `void`             | Clear errors (and touched) for one field or all     |
| `addRules(...ruleSets)`       | `void`             | Add or overwrite rules                              |
| `delRules(...classNames)`     | `void`             | Remove rules by class name                          |
| `flushRules()`                | `void`             | Remove all rules                                    |
| `addCheck(fn)`                | `void`             | Register a global error suppressor                  |
| `delCheck()`                  | `void`             | Remove the suppressor                               |
| `toString()`                  | `string`           | Debug summary of all registered rules               |

---

## Adding custom rules

Register custom rules in `app.js` before `Alpine.start()`:

```js
Alpine.plugin(AlpineValidation);

Alpine.store('formValidation').addRules({
    // Regexp rule
    phone: {
        regexp: /^\+?\d{10,}$/,
        msg: 'Please enter a valid phone number',
    },

    // Function rule — return truthy to trigger an error
    future: {
        func: (el) => new Date(el.value) <= new Date(),
        msg: 'Date must be in the future',
    },

    // URL
    url: {
        regexp: /^https?:\/\/.+\..+/,
        msg: 'Please enter a valid URL (must start with http:// or https://)',
    },

    // Slug
    slug: {
        regexp: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        msg: 'Only lowercase letters, numbers and hyphens allowed',
    },
});

Alpine.start();
```

```html
<input class="req phone" name="phone" title="Phone number" />
<span x-text="$formValidation.errors.phone" class="text-red-500 text-sm"></span>

<input class="req future" name="event_date" title="Event date" type="date" />
<span x-text="$formValidation.errors.event_date" class="text-red-500 text-sm"></span>
```

---

## Removing rules

### `delRules(...classNames)` — remove specific rules

Use when you want to disable one or more built-in rules for your project,
or remove a custom rule that is no longer needed.

```js
// Remove a single built-in rule
Alpine.store('formValidation').delRules('nonzero');

// Remove multiple rules at once
Alpine.store('formValidation').delRules('unsigned', 'nonzero', 'float');
```

A practical example — your app only works with text fields, so numeric rules are unnecessary:

```js
Alpine.plugin(AlpineValidation);

// Strip out all numeric rules, keep only req and email
Alpine.store('formValidation').delRules('int', 'float', 'decimal', 'unsigned', 'nonzero');

Alpine.start();
```

Another example — remove a custom rule dynamically based on user role:

```js
if (window.currentUser?.isAdmin) {
    // Admins are not required to fill in the phone field
    Alpine.store('formValidation').delRules('phone');
}
```

### `flushRules()` — remove all rules

Wipes the entire rule set. Useful when you want to start from scratch
and register only your own custom rules:

```js
Alpine.plugin(AlpineValidation);

// Remove every built-in rule
Alpine.store('formValidation').flushRules();

// Register only what your app actually needs
Alpine.store('formValidation').addRules({
    req: { req: true },
    email: { regexp: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: 'Invalid email address' },
    phone: { regexp: /^\+?\d{10,}$/, msg: 'Invalid phone number' },
});

Alpine.start();
```

---

## Global error suppressor

`addCheck` registers a function called after every rule failure.  
If it returns `true`, the error is suppressed and the field is treated as valid.

```js
// Skip validation for fields that are currently hidden
Alpine.store('formValidation').addCheck((el, rule) => {
    return el.closest('[x-show]') !== null && el.offsetParent === null;
});
```

```js
// Allow admins to bypass required fields
Alpine.store('formValidation').addCheck((el, rule) => {
    return rule.req && window.currentUser?.isAdmin === true;
});
```

Remove it when no longer needed:

```js
Alpine.store('formValidation').delCheck();
```

---

## Error label resolution for `req`

The error message includes the field label when it can be found.  
Resolution order:

1. `title="..."` attribute on the input
2. Text of `<label for="fieldId">` found in the DOM
3. Fallback generic message

```html
<!-- Uses title attribute -->
<input class="req" name="city" title="City" />
<!-- Error: "City is required" -->

<!-- Uses associated <label> -->
<label for="country">Country</label>
<input class="req" id="country" name="country" />
<!-- Error: "Country is required" -->

<!-- Fallback -->
<input class="req" name="x" />
<!-- Error: "Please fill in the required fields." -->
```

---

## Manual touch (without x-validate live mode)

If you cannot use the directive's live mode, you can attach events manually:

```html
<input name="title" class="req" @blur="$formValidation.touch('title', $el)" @input="$formValidation.touched.title && $formValidation.touch('title', $el)" />
```

Or trigger validation programmatically from JS:

```js
const el = document.getElementById('price');
this.$formValidation.validateField('price', el);
```

---

## Full example (Laravel Blade)

```html
<div x-data="albumForm()" class="space-y-6 p-6">
    <form x-validate="{ live: true }" @submit.prevent="submit">
        @csrf {{-- Title --}}
        <div class="mb-4">
            <label for="title" class="block text-sm font-bold text-gray-700"> {{ __('Album Title') }} <span class="text-red-500">*</span> </label>
            <input id="title" name="title" class="req" x-model="title" type="text" title="{{ __('Album Title') }}" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            <p x-show="$formValidation.errors.title" x-text="$formValidation.errors.title" class="mt-1 text-sm text-red-500"></p>
            @error('title')
            <p class="mt-1 text-sm text-red-500">{{ $message }}</p>
            @enderror
        </div>

        {{-- Release year --}}
        <div class="mb-4">
            <label for="year" class="block text-sm font-bold text-gray-700"> {{ __('Release Year') }} </label>
            <input id="year" name="year" class="int unsigned" x-model="year" type="text" title="{{ __('Release Year') }}" class="w-full rounded border border-gray-300 px-3 py-2 text-sm" />
            <p x-show="$formValidation.errors.year" x-text="$formValidation.errors.year" class="mt-1 text-sm text-red-500"></p>
        </div>

        {{-- Global error banner --}}
        <div x-show="$formValidation.hasErrors" class="mb-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700">{{ __('Please fix the errors above before saving.') }}</div>

        <button type="submit" :disabled="$formValidation.hasErrors" class="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{{ __('Save') }}</button>
    </form>
</div>

<script>
    Alpine.data('albumForm', () => ({
      title: @json(old('title', $album->title ?? '')),
      year:  @json(old('year',  $album->year  ?? '')),

      submit() {
        this.title = this.title.trim();
        if (!this.$validate()) return;
        this.$el.closest('form').submit();
      },
    }));
</script>
```

---

## Debugging

```js
// Print all registered rules
console.log(Alpine.store('formValidation').toString());

// Inspect current errors
console.log(Alpine.store('formValidation').errors);

// Inspect which fields have been touched
console.log(Alpine.store('formValidation').touched);
```

```html
<!-- Render errors inline for debugging -->
<pre x-text="JSON.stringify($store.formValidation.errors, null, 2)"></pre>
<pre x-text="JSON.stringify($store.formValidation.touched, null, 2)"></pre>
```
