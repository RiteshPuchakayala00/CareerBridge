import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def create_document():
    doc = Document()

    # Set page layout to A4 with 1-inch margins
    sections = doc.sections
    for section in sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Base Normal Style: Times New Roman, 12pt, 1.5 line spacing, pure black text
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    font.color.rgb = RGBColor(0, 0, 0)  # Pure Black for Xerox clarity
    style_normal.paragraph_format.line_spacing = 1.5
    style_normal.paragraph_format.space_after = Pt(6)

    def set_cell_background(cell, fill_hex):
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
        cell._tc.get_or_add_tcPr().append(shading)

    def set_cell_margins(cell, top=120, bottom=120, left=160, right=160):
        tcPr = cell._tc.get_or_add_tcPr()
        tcMar = parse_xml(
            f'<w:tcMar {nsdecls("w")}>'
            f'<w:top w:w="{top}" w:type="dxa"/>'
            f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
            f'<w:left w:w="{left}" w:type="dxa"/>'
            f'<w:right w:w="{right}" w:type="dxa"/>'
            f'</w:tcMar>'
        )
        tcPr.append(tcMar)

    def apply_table_borders(table):
        # Professional academic high-contrast borders for clean black & white photocopies:
        # Header top/bottom: 1.25 pt (sz="10") black rule
        # Inner rows: 0.5 pt (sz="4") crisp line
        tblBorders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="10" w:space="0" w:color="000000"/>'
            f'<w:bottom w:val="single" w:sz="10" w:space="0" w:color="000000"/>'
            f'<w:left w:val="single" w:sz="6" w:space="0" w:color="555555"/>'
            f'<w:right w:val="single" w:sz="6" w:space="0" w:color="555555"/>'
            f'<w:insideH w:val="single" w:sz="4" w:space="0" w:color="777777"/>'
            f'<w:insideV w:val="single" w:sz="4" w:space="0" w:color="777777"/>'
            f'</w:tblBorders>'
        )
        table._tbl.tblPr.append(tblBorders)

    def add_styled_table(headers, rows, col_widths=None):
        table = doc.add_table(rows=len(rows) + 1, cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        apply_table_borders(table)

        # Header Row: Light neutral gray (photocopies as a subtle clean tint, NOT dark black smudge)
        # Font: Bold pure black (100% sharp and readable in Xerox)
        hdr_cells = table.rows[0].cells
        for i, heading in enumerate(headers):
            hdr_cells[i].text = heading
            set_cell_background(hdr_cells[i], "EFEFEF")  # High-contrast light neutral gray
            set_cell_margins(hdr_cells[i], 120, 120, 150, 150)
            p = hdr_cells[i].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.line_spacing = 1.15
            p.paragraph_format.space_after = Pt(2)
            for run in p.runs:
                run.font.bold = True
                run.font.color.rgb = RGBColor(0, 0, 0)  # Pure Black
                run.font.name = 'Times New Roman'
                run.font.size = Pt(10.5)

        # Data Rows: Pure White background for ALL rows (no alternating colors that photocopy as toner streaks)
        for r_idx, row_data in enumerate(rows):
            row_cells = table.rows[r_idx + 1].cells
            for c_idx, val in enumerate(row_data):
                row_cells[c_idx].text = str(val)
                set_cell_background(row_cells[c_idx], "FFFFFF")  # Pure White background
                set_cell_margins(row_cells[c_idx], 100, 100, 130, 130)
                p = row_cells[c_idx].paragraphs[0]
                p.paragraph_format.line_spacing = 1.15
                p.paragraph_format.space_after = Pt(2)
                for run in p.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(0, 0, 0)  # Pure Black

        if col_widths:
            for row in table.rows:
                for c_idx, w in enumerate(col_widths):
                    row.cells[c_idx].width = Inches(w)

        p_spacer = doc.add_paragraph()
        p_spacer.paragraph_format.space_before = Pt(4)
        p_spacer.paragraph_format.space_after = Pt(4)
        return table

    # Xerox-optimized Headings: 100% Pure Black, Bold, Clear Hierarchy
    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(15)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)  # Pure Black

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(13)
        run.font.bold = True
        run.font.color.rgb = RGBColor(0, 0, 0)  # Pure Black

    def add_p(text, bold_prefix=None):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.5
        p.paragraph_format.space_after = Pt(6)
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.font.bold = True
            r_bold.font.name = 'Times New Roman'
            r_bold.font.size = Pt(12)
            r_bold.font.color.rgb = RGBColor(0, 0, 0)
        run = p.add_run(text)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(0, 0, 0)
        return p

    def add_code_block(code_text):
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.left_indent = Inches(0.25)
        # Add clean left border line in XML for code callouts
        pPr = p._p.get_or_add_pPr()
        pBdr = parse_xml(
            f'<w:pBdr {nsdecls("w")}>'
            f'<w:left w:val="single" w:sz="12" w:space="10" w:color="000000"/>'
            f'</w:pBdr>'
        )
        pPr.append(pBdr)
        run = p.add_run(code_text)
        run.font.name = 'Consolas'
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(0, 0, 0)  # Pure Black

    # ─────────────────────────────────────────────────────────────
    # COVER PAGE
    # ─────────────────────────────────────────────────────────────
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(12)
    p_inst.paragraph_format.space_after = Pt(4)
    r1 = p_inst.add_run("NATIONAL INSTITUTE OF TECHNOLOGY, WARANGAL\n")
    r1.font.bold = True
    r1.font.size = Pt(17)
    r1.font.color.rgb = RGBColor(0, 0, 0)
    r2 = p_inst.add_run("DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING")
    r2.font.bold = True
    r2.font.size = Pt(13)
    r2.font.color.rgb = RGBColor(0, 0, 0)

    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_after = Pt(28)

    p_rep = doc.add_paragraph()
    p_rep.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_rep.paragraph_format.space_after = Pt(6)
    r_rep = p_rep.add_run("PROJECT REPORT ON")
    r_rep.font.bold = True
    r_rep.font.size = Pt(14)
    r_rep.font.color.rgb = RGBColor(0, 0, 0)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(14)
    r_title = p_title.add_run("CareerBridge: Automated Campus Placement & Internship Governance Ecosystem")
    r_title.font.bold = True
    r_title.font.size = Pt(18)
    r_title.font.color.rgb = RGBColor(0, 0, 0)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(24)
    r_sub = p_sub.add_run("Submitted in partial fulfilment of the Final Evaluation of the course\nCS1303 - Full Stack Development")
    r_sub.font.italic = True
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(0, 0, 0)

    # Metadata Table (No Team Lead row, high-contrast B&W borders)
    meta_headers = ["Field", "Details"]
    meta_rows = [
        ["Project Title", "CareerBridge: Automated Campus Placement & Internship Platform"],
        ["Project Type", "Team of 2"],
        ["Student Names & Roll Nos.", "P. Ritesh Reddy — Roll No. 24CSB0A55\nK. P. T. N. Vamsi Krishna — Roll No. 24CSB0A38"],
        ["Course Instructor / Guide", "Faculty Guide, Dept. of Computer Science and Engineering"],
        ["Department", "Computer Science and Engineering"],
        ["Academic Year / Semester", "2026–2027 / Semester VI"],
        ["Date of Submission", "21/11/2026"],
        ["GitHub Repository", "https://github.com/RiteshPuchakayala00/CareerBridge"],
        ["Live Deployment", "Frontend: https://careerbridge-frontend.vercel.app\nBackend: https://careerbridge-api.onrender.com"],
        ["Demo Video", "https://youtu.be/careerbridge-demo"]
    ]
    add_styled_table(meta_headers, meta_rows, [2.3, 3.9])

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CERTIFICATE
    # ─────────────────────────────────────────────────────────────
    add_h1("CERTIFICATE")
    p_cert = doc.add_paragraph()
    p_cert.paragraph_format.line_spacing = 1.5
    p_cert.paragraph_format.space_after = Pt(36)
    p_cert.add_run(
        "This is to certify that the project report titled \"CareerBridge: Automated Campus Placement & Internship Governance Ecosystem\" "
        "is a bonafide record of the work carried out by P. Ritesh Reddy (Roll No. 24CSB0A55) and K. P. T. N. Vamsi Krishna (Roll No. 24CSB0A38) "
        "in the Department of Computer Science and Engineering, National Institute of Technology, Warangal, during the academic year 2026–2027, "
        "as part of the final evaluation of the course CS1303 - Full Stack Development."
    )

    cert_table = doc.add_table(rows=2, cols=2)
    cert_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cert_table.rows[0].cells[0].text = "___________________________\nCourse Instructor\nDr. Faculty Guide\nDept. of CSE, NIT Warangal"
    cert_table.rows[0].cells[1].text = "___________________________\nHead of Department\nProf. Head of Department\nDept. of CSE, NIT Warangal"
    cert_table.rows[1].cells[0].text = "\nDate: 21/11/2026"
    cert_table.rows[1].cells[1].text = "\nPlace: Warangal"
    for row in cert_table.rows:
        for cell in row.cells:
            cell.paragraphs[0].paragraph_format.line_spacing = 1.3
            for r in cell.paragraphs[0].runs:
                r.font.name = 'Times New Roman'
                r.font.size = Pt(11)
                r.font.color.rgb = RGBColor(0, 0, 0)

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # ACKNOWLEDGEMENT
    # ─────────────────────────────────────────────────────────────
    add_h1("ACKNOWLEDGEMENT")
    add_p(
        "We express our deepest gratitude to our course instructor and guide for providing invaluable technical mentorship, "
        "constructive critiques, and continuous encouragement throughout the conceptualization, system modeling, and implementation "
        "stages of this Full Stack Development project."
    )
    add_p(
        "We extend our sincere appreciation to the Department of Computer Science and Engineering, National Institute of Technology, Warangal, "
        "and the laboratory staff for providing state-of-the-art computing infrastructure and developer environments."
    )
    add_p(
        "Finally, we thank our fellow classmates and student cohorts whose feedback during functional user testing helped refine our "
        "role-based authorization boundaries, interview pipelines, and real-time notification UX."
    )

    # ─────────────────────────────────────────────────────────────
    # ABSTRACT
    # ─────────────────────────────────────────────────────────────
    add_h1("ABSTRACT")
    add_p(
        "Campus placement administration in large engineering institutions involves coordinating thousands of student profiles, "
        "hundreds of visiting corporate recruiters, and rigorous departmental compliance standards. Traditional placement workflows rely heavily "
        "on disparate spreadsheets, fragmented email threads, and informal messaging groups, creating administrative bottlenecks, data privacy "
        "vulnerabilities, candidate-recruiter spam, and compliance failures. To resolve these challenges, we built CareerBridge, a full-stack campus "
        "placement and internship governance platform engineered with strict four-tier Role-Based Access Control (RBAC), multi-stage interview lifecycle "
        "tracking, and an automated Five-Rule Eligibility Engine. The client layer is developed using React 19, Vite, Tailwind CSS, Lucide icons, and "
        "Axios with dynamic host resolution. The server layer is powered by a high-performance Python FastAPI REST engine, Pydantic v2 data validation, "
        "SQLAlchemy 2.0 ORM, and OAuth2 with stateless JSON Web Token (JWT) sessions and Bcrypt password hashing. Key innovations include 'The Shield "
        "Principle'—an institutional inquiry architecture where department coordinators act as an authenticated firewall between students and corporate "
        "recruiters with automated 1-click FAQ promotion—as well as dynamic graduation batch lockouts, the university 'One-Offer' equitable placement "
        "enforcement, and an in-app targeted notification hub with sticky flash circular banners. The system was validated using comprehensive automated "
        "API integration test suites, manual role-boundary penetration testing, and deployed to cloud infrastructure with Vercel and Render."
    )
    add_p("React 19, FastAPI, Role-Based Access Control (RBAC), SQLAlchemy, Placement Automation, REST API.", "Keywords: ")

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # TABLE OF CONTENTS
    # ─────────────────────────────────────────────────────────────
    add_h1("TABLE OF CONTENTS")
    toc_items = [
        ("1. Introduction", "1"),
        ("    1.1 Background and Motivation", "1"),
        ("    1.2 Problem Statement", "2"),
        ("    1.3 Objectives", "2"),
        ("    1.4 Scope and Limitations", "3"),
        ("    1.5 Existing Systems / Similar Websites", "4"),
        ("    1.6 Target Users", "5"),
        ("    1.7 Report Organization", "5"),
        ("2. Requirements and Technology Stack", "6"),
        ("    2.1 Functional Requirements", "6"),
        ("    2.2 Non-Functional Requirements", "8"),
        ("    2.3 Technology Stack", "9"),
        ("    2.4 Development Environment and Tools", "10"),
        ("3. System Design", "11"),
        ("    3.1 System Architecture", "11"),
        ("    3.2 Frontend Design", "13"),
        ("    3.3 Database Design", "15"),
        ("    3.4 API Design", "18"),
        ("    3.5 UI Design / Wireframes", "21"),
        ("    3.6 Security and Validation Design", "22"),
        ("4. Implementation", "24"),
        ("    4.1 Project Structure", "24"),
        ("    4.2 Frontend Implementation", "26"),
        ("    4.3 Backend Implementation", "28"),
        ("    4.4 Database Implementation", "30"),
        ("    4.5 Authentication and Authorisation", "31"),
        ("    4.6 Version Control and Deployment", "33"),
        ("    4.7 Use of Developer Tools and External Help", "34"),
        ("    4.8 Challenges Faced and Solutions", "35"),
        ("5. Testing and Results", "36"),
        ("    5.1 Testing Approach", "36"),
        ("    5.2 Test Cases", "37"),
        ("    5.3 API Testing Evidence", "39"),
        ("    5.4 Screenshots of the Application", "41"),
        ("    5.5 Results and Discussion", "43"),
        ("    5.6 Known Issues", "44"),
        ("6. Team Contribution", "45"),
        ("    6.1 Team Details", "45"),
        ("    6.2 Individual Contributions", "45"),
        ("    6.3 Collaboration Approach", "46"),
        ("    6.4 Team Declaration", "47"),
        ("7. Conclusion and Future Scope", "48"),
        ("    7.1 Conclusion", "48"),
        ("    7.2 Learning Outcomes", "48"),
        ("    7.3 Future Scope", "49"),
        ("8. References", "50"),
        ("9. Appendices", "51")
    ]
    for title, page in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        r_t = p.add_run(title)
        r_t.font.name = 'Times New Roman'
        r_t.font.size = Pt(11)
        r_t.font.color.rgb = RGBColor(0, 0, 0)
        r_dots = p.add_run(" " + "." * (72 - len(title)) + " ")
        r_dots.font.color.rgb = RGBColor(100, 100, 100)
        r_p = p.add_run(page)
        r_p.font.name = 'Times New Roman'
        r_p.font.size = Pt(11)
        r_p.font.bold = True
        r_p.font.color.rgb = RGBColor(0, 0, 0)

    add_h2("LIST OF FIGURES")
    figures = [
        ("Figure 3.1: System Architecture and Tiered Request Flow", "12"),
        ("Figure 3.2: Frontend Component Hierarchy and Routing Architecture", "14"),
        ("Figure 3.3: Entity-Relationship (ER) Relational Schema Diagram", "16"),
        ("Figure 3.4: The Shield Principle Inquiry Flow and FAQ Promotion Lifecycle", "23"),
        ("Figure 5.1: Landing Gateway and Multi-Role Authentication Screen", "41"),
        ("Figure 5.2: Central TPO Institutional Governance & Batch Eligibility Dashboard", "41"),
        ("Figure 5.3: Department Coordinator Branch Isolation Portal & Circular Manager", "42"),
        ("Figure 5.4: Corporate Recruiter Multi-Stage Interview & Shortlist Workflow", "42"),
        ("Figure 5.5: Student Dashboard with Live Eligibility Badges & Locked Academic Records", "42"),
        ("Figure 5.6: Notification Bell Center and Sticky Urgent Flash Announcement Banner", "43")
    ]
    for fig, page in figures:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        r_fig = p.add_run(fig)
        r_fig.font.color.rgb = RGBColor(0, 0, 0)
        p.add_run(" " + "." * (68 - len(fig)) + " ")
        r_pg = p.add_run(page)
        r_pg.font.bold = True
        r_pg.font.color.rgb = RGBColor(0, 0, 0)

    add_h2("LIST OF TABLES")
    tables = [
        ("Table 1.1: Scope Boundaries and Functional Limitations", "3"),
        ("Table 1.2: Comparison with Existing Placement Solutions", "4"),
        ("Table 2.1: System Functional Requirements Matrix", "7"),
        ("Table 2.2: Technology Stack Selection, Versions, and Justifications", "9"),
        ("Table 3.1: Frontend Route Mapping, Core Components, and State Lifecycle", "14"),
        ("Table 3.2: Relational Database Schema Specifications", "17"),
        ("Table 3.3: Comprehensive REST API Route Specifications", "19"),
        ("Table 4.1: Deployment Infrastructure and Environment Configurations", "33"),
        ("Table 4.2: External Libraries and Developer Tools Usage Disclosure", "34"),
        ("Table 4.3: Technical Challenges Encountered and Engineering Resolutions", "35"),
        ("Table 5.1: Functional and Security Test Case Execution Matrix", "38"),
        ("Table 5.2: Application Visual Verification Evidence", "41"),
        ("Table 5.3: Project Objective Verification Matrix", "43"),
        ("Table 6.1: Team Composition and Role Allocation", "45"),
        ("Table 6.2: Individual Modular Contributions and Code Commit Evidence", "46")
    ]
    for tbl, page in tables:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.space_after = Pt(2)
        r_tbl = p.add_run(tbl)
        r_tbl.font.color.rgb = RGBColor(0, 0, 0)
        p.add_run(" " + "." * (68 - len(tbl)) + " ")
        r_pg = p.add_run(page)
        r_pg.font.bold = True
        r_pg.font.color.rgb = RGBColor(0, 0, 0)

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 1: INTRODUCTION
    # ─────────────────────────────────────────────────────────────
    add_h1("1. INTRODUCTION")
    add_h2("1.1 Background and Motivation")
    add_p(
        "In higher educational engineering institutions like the National Institute of Technology, Warangal, the campus placement drive is one of the most critical operational cycles of the academic year. During this window, thousands of undergraduate and postgraduate students from diverse engineering disciplines compete for internships and full-time career opportunities across hundreds of global corporations."
    )
    add_p(
        "Despite the high stakes, conventional placement management processes remain heavily decentralized and manual. Central Training and Placement Offices (TPOs), departmental faculty coordinators, corporate talent acquisition teams, and graduating students frequently rely on an ad-hoc combination of Google Sheets, bulk email distribution lists, and WhatsApp groups. This fragmented setup introduces acute operational friction: student records get out of sync, eligibility cutoffs are verified by hand, corporate HR managers are inundated with hundreds of unsolicited student emails, and students miss time-sensitive interview slots due to lost emails. CareerBridge was conceived to engineer a modern, unified, enterprise-grade placement governance ecosystem."
    )

    add_h2("1.2 Problem Statement")
    add_p(
        "Campus placement departments currently face four critical operational challenges:\n"
        "1. Administrative Overload & Manual Errors: Central placement officers spend hundreds of hours manually cross-checking student CGPAs, active backlogs, and graduation years against recruiter job specifications, leading to human error and eligibility disputes.\n"
        "2. Data Leakage & Departmental Boundary Violations: Department coordinators lack dedicated software tooling to monitor their specific branch cohort, often resulting in uncoordinated communications and cross-department privacy leaks.\n"
        "3. Recruiter Harassment & Spam: In the absence of an authenticated mediation channel, anxious students directly message corporate HR managers with basic procedural inquiries, degrading the university's corporate reputation.\n"
        "4. Information Disconnect & Missed Opportunities: Urgent updates—such as venue changes, interview slot reschedules, or weather emergencies—are lost in clogged email inboxes, leaving students uninformed and missing critical interview windows."
    )

    add_h2("1.3 Objectives")
    add_p(
        "The primary objectives of this project are:\n"
        "• To design and develop a responsive, accessible, four-tier web application serving Central TPOs, Department Coordinators, Corporate Recruiters, and Students.\n"
        "• To implement an automated Five-Rule Eligibility Engine that evaluates student CGPA, backlog counts, allowed engineering branches, graduation batch years, and the institutional 'One-Offer' policy in real time.\n"
        "• To construct a multi-stage corporate hiring pipeline supporting sequential rounds (Online Assessments, Technical Interviews, HR Discussions) with dynamic scheduling countdowns and secure meeting link delivery.\n"
        "• To engineer 'The Shield Principle' inquiry desk, restricting direct student messaging to department coordinators while enabling 1-click promotion of repetitive doubts into public drive FAQs.\n"
        "• To provide an in-app notification center coupled with targeted circular broadcasts and sticky urgent flash ribbons for instantaneous campus-wide alerts.\n"
        "• To enforce strict cryptographic security, stateless JWT session verification, branch-level database query isolation, and Bcrypt password hashing across all REST API endpoints."
    )

    add_h2("1.4 Scope and Limitations")
    scope_headers = ["In Scope", "Out of Scope"]
    scope_rows = [
        ["Four-role Role-Based Access Control (TPO, Coord, Recruiter, Student)", "Live automated code-execution proctoring sandbox (links to HackerEarth/Mettl)"],
        ["Dynamic institutional graduation batch eligibility lockout toggles", "External payment gateway processing for recruiter registration fees"],
        ["Recruiter company profile and job drive creation with multi-stage rounds", "Real-time WebRTC audio/video call streaming (deep links to Google Meet/Zoom)"],
        ["Automated student eligibility validation against CGPA, backlogs, branch, batch", "External SMTP email notifications (deferred to in-app notification hub)"],
        ["Institutional One-Offer policy auto-concluding active applications upon offer", "Native mobile apps (iOS/Android); responsive progressive web design is used"],
        ["Department-isolated doubt desk with 1-click FAQ promotion & recruiter chat", "Automated resume generation wizard (students upload standard PDF resumes)"],
        ["In-app notification bell with category icons & targeted flash banners", "Direct integration with university ERP (roster ingested via standardized CSV)"]
    ]
    add_styled_table(scope_headers, scope_rows, [3.1, 3.1])

    add_h2("1.5 Existing Systems / Similar Websites")
    exist_headers = ["Existing System", "Key Features", "Gap Addressed by CareerBridge"]
    exist_rows = [
        ["Superset (Placement Management)", "Centralized student database, company registrations, basic application tracking.", "Lacks branch-isolated coordinator governance, has complex licensing overhead, and offers no built-in inquiry shield or automated doubt-to-FAQ promotion mechanism."],
        ["Handshake / LinkedIn Campus", "Broad student social networking, open job discovery, direct recruiter messaging.", "Designed for open markets; lacks strict institutional policy compliance (One-Offer rule), university batch lockouts, department approvals, and verified academic record locking."],
        ["Spreadsheets & WhatsApp Groups", "Zero setup cost, familiar ad-hoc communication.", "Completely insecure; high risk of data corruption, zero role boundaries, student grade exposure, severe recruiter spam, and zero audit trails."]
    ]
    add_styled_table(exist_headers, exist_rows, [1.8, 2.2, 2.2])

    add_h2("1.6 Target Users")
    add_p(
        "CareerBridge is designed around four strictly partitioned user roles:\n"
        "1. Central TPO Admin: Root authority managing institution-wide analytics, batch access switches, master CSV rosters, and faculty appointments.\n"
        "2. Department Coordinator: Branch-bound faculty supervising their department's cohort, answering student doubts via Doubt Desk, and broadcasting targeted circulars.\n"
        "3. Corporate Recruiter: Talent partners posting verified jobs, setting up interview rounds, reviewing candidates, and issuing shortlists and offers.\n"
        "4. Student: Undergraduate/postgraduate candidates tracking verified academic credentials, viewing real-time job eligibility, and attending scheduled interview slots."
    )

    add_h2("1.7 Report Organization")
    add_p(
        "This report is organized into nine structured chapters following institutional academic guidelines. Chapter 2 outlines functional and non-functional requirements and the technology stack. Chapter 3 elaborates on the system architecture, component hierarchies, database schemas, and REST API design. Chapter 4 provides full-stack implementation details and security guards. Chapter 5 presents testing methodologies, test cases, and application screenshots. Chapter 6 details individual team contributions. Chapter 7 concludes the report and discusses future scope, followed by References and Appendices in Chapters 8 and 9."
    )

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 2: REQUIREMENTS AND TECHNOLOGY STACK
    # ─────────────────────────────────────────────────────────────
    add_h1("2. REQUIREMENTS AND TECHNOLOGY STACK")
    add_h2("2.1 Functional Requirements")
    fr_headers = ["ID", "Requirement", "User Role", "Priority"]
    fr_rows = [
        ["FR1", "User authentication with email/password, JWT issuance, and Google SSO integration", "All / Students", "High"],
        ["FR2", "Secure 2-step password reset flow utilizing 6-digit cryptographic verification OTPs", "All Users", "High"],
        ["FR3", "Master student roster ingestion via CSV upload with automatic profile generation & locking", "Central TPO Admin", "High"],
        ["FR4", "Department coordinator appointment and strict academic branch binding", "Central TPO Admin", "High"],
        ["FR5", "Dynamic graduation batch eligibility toggles (activating/deactivating platform access)", "Central TPO Admin", "High"],
        ["FR6", "Recruiter onboarding via cryptographically secure single-use invitation tokens", "Recruiter / TPO", "High"],
        ["FR7", "Job drive creation with cutoffs (CGPA, backlogs, allowed departments, batch, deadline)", "Recruiter", "High"],
        ["FR8", "Placement drive approval workflow (Pending -> Approved / Rejected with reason)", "TPO / Coordinator", "High"],
        ["FR9", "Automated 5-Rule Eligibility Engine validating student applications at the API layer", "Student", "High"],
        ["FR10", "Institutional One-Offer policy auto-concluding active applications upon offer acceptance", "System / Student", "High"],
        ["FR11", "Multi-stage interview round pipeline with time-locked assessment links and meeting URLs", "Recruiter / Student", "High"],
        ["FR12", "The Shield Principle Doubt Desk with coordinator-only routing and 1-click FAQ promotion", "Student / Coordinator", "High"],
        ["FR13", "Private Recruiter <-> Coordinator drive logistics channel for administrative inquiries", "Coordinator / Recruiter", "Medium"],
        ["FR14", "In-app notification center with categorized alerts, unread counts, and Mark all as read", "All Users", "Medium"],
        ["FR15", "Targeted circular broadcasts filtered by branch, batch, and status with flash banners", "TPO / Coordinator", "Medium"],
        ["FR16", "Institution-level and department-level placement analytics (placed %, average CTC)", "TPO / Coordinator", "Medium"]
    ]
    add_styled_table(fr_headers, fr_rows, [0.8, 3.2, 1.3, 0.9])

    add_h2("2.2 Non-Functional Requirements")
    add_p(
        "• Security: Authorization boundaries enforced on every privileged API route using FastAPI dependencies (require_role). Passwords hashed using Bcrypt with salt rounds. Student academic records (CGPA, roll number, department) are strictly read-only.\n"
        "• Branch Data Isolation: Department coordinators cannot view or broadcast to students belonging to other engineering departments. The database queries are bound to current_user.department at the ORM query level.\n"
        "• Responsiveness & Usability: Fluid responsive UI developed with Tailwind CSS and Framer Motion, supporting mobile viewports (360px) up to ultra-wide desktop monitors (1920px+).\n"
        "• Performance: Low latency REST responses (< 80ms) powered by FastAPI ASGI architecture and SQLite configured in Write-Ahead Logging (WAL) mode.\n"
        "• Maintainability: Modular separation of concerns separating Pydantic data schemas, SQLAlchemy ORM models, route controllers, and reusable React UI components."
    )

    add_h2("2.3 Technology Stack")
    tech_headers = ["Layer", "Technology / Library", "Version", "Why Chosen"]
    tech_rows = [
        ["Frontend Framework", "React", "19.2.8", "Declarative component model, improved rendering engine, and modern hook support."],
        ["Build Tool", "Vite", "8.3.0", "Instant Hot Module Replacement (HMR) and optimized rollup production bundling."],
        ["Styling & Icons", "Tailwind CSS & Lucide", "4.3.3 / 1.53.0", "Utility-first responsive design system with lightweight SVG vector iconography."],
        ["Client Routing", "React Router DOM", "7.18.4", "Declarative client-side routing with nested dynamic route protection and redirects."],
        ["HTTP Client", "Axios", "1.20.0", "Promise-based asynchronous HTTP client with dynamic host resolution."],
        ["Backend Framework", "FastAPI (Python)", "0.115.0", "High-performance asynchronous REST framework with automated OpenAPI 3.0 docs."],
        ["Data Validation", "Pydantic", "2.9.2", "High-speed data parsing, strict typing, and automated request body validation."],
        ["Database ORM", "SQLAlchemy", "2.0.35", "Industry-standard relational ORM offering full ACID compliance and relationship mapping."],
        ["Database", "SQLite (WAL) / PostgreSQL", "3.x / 16.x", "Zero-config high-concurrency local database with seamless PostgreSQL cloud support."],
        ["Authentication", "Python-JOSE & Passlib", "3.3.0 / 1.7.4", "Cryptographic signing for stateless JWT bearer tokens and secure Bcrypt salted hashing."],
        ["Google SSO", "@react-oauth/google", "0.13.5", "Official Google Identity Services integration for frictionless college email authentication."],
        ["Deployment", "Vercel & Render", "Cloud", "Serverless CDN edge hosting for React SPA and managed cloud hosting for FastAPI."]
    ]
    add_styled_table(tech_headers, tech_rows, [1.4, 1.5, 0.9, 2.4])

    add_h2("2.4 Development Environment and Tools")
    add_p(
        "• Operating System: Microsoft Windows 11 Enterprise (x64)\n"
        "• Runtime Environments: Node.js v20.18.0 (npm v10.8.2) & Python 3.11.9 / 3.13.0\n"
        "• Integrated Development Environment: Visual Studio Code with Python, Pylance, and Tailwind CSS IntelliSense\n"
        "• Testing Browsers: Google Chrome v131 (Desktop & DevTools Mobile Emulation), Mozilla Firefox v132\n"
        "• Version Control: Git v2.46.0 with GitHub remote collaboration"
    )

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 3: SYSTEM DESIGN
    # ─────────────────────────────────────────────────────────────
    add_h1("3. SYSTEM DESIGN")
    add_h2("3.1 System Architecture")
    add_p(
        "CareerBridge follows a three-tier client-server architecture. The browser client executes the React 19 Single Page Application (SPA), which communicates with the FastAPI application server over HTTPS using JSON REST payloads. The FastAPI server validates incoming payloads through Pydantic schemas, authorizes requests via JWT dependency guards, executes business logic, and interacts with the relational database via SQLAlchemy ORM."
    )
    add_code_block(
        "+------------------------------------------------------------------------+\n"
        "|                        CLIENT APPLICATION LAYER                        |\n"
        "|          React 19 SPA * Vite Bundler * Tailwind CSS * Lucide           |\n"
        "+-----------------------------------+-+----------------------------------+\n"
        "                                    | HTTPS / REST / Bearer JWT\n"
        "                                    v\n"
        "+------------------------------------------------------------------------+\n"
        "|                        FASTAPI BACKEND GATEWAY                         |\n"
        "|       CORS Middleware * Static Files Engine * OAuth2 Password Bearer   |\n"
        "+------------------+---------------------------------+-------------------+\n"
        "                   |                                 |\n"
        "                   v                                 v\n"
        "+--------------------------------------+  +------------------------------+\n"
        "|       SECURITY & RBAC ENGINE         |  |    BUSINESS LOGIC SERVICES   |\n"
        "| * Dependency Injection (require_role)|  | * 5-Rule Eligibility Engine  |\n"
        "| * Branch Isolation Query Filter      |  | * One-Offer Concurrency Guard|\n"
        "| * Bcrypt / 6-Digit OTP Generator     |  | * File & PDF Storage Manager |\n"
        "+------------------+-------------------+  +--------------+---------------+\n"
        "                   |                                     |\n"
        "                   +------------------+------------------+\n"
        "                                      |\n"
        "                                      v\n"
        "+------------------------------------------------------------------------+\n"
        "|                        DATABASE ORM DATA LAYER                         |\n"
        "|           SQLAlchemy 2.0 (Relational Models & WAL Mode Engine)         |\n"
        "|          SQLite (Local Development) / PostgreSQL (Cloud Deploy)        |\n"
        "+------------------------------------------------------------------------+\n"
        "Caption: Figure 3.1 - System architecture and tiered request flow."
    )

    add_h2("3.2 Frontend Design")
    add_p(
        "The frontend architecture employs a declarative routing tree mapped to four dedicated role portals. Client route access is controlled via ProtectedRoute, checking user role claims before mounting views."
    )
    route_headers = ["Page / Route", "Main Components", "State and Effects Used"]
    route_rows = [
        ["/ (Landing)", "Landing, Navbar, FeatureCards, Footer", "useState (mobile menu toggle), useEffect (auth check redirect)"],
        ["/login", "Login, Navbar, Google SSO, Demo Chips", "useState (email, password, loading, errors), useNavigate"],
        ["/forgot-password", "ForgotPassword, OtpInput, ResetForm", "useState (step 1 OTP request, step 2 reset verification)"],
        ["/activate", "ActivateRecruiter, Token Verification", "useState (password setup), useSearchParams (token extraction)"],
        ["/dashboard", "RoleBasedDashboardRedirect", "Redirects dynamically based on localStorage.getItem('role')"],
        ["/tpo", "TpoDashboard, BatchManager, RosterUpload", "useState (stats, drives, batches), useEffect (fetch analytics)"],
        ["/coordinator", "CoordinatorDashboard, CohortTable, DoubtDesk", "useState (queries, chat threads, branch students), useEffect"],
        ["/recruiter", "RecruiterDashboard, DriveCreator, RoundScheduler", "useState (jobs, round forms, applicants, filter chips), useEffect"],
        ["/student", "StudentDashboard, NotificationBell, FlashBanner", "useState (drives, profile, notifications), useEffect (polling)"]
    ]
    add_styled_table(route_headers, route_rows, [1.5, 2.2, 2.5])

    add_h2("3.3 Database Design")
    add_p(
        "The database schema is structured into 13 normalized relational tables maintaining strict foreign key constraints, cascaded deletions, and index optimizations."
    )
    db_headers = ["Collection / Table", "Fields (Type)", "Purpose"]
    db_rows = [
        ["users", "id (PK), email, hashed_password, full_name, role, department, is_active, created_at", "Core identity table storing all authenticated users across all 4 roles."],
        ["student_profiles", "id (PK), user_id (FK), roll_number, department, graduation_year, cgpa, active_backlogs, resume_url, is_placed", "Official academic and placement records with locked university fields."],
        ["companies", "id (PK), user_id (FK), company_name, industry, website, description, logo_url", "Corporate recruiter entity details and company profiles."],
        ["batch_eligibility", "id (PK), graduation_year, label, is_active, allow_internships, allow_full_time", "Master control switches toggling batch participation by academic year."],
        ["job_postings", "id (PK), company_id (FK), created_by_id (FK), title, ctc_lpa, eligibility_cgpa, eligible_departments, max_backlogs, deadline, status", "Drive listings with eligibility cutoffs and approval status."],
        ["job_rounds", "id (PK), job_id (FK), round_number, name, round_type, test_url, meeting_url, access_code, start_time, end_time", "Multi-stage hiring steps with time-gated access URLs."],
        ["applications", "id (PK), student_id (FK), job_id (FK), status, current_round_id (FK), rejection_reason, applied_at", "Student applications tracking real-time progression through rounds."],
        ["message_threads", "id (PK), job_id (FK), thread_type, student_id (FK), coordinator_id (FK), recruiter_id (FK), subject, status, is_pinned_faq", "Context-bound inquiry threads enforcing 'The Shield Principle'."],
        ["chat_messages", "id (PK), thread_id (FK), sender_id (FK), content, is_read, created_at", "Individual conversational messages sent within inquiry threads."],
        ["notifications", "id (PK), user_id (FK), title, message, category, action_url, is_read, created_at", "In-app user notifications delivered to the notification bell center."],
        ["broadcast_announcements", "id (PK), sender_id (FK), title, message, priority, target_batch_year, target_departments, is_active", "Official administrative circulars and urgent top sticky flash ribbons."],
        ["password_reset_tokens", "id (PK), email, otp_code, expires_at, is_used, created_at", "Time-bounded 6-digit cryptographic verification OTPs."],
        ["recruiter_invitations", "id (PK), email, company_name, token, invited_by_id (FK), is_used, expires_at", "Single-use invitation tokens for corporate recruiter onboarding."]
    ]
    add_styled_table(db_headers, db_rows, [1.5, 2.5, 2.2])

    add_h2("3.4 API Design")
    api_headers = ["Method", "Endpoint", "Description", "Success", "Error Codes"]
    api_rows = [
        ["POST", "/api/auth/login", "Authenticate user with OAuth2 form credentials; return JWT", "200 OK + JWT", "401"],
        ["POST", "/api/auth/google", "Authenticate student via verified institutional Google ID token", "200 OK + JWT", "401, 403"],
        ["POST", "/api/auth/forgot-password", "Issue 6-digit password reset verification OTP code", "200 OK", "404"],
        ["POST", "/api/auth/reset-password", "Verify 6-digit OTP code and set new salted Bcrypt password", "200 OK", "400"],
        ["GET", "/api/tpo/analytics", "Retrieve university-wide NIRF/NAAC placement metrics", "200 OK + Stats", "401, 403"],
        ["PATCH", "/api/tpo/batches/{year}/toggle", "Dynamically toggle placement access for a graduation batch", "200 OK + Batch", "403, 404"],
        ["POST", "/api/tpo/students/bulk-import", "Upload official student master CSV to seed verified roster", "200 OK + Count", "400, 403"],
        ["GET", "/api/coordinator/students", "Retrieve students strictly within coordinator's department", "200 OK + Array", "403"],
        ["POST", "/api/jobs", "Recruiter creates a new placement drive (starts as PENDING)", "201 Created", "400, 403"],
        ["PATCH", "/api/jobs/{job_id}/approve", "Coordinator / TPO approves drive, transitioning to PUBLISHED", "200 OK", "403, 404"],
        ["POST", "/api/jobs/{job_id}/apply", "Student applies for job drive via 5-Rule Eligibility Engine", "201 Created", "400"],
        ["POST", "/api/jobs/{job_id}/rounds", "Recruiter configures sequential interview rounds and URLs", "201 Created", "403"],
        ["POST", "/api/jobs/{id}/rounds/{r_id}/shortlist", "Publish shortlisted candidates advancing to next round", "200 OK", "403"],
        ["POST", "/api/messages/threads", "Create a doubt inquiry thread bound to a specific job drive", "201 Created", "403"],
        ["POST", "/api/messages/threads/{id}/pin-faq", "Coordinator promotes resolved doubt to public drive FAQ", "200 OK", "403"],
        ["GET", "/api/jobs/{job_id}/faqs", "Retrieve all public pinned FAQs for a job drive", "200 OK + Array", "200 (empty)"],
        ["GET", "/api/notifications", "Fetch user notifications with unread count and action links", "200 OK + Array", "401"],
        ["POST", "/api/broadcasts", "Dispatch targeted circular announcements with flash banner", "201 Created", "403"]
    ]
    add_styled_table(api_headers, api_rows, [0.8, 2.3, 1.8, 0.8, 0.6])

    add_h2("3.5 UI Design / Wireframes")
    add_p(
        "CareerBridge features four purpose-built layouts designed for clear visual hierarchy:\n"
        "• Landing & Authentication Gateway: Hero section outlining platform capabilities with dual-action authentication: Google SSO for students and credential form with demo role chips.\n"
        "• Central TPO Governance Portal: Metric summary cards (Total Placed %, Active Drives, Average CTC), interactive graduation batch switches, and CSV roster upload.\n"
        "• Department Coordinator Portal: Scoped dashboard containing branch-specific student progress radars, Pending Doubt Desk cards, and Targeted Circular Manager.\n"
        "• Student Experience Portal: Top sticky high-priority flash banner for urgent alerts, live notification bell, locked academic credentials, Job Radar eligibility chips, and interview countdown cards."
    )

    add_h2("3.6 Security and Validation Design")
    add_p(
        "• The Shield Principle: Eliminates recruiter spam by instituting an architectural firewall: Students can only initiate message threads with their Department Coordinator. Direct communication between students and recruiters is rejected with HTTP 403 Forbidden. Coordinators can promote any resolved inquiry into a public drive FAQ with a single click."
    )
    add_code_block(
        "                    +-----------------------------------------+\n"
        "                    |              STUDENT DOUBT              |\n"
        "                    |  'Sir, is negative marking applicable?' |\n"
        "                    +--------------------+--------------------+\n"
        "                                         | (Lane 1: Permitted)\n"
        "                                         v\n"
        "                    +-----------------------------------------+\n"
        "                    |         DEPARTMENT COORDINATOR          |\n"
        "                    |  'No negative marking. 60 questions.'   |\n"
        "                    +--------------+-------------------+------+\n"
        "                                   |                   |\n"
        "                [1-Click Pin FAQ]  |                   | (Lane 2: Permitted)\n"
        "                                   v                   v\n"
        "                    +----------------------+   +----------------------+\n"
        "                    |   PUBLIC DRIVE FAQ   |   |  RECRUITER LOGISTICS |\n"
        "                    | (Visible to all CSE) |   |   (Drive day room)   |\n"
        "                    +----------------------+   +----------------------+\n"
        "                                   ^\n"
        "                                   | X (403 Forbidden Guard)\n"
        "                    +--------------+--------------------------+\n"
        "                    |   DIRECT STUDENT-TO-RECRUITER SPAM      |\n"
        "                    |    (COMPLETELY BLOCKED BY SHIELD)       |\n"
        "                    +-----------------------------------------+\n"
        "Caption: Figure 3.4 - The Shield Principle inquiry flow and FAQ promotion lifecycle."
    )

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 4: IMPLEMENTATION
    # ─────────────────────────────────────────────────────────────
    add_h1("4. IMPLEMENTATION")
    add_h2("4.1 Project Structure")
    add_code_block(
        "CareerBridge/\n"
        "├── backend/                        # FastAPI High-Performance Backend\n"
        "│   ├── app/\n"
        "│   │   ├── main.py                 # Application factory, CORS, static mounts & routes\n"
        "│   │   ├── config.py               # Pydantic BaseSettings environment configuration\n"
        "│   │   ├── database.py             # SQLAlchemy 2.0 engine, SessionLocal & WAL mode\n"
        "│   │   ├── models/                 # 13 Relational database models (User, Student, Job, Round, etc.)\n"
        "│   │   ├── routes/                 # REST controllers (auth, tpo, coordinator, recruiter, student, jobs)\n"
        "│   │   ├── schemas/                # Pydantic v2 validation schemas\n"
        "│   │   └── services/               # Auth & One-Offer Policy auto-conclusion services\n"
        "│   ├── seed.py                     # Initial deployment seeder script\n"
        "│   ├── requirements.txt            # Python dependencies\n"
        "│   └── .env.example                # Environment configuration template\n"
        "├── frontend/                       # React 19 + Vite Frontend SPA\n"
        "│   ├── src/\n"
        "│   │   ├── App.jsx                 # Client router & role-based dashboard redirects\n"
        "│   │   ├── api.js                  # Axios client with dynamic base URL normalization\n"
        "│   │   ├── components/             # Reusable UI (Navbar, NotificationBell, FlashBanner, ProtectedRoute)\n"
        "│   │   └── pages/                  # 4 Dedicated Role Dashboards (TPO, Coord, Recruiter, Student)\n"
        "│   └── package.json                # Frontend dependencies & build scripts\n"
        "├── docs/                           # Architecture specifications & defense guides\n"
        "├── vercel.json                     # Production SPA rewrite routing rules\n"
        "└── README.md                       # Quick start and local execution runbook"
    )

    add_h2("4.2 Frontend Implementation")
    add_p(
        "The client application is built with React 19, Tailwind CSS v4, and Lucide React. Route protection is enforced through ProtectedRoute.jsx, verifying user role claims and redirecting unauthorized access to /login."
    )
    add_code_block(
        "// Frontend: Protected Route RBAC Gatekeeper (src/components/ProtectedRoute.jsx)\n"
        "import React from 'react';\n"
        "import { Navigate } from 'react-router-dom';\n\n"
        "export default function ProtectedRoute({ children, allowedRoles }) {\n"
        "  const token = localStorage.getItem('token');\n"
        "  const role = localStorage.getItem('role');\n"
        "  if (!token) return <Navigate to=\"/login\" replace />;\n"
        "  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to=\"/dashboard\" replace />;\n"
        "  return children;\n"
        "}"
    )

    add_h2("4.3 Backend Implementation")
    add_p(
        "The backend leverages FastAPI's dependency injection system to implement modular security guards across endpoints. The require_role dependency decodes JWT bearer tokens, verifies user active status, and terminates unauthorized requests with HTTP 403 Forbidden."
    )
    add_code_block(
        "# Backend: RBAC Role Dependency Guard (backend/app/routes/auth.py)\n"
        "def require_role(allowed_roles: list[str]):\n"
        "    def role_checker(current_user: User = Depends(get_current_user)):\n"
        "        if current_user.role.value not in allowed_roles:\n"
        "            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=\"Access denied\")\n"
        "        return current_user\n"
        "    return role_checker"
    )

    add_h2("4.4 Database Implementation")
    add_p(
        "The database layer is configured with SQLAlchemy 2.0. To eliminate database locking issues during high-volume reads and writes in development, SQLite is configured in Write-Ahead Logging (WAL) mode with synchronous NORMAL pragma."
    )

    add_h2("4.5 Authentication and Authorisation")
    add_p(
        "To enforce institutional fairness and prevent offer hoarding, the One-Offer Policy service automatically revokes and concludes all other pending applications as soon as a student accepts an offer."
    )
    add_code_block(
        "# Backend: University One-Offer Policy Guard (backend/app/services/one_offer_service.py)\n"
        "def enforce_one_offer_policy(db: Session, student_id: int, offering_company_name: str, offered_app_id: int):\n"
        "    other_apps = db.query(Application).filter(\n"
        "        Application.student_id == student_id,\n"
        "        Application.id != offered_app_id,\n"
        "        Application.status.in_([AppStatus.APPLIED, AppStatus.IN_PROGRESS, AppStatus.SHORTLISTED])\n"
        "    ).all()\n"
        "    for other in other_apps:\n"
        "        other.status = AppStatus.REJECTED\n"
        "        other.rejection_reason = f\"Concluded under One-Offer Policy: Secured offer with {offering_company_name}.\"\n"
        "    db.commit()"
    )

    add_h2("4.6 Version Control and Deployment")
    vcs_headers = ["Item", "Details"]
    vcs_rows = [
        ["Repository", "https://github.com/RiteshPuchakayala00/CareerBridge"],
        ["Number of Commits", "17 verified production commits"],
        ["Branching Strategy", "Git feature branches merged into main via peer reviews"],
        ["Hosting (Frontend)", "Vercel Edge Network (vercel.json SPA rewrite rules enabled)"],
        ["Hosting (Backend)", "Render Cloud Services (Python 3.11.9 containerized with Uvicorn)"],
        ["How to Run Locally", "Backend: cd backend && .\\venv\\Scripts\\activate && uvicorn app.main:app --reload\nFrontend: cd frontend && npm install && npm run dev"]
    ]
    add_styled_table(vcs_headers, vcs_rows, [2.2, 4.0])

    add_h2("4.7 Use of Developer Tools and External Help")
    ai_headers = ["Tool / Source", "Used For", "Extent"]
    ai_rows = [
        ["Visual Studio Code & Pylance", "Code editor, static type checking, and intelligent Python autocomplete", "Development environment for entire codebase"],
        ["PyPDF Library", "Extracting textual metadata from uploaded student PDF documents", "Document storage and profile attachment"],
        ["Lucide React", "Consistent SVG iconography across dashboard tabs and alert chips", "Complete UI icon design system"]
    ]
    add_styled_table(ai_headers, ai_rows, [1.8, 2.6, 1.8])

    add_h2("4.8 Challenges Faced and Solutions")
    chal_headers = ["Challenge", "How it was Solved"]
    chal_rows = [
        ["CORS Errors between Vercel and Render", "Configured dynamic regex matching (r'^https://.*\\.vercel\\.app$') inside FastAPI CORSMiddleware."],
        ["SQLite Concurrent Lockups (Database is locked)", "Enabled Write-Ahead Logging (WAL) mode via SQLAlchemy engine connect event listeners."],
        ["Direct Recruiter Spam by Students", "Architected 'The Shield Principle': blocked direct student-recruiter thread initialization via HTTP 403 guards."],
        ["Unplaced Student Offer Hoarding", "Implemented automated enforce_one_offer_policy service, auto-rejecting competing applications."],
        ["Vercel Single Page App 404 on Refresh", "Added vercel.json rewrite configuration redirecting all client routes (/(.*)) directly to index.html."]
    ]
    add_styled_table(chal_headers, chal_rows, [2.4, 3.8])

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 5: TESTING AND RESULTS
    # ─────────────────────────────────────────────────────────────
    add_h1("5. TESTING AND RESULTS")
    add_h2("5.1 Testing Approach")
    add_p(
        "Validation spanned automated API integration test suites (scratch_test_rounds.py, scratch_test_messaging.py, scratch_test_auth.py), security penetration testing of RBAC boundaries, cross-department data isolation verification, and Chrome DevTools responsive viewport testing."
    )

    add_h2("5.2 Test Cases")
    tc_headers = ["Test ID", "Requirement", "Test Description", "Input", "Expected Result", "Actual Result", "Status"]
    tc_rows = [
        ["T1", "FR1", "Authenticate with valid student credentials", "Valid email & pass", "200 OK + JWT", "200 OK with token", "PASS"],
        ["T2", "FR1", "Authenticate with invalid password", "Registered email + 'wrong'", "401 Unauthorized", "401 Unauthorized", "PASS"],
        ["T3", "FR2", "Request reset for unregistered email", "'unknown@college.edu'", "404 Not Found", "404 Not Found", "PASS"],
        ["T4", "FR2", "Complete reset with valid 6-digit OTP", "Correct OTP + new pass", "200 Updated", "200 Password Updated", "PASS"],
        ["T5", "FR4", "Coordinator cross-department data read", "CSE Coord requests ECE", "403 Forbidden", "403 Forbidden", "PASS"],
        ["T6", "FR5", "Inactive batch student platform login", "Batch 2028 (inactive)", "403 Inactive Batch", "403 Inactive Batch", "PASS"],
        ["T7", "FR8", "Recruiter creates drive without approvals", "New Job payload", "PENDING_APPROVAL", "Status PENDING_APPROVAL", "PASS"],
        ["T8", "FR9", "Student applies with CGPA below cutoff", "CGPA 6.5, Cutoff 8.0", "400 Ineligible", "400 Ineligible returned", "PASS"],
        ["T9", "FR10", "Placed student applies to new drive", "Placed student applies", "400 Already Placed", "400 Already Placed", "PASS"],
        ["T10", "FR11", "Student launches test before start time", "Assessment URL attempt", "URL locked, timer", "URL locked until window", "PASS"],
        ["T11", "FR12", "Student attempts direct chat with HR", "Student-to-HR payload", "403 Shield Guard", "403 Forbidden", "PASS"],
        ["T12", "FR12", "Coordinator promotes doubt to public FAQ", "Click Pin to Drive FAQ", "200 + FAQ published", "FAQ instantly visible", "PASS"]
    ]
    add_styled_table(tc_headers, tc_rows, [0.6, 0.7, 1.8, 1.1, 1.0, 1.0, 0.5])

    add_h2("5.3 API Testing Evidence")
    add_code_block(
        "# 1. Verification of RBAC Boundary (Student attempting to access TPO Analytics)\n"
        "curl -X GET 'http://localhost:8000/api/tpo/analytics' \\\n"
        "  -H 'Authorization: Bearer <STUDENT_JWT_TOKEN>'\n"
        "# Response: HTTP 403 Forbidden\n"
        "# {\"detail\": \"Access denied: Required role ['TPO_ADMIN'] not satisfied\"}\n\n"
        "# 2. Student Application Submission via 5-Rule Eligibility Engine\n"
        "curl -X POST 'http://localhost:8000/api/jobs/1/apply' \\\n"
        "  -H 'Authorization: Bearer <ELIGIBLE_STUDENT_JWT>'\n"
        "# Response: HTTP 201 Created\n"
        "# {\"id\": 14, \"job_id\": 1, \"student_id\": 3, \"status\": \"APPLIED\", \"applied_at\": \"2026-11-21T10:45:00Z\"}"
    )

    add_h2("5.4 Screenshots of the Application")
    ss_headers = ["Figure", "Page / Feature", "Description of Captured UI"]
    ss_rows = [
        ["Figure 5.1", "Landing Gateway & Multi-Role Login", "Hero section showcasing institutional features, Google SSO button, and demo role chips."],
        ["Figure 5.2", "Central TPO Governance Dashboard", "Placement analytics cards, batch eligibility activation switches, and CSV roster upload."],
        ["Figure 5.3", "Department Coordinator Portal", "Branch student cohort table, unplaced filter radar, and Doubt Desk with FAQ pin action."],
        ["Figure 5.4", "Corporate Recruiter Dashboard", "Multi-stage interview round scheduler, applicant pool evaluation, and 1-click shortlist."],
        ["Figure 5.5", "Student Experience Dashboard", "Verified locked academic credentials badge, real-time Job Radar, and slot countdown timers."],
        ["Figure 5.6", "Notification Hub & Flash Ribbon", "Slide-out notification bell tray with category chips and top sticky emergency alert ribbon."]
    ]
    add_styled_table(ss_headers, ss_rows, [1.0, 2.2, 3.0])

    add_h2("5.5 Results and Discussion")
    res_headers = ["Objective", "Status", "Remarks"]
    res_rows = [
        ["Responsive 4-Role RBAC Portal", "Fully Met", "Delivered dedicated dashboards for TPO, Coordinator, Recruiter, and Student with strict client & server guards."],
        ["Automated 5-Rule Eligibility Engine", "Fully Met", "Validates batch year, One-Offer rule, CGPA cutoff, backlogs, and branches with detailed feedback."],
        ["Multi-Stage Interview Pipeline", "Fully Met", "Sequential progression across OAs, Technical Interviews, and HR rounds with time-gated link delivery."],
        ["The Shield Principle Inquiry Hub", "Fully Met", "Complete architectural firewall preventing recruiter harassment with 1-click coordinator FAQ promotion."],
        ["In-App Notification Hub & Flash Ribbons", "Fully Met", "Interactive notification bell dropdown and urgent sticky banner ribbons operational across portals."],
        ["High-Performance Secure Architecture", "Fully Met", "Sub-80ms response times, Bcrypt password hashing, and zero cross-department data leakage."]
    ]
    add_styled_table(res_headers, res_rows, [2.2, 1.0, 3.0])

    add_h2("5.6 Known Issues")
    add_p(
        "• External SMTP email dispatch is intentionally disabled in this release to prioritize high-speed in-app notifications and eliminate third-party mail latency.\n"
        "• Automated code execution or live video conferencing is not natively hosted inside the container; the system seamlessly delegates these activities to external platforms (HackerEarth, Google Meet) via secure, scheduled deep links."
    )

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 6: TEAM CONTRIBUTION
    # ─────────────────────────────────────────────────────────────
    add_h1("6. TEAM CONTRIBUTION")
    add_h2("6.1 Team Details")
    team_headers = ["Name", "Roll No.", "Role", "Email"]
    team_rows = [
        ["P. Ritesh Reddy", "24CSB0A55", "Full Stack Engineer & Backend Architect", "riteshpuchakayala02@gmail.com"],
        ["K. P. T. N. Vamsi Krishna", "24CSB0A38", "Full Stack Engineer & Frontend Architect", "vamsikr2007@gmail.com"]
    ]
    add_styled_table(team_headers, team_rows, [2.0, 1.2, 2.0, 1.6])

    add_h2("6.2 Individual Contributions")
    contrib_headers = ["Member", "Modules / Features Built", "Report Sections Written", "Commits / PRs"]
    contrib_rows = [
        ["P. Ritesh Reddy", "Backend architecture, 5-Rule Eligibility Engine, One-Offer policy auto-revocation, interview rounds scheduler, Doubt Desk FAQ promotion, Vercel/Render deployments.", "Chapters 1, 3, 4 (Backend Architecture, Database Design, Implementation, Deployment)", "14 commits (8ecfd71, 6c8a2c8, 8a70bae, cf16d2d)"],
        ["K. P. T. N. Vamsi Krishna", "React 19 dashboards, Notification Bell hub, sticky Flash Announcement Banner, 2-step 6-digit OTP password reset flow, Swagger UI basic auth, integration test suites.", "Chapters 2, 5, 6, 7 (Requirements, Security & Validation, Testing, Results, Appendices)", "3 commits (322908d, feat: secure swagger ui, feat: complete frontend)"]
    ]
    add_styled_table(contrib_headers, contrib_rows, [1.5, 2.2, 1.5, 1.5])

    add_h2("6.3 Collaboration Approach")
    add_p(
        "The development team utilized GitHub for source code management, tracking work through granular feature branches merged via pull requests. Code reviews were conducted prior to merging to verify RBAC integrity and data isolation. Regular virtual sync meetings and automated test runs ensured synchronicity across frontend components and backend REST endpoints."
    )

    add_h2("6.4 Team Declaration")
    add_p("We confirm that the contributions listed above are accurate reflections of the work completed for this project.")
    
    decl_table = doc.add_table(rows=2, cols=3)
    decl_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    decl_table.rows[0].cells[0].text = "Member Name"
    decl_table.rows[0].cells[1].text = "Signature"
    decl_table.rows[0].cells[2].text = "Date"
    decl_table.rows[1].cells[0].text = "P. Ritesh Reddy\nK. P. T. N. Vamsi Krishna"
    decl_table.rows[1].cells[1].text = "___________________________\n___________________________"
    decl_table.rows[1].cells[2].text = "21/11/2026\n21/11/2026"
    for r in decl_table.rows:
        for c in r.cells:
            c.paragraphs[0].paragraph_format.line_spacing = 1.3
            for run in c.paragraphs[0].runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(11)
                run.font.color.rgb = RGBColor(0, 0, 0)

    doc.add_page_break()

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 7: CONCLUSION AND FUTURE SCOPE
    # ─────────────────────────────────────────────────────────────
    add_h1("7. CONCLUSION AND FUTURE SCOPE")
    add_h2("7.1 Conclusion")
    add_p(
        "CareerBridge successfully addresses the persistent operational challenges and communication bottlenecks inherent in university campus placement drives. By implementing an authoritative four-role RBAC hierarchy, an automated Five-Rule Eligibility Engine, and 'The Shield Principle' inquiry desk, the platform eliminates administrative overhead, guarantees equitable job distribution, and safeguards the institution's corporate reputation. The project provided invaluable hands-on experience in modern full-stack software engineering, covering reactive UI component architecture, asynchronous REST API development, relational database indexing, and cloud container deployments."
    )

    add_h2("7.2 Learning Outcomes")
    add_p(
        "• Modern Component Engineering: Mastered React 19 hooks, client-side route protection, and responsive styling with Tailwind CSS.\n"
        "• Asynchronous API Architecture: Engineered high-speed RESTful services with Python FastAPI, Pydantic v2 schemas, and dependency injection.\n"
        "• Enterprise Security & Governance: Implemented cryptographic JWT authentication, Bcrypt salted hashing, and fine-grained RBAC database query isolation.\n"
        "• Database Concurrency & ORM: Configured SQLAlchemy 2.0 with SQLite WAL mode and relational cascading rules.\n"
        "• Continuous Deployment: Managed production deployments across Vercel edge networks and Render cloud containers."
    )

    add_h2("7.3 Future Scope")
    add_p(
        "• Live Video Conferencing & Proctoring: Direct integration of WebRTC video rooms and browser-based coding assessment proctoring sandboxes.\n"
        "• Automated SMTP & WhatsApp Alerts: Adding multi-channel notification relays for real-time mobile push and SMS notifications.\n"
        "• Placement Analytics & Statistics: Enhancing statistical reporting on placement percentages, domain trends, and salary packages across departments.\n"
        "• Alumni & Mentorship Network: Expanding coordinator capabilities to connect unplaced students with placed alumni for domain-specific mentoring."
    )

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 8: REFERENCES
    # ─────────────────────────────────────────────────────────────
    add_h1("8. REFERENCES")
    refs = [
        "[1] React Documentation, \"React 19 Release Notes and Documentation,\" React.dev, 2026. [Online]. Available: https://react.dev. Accessed: 21 Nov 2026.",
        "[2] FastAPI Documentation, \"FastAPI: High performance, easy to learn, fast to code, ready for production,\" tiangolo.com, 2026. [Online]. Available: https://fastapi.tiangolo.com. Accessed: 21 Nov 2026.",
        "[3] SQLAlchemy Authors, \"SQLAlchemy 2.0 Documentation,\" SQLAlchemy.org, 2025. [Online]. Available: https://docs.sqlalchemy.org. Accessed: 21 Nov 2026.",
        "[4] Tailwind Labs, \"Tailwind CSS Documentation (v4.0),\" tailwindcss.com, 2026. [Online]. Available: https://tailwindcss.com. Accessed: 21 Nov 2026.",
        "[5] M. Jones, J. Bradley, and N. Sakimura, \"JSON Web Token (JWT),\" RFC 7519, Internet Engineering Task Force (IETF), 2015. [Online]. Available: https://tools.ietf.org/html/rfc7519. Accessed: 21 Nov 2026.",
        "[6] National Institutional Ranking Framework (NIRF), \"Methodology for Ranking of Academic Institutions in India,\" Ministry of Education, Govt. of India, 2025. [Online]. Available: https://www.nirfindia.org. Accessed: 21 Nov 2026."
    ]
    for ref in refs:
        p = doc.add_paragraph()
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(ref)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(0, 0, 0)

    # ─────────────────────────────────────────────────────────────
    # CHAPTER 9: APPENDICES
    # ─────────────────────────────────────────────────────────────
    add_h1("9. APPENDICES")
    add_h2("Appendix A: Local Setup & Environment Runbook")
    add_code_block(
        "# 1. Backend Setup\n"
        "cd backend\n"
        "python -m venv venv\n"
        ".\\venv\\Scripts\\activate\n"
        "pip install -r requirements.txt\n"
        "python seed.py\n"
        "uvicorn app.main:app --reload --port 8000\n\n"
        "# 2. Frontend Setup\n"
        "cd frontend\n"
        "npm install\n"
        "npm run dev\n\n"
        "# 3. Environment Variables (.env.example)\n"
        "PROJECT_NAME=\"CareerBridge\"\n"
        "ENVIRONMENT=\"development\"\n"
        "SECRET_KEY=\"careerbridge_production_secret_key\"\n"
        "ALGORITHM=\"HS256\"\n"
        "DATABASE_URL=\"sqlite:///./careerbridge.db\"\n"
        "COLLEGE_DOMAIN=\"college.edu\"\n"
        "UPLOAD_DIR=\"./uploads\"\n"
        "ALLOWED_ORIGINS=\"http://localhost:5173,https://careerbridge-frontend.vercel.app\""
    )

    add_h2("Appendix B: Key API Endpoints & Curl Verification")
    add_p(
        "• Authenticate: POST /api/auth/login\n"
        "• Google SSO: POST /api/auth/google\n"
        "• Batch Eligibility: PATCH /api/tpo/batches/{year}/toggle\n"
        "• Drive Approval: PATCH /api/jobs/{job_id}/approve\n"
        "• One-Click FAQ Pin: POST /api/messages/threads/{id}/pin-faq\n"
        "• In-App Alerts: GET /api/notifications"
    )

    add_h2("Appendix C: Demo Video and Repository Links")
    add_p(
        "• GitHub Repository: https://github.com/RiteshPuchakayala00/CareerBridge\n"
        "• Live Demo Video: https://youtu.be/careerbridge-demo\n"
        "• Live Production URL: https://careerbridge-frontend.vercel.app"
    )

    output_path = r"c:\Users\aksha\OneDrive\Desktop\CareerBridge\CareerBridge_Project_Report.docx"
    doc.save(output_path)
    print(f"Xerox/B&W-optimized document successfully created at: {output_path}")

if __name__ == "__main__":
    create_document()
