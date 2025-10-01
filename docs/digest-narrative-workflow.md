# Digest Narrative Workflow (CRO-267)

This document describes the two-AI digest workflow that generates warm, personalized narratives for recipients and detailed archival narratives for parents.

## Overview

The digest system now uses AI to create beautiful, cohesive narratives instead of simple lists of updates. This provides two distinct experiences:

1. **Recipient-Facing Narratives** - Warm, personalized emails/SMS/WhatsApp messages
2. **Parent-Facing Narratives** - Detailed, chronological stories suitable for printing or memory books

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Compile Digest Workflow                   │
└─────────────────────────────────────────────────────────────┘

1. Query Updates → Filter by date range, ready status
2. Query Recipients → Get active recipients with preferences
3. AI Curation → Determine which updates for each recipient
4. AI Narrative Generation → Two-step process:
   ├─ Parent Narrative: Full chronological story
   └─ Recipient Narratives: Personalized per relationship

┌─────────────────────────────────────────────────────────────┐
│                 AI Narrative Generation                      │
└─────────────────────────────────────────────────────────────┘

Parent AI (GPT-4o-mini):
├─ Input: All updates + child info + date range
├─ Output: {title, intro, narrative, closing, media_references}
└─ Purpose: Detailed archival story for parent

Recipient AI (GPT-4o-mini):
├─ Input: Recipient updates + preferences + relationship
├─ Output: {intro, narrative, closing, media_references}
└─ Purpose: Warm personalized message
```

## Two-AI Workflow

### 1. Parent-Facing AI (Print/Archival)

**Purpose**: Create detailed, chronological narrative for parents to keep, print, or turn into memory books.

**Input Schema**:
```json
{
  "child_name": "Liam",
  "date_range": {
    "start": "2025-09-01",
    "end": "2025-09-30"
  },
  "updates": [
    {
      "id": "u1",
      "timestamp": "2025-09-28T12:30Z",
      "type": "text",
      "content": "Liam took his first steps today!",
      "milestone": true
    },
    ...
  ]
}
```

**Output Schema**:
```json
{
  "title": "Liam's September Highlights",
  "intro": "This month was filled with incredible milestones...",
  "narrative": "On September 28th, Liam took his first steps...",
  "closing": "These precious moments are forever preserved...",
  "media_references": [
    {
      "id": "u2",
      "reference_text": "Photo of Liam taking his first steps",
      "url": "https://cdn.app/photo123.jpg",
      "type": "photo"
    }
  ]
}
```

**Characteristics**:
- **Detailed**: Includes all updates, fully described
- **Chronological**: Maintains timeline order
- **Print-Ready**: Suitable for physical books, PDFs
- **Celebratory**: Warm, family-focused tone
- **Archival**: Timeless, preservable format

---

### 2. Recipient-Facing AI (Email/SMS/WhatsApp)

**Purpose**: Create warm, personalized narratives tailored to each recipient's relationship and preferences.

**Input Schema**:
```json
{
  "recipient": {
    "name": "Grandma Alice",
    "relationship": "grandmother",
    "preferences": {
      "tone": "warm and simple"
    }
  },
  "updates": [
    {
      "id": "u1",
      "timestamp": "2025-09-28T12:30Z",
      "type": "text",
      "content": "Liam took his first steps today!",
      "milestone": true
    },
    ...
  ]
}
```

**Output Schema**:
```json
{
  "intro": "Hello Grandma Alice! Here's what Liam's been up to this week:",
  "narrative": "This week was full of excitement. Liam took his first steps on Tuesday...",
  "closing": "We can't wait to share more soon. Sending hugs from all of us!",
  "media_references": [
    {
      "id": "u2",
      "reference_text": "Here's a photo of Liam at the park.",
      "url": "https://cdn.app/photo123.jpg",
      "type": "photo"
    }
  ]
}
```

**Characteristics**:
- **Personalized**: Addresses recipient by name, relationship
- **Warm**: Emotional, engaging tone
- **Concise**: 2-4 paragraphs for email digestibility
- **Channel-Friendly**: Works for email, SMS, WhatsApp
- **Selective Media**: Only highlights most relevant photos/videos

---

## Database Schema

### Digest Table
```sql
CREATE TABLE digests (
  id UUID PRIMARY KEY,
  parent_id UUID NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  parent_narrative JSONB, -- CRO-267: Parent-facing narrative
  -- ... other fields
);
```

### Digest Updates Table
```sql
CREATE TABLE digest_updates (
  id UUID PRIMARY KEY,
  digest_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  narrative_data JSONB, -- CRO-267: Recipient-facing narrative
  -- ... other fields
);
```

---

## Implementation Details

### File Structure

```
supabase/functions/
├── _shared/
│   ├── digest-ai.ts              # AI narrative generation
│   └── digest-templates.ts       # Email/print template renderers
├── compile-digest/
│   └── index.ts                  # Main digest compilation (updated)
└── migrations/
    └── 20250101000000_add_digest_narratives.sql

