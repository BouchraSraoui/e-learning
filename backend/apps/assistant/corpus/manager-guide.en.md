# Manager guide
URL: /admin/courses
Audience: manager

What a manager does on the platform — the navigation bar gives you a "Manage" menu with two entries: "Courses" (/admin/courses) and "Reports" (/admin/reports). From there you create and publish training, assign it to your team and track how they are getting on. The rest of the platform works for you exactly as it does for a learner.

What a manager cannot do, unlike an administrator — a manager's "Manage" menu contains neither "Users" nor "Analytics", and opening those URLs directly shows "Access denied". The "Audit log" tab of the reports page is not shown either. Finally, you may only edit or delete the courses you authored yourself: the builder refuses other people's courses.

Finding your courses — open "Manage" then "Courses" (/admin/courses). For a manager the list only contains the courses you created yourself. Narrow it down with the "Search courses…" field, the "All levels" list and the "All statuses" list ("Published" or "Draft"). The table shows "Course title", "Level", "Structure", "Status" and "Actions".

Publishing, previewing or deleting a course — on each row of /admin/courses, the "Publish" or "Unpublish" button flips its visibility in the catalog straight away. The eye icon "Preview course" opens the public course page, the pencil "Edit content" opens the builder, and the bin deletes the course together with its chapters, lessons and quizzes.

Creating a course — click "New course" from /admin/courses to open /admin/courses/new, a full-screen "Course builder" in four steps: "Details", "Curriculum", "Quiz" and "Review", with "Back" and "Next" in the footer. The "Exit" button takes you back to the course list.

The "Details" step — fill in "Course title" and "Description", both required, then pick a "Category" and a "Level" (Beginner, Intermediate, Advanced). The "Thumbnail" block accepts a cover image: "PNG or JPG · 16:9 recommended · max 5 MB". The side panel "Settings" groups "Audience", "Required course" and "Issue certificate".

Choosing a course's audience — the "Audience" list controls who the course is automatically assigned to. "Catalog (self-service)" assigns nothing, learners enrol themselves. "General (all employees)" assigns it to every active account on publication. "Department-specific" requires a "Target department": it goes to that department's members and stays hidden from everyone else.

The "Curriculum" step — click "Add chapter", give it a "Chapter title", then add lessons with the format buttons "Video", "PDF", "Audio", "Presentation" and "Text". Each lesson takes a "Lesson title" and a duration in "min"; the paperclip "Attach file" attaches its media.

Watch out for attached files while building — the wizard saves your input locally as you go ("Saved just now") and restores it, but attached files are only held in memory: if you leave or reload the page before publishing, you will have to attach them again. The header says so with "Saved — attached files stay in memory only".

The "Quiz" step — click "Add question", pick "Single choice", "Multiple choice", "True / False" or "Dropdown", type the question, then the answers with "Add option"; the button on the left is used to "Mark correct". You need at least two answers per question. The "Quiz settings" panel sets the "Passing score".

The "Review" step and publishing — the "Review & publish" step summarises the course and ticks off, under "Ready to publish", the title and description, the lessons, the quiz questions, the attached media and "Certificate on completion". Finish with "Publish course" or "Save as draft"; either way you land in the builder of the course you just created.

Editing an existing course in the builder — from /admin/courses, the course title or "Edit content" opens /admin/courses/<slug>/edit. The header carries the "Published" or "Draft" badge, the "Assign to…" button and the "Preview course" link. The first block holds title, description, category, level, duration, audience and objectives; confirm with "Save changes".

Managing chapters and lessons — in the builder, the "Chapters" section offers "Add chapter" and, on each one, a pencil and a bin. "Add lesson" opens a form with "Lesson title", "Content type", then "Text content", or "External URL" and "Upload file". The checkbox "Free preview (visible before enrolling)" makes it visible without enrolling.

Adding downloadable resources — in the builder, the "Resources" section and the "Add resource" button open a dialog with "Resource title", "External URL" and "Upload file": provide either a URL or an uploaded file. Resources are then listed on the course page for learners, and the bin icon removes them.

Building an assessment from the builder — the "Quizzes" section, then "Add quiz", opens the full form: "Quiz title", "Pass score (%)" and "Scope", which is either "Course-level" or "Chapter-level" (in which case pick the "Chapter" it belongs to). Tick "Published" so the quiz actually counts. Learners may retake it with no limit on attempts.

How a quiz drives course completion and the certificate — a learner's progress adds up completed lessons and passed published quizzes; a course is only "Completed" once every lesson is done and every published quiz is passed. If "Issue certificate" is on, the certificate is then issued automatically. A quiz left as a draft blocks nothing and does not count.

Assigning a course to a team member — two paths open the same "Assign course" dialog: the "Assign to…" button in a course builder, where the course is already selected, or "Reports" then the "Assignments" tab and the "Assign course" button. Fill in "Learner", an optional "Due date" and a "Note", then confirm with "Assign".

Who a manager may assign a course to — the "Choose a learner" list only offers the active accounts of your department or, if no department is attached to you, the people whose manager you are; never an administrator. The assignment automatically enrols the learner, who sees it under "Assigned to you". The bin icon in the "Assignments" tab removes the assignment.

Tracking your team from the dashboard — on /dashboard, the "My team's progress" block counts the courses assigned to your team and splits them into "Not started", "In progress", "Completed" and "Overdue". Each card gives the learner, the course, their progress and a "Due …" or "Overdue since …" badge. The "Manage assignments" link opens /admin/reports.

Reading and exporting team reports — open "Manage" then "Reports" (/admin/reports), "Reports" tab. Filter by "Department", "Course" and "Status". The table gives "Learner", "Department", "Course", "Status", "Progress" and "Completed on". A manager only sees their own department, or the people they manage. The CSV, XLSX and PDF buttons export the filtered rows.

Moderating course comments — in the discussion attached to a course or a lesson, a manager gets "Hide", "Unhide" and "Delete" on any comment, whoever wrote it. A hidden comment stays visible to you with the "Hidden" tag but disappears for learners.

Moderating the chat rooms — on the "Community" page, a manager can delete any message in a room: hover the message and click the bin icon "Delete message". The deletion is immediate for every connected participant, whereas a learner can only remove their own messages.

The assistant's FAQ knowledge base — the "FAQ & assistant" page (/admin/faq), which feeds the assistant, is administrator-only: it does not appear in a manager's "Manage" menu and opening it directly shows "Access denied". Ask an administrator to add a frequently asked question; the content of your published courses, on the other hand, already feeds the assistant's answers.
