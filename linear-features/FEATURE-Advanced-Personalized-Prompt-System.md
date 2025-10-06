# Advanced Personalized Prompt System

## Overview

Enhance the simple prompt suggestion system with intelligent, context-aware personalization based on user demographics, child age, recipient relationships, time of day, and seasonal relevance—all without requiring AI API calls.

## Problem Statement

The current simple prompt system uses weighted random selection from a flat table. While this eliminates AI costs, it doesn't leverage user-specific context to provide truly relevant suggestions that increase engagement and update creation rates.

## Goals

1. **Zero AI Cost**: Maintain database-only approach with no LLM API calls
2. **Sub-10ms Performance**: Single indexed database query
3. **High Personalization**: Match prompts to user demographics and context
4. **Easy Management**: Simple CRUD interface for content team
5. **Data-Driven Optimization**: Track engagement metrics for continuous improvement
6. **Scalable**: Support future ML-based weighting without API changes

## Technical Design

### Database Schema

```sql
CREATE TABLE prompt_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prompt_text VARCHAR NOT NULL,
  category VARCHAR NOT NULL,  -- 'Daily Moments', 'Milestones', 'Memories', etc.

  -- Targeting criteria (all optional - NULL means "any")
  child_age_min_months INTEGER,  -- e.g., 0 for newborns
  child_age_max_months INTEGER,  -- e.g., 12 for first year
  milestone_types VARCHAR[],     -- ['first_words', 'first_steps'] etc.
  relationships VARCHAR[],       -- Target if user has these recipient types

  -- Timing and rotation
  is_seasonal BOOLEAN DEFAULT false,
  seasonal_months INTEGER[],    -- [12, 1, 2] for winter
  time_of_day VARCHAR,          -- 'morning', 'afternoon', 'evening'

  -- Engagement tracking
  display_weight INTEGER DEFAULT 100,  -- Higher = more likely to show
  times_shown INTEGER DEFAULT 0,
  times_clicked INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prompt_suggestions_age ON prompt_suggestions(child_age_min_months, child_age_max_months);
CREATE INDEX idx_prompt_suggestions_active ON prompt_suggestions(is_active) WHERE is_active = true;
CREATE INDEX idx_prompt_suggestions_seasonal ON prompt_suggestions(is_seasonal, seasonal_months);
```

### Selection Function

```sql
CREATE OR REPLACE FUNCTION get_personalized_prompt_suggestion(user_id UUID)
RETURNS TABLE (
  id UUID,
  prompt_text VARCHAR,
  category VARCHAR
) AS $$
DECLARE
  child_age_months INTEGER;
  user_relationships VARCHAR[];
  current_month INTEGER;
  current_hour INTEGER;
BEGIN
  -- Get youngest child's age in months (most active age)
  SELECT EXTRACT(YEAR FROM AGE(birth_date)) * 12 +
         EXTRACT(MONTH FROM AGE(birth_date))
  INTO child_age_months
  FROM children
  WHERE parent_id = user_id
  ORDER BY birth_date DESC
  LIMIT 1;

  -- Get unique relationships from active recipients
  SELECT ARRAY_AGG(DISTINCT relationship)
  INTO user_relationships
  FROM recipients
  WHERE parent_id = user_id AND is_active = true;

  current_month := EXTRACT(MONTH FROM NOW());
  current_hour := EXTRACT(HOUR FROM NOW());

  -- Return single weighted random prompt matching all criteria
  RETURN QUERY
  SELECT
    ps.id,
    ps.prompt_text,
    ps.category
  FROM prompt_suggestions ps
  WHERE ps.is_active = true
    -- Age filtering
    AND (ps.child_age_min_months IS NULL OR child_age_months >= ps.child_age_min_months)
    AND (ps.child_age_max_months IS NULL OR child_age_months <= ps.child_age_max_months)
    -- Relationship filtering
    AND (ps.relationships IS NULL OR ps.relationships && user_relationships)
    -- Seasonal filtering
    AND (ps.is_seasonal = false OR current_month = ANY(ps.seasonal_months))
    -- Time of day filtering
    AND (ps.time_of_day IS NULL OR
         (ps.time_of_day = 'morning' AND current_hour BETWEEN 6 AND 11) OR
         (ps.time_of_day = 'afternoon' AND current_hour BETWEEN 12 AND 17) OR
         (ps.time_of_day = 'evening' AND current_hour BETWEEN 18 AND 22))
  ORDER BY
    -- Weighted random selection (higher weight = more likely)
    random() * ps.display_weight DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
```

## Example Seed Data

