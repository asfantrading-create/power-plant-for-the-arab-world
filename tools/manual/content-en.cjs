// English user manual content. Blocks: string/p, h, steps, ul, tip, warn, table(+head), fig(+caption), pre.
module.exports = {
  title: 'User Manual',
  subtitle: 'Arab Power Twin – Digital Twin of Power Plants in the Arab World',
  versionLabel: 'Version',
  company: 'Asfan Co.',
  tocTitle: 'Contents',
  chapters: [
    { title: 'Introduction', intro: [
      'Arab Power Twin is an educational Windows application that provides a **digital twin** of real power plants across the 22 Arab League countries. It combines a database of more than 620 plants (gas, steam, nuclear, photovoltaic, concentrated solar, wind, hydro, diesel, coal, waste) with a simplified physics-based simulation of every technology in a 3D scene, an examination and assessment system for students, and role-based user management.',
      'This manual explains every screen in detail: what it shows, what you can do on it and the steps for each task, from installing and activating the software to managing exams, results and updates.',
    ], sections: [
      { title: 'Who uses the program?', body: [
        { table: [['Super admin', 'The institution administrator or course professor. Created at first start-up; manages everything: users of all roles, groups, exams, all results and sessions, the license, settings, the data folder, backups and the activity log.'], ['Instructor', 'Adds and imports students, creates groups and exams, views and exports the results and simulation sessions of all students.'], ['Student', 'Explores plants and the map, runs the digital twin, takes assigned exams and practice quizzes, and sees only their own results.']], head: ['Role', 'What they can do'] },
      ] },
      { title: 'Main modules', body: [
        { ul: ['**Plant explorer**: a real database with an interactive offline map and filters by country, energy source, technology and status.', '**Plant page**: overview, key facts, technology description and components, estimated generation, location and nearby plants.', '**Digital twin**: a 3D scene of the plant on a realistic site (sky with the true sun position, terrain, sea for coastal plants) with a live simulation of output, efficiency, fuel, emissions and grid frequency, controls and training scenarios.', '**Exams**: a bilingual question bank plus questions generated from real plant data, timed formal exams and self-practice, with instant grading.', '**Results & assessment**: statistics, charts, per-student reports and CSV, JSON and PDF export.', '**Administration**: users, groups, license, settings, a shared data folder for university labs, backup, activity log and automatic updates.'] },
      ] },
      { title: 'System requirements', body: [
        { table: [['Operating system', 'Windows 10 or 11 (64-bit)'], ['Processor and memory', 'Dual-core or better, 8 GB RAM (16 GB recommended for labs)'], ['Graphics', 'Any adapter with WebGL 2 (integrated or discrete). The 3D scene runs more smoothly on discrete GPUs'], ['Disk space', 'About 700 MB for the program and data'], ['Display', '1366×768 minimum, 1920×1080 recommended'], ['Internet', 'Not required to run. Used only to check for and download updates']], head: ['Item', 'Requirement'] },
      ] },
      { title: 'Technical support', body: [
        'The program is developed and distributed by **Asfan Co.** For enquiries, licensing and technical support:',
        { ul: ['E-mail: `info@asfanco.com`', 'WhatsApp: `+962 77 614 0404`'] },
        { tip: 'When requesting support, include the program version (shown at the bottom of the sidebar and on the About page), the machine ID and a screenshot of the problem.' },
      ] },
    ] },

    { title: 'Installation and first start', sections: [
      { title: 'Downloading the installer', body: [
        'The program is distributed as a single installer named `ArabPowerTwin-Setup.exe` through a permanent link provided by the vendor. The link never changes between releases and always delivers the latest version.',
        { warn: 'Windows or your browser may warn about a newly downloaded executable. Choose “Keep” and then “Run anyway” if the SmartScreen screen appears; the file comes from the vendor.' },
      ] },
      { title: 'Installation steps', body: [
        { steps: ['Double-click `ArabPowerTwin-Setup.exe`.', 'Choose the installer language (Arabic or English).', 'Keep the default installation folder or change it, then click Install. No administrator rights are needed because the program installs for the current Windows user.', 'When finished, a desktop and Start-menu shortcut named Arab Power Twin is created and the program starts automatically.'] },
        'On the first start you go through three screens in order: **License activation**, then **Initial setup** to create the super-admin account, then **Sign in**. The next chapters explain each one.',
      ] },
      { title: 'Where is the data stored?', body: [
        'Accounts, exams, results and simulation sessions are stored as files on the computer in `%APPDATA%\\arab-power-twin\\workspace`; settings and the license are kept in the same folder. The super admin can move the data folder to a shared network folder from the Settings page so that every lab computer works on the same data (see the chapter “Setting up a university lab”).',
        'Uninstalling the program does not delete your data; it remains in the folder above for reuse after reinstalling.',
      ] },
    ] },

    { title: 'License activation', sections: [
      { title: 'The activation screen', body: [
        { fig: 'activation', caption: 'License activation at first start' },
        'The program runs with a digitally signed license supplied by the vendor as text starting with `APT1.` or as a `.lic` file. The license is verified on the computer itself; no internet connection is needed.',
        { steps: ['Paste the license key into the box, or click “Load from .lic file” and choose the file you received.', 'Click “Activate”. On success a confirmation appears and the program moves to the initial-setup screen.'] },
        'The bottom of the screen shows **this computer’s ID** (format `APT-XXXX-XXXX-XXXX-XXXX`) with a copy button. If your license is locked to one computer, send this ID to the vendor so that a key for this computer can be issued.',
        { h: 'What does the license control?' },
        { ul: ['**Type**: lifetime, or fixed term with an expiry date. Thirty days before a fixed-term license expires the program shows a reminder.', '**Seats**: the maximum number of active accounts of all roles (0 means unlimited).', '**Included modules**: digital twin and/or exams. A module that is not included disappears from the menus.', '**Included technologies**: plants of technologies not included show a lock badge; their data can be browsed, but the digital twin cannot be started and they are excluded from generated questions.', '**Machine lock**: optional; a machine-locked license works only on the matching computer.'] },
      ] },
      { title: 'Activation error messages', body: [
        { table: [['The key format is invalid', 'Make sure the whole key was copied without missing lines or spaces, or use the .lic file.'], ['Invalid signature', 'The key is forged or was issued for another build. Ask the vendor for a new key.'], ['The license has expired', 'The fixed-term date has passed. Contact the vendor to renew and enter the new key under Administration → License.'], ['This key is locked to another computer', 'Send this computer’s ID to the vendor to obtain a key for it.'], ['System clock rollback detected', 'The computer date was moved backwards. Set the correct date and time and restart the program.'], ['The key belongs to another product', 'The key is not for Arab Power Twin.']], head: ['Message', 'Meaning and remedy'] },
      ] },
    ] },

    { title: 'Initial setup and sign-in', sections: [
      { title: 'Creating the super-admin account', body: [
        { fig: 'setup', caption: 'Initial setup: creating the super-admin account' },
        'This screen appears once, after activation. The account you create here is the **super admin** with every permission, usually the course professor or the institution’s administrator.',
        { steps: ['Enter the **organisation name** (university or company). It appears at the top of the sidebar and in reports.', 'Choose a **username** in Latin letters or digits (at least 3 characters) and the **full name**.', 'Enter a **password** of at least 6 characters and confirm it.', 'Click “Create account and start”.'] },
        { warn: 'Keep the super-admin password in a safe place. No other account can reset it; if it is lost you must restore a backup or contact support.' },
      ] },
      { title: 'Signing in', body: [
        { fig: 'login', caption: 'The sign-in screen' },
        'Enter the username and password and click “Sign in”. Below the form the licensed organisation and the current data folder are shown, and the interface language can be switched with the button at the top of the screen.',
        { ul: ['Students whose accounts were created with a temporary password must change it at their first sign-in before using the program.', 'If a student forgets the password, an instructor or the super admin resets it from the Users page.', 'A suspended account cannot sign in until the administrator reactivates it.'] },
      ] },
      { title: 'The general layout', body: [
        'After signing in the screen has three parts:',
        { ul: ['**Sidebar**: the sections “Learn” (dashboard, plant explorer, exams, practice quiz, my results), “Administration” for instructors and administrators, and “System” (license, settings, data & backup, activity log, updates, my account, about), then Sign out. Below it the version number and plant count.', '**Top bar**: page title, language switch (العربية/English), theme button (dark/light) and the current-user chip that opens “My account”.', '**Content area**: the selected page; at the bottom of every page the Asfan Co. signature with the support e-mail and WhatsApp number. When an update is available a bar appears above the content with a “Download update” button (see the Updates chapter).'] },
      ] },
    ] },

    { title: 'Dashboard', sections: [
      { title: 'Overview', body: [
        { fig: 'dashboard', caption: 'The super-admin dashboard' },
        'The home page after signing in. At the top are four statistic cards: real plants in the database, Arab countries, recorded operational capacity in MW, and the renewable share. Below them the “Start here” cards jump to the plant explorer, the digital twin and the practice quiz.',
        { ul: ['**My available exams**: students see the exams assigned to them with a “Start” button; instructors and administrators see student statistics instead.', '**Student statistics** (instructors and administrators): number of students, exam attempts, average score and pass rate, with a button to the Results & assessment page.', '**Featured plants with 3D models**: cards for landmark plants (Barakah, Shuaibah, Aswan High Dam, Jebel Ali, Jorf Lasfar, the MBR solar park…) with an “Open digital twin” button.'] },
        { fig: 'dashboard-bottom', caption: 'Bottom of the dashboard: featured plants and charts' },
        'At the bottom are charts of operational capacity by country and capacity by energy source, and a line stating the data source and its last update date.',
      ] },
    ] },

    { title: 'Plant explorer', sections: [
      { title: 'List and map', body: [
        { fig: 'plants-list', caption: 'Plant explorer: list with the interactive map' },
        'The explorer lists every plant in a table (name, country, energy source, technology, capacity, year, status) next to a map of the Arab world. Every dot on the map is a plant; its colour shows the energy source and its size the capacity.',
        { ul: ['**Search**: type part of the plant name in Arabic or English.', '**Filters**: country, energy source (gas, oil, solar, wind, hydro, coal, nuclear, biomass, waste), technology, status (operational, under construction, planned, decommissioned) and minimum capacity.', '**Sort**: by capacity, name or commissioning year.', '**View**: list or cards.', 'The “matching plants” line shows how many plants match the filters and their total capacity.'] },
        'On the map: click a dot to open the plant, drag to pan, use the mouse wheel or the + and − buttons to zoom, and the reset button to return to the full view. Clicking a country filters the list to its plants.',
        { fig: 'plants-filtered', caption: 'Filtering by country and energy source applies to both the list and the map' },
      ] },
      { title: 'Card view and badges', body: [
        'The “Cards” view shows the same plants as tiles with their capacity and status; clicking any card or row opens the plant page.',
        { ul: ['The **3D model** badge means the plant has a bespoke 3D model in the digital twin.', 'The lock badge means the plant’s technology is not included in your license: its data can be browsed only.'] },
        { fig: 'plants-cards', caption: 'Card view with the 3D-model and lock badges' },
      ] },
    ] },

    { title: 'Plant page', sections: [
      { title: 'Page contents', body: [
        { fig: 'plant', caption: 'Plant page: overview and key facts' },
        { ul: ['**Overview**: country, technology, capacity in MW, status, commissioning year, owner or operator, and data quality (verified, WRI GPPD, approximate).', '**Key facts**: typical efficiency, typical capacity factor, emission factor, recorded or estimated annual generation in GWh, and coordinates.', '**Technology**: a simplified explanation of how the technology works and its main components.', '**Notes** about the plant and a link to the original data source.', '**Plants in this complex**: if the plant belongs to a complex (such as Jebel Ali or Ras Laffan) the other members are listed.', '**Nearby plants**: the geographically closest plants with the distance in km.'] },
        { fig: 'plant-bottom', caption: 'Bottom of the plant page: technology and nearby plants' },
        'At the top of the page are two buttons: **Run the digital twin** opens the 3D simulation, and **Practice quiz about this plant** starts questions generated from this plant’s data and technology.',
      ] },
    ] },

    { title: 'Digital twin', intro: [
      'The digital twin is the heart of the program: a 3D scene of the plant built from its actual capacity, number of units, technology and location, driven by a simplified physical simulation in real time or at accelerated speeds. The purpose is educational: understanding how the plant responds to changes in load, weather and faults.',
    ], sections: [
      { title: 'The screen and the 3D scene', body: [
        { fig: 'twin', caption: 'Digital twin of the Barakah nuclear plant' },
        { ul: ['**Header**: back button, plant name with country, technology and capacity, the badge “plant-specific model” or “generic model for this technology”, pause/run button, a reset button that clears the cumulative indicators, the time-speed selector (real time, ×10, ×60, ×300, ×1800) and the current simulation time.', '**Scene window**: drag with the mouse to orbit, use the wheel to zoom and the right button to pan. “Auto-orbit” turns the camera around the plant. At the top of the window live pills show output, grid frequency, the hour and sun elevation, ambient temperature and the number of running units.', 'The scene follows the time of day: lighting and shadows follow the plant’s real sun position, windows and lamps light up at night, chimney plumes, wind-turbine rotors and fans move, and panels and mirrors track the sun.'] },
      ] },
      { title: 'Indicators and controls', body: [
        { ul: ['**Output**: current output in MW, grid demand, grid frequency, efficiency, and technology-specific indicators: fuel consumption, CO₂ emissions, exhaust temperature and steam pressure for thermal plants; reactor thermal power and primary-loop temperature for nuclear; irradiance, cell temperature, soiling or thermal storage for solar; wind speed and rotor speed for wind; reservoir level and discharge for hydro.', '**Load setpoint**: the requested load percentage (for hydro: gate opening and inflow).', '**Conditions**: ambient temperature, cloud cover, dust, wind speed and grid demand depending on the technology, plus a “Clean modules / mirrors” checkbox for solar plants.', '**Units**: the list of units with their state (running, starting, stopping, off, tripped) and each unit’s output, with buttons to start, stop and reset a trip.'] },
      ] },
      { title: 'Training scenarios', body: [
        { fig: 'twin-scenario', caption: 'The “Sudden unit trip” scenario: the tripped unit, the alarm and the frequency dip' },
        'The scenario chips apply a training event to the plant: **Sudden unit trip**, **Heat wave 48 °C**, **Dust storm**, **Strong wind gust** and **Demand surge**. Watch how the indicators and alarms respond, then click “Clear scenario” to return to normal.',
      ] },
      { title: 'KPIs, alarms and trends', body: [
        { fig: 'twin-bottom', caption: 'Bottom of the twin page: cumulative KPIs, alarms and the output and efficiency trends' },
        { ul: ['**Performance indicators**: energy delivered, session capacity factor, availability, number of trips, and cumulative fuel and CO₂.', '**Alarms & events**: frequency deviation, high vibration, high exhaust temperature, soiling, wind above cut-out, full or low reservoir, and start-up, synchronisation and trip messages with their time.', '**Trends**: output versus demand, and efficiency or conditions together with grid frequency.'] },
        { h: 'Ending the session' },
        '**End session & save report** stores a summary of the session (plant, duration, energy, capacity factor, availability, trips, events) in the user’s record. Students see their sessions under “My account”; instructors see them under “Simulation sessions”. If you leave the page after more than twenty seconds of simulation, the session is saved automatically.',
        { tip: 'To assess operating skills, ask students to run a given plant, apply a specific scenario and end the session, then review the results on the Simulation sessions page.' },
      ] },
    ] },

    { title: 'Exams (student view)', sections: [
      { title: 'Available exams', body: [
        { fig: 'student-exams', caption: 'Exams assigned to the student' },
        'The page lists the formal exams assigned to the student’s group with their details: number of questions, duration, pass mark and attempts used out of those allowed. **Start exam** begins a new attempt after confirming that the timer starts immediately; **Resume exam** returns to an open attempt that has not been submitted yet.',
      ] },
      { title: 'Taking the exam', body: [
        { fig: 'student-exam-run', caption: 'The exam screen: timer, question navigation and options' },
        { ul: ['**Time left** at the top; when it runs out the answers are submitted automatically.', 'The **numbered buttons** jump directly between questions; answered questions are highlighted.', 'Every student receives a different order of questions and options built from the same specification.', 'Answers are **saved automatically**; if the program is closed you can resume where you stopped as long as time remains.', 'Questions marked “Generated from real plant data” are built from real plant figures (capacity, country, technology, commissioning year, energy, fuel and emission calculations).'] },
        { fig: 'student-exam-answering', caption: 'Selecting an answer' },
        'When finished click **Submit answers**. If questions remain unanswered the program asks you to confirm.',
      ] },
      { title: 'The result', body: [
        { fig: 'student-result', caption: 'The result page after submission' },
        'The result shows the score, the percentage, pass or fail, the time taken and the performance by topic. If the instructor allowed it, a full review appears: your answer, the correct answer and the explanation.',
        { fig: 'student-result-bottom', caption: 'Answer review with explanations' },
        'The **Certificate / PDF report** button prints a result report that can be saved as a PDF file.',
      ] },
    ] },

    { title: 'Practice quiz', sections: [
      { title: 'Setting up a practice quiz', body: [
        { fig: 'student-practice', caption: 'Practice quiz settings' },
        'The practice quiz is informal and does not count towards assessment. Choose the number of questions, the question-bank topics, the countries and technologies for plant questions and the share of questions generated from plant data, then click **Start practice**.',
        { fig: 'student-practice-run', caption: 'During practice' },
        'Grading is immediate after submission, with explanations, and practice can also be started from any plant page to generate questions about that plant.',
      ] },
    ] },

    { title: 'My results and my account', sections: [
      { title: 'My results', body: [
        { fig: 'student-results', caption: 'The student’s results: formal and practice attempts' },
        'A table of all the student’s attempts: exam, kind (formal or practice), date, attempt number, score, percentage, status and time taken. Clicking a row opens the result page. **Export CSV** saves the table for Excel.',
      ] },
      { title: 'My account', body: [
        { fig: 'student-profile', caption: 'My account: changing the password and simulation sessions' },
        'Shows the name, role and group, allows **changing the password** by entering the current and new ones, and lists **my simulation sessions** with their indicators.',
      ] },
    ] },

    { title: 'Administration: users and groups', sections: [
      { title: 'User management', body: [
        { fig: 'admin-users', caption: 'User management' },
        'A table of all accounts: name, username, role, group, student number, last sign-in and status. Each row has buttons to edit, reset the password, view results, suspend or activate, and delete.',
        { ul: ['Instructors manage student accounts only; the super admin manages every role.', 'Suspended accounts cannot sign in; their results are kept.', 'The number of active accounts is limited by the license seats; when the limit is reached the message “seat limit reached” appears and an old account can be suspended to free a seat.'] },
        { fig: 'admin-users-add', caption: 'The add-user form' },
        { steps: ['Click **Add user**.', 'Enter the username, password and name, choose the role and group, and add the student number and e-mail if available.', 'Click Save. A new student must change the password at the first sign-in.'] },
      ] },
      { title: 'Importing students from a CSV file', body: [
        { fig: 'admin-users-import', caption: 'Importing students from CSV' },
        'To add a whole class at once prepare a CSV file (from Excel: Save as → CSV UTF-8) with the columns below, then click **Import students from CSV** and choose the file or paste its content:',
        { pre: 'username,password,displayName,studentNumber,groupName,email\nahmad1,,Ahmad Ali,441001,Section A,ahmad@uni.edu\nsara2,Sara@2026,Sara Mohammed,441002,Section A,' },
        { ul: ['The first line of headers is optional, and the file may use commas, semicolons or tabs.', 'If the password is left empty it becomes `student123` and the student must change it at the first sign-in.', 'Groups that do not exist are created automatically from the groupName column.', 'After the import a message reports the accounts created and skipped, with the reason for each skip (duplicate username, missing data or seat limit).'] },
      ] },
      { title: 'Groups / classes', body: [
        { fig: 'admin-groups', caption: 'Groups' },
        'A group (class section) gathers students so that exams can be assigned to them and results filtered. Add a group with a name and description, and edit or delete from the row buttons. The member count is shown for each group; a student’s group is changed from the Users page.',
      ] },
    ] },

    { title: 'Administration: exams and results', sections: [
      { title: 'Exam management', body: [
        { fig: 'admin-exams', caption: 'Exam management' },
        'The list of exams with the number of questions, duration, pass mark, number of attempts, average score and active state. Buttons: edit, activate or deactivate (a deactivated exam is hidden from students) and delete.',
        { fig: 'admin-exams-new', caption: 'The new-exam form' },
        { h: 'Exam fields' },
        { table: [['Title (Arabic / English)', 'Shown to students in the interface language.'], ['Description / instructions', 'Text shown before starting.'], ['Question-bank topics', 'Choose one or more of the ten topics; the program shows how many bank questions are available for the selection.'], ['Number of questions', 'Total questions per attempt.'], ['Share of generated questions', 'The share of questions built from real plant data (0 to 100%). The rest come from the bank.'], ['Plant scope', 'Countries and technologies used for generated questions (empty = all, within the licensed technologies).'], ['Duration (minutes)', 'The timer starts when the attempt starts; the exam is submitted automatically when it ends.'], ['Pass mark (%)', 'The passing threshold.'], ['Max attempts', '0 = unlimited.'], ['Assigned groups', 'The sections that see the exam (empty = all students).'], ['Shuffle questions', 'A different order for every student.'], ['Show correct answers', 'Lets students review the answers and explanations after submission.']], head: ['Field', 'Meaning'] },
        { tip: 'Correct answers are never sent to the student’s computer before submission, and every student receives a different variant of the questions and options.' },
      ] },
      { title: 'Results & assessment', body: [
        { fig: 'admin-results', caption: 'Results & assessment: filters and statistics' },
        'This page gathers every student attempt. Filter by exam, group, student or kind (formal/practice) and the indicators update: number of attempts, mean, median and pass rate, with charts of the score distribution, correct answers by topic and the average by exam.',
        { fig: 'admin-results-bottom', caption: 'The attempts table and the per-student summary' },
        { ul: ['**Attempts table**: student, group, exam, kind, date, attempt number, score, percentage, status and time. Clicking a row opens the attempt details.', '**Per-student summary**: number of attempts, best score and last attempt, and a **Student report** button that prints a PDF report with the student’s results and simulation sessions.', '**Export**: CSV (opens in Excel with Arabic support) or JSON of the displayed, filtered table.'] },
      ] },
      { title: 'Simulation sessions', body: [
        { fig: 'admin-sessions', caption: 'The digital-twin session log' },
        'For every session: student, plant, date, duration, energy generated, capacity factor, number of trips and session events. The list can be filtered by student, and sessions are included in the student report.',
      ] },
    ] },

    { title: 'System: license, settings and data', sections: [
      { title: 'License', body: [
        { fig: 'admin-license', caption: 'The License page' },
        'Shows the license state and details: licensee, organisation, type, issue and expiry dates with days left, seats and accounts in use, included modules and technologies, license ID and the machine ID with a copy button.',
        { ul: ['**Activate a new key**: when renewing or upgrading, paste the new key or load the .lic file and click Activate; the new license replaces the old one without losing any data.', '**Remove license**: returns the program to the activation screen (super admin only).'] },
      ] },
      { title: 'Settings', body: [
        { fig: 'admin-settings', caption: 'Settings' },
        { table: [['Language', 'The default interface language (Arabic or English).'], ['Theme', 'Dark or light.'], ['Organisation name', 'Shown in the sidebar and in reports.'], ['Shared data folder', 'The folder where accounts and results are stored. Choose a network folder to share data between lab computers, or “Use default folder”.'], ['Update server URL', 'Leave empty for the official releases. An HTTPS link to a folder containing latest.yml and the installer can be used with an internal server.'], ['Check for updates automatically', 'At start-up and every six hours.']], head: ['Setting', 'Purpose'] },
        { warn: 'Update settings take effect after restarting the program. When the data folder is changed you are asked to sign in again because the accounts are read from the new folder.' },
      ] },
      { title: 'Data & backup', body: [
        { fig: 'admin-workspace', caption: 'Data & backup' },
        'The page shows the data folder path and the record counts (users, groups, exams, attempts, simulation sessions).',
        { ul: ['**Export full backup (JSON)**: one file containing every record. Save it regularly in a safe place.', '**Restore from backup**: choose the file and the restore mode: **Merge** keeps existing records and adds the new ones; **Overwrite** updates matching records. Used to move data to another computer or after reinstalling.'] },
        { tip: 'Take a backup before the end of every semester and before changing the data folder or reinstalling Windows.' },
      ] },
      { title: 'Activity log', body: [
        { fig: 'admin-audit', caption: 'Activity log' },
        'The program records sign-ins, user creation and edits, exam creation, edits and deletions, and license activation, with the time, the user who performed the action and its details.',
      ] },
    ] },

    { title: 'Updates and About', sections: [
      { title: 'Updates', body: [
        { fig: 'admin-updates', caption: 'The Updates page' },
        'At start-up, and every six hours, the program checks the release server (an internet connection is required). If a newer version exists, a notice appears on this page and a bar at the top of the screen, including on the activation and sign-in screens.',
        { steps: ['Click **Download update**. The download runs in the background with a progress indicator.', 'When it completes click **Restart & install**. The program closes, installs the new version and returns within seconds.', 'If you choose “Later”, the update is installed automatically when the program is closed.'] },
        'Data, accounts and the license are not affected by updates. **Check for updates** runs a manual check, and release notes are shown when available.',
      ] },
      { title: 'About', body: [
        { fig: 'about', caption: 'About the program' },
        'The page shows the current version, the data sources and their licenses (the WRI Global Power Plant Database, curated additions, the Natural Earth map, the Cairo font), the disclaimer, the machine ID, the data folder and a license summary.',
        'At the bottom is the **Developer** card with Asfan Co. contact details and two buttons that open this manual in Arabic or English. The manual is also available from the “Help” menu at the top of the program window.',
        { fig: 'about-bottom', caption: 'The developer card and the user-manual buttons' },
      ] },
    ] },

    { title: 'Setting up a university lab', intro: [
      'To run the program on several computers in one lab so that the instructor sees every student and their results from any computer:',
    ], sections: [
      { title: 'Steps', body: [
        { steps: ['Create a shared folder on the university server or the instructor’s computer (for example `\\\\server\\ArabPowerTwin`) with read and write permission for the students’ Windows accounts.', 'Install the program on every computer and activate it with the same license key.', 'On the first computer create the super-admin account, then under Settings → Shared data folder choose the network folder. The current data is moved there.', 'On the other computers, after activation, change the data folder to the same network folder (from Settings, after creating a temporary account if needed); the administrator and student accounts appear immediately.', 'Add the students once (manually or from CSV); they can sign in from any computer.'] },
        { ul: ['Every record is stored as a separate file, so several computers can work at the same time safely.', 'License seats are counted per data folder; shared accounts count once.', 'If the shared folder is unreachable the program temporarily works on the local folder and shows a notice on the Data page.'] },
      ] },
    ] },

    { title: 'Troubleshooting', sections: [
      { title: 'Common problems', body: [
        { table: [['The 3D scene is black or does not appear', 'Update the graphics driver and make sure WebGL is not disabled. On weak computers close other programs and reduce the window size.'], ['The simulation is slow', 'Choose a lower time speed, turn off auto-orbit or use the light theme; very large plants (huge solar and wind farms) are heavier than others.'], ['No update appears', 'An internet connection is required and the program must be allowed through the firewall. Click “Check for updates” manually.'], ['Cannot add a student: seat limit reached', 'Suspend old accounts or request a license with more seats.'], ['A plant appears locked', 'Its technology is not included in the license. Contact the vendor to upgrade.'], ['A student forgot the password', 'Users → Reset password.'], ['The super-admin password was forgotten', 'Restore an earlier backup on another computer or contact technical support.'], ['The shared data folder is unreachable', 'Check the network and permissions; the program works temporarily on the local folder until the connection returns.'], ['“System clock rollback detected”', 'Set the correct computer date and restart.']], head: ['Problem', 'Remedy'] },
      ] },
      { title: 'Getting help', body: [
        'Contact Asfan Co. at `info@asfanco.com` or on WhatsApp `+962 77 614 0404`, stating the program version, the machine ID, the steps that led to the problem and a screenshot if possible.',
      ] },
    ] },

    { title: 'Appendices', sections: [
      { title: 'Supported technologies', body: [
        { table: [['Combined-cycle gas turbine (CCGT)', 'A gas turbine drives a generator and its exhaust raises steam for a second, steam turbine; 55–63% efficiency.'], ['Open-cycle gas turbine (OCGT)', 'Fast-starting peaking gas turbines with lower efficiency.'], ['Oil/gas-fired steam plant', 'Large boilers raise steam for steam turbines; historically the most common in the Gulf.'], ['Coal-fired steam plant', 'As above, fuelled by coal with stockyards and flue-gas treatment.'], ['Diesel / HFO engines', 'Reciprocating engines for small grids and islands.'], ['Solar photovoltaic', 'Modules convert irradiance directly into electricity with inverters and transformers.'], ['CSP – parabolic trough', 'Mirrors focus the sun on a heat-transfer-fluid tube to raise steam, with thermal storage.'], ['CSP – central tower', 'A field of heliostats tracks the sun and focuses it on a receiver on a tower.'], ['Onshore wind farm', 'Wind turbines with a power curve that depends on wind speed.'], ['Hydroelectric dam', 'Dam, reservoir and powerhouse with water turbines; output depends on head and flow.'], ['Run-of-river / barrage hydro', 'Works on the river flow without a large reservoir.'], ['Nuclear – pressurised water reactor', 'The reactor heats a primary loop that transfers heat to steam generators.'], ['Biomass', 'Burning agricultural residues such as sugar-cane bagasse.'], ['Waste-to-energy', 'Burning municipal waste with advanced flue-gas treatment.'], ['Integrated gasification combined cycle (IGCC)', 'Fuel gasification followed by a combined cycle.'], ['Oil-shale steam plant', 'Burning oil shale in special boilers.']], head: ['Technology', 'Short description'] },
      ] },
      { title: 'Mouse controls in the 3D scene', body: [
        { table: [['Drag with the left button', 'Orbit the camera around the plant'], ['Mouse wheel', 'Zoom in and out'], ['Drag with the right button', 'Pan the camera'], ['“Auto-orbit” button', 'Automatic tour around the plant']], head: ['Action', 'Result'] },
      ] },
      { title: 'Glossary', body: [
        { table: [['Capacity factor', 'Energy actually generated divided by the energy possible at full capacity all the time.'], ['Availability', 'The share of time the units are ready to generate.'], ['Grid frequency', '50 Hz in most Arab countries and 60 Hz in Saudi Arabia; it drops when generation is short and rises when generation exceeds demand.'], ['Load setpoint', 'The share of capacity requested from the plant.'], ['Trip', 'A sudden unit shutdown by protection, vibration or a training scenario.'], ['GWh', 'Gigawatt-hour = one million kilowatt-hours.']], head: ['Term', 'Meaning'] },
      ] },
    ] },
  ],
};
