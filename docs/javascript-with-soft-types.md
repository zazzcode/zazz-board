# JavaScript With Soft Types

Or: how Zazz Board keeps Adam in the garden while TypeScript offers fruit from the compiler tree.

## The Short Version

Zazz Board is a JavaScript project on purpose.

Not "JavaScript until we grow up." Not "JavaScript until the TypeScript migration committee arrives with clipboards." Plain JavaScript is the language this repo speaks at runtime, in source control, and in the heads of the people and agents maintaining it.

Still, we like knowing when we pass a `projectId` shaped like a sandwich into a function that expects a number. So the backend now uses soft JSDoc typing: JavaScript remains JavaScript, but TypeScript's checker is invited to stand at the edge of the party with a clipboard and quietly point out suspicious behavior.

It may not dance. It may not rename the party.

## The Mythology, Very Lightly Applied

In this house mythology, JavaScript is Adam: original, direct, a little underdressed, but made for the garden it inhabits. It runs where it is planted. It does not ask for a robe woven from generics before naming the animals.

TypeScript, meanwhile, is the serpent with a developer experience brochure. It whispers:

> Surely you will not ship with dynamic types?

And, honestly, sometimes the serpent has a point. Static analysis catches real mistakes. Editors get smarter. Refactors become less terrifying. But then the serpent opens a second brochure, and inside that brochure is a conditional mapped infer helper named something like `DeepReadonlyExceptWhenTheMoonIsWaxing<T>`, and suddenly the fig leaves are interfaces.

The lesson is not that TypeScript is evil in all places. It is that every tool has a theology. TypeScript believes the source should become a typed dialect that compiles to JavaScript. Zazz Board believes JavaScript is already the source, and the type system should serve it from the margins.

## Why Not Full TypeScript?

There are reasonable engineers who love TypeScript. There are reasonable engineers who do not. David Heinemeier Hansson wrote about Turbo 8 dropping TypeScript, naming the compile step, type gymnastics, and joy loss as reasons it got in his way. In another post, he frames static-vs-dynamic typing as partly a matter of programming temperament rather than a universal ladder of enlightenment.

That rings true here. The argument is not "types are useless." The argument is "the value of types must pay rent."

Full TypeScript asks a JavaScript repo to accept several kinds of rent:

- A second source language, with `.ts`, `.tsx`, `.d.ts`, and migration rules.
- A compile model that can become part of every local, CI, and deploy workflow.
- Type-level abstractions that sometimes become their own program beside the program.
- Declaration drift when the type story and runtime story part ways.
- A cultural gravity that turns "this function is unclear" into "this type alias is almost correct."

For a repo that already runs cleanly as JavaScript, that is a lot of ceremony to invite into the garden.

## Why Soft Types?

Soft JSDoc typing gives us the useful half of the bargain:

- Keep `.js` files as the runtime source of truth.
- Add JSDoc where boundaries need shape and intent.
- Use `tsc` with `allowJs`, `checkJs`, and `noEmit` to typecheck JavaScript without producing build output.
- Use `noImplicitAny` so "I gave up" does not silently become the house style.
- Use `eslint-plugin-jsdoc` so our comments stay parseable and useful.
- Keep central shared typedefs in JavaScript, not declaration files.

This lets us catch many backend mistakes while preserving the repo invariant: no TypeScript source files in the application.

The trick is that TypeScript itself supports this mode. Its docs describe type checking JavaScript files and the JSDoc forms it understands. So we are not inventing a private pseudo-type system. We are using the checker as a lint-like static analysis pass over JavaScript.

Said another way: TypeScript is not king here. TypeScript is the building inspector. Helpful, occasionally stern, and not invited to pick the wallpaper.

## What We Implemented

The backend now has an API-local `jsconfig.json` that enables JavaScript checking with no emitted files. It is deliberately scoped to the first backend service/data-layer rollout instead of sweeping the entire app at once.

The core pieces are:

