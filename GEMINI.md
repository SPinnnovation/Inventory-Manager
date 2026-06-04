# GEMINI AI Agent — Complete Rules, Regulations & Guidelines
# Industrial Production ERP

> This file is the single source of truth for the Gemini AI Agent operating on this project.
> All rules defined here are **mandatory and non-negotiable** unless explicitly overridden by a human developer.

---

## 0. Agent Behaviour Contract

- You are a **code-generation and reasoning agent** for an Industrial Production ERP.
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
| Multi-Tenancy | Shared PostgreSQL database with strict tenant isolation by `Organization` |
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
├── context/             # React Context providers (AuthContext.js, WorkspaceContext.js, NotificationContext.js)
├── hooks/               # Custom React Hooks (useAuth.js, useWebSocket.js)
├── layouts/             # Capability-driven layouts (AdminLayout, ManagerLayout, TeamLeadLayout, TeamMemberLayout, HRLayout, FinanceLayout, ITLayout)
├── pages/               # Page-level components grouped by capability layout (Admin, Manager, TeamLead, Work, HR, IT, Manufacturing, Storage, Logistics, Finance, Marketing, Sales, Analytics)
│   └── <Feature>/
│       └── PageName.jsx
├── router/              # AppRouter.jsx
├── services/            # API service files (api.js, inventoryService.js, reportingService.js, hrService.js, manufacturingService.js)
├── styles/              # globals.css (CSS variables: colors, fonts, spacing)
└── utils/               # Utility/helper functions
```

### Backend Structure
```
backend/
├── apps/
│   ├── accounts/        # User authentication, profiles
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── organization/    # Tenant Organizations, Departments, Positions, Teams, Memberships, Reporting lines
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── permissions/     # Capability-based permission system, capability grants, scopes, delegations
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── audit/           # Centralized audit logging, state transitions, request correlation
│   │   ├── models.py
│   │   ├── middleware.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── notifications/   # WebSocket consumers, notification preferences and triggers
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── consumers.py
│   ├── reports/         # Bottom-to-top issue reports, comments, SLA tracking
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── hr/              # Secure HR tokens, cases, delegations, case logs
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── inventory/       # Product classifications, stock tracking, reservations, locations
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── manufacturing/   # Bills of Materials (BOM), Production plans, jobs, quality checkpoints, scrap
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   ├── filters.py
│   │   └── tasks.py
│   ├── procurement/     # Suppliers, RFQs, purchase approvals, PO finance status
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── orders/          # Compatibility facade for legacy PO/WO orders
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── services.py
│   ├── sales/           # B2B customers, Sales orders, eCommerce ingestion
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── logistics/       # Packing, dispatch, carriers, delivery tracking
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── finance/         # Budgets, cost centers, payment records, ledgers, approval chains
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   ├── marketing/       # Campaigns, budget tracking, channel metrics
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services.py
│   │   └── filters.py
│   └── analytics/       # Predictive pricing, burn rates, cross-role cached summaries
│       ├── models.py
│       ├── serializers.py
│       ├── views.py
│       ├── services.py
│       └── tasks.py
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
- Apps: `accounts`, `organization`, `permissions`, `audit`, `notifications`, `reports`, `hr`, `it`, `inventory`, `manufacturing`, `procurement`, `orders`, `sales`, `logistics`, `finance`, `marketing`, `analytics`.
- Each app contains: `models.py`, `serializers.py`, `views.py`, `services.py`, `filters.py`, and `tasks.py` (where applicable).
- **Fat models / thin views / dedicated services.** Complex business logic and transactional flows belong in `services.py` or models. Cross-model operations belong exclusively in `services.py`.