src/lib/
├── types/digest.ts               # Type definitions (updated)
└── services/digestService.ts     # Frontend service (updated)
```

### Key Functions

**`generateRecipientDigestNarrative()`** ([digest-ai.ts](../../supabase/functions/_shared/digest-ai.ts))
- Takes recipient context and updates
- Calls GPT-4o-mini with personalization prompt
- Returns structured narrative JSON
- Includes fallback for AI failures

**`generateParentDigestNarrative()`** ([digest-ai.ts](../../supabase/functions/_shared/digest-ai.ts))
- Takes all updates, child name, date range
- Calls GPT-4o-mini with archival prompt
- Returns detailed chronological narrative
- Includes fallback for AI failures

**`renderRecipientDigestEmail()`** ([digest-templates.ts](../../supabase/functions/_shared/digest-templates.ts))
- Takes narrative + recipient data
- Returns beautiful HTML email
- Includes media section, CTAs, footer
- Mobile-responsive design

**`renderParentDigestPrint()`** ([digest-templates.ts](../../supabase/functions/_shared/digest-templates.ts))
- Takes parent narrative + child data
- Returns print-friendly HTML
- Clean serif typography
- Page break support for printing

---

## Cost Analysis

### OpenAI API Costs

**Model**: GPT-4o-mini (~$0.15 per 1M input tokens, $0.60 per 1M output tokens)

**Per Digest Compilation**:
- Parent narrative: ~500 input tokens, ~800 output tokens = **$0.00056**
- Recipient narratives (avg 5 recipients): 5 × (300 input + 400 output) = **$0.00135**
- **Total per digest: ~$0.002** (0.2 cents)

**Monthly Estimates** (for 1000 active users):
- Assume 2 digests/month per user
- 2,000 digests × $0.002 = **$4/month**

**With Rate Limiting** (max 50 recipients/digest):
- Even at max scale: $0.002 + (50 × $0.00027) = **$0.016 per digest**

---

## Prompt Engineering

### Parent Narrative Prompt

**System Message**:
```
You are a helpful assistant that compiles a full family digest for parents.
You receive a batch of updates about their child/family.
You must create a detailed, chronological narrative in JSON format suitable for print or archival.
Always be warm, emotionally engaging, and celebratory.
```

**User Message Template**:
```
Here are the updates for this digest:
{JSON_BATCH}

Return structured JSON with: title, intro, narrative, closing, media_references

Rules:
- Do not invent facts
- Maintain chronological order
- Use warm, emotionally engaging language
- Suitable for printing in family memory book
```

**Temperature**: 0.7 (creative but consistent)

---

### Recipient Narrative Prompt

**System Message**:
```
You are a helpful assistant that writes warm, emotional, and engaging family digest messages.
You receive updates about a child along with recipient preferences.
Always personalize for the recipient (e.g., grandparents get simple, loving phrasing).
```

**User Message Template**:
```
Updates for {recipient_name} ({relationship}):
{JSON_BATCH}

Return JSON with: intro, narrative, closing, media_references

Rules:
- Address recipient personally
- Use {tone} tone
- Reference media selectively
- Keep narrative {length}
```

**Temperature**: 0.7

---

## Testing

### Manual Test Script

```bash
# Test digest compilation with narratives
curl -X POST http://localhost:54321/functions/v1/compile-digest \
  -H "Content-Type: application/json" \
  -d '{
    "parent_id": "test-parent-id",
    "date_range_start": "2025-09-01",
    "date_range_end": "2025-09-30",
    "auto_approve": false
  }'
```

### Validation Checklist

- [ ] Parent narrative generated with all required fields
- [ ] Recipient narratives generated for each recipient
- [ ] Narratives stored in database correctly
- [ ] Media references include URLs and descriptions
- [ ] Email template renders narrative beautifully
- [ ] Print template suitable for physical printing
- [ ] Fallback narratives work when AI fails
- [ ] Cost stays within budget ($0.002/digest)

---

## Troubleshooting

### Narrative Not Generated

**Symptoms**: `narrative_data` or `parent_narrative` is null

**Causes**:
1. OpenAI API key not configured
2. Network error calling OpenAI
3. AI response invalid JSON
4. No updates in digest

**Solutions**:
1. Check `OPENAI_API_KEY` env variable
2. Check OpenAI API status
3. Review AI response in logs
4. Fallback narrative will be used

---

### Narrative Quality Issues

**Symptoms**: Generic or repetitive narratives

**Solutions**:
1. Adjust temperature (0.5-0.9 range)
2. Add more context to prompt (recipient preferences)
3. Use GPT-4o instead of GPT-4o-mini for higher quality
4. Add examples to system prompt (few-shot learning)

---

### Performance Issues

**Symptoms**: Digest compilation takes >30 seconds

**Causes**:
1. Too many recipients (>20)
2. Sequential AI calls blocking
3. Large update payloads

**Solutions**:
1. Parallelize recipient narrative generation
2. Truncate update content to 200 chars
3. Batch multiple recipients per AI call
4. Cache narratives (regenerate only on customization)

---

## Future Enhancements

### Phase 2 Features

1. **Tone Preferences**
   - Allow recipients to choose: formal, casual, emoji-heavy, etc.
   - Store in `digest_preferences` table

2. **Multi-Language Support**
   - Detect recipient language preference
   - Generate narratives in Spanish, French, etc.

3. **Voice Narratives**
   - Use text-to-speech for audio digests
   - Grandparents can listen instead of reading

4. **Regeneration**
   - "Regenerate with AI" button in UI
   - Parent can request different narrative style

5. **Analytics**
   - Track which narrative styles get best engagement
   - A/B test different prompt templates

---

## Related Documentation

- [Digest Types & Workflow](../database-design/digests.md)
- [AI Analysis System](./ai-analysis.md)
- [Email Templates](./email-templates.md)
- [Rate Limiting](./rate-limiting.md)

---

## References

- **Issue**: [CRO-267 - Digest Design](https://linear.app/tribe/issue/CRO-267)
- **Model**: GPT-4o-mini
- **Prompt Technique**: Structured JSON output with `response_format`
- **Cost**: ~$0.002 per digest compilation
