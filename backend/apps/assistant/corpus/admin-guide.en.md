# Administrator guide
URL: /admin/users
Audience: admin

Reaching the administration pages — everything goes through the "Manage" menu in the navigation bar. An administrator finds "Users" (/admin/users), "Courses" (/admin/courses), "Analytics" (/admin/analytics), "Reports" (/admin/reports) and "FAQ" (/admin/faq) there. Users, Analytics and FAQ are admin-only: a manager who tries the URL gets "Access denied".

Searching and filtering users — open "Users" from the "Manage" menu. The "Search by name or email…" field filters the list as you type, and three dropdowns narrow the result: the role ("All roles"), the department ("All departments") and the status ("All statuses", "Active", "Inactive"). The table shows Name, Role, Department, Status and Actions, twenty per page.

Creating a user — on "Users", click "New user". Fill in the work email, the "First name", the "Last name", the "Role", the "Department", the "Job title" and the "Language", then confirm with "Create user". The password is optional: the field shows the hint "Leave blank to send a reset link.", but leaving it blank only creates an account with no usable password — no email is sent, and the person has to request a link themselves via the "Forgot?" link on the sign-in page. If supplied it must be at least 8 characters. An email already in use is rejected.

Editing a user — on the account's row, click the pencil icon to open "Edit user". There you change the first name, last name, role, department, job title, language and the "Account active" checkbox. The email address cannot be changed from this form; it is only recalled in the subtitle. Leave "Password" blank to keep the current password.

Deactivating rather than deleting an account — the middle icon toggles between "Deactivate" and "Activate"; a deactivated account can no longer sign in and its running session stops being renewed. The bin opens "Delete user": "This can't be undone. Consider deactivating the account instead." Deleting also erases enrolments, progress, assignments and certificates.

Changing a user's role — the "Role" field offers three values. "User" gives access to the learning journey only: catalog, courses, quizzes, certificates, badges. "Manager" can additionally create courses, edit and delete only the ones they authored, and read the reports. "Administrator" reaches everything: the whole catalog, accounts, analytics, audit and FAQ.

Attaching a user to a department and to a manager — the department is set with the "Department" dropdown in the form ("No department" leaves the account unattached); it is used as a filter everywhere and governs department-scoped courses. Moving someone to another department assigns them that department's published courses. The manager is only set through the file import, in the "manager" column.

Exporting the user list — on "Users", the "CSV" and "XLSX" buttons download the list exactly as filtered on screen: the search, role, department and status apply to the export. The file carries the columns email, first_name, last_name, role, department, team, manager, job_title, phone, location, language and is_active.

Importing users in bulk — click "Import". "Download template" fetches a sample file with the right columns, "Choose a file" accepts "CSV or XLSX, up to 5 MB" and 5,000 rows at most, "Run import" runs the job. The email is the key: an unknown email creates the account, an email already present updates only the fields supplied in the file.

Fixing a user import — once the job is done, the window shows "{n} created", "{n} updated" and, where relevant, "{n} error(s)". Each faulty line appears as "Row {n}:" with the email and the reason: missing or invalid email, unknown role, unknown language, unknown department or team, weak password. The valid rows, for their part, are saved.

Managing the whole catalog — for an administrator, the "Courses" page lists every course on the platform, drafts included and whoever the author is; a manager only sees their own. Filter with "Search courses…", "All levels" and "All statuses" ("Published", "Draft"). The first button on a row toggles "Publish" or "Unpublish", and the eye icon opens "Preview course".

Creating a course with the four-step wizard — from "Courses", click "New course". It runs through "Details" (title, description, category, level, language, thumbnail), "Curriculum" (chapters and lessons), "Quiz" and "Review". The "Settings" panel groups "Audience", "Required course", "Issue certificate" and "Sequential unlock". Finish with "Save as draft" or "Publish course".

Choosing a course audience — the "Audience" dropdown offers "Catalog (self-service)", "General (all employees)", and "Department-specific", which requires a "Target department" and hides the course from other employees. Publishing a general or department course creates an assignment and its enrolment for every targeted person: it shows up straight away in "My learning".

Editing or deleting an existing course — open "Courses", then the course title or the "Edit content" icon. The page gathers "Course details", the "Publish" panel with "Save changes" and "Publish"/"Unpublish", then "Chapters", "Resources" and "Quizzes". An administrator may edit any course. Deleting warns that its chapters, lessons and quizzes will go too.

Assigning a course to a colleague — open "Reports", the "Assignments" tab, then "Assign course". Pick the "Learner", the "Course", an optional "Due date" and a "Note", then confirm with "Assign": the person is enrolled automatically. The same form opens from "Assign to…" on a course's edit page. An administrator may assign a course to any active account.

Tracking and removing assignments — the "Assignments" tab lists each assignment with the learner, the course, the "Due" date and the progress ("Not started", "In progress", "Completed"). The bin icon "Remove assignment" deletes it, confirmed by "Assignment removed". Removing an assignment does not delete the progress the learner already recorded.

Reading the platform analytics — the "Analytics" page is admin-only. It shows "Users", "Published courses", "Enrollments", "Completion rate" (the share of enrolments completed), "Certificates issued" and "Avg. quiz score", then "Users by role", the "Enrollment funnel", the "Top courses" and the "By category" block.

Producing and exporting a progress report — open "Reports", the "Reports" tab. Filter by "Department", "Course" and "Status"; the table gives the learner and their email, the department, the course, the status, the progress and the completion date. The "CSV", "XLSX" and "PDF" buttons download the displayed rows. An administrator sees every colleague, a manager only their own scope.

Reading the audit log — the "Audit log" tab on the "Reports" page only appears for administrators. It lists the columns "Action", "Actor", "Target" and "When". Recorded there are the creation, update and deletion of a user, the user imports, the assignments created or removed, and the report exports.

Managing the assistant's knowledge base — the "FAQ" page feeds the chatbot. "New question" opens the form: "Question", "Answer", "Category", "Language", "Order" and "Keywords"; the "Published (visible to the assistant and learners)" checkbox decides whether it goes live. The table is filtered with "Search a question…" and "All languages".

Moderating a course's comments — comments sit at the bottom of the course page, in the "Discussion" block. Every comment offers an administrator "Hide" and "Delete". A hidden comment disappears for learners but stays visible to administrators and managers, marked "Hidden", and "Unhide" restores it. Deleting, on the other hand, is permanent.

Moderating the chat rooms and banning a participant — on the "Community" page, hover a message: the bin icon "Delete message" appears, for administrators and managers, on any message. Banning, for its part, works room by room and has no button on this page yet: a banned member gets "You are not allowed to post in this room."
