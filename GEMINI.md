# GEMINI AI Agent — Complete Rules, Regulations & Guidelines
# Home Inventory Management System

> This file is the single source of truth for the Gemini AI Agent operating on this project.
> All rules defined here are **mandatory and non-negotiable** unless explicitly overridden by a human developer.

---

## 0. Agent Behaviour Contract

- You are a **code-generation and reasoning agent** for a Home Inventory Management System.
- You must **always read and respect** all rules in this file before generating any code, making suggestions, or modifying files.
- When in doubt, **ask** rather than assume. Never silently skip a rule.
- **Never** generate placeholder, stub, or TODO code and leave it unfinished unless explicitly instructed.
- **Never** duplicate code. Abstract repeated logic into reusable components, services, hooks, or utilities.
- **Never** add features, refactors, comments, or improvements beyond what was explicitly requested.
- All changes must remain within the scope of the task at hand.

---

## 1. Tech Stack — Mandatory

### Frontend
| Concern | Technology |
|---|---|
| Build Tool | Vite |
| UI Library | React.js (functional components only) |
| Language | JavaScript (ES6+) |
| Routing | React Router DOM v6+ |
| Styling | CSS Modules (`.module.css`) exclusively |
| State Management | React Context API (global); `useState` / `useReducer` (local) |
| HTTP Client | Axios (`withCredentials: true` on all requests) |
| Real-time | Native WebSocket API |

### Backend
| Concern | Technology |
|---|---|
| Language | Python 3.x |
| Framework | Django |
| API Layer | Django REST Framework (DRF) |
| Real-time | Django Channels (WebSocket) |
| Async Tasks | Celery |
| ORM | Django ORM (raw SQL is prohibited) |
| Authentication | Django built-in Session Authentication |
| Admin | Django Admin Panel |

### Infrastructure
| Concern | Technology |
|---|---|
| Primary Database | PostgreSQL |
| Cache & Broker | Redis |
| File Storage | Local filesystem or AWS S3 (Product Images) |
| Deployment | Docker (Kubernetes optional) |
| CI/CD | GitHub Actions or GitLab CI |
| Monitoring | Prometheus + Grafana (backend); Sentry (error tracking) |

### Tooling
| Concern | Tool |
|---|---|
| Backend Packages | pip / poetry |
| Frontend Packages | npm / yarn |
| Backend Linting | flake8, black |
| Frontend Linting | ESLint, Prettier |
| Backend Testing | pytest |
| Frontend Testing | Jest + React Testing Library |

---

## 2. Project Structure — Mandatory

### Frontend Structure
```
frontend/src/
├── assets/              # Static assets (images, icons)
├── components/          # Reusable UI components, grouped by feature
│   └── <Feature>/
│       ├── ComponentName.jsx
│       └── styles/
│           └── ComponentName.module.css
├── context/             # React Context providers (AuthContext.js, NotificationContext.js)
├── hooks/               # Custom React Hooks (useAuth.js, useWebSocket.js)
├── layouts/             # Layout components (Header.jsx, Footer.jsx, Sidebar.jsx)
├── pages/               # Page-level components (Dashboard, Inventory, Orders)
│   └── <Feature>/
│       └── PageName.jsx
├── router/              # AppRouter.jsx
├── services/            # API service files (api.js, inventoryService.js)
├── styles/              # globals.css (CSS variables: colors, fonts, spacing)
└── utils/               # Utility/helper functions
```

### Backend Structure
```
backend/
├── apps/
│   ├── accounts/        # User auth, profiles, permissions
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── inventory/       # Products, Stock, StockMovement, Locations
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── orders/          # PurchaseOrder, WorkOrder, OrderItem, WorkOrderItem
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── analytics/       # PredictivePrice, BurnRate, dashboards
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   └── notifications/   # StockAlert, Notification, WebSocket consumers
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── services.py
│       └── consumers.py
├── core/
│   ├── settings/        # base.py, development.py, production.py
│   ├── celery.py        # Celery app + Celery beat periodic tasks
│   ├── urls.py
│   └── asgi.py          # Django Channels ASGI entry point
└── manage.py
```

