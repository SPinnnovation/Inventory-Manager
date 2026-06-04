# Industrial Production ERP: Upgrade Proposal & Agent Coordination Contract

This document defines the target architecture and phased upgrade plan for evolving the current Home Inventory System into a multi-tenant, full-scale Industrial Production ERP for tech manufacturing businesses focused on IoT automation, embedded modules, drone technology, and industrial automation.

AI agents must use this proposal as a synchronization contract before implementing upgrade work. Any implementation must preserve existing inventory/order invariants while expanding the system into a production-grade, auditable, permission-aware industrial platform.

## 0. Current System Baseline

The current application already provides a strong operational kernel:

- Backend stack: Django, Django REST Framework, Django Channels, Celery, Redis, PostgreSQL, session authentication.
- Frontend stack: React/Vite, React Router, Axios, Context API, CSS Modules, native WebSockets.
- Existing backend apps:
  - `accounts`: email-based custom user, simple role enum, profile.
  - `inventory`: warehouse/floor/rack/shelf hierarchy, category, product, stock, immutable stock movements.
  - `orders`: purchase orders and work orders.
  - `analytics`: cached dashboard summaries, burn rates, live activity stream.
  - `notifications`: persistent notifications and WebSocket pushes.
- Existing frontend areas:
  - single authenticated `AppLayout`.
  - dashboard, inventory, locations, product catalog, stock, movements, purchase orders, work orders, profile, auth.
- Existing critical invariants:
  - stock quantity must never be negative.
  - stock modification must use `transaction.atomic()`.
  - stock rows must be locked with `select_for_update()` before modification.
  - stock movements are append-only.
  - API access uses Django session auth and CSRF protection.
  - real-time updates use authenticated Django Channels WebSockets.

Upgrade work must extend this foundation instead of bypassing it.

## 1. Target Industrial Domain

The upgraded system must support a cutting-edge tech manufacturing industry where products flow through:

`Raw Material -> Module -> Final Product -> Packaging -> Sales/Dispatch`

Primary operational domains:

- Manufacturing: builds modules and final products through jobs, BOMs, operations, and quality gates.
- Storage: controls receiving, storage, picking, transfers, stock accuracy, and inventory states.
- Logistics: controls packing, dispatch, carriers, shipping status, and delivery proof.
- Finance: controls budgets, approvals, purchase/payment tracking, salary hooks, cost centers, and ledgers.
- Marketing/Sales: controls B2B sales, ecommerce sales, campaign budgets, lead/customer records, and sales orders.
- Human Resources: handles employee issue tokens, HR cases, delegation, resolution, and admin reporting.
- IT: Handles all the software related task for IOT Automation, Software development and any other IT related operation.
- Administration: controls organization structure, permissions, targets, analytics, and cross-department command.

### 1.1. Multi-Tenancy Blueprint

The upgraded platform must support multiple independent industrial organizations in a shared application while preserving strict tenant data isolation.

Tenant model:

- `Organization` is the tenant root.
- Every tenant-owned model must link to `Organization` either directly or through a required parent that links to `Organization`.
- Tenant-owned examples include users, departments, teams, warehouses, floors, racks, shelves, products, stock, stock movements, orders, reports, HR cases, notifications, analytics summaries, manufacturing jobs, finance records, sales records, logistics records, and marketing records.
- Global reference data is allowed only when it is intentionally shared and read-only, such as default capability definitions or system role templates.

Tenant hierarchy:

- `Organization -> Admin User -> Managers -> Team Leads -> Team Members`.
- Each organization must have at least one active Admin user.
- Admin users are scoped to their organization unless explicitly marked as platform support users by a separate, highly restricted system role.
- Managers, Team Leads, Team Members, HR, Finance, Marketing, Storage, Logistics, Manufacturing, and IT users stay within the same organization boundary.

Isolation requirements:

- All querysets for tenant-owned models must be filtered by the authenticated user's `organization_id`.
- API clients must never be trusted to provide tenant ownership for writes; the backend must derive organization from the authenticated actor or an approved parent object.
- Unique constraints for tenant-owned business codes should include `organization` unless the value must be globally unique.
- No stock, order, report, HR case, notification, WebSocket group, or analytics result may cross organization boundaries.
- Cross-tenant administration is not part of normal organization Admin behavior and must be treated as platform-superuser functionality only.

