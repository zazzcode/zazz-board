# Zazz Board — Project Overview

## What is this project?

Zazz Board is a Kanban-style orchestration app for coordinating AI agents and owners on software deliverables. It is the tool that enables teams to practice the Zazz Framework—a spec-driven methodology for multi-agent software development.

## What problem does it solve?

- **Work organization**: Work is organized by project; each project contains deliverables (features, bug fixes, refactors) that group tasks. Tasks are agent-facing; deliverables are human-facing.
- **Lifecycle tracking**: Deliverables flow from Planning → In Progress → In Review → Staged → Done. Only deliverables are PR'd—never individual tasks.
- **Spec-driven workflow**: SPECs and PLANs live in `.zazz/deliverables/`. Agents create tasks from the PLAN; owners approve SPECs and PLANs.

## Who are the users?

- **Deliverable Owners**: Define what to build, approve PLANs, review PRs.
- **Agents**: Spec Builder, Planner, Coordinator, Workers, QA—execute the workflow within approved boundaries.

## Tech stack

- **API**: Fastify (JavaScript, ESM), PostgreSQL 15, Drizzle ORM
- **Client**: React, Vite, Mantine
- **Infra**: Docker Compose

## Project standards

See `.zazz/standards/` for atomic standards (architecture, testing, languages, coding styles, database).