```sql
-- General prompts (always applicable)
INSERT INTO prompt_suggestions (prompt_text, category, display_weight) VALUES
('Share what made you smile today', 'Daily Moments', 100),
('Capture a funny moment or quote', 'Memories', 80),
('What new thing did they try today?', 'Daily Moments', 90);

-- Age-specific prompts (newborn)
INSERT INTO prompt_suggestions (prompt_text, category, child_age_min_months, child_age_max_months, display_weight) VALUES
('Record their first sounds and coos', 'Milestones', 0, 3, 120),
('Share a sweet sleeping moment', 'Daily Moments', 0, 6, 110),
('Document their grip reflex', 'Milestones', 0, 2, 100);

-- Age-specific prompts (infant)
INSERT INTO prompt_suggestions (prompt_text, category, child_age_min_months, child_age_max_months, display_weight) VALUES
('Document their rolling over progress', 'Milestones', 3, 6, 120),
('Share their reaction to new foods', 'Daily Moments', 4, 8, 110),
('Capture their first giggles', 'Memories', 2, 6, 130);

-- Age-specific prompts (toddler)
INSERT INTO prompt_suggestions (prompt_text, category, child_age_min_months, child_age_max_months, display_weight) VALUES
('Share their first words journey', 'Milestones', 8, 18, 150),
('How are they exploring walking?', 'Milestones', 10, 18, 140),
('Capture their curiosity moment', 'Daily Moments', 12, 36, 120);

-- Seasonal prompts
INSERT INTO prompt_suggestions (prompt_text, category, is_seasonal, seasonal_months, display_weight) VALUES
('Capture their holiday excitement', 'Memories', true, ARRAY[12, 1], 150),
('Share their reaction to snow/decorations', 'Memories', true, ARRAY[12, 1, 2], 140),
('Document summer outdoor adventures', 'Daily Moments', true, ARRAY[6, 7, 8], 120),
('Share their Halloween costume', 'Memories', true, ARRAY[10], 180),
('Capture their birthday celebration', 'Milestones', false, NULL, 200); -- Birthday detection could be added

-- Time-of-day prompts
INSERT INTO prompt_suggestions (prompt_text, category, time_of_day, display_weight) VALUES
('Share their morning routine highlights', 'Daily Moments', 'morning', 100),
('Capture an afternoon adventure', 'Daily Moments', 'afternoon', 100),
('What bedtime moment warmed your heart?', 'Memories', 'evening', 110),
('Document their naptime sweetness', 'Memories', 'afternoon', 90);

-- Relationship-aware prompts
INSERT INTO prompt_suggestions (prompt_text, category, relationships, display_weight) VALUES
('Share a moment grandparents would love', 'Memories', ARRAY['grandparent'], 130),
('Capture a sibling interaction', 'Memories', ARRAY['sibling'], 120),
('Document a friend playdate highlight', 'Daily Moments', ARRAY['friend'], 100);

-- Milestone-type specific
INSERT INTO prompt_suggestions (prompt_text, category, milestone_types, display_weight) VALUES
('Celebrate their first steps!', 'Milestones', ARRAY['first_steps', 'walking'], 200),
('Record their first words', 'Milestones', ARRAY['first_words'], 180),
('Share their potty training progress', 'Milestones', ARRAY['potty_training'], 150);
```

## Analytics & Optimization

### View for Engagement Metrics

```sql
CREATE OR REPLACE VIEW prompt_analytics AS
SELECT
  id,
  prompt_text,
  category,
  child_age_min_months,
  child_age_max_months,
  relationships,
  is_seasonal,
  seasonal_months,
  time_of_day,
  display_weight,
  times_shown,
  times_clicked,
  CASE
    WHEN times_shown > 0 THEN ROUND((times_clicked::NUMERIC / times_shown::NUMERIC) * 100, 2)
    ELSE 0
  END as click_through_rate,
  is_active,
  created_at,
  updated_at
FROM prompt_suggestions
ORDER BY times_shown DESC;
```

### Auto-Weighting Function (Future Enhancement)

```sql
-- Automatically adjust display_weight based on CTR
CREATE OR REPLACE FUNCTION auto_adjust_prompt_weights()
RETURNS VOID AS $$
BEGIN
  UPDATE prompt_suggestions
  SET display_weight = CASE
    -- High performers (CTR > 15%) - increase weight
    WHEN times_shown > 50 AND (times_clicked::FLOAT / times_shown::FLOAT) > 0.15
      THEN LEAST(display_weight * 1.2, 200)
    -- Low performers (CTR < 5%) - decrease weight
    WHEN times_shown > 50 AND (times_clicked::FLOAT / times_shown::FLOAT) < 0.05
      THEN GREATEST(display_weight * 0.8, 30)
    ELSE display_weight
  END,
  updated_at = NOW()
  WHERE is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Schedule to run weekly via pg_cron or external scheduler
```

## Frontend Integration

### Updated Service Layer

```typescript
// lib/prompts.ts
export async function getPersonalizedPrompt(): Promise<PromptSuggestion | null> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .rpc('get_personalized_prompt_suggestion', { user_id: user.id })
    .single();

  if (error) {
    console.error('Error fetching personalized prompt:', error);
    // Fallback to simple random prompt
    return getRandomPromptSuggestion();
  }

  return data;
}
```