## 2. Non-Negotiable Engineering Guardrails

All AI agents must follow these rules during the upgrade:

- Keep all Django apps under `backend/apps/`.
- Enforce tenant isolation for all tenant-owned models and querysets.
- Use DRF serializers for validation.
- Use DRF viewsets and routers for standard CRUD.
- Use custom `@action` methods for state transitions such as issue, receive, approve, complete, escalate, delegate.
- Keep complex cross-model business logic in `services.py`.
- Use `filters.py` with explicit `FilterSet` classes for list filtering.
- Add pagination, filtering, ordering, and permission classes to all list endpoints.
- Use Django ORM. Raw SQL requires explicit senior review.
- Use migrations only for schema changes.
- Never trust client-side calculations for stock, finance, quantity, price, or permissions.
- Use `transaction.atomic()` and row locks for all stock, reservation, production, finance approval, and state transition flows.
- Every important state transition must write an audit event.
- Sensitive data must not be logged.
- All WebSockets must authenticate via session cookies and must reject unauthenticated users.
- Celery tasks must be idempotent and logged.
- Frontend API calls must stay centralized in `frontend/src/services/`.
- Frontend layouts and route access must be capability-driven, not hardcoded only by role names.
- CSS Modules remain the styling standard.

## 3. Backend Architecture Upgrades

### 3.0. Multi-Tenant Organization Root

The `organization` app must introduce an `Organization` model as the tenant root before deeper department/team workflows are expanded.

Core model:

- `Organization`
  - stores legal/display name, code/slug, status, contact email, phone, address, timezone, created/updated timestamps.
  - owns one or more Admin users.
  - owns departments, teams, inventory, orders, reports, HR records, notifications, analytics, and production data.

Required behavior:

- Organization creation must also create or assign the first Admin user.
- Tenant-owned records must not exist without a tenant path.
- Tenant-owned services must validate that all referenced objects belong to the same organization.
- Tenant-owned models should define `organization` directly when practical; deep child models may derive tenant ownership through required parent relations only if services and querysets enforce it consistently.
- Admin user actions are organization-scoped by default.

### 3.1. Organization, Departments, Teams, And Reporting Lines

Create a new `organization` app.

Core models:

- `Organization`
  - tenant root for one industrial company/business unit.
  - owns Admin users and every tenant-owned operational record.
- `Department`
  - examples: Manufacturing, Logistics, Storage, Finance, Marketing, HR.
  - stores name, code, description, active state.
- `Position`
  - defines business position labels such as Admin, Department Manager, Team Lead, Team Member, HR Specialist.
- `Team`
  - belongs to a department.
  - has manager ownership and a defined purpose.
  - may have goals, active state, and operational metadata.
- `TeamMembership`
  - links users to teams.
  - tracks member role in team, active dates, primary membership, and status.
- `TeamLeadAssignment`
  - explicitly supports one Team Lead leading multiple teams.
- `ReportingLine`
  - defines bottom-to-top report routing.
  - must not be confused with permission assignment.

Required behavior:

- Organization Admins create managers inside their own organization.
- Admins can create departments and assign managers.
- Managers can create teams in their department if permitted.
- Managers can assign team leads.
- Team leads can manage team members if permitted.
- A user may belong to multiple teams, but each operational action must resolve to one active team/department context.
- Managers, Team Leads, and Team Members must never be assigned across organizations.

### 3.2. Capability-Based Permissions

Create a new `permissions` app or a dedicated permissions module inside `organization` if the team wants a smaller first step.

The current `User.role` enum is not enough for the target system. It may remain for backward compatibility during migration, but new access control must use capabilities and scopes.

Core models:

- `Capability`
  - examples:
    - `organization.department.create`
    - `organization.team.assign_lead`
    - `inventory.stock.adjust`
    - `storage.stock.transfer`
    - `manufacturing.job.create`
    - `manufacturing.job.complete_operation`
    - `finance.budget.approve`
    - `marketing.campaign.manage`
    - `reports.issue.escalate`
    - `hr.case.delegate`
