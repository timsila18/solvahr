# Solva HR CV AI Rollout

## Recommended AI stack

- Primary model: `gpt-5.4-mini`
- Purpose: premium CV rewriting, ATS-friendly restructuring, stronger summaries, and cleaner achievement bullets
- Fallback: built-in Solva AI structured draft engine when `OPENAI_API_KEY` is not configured or the API is unavailable

## Why this model

`gpt-5.4-mini` is the best fit for the current Solva HR CV service because it gives stronger writing quality than the low-cost ultra-light models while still staying commercially affordable for CV packages priced in KES.

## Suggested starting budget

- Starter test budget: `$30`
- Comfortable refinement budget: `$50 - $100`
- Recommended first live top-up: `$50`

This gives enough room to test entry, mid, senior, and executive prompts with real sample CVs before turning live payments on.

## Internal estimated AI processing allowance per CV

These are conservative internal planning figures for the current workflow, not customer prices:

| Package | Internal AI allowance |
| --- | ---: |
| Entry Level | KES 5 |
| Middle-Level | KES 8 |
| Senior Management | KES 12 |
| CEO / Executive | KES 20 |

These estimates assume:

- one structured rewrite pass
- one strong JSON output
- optional single regeneration
- moderate candidate CV length

## Prompt architecture

The live flow now follows this pattern:

1. Candidate data capture
   - uploaded CV extraction or manual form data
2. Fallback structured draft
   - existing Solva rule-based engine builds a safe base model
3. Premium AI rewrite
   - OpenAI receives package, target role, job description, candidate data, and strict truthfulness rules
4. Safe merge
   - AI output is normalized into the Solva CV model
   - missing sections fall back to the structured draft
5. DOCX and PDF generation

## Safety rules enforced

- do not invent jobs
- do not invent qualifications
- do not invent dates or grades
- preserve factual information
- use review notes for weak or missing areas
- keep the result ATS-friendly and recruiter-readable

## Environment configuration

Set:

- `OPENAI_API_KEY`
- `OPENAI_CV_MODEL=gpt-5.4-mini`

If the key is missing, Solva HR continues to work using the structured fallback engine.

## Best next steps

1. add the real OpenAI API key in production
2. run 8 to 12 sample CVs across all package levels
3. compare outputs against the current structured draft
4. tighten prompts based on real recruiter expectations
5. then switch live payments on
