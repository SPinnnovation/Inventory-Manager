-----
trigger: always_on
-----

# Business Logic Agent - Inventory Management


## 1. Inventory Hierarchy
* **Warehouse Assembly:** Inventory is physically mapped via a 3-tier hierarchy: Floor -> Rack -> Shelf for each warehouse.  
* **Product:** The Product item definition (SKU, Image, Base Price, Predictive Price, Market Price).
* **Stock:** The physical instantiation of a Product at a specific Location. 
* **Stock Movement:** Represents the change in Stock quantity due to Purchase Orders (inbound) or Work Orders (outbound).
* **Order:** Represents a Purchase Order.
* **Order Item:** Represents a line item in an Order, linking a Product to a quantity and price.
* **Work Order:** Represents a Work Order.
* **Work Order Item:** Represents a line item in a Work Order, linking a Product to a quantity.
* *Constraint:* A single Product can have multiple Stock entries across different Locations.
* *Constraint:* Stock quantity must never be negative. All operations that would result in negative stock should be rejected with an appropriate error message.
* *Constraint:* The system must maintain an audit log of all Stock Movements, including the timestamp, user responsible, and reason for the change (e.g., PO received, WO issued). This log should be immutable and accessible for review by authorized personnel.
* *Constraint:* The system must support concurrent updates to Stock quantities, ensuring data integrity through appropriate locking or transactional mechanisms to prevent race conditions and ensure accurate inventory levels.
* *Constraint:* The system must validate that all referenced Products and Locations exist before processing any Stock Movements, Purchase Orders, or Work Orders to prevent orphaned records and maintain data integrity.
* *Constraint: * Stock can have multiple warehouses, but each Stock entry must be associated with exactly one Product and one Location. This ensures clear tracking of inventory across the system.

## 2. Order Management Integration
* **Purchase Orders (PO):** Represents inbound inventory.
    * *Status Flow:* Issued -> Received/Completed.
    * *Action:* Upon "Received", the system must securely increment the respective Stock quantities at designated Locations.
* **Work Orders (WO):** Represents outbound inventory (used for manufacturing, assembly, or dispatch).
    * *Work Issue:* Jobs Issued, Stocks is reserved. Jobs Issued -> Products Issued -> a. Job Incomplete due to insufficient stock -> Job Pending and Insufficient Stock - issues a warning status and append in WO to add remaining quantity. b. Job Completed -> Full Products List Issued used - Status: Job Completed and Products Issued Fully Used. c. Job Completed -> Partial Products Issued used - Status: Job Completed and Products Issued Partially Used, and append in WO to add remaining quantity. d. Job Completed -> No Products Issued used - Status: Job Completed and Products Issued Not Used, and append in WO to add remaining quantity. e. Job Completed -> Products Issued used - Status: Job Completed and Products Issued Used. 
    * *Status Flow:* Issued -> Completed. Issued -> Pending. (If job not complete)
    * *Action:* Upon "Issued", the system must verify sufficient stock. Upon "Completed", it decrements the Stock quantities.
* *Constraint:* The system must enforce that a Work Order cannot be issued if the required Stock quantity is not available. In such cases, the system should reject the operation and provide a clear error message indicating the shortage.
* *Constraint:* The system must maintain a history of all Purchase Orders and Work Orders, including their status changes, timestamps, and associated Stock Movements for auditing and reporting purposes. This history should be immutable and accessible for review by authorized personnel.
* *Constraint:* The system must support partial receipts for Purchase Orders, allowing users to receive a portion of the ordered quantity while keeping the remaining quantity open until fully received. This should be reflected accurately in the Stock quantities and order status.
* *Constraint:* The system must support partial fulfillment for Work Orders, allowing users to issue a portion of the required quantity while keeping the remaining quantity pending until fully issued. This should be reflected accurately in the Stock quantities and order status.
* *Constraint:* The system must validate that all referenced Products and Locations exist before processing any Purchase Orders or Work Orders to prevent orphaned records and maintain data integrity.

## 3. Predictive Pricing & Analytics
* The system tracks `price_bought` and `market_price`.
* A background process analyzes historical market prices to calculate `predictive_price` in the future.
* Analytics dashboards must aggregate stock movements over time to project burn rates and alert on upcoming shortages.

## 4. Notification System
* Critical changes (e.g., Stock falling below a threshold, WO issued without sufficient stock, PO received) trigger an internal event. Job status changes (e.g., Job Incomplete due to insufficient stock, Job Completed with Partial Products Issued) also trigger events.
* This event is pushed to the frontend in real-time via WebSockets to alert active users.