- `RoleTemplate`
  - reusable permission bundles for Admin, Manufacturing Manager, Storage Manager, Team Lead, Team Member, HR Specialist.
- `RoleTemplateCapability`
- `UserCapabilityGrant`
  - direct grant from superior to subordinate.
- `CapabilityScope`
  - defines whether a permission applies globally, to a department, to a team, to a location, or to a specific object.
- `PermissionDelegationAudit`
  - immutable history of permission grants/revocations.

Required behavior:

- Permissions flow top to bottom.
- Organization Admins can grant manager capabilities inside their organization.
- Managers can grant a subset of their own capabilities to team leads.
- Team leads can grant a subset of their own capabilities to team members.
- A user cannot delegate a capability they do not hold.
- A delegated permission cannot exceed the grantor's scope.
- Every permission change must be auditable.
- Capability scopes must include tenant ownership; organization scope is the upper bound for normal users.

### 3.3. Audit And Operational Logging

Create a new `audit` app.

Core models:

- `AuditEvent`
  - actor, action, entity type, entity id, request id, source app, timestamp.
  - stores before/after snapshots where appropriate.
  - stores reason/comment for sensitive operations.
  - stores IP/user agent when available.
- `StateTransitionLog`
  - optional focused model for orders, jobs, reports, HR cases, finance approvals.
- `OutboxEvent`
  - optional but recommended for reliable event publishing to notifications, analytics, and integrations.

Required behavior:

- Write audit events for:
  - stock movement.
  - PO/WO status change.
  - production job state change.
  - permission grant/revoke.
  - team membership change.
  - report escalation.
  - HR delegation.
  - finance approval/rejection.
  - sales/logistics dispatch transitions.
- Add request correlation ID middleware.
- Use structured logs in production.
- Logs should include module, actor id, action, object id, request id, and result.
- Logs must not include passwords, session cookies, CSRF tokens, private HR case content, or sensitive financial secrets.

### 3.4. Reporting And Escalation System

Create a new `reports` app.

Core models:

- `IssueReport`
  - category, severity, department, team, created_by, assigned_to, current_level, status, due dates.
- `IssueComment`
- `IssueAttachment`
- `IssueStatusHistory`
- `IssueEscalation`
- `IssueAssignment`
- `ReportSLA`

Bottom-to-top reporting flow:

- Team Member reports to Team Lead.
- Team Lead reports/escalates to Manager.
- Manager reports/escalates to Admin.
- HR-related issue can be converted or routed into HR token flow.

Recommended statuses:

- `DRAFT`
- `OPEN`
- `ACKNOWLEDGED`
- `IN_REVIEW`
- `BLOCKED`
- `ESCALATED`
- `RESOLVED`
- `REJECTED`
- `CLOSED`

WebSocket groups:

- `user_<id>`
- `team_<id>`
- `department_<id>`
- `role_admin`
- `hr_queue`
- `report_<id>`

Required behavior:

- Report creation notifies the next responsible level.
- Escalation preserves full history.
- Comment and status changes push live updates to authorized participants.
- Report visibility follows reporting line and capability scope.
- SLA breach should enqueue Celery notifications and audit events.

### 3.5. HR Token System

Create a new `hr` app.

Core models:

- `HRToken`
  - unique immutable token, creator, status, created_at.
- `HRCase`
  - linked token, category, severity, sensitive summary, submitter, assigned HR owner, status.
- `HRCaseMessage`
- `HRCaseDelegation`
  - delegated_by, delegated_to, reason, scope, due date, outcome.
- `HRCaseAudit`

Required behavior:

- Every Manager, Team Lead, and Team Member can submit HR issues.
- Submitter receives a token for tracking.
- HR can delegate an issue to a Manager, Team Lead, or Team Member with recorded reason and scope.
- Admin receives appropriate reports from HR.
- Sensitive HR content must be permission-gated.
- HR token identity and history must remain immutable.

