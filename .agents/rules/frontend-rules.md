--------------
trigger: always_on
--------------

# Frontend Rules & Guardrails

## 1. Core Framework & Setup
* **Framework:** React.js initialized via Vite.
* **Language:** JavaScript (ES6+).
* **Routing:** React Router v6+.
* **State Management:** React Context API for global state (Auth, Notifications, UI Themes). Local state via `useState` and `useReducer`.

## 2. Component Architecture
* Follow a strict functional component pattern using React Hooks.
* Separate UI components (presentation) from container components (data fetching/logic).
* Keep components small, modular, and reusable.
-- Project Structure:
```
frontend/src/
assets/          # Static assets (images, icons)
components/      # Reusable UI components (buttons, forms, modals)
context/         # React Context providers (AuthContext, NotificationContext)
pages/           # Page components (Dashboard, Inventory, Orders)
services/        # API service functions (api.js)
styles/          # CSS Modules and global styles
utils/           # Utility functions (formatting, validation)
layouts/         # Layout components (Header, Footer, Sidebar)
router/          # React Router setup (AppRouter.js)
hooks/           # Custom React Hooks (useAuth, useNotifications)
```
** File Naming Conventions:
- Component files: `ComponentName.jsx` (e.g., `InventoryList.jsx`)
- CSS Modules: `ComponentName.module.css` (e.g., `InventoryList.module.css`)
- Context files: `ContextName.js` (e.g., `AuthContext.js`)
- Service files: `ServiceName.js` (e.g., `api.js`)
- Layout files: `LayoutName.jsx` (e.g., `Header.jsx`)
- Hook files: `HookName.js` (e.g., `useAuth.js`)
- Router file: `AppRouter.jsx`
- Every component must have a corresponding CSS Module for styling, even if it's empty initially, to maintain consistency and separation of concerns.
- Every component/page/hook/service should live under its feature subdirectory. For example, `InventoryList.jsx` should live under `components/Inventory/`.
- Every css style file should be named as `ComponentName.module.css` and live under ssubdirectory of `styles/` that matches the component. For example, `InventoryList.module.css` should live under `components/Inventory/styles/`.

## 3. Styling & CSS
* **Strict Rule:** Use CSS Modules exclusively. File naming must follow the `filename.module.css` format.
* Maintain a `styles/globals.css` for root variables (colors, fonts, spacing).
* Implement clean, modern, and minimalistic layouts with interactive animations (using standard CSS transitions/animations).
* Ensure fully responsive design using CSS Grid and Flexbox.
- Import CSS Modules in components as follows:
```jsx
import styles from './ComponentName.module.css';
// Usage in JSX
<div className={styles.container}>
  <h1 className={styles.title}>Component Title</h1>
  <button className={styles.button}>Click Me</button>
</div>
```
- All CSS class names must be defined in the corresponding CSS Module file and imported into the component. Inline styles are prohibited unless they are dynamically calculated based on props or state.


## 4. API & WebSocket Integration
* Backend using session authentication, so ensure that all API calls include credentials (e.g., `withCredentials: true` in Axios).
* All API interactions must be centralized in a `services/` directory with clear, descriptive method names that indicate their purpose (e.g., `getProducts`, `createOrder`, `updateStock`). This promotes separation of concerns and makes it easier to maintain and update API calls as the backend evolves.
* Use Axios for HTTP requests. Centralize API calls in a `services/` directory.
* Handle Websocket connections (for notifications/live analytics) gracefully. Implement auto-reconnect logic.
* Always manage loading and error states for asynchronous operations.
* Implement global error handling for API calls, displaying user-friendly messages via a notification system (e.g., toast notifications) when errors occur.
* Ensure that all API interactions are secure, including proper handling of authentic
- Services are plain objects exported as `default`; methods are async arrow functions. For example:
```javascript// services/api.js
import axios from 'axios';
const API_BASE_URL = 'http://localhost:8000/api';
const api = {
  getProducts: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error; // Rethrow to be handled by calling component
    }
  },
  // Other API methods...
};
export default api;
```
* WebSocket connections should be managed in a custom hook (e.g., `useWebSocket`) that handles connection lifecycle, message parsing, and error handling. For example:
```javascript// hooks/useWebSocket.js
import { useEffect, useRef } from 'react';
const useWebSocket = (url, onMessage) => {
  const wsRef = useRef(null);
  useEffect(() => {
    wsRef.current = new WebSocket(url);
    wsRef.current.onopen = () => console.log('WebSocket connected');
    wsRef.current.onmessage = (event) => onMessage(JSON.parse(event.data));
    wsRef.current.onerror = (error) => console.error('WebSocket error:', error);
    wsRef.current.onclose = () => console.log('WebSocket disconnected');
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, onMessage]);
  return wsRef;
};
export default useWebSocket;
```

## 5. Coding Standards
* No inline styles unless dynamically calculated.
* Avoid prop drilling; use Context for deeply nested state.
* Clean up event listeners and WebSocket connections in `useEffect` cleanup functions to prevent memory leaks.
* Use detailed comments and JSDoc for complex logic, especially around API interactions and WebSocket handling.
* Ensure all components are properly typed with PropTypes or TypeScript (if adopted later) to enforce type safety and improve maintainability.
* Implement a consistent error handling strategy across all components, ensuring that any errors encountered during API calls or WebSocket interactions are caught and handled gracefully, providing clear feedback to the user through the notification system.