### 5.1.1 Multi-Tenancy Model
- The platform uses a **shared database with tenant isolation** model.
- `organization.Organization` is the tenant root.
- Every tenant-owned model must include a direct `organization` foreign key or have a mandatory parent relation that resolves to exactly one `Organization`.
- Tenant-owned examples include users, departments, teams, warehouses, shelves, products, stock, orders, reports, HR cases, notifications, manufacturing jobs, finance records, marketing records, logistics records, sales records, and analytics summaries.
- Global reference models are allowed only when intentionally shared, read-only, and safe across tenants, such as default capability definitions.
- Querysets for tenant-owned models must be filtered by `request.user.organization` or by the authenticated user's active tenant context.
- The backend must derive tenant ownership from the authenticated user or trusted parent objects. Never trust client-submitted `organization_id` for ownership assignment.
- Tenant-specific unique business identifiers must include `organization` in their uniqueness constraints unless they are intentionally globally unique.
- Services must validate that all related objects in one operation belong to the same organization.

### 5.2 API Design
- API versioning via URL prefix: `/api/v1/`.
- Use **DRF ViewSets and Routers** for all standard CRUD operations.
- Non-CRUD operations use `@action` decorated methods with dedicated serializers.
- Every ViewSet **must** define all of the following:
  ```python
  class ProductViewSet(viewsets.ModelViewSet):
      queryset = Product.objects.all()
      serializer_class = ProductSerializer
      permission_classes = [IsAuthenticated, HasCapabilityPermission] # Custom capability check
      filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
      filterset_class = ProductFilter
      pagination_class = StandardResultsPagination
  ```
- Authentication: **Session-based only**. Do not use JWT unless explicitly approved for a mobile client.
- CSRF validation must always be active.
- Rate limiting: implement per-user throttling (e.g., 1000 requests/user/day).
- Default page size: 20 items. Maximum client-requested page size: 100 items.
- All list responses must include pagination metadata (total count, next/previous links).
- All tenant-owned API responses must be scoped to the authenticated user's organization. Cross-tenant records must return `404` or `403` without revealing private details.

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
- Create database indexes on frequently queried fields: `Organization.code`, `User.organization_id`, `Product.sku`, `Stock.product_id`, `Order.status`, `AuditEvent.timestamp`, `IssueReport.status`, `HRToken.token`.
- Use `clean()` / `clean_fields()` for model-level business rule validation.
- Tenant-owned models must index `organization` and common tenant+status/date query combinations.

### 5.6 Celery Tasks
- All tasks defined in `tasks.py` within the relevant app.
- Naming convention: descriptive snake_case verb phrases (e.g., `calculate_predictive_price`, `send_stock_alert_notification`).
- Tasks must be **idempotent** and handle retries gracefully.
- **Never call `.delay()` inside a Celery task.** Use Celery's native chaining/scheduling primitives instead.
- Periodic tasks registered in `core/celery.py` via Celery beat with clear scheduling intervals.

### 5.7 Logging & Audit Trails
- Log all critical operations: stock movements, order status changes, user authentication events.
- Centralized audit events must be written using the `AuditEvent` model from the `audit` app.
- Include request correlation IDs via middleware to trace logs across services.
- Use Django's built-in logging framework.
- **Never log sensitive information** (passwords, session tokens, PII, HR message details).
- Audit events for tenant-owned records must include organization identity either directly or in metadata.

### 5.8 Django Channels (WebSocket)
- WebSocket consumers live in the relevant app's `consumers.py`.
- All consumers must validate the user's session cookie on connection; reject unauthenticated connections immediately.
- Messages sent over WebSockets must be validated and sanitized before processing or rendering.
- Push messages strictly to authorized Channel Groups: `org_<id>_user_<id>`, `org_<id>_team_<id>`, `org_<id>_department_<id>`, `org_<id>_role_admin`, `org_<id>_hr_queue`, `org_<id>_report_<id>`.
- WebSocket connection setup must bind the user to their organization and must never subscribe a user to groups from another organization.

### 5.9 Capability-Based Access Control
- Access control must use granular capabilities (e.g., `inventory.stock.adjust`, `hr.case.delegate`) instead of generic user roles.
- Granular capability checks must check for Scope: Global, Department-scoped, Team-scoped, Location-scoped, or Object-scoped.
- Permissions flow top-to-bottom: Superior user can grant a subset of their capabilities to subordinates. Grants and revocations must write audit events.
- Capability scopes cannot exceed the user's organization. Normal organization Admin users are not platform-wide superusers.