---

## 3. File Naming Conventions — Mandatory

### Frontend
| File Type | Convention | Example |
|---|---|---|
| Component | `ComponentName.jsx` | `InventoryList.jsx` |
| CSS Module | `ComponentName.module.css` | `InventoryList.module.css` |
| Context | `ContextName.js` | `AuthContext.js` |
| Hook | `useHookName.js` | `useAuth.js` |
| Service | `serviceName.js` | `inventoryService.js` |
| Layout | `LayoutName.jsx` | `Header.jsx` |
| Router | `AppRouter.jsx` | `AppRouter.jsx` |

- Every component **must** have a corresponding CSS Module file, even if initially empty.
- Every component/page/hook/service **must** live under its feature subdirectory.
- CSS Module files live under `components/<Feature>/styles/`.

### Backend
| File Type | Convention | Example |
|---|---|---|
| Model | Singular noun | `Product`, `Stock`, `WorkOrder` |
| ViewSet | Plural + `ViewSet` suffix | `ProductViewSet`, `StockViewSet` |
| Serializer | Model name + `Serializer` | `ProductSerializer` |
| Task | Snake_case verb phrase | `calculate_predictive_price` |
| FilterSet | Model name + `Filter` | `ProductFilter` |

---

## 4. Frontend Coding Rules

### 4.1 Component Architecture
- **Functional components only.** Class components are prohibited.
- Separate **presentation components** (UI only) from **container components** (data fetching / logic).
- Keep components small, modular, and single-responsibility.
- Avoid prop drilling — use React Context for deeply nested shared state.
- Use `React.memo` and `useCallback` to prevent unnecessary re-renders.
- Use `React.lazy` and `Suspense` for code splitting on large components and pages.

### 4.2 Styling Rules
- **CSS Modules exclusively.** The `filename.module.css` naming pattern is mandatory.
- **Inline styles are prohibited** unless the value is dynamically calculated from props or state.
- All CSS class names must be defined in the CSS Module and imported into the component:
  ```jsx
  import styles from './ComponentName.module.css';
  // ...
  <div className={styles.container}>
    <h1 className={styles.title}>Title</h1>
  </div>
  ```
- Maintain `styles/globals.css` for CSS custom properties (colors, fonts, spacing).
- Use CSS Grid and Flexbox for responsive layouts.
- Implement CSS transitions/animations for interactive feedback.

### 4.3 API Service Rules
- All API interactions must be centralized in `services/`. Components never call Axios directly.
- Services are **plain objects** exported as `default`. Methods are **async arrow functions**.
- Every Axios call must include `withCredentials: true` for session cookie transmission.
- Always handle loading and error states for every async operation.
- Global API errors must surface through the notification system (toast), never raw to the UI.
  ```javascript
  // services/inventoryService.js
  import axios from 'axios';
  const API_BASE_URL = 'http://localhost:8000/api/v1';
  const inventoryService = {
    getProducts: async () => {
      const response = await axios.get(`${API_BASE_URL}/inventory/products/`, {
        withCredentials: true,
      });
      return response.data;
    },
  };
  export default inventoryService;
  ```

### 4.4 WebSocket Rules
- WebSocket connections must be managed inside a **custom hook** (e.g., `useWebSocket.js`).
- The hook must handle: open, message, error, and close lifecycle events.
- Implement **auto-reconnect logic** on unexpected disconnection.
- Clean up (close) the WebSocket connection in the `useEffect` cleanup function to prevent memory leaks.
  ```javascript
  // hooks/useWebSocket.js
  import { useEffect, useRef } from 'react';
  const useWebSocket = (url, onMessage) => {
    const wsRef = useRef(null);
    useEffect(() => {
      wsRef.current = new WebSocket(url);
      wsRef.current.onopen = () => console.log('WebSocket connected');
      wsRef.current.onmessage = (event) => onMessage(JSON.parse(event.data));
      wsRef.current.onerror = (error) => console.error('WebSocket error:', error);
      wsRef.current.onclose = () => console.log('WebSocket disconnected');
      return () => { if (wsRef.current) wsRef.current.close(); };
    }, [url, onMessage]);
    return wsRef;
  };
  export default useWebSocket;
  ```

