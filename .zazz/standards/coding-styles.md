# Coding Styles

- Prettier for formatting
- ESLint for linting
- Consistent naming: camelCase for JS, snake_case for DB columns

## UPPER_SNAKE_CASE for status codes and enum-like values

Status codes, priorities, and other enum-like values use **UPPER_SNAKE_CASE** (e.g. `TO_DO`, `IN_PROGRESS`, `QA`, `COMPLETED`, `LOW`, `MEDIUM`, `FEATURE`, `BUG_FIX`). These values are stored in the DB, used in the API, and double as i18n translation keys.

## i18n (translatable items)

- Use the `useTranslation` hook (`client/src/hooks/useTranslation.js`): `translateStatus`, `translateDeliverableStatus`, `translatePriority`, `translateDeliverableType`
- Translation keys follow `{domain}.{category}.{CODE}`: `tasks.statuses.TO_DO`, `deliverables.statuses.IN_PROGRESS`, `tasks.priorities.HIGH`, `deliverables.types.FEATURE`
- Fallback: if a key is missing, the raw code is shown (e.g. `t(\`tasks.statuses.${status}\`, status)`)
- Locale files: `client/src/i18n/locales/*.json`; API `TRANSLATIONS` table stores JSON per language