## 6. Performance Optimization
* Use React.memo and useCallback to prevent unnecessary re-renders of components, especially those that receive props that do not change frequently.
* Implement lazy loading for components that are not immediately visible (e.g., modals, secondary pages) to improve initial load times.
* Use code-splitting with React.lazy and Suspense for larger components or pages to further optimize performance and reduce the initial bundle size.
* Ensure that all API calls are optimized and do not fetch unnecessary data. Use query parameters to limit the amount of data returned from the backend and implement pagination for list endpoints to improve performance when dealing with large datasets.
* Regularly profile the application using React Developer Tools and browser performance tools to identify and address any performance bottlenecks, ensuring a smooth and responsive user experience even as the application scales.

## 7. Error Handling & Notifications
* Implement a global notification system (e.g., toast notifications) to provide real-time feedback to users for critical events (e.g., stock falling below a threshold, PO received, WO issued without sufficient stock). Ensure that notifications are clear, concise, and actionable, guiding users on the next steps they can take to resolve any issues or respond to important updates.
* Ensure that all API errors are caught and handled gracefully, providing user-friendly error messages through the notification system. This includes handling network errors, server errors, and validation errors in a way that informs the user of the issue and potential solutions without exposing technical details.
* Implement error boundaries in React to catch and handle any unexpected errors in the component tree, preventing the entire application from crashing and providing a fallback UI that informs the user of the issue while allowing them to continue using other parts of the application.


## 8. Security
* Ensure that all API calls include credentials for session authentication and that CSRF tokens are properly handled to prevent cross-site request forgery attacks.
* Implement input validation on all forms to prevent injection attacks and ensure data integrity. This includes validating user input on the frontend before sending it to the backend, providing immediate feedback to users when their input does not meet the required criteria.
* Use HTTPS for all API calls and WebSocket connections to ensure that data is transmitted securely between the frontend and backend, protecting sensitive information from being intercepted by malicious actors.
* Regularly review and update dependencies to address any security vulnerabilities in third-party libraries used in the application, ensuring that the frontend remains secure against known threats and exploits.

## 9. Accessibility
* Ensure that all components and pages meet WCAG 2.1 AA accessibility standards, including proper use of semantic HTML, ARIA attributes, and keyboard navigation support. This includes providing alternative text for images, ensuring sufficient color contrast, and making interactive elements accessible via keyboard and screen readers.
* Implement accessibility testing as part of the development process, using tools like Lighthouse and manual testing with screen readers to identify and address any accessibility issues before deployment. This ensures that the application is usable by a wide range of users, including those with disabilities, and provides an inclusive user experience.
* Ensure that all dynamic content updates (e.g., notifications, real-time data changes) are announced to assistive technologies using ARIA live regions, providing users with timely information about important events and updates without requiring them to manually check for changes.

## 10. UI/UX Best Practices
* Follow a clean, modern design aesthetic with intuitive navigation and clear visual hierarchy. Use consistent spacing, typography, and color schemes to create a cohesive and visually appealing interface that enhances the user experience.
* Implement responsive design principles to ensure that the application is fully functional and visually appealing across a wide range of devices and screen sizes, providing a seamless experience for users whether they are accessing the application on a desktop, tablet, or mobile device.
* Use interactive animations and transitions to enhance the user experience, providing visual feedback for user actions and making the interface feel more dynamic and engaging. This includes using CSS transitions for button hover states, loading indicators for asynchronous operations, and smooth transitions between pages or components to create a polished and professional user experience.

## 11. General Rules
* All components, services, and hooks must be properly documented with comments and JSDoc to explain their purpose, expected inputs/outputs, and any important implementation details. This promotes maintainability and makes it easier for other developers to understand and work with the codebase.
* All code must adhere to a consistent style guide (e.g., Airbnb JavaScript Style Guide) and be formatted using a tool like Prettier to ensure readability and maintainability across the codebase.
* Regularly review and refactor code to improve readability, performance, and maintainability, ensuring that the codebase remains clean and efficient as the application evolves and scales over time. This includes removing unused code, optimizing complex logic, and ensuring that all components and services are well-organized and easy to navigate for developers working on the project.
* Never duplicate code. If you find yourself writing the same code more than once, abstract it into a reusable component, service, or hook to promote DRY (Don't Repeat Yourself) principles and improve maintainability across the codebase.
* Always consider the user experience when implementing features, ensuring that the application is intuitive, responsive, and provides clear feedback to users for their actions. This includes handling edge cases gracefully and providing helpful error messages or guidance when users encounter issues or unexpected situations within the application.
* Async operations (e.g., API calls, WebSocket interactions) must always include proper loading states and error handling to ensure that users are informed of the status of their actions and can respond appropriately to any issues that arise during these operations. This promotes a smooth and responsive user experience, even in cases where network conditions may be suboptimal or when unexpected errors occur.