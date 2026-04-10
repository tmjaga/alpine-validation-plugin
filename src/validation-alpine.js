/**
 * Alpine.js Validation Plugin
 * Converted from com.opencode.Validation (jQuery)
 *
 * Usage:
 *   1. Register the plugin before Alpine.start():
 *        Alpine.plugin(AlpineValidation)
 *
 *   2. Add x-validate to your form (and x-data on the same or a parent element).
 *
 *   3. Add CSS class names matching the built-in rules to your inputs.
 *      Field errors are keyed by the input's name / id / data-field attribute.
 *
 * Quick example:
 *   <form x-data x-validate="{ live: true }" @submit.prevent="$validate() && save()">
 *     <input class="req email" name="email" title="Email" />
 *     <span x-text="$store.validation.errors.email"></span>
 *     <button type="submit">Save</button>
 *   </form>
 */

const AlpineValidation = (Alpine) => {

  // ── Built-in rules ───────────────────────────────────────────────────────────
  //
  // Each rule is identified by a CSS class name applied to the input element.
  // A rule object may contain:
  //   req    {boolean}  — field is required (whitespace-only counts as empty)
  //   regexp {RegExp}   — value must match this pattern
  //   func   {Function} — custom check: receives the element, returns truthy on error
  //   msg    {string}   — error message shown when regexp or func fails
  //
  let rules = {
    req:      { req: true },
    float:    { regexp: /^[-+]?\d*\.?\d+$/,                msg: 'Invalid floating point value' },
    int:      { regexp: /^[-+]?\d+$/,                      msg: 'Invalid integer value' },
    unsigned: { regexp: /^[^-]*$/,                         msg: 'The value cannot be negative' },
    nonzero:  { func: (el) => parseFloat(el.value) === 0,  msg: 'The value cannot be zero' },
    decimal:  { regexp: /^[-+]?((\d+(\.\d+)?)|(\.\d+))$/,  msg: 'Invalid decimal value' },
    email:    { regexp: /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/, msg: 'Invalid email address' },
  };

  let additionalCheck = null;

  // ── Internal helper ──────────────────────────────────────────────────────────
  // Runs all matching rules against a single element.
  // Returns the first error message string, or null if the field is valid.
  function checkElement(el) {
    const value = el.value;

    for (const [className, rule] of Object.entries(rules)) {
      if (!el.classList.contains(className)) continue;

      let error = null;

      if (!value || (rule.req && !value.trim())) {
        // req rule: whitespace-only value is treated as empty
        if (rule.req) {
          const labelText =
            el.title ||
            (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim());
          error = labelText ? `${labelText} is required` : 'Please fill in the required fields.';
        }
      } else if (rule.regexp && !rule.regexp.test(value)) {
        error = rule.msg || 'Invalid value.';
      } else if (rule.func) {
        const result = rule.func(el);
        if (result) error = rule.msg || result;
      }

      if (error) {
        // additionalCheck can suppress the error by returning true
        if (additionalCheck && additionalCheck(el, rule)) continue;
        return error; // stop at first error per field
      }
    }

    return null;
  }

  // ── Alpine store: $store.validation ─────────────────────────────────────────
  Alpine.store('validation', {

    /** Reactive map of field errors: { fieldKey: 'Error message', ... } */
    errors:  {},

    /** Tracks which fields the user has already interacted with (touched). */
    touched: {},

    /** True when at least one error is present. */
    get hasErrors() {
      return Object.keys(this.errors).length > 0;
    },

    // ── Live validation ────────────────────────────────────────────────────────

    /**
     * Mark a field as touched and validate it immediately.
     *
     * Called automatically by the x-validate directive when live mode is active.
     * Can also be called manually when you need fine-grained control:
     *
     *   <input name="title"
     *          @blur="$validation.touch('title', $el)"
     *          @input="$validation.touched.title && $validation.touch('title', $el)" />
     *
     * @param {string} fieldKey  — name / id / data-field value of the input
     * @param {Element} el       — the input element
     */
    touch(fieldKey, el) {
      this.touched[fieldKey] = true;
      this.validateField(fieldKey, el);
    },

    /**
     * Validate a single field and update errors[fieldKey].
     * Useful when you want to re-check one field programmatically:
     *
     *   this.$validation.validateField('price', document.getElementById('price'));
     *
     * @param {string} fieldKey
     * @param {Element} el
     */
    validateField(fieldKey, el) {
      delete this.errors[fieldKey];
      const error = checkElement(el);
      if (error) this.errors[fieldKey] = error;
    },

    // ── Full validation (submit) ───────────────────────────────────────────────

    /**
     * Validate all rule-bearing fields inside root.
     * Clears previous errors, populates errors{} with all failures,
     * focuses the first invalid field, and returns true/false.
     *
     * Called automatically by $validate(). Rarely needed directly.
     *
     * @param {Element} root  — defaults to document
     * @returns {boolean}
     */
    validate(root = document) {
      // Clear all previous errors
      Object.keys(this.errors).forEach((k) => delete this.errors[k]);

      let valid        = true;
      let firstInvalid = null;

      for (const [className] of Object.entries(rules)) {
        root.querySelectorAll(`.${className}`).forEach((el) => {
          const fieldKey = el.dataset.field || el.name || el.id || null;
          const error    = checkElement(el);

          if (error) {
            // Keep the first error per field key
            if (fieldKey && !this.errors[fieldKey]) this.errors[fieldKey] = error;
            if (!firstInvalid) firstInvalid = el;
            valid = false;
          }
        });
      }

      // Focus the first invalid field; switch tab if a tabber is present
      if (firstInvalid) {
        const tabber = root.querySelector('#element-tabber');
        if (tabber) {
          const tab = firstInvalid.closest('.tabbertab');
          if (tab) {
            const tabs  = [...tabber.querySelectorAll(':scope > .tabbertab')];
            const index = tabs.indexOf(tab);
            if (index !== -1 && tabber._tabber) tabber._tabber.tabShow(index);
          }
        }
        firstInvalid.focus();
        if (typeof firstInvalid.select === 'function') firstInvalid.select();
      }

      return valid;
    },

    // ── Error management ──────────────────────────────────────────────────────

    /**
     * Clear errors (and touched state) for one field or all fields.
     *
     *   $validation.clearErrors()          // clear everything
     *   $validation.clearErrors('email')   // clear only email
     *
     * @param {string|null} field
     */
    clearErrors(field = null) {
      if (field) {
        delete this.errors[field];
        delete this.touched[field];
      } else {
        Object.keys(this.errors).forEach((k)  => delete this.errors[k]);
        Object.keys(this.touched).forEach((k) => delete this.touched[k]);
      }
    },

    // ── Rule management ───────────────────────────────────────────────────────

    /**
     * Add or overwrite one or more rules.
     *
     *   $store.validation.addRules({
     *     phone: { regexp: /^\+?\d{10,}$/, msg: 'Invalid phone number' },
     *     slug:  { regexp: /^[a-z0-9-]+$/, msg: 'Only lowercase letters, numbers and hyphens' },
     *   });
     *
     * @param {...Object} ruleSets
     */
    addRules(...ruleSets) {
      ruleSets.forEach((set) => Object.assign(rules, set));
    },

    /**
     * Remove rules by class name.
     *
     *   $store.validation.delRules('nonzero', 'unsigned');
     *
     * @param {...string} classNames
     */
    delRules(...classNames) {
      classNames.forEach((name) => delete rules[name]);
    },

    /** Remove all rules. */
    flushRules() {
      rules = {};
    },

    /**
     * Register a global additional check.
     * Called after a rule fails; if it returns true the error is suppressed.
     *
     *   $store.validation.addCheck((el, rule) => {
     *     // e.g. skip validation for hidden fields
     *     return el.closest('[hidden]') !== null;
     *   });
     *
     * @param {Function} check  — (element, rule) => boolean
     */
    addCheck(check) {
      if (typeof check !== 'function') throw new Error('The check is not a function');
      if (check.length !== 2)          throw new Error('The check function must have two parameters');
      additionalCheck = check;
    },

    /** Remove the global additional check. */
    delCheck() {
      additionalCheck = null;
    },

    /** Return a human-readable summary of all registered rules (useful for debugging). */
    toString() {
      return Object.entries(rules)
        .map(([className, rule]) => {
          const parts = [];
          if (rule.req)    parts.push('Required');
          if (rule.regexp) parts.push(`RegExp: ${rule.regexp}`);
          if (rule.func)   parts.push('Has check function');
          if (rule.msg)    parts.push(`Error Message: ${rule.msg}`);
          return `.${className}: ${parts.join('; ')}`;
        })
        .join('\n');
    },
  });

  // ── x-validate directive ──────────────────────────────────────────────────────
  //
  // Place on the form (or any wrapper element) that contains the validated inputs.
  //
  // Modes:
  //   x-validate                      — submit-only validation
  //   x-validate="{ live: true }"     — validate on blur + re-validate on every keystroke
  //   x-validate="{ live: 'blur' }"   — validate on blur only (no keystroke re-validation)
  //
  // Event listeners are delegated to the root element, so no per-input attributes needed.
  //
  Alpine.directive('validate', (el, { expression }, { evaluateLater, effect, cleanup }) => {
    el._alpineValidationRoot = el;

    if (!expression) return;

    const store      = Alpine.store('validation');
    const getOptions = evaluateLater(expression);
    let   live       = false;

    const onBlur = (e) => {
      const target = e.target;
      // Ignore elements that don't carry any validation rule class
      if (!Object.keys(rules).some((c) => target.classList.contains(c))) return;
      const field = target.dataset.field || target.name || target.id;
      if (!field) return;
      store.touch(field, target);
    };

    const onInput = (e) => {
      if (live === 'blur') return; // blur-only mode — ignore keystrokes
      const target = e.target;
      if (!Object.keys(rules).some((c) => target.classList.contains(c))) return;
      const field = target.dataset.field || target.name || target.id;
      if (!field) return;
      // live: true     — validate only after the field was blurred at least once
      // live: 'input'  — validate immediately on every keystroke
      if (live !== 'input' && !store.touched[field]) return;
      store.validateField(field, target);
    };

    effect(() => {
      getOptions((options) => {
        live = options?.live ?? false;
        if (live) {
          // Delegate to root — no need to attach listeners to individual inputs
          el.addEventListener('blur',  onBlur,  { capture: true });
          el.addEventListener('input', onInput, { capture: true });
        }
      });
    });

    // Remove listeners when the component is destroyed
    cleanup(() => {
      el.removeEventListener('blur',  onBlur,  { capture: true });
      el.removeEventListener('input', onInput, { capture: true });
    });
  });

  // ── $validate() magic ─────────────────────────────────────────────────────────
  //
  // Walks up the DOM to find the nearest x-validate root, then runs full validation.
  // Returns true if all fields pass, false otherwise.
  //
  // Usage in templates:
  //   <button @click.prevent="$validate() && save()">Submit</button>
  //
  // Usage in Alpine.data components:
  //   submit() {
  //     if (!this.$validate()) return;
  //     // ... send data
  //   }
  //
  Alpine.magic('validate', (el) => {
    return () => {
      let root = el;
      while (root && !root.hasAttribute('x-validate')) {
        root = root.parentElement;
      }
      return Alpine.store('validation').validate(root || document);
    };
  });

  // ── $validation magic ─────────────────────────────────────────────────────────
  //
  // Shorthand for $store.validation. Available inside any Alpine component.
  //
  // Usage:
  //   $validation.errors.email        — error message for the email field
  //   $validation.hasErrors           — true if any error is present
  //   $validation.touched.email       — true if email field was blurred at least once
  //   $validation.clearErrors()       — reset all errors and touched state
  //   $validation.clearErrors('email')— reset only the email field
  //
  Alpine.magic('validation', () => Alpine.store('validation'));
};

// ── Export ────────────────────────────────────────────────────────────────────
export default AlpineValidation;

// CDN / global <script> fallback — auto-registers when Alpine is present
if (typeof window !== 'undefined') {
  window.AlpineValidation = AlpineValidation;
  document.addEventListener('alpine:init', () => {
    if (window.Alpine) window.Alpine.plugin(AlpineValidation);
  });
}
