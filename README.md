# Industrial Production ERP (Upgraded from Home Inventory)

Welcome to the **Industrial Production ERP**! Originally developed as a Home Inventory Management System, this application is being systematically upgraded into a high-concurrency, auditable, and role-scoped ERP designed to manage a full-scale industrial tech manufacturing warehouse.

The platform tracks products from raw materials to final assemblies (e.g., IoT devices, drone components), manages departments (Manufacturing, Storage, Logistics, Finance, Marketing, HR, IT, Administration), enforces capability-based access control, tracks bottom-to-top issue reports with live notifications, and processes bills of materials (BOMs) with full traceability.

---

## 1. Project Overview

### Core Technology Stack
*   **Frontend**: React.js (Vite), React Router DOM v6+, CSS Modules, Axios (with Session Credentials), Native WebSockets.
*   **Backend**: Python 3.x, Django, Django REST Framework (DRF), Django Channels (WebSockets).
*   **Database & Infrastructure**: PostgreSQL (Primary DB), Redis (Cache & Message Broker), Celery (Background Tasks), Docker.

### Business Logic Summarized
*   **Inventory Hierarchy**: Strict top-down physical mapping: `Warehouse` &rarr; `Floor` &rarr; `Rack` &rarr; `Shelf (Location)`.
*   **Stock Rules**: Stock represents a specific `Product` at a specific `Location`. Stock levels **must never be negative**.
*   **Order Management**:
    *   **Purchase Orders (PO)**: Inbound stock. Supports partial and full receiving.
    *   **Work Orders (WO)**: Outbound stock (consumption). Reserves stock on issue; decrements stock on completion. Warns on insufficient stock.
*   **Predictive Pricing**: A background Celery worker analyzes market price trends to dynamically estimate future predictive prices.

### Process & Security
*   **Concurrency**: Every stock movement is enclosed within a `transaction.atomic()` block using `select_for_update()` and optimistic locking to prevent race conditions.
*   **Authentication**: Secure, HTTP-only Django Session Authentication. (No JWTs).
*   **Real-time**: Actionable events (e.g., low stock warnings, PO receipts) trigger instant WebSocket notifications.

---

## 2. Detailed Documentation

The project logic and guidelines are governed strictly by the AI Agent constraints. Refer to the underlying configuration docs:

