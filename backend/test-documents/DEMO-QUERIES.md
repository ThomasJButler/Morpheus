# Morpheus Demo Queries
## Test Queries for TechCorp Employee Handbook

Use these queries to demonstrate different RAG modes:

---

## Factual Queries (Simple RAG)

### Query 1: "Who is the CTO?"
**Expected Answer:**
> The CTO of TechCorp is Marcus Williams (marcus.w@techcorp.io), who has been with the company since 2015 (founding member).

### Query 2: "What is the PTO policy for employees with 2 years tenure?"
**Expected Answer:**
> Employees with 1-3 years of tenure receive 20 days of annual PTO, 7 sick days, and 3 personal days. PTO must be requested at least 2 weeks in advance and does not roll over.

### Query 3: "What is the company's mission?"
**Expected Answer:**
> TechCorp's mission is to democratize access to powerful technology tools that help businesses thrive in the digital age.

---

## Procedural Queries (Hybrid RAG)

### Query 4: "How do I submit an expense report?"
**Expected Answer:**
> To submit an expense report:
> 1. Collect all receipts and scan/photo within 24 hours
> 2. Log into Expensify at expensify.techcorp.io using SSO
> 3. Click "New Report" and select expense category
> 4. Upload receipts, enter amounts, dates, and business purpose
> 5. Submit for manager approval
> 6. Reimbursement arrives within 5 business days

### Query 5: "Walk me through the first day of onboarding"
**Expected Answer:**
> Day 1 onboarding steps:
> 1. Arrive at 9:00 AM, check in at reception
> 2. Meet your onboarding buddy
> 3. Collect laptop, badge, and welcome kit from IT (Room 204)
> 4. Complete mandatory security training (2 hours)
> 5. Set up your workstation with IT support
> 6. Attend New Hire Welcome Lunch at 12:30 PM
> 7. Complete benefits enrollment with HR by 4:00 PM

### Query 6: "What training do I need to complete as a new hire?"
**Expected Answer:**
> Within 30 days, all new employees must complete:
> - Security Awareness Training (mandatory, 3 hours)
> - Code of Conduct Review (mandatory, 1 hour)
> - Diversity & Inclusion Workshop (mandatory, 2 hours)
> - Product Overview Session (recommended, 1.5 hours)
> - Engineering Practices Deep Dive (for engineers, 4 hours)

---

## Comparative Queries (Hybrid/Agentic RAG)

### Query 7: "Compare the health insurance plans"
**Expected Answer:**
> TechCorp offers three health plans:
>
> **Bronze Plan** - $150/mo individual, $3,000 deductible, 70% coverage
> Best for: Young, healthy employees with minimal needs
>
> **Silver Plan** - $275/mo individual, $1,500 deductible, 80% coverage
> Includes dental/vision basics
> Best for: Moderate healthcare needs
>
> **Gold Plan** - $425/mo individual, $500 deductible, 90% coverage
> Full dental, vision, mental health, HSA eligible with $1,000 company contribution
> Best for: Families or ongoing healthcare needs

### Query 8: "What are the differences between the performance ratings?"
**Expected Answer:**
> Performance ratings 1-5:
> - **5 (Exceptional)**: Consistently exceeds all expectations → 8-12% raise
> - **4 (Exceeds)**: Often exceeds expectations → 5-8% raise
> - **3 (Meets)**: Consistently meets expectations → 2-4% raise
> - **2 (Developing)**: Sometimes meets expectations → 0-2% raise
> - **1 (Below)**: Does not meet expectations → PIP required

---

## Complex/Multi-Part Queries (Agentic RAG)

### Query 9: "What are all the security requirements for working remotely?"
**Expected Answer:**
> Remote work security requirements span three areas:
>
> **Physical Security:**
> - Work in a private space
> - Lock computer when away (Cmd+L/Win+L)
> - Never leave laptop visible in vehicles
> - Use privacy screens in public
>
> **Network Security:**
> - Always use company VPN (GlobalProtect)
> - Never use public WiFi without VPN
> - Keep home router firmware updated
> - Use WPA3 encryption (WPA2 minimum)
>
> **Data Handling:**
> - No sensitive data on local drives
> - Encrypt external drives with FileVault/BitLocker
> - Delete sensitive files from Downloads
> - Report suspected breaches within 1 hour to security@techcorp.io

### Query 10: "Explain the entire performance review process"
**Expected Answer:**
> The performance review process runs twice yearly:
>
> **Mid-Year (June):**
> - Self-assessment due May 15
> - Peer feedback May 15-31
> - Manager meetings June 1-15
> - Final ratings by June 30
>
> **Annual (December):**
> - Self-assessment due November 15
> - Peer feedback Nov 15-30
> - Manager meetings Dec 1-15
> - Compensation adjustments effective Jan 1
>
> **Evaluation Criteria:**
> - Impact & Results (40%)
> - Technical/Role Skills (25%)
> - Collaboration (20%)
> - Cultural Values (15%)

---

## Edge Case Queries

### Query 11: "What expenses need pre-approval?"
**Expected Answer:**
> Pre-approval required for:
> - Any single expense over $1,000
> - International travel
> - Conference attendance
> - Equipment for new hires
> - Recurring subscriptions

### Query 12: "How do I report harassment?"
**Expected Answer:**
> Report harassment incidents to HR (hr@techcorp.io) or use the anonymous ethics hotline: 1-888-TECHCORP. TechCorp has zero-tolerance for harassment including sexual harassment, discrimination, bullying, and retaliation.

---

## Tips for Demo

1. **Start simple**: "Who is the CEO?" (Factual → Simple RAG)
2. **Show procedural**: "How do I submit expenses?" (Procedural → Hybrid)
3. **Demo comparison**: "Compare health plans" (Comparative → Hybrid/Agentic)
4. **Complex query**: "Security requirements for remote work" (Multi-part → Agentic)
5. **Watch RAG mode selection**: The system should auto-select appropriate modes!
