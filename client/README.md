# React + Vite

## Task Blaster Client — Quick Commands

Start the client (from anywhere):

```
npm --prefix /Users/michael/Dev/task-blaster/task-graph-mvp/client run dev
```

Alternative using cd:

```
cd /Users/michael/Dev/task-blaster/task-graph-mvp/client && npm run dev
```

---

## Browser Console Logging

The client uses a configurable logger to control console output verbosity.

### Log Levels
- `ERROR`: Only error messages
- `WARN`: Errors and warnings
- `INFO`: Errors, warnings, and important info (default in production)
- `DEBUG`: All messages (default in development)

### Configuration

Set the `VITE_LOG_LEVEL` environment variable to control logging:

```bash
# Show only warnings and errors (clean console)
VITE_LOG_LEVEL=warn npm run dev

# Show only errors
VITE_LOG_LEVEL=error npm run dev

# Show all debug logs (default in development)
VITE_LOG_LEVEL=debug npm run dev
```

Or create a `.env.development` file in the client directory:

```
VITE_LOG_LEVEL=warn
```

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