*   **[GEMINI.md](file:///e:/Live/home_inventory/GEMINI.md)**: The single source of truth containing mandatory coding rules, file naming conventions, frontend/backend guidelines, security constraints, and forbidden agent actions.

---

## 3. Foundational Architecture & Workflow Maps

### 3.1. High-Level System Architecture

This diagram defines how the React client interacts with the Django backend via REST APIs and WebSockets, and how the backend distributes the workload.

```mermaid
graph TD
    %% Frontend Layer
    Client[React.js Frontend Client]
    
    %% API & WebSockets
    Client -->|REST API / Session Auth| DRF[Django REST Framework]
    Client -->|Native WebSockets| Channels[Django Channels]
    
    %% Backend Services
    DRF --> Services[Django Services Layer]
    Channels --> Services
    
    %% DB & Cache
    Services -->|Django ORM / Atomic Transactions| DB[(PostgreSQL)]
    Services -->|Caching & Channels Layer| Redis[(Redis)]
    
    %% Async Workers
    Redis -->|Message Broker| Celery[Celery Async Workers]
    Celery -->|Predictive Pricing / Analytics| DB
    
    %% Styling
    classDef frontend fill:#61dafb,stroke:#000,stroke-width:2px,color:#000;
    classDef backend fill:#092e20,stroke:#000,stroke-width:2px,color:#fff;
    classDef db fill:#336791,stroke:#000,stroke-width:2px,color:#fff;
    classDef redis fill:#dc382d,stroke:#000,stroke-width:2px,color:#fff;
    classDef celery fill:#bde871,stroke:#000,stroke-width:2px,color:#000;

    class Client frontend;
    class DRF,Channels,Services backend;
    class DB db;
    class Redis redis;
    class Celery celery;
```

### 3.2. Inventory Hierarchy

```mermaid
graph TD
    W[Warehouse] -->|Contains| F[Floor]
    F -->|Contains| R[Rack]
    R -->|Contains| S[Shelf / Location]
    S -->|Holds| ST[Stock Quantity]
    P[Product Definition] -.->|Instantiated As| ST
```

### 3.3. Legacy Order Processing Workflow (PO & WO)

```mermaid
stateDiagram-v2
    direction TB

    state "Purchase Order (Inbound)" as PO {
        [*] --> Issued_PO: PO Sent to Supplier
        Issued_PO --> Received: All Items Received\n(Stock +)
        Issued_PO --> Partially_Received: Some Items Received\n(Stock +)
        Partially_Received --> Received: Remaining Received\n(Stock +)
    }

    state "Work Order (Outbound)" as WO {
        [*] --> Issued_WO: Job Issued\n(Stock Reserved)
        Issued_WO --> Pending: Job Incomplete\n(Insufficient Stock Alert)
        Issued_WO --> Completed_Fully: Job Completed\n(Products Fully Used)
        Issued_WO --> Completed_Partial: Job Completed\n(Products Partially Used)
        Issued_WO --> Completed_NotUsed: Job Completed\n(Products Not Used)
        
        Completed_Partial --> Appended_WO: Append Remaining to WO
        Completed_NotUsed --> Appended_WO: Append Remaining to WO
        Pending --> Appended_WO: Append Missing to WO
    }
```

---

## 4. Industrial Production ERP Upgrade Plan

The system is undergoing a transition to handle full-scale manufacturing, logistics, and resource tracking. 

### 4.1. Facility Layout and Operational Flow
Below is a conceptual layout visualization of the target industrial facility showing the flow of materials through various departments.

![Industrial Facility Map](docs/assets/industrial_facility_map.png)

### 4.2. Upgrade Structural Diagrams

#### A. Organizational Structure & Reporting Lines
The hierarchy separates administrative, department-level management, team-level leadership, and shop-floor execution. A Team Lead can explicitly lead multiple teams. Reporting lines follow a bottom-to-top approach.

```mermaid
graph TD
    %% Roles
    Admin[Admin / Executive Command]
    
    %% Department Managers
    MgrMfg[Manufacturing Manager]
    MgrStor[Storage Manager]
    MgrLog[Logistics Manager]
    MgrFin[Finance Manager]
    MgrMkt[Marketing Manager]
    MgrHR[HR Manager]
    MgrIT[IT Manager]
    
    %% Admin assigns Managers
    Admin -->|Assigns| MgrMfg
    Admin -->|Assigns| MgrStor
    Admin -->|Assigns| MgrLog
    Admin -->|Assigns| MgrFin
    Admin -->|Assigns| MgrMkt
    Admin -->|Assigns| MgrHR
    Admin -->|Assigns| MgrIT
    
    %% Teams & Team Leads
    TL1[Team Lead A]
    TL2[Team Lead B]
    TL3[Team Lead C]
    
    %% Multi-team assignment
    MgrMfg -->|Appoints| TL1
    MgrMfg -->|Appoints| TL2
    MgrStor -->|Appoints| TL2
    MgrLog -->|Appoints| TL3
    
    %% Teams
    Team1[Manufacturing Team 1]
    Team2[Assembly Team 2]
    Team3[Storage/Picking Team]
    Team4[Shipping/Dispatch Team]
    
    TL1 -->|Leads| Team1
    TL2 -->|Leads| Team2
    TL2 -->|Leads| Team3
    TL3 -->|Leads| Team4
    
    %% Members
    Mem1[Team Member 1]
    Mem2[Team Member 2]
    Mem3[Team Member 3]
    Mem4[Team Member 4]
    
    Team1 -->|Contains| Mem1
    Team2 -->|Contains| Mem2
    Team3 -->|Contains| Mem3
    Team4 -->|Contains| Mem4
    
    %% Reporting Lines (Bottom-to-Top)
    Mem1 -.->|Reports to| TL1
    Mem2 -.->|Reports to| TL2
    Mem3 -.->|Reports to| TL2
    Mem4 -.->|Reports to| TL3
    
    TL1 -.->|Reports to| MgrMfg
    TL2 -.->|Reports to| MgrMfg
    TL2 -.->|Reports to| MgrStor
    TL3 -.->|Reports to| MgrLog
    
    MgrMfg -.->|Reports to| Admin
    MgrStor -.->|Reports to| Admin
    MgrLog -.->|Reports to| Admin
    MgrFin -.->|Reports to| Admin
    MgrMkt -.->|Reports to| Admin
    MgrHR -.->|Reports to| Admin
    MgrIT -.->|Reports to| Admin
    
    classDef admin fill:#f96,stroke:#333,stroke-width:2px;
    classDef manager fill:#9cf,stroke:#333,stroke-width:2px;
    classDef lead fill:#ff9,stroke:#333,stroke-width:2px;
    classDef member fill:#dfd,stroke:#333,stroke-width:2px;
    classDef team fill:#eee,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5;
    
    class Admin admin;
    class MgrMfg,MgrStor,MgrLog,MgrFin,MgrMkt,MgrHR,MgrIT manager;
    class TL1,TL2,TL3 lead;
    class Mem1,Mem2,Mem3,Mem4 member;
    class Team1,Team2,Team3,Team4 team;
```

#### B. Capability-Based Permission Cascading
Access control shifts from simple user roles to granular scoped capabilities. Permissions are delegated top-to-bottom and are bounded by the scope of the delegator (Global, Department, Team, Location, or Object-scoped). Every grant is recorded in an immutable audit ledger.

```mermaid
graph TD
    Admin[Admin Context] -->|Holds Global Capabilities| GCap[Global Capabilities]
    
    Admin -->|Delegates Scoped Capabilities| Mgr[Manager Context]
    Mgr -->|Department Scope| DeptCap[Department Capabilities]
    
    Mgr -->|Delegates Sub-capabilities| Lead[Team Lead Context]
    Lead -->|Team/Location Scope| TeamCap[Team/Location Capabilities]
    
    Lead -->|Delegates Task-capabilities| Mem[Team Member Context]
    Mem -->|Object Scope| ObjectCap[Task/Object Capabilities]
    
    %% Constraints
    GCap -->|Restricts| DeptCap
    DeptCap -->|Restricts| TeamCap
    TeamCap -->|Restricts| ObjectCap
    
    %% Audit
    Audit[(Permission Audit Log)]
    Admin -.->|Audits Grant/Revoke| Audit
    Mgr -.->|Audits Grant/Revoke| Audit
    Lead -.->|Audits Grant/Revoke| Audit
```

#### C. Bottom-to-Top Reporting & Escalation WebSocket Flow
All issues submitted by members flow up the reporting chain. Real-time updates route dynamically via Django Channels to specific WebSocket groups, ensuring only responsible personnel are notified. Celery background workers monitor SLAs and trigger alerts for breaches.

```mermaid
graph LR
    %% Submitter and levels
    Member[Team Member] -->|1. Submits IssueReport| Lead[Team Lead]
    Lead -->|2. Resolves or Escalates| Manager[Manager]
    Manager -->|3. Resolves or Escalates| Admin[Admin]
    
    %% WebSocket Push notifications
    subgraph Live WS Notifications
        WS_User[user_id group]
        WS_Team[team_id group]
        WS_Dept[department_id group]
        WS_Admin[role_admin group]
    end
    
    Member -->|Pushes event| WS_Team
    Lead -->|Pushes escalation| WS_Dept
    Manager -->|Pushes escalation| WS_Admin
    
    %% SLA alerts
    Celery[Celery SLA Watcher] -->|Monitors SLAs| Alert[Trigger SLA Breach Event]
    Alert -->|Pushes to| WS_Admin
    Alert -->|Pushes to| WS_Dept
```

#### D. HR Token Submit & Delegated Case Lifecycle
The HR token system allows users to submit issues anonymously and track them via an immutable `HRToken`. Cases can be delegated by HR to managers or leads with a recorded reason, maintaining strict privacy gates.

```mermaid
stateDiagram-v2
    direction TB
    
    [*] --> Submitted : User submits HR Issue
    Submitted --> TokenIssued : System issues anonymous tracking HRToken
    TokenIssued --> CaseCreated : HR Case initialized (confidential)
    
    state CaseCreated {
        InReview : HR reviews details
        Delegated : Delegated to Department Manager / Team Lead
        UnderInvestigation : HR + Manager review with user
    }
    
    CaseCreated --> InReview
    InReview --> Delegated : Requires local context\n(Reason & Scoped Permissions recorded)
    Delegated --> UnderInvestigation : Feedback provided
    UnderInvestigation --> Resolved : Action taken & verified
    Resolved --> Closed : Submitter confirms resolution
    Closed --> [*]
    
    note right of CaseCreated
        All Case details & Message Threads
        are encrypted and permission-gated
        by HR capability.
    end note
```

#### E. Industrial Inventory Lifecycle & Product Classification
Products are classified into Raw Materials, Modules, and Final Products. Stock records transition through formal inventory states based on operational activities (receiving, reservation, manufacturing issue, quality gating, and scrapping).

```mermaid
graph TD
    %% Classifications
    subgraph Product Classifications
        RM[Raw Material]
        MOD[Module]
        FP[Final Product]
        CON[Consumable]
        TL[Tool]
        EQ[Equipment]
    end
    
    %% States
    subgraph Stock States
        AV[AVAILABLE]
        RES[RESERVED]
        ISS[ISSUED]
        WIP[WIP]
        QA[QUARANTINE]
        REJ[REJECTED]
        SCR[SCRAP]
        RET[RETURNED]
    end
    
    %% State transitions
    RM -->|1. Received & Available| AV
    AV -->|2. Reserved for Job| RES
    RES -->|3. Issued to Assembly| ISS
    ISS -->|4. Assembly Process| WIP
    WIP -->|5. Production Output| QA
    QA -->|6a. Passed QC| AV
    QA -->|6b. Failed QC| REJ
    REJ -->|7a. Rework| WIP
    REJ -->|7b. Scrap| SCR
    AV -->|8. Customer Return| RET
    RET -->|9. Evaluation| QA
```

#### F. Manufacturing BOM & Job Workflows
The manufacturing engine manages production plans and jobs. BOM item verification prevents circular loops. Material issues and output updates are wrapped in atomic transactions with strict row-locking, requiring a Quality Control sign-off before entering inventory.

```mermaid
sequenceDiagram
    autonumber
    actor AdminMgr as Manager / Admin
    participant MfgSvc as Manufacturing Service
    participant InvSvc as Inventory Service
    participant WS as Workstation / Team
    participant QA as QA Checkpoint
    
    AdminMgr->>MfgSvc: Create Production Plan & Job (Target SKU, Quantity)
    MfgSvc->>MfgSvc: Explode BOM (Calculate required Raw Materials & Modules)
    MfgSvc->>InvSvc: Verify & Reserve Stock (select_for_update inside transaction.atomic)
    alt Stock Available
        InvSvc-->>MfgSvc: Stock Reserved (State: RESERVED)
        MfgSvc->>WS: Assign Production Job & Dispatch Operations
        WS->>InvSvc: Consume Reserved Stock (State: ISSUED -> WIP)
        WS->>WS: Assembly & Telemetry recording
        WS->>QA: Submit completed units for inspection
        QA->>QA: Run QA Checkpoints (QC Signoff)
        alt Passed QA
            QA->>InvSvc: Receive Finished Goods (State: AVAILABLE, StockMovement generated)
            QA-->>MfgSvc: Job Completed - Products Fully Used
        else Failed QA
            QA->>InvSvc: Log Scrap / Reject Goods (State: REJECTED / SCRAP, movement generated)
            QA-->>MfgSvc: Job Pending - Insufficient Stock / Rework needed
        end
    else Stock Insufficient
        InvSvc-->>MfgSvc: Reservation Failed
        MfgSvc-->>AdminMgr: Reject Plan / Mark Pending (Job Pending - Insufficient Stock)
    end
```

### 4.3. Phased Implementation Plan

*   **Phase 1: Foundation, Organization, Permissions, And Audit**
    Establish the organizational structure (`organization` app), capability-based permissions, and correlation-tracked audit logs (`audit` app). Set up the frontend capability-driven layouts.
*   **Phase 2: Reporting, Notifications, And HR Token Foundation**
    Implement bottom-to-top reporting routing (`reports` app) and the anonymous HR token case workflow (`hr` app). Configure scoped WebSocket notification groups.
*   **Phase 3: Inventory Industrialization And Storage Workflows**
    Extend inventory tracking with product classifications, stock states, reservations, cycle counting, and barcode scanner APIs.
*   **Phase 4: Manufacturing Core And BOM**
    Introduce the `manufacturing` app with Bill of Materials validation (loop detection), production jobs, workstation assignments, and QA checkpoints.
*   **Phase 5: Procurement, Sales, Logistics, Finance, And Marketing**
    Expand business operations with B2B sales pipelines, procurement workflow validation, shipping carriers, and budget cost-center approval chains.
*   **Phase 6: Analytics, Command Center, And Optimization**
    Create the Admin Command Center dashboard, Manager departmental metrics, and Team Lead work boards utilizing Redis caching and Celery compilation.
*   **Phase 7: Production Hardening And Package Readiness**
    Implement Sentry tracking, Prometheus metrics, outbox events, and offline-mode support for shop-floor scanner apps.

---

## 5. Development & Deployment Flow

### Git Branching Strategy

We follow a strict Git flow. Direct commits to `main` or `develop` are prohibited. All features must be branched from `develop` and merged back via Pull Requests. `main` is strictly reserved for production-ready code.

```mermaid
gitGraph
   commit id: "Initial Commit"
   branch develop
   checkout develop
   commit id: "Setup Django & React"
   
   %% Feature 1
   branch feature/inventory-models
   checkout feature/inventory-models
   commit id: "Create Hierarchy Models"
   commit id: "Add Stock Constraints"
   checkout develop
   merge feature/inventory-models tag: "PR #1"
   
   %% Feature 2
   branch feature/po-workflow
   checkout feature/po-workflow
   commit id: "Create PO Services"
   commit id: "Add Atomic Transactions"
   checkout develop
   merge feature/po-workflow tag: "PR #2"
   
   %% Release
   branch release/v1.0
   checkout release/v1.0
   commit id: "Version Bump & QA"
   
   %% Production
   checkout main
   merge release/v1.0 tag: "v1.0.0"
   
   %% Backport to Develop
   checkout develop
   merge release/v1.0
   
   %% Hotfix
   checkout main
   branch hotfix/ws-auth-bug
   checkout hotfix/ws-auth-bug
   commit id: "Fix WebSocket Session"
   checkout main
   merge hotfix/ws-auth-bug tag: "v1.0.1"
   checkout develop
   merge hotfix/ws-auth-bug
```

### Branch Naming Conventions
*   **Features**: `feature/<issue-number>-<brief-description>`
*   **Bug Fixes**: `bugfix/<issue-number>-<brief-description>`
*   **Hotfixes**: `hotfix/<issue-number>-<brief-description>` (branched directly from `main`)
*   **Releases**: `release/vX.Y.Z`