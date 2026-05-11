----
trigger: always_on
-----

# Backend Rules & Guardrails

## 1. Core Framework
* **Framework:** Django & Django REST Framework (DRF). 
* **ORM:** Use Django's ORM for all database interactions. Raw SQL is prohibited unless absolutely necessary for performance reasons, and must be reviewed by a senior developer.
* **Authentication & Authorization:** Use Django's built-in authentication system with strict session-based authentication. Implement role-based access control (RBAC) to restrict access to sensitive operations based on user roles and permissions.
* **Database:** PostgreSQL.
* **Cache/Broker:** Redis (for caching, Celery broker, and Channels channel layer).
* **Asynchronous Tasks:** Celery for background processing (e.g., predictive price calculations, email notifications).
* **Real-time Communication:** Django Channels for WebSocket support (e.g., real-time notifications).


## 2. API Design & Authentication
* **Authentication:** Strict Session-based authentication. Do not use JWT unless explicitly required for a mobile client later. Ensure CSRF validation is active.
* **API Versioning:** Use URL-based versioning (e.g., `/api/v1/`) to allow for future iterations without breaking existing clients.
* **Rate Limiting:** Implement rate limiting (e.g., 1000 requests per user per day) to prevent abuse and ensure fair usage of the API.
* **Error Handling:** All API responses must follow a consistent structure, including a status code, a message, and any relevant data or error details. Use appropriate HTTP status codes for different scenarios (e.g., 200 for success, 400 for client errors, 500 for server errors).
* **Input Validation:** Use DRF serializers to validate all incoming data. Ensure that all required fields are present and that data types are correct. Reject any requests with invalid data and provide clear error messages.
* **Pagination:** Implement pagination for list endpoints to prevent performance issues with large datasets. Use a reasonable default page size (e.g., 20 items per page) and allow clients to specify a custom page size within limits (e.g., max 100 items per page).
* **Filtering & Sorting:** Implement filtering and sorting capabilities for list endpoints to allow clients to easily find relevant data. Use query parameters for filtering (e.g., `?status=active`) and sorting (e.g., `?ordering=-created_at`).
* **Viewsets & Routers:** Use DRF viewsets and routers to simplify URL routing and reduce boilerplate code. This promotes a consistent structure across the API and makes it easier to maintain.
- Use viewsets for standard CRUD operations and create custom actions for any non-standard behavior (e.g., issuing a Work Order, receiving a Purchase Order).
- Every ViewSet must have a corresponding Serializer that defines the expected input and output data structure, ensuring clear API contracts and facilitating validation.
- Every Viewset must define -
    - `queryset` to specify the data source.
    - `serializer_class` to specify the serializer for input/output validation.
    - `permission_classes` to enforce access control based on user roles and permissions.
    - `filter_backends` to enable filtering and sorting capabilities on list endpoints.
    - `pagination_class` to implement pagination for list endpoints, ensuring efficient handling of large datasets.
    - Custom actions (e.g., `@action` decorated methods) must be used for operations that do not fit the standard CRUD pattern, such as issuing a Work Order or receiving a Purchase Order. These actions should have clear and descriptive names, and their corresponding serializers should validate the specific input required for those operations.

* **Services Layer:** For complex business logic that spans multiple models or requires transactions, use a dedicated `services.py` layer to encapsulate this logic and keep views thin.
* **Logging:** Implement logging for all critical operations (e.g., stock movements, order status changes) to facilitate debugging and auditing. Use Django's built-in logging framework and ensure that sensitive information is not logged.
* **Notifications:** Use Django Channels to implement real-time notifications for critical events (e.g., stock falling below a threshold, PO received). Ensure that notifications are sent securely and only to authorized users.
* **Celery Tasks:** Offload heavy computations (e.g., predictive price calculations, analytics generation) to Celery tasks to keep API responses fast and responsive. Ensure that tasks are idempotent and handle retries gracefully in case of failures.
- All Celery tasks must be defined in a `tasks.py` file within the relevant app and should follow a clear naming convention (e.g., `calculate_predictive_price`, `send_stock_alert_notification`) to indicate their purpose and functionality. Tasks should also include appropriate error handling and logging to facilitate debugging and monitoring of background processes.
- Periodic tasks are registered in core/celery.py using Celery beat, with clear scheduling intervals (e.g., daily, hourly) and descriptive names to indicate their function (e.g., `daily_predictive_price_update`, `hourly_stock_alert_check`).
- Never call .delay() inside celery tasks to avoid chaining tasks in a way that can lead to unexpected behavior or performance issues. Instead, use Celery's built-in mechanisms for task chaining or scheduling to manage task execution flow.
* **Filters:**  Every Viewset uses `FilterSet` subclass in the app's `filters.py` to define allowed filters for list endpoints, ensuring consistent and secure filtering across the API. This promotes a clear separation of concerns and makes it easier to maintain and update filtering logic as needed.
* **Serializers:** Every ViewSet has a corresponding Serializer in the app's `serializers.py` that defines the expected input and output data structure, ensuring clear API contracts and facilitating validation. Serializers should include field-level validation to enforce data integrity and provide clear error messages for invalid input.
* **Permissions:** Every ViewSet defines `permission_classes` to enforce access control based on user roles and permissions, ensuring that only authorized users can perform sensitive operations. Permissions should be granular and specific to the actions being performed (e.g., only users with the "inventory_manager" role can issue Work Orders).
* **Pagination:** Every list endpoint in the API implements pagination using a consistent `pagination_class`, ensuring efficient handling of large datasets and improving performance. Pagination should include metadata in the response (e.g., total count, next/previous page links) to facilitate client-side navigation through paginated results. 


