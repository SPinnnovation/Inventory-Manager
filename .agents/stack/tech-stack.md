---------------------
trigger: always_on
---------------------

# Detailed Tech Stack

## Platform Overview
The Home Inventory Management System is a web-based application designed to help users manage their household inventory efficiently. It provides features for tracking products, managing stock levels, processing purchase orders and work orders, and receiving real-time notifications about inventory changes.

## Frontend
* **Build Tool:** Vite
* **Library:** React.js
* **Routing:** React Router DOM
* **Styling:** CSS Modules (`.module.css`)
* **State/API:** React Context, Axios
* **Real-time:** Native WebSocket API

## Backend
* **Language:** Python 3.x
* **Framework:** Django
* **API Layer:** Django REST Framework (DRF)
* **Real-time:** Django Channels
* **Async Task Queue:** Celery
* **ORM:** Django ORM
* **Authentication:** Django's built-in Session Authentication
* **Admin Interface:** Django Admin Panel

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