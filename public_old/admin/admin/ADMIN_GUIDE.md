# JoJo's Shave Ice - Admin Guide

This is a comprehensive guide for the web-based admin interface used to manage JoJo's Shave Ice App's backend data, Asana integration, and task scheduling.

## Features

1. **Locations Management**
   - Initialize and manage location data in Firestore
   - Configure Asana integration for each location
   - Set location credentials and permissions

2. **Projects Management**
   - Create and manage Asana projects
   - Create sections within projects for task organization
   - Configure project schedules (by day or by section)
   - Customize project appearance and behavior in the app

3. **Task Management**
   - Create and edit task templates
   - Organize tasks by shift (Opening, Mid, Closing)
   - Configure task types (checkbox, text input, number, etc.)
   - Set task completion requirements

4. **Sling Integration**
   - Synchronize scheduling data from Sling
   - Import employee information and shifts
   - Map staff to tasks and responsibilities

5. **Reporting**
   - View task completion history
   - Generate compliance reports
   - Track task performance metrics
   - Export data for analysis

## Setup

1. Start a local web server in this directory:
   ```
   python3 -m http.server
   ```

2. Open a web browser and navigate to:
   ```
   http://localhost:8000/admin/
   ```

3. For production deployment, upload these files to your Firebase Hosting or other web server.

## Pages

1. **Index** (`index.html`)
   - Main dashboard with links to all admin tools
   - Overview of system status and recent activities

2. **Locations Manager** (`locations-manager.html`)
   - Initialize and manage locations in Firebase
   - Each location has an email, password, and Asana integration details
   - Configure location-specific settings and preferences

3. **Projects** (`projects.html`)
   - Select a location to manage its Asana projects
   - Fetch existing projects from Asana
   - Create new projects in Asana
   - Add sections to projects for task organization
   - Configure project scheduling:
     - **Custom By Section**: Default option for custom handling of each section
     - **Select Day(s) of the Week**: Schedule the project to appear on specific days

4. **Setup Tasks** (`setup-tasks.html`)
   - Create and modify task templates
   - Configure task types and validation rules
   - Organize tasks into categories and shifts

5. **Setup Firestore** (`setup-firestore.html`)
   - Initialize and configure Firestore collections
   - Set up security rules and indexes
   - Manage database structure

6. **Daily Tasks** (`daily-tasks.html`)
   - View and manage daily task assignments
   - Monitor task completion status
   - Reassign or modify tasks as needed

7. **Task History** (`task-history.html`)
   - Review historical task completion data
   - Generate reports on task performance
   - Identify patterns and areas for improvement

8. **Ordering** (`ordering.html`)
   - Manage inventory and ordering processes
   - Track supply levels and reorder points
   - Generate purchase orders

## Asana Structure

For the app to work correctly, each Asana project should have these sections:
- **Opening**: Tasks to be completed during opening shift
- **Mid**: Tasks to be completed during mid-day shift
- **Closing**: Tasks to be completed during closing shift

Custom sections can be added as needed for specialized task categories.

## Project Scheduling

Projects can be scheduled in two ways:

1. **Custom By Section**: Each section in the project (Opening, Mid, Closing) is treated independently.
   This is useful for projects that need more granular control.

2. **Day-based Scheduling**: The project appears in the app only on selected days of the week.
   For example, a "Weekly Cleaning" project might only appear on Mondays.

This configuration is stored in Firestore in the `projectConfigurations` collection.

## Authentication

The admin interface provides three ways to access admin functionality:

1. Triple-tapping the app title on the login screen
2. Using the direct admin URL in a web browser
3. Through the mobile app's hidden admin navigation

## Sling Integration

Authentication information for Sling:
- **Business**: JoJo's Shave Ice
- **Authorization Token**: 49bada311f9b4392afa288dd6e7ad809
- **API Endpoint**: https://api.getsling.com/v1/536986/export
- **Profitwell Authentication**: 1c56335234a5189a2b14b207e2758c62

Sling data is used to synchronize employee schedules with task assignments.

## Security Considerations

- This admin interface contains sensitive information and should be properly secured
- For production use, implement proper authentication and authorization
- Store API tokens and credentials securely following best practices
- Regularly audit access logs and permissions

## Troubleshooting

Common issues and solutions:

1. **Firestore Connection Issues**
   - Check Firebase configuration in js/firebase-config.js
   - Verify Firebase project is properly set up and accessible

2. **Asana Integration Problems**
   - Validate PAT tokens are current and have proper permissions
   - Check network connectivity to Asana API endpoints

3. **Task Synchronization Errors**
   - Verify project structure matches expected format
   - Check Asana webhook configurations if applicable

4. **Missing Location Data**
   - Use the admin panel to reinitialize location settings
   - Check Firestore permissions and rules

## Development Guidelines

When extending the admin interface:

1. Follow existing code patterns and conventions
2. Test thoroughly across browsers and devices
3. Document API integrations and data structures
4. Update this README with new features and pages

## Future Enhancements

Planned improvements to admin functionality:

- Enhanced reporting and analytics dashboard
- Bulk task management and template creation
- Multi-user admin permissions system
- Audit logging for administrative actions
- Expanded Sling integration capabilities 