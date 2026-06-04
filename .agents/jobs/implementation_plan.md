# Plan: Multi-Tenancy & Tenant Admin Credential Flow in ERP Documentation

This plan outlines the documentation upgrades to define the Multi-Tenancy model, Organization Admin role boundaries, subordinate credential flows, and frontend role-based redirection. These updates will be applied to the upgrade proposal, `GEMINI.md`, and all rules/stack files.

## User Review Required

Documenting key architectural directions:
> [!IMPORTANT]
> - **Multi-Tenancy Pattern**: We are defining a **Shared Database with Tenant Isolation** model. The `Organization` model will act as the Tenant. Every model (users, inventory, orders, analytics, notifications) must link to the tenant and be scoped to isolate tenant data.
> - **Credential Delegation**: Admin creates Managers and emails them credentials via Celery. Managers create and distribute credentials for Team Leads and Team Members.
> - **Layout Redirection**: Standard login page is kept, and the router directs users to layout shells (`AdminLayout`, `ManagerLayout`, `TeamLeadLayout`, etc.) based on their role and capabilities.

## Open Questions

None at this time.

## Proposed Changes

### Documentation & Rules

---

#### [MODIFY] [industrial_upgrade_proposal.md](file:///e:/Live/home_inventory/.agents/jobs/industrial_upgrade_proposal.md)
We will add sections to the proposal defining:
- **Section 1.1 Multi-Tenancy Blueprint**: Scoping of all models by `Organization` (Tenant), query filtering, and data isolation.
- **Section 3.10 Admin-to-Manager Credential Flow**: Details on how `Admin` creates managers and triggers secure credential emails, and how managers handle lead/member accounts.
- **Section 4.5 Role Redirection**: Redirection flow from a standard login screen to capability-driven layouts.

---

#### [MODIFY] [GEMINI.md](file:///e:/Live/home_inventory/GEMINI.md)
We will add strict rules in the backend, frontend, and security sections to enforce:
- Mandatory foreign key to `Organization` on all tenant-owned models.
- Automatic query scoping by the authenticated user's tenant organization.
- Credential creation limitations (Admins create managers; managers create leads/members).
- Redirection guards based on roles.

---

#### [MODIFY] [backend-rules.md](file:///e:/Live/home_inventory/.agents/rules/backend-rules.md)
We will update backend rules to enforce:
- Multi-tenancy isolation via custom model managers or base querysets.
- Celery-driven asynchronous manager credential emails.
- Gating endpoints so that users can only view/modify records within their own tenant organisation.

---

#### [MODIFY] [business-logic.md](file:///e:/Live/home_inventory/.agents/rules/business-logic.md)
We will add constraints:
- Enforcing that stock, reservations, orders, and BOMs are strictly isolated by Organization (Tenant). No cross-organization stock movements.

---

#### [MODIFY] [frontend-rules.md](file:///e:/Live/home_inventory/.agents/rules/frontend-rules.md)
We will update:
- The global state context (`AuthContext`) to track `organization_id` and role.
- Redirection routes in the standard login flow to load specific layouts based on user capability scopes.

---

#### [MODIFY] [security.md](file:///e:/Live/home_inventory/.agents/stack/security.md)
We will add rules:
- Scoping session auth to validate organization ID.
- Preventing access to other tenants' data (data leakage protection).
- Secure password generation and transmission rules for manager creation.

---

#### [MODIFY] [tech-stack.md](file:///e:/Live/home_inventory/.agents/stack/tech-stack.md)
- Update platform description to mention that it is a multi-tenant SaaS Industrial Production ERP.

## Verification Plan

### Manual Verification
- Verify that all Mermaid diagrams and markdown files compile cleanly.
- Verify that all folder paths and names are correct.
- Cross-reference with existing Django models to ensure alignment.
