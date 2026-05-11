# Home Inventory Management System

Welcome to the **Home Inventory Management System**! This application is designed to meticulously track household and warehouse inventory, manage inbound (Purchase Orders) and outbound (Work Orders) stock, and provide real-time analytics and predictive pricing using a robust, highly-concurrent architecture.

---

## 1. Project Overview

### Core Technology Stack
*   **Frontend**: React.js (Vite), React Router DOM v6+, CSS Modules, Axios (with Session Credentials), Native WebSockets.
*   **Backend**: Python 3.x, Django, Django REST Framework (DRF), Django Channels (WebSockets).
*   **Database & Infrastructure**: PostgreSQL (Primary DB), Redis (Cache & Message Broker), Celery (Background Tasks), Docker.

### Business Logic Summarized
*   **Inventory Hierarchy**: Strict top-down physical mapping mapping: `Warehouse` &rarr; `Floor` &rarr; `Rack` &rarr; `Shelf (Location)`.
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

The project logic and guidelines are governed strictly by the AI Agent constraints. For deeper dives into specific layers, refer to the underlying configuration docs:

*   **Tech Stack Overview**: Detailed breakdown of the tooling and deployment constraints.
*   **Frontend Guidelines**: Rules covering React functional components, CSS module isolation, API service patterns, and WebSocket hook implementations.
*   **Backend Guidelines**: Rules for Fat Models / Thin Views, strict DRF ViewSet configurations, and Celery task isolation.
*   **Business Logic**: Rules defining the immutable audit trails, order flow mechanics, and exact hierarchy mappings.
*   **Security Rules**: Enforcement of Role-Based Access Control (RBAC), Session Auth, and database locking mechanisms.

---

## 3. Architecture & Workflow Maps

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

### 3.3. Order Processing Workflow (PO & WO)

This state machine illustrates the lifecycle of Inbound (Purchase Orders) and Outbound (Work Orders) inventory.

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

## 4. Development & Deployment Flow

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