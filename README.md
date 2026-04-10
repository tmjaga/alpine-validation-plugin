# alpine-validation-plugin

![license](https://img.shields.io/github/license/tmjaga/alpine-validation-plugin)
![alpine](https://img.shields.io/badge/alpine.js-v3-blue)

A lightweight, class-based form validation plugin for [Alpine.js](https://alpinejs.dev) v3.

---

## Installation

### NPM

```bash
npm install alpine-validation-plugin
```

```js
import Alpine from 'alpinejs';
import AlpineValidation from 'alpine-validation-plugin';

Alpine.plugin(AlpineValidation);
Alpine.start();
```

### CDN

```html
<script src="https://cdn.jsdelivr.net/gh/tmjaga/alpine-validation-plugin/src/validation-alpine.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
```

---

## Quick start

Add CSS class names matching the built-in rules to your inputs.  
Errors are stored reactively and keyed by the input's `name` / `id` / `data-field`.

```html
<form x-data x-validate="{ live: true }" @submit.prevent="$validate() && save()">

  <input class="req email" name="email" title="Email" />
  <span x-text="$validation.errors.email" class="text-red-500 text-sm"></span>

  <input class="req int unsigned" name="age" title="Age" />
  <span x-text="$validation.errors.age" class="text-red-500 text-sm"></span>

  <p x-show="$validation.hasErrors" class="text-red-600">
    Please fix the errors above.
  </p>

  <button type="submit" :disabled="$validation.hasErrors">Save</button>

</form>
```

---

## Built-in rules

| Class | Description |
|---|---|
| `req` | Required (whitespace-only counts as empty) |
| `email` | Valid email address |
| `int` | Integer (positive or negative) |
| `float` | Floating point number |
| `decimal` | Decimal number |
| `unsigned` | No negative sign allowed |
| `nonzero` | Value must not be zero |

---

## Live validation modes

| Directive | When errors appear |
|---|---|
| `x-validate` | On submit only |
| `x-validate="{ live: 'input' }"` | From the first keystroke |
| `x-validate="{ live: true }"` | On blur, then update while typing |
| `x-validate="{ live: 'blur' }"` | On blur only |

---

## Documentation

Full API reference, all options, custom rules, and examples:  
**[docs/validation-alpine.md](docs/validation-alpine.md)**

---

## License

MIT