### 5.9.1 Credential Provisioning
- Organization Admin users create Manager accounts for their own organization.
- Admin-created Manager credentials are generated by the backend and delivered through the configured email backend, preferably via Celery.
- Managers create and distribute credentials for Team Leads and Team Members inside departments/teams they are authorized to manage.
- Team Leads can manage credentials only if explicitly delegated that capability by a Manager.
- Generated passwords are temporary and must force password change on first login.
- Temporary passwords must never be logged, stored in plaintext, returned in API responses, included in audit JSON, or sent over WebSockets.
- Credential creation, resend, revoke, activation, deactivation, and first-login password change must be audited.
- The frontend login page remains the same. After login, users are redirected to layouts based on authenticated role, organization, memberships, and capabilities.

### 5.10 Bottom-to-Top Reporting and Escalation Flow
- Implement bottom-to-top issue routing: Team Member reports to Team Lead &rarr; Lead reports/escalates to Manager &rarr; Manager reports/escalates to Admin.
- Escalations must record full history in the `IssueReport` status logs.
- Trigger real-time WebSocket notifications upon creation or escalation to notify only the responsible actors.

### 5.11 HR Token & Case Privacy
- Submitting HR issues generates an immutable `HRToken` returned to the submitter.
- HR case files and comments must be strictly access-controlled and visible only to the submitter and authorized HR personnel holding the required HR capabilities.
- Delegating HR cases to other leads/managers requires recorded reasons and duration-bound capability scopes.

---

## 6. Business Logic Rules

### 6.0 Tenant Business Boundary
- `Organization` is the top-level tenant and business boundary.
- Normal users operate inside exactly one active organization context at a time.
- The hierarchy is `Organization -> Admin User -> Managers -> Team Leads -> Team Members`.
- Inventory, orders, reports, HR cases, manufacturing jobs, finance records, logistics records, marketing records, sales records, notifications, and analytics are organization-owned.
- No operation may combine stock, users, departments, teams, orders, reports, or finance records from different organizations.
- Every bottom-to-top report and top-to-bottom permission grant must remain within one organization.

### 6.1 Inventory Hierarchy
```
Warehouse
  └── Floor
        └── Rack
              └── Shelf  (= Location)
                    └── Stock  (Product × Location)
```
- A **Product** defines an item class, including SKU, image, base price, predictive price, and market price.
- **Stock** represents the physical presence of a specific Product at a specific Shelf Location.
- A Product may be stocked at multiple Locations, but each Stock record maps to exactly **one Product** and **one Location**.
- Product Classifications: `RAW_MATERIAL`, `MODULE`, `FINAL_PRODUCT`, `CONSUMABLE`, `TOOL`, `EQUIPMENT`.
- Inventory Stock States: `AVAILABLE`, `RESERVED`, `ISSUED`, `WIP`, `QUARANTINE`, `REJECTED`, `SCRAP`, `RETURNED`.

### 6.2 Inventory Constraints
- Stock quantity **must never be negative**. Any operation that would result in negative stock must be rejected with a clear error message.
- Stock reservations must be released, consumed, or expired explicitly. They cannot be bypassed.
- All Stock Movements must carry an immutable audit log entry: timestamp, user, reason.
- All operations modifying stock must support **concurrent updates** safely (see Security §7.2) using database row-level locking (`select_for_update`) and atomic transactions.
- Referenced Products and Locations must be validated to exist before processing any Stock Movement, PO, or WO.
- Referenced Products, Locations, Stock, POs, and WOs must belong to the same organization before any inventory transaction runs.

### 6.3 Purchase Order (PO) Flow
```
Issued → Received / Completed
```
- **Issued:** PO is created and sent to the supplier.
- **Received / Completed:** Upon marking as Received, the system **atomically increments** Stock quantities at the designated Locations.
- **Partial receipt** is supported: a portion of the ordered quantity can be received, keeping the PO open until fully received. Stock and PO status must reflect this accurately.
- Connects directly with the `procurement` and `finance` workflows for invoice validation.

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
  | Products used | `Job Completed — Products Used` |
  | Insufficient stock, job incomplete | `Job Pending — Insufficient Stock` (warning issued) |