### Component Integration

```typescript
// Component remains the same, just swap function call
const loadSuggestion = async () => {
  try {
    setLoading(true);
    const data = await getPersonalizedPrompt(); // Changed from getRandomPromptSuggestion

    if (data) {
      const mappedSuggestion: AIPromptSuggestion = {
        id: data.id,
        prompt: data.prompt_text,
        category: data.category,
      };
      setSuggestion(mappedSuggestion);
      await trackPromptShown(data.id);
    }
  } catch (error) {
    console.error('Error loading prompt suggestion:', error);
  } finally {
    setLoading(false);
  }
};
```

## Content Management Interface

### Admin Dashboard Features

1. **Prompt Library**
   - CRUD operations for prompts
   - Bulk import/export via CSV
   - Preview targeting criteria

2. **Analytics Dashboard**
   - Sort by CTR, impressions, clicks
   - Filter by category, age range, season
   - A/B test comparison

3. **Quick Actions**
   - Clone high-performing prompts
   - Bulk activate/deactivate
   - Auto-weight adjustment toggle

### Suggested Supabase Dashboard Queries

```sql
-- Top performing prompts
SELECT * FROM prompt_analytics
WHERE times_shown > 20
ORDER BY click_through_rate DESC
LIMIT 20;

-- Underperforming prompts
SELECT * FROM prompt_analytics
WHERE times_shown > 50 AND click_through_rate < 5
ORDER BY times_shown DESC;

-- Seasonal prompt prep
SELECT * FROM prompt_suggestions
WHERE is_seasonal = true
  AND EXTRACT(MONTH FROM NOW()) = ANY(seasonal_months);
```

## Implementation Phases

### Phase 1: Database Migration (1 day)
- [ ] Create prompt_suggestions table with advanced fields
- [ ] Create get_personalized_prompt_suggestion() function
- [ ] Seed with 50-100 diverse prompts
- [ ] Create analytics view
- [ ] Add indexes

### Phase 2: Backend Integration (0.5 days)
- [ ] Update lib/prompts.ts with personalized function
- [ ] Add user context to query
- [ ] Test edge cases (no children, no recipients)

### Phase 3: Frontend Updates (0.5 days)
- [ ] Swap API call in component
- [ ] Test loading/error states
- [ ] Verify tracking still works

### Phase 4: Content Seeding (1 day)
- [ ] Research age-appropriate prompts
- [ ] Write 20+ prompts per age bracket
- [ ] Add seasonal variations
- [ ] Create relationship-specific prompts

### Phase 5: Analytics Setup (0.5 days)
- [ ] Build basic analytics dashboard view
- [ ] Create Supabase saved queries
- [ ] Document CTR benchmarks

### Phase 6: Optimization (Ongoing)
- [ ] Monitor CTR by segment
- [ ] A/B test prompt variations
- [ ] Adjust weights based on performance
- [ ] Add new categories based on user feedback

## Success Metrics

### Primary KPIs
- **Prompt Click-Through Rate**: Target 20%+ (vs ~10% baseline)
- **Update Creation Rate**: Increase by 30% from baseline
- **User Engagement**: Higher DAU/MAU ratio

### Secondary Metrics
- **Prompt Diversity**: No single prompt >20% of impressions
- **Personalization Accuracy**: Age-appropriate prompts >90%
- **Query Performance**: p95 latency <10ms

## Future Enhancements

1. **Birthday Detection**: Boost birthday-related prompts on/near child's birthday
2. **Recency Filtering**: Don't show same prompt within 7 days
3. **Multi-Child Support**: Rotate prompts across all children
4. **Activity-Based**: Suggest based on recent update patterns
5. **ML Weighting**: Train simple model on user CTR history
6. **Localization**: Support multiple languages/cultures
7. **User Preferences**: Allow users to favorite/hide categories

## Rollback Plan

If advanced personalization causes performance issues:
1. Add circuit breaker to fallback to simple random
2. Add query timeout (100ms max)
3. Revert to simple get_random_prompt_suggestion()
4. Schema remains backward compatible

## Resources Required

- **Engineering**: 3-4 days total implementation
- **Content**: 1-2 days for initial prompt seeding
- **QA**: 1 day for testing across demographics
- **Total**: ~1 week for full rollout

## Dependencies

- ✅ Simple prompt system already implemented
- ✅ User authentication system
- ✅ Children table with birth_date
- ✅ Recipients table with relationships
- ⚠️ May need onboarding_completed flag to avoid showing before setup

## Open Questions

1. Should we show generic prompts if no personalization matches?
2. How often should auto-weight adjustment run?
3. Should we A/B test personalized vs random for a cohort?
4. Do we need prompt expiration dates?
5. Should prompts rotate within a session or stay fixed?

---

**Estimated ROI**: 30% increase in update creation × $0 marginal cost = High value, low risk enhancement