### 4.5 Error Handling
- Implement **React Error Boundaries** to catch unexpected component tree errors and render a fallback UI.
- All async operations (API calls, WebSocket) must have `try/catch` blocks.
- Display user-friendly messages via the global notification/toast system.
- Never expose stack traces or raw error objects to the user.

### 4.6 Performance
- Lazy-load modals and secondary pages that are not immediately visible.
- Use pagination query parameters to avoid over-fetching data from the API.
- Profile regularly with React Developer Tools to identify re-render bottlenecks.

### 4.7 Accessibility
- All components must meet **WCAG 2.1 AA** standards.
- Use semantic HTML elements (`<nav>`, `<main>`, `<section>`, `<button>`, etc.).
- Provide `alt` text for all images.
- Ensure sufficient color contrast and keyboard navigation support.
- Use ARIA live regions for dynamic content updates (e.g., real-time notifications).

### 4.8 General Frontend Rules
- Clean up **all** event listeners and WebSocket connections in `useEffect` cleanup functions.
- Document complex logic with JSDoc comments.
- Validate all form inputs on the frontend before submission.
- Use HTTPS for all API and WebSocket connections in production.

---

## 5. Backend Coding Rules

### 5.1 Framework & App Structure
- All Django apps reside under `backend/apps/`.
- Apps: `accounts`, `inventory`, `orders`, `analytics`, `notifications`.
- Each app contains: `models.py`, `serializers.py`, `views.py`, `services.py`, `filters.py`, and `tasks.py` (where applicable).
- **Fat models / thin views.** Business logic belongs in models or `services.py`.
- Cross-model, transactional logic belongs exclusively in `services.py`.

### 5.2 API Design
- API versioning via URL prefix: `/api/v1/`.
- Use **DRF ViewSets and Routers** for all standard CRUD operations.
- Non-CRUD operations use `@action` decorated methods with dedicated serializers.
- Every ViewSet **must** define all of the following:
  ```python
  class ProductViewSet(viewsets.ModelViewSet):
      queryset = Product.objects.all()
      serializer_class = ProductSerializer
      permission_classes = [IsAuthenticated, IsInventoryManager]
      filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
      filterset_class = ProductFilter
      pagination_class = StandardResultsPagination
  ```
- Authentication: **Session-based only**. Do not use JWT unless explicitly approved for a mobile client.
- CSRF validation must always be active.
- Rate limiting: implement per-user throttling (e.g., 1000 requests/user/day).
- Default page size: 20 items. Maximum client-requested page size: 100 items.
- All list responses must include pagination metadata (total count, next/previous links).

### 5.3 Serializers
- Every ViewSet has a corresponding Serializer in the app's `serializers.py`.
- Include field-level validation to enforce data integrity.
- Never trust client-side calculations for quantities or prices — always recalculate server-side.
- Custom `@action` endpoints have their own dedicated serializers.

### 5.4 Filters
- Every ViewSet uses a `FilterSet` subclass defined in the app's `filters.py`.
- Filter fields must be explicitly whitelisted; never allow arbitrary field filtering.

### 5.5 Database & ORM Rules
- **Raw SQL is prohibited** unless absolutely necessary for performance and reviewed by a senior developer.
- Prevent N+1 queries: always use `select_related()` and `prefetch_related()` in serializers and views.
- Use Django model constraints (`UniqueConstraint`, `CheckConstraint`) to enforce integrity at the DB level.
- All schema changes via **Django migrations only**. Manual DB modifications are strictly prohibited.
- Create database indexes on frequently queried fields: `Product.sku`, `Stock.product_id`, `Order.status`.
- Use `clean()` / `clean_fields()` for model-level business rule validation.

### 5.6 Celery Tasks
- All tasks defined in `tasks.py` within the relevant app.
- Naming convention: descriptive snake_case verb phrases (e.g., `calculate_predictive_price`, `send_stock_alert_notification`).
- Tasks must be **idempotent** and handle retries gracefully.
- **Never call `.delay()` inside a Celery task.** Use Celery's native chaining/scheduling primitives instead.
- Periodic tasks registered in `core/celery.py` via Celery beat with clear scheduling intervals.

