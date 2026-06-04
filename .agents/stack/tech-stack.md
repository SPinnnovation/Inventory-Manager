---------------------
trigger: always_on
---------------------

# Detailed Tech Stack

## Platform Overview
The platform is being upgraded from a Home Inventory Management System into a multi-tenant Industrial Production ERP. It is a web-based application for multiple tenant Organizations that need isolated inventory, production, reporting, finance, logistics, marketing, HR, IT, and analytics workflows.

The tenancy model is a shared PostgreSQL database with strict data isolation by `organization.Organization`. Each Organization has its own Admin user hierarchy, departments, teams, users, inventory, orders, reports, notifications, and analytics.

## Frontend
* **Build Tool:** Vite
* **Library:** React.js
* **Routing:** React Router DOM
* **Styling:** CSS Modules (`.module.css`)
* **State/API:** React Context, Axios
* **Real-time:** Native WebSocket API
* **Tenant UX:** Existing Login page, followed by role/capability-based layout redirection using organization-aware auth state

## Backend
* **Language:** Python 3.x
* **Framework:** Django
* **API Layer:** Django REST Framework (DRF)
* **Real-time:** Django Channels
* **Async Task Queue:** Celery
* **ORM:** Django ORM
* **Authentication:** Django's built-in Session Authentication
* **Admin Interface:** Django Admin Panel
* **Tenant Root:** `organization.Organization`
* **Tenant Isolation:** Organization-scoped querysets, services, permissions, WebSocket groups, and analytics summaries
* **Credential Delivery:** Backend-generated temporary credentials sent by email, preferably through Celery

## Data & Infrastructure
* **Primary Database:** PostgreSQL
* **Cache & Message Broker:** Redis
* **Storage:** Local file system (or AWS S3) for Product Images
* **Deployment:** Docker, Kubernetes (optional for scaling)
* **CI/CD:** GitHub Actions or GitLab CI
* **Monitoring:** Prometheus + Grafana for backend metrics, Sentry for error tracking

## Tooling & Observability
* **Package Management:** pip/poetry (Backend), npm/yarn (Frontend)
* **Code Quality:** flake8, black (Backend), ESLint, Prettier (Frontend)
* **Testing:** pytest (Backend), Jest + React Testing Library (Frontend)
