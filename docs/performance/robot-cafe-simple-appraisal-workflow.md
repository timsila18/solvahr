# Robot Cafe & Bistro Simple Appraisal Workflow

This is the **lightweight appraisal flow** recommended for Robot Cafe & Bistro before we wire the full feature into Solva HR.

The goal is to keep the process:

- simple for employees
- practical for supervisors
- decisive for the General Manager
- professional enough to produce one final appraisal document for the staff file

## Who Is Involved

Only three people are central to the process:

1. **Employee**
2. **Supervisor**
3. **General Manager**

That keeps the flow short and removes unnecessary corners.

## The Simple 5-Step Workflow

### 1. Appraisal Cycle Is Opened

HR or the GM opens the appraisal period and selects the staff members to be reviewed.

What gets set at this stage:

- appraisal period
- employee name
- supervisor
- role / department

### 2. Employee Self-Review

The employee answers only **three short questions**:

1. What went well during this period?
2. What challenges did you face?
3. What support or training would help you perform better?

This gives the employee a voice without making the form heavy.

### 3. Supervisor Review

The supervisor sees the employee's self-review, then rates only **five simple areas**:

1. Punctuality
2. Teamwork
3. Service / Quality of Work
4. Discipline / Reliability
5. Role Delivery / Job Knowledge

The supervisor also adds:

- strengths observed
- areas for improvement
- short recommendation

### 4. GM Final Review

The GM does not repeat the whole appraisal.

The GM only:

- reviews the employee and supervisor summary
- confirms the final outcome
- adds a short management remark
- confirms the next action

### 5. Employee Acknowledgement

The employee views the final result and acknowledges it in the system.

This keeps the appraisal complete without forcing a second round of long comments.

## Simple Rating Scale

Use one clear scale across the form:

- **1** = Needs Improvement
- **2** = Fair
- **3** = Good
- **4** = Very Good
- **5** = Excellent

## Final Outcome Options

The final outcome should stay simple and readable:

- Performing Well
- Stable / Good
- Training Needed
- Needs Improvement
- Promotion Potential
- Formal Follow-Up Required

## Final Downloadable Appraisal Form

At the end of the workflow, Solva HR should generate **one final appraisal PDF** showing the full story in one place:

1. Employee information
2. Appraisal period
3. Employee self-review
4. Supervisor ratings
5. Supervisor comments
6. GM final review
7. Final outcome
8. Agreed next action
9. Employee acknowledgement
10. Auto-generated sign-off blocks

## Auto-Generated Signatures

The final appraisal PDF should use the same signatory logic style already used in Solva HR HR letters.

That means the final document should auto-generate:

- **Employee acknowledgement sign-off**
- **Supervisor sign-off**
- **General Manager sign-off**

Each sign-off should include:

- name
- title
- system-generated signature mark
- date

## Why This Version Fits Robot Cafe

This workflow is right for Robot Cafe because it:

- works for front-of-house, kitchen, cleaning, cashier, and admin roles
- keeps the employee part very short
- lets the supervisor do the main operational assessment
- gives the GM a proper final decision point
- produces one clean final document for the employee file

## Recommended Next Build Step

Once this structure is approved, the system implementation should follow this exact order:

1. create the simplified appraisal form in Solva HR
2. wire the Employee -> Supervisor -> GM workflow
3. generate the final appraisal PDF automatically
4. apply tenant-aware signatories just like HR letters