### 3.6. Industrial Inventory And Storage Upgrade

Extend `inventory` carefully instead of destroying current stock behavior.

Required additions:

- Product/item classification:
  - `RAW_MATERIAL`
  - `MODULE`
  - `FINAL_PRODUCT`
  - `CONSUMABLE`
  - `TOOL`
  - `EQUIPMENT`
- Batch/lot tracking.
- Serial number tracking for modules, final products, drones, and high-value electronics.
- Inventory states:
  - `AVAILABLE`
  - `RESERVED`
  - `ISSUED`
  - `WIP`
  - `QUARANTINE`
  - `REJECTED`
  - `SCRAP`
  - `RETURNED`
- Stock reservation model.
- Cycle count model.
- Stock reconciliation approval model.
- Barcode/RFID scan event model.

Rules to preserve:

- Stock must never go negative.
- Stock movements remain append-only.
- Reservations must be released, consumed, or expired explicitly.
- Physical hierarchy remains Warehouse -> Floor -> Rack -> Shelf.
- Shelf barcode/RFID integration should build on existing fields.

### 3.7. Manufacturing Engine

Create a new `manufacturing` app.

Core models:

- `BillOfMaterials`
- `BOMItem`
- `ProductionPlan`
- `ProductionJob`
- `ProductionJobMaterial`
- `JobOperation`
- `Workstation`
- `Machine`
- `Tooling`
- `QualityCheckpoint`
- `ProductionOutput`
- `ScrapRecord`

Production flow:

1. Manager/Admin creates target or production plan.
2. Manufacturing Manager creates production jobs.
3. Team Lead receives assigned job.
4. Storage issues raw materials/modules to job.
5. Team Members execute operations.
6. Quality checkpoints approve/reject outputs.
7. Completed modules/products move into inventory as WIP, module stock, or finished goods.
8. Scrap/rework is recorded and audited.

Required behavior:

- BOM explosion must calculate required raw materials.
- Job material issue must reserve or deduct stock through inventory services.
- Product output must create stock movement records.
- QA rejection must route to rework/scrap workflow.
- Production job state transitions must be explicit and logged.

### 3.8. Procurement, Sales, Logistics, Finance, And Marketing

Create or split apps as the system grows:

- `procurement`
  - suppliers, RFQs, quotations, purchase approvals, PO finance state.
- `sales`
  - B2B customers, ecommerce order intake, sales orders, invoices later if required.
- `logistics`
  - packing, dispatch, carriers, tracking, proof of delivery.
- `finance`
  - budgets, cost centers, payment records, salary hooks, ledgers, approvals.
- `marketing`
  - campaigns, budget requests, channel performance, B2B/ecommerce funnel metrics.

Required behavior:

- Purchase orders should eventually move from generic `orders` into procurement or remain as a compatibility facade while procurement owns the workflow.
- Sales orders reserve finished goods.
- Logistics consumes packed/reserved goods and updates delivery state.
- Finance approval gates must exist for budget-sensitive actions.
- Marketing budget allocation and spending must be auditable.

### 3.9. Notifications And Event Architecture

Current notification services should be expanded into an event-driven notification layer.

Recommended additions:

- `NotificationPreference`
- `NotificationDelivery`
- `EventType`
- `DomainEvent` or `OutboxEvent`

Required behavior:

- Persist notification before WebSocket push.
- Push only to authorized WebSocket groups.
- Use Celery for email or heavy notification delivery.
- Failure to push WebSocket must never roll back core business transaction.
- Critical events should include audit link/reference id.

### 3.10. Tenant Credential Provisioning Flow

Credential creation is top-down and must stay inside one organization.

Required flow:

- Organization Admin creates Manager accounts for their organization.
- The system generates a secure temporary password and sends the username/email plus temporary credential to the Manager through the configured email backend.
- Credential email dispatch must run through Celery when available and must be audited.
- Managers create and distribute credentials for Team Leads and Team Members within their own organization.
- Managers may only create users within departments/teams they are permitted to manage.
- Team Leads may receive delegated user-management capability only if the Manager grants it explicitly.
- All generated credentials are temporary and must force password change on first login.
- Temporary credentials must never be logged, stored in plaintext, exposed in API responses, or sent over WebSocket.
- Credential creation, resend, revoke, activation, and deactivation must write audit events.
- Existing frontend login remains unchanged: users authenticate through the same login page, then the application redirects to the correct layout based on role, capabilities, and tenant membership.