- `api/jsconfig.json` for soft typechecking.
- `api/src/types.js` for shared JSDoc typedefs.
- API package and root scripts for `typecheck` / `typecheck:api`.
- CI wiring so the API typecheck runs before tests.
- Scoped JSDoc lint rules in `api/eslint.config.js`.
- JSDoc annotations in representative service/data-layer modules.
- A route-boundary pilot in `api/src/routes/projects.js`.
- Mapper behavior tests for nested key conversion.
- New standards for data-layer, service-layer, and JSDoc typing conventions.

The important part: this did not add `.ts`, `.tsx`, or `.d.ts` files. The checker reads JavaScript, reasons about JavaScript, and leaves JavaScript behind.

## The Shape of the Compromise

Soft typing works best when it is treated as a boundary discipline, not decorative frosting.

Good places for JSDoc:

- Service methods that return database records.
- Data mappers that translate row shapes into API shapes.
- Auth context and token parsing.
- Realtime event payloads.
- Route handlers where request params, body, and replies need stable contracts.

Less useful places:

- Tiny local variables where the initializer says everything.
- Comments that restate the function name in longer clothing.
- Type poems that are harder to read than the code they describe.
- Places where runtime validation is actually required.

JSDoc is not a substitute for validation. It is a contract for developers and tools. If data crosses an HTTP boundary, database boundary, or user boundary, runtime checks still matter.

## How To Read This Code Now

When you see a backend JSDoc block, read it as a lightweight contract:

```js
/**
 * @param {number} projectId
 * @returns {Promise<import("../types.js").Deliverable[]>}
 */
async function getDeliverablesByProjectId(projectId) {
  // JavaScript remains JavaScript.
}
```

That block serves three audiences:

- Humans who want to know what shape flows through the function.
- Editors that can offer better completion and navigation.
- `tsc`, which can fail CI if the code violates the declared shape.

The comment is not ornamental. It is a typed handshake.

## The Boundaries We Keep

This approach only works if we keep the boundaries clear:

- Do not add TypeScript source files to the app.
- Do not use declaration files as a shadow codebase.
- Do not add build output for types.
- Do not turn `any` into confetti.
- Do not weaken tests to satisfy the checker.
- Do not use type annotations as a substitute for clear data flow.

If a type is hard to express, first ask whether the runtime shape is too clever. Often the best type improvement is a simpler object.

## Sources And Fellow Travelers

This is not a lonely opinion, though it is certainly a spirited one.

- [Turbo 8 is dropping TypeScript](https://world.hey.com/dhh/turbo-8-is-dropping-typescript-70165c01), David Heinemeier Hansson. A concise JavaScript-first argument from the Hotwire/Turbo world.
- [Programming types and mindsets](https://world.hey.com/dhh/programming-types-and-mindsets-5b8490bc), David Heinemeier Hansson. A useful framing of static and dynamic typing as partly temperament and taste.
- [TypeScript docs: Type Checking JavaScript Files](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html). The official basis for checking `.js` files without converting source to `.ts`.
- [TypeScript docs: JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html). The supported JSDoc type syntax used by the checker.
- [eslint-plugin-jsdoc](https://github.com/gajus/eslint-plugin-jsdoc). The linter plugin we use to keep JSDoc comments valid enough to trust.
- [To Type or Not to Type?](https://arxiv.org/abs/2203.11115), Bogner and Merkel. A repository-mining study comparing JavaScript and TypeScript quality signals, useful because it treats the question empirically rather than religiously.
- [Do Machine Learning Models Produce TypeScript Types That Type Check?](https://arxiv.org/abs/2302.12163), Yee and Guha. Useful background on how hard type migration can be, especially when generated or large-scale migrations must satisfy a checker.

## Final Benediction

JavaScript is not "untyped chaos." It is a dynamic language with decades of runtime reality behind it. TypeScript is not "always wrong." It is a powerful static analysis ecosystem that many teams use well.

For Zazz Board, the sweet spot is humbler and more specific:

JavaScript stays pure.

JSDoc carries intent.

`tsc --noEmit` checks the work.

ESLint keeps the comments honest.

Tests prove the behavior.

And the serpent may remain at the edge of the garden, offering diagnostics, provided it wipes its feet and does not touch the file extensions.