### 5.7 Logging
- Log all critical operations: stock movements, order status changes, user authentication events.
- Use Django's built-in logging framework.
- **Never log sensitive information** (passwords, session tokens, PII).

### 5.8 Django Channels (WebSocket)
- WebSocket consumers live in the relevant app's `consumers.py`.
- All consumers must validate the user's session cookie on connection; reject unauthenticated connections immediately.
- Messages sent over WebSockets must be validated and sanitized before processing or rendering.

---

## 6. Business Logic Rules

### 6.1 Inventory Hierarchy
```
Warehouse
  └── Floor
        └── Rack
              └── Shelf  (= Location)
                    └── Stock  (Product × Location)
```
- A **Product** is the item definition: SKU, image, base price, predictive price, market price.
- **Stock** is the physical instantiation of a Product at a specific Location.
- A single Product can have multiple Stock entries across different Locations.
- A Stock entry is associated with exactly **one Product** and **one Location**.

### 6.2 Inventory Constraints
- Stock quantity **must never be negative**. Any operation that would result in negative stock must be rejected with a clear error message.
- All Stock Movements must carry an immutable audit log entry: timestamp, user, reason.
- All operations modifying stock must support **concurrent updates** safely (see Security §7.2).
- Referenced Products and Locations must be validated to exist before processing any Stock Movement, PO, or WO.

### 6.3 Purchase Order (PO) Flow
```
Issued → Received / Completed
```
- **Issued:** PO is created and sent to the supplier.
- **Received / Completed:** Upon marking as Received, the system **atomically increments** Stock quantities at the designated Locations.
- **Partial receipt** is supported: a portion of the ordered quantity can be received, keeping the PO open until fully received. Stock and PO status must reflect this accurately.

### 6.4 Work Order (WO) Flow
```
Issued → Completed
Issued → Pending  (insufficient stock)
```
- **Issued:** Stock is verified and reserved. If insufficient stock exists, the WO is rejected/set to Pending with a warning.
- **Completed:** Stock is decremented. The following sub-states apply:
  | Outcome | Status |
  |---|---|
  | All products fully used | `Job Completed — Products Fully Used` |
  | Products partially used | `Job Completed — Products Partially Used` (remaining appended to WO) |
  | No products used | `Job Completed — Products Not Used` (remaining appended to WO) |
  | Insufficient stock, job incomplete | `Job Pending — Insufficient Stock` (warning issued) |
- **Partial fulfillment** is supported: issue a portion of required quantity; remainder stays pending.
- A WO **cannot** be issued if required stock is not available. Reject with a clear error message.

### 6.5 Predictive Pricing & Analytics
- Track `price_bought` (cost) and `market_price` for each Product.
- A **Celery background task** analyzes historical `market_price` data to compute and update `predictive_price`.
- Analytics dashboards aggregate Stock Movements over time to project **burn rates** and alert on upcoming shortages.

### 6.6 Notification Triggers
The following events trigger a real-time WebSocket notification to active, authorized users:
- Stock falls below threshold.
- WO issued without sufficient stock (Pending state).
- PO received (stock incremented).
- WO job status changes (Completed, Partially Used, Pending, Insufficient Stock).

---

## 7. Security Rules

### 7.1 Authentication & Session Security
- Use Django's built-in **Session Authentication** exclusively. JWT is not permitted unless approved for a mobile client.
- Set `CSRF_COOKIE_HTTPONLY = True` and `SESSION_COOKIE_HTTPONLY = True` in Django settings.
- Set `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True` in production (HTTPS only).
- Implement **account lockout** after repeated failed login attempts (e.g., via `django-axes`).
- Enforce strong password policies (minimum length, complexity).
- Consider MFA for users with elevated permissions (Admins, Floor Managers).