## 4. Frontend Architecture Upgrades

### 4.1. Capability-Driven Layout System

The current single `AppLayout` should evolve into a shell that selects navigation, dashboards, and modules based on capabilities.

Recommended layout structure:

- `AdminLayout`
  - command center, organization management, permissions, all-department analytics, audit logs, HR oversight.
- `ManagerLayout`
  - department dashboard, team builder, team targets, reports, approvals, department analytics.
- `TeamLeadLayout`
  - team job board, member progress, issue queue, material requests, escalation tools.
- `TeamMemberLayout`
  - assigned work, checklists, progress updates, issue reporting, scan actions.
- `HRLayout`
  - HR token search, case queue, delegation matrix, admin report preparation.
- `FinanceLayout`
  - budget approvals, payment queues, cost-center views, spend analytics.
- `ITLayout`
  - handles software deployment, IoT automation tasks, software tasks, system configurations, and developer team management.

Implementation direction:

- Introduce a route registry with metadata:
  - path.
  - label.
  - module.
  - icon.
  - required capabilities.
  - allowed scopes.
  - layout preference.
- Sidebar and route guards should read the same registry.
- Do not duplicate permission logic in page components.

### 4.2. Global Frontend State

Auth context should eventually expose:

- current user.
- organization / tenant.
- memberships.
- active department.
- active team.
- capabilities.
- scoped permissions.
- notification summary.

Add context or reducers for:

- active workspace.
- report inbox.
- live operational events.
- HR token/case alerts.
- permission-aware navigation.

### 4.3. Frontend Module Areas

Required future page groups:

- `/admin`
  - command center, departments, users, roles, permissions, audit.
- `/manager`
  - department dashboard, teams, targets, approvals, reports.
- `/team-lead`
  - team dashboard, job board, progress, issue escalation.
- `/work`
  - member assigned tasks, progress reports, issue submission.
- `/hr`
  - token submission, case tracking, HR case board.
- `/it`
  - software tasks, IoT deployments, configs, team management.
- `/manufacturing`
  - BOMs, plans, jobs, operations, QA checkpoints.
- `/storage`
  - receiving, putaway, picking, transfers, cycle counts.
- `/logistics`
  - packing, dispatch, shipment tracking.
- `/finance`
  - budgets, approvals, ledgers, cost centers.
- `/marketing`
  - campaigns, sales funnel, budgets.
- `/sales`
  - B2B customers, ecommerce orders, sales orders.
- `/analytics`
  - cross-role analytics with scoped drilldowns.

### 4.4. UI/UX Requirements

- Keep operational screens dense, scannable, and work-focused.
- Use CSS Modules.
- Use centralized services for API access.
- Use reusable components for:
  - data tables.
  - status timelines.
  - kanban boards.
  - approval panels.
  - report threads.
  - audit event lists.
  - scanner inputs.
- All async operations need loading and error states.
- WebSocket views must tolerate disconnects and reconnects.
- Error boundaries should wrap major module areas.
- Dynamic notifications should support ARIA live regions.

### 4.5. Login And Role-Based Layout Redirection

The frontend login page remains the same.

Required behavior:

- Users authenticate with the existing session-auth login flow.
- After `auth/me` returns the authenticated user, organization, role, memberships, and capabilities, the router redirects to the appropriate layout.
- Admin users land in `AdminLayout`.
- Managers land in `ManagerLayout` or their department-specific manager workspace.
- Team Leads land in `TeamLeadLayout`.
- Team Members land in `TeamMemberLayout` / `/work`.
- HR, Finance, IT, Marketing, Storage, Logistics, and Manufacturing specialized users land in the most specific layout permitted by their capabilities.
- If a user has multiple memberships, the app must choose a safe default active organization/department/team and allow permitted workspace switching.
- The frontend must not trust local role values alone; backend session state and capabilities remain the source of truth.