## 3. Database & ORM Guardrails
* **Data Integrity:** You MUST use `transaction.atomic()` for any operation that modifies inventory (e.g., executing a Work Order or receiving a Purchase Order).
* **Query Optimization:** Prevent N+1 queries by strictly enforcing the use of `select_related` and `prefetch_related` in serializers and views.
* Avoid heavy calculations in synchronous views.
* **Model Constraints:** Use Django model constraints (e.g., `UniqueConstraint`, `CheckConstraint`) to enforce data integrity at the database level where applicable.
* **Migrations:** All database schema changes must be made through Django migrations. Manual database modifications are strictly prohibited. Migrations must be reviewed and tested to ensure they do not cause data loss or downtime.
* **Indexing:** Ensure that appropriate database indexes are created for frequently queried fields (e.g., `Product.sku`, `Stock.product_id`, `Order.status`) to optimize query performance. Regularly review and update indexes as the data model evolves to maintain optimal performance.
* **Data Validation:** Use Django's model validation (e.g., `clean()`, `clean_fields()`) to enforce business rules and data integrity at the model level. This includes validating that stock quantities are non-negative, ensuring that referenced products and locations exist, and enforcing any other domain-specific constraints.


## 4. Asynchronous Processing (Celery & WebSockets)
* **Celery:** Offload predictive price calculations, email notifications, and heavy analytics generation to Celery asynchronous tasks.
* **WebSockets:** Use Django Channels for real-time notifications (e.g., critical stock alerts, PO status changes).


## 5. Code Structure
* Maintain fat models (for business logic) and thin views (for request/response handling), or use a dedicated `services.py` layer for complex cross-model operations.
* Follow Django's app structure to organize code by domain (e.g., inventory, orders, analytics) for better maintainability and separation of concerns.
* Use consistent naming conventions for models, serializers, viewsets, and tasks to improve code readability and maintainability. For example, model names should be singular (e.g., `Product`, `Stock`), while viewset names should be plural (e.g., `ProductViewSet`, `StockViewSet`).
* Ensure that all code is well-documented with docstrings and comments where necessary to explain complex logic or business rules. This is especially important for critical operations such as stock movements and order processing to facilitate future maintenance and onboarding of new developers.


## 6. App Structure
* **Inventory App:** Contains models, serializers, viewsets, and tasks related to inventory management (e.g., `Product`, `Stock`, `StockMovement`).
* **Orders App:** Contains models, serializers, viewsets, and tasks related to order management (e.g., `PurchaseOrder`, `WorkOrder`).
* **Analytics App:** Contains models, serializers, viewsets, and tasks related to analytics and predictive pricing (e.g., `PredictivePrice`, `BurnRate`).
* **Notifications App:** Contains models, serializers, viewsets, and tasks related to notifications (e.g., `StockAlert`, `Notification`).
* **Accounts App:** Contains models, serializers, viewsets, and tasks related to user accounts and authentication (e.g., `User`, `Profile`, `Permission`).


- All Django Apps must be located under `backend/apps/` to maintain a clear and organized project structure. Each app should have its own `models.py`, `serializers.py`, `views.py`, `services.py`, `filters.py`, and `tasks.py` (if applicable) to encapsulate related functionality and promote separation of concerns. This structure facilitates easier maintenance, scalability, and collaboration among developers working on different aspects of the application.
- Accounts app should handle all user-related functionality, including authentication, profile management, and permissions. This centralizes user management and allows for consistent handling of authentication and authorization across the entire application.
- The Inventory app should focus on managing products, stock levels, and stock movements, while the Orders app should handle the creation and processing of purchase orders and work orders. This separation allows for clearer organization of business logic and makes it easier to maintain and extend each domain independently.
- The Analytics app should be responsible for all data analysis and predictive pricing logic, while the Notifications app should manage the creation and delivery of notifications to users. This separation ensures that each app can evolve independently and allows for better scalability as the application grows.
