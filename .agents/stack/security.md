--------------------
trigger: always_on
--------------------

# Security Guardrails

## 1. Authentication & Authorization
* Use Django's built-in Session Authentication.
* Ensure `CSRF_COOKIE_HTTPONLY` and `SESSION_COOKIE_HTTPONLY` are set to True.
* Implement role-based access control (RBAC). Only authorized personnel (e.g., Admins, Floor Managers) can approve POs or WOs.
* Enforce multi-tenant authorization. Every authenticated user must be scoped to an `Organization`, and tenant-owned data must be filtered by that organization.
* Organization Admin is the top role inside a tenant Organization. Managers, Team Leads, Team Members, HR, Finance, IT, Manufacturing, Storage, Logistics, Marketing, and Sales users remain scoped to that Organization.
* Ensure that sensitive operations (e.g., modifying stock, issuing work orders) require appropriate permissions and are logged for auditing purposes.
* Implement account lockout mechanisms after a certain number of failed login attempts to prevent brute-force attacks. This can be achieved using Django's built-in authentication backends or third-party packages like `django-axes`.
* Ensure that password policies are enforced (e.g., minimum length, complexity requirements) to enhance account security. Consider implementing multi-factor authentication (MFA) for added security, especially for users with elevated permissions.
* Organization Admin users create Manager accounts and send generated temporary credentials through the backend email flow. Managers handle Team Lead and Team Member credentials only within their permitted scope.
* Generated credentials must force password change on first login and must never be logged, stored in plaintext, sent over WebSockets, or returned in normal API responses.

## 1.1. Multi-Tenant Isolation
* `Organization` is a security boundary. A cross-organization data leak is a critical security defect.
* Tenant-owned models must include organization ownership directly or through a mandatory parent relation.
* Tenant-owned querysets must be filtered by authenticated organization before serialization.
* Client-submitted `organization_id` must never be trusted to decide ownership.
* Services must reject operations that combine objects from different organizations.
* Audit events, notifications, WebSocket groups, analytics summaries, and background jobs must preserve organization context.

## 2. Concurrency & Race Conditions
* Inventory systems are highly susceptible to race conditions.
* **Rule:** All stock modifications (Stock In / Stock Out) must be executed within `transaction.atomic()` blocks.
* Use `select_for_update()` when reading Stock rows before modifying them to lock the row and prevent concurrent overwrites.
* Implement optimistic locking by adding a `version` field to the Stock model. Increment this field on each update and check it before saving to detect concurrent modifications.
* Ensure that all operations that modify stock quantities are idempotent, meaning that if the same operation is attempted multiple times (e.g., due to retries), it will not result in inconsistent stock levels. This can be achieved by using unique transaction identifiers or by checking the current state of the stock before applying changes.
* Implement comprehensive logging for all stock modifications, including the user responsible, the quantity changed, and the reason for the change (e.g., PO received, WO issued). This log should be immutable and accessible for review by authorized personnel to facilitate auditing and troubleshooting of inventory discrepancies.

## 3. Data Validation & Sanitization
* Strictly validate all incoming data via DRF Serializers.
* Never trust client-side calculations for quantities or prices; always recalculate/verify on the server.
* Sanitize all file uploads (Product Images) to prevent malicious script injection.
* Implement server-side validation to ensure that all referenced Products and Locations exist before processing any Stock Movements, Purchase Orders, or Work Orders. This prevents orphaned records and maintains data integrity.
* Ensure that all user inputs are properly sanitized and validated to prevent common web vulnerabilities such as SQL injection, cross-site scripting (XSS), and cross-site request forgery (CSRF). This includes validating and sanitizing any data that is stored in the database or rendered in the frontend, such as product names, descriptions, and user-generated content.
* Implement strict validation for all API endpoints, ensuring that only valid data is accepted and processed. This includes validating data types, required fields, and business rules (e.g., stock quantities cannot be negative). Provide clear and informative error messages when validation fails to help users correct their input.

## 4. WebSocket Security
* Ensure WebSocket connections check the user's session cookie. Reject connections from unauthenticated users.
* Bind every WebSocket connection to the authenticated user's Organization.
* Use tenant-qualified groups such as `org_<id>_user_<id>`, `org_<id>_team_<id>`, `org_<id>_department_<id>`, and `org_<id>_role_admin`.
* Implement rate limiting and throttling for WebSocket connections to prevent abuse and denial-of-service attacks.
* Ensure that all messages sent over WebSockets are properly validated and sanitized to prevent injection attacks. This includes validating the structure and content of messages before processing them on the server or rendering them in the frontend.
* Implement proper error handling for WebSocket connections, including handling unexpected disconnections and ensuring that sensitive information is not exposed in error messages. Consider implementing a retry mechanism for critical WebSocket messages to ensure reliable delivery, while also preventing potential abuse through excessive retries.