## 5. Phase-by-Phase Implementation Plan

### Phase 1: Foundation, Organization, Permissions, And Audit

Primary goal: establish the control plane before adding large business modules.

Backend:

- Add `Organization` tenant root model.
- Add `organization` app.
- Add capability-based permission system.
- Add audit framework.
- Add request correlation ID middleware.
- Add permission-aware serializers and DRF permissions.
- Migrate current roles into initial role templates:
  - Admin.
  - Storage/Floor Manager.
  - Staff.
  - Viewer.
- Add organization-scoped credential provisioning rules:
  - Admin creates Managers.
  - Managers create Team Leads and Team Members where permitted.
  - temporary credentials are emailed and force password change.

Frontend:

- Add capability-aware route registry.
- Update sidebar/navigation to derive links from capabilities.
- Add initial admin organization console.
- Add workspace context for active department/team.
- Keep the existing login screen and redirect users to layouts based on authenticated role/capabilities.

Acceptance gates:

- Existing login/session auth still works.
- Authenticated user payload includes organization identity and scoped capabilities.
- Existing dashboard/inventory/orders remain accessible to permitted users.
- Tenant-owned APIs cannot read/write another organization's records.
- Admin can create Manager credentials only for their own organization.
- Manager can create Team Lead/Team Member credentials only inside permitted scope.
- Permission grant/revoke is audited.
- User cannot access route or API without required capability.
- `npm run build` passes.
- Backend tests cover basic permission inheritance.

### Phase 2: Reporting, Notifications, And HR Token Foundation

Primary goal: implement bottom-to-top reporting and separate HR issue path.

Backend:

- Add `reports` app.
- Add `hr` app.
- Expand WebSocket routing and notification services.
- Add report escalation services.
- Add HR token generation and delegation services.
- Add SLA Celery tasks.

Frontend:

- Add report inbox and report detail timeline.
- Add issue creation flow for team members.
- Add escalation actions for leads/managers.
- Add HR token submission and tracking screens.
- Add HR case board.

Acceptance gates:

- Team member report reaches team lead live.
- Team lead escalation reaches manager live.
- Manager escalation reaches admin live.
- HR token can be created, tracked, delegated, and audited.
- Unauthorized users cannot view sensitive HR cases.

### Phase 3: Inventory Industrialization And Storage Workflows

Primary goal: prepare inventory for manufacturing and serialized industrial goods.

Backend:

- Add item classification.
- Add batch/lot tracking.
- Add serial number tracking.
- Add inventory states.
- Add reservation model.
- Add cycle count and reconciliation flows.
- Add scanner event endpoints.

Frontend:

- Add storage dashboard.
- Add receiving workflow.
- Add picking/putaway screens.
- Add transfer workflow.
- Add cycle count/reconciliation UI.
- Add barcode/RFID scan entry surfaces.

Acceptance gates:

- Stock cannot go negative.
- Reservations cannot exceed available stock.
- Batch/serial traceability works from receipt to issue.
- Stock movement history remains append-only.

### Phase 4: Manufacturing Core And BOM

Primary goal: convert inventory/order foundation into a production workflow.

Backend:

- Add `manufacturing` app.
- Add BOM and BOM item models.
- Add production plan and production job models.
- Add operation, workstation, machine, tooling models.
- Add material issue and production output services.
- Add QA checkpoint and scrap/rework services.

Frontend:

- Add BOM editor.
- Add production planning board.
- Add manufacturing manager dashboard.
- Add team lead job board.
- Add team member operation/checklist UI.
- Add QA checkpoint UI.

Acceptance gates:

- BOM explosion calculates material requirement.
- Production job can reserve/issue material.
- Operation completion updates progress.
- Finished module/product output enters inventory through audited stock movement.
- QA rejection routes to rework/scrap.

### Phase 5: Procurement, Sales, Logistics, Finance, And Marketing

Primary goal: cover the wider industrial business process.

Backend:

