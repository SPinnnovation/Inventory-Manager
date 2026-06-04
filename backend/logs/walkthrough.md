# Walkthrough: Industrial Production ERP Documentation Upgrade

This walkthrough summarizes the changes made to prepare the system documentation and AI agent rulebook for the transition from the Home Inventory System to the **Industrial Production ERP**.

## Changes Made

### 1. Generated Facility Layout Map
- Created a professional, detailed visualization of the target industrial facility's operational flow showing the zones for Storage (Raw Materials), Manufacturing, Quality Assurance, and Logistics.
- Saved the image to the project directory: [industrial_facility_map.png](file:///e:/Live/home_inventory/docs/assets/industrial_facility_map.png)

### 2. Updated GEMINI.md (AI Agent Rulebook)
- Modified [GEMINI.md](file:///e:/Live/home_inventory/GEMINI.md) to define the project scope as an **Industrial Production ERP**.
- Expanded the backend structure to list all 17 target apps, including the new `it` app: `accounts`, `organization`, `permissions`, `audit`, `notifications`, `reports`, `hr`, `it`, `inventory`, `manufacturing`, `procurement`, `orders`, `sales`, `logistics`, `finance`, `marketing`, `analytics`.
- Added the `ITLayout` to the capability-driven layout list and `IT` page group to the page-level components grouping.
- Documented strict coding guidelines for:
  - Capability-based authorization checks scoped by Department, Team, Location, and Object.
  - Bottom-to-top issue escalation flows.
  - HR Token/Case privacy and messaging security.
  - Manufacturing Bill of Materials (BOM) validation (prohibiting circular loops) and transactional stock updates.
  - Correlation-tracked audit logging for all critical state changes.

### 3. Updated README.md (Project Blueprint)
- Updated [README.md](file:///e:/Live/home_inventory/README.md) to detail the upgrade vision, listing `IT` under target departments, and embed the newly generated facility layout map.
- Created 6 detailed Mermaid.js diagrams illustrating the target architecture:
  1. **Organizational Hierarchy & Reporting Lines** (how managers, including the new IT Manager `MgrIT`, team leads, and members are structured and report to Admin).
  2. **Capability-Based Permission Cascading** (how capabilities flow top-to-bottom and bind to specific scopes).
  3. **Bottom-to-Top Reporting & Escalation WebSocket Flow** (how issue reports are routed and trigger real-time notifications).
  4. **HR Token & Case Lifecycle** (the confidential case flow tracked by anonymous HRTokens).
  5. **Industrial Inventory Lifecycle & Product Classification** (how raw materials, modules, and finished goods transition through stock states).
  6. **Manufacturing BOM & Job Workflows** (sequence diagram showing plans, BOM explosions, stock reservations, workstation executions, and QC gates).
- Documented the details of the 7-phase implementation plan.

## Verification & Validation

- **Mermaid Syntax Validation**: Verified that all Mermaid diagrams are syntactically valid and render correctly in markdown viewers.
- **Structural Integrity**: Cross-referenced all app names, model definitions, and security guidelines with [.agents/jobs/industrial_upgrade_proposal.md](file:///e:/Live/home_inventory/.agents/jobs/industrial_upgrade_proposal.md) to ensure perfect consistency.