### 7.2 Concurrency & Race Conditions
- **All stock modifications** (Stock In / Stock Out) must execute inside `transaction.atomic()`.
- Use `select_for_update()` when reading Stock rows before modifying them.
- Implement **optimistic locking**: add a `version` field to the Stock model; increment on each update; verify before saving.
- All stock-modifying operations must be **idempotent** (safe to retry without causing inconsistency).

### 7.3 Role-Based Access Control (RBAC)
- Implement RBAC using Django's permission system.
- Only **Admins** and **Floor Managers** can approve POs or WOs.
- Sensitive operations (modifying stock, issuing work orders) require explicit permission checks and must be logged.
- Define granular `permission_classes` on every ViewSet action.

### 7.4 Data Validation & Sanitization
- Validate all incoming data strictly via **DRF Serializers**. No exceptions.
- Never trust client-side calculations for quantities, prices, or totals — always recalculate on the server.
- Sanitize all file uploads (Product Images) to prevent malicious script injection (validate MIME type, file extension, file content).
- Validate all referenced foreign keys (Products, Locations) before processing Stock Movements, POs, or WOs.
- Prevent SQLi, XSS, CSRF through proper sanitization and Django's built-in protections.

### 7.5 WebSocket Security
- WebSocket consumers must **validate the session cookie** on every new connection. Reject unauthenticated connections immediately.
- Apply rate limiting and throttling to WebSocket connections to prevent DoS.
- Validate and sanitize all incoming WebSocket messages before processing or rendering.
- Do not expose sensitive information in WebSocket error messages.

### 7.6 General Security Practices
- Use HTTPS for all API calls and WebSocket connections in production.
- Regularly review and update dependencies to patch known CVEs.
- Do not log sensitive data (passwords, tokens, PII).
- All security-sensitive operations (stock modifications, order approvals) must produce an immutable audit log entry.

---

## 8. API Response Structure

All API responses must follow a consistent structure:

**Success:**
```json
{
  "status": "success",
  "data": { ... },
  "count": 100,
  "next": "http://localhost:8000/api/v1/inventory/products/?page=2",
  "previous": null
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Human-readable error description.",
  "errors": { "field_name": ["Validation error detail."] }
}
```

- Use correct HTTP status codes: `200` OK, `201` Created, `400` Bad Request, `401` Unauthorized, `403` Forbidden, `404` Not Found, `409` Conflict, `500` Internal Server Error.

---

## 9. Testing Requirements

### Backend
- Write `pytest` tests for all models, serializers, views, services, and Celery tasks.
- Test all business logic paths: PO receipt, WO issuance, partial fulfillment, insufficient stock rejection.
- Test concurrency scenarios for stock modifications.
- Achieve meaningful coverage on critical paths (stock modification, order processing).

### Frontend
- Write Jest + React Testing Library tests for all components, hooks, and services.
- Test loading states, error states, and successful data rendering.
- Test form validation and user interaction flows.

---

## 10. Code Quality Standards

### Backend
- Follow PEP 8. Enforce with `flake8` and `black`.
- Write docstrings for all models, serializers, views, services, and tasks.
- Keep functions and methods small and single-responsibility.

### Frontend
- Follow the Airbnb JavaScript Style Guide. Enforce with ESLint and Prettier.
- Use JSDoc for complex functions, hooks, and service methods.
- No unused imports, variables, or dead code.

---

## 11. What the Agent Must NEVER Do

- Generate or suggest JWT authentication (unless explicitly approved).
- Use raw SQL without explicit senior-developer approval in context.
- Write inline styles in React components (unless value is dynamically computed).
- Place components, services, or hooks outside their designated feature subdirectory.
- Call `.delay()` inside a Celery task.
- Skip `permission_classes` on any ViewSet.
- Allow stock quantities to go negative.
- Process a Stock Movement, PO, or WO without validating that referenced Products and Locations exist.
- Modify stock outside of a `transaction.atomic()` block.
- Log sensitive information (passwords, tokens, PII).
- Expose raw error messages or stack traces to the frontend user.
- Push to shared branches, drop tables, or perform destructive operations without explicit human confirmation.
- Leave TODOs, stubs, or unfinished placeholder code in committed files.
