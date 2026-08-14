# Coding Standard

## 1. General

Code must favour:

- clarity;
- explicitness;
- small responsibilities;
- testability;
- predictable behaviour;
- defensive validation.

---

# 2. Naming

Classes:

PascalCase

Examples:

MatterManager
DocumentBuilder
KnowledgeEngine

Methods:

camelCase

Examples:

createMatter()
findDocument()
validateMatter()

Constants:

UPPER_SNAKE_CASE where appropriate.

---

# 3. Imports

Use explicit imports.

Avoid hidden global dependencies.

---

# 4. Error Handling

Do not silently swallow errors.

Bad:

try {
    operation();
} catch (error) {}

Preferred:

try {
    operation();
} catch (error) {
    logger.error(error);
    throw error;
}

---

# 5. Validation

Validate at boundaries.

User input must never be trusted.

Imported data must be validated.

AI output must be validated.

Database data must be validated where entering domain logic.

---

# 6. Security

Never hard-code:

- passwords;
- API keys;
- access tokens;
- encryption secrets;
- private keys.

Never log secrets.

Never expose credentials in exports.

---

# 7. Database

Business logic must not contain raw database logic unless the class is explicitly a persistence component.

Prefer:

Service / Manager
→ Repository
→ Storage / Database

---

# 8. AI

Prompts must separate trusted instructions from untrusted content.

AI output must be treated as untrusted until validated.

---

# 9. Immutability

Prefer immutable values for:

- results;
- audit records;
- configuration;
- value objects;
- event payloads.

---

# 10. Comments

Comments should explain:

- why something exists;
- important business constraints;
- security implications;
- non-obvious decisions.

Do not comment obvious syntax.

---

# 11. Testing

New business functionality should have tests covering:

- normal case;
- validation failure;
- permission failure;
- missing data;
- edge case;
- error handling.

---

# 12. Backward Compatibility

Existing public interfaces should not be changed unnecessarily.

When an interface must change:

1. identify consumers;
2. update implementations;
3. update tests;
4. update documentation.

---

# 13. No Circular Dependencies

Modules should have clear dependency direction.

Avoid circular imports between:

- managers;
- engines;
- repositories;
- domain models.

---

# 14. Privacy

Sensitive client information must only be exposed to components that require it.

Logs and exports must be sanitised.

---

# 15. Destructive Operations

Delete operations must be explicit.

Where appropriate, prefer:

- archive;
- soft delete;
- versioning;
- audit record.