- Add procurement supplier/RFQ/quotation/approval flows.
- Add sales order and customer records.
- Add ecommerce order ingestion interface.
- Add logistics packing/dispatch/shipment tracking.
- Add finance budgets, cost centers, approvals, ledger records.
- Add marketing campaign and budget usage records.

Frontend:

- Add procurement dashboard.
- Add sales order board.
- Add B2B customer views.
- Add logistics dispatch board.
- Add finance approval and budget screens.
- Add marketing campaign budget/result screens.

Acceptance gates:

- PO finance approval can gate purchasing.
- Sales orders reserve finished goods.
- Logistics dispatch consumes packed goods only through approved workflow.
- Marketing budget spend is recorded and reportable.
- Finance changes are append-only or fully audited.

### Phase 6: Analytics, Command Center, And Optimization

Primary goal: provide complete business visibility at every hierarchy level.

Backend:

- Expand analytics read models.
- Add department-specific KPI services.
- Add Celery aggregation tasks.
- Add materialized/cached summaries where needed.
- Add admin command center endpoints.
- Add report/issue SLA metrics.

Frontend:

- Add Admin Command Center.
- Add Manager departmental analytics.
- Add Team Lead team analytics.
- Add Team Member personal work analytics.
- Add HR, Finance, Logistics, Marketing dashboards.

Acceptance gates:

- Admin can see cross-department health.
- Managers can only see scoped department/team analytics unless granted broader access.
- Dashboards do not run heavy synchronous queries.
- WebSocket activity streams do not leak unauthorized data.

### Phase 7: Production Hardening And Package Readiness

Primary goal: make the application suitable as a serious industrial software package.

Backend:

- Structured JSON logging for production.
- Sentry or equivalent error tracking.
- Prometheus/Grafana metrics.
- Backup and restore documentation.
- API versioning policy.
- Idempotency keys for critical commands.
- Outbox pattern for reliable event dispatch.
- Load testing for high-volume stock/report events.
- Security review for permissions, HR, finance, and WebSockets.

Frontend:

- Error boundaries per module.
- Permission-aware route testing.
- Accessibility review.
- Performance profiling.
- Offline/retry support for report drafts and shop-floor progress updates.
- Production build checks.

Acceptance gates:

- Critical endpoints have tests.
- Critical service transitions have tests.
- Permission bypass attempts are covered.
- Audit trail can reconstruct key workflows.
- Deployment docs exist.

## 6. Suggested Backend App Structure

Target backend app list:

- `accounts`
- `organization`
- `permissions`
- `audit`
- `notifications`
- `reports`
- `hr`
- `it`
- `inventory`
- `manufacturing`
- `procurement`
- `orders` or compatibility facade during migration
- `sales`
- `logistics`
- `finance`
- `marketing`
- `analytics`
- `integrations`
- `documents`
- `devtools`

Each app should include these files when applicable:

- `models.py`
- `serializers.py`
- `views.py`
- `urls.py`
- `services.py`
- `permissions.py`
- `filters.py`
- `tasks.py`
- `signals.py`
- `tests.py`

## 7. Cross-Cutting Workflow Contracts

### 7.1. State Transition Contract

Every important workflow should use explicit service functions:

- `create_organization`
- `create_organization_admin`
- `create_manager_credentials`
- `create_team_user_credentials`
- `grant_capability`
- `revoke_capability`
- `create_issue_report`
- `escalate_issue_report`
- `create_hr_token`
- `delegate_hr_case`
- `reserve_stock`
- `issue_material_to_job`
- `complete_job_operation`
- `record_quality_checkpoint`
- `receive_purchase_order_item`
- `approve_budget`
- `dispatch_sales_order`

Each service must:

- validate tenant ownership.
- validate actor permissions.
- validate object state.
- run inside `transaction.atomic()` if it writes critical state.
- write audit events.
- dispatch notification/domain events after successful commit.
- log success/failure with request id.

### 7.2. WebSocket Contract

WebSocket consumers must:

- authenticate via session.
- bind every connection to the user's organization.
- join only authorized groups.
- validate any inbound payloads.
- never expose private HR or finance information to broad groups.
- separate personal notifications from department/team broadcasts.
- include organization id in group naming or group authorization strategy so tenant events cannot collide.
- degrade gracefully when Redis/Channels is unavailable.