- **Partial fulfillment** is supported: issue a portion of required quantity; remainder stays pending.
- A WO **cannot** be issued if required stock is not available. Reject with a clear error message.

### 6.5 Predictive Pricing & Analytics
- Track `price_bought` (cost) and `market_price` for each Product.
- A **Celery background task** analyzes historical `market_price` data to compute and update `predictive_price`.
- Analytics dashboards aggregate Stock Movements over time to project **burn rates** and alert on upcoming shortages.
- Analytics aggregations must use Celery for periodic compilation and cache results using Redis to avoid synchronous DB queries.

### 6.6 Notification Triggers
The following events trigger a real-time WebSocket notification to active, authorized users:
- Stock falls below threshold.
- WO issued without sufficient stock (Pending state).
- PO received (stock incremented).
- WO job status changes (Completed, Partially Used, Pending, Insufficient Stock).
- Issue reports are created or escalated.
- Budget approval status changes.

### 6.7 Manufacturing & BOM Invariants
- A **Bill of Materials (BOM)** defines the recipe for Modules and Final Products.
- BOM item validation must prevent circular dependencies (e.g., a product cannot require itself as a component).
- Manufacturing jobs must explode the BOM to determine raw material requirements, reserve stock in the `inventory` app, and log all scrap/reworks with explicit reasons.
- Completed modules or products can only transition to available inventory after passing a Quality Control checkpoint signed off by a QA-capable user.

---

## 7. Security Rules

### 7.1 Authentication & Session Security
- Use Django's built-in **Session Authentication** exclusively. JWT is not permitted unless approved for a mobile client.
- Set `CSRF_COOKIE_HTTPONLY = True` and `SESSION_COOKIE_HTTPONLY = True` in Django settings.
- Set `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True` in production (HTTPS only).
- Implement **account lockout** after repeated failed login attempts (e.g., via `django-axes`).
- Enforce strong password policies (minimum length, complexity).
- Consider MFA for users with elevated permissions (Admins, Floor Managers).
- Session-authenticated users must carry organization context in the authenticated user payload returned by `auth/me`.
- Login remains a single frontend page; post-login routing selects Admin, Manager, Team Lead, Team Member, HR, Finance, IT, Manufacturing, Storage, Logistics, Marketing, Sales, or Analytics layouts based on backend-provided role/capabilities.

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
- Organization Admin is the top role inside one tenant organization. Other user roles stay the same and remain tenant-scoped.

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
- Tenant isolation is a security boundary. Any cross-organization data leak is a critical security defect.

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
- Build tenant-owned models, serializers, viewsets, services, filters, WebSockets, or analytics without organization scoping.
- Trust a client-submitted `organization_id` to decide record ownership.
- Use raw SQL without explicit senior-developer approval in context.
- Write inline styles in React components (unless value is dynamically computed).
- Place components, services, or hooks outside their designated feature subdirectory.
- Call `.delay()` inside a Celery task.
- Skip `permission_classes` on any ViewSet.
- Allow stock quantities to go negative.
- Process a Stock Movement, PO, or WO without validating that referenced Products and Locations exist.
- Modify stock outside of a `transaction.atomic()` block.
- Log sensitive information (passwords, tokens, PII).
- Log generated credentials or send generated credentials over WebSockets.
- Expose raw error messages or stack traces to the frontend user.
- Push to shared branches, drop tables, or perform destructive operations without explicit human confirmation.
- Leave TODOs, stubs, or unfinished placeholder code in committed files.
- Bypass capability permission checks in viewsets or action handlers.
- Allow circular dependencies in Bills of Materials (BOM) or recursive assembly loops.
- Expose confidential HR case summaries, comments, or attachments to users without direct HR capabilities.
- Perform critical state modifications (such as changing production job status, issue reports, or budget approvals) without recording a structured audit log event.
