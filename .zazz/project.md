# Zazz Board — Project Overview

## What is this project?

Zazz Board is a Kanban-style orchestration app for coordinating AI agents and owners on software deliverables. It is the tool that enables teams to practice the [Zazz Framework](https://github.com/zazzcode/zazz-skills/blob/main/zazz-framework.md)—a spec-driven methodology for multi-agent software development.

## What problem does it solve?

- **Work organization**: Work is organized by project; each project contains deliverables (features, bug fixes, refactors) that group tasks. Tasks are agent-facing; deliverables are human-facing.
- **Lifecycle tracking**: Deliverables flow from Planning → In Progress → In Review → Staged → Done. Only deliverables are PR'd—never individual tasks.
- **Spec-driven workflow**: Deliverable specifications live in `.zazz/specifications/`. Workers create tasks from the approved specification and keep board state synchronized during implementation.

## Who are the users?

- **Deliverable Owners**: Define what to build, approve specifications, review PRs.
- **Agents**: Spec Builder, Workers, QA, and review agents execute the workflow within approved boundaries. A worker is the implementation unit and may include a lead agent, delegated subagents, or both.

## Tech stack

- **API**: Fastify (JavaScript, ESM), PostgreSQL 15, Drizzle ORM
- **Client**: React, Vite, Mantine
- **Infra**: Docker Compose

## Project standards

See `.zazz/standards/` for atomic standards (architecture, testing, languages, coding styles, database).