### 7.3. Analytics Contract

Analytics must:

- use cached/read-model summaries for heavy dashboards.
- run expensive aggregation through Celery.
- partition summaries by organization.
- scope data by capability and active department/team.
- allow drilldown from KPI to source records.
- never calculate sensitive finance or salary information in the browser.

## 8. Additional Strategic Recommendations for Industrial Readiness

To truly elevate the software to a cutting-edge Tech Manufacturing standard, consider integrating these advanced features:

1. **IoT & Edge Automation (Shop Floor):**
   - Provide APIs specifically for barcode/RFID scanners used by the Storage team.
   - Accept direct telemetry from manufacturing machines such as pick-and-place machines, test rigs, calibration stations, and assembly counters.
   - Prefer an integration gateway for MQTT, HTTP webhooks, or WebSocket ingestion so machine telemetry does not directly modify core inventory without validation.
   - Store raw telemetry separately from approved production records.

2. **Quality Assurance (QA) Checkpoints:**
   - Introduce strict QA gates.
   - A module cannot be assembled into a final product until a user with the required QA capability digitally signs off on the production checkpoint.
   - Track test results, inspection attachments, pass/fail reason, rework instruction, and scrap reason.
   - Add serial-number traceability from raw material batch to module to final product.

3. **Predictive Supply Chain Analytics (AI/ML):**
   - Track historical manufacturing speed, sales velocity, supplier delivery time, rejection rate, and seasonality.
   - Use Celery tasks to generate shortage forecasts and recommended purchase orders.
   - Flag raw materials projected to run out within configured windows such as 7, 14, or 30 days.
   - Keep AI recommendations as suggestions until a permitted user approves them.

4. **B2B & Supplier Portals:**
   - Create restricted external portals for suppliers to update purchase order shipping statuses.
   - Create restricted B2B client portals for sales order status and delivery tracking.
   - Keep external users isolated through scoped permissions and separate portal layouts.
   - Audit all external status updates.

5. **eCommerce Webhook Integrations:**
   - Expose secure endpoints to ingest orders from Shopify, WooCommerce, custom storefronts, or marketplace connectors.
   - Use signed webhooks and idempotency keys.
   - Convert ecommerce orders into internal `SalesOrder` records before logistics touches stock.
   - Queue failed webhook processing for retry rather than losing orders.

6. **Document And Attachment Management:**
   - Add a `documents` app for invoices, supplier quotations, QA certificates, HR attachments, delivery proofs, and manufacturing instructions.
   - Enforce per-document permissions and retention rules.
   - Scan/sanitize uploaded files before storage.

7. **Digital Approval Chains:**
   - Define approval templates for finance, procurement, HR delegation, production release, and QA signoff.
   - Approvals should support thresholds, substitute approvers, rejection reasons, and full history.

8. **Costing And Profitability:**
   - Track standard cost and actual cost for modules and final products.
   - Roll up BOM material cost, labor estimate, scrap cost, logistics cost, and marketing spend.
   - Provide product-level profitability dashboards.

9. **Maintenance And Calibration:**
   - Add maintenance schedules for machines, tools, test rigs, and calibration equipment.
   - Block production operations if required equipment is expired, under maintenance, or failed calibration.

10. **Compliance And Traceability:**
    - Support complete traceability from supplier batch to finished product shipment.
    - Preserve immutable records for audits, warranty claims, recalls, and customer complaints.

## 9. Agent Implementation Checklist

Before implementing any upgrade task, an AI agent must verify:

- Which organization/tenant owns the data.
- Which phase the task belongs to.
- Which app owns the model/service/API.
- Which existing invariant must be preserved.
- Which capabilities are required.
- Which audit events must be written.
- Which WebSocket notifications are required.
- Which frontend layout owns the page.
- Which tests or build checks must be run.

No agent should add a new industrial feature as an isolated page or isolated model without connecting it to permissions, audit, notifications, and the relevant department/team context.
