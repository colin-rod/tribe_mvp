-- Template-Based AI Prompt Generation System Migration
-- Migration: 20250924000001_template_system.sql
-- Description: Implements template-based AI prompt system with 90% cost reduction

-- =============================================================================
-- PROMPT TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_type VARCHAR NOT NULL CHECK (prompt_type IN ('milestone', 'activity', 'fun', 'seasonal')),
  template_text TEXT NOT NULL, -- e.g., "Capture [child_name]'s reaction to [activity]!"
  age_range_min INTEGER, -- minimum age in months
  age_range_max INTEGER, -- maximum age in months
  category VARCHAR, -- 'newborn', 'infant', 'toddler', 'preschool', 'all_ages'
  tags VARCHAR[],
  variables JSONB NOT NULL DEFAULT '[]'::jsonb, -- Define what variables can be substituted
  usage_count INTEGER DEFAULT 0,
  effectiveness_score DECIMAL DEFAULT 0,
  is_community_contributed BOOLEAN DEFAULT false,
  community_prompt_id UUID, -- References community prompts if applicable
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for prompt_templates
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prompt_templates
DROP POLICY IF EXISTS "Templates are viewable by all authenticated users" ON prompt_templates;
CREATE POLICY "Templates are viewable by all authenticated users" ON prompt_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can manage templates" ON prompt_templates;
CREATE POLICY "Only admins can manage templates" ON prompt_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@tribe-mvp.com'
    )
  );

-- =============================================================================
-- UPDATE AI_PROMPTS TABLE FOR TEMPLATE SYSTEM
-- =============================================================================

-- Add template-related columns to existing ai_prompts table
ALTER TABLE ai_prompts ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES prompt_templates(id);
ALTER TABLE ai_prompts ADD COLUMN IF NOT EXISTS substituted_variables JSONB DEFAULT '{}'::jsonb;

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Indexes for prompt_templates
CREATE INDEX IF NOT EXISTS idx_prompt_templates_type_age ON prompt_templates(prompt_type, age_range_min, age_range_max);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_community ON prompt_templates(is_community_contributed, community_prompt_id) WHERE is_community_contributed = true;
CREATE INDEX IF NOT EXISTS idx_prompt_templates_effectiveness ON prompt_templates(effectiveness_score DESC);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_usage ON prompt_templates(usage_count);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_created_at ON prompt_templates(created_at DESC);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_prompt_templates_variables ON prompt_templates USING GIN (variables);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_tags ON prompt_templates USING GIN (tags);

-- New index for ai_prompts template relationship
CREATE INDEX IF NOT EXISTS idx_ai_prompts_template ON ai_prompts(template_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompts_substituted_vars ON ai_prompts USING GIN (substituted_variables);

-- =============================================================================
-- TEMPLATE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Function to increment template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE prompt_templates
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = template_uuid;
END;
$$;

-- Function to update template effectiveness score
CREATE OR REPLACE FUNCTION update_template_effectiveness(
    template_uuid UUID,
    new_score DECIMAL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE prompt_templates
    SET effectiveness_score = new_score,
        updated_at = NOW()
    WHERE id = template_uuid;
END;
$$;

-- Function to get templates by filters
CREATE OR REPLACE FUNCTION get_templates_by_filters(
    age_months INTEGER DEFAULT NULL,
    enabled_types VARCHAR[] DEFAULT NULL,
    exclude_template_ids UUID[] DEFAULT NULL,
    limit_count INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    prompt_type VARCHAR,
    template_text TEXT,
    age_range_min INTEGER,
    age_range_max INTEGER,
    category VARCHAR,
    tags VARCHAR[],
    variables JSONB,
    usage_count INTEGER,
    effectiveness_score DECIMAL,
    is_community_contributed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.prompt_type,
        t.template_text,
        t.age_range_min,
        t.age_range_max,
        t.category,
        t.tags,
        t.variables,
        t.usage_count,
        t.effectiveness_score,
        t.is_community_contributed
    FROM prompt_templates t
    WHERE
        -- Age range filter
        (age_months IS NULL OR
         (t.age_range_min IS NULL OR age_months >= t.age_range_min) AND
         (t.age_range_max IS NULL OR age_months <= t.age_range_max))

        -- Prompt type filter
        AND (enabled_types IS NULL OR t.prompt_type = ANY(enabled_types))

        -- Exclusion filter
        AND (exclude_template_ids IS NULL OR t.id != ALL(exclude_template_ids))

    ORDER BY t.effectiveness_score DESC, t.created_at DESC
    LIMIT limit_count;
END;
$$;

-- Function to get recent template IDs for a child (to avoid repetition)
CREATE OR REPLACE FUNCTION get_recent_template_ids(
    child_uuid UUID,
    days_back INTEGER DEFAULT 7
)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT template_id) INTO template_ids
    FROM ai_prompts
    WHERE child_id = child_uuid
      AND template_id IS NOT NULL
      AND created_at >= NOW() - INTERVAL '1 day' * days_back;

    RETURN COALESCE(template_ids, ARRAY[]::UUID[]);
END;
$$;

-- =============================================================================
-- SEED DATA - CURATED PROMPT TEMPLATES
-- =============================================================================

-- Fun templates
INSERT INTO prompt_templates (prompt_type, template_text, age_range_min, age_range_max, category, variables, effectiveness_score) VALUES
('fun', 'Funny Face Friday! Capture [child_name]''s silliest expression!', 3, 36, 'all_ages', '["child_name"]'::jsonb, 8.5),
('fun', 'Costume time! Dress [child_name] up as their favorite animal!', 6, 60, 'toddler', '["child_name"]'::jsonb, 9.2),
('fun', 'Messy [meal_time]! Share that adorable food-covered face from [child_name]!', 4, 24, 'infant', '["meal_time", "child_name"]'::jsonb, 8.8),
('fun', 'Dance party with [child_name]! What''s their favorite song right now?', 8, 36, 'toddler', '["child_name"]'::jsonb, 9.0),
('fun', '[child_name]''s bath time adventures! Any splashing or bubble fun today?', 2, 24, 'infant', '["child_name"]'::jsonb, 8.2),
('fun', 'Peek-a-boo with [child_name]! Their reaction is always priceless!', 3, 18, 'infant', '["child_name"]'::jsonb, 8.7),
('fun', '[child_name] meets their reflection! How did they react to the mirror?', 4, 12, 'infant', '["child_name"]'::jsonb, 8.1),
('fun', 'Story time with [child_name]! What''s their favorite book this week?', 6, 36, 'all_ages', '["child_name"]'::jsonb, 8.9),

-- Milestone templates
('milestone', 'Time for [child_name]''s [age_months]-month milestones! Any new developments?', 1, 24, 'all_ages', '["child_name", "age_months"]'::jsonb, 9.5),
('milestone', 'Has [child_name] started [milestone_activity] yet? Perfect time to capture those first attempts!', 6, 18, 'infant', '["child_name", "milestone_activity"]'::jsonb, 9.3),
('milestone', 'Is [child_name] saying any new words? Their vocabulary is growing so fast at [age_months] months!', 8, 24, 'toddler', '["child_name", "age_months"]'::jsonb, 9.4),
('milestone', 'How is [child_name] doing with [age_appropriate_skill]? Every baby develops at their own pace!', 0, 60, 'all_ages', '["child_name", "age_appropriate_skill"]'::jsonb, 9.1),
('milestone', '[child_name]''s first solid foods adventure! How did [meal_time] go today?', 4, 8, 'infant', '["child_name", "meal_time"]'::jsonb, 9.0),
('milestone', 'Rolling over milestone! Has [child_name] been practicing their moves?', 4, 7, 'infant', '["child_name"]'::jsonb, 8.9),
('milestone', 'Sitting up practice! How is [child_name] doing with independent sitting?', 5, 9, 'infant', '["child_name"]'::jsonb, 8.8),
('milestone', 'First steps watch! Any signs [child_name] is ready to walk?', 9, 15, 'toddler', '["child_name"]'::jsonb, 9.6),

-- Activity templates
('activity', 'It''s been [days_since_update] days since your last update about [child_name]. What''s new?', 0, 60, 'all_ages', '["days_since_update", "child_name"]'::jsonb, 8.3),
('activity', 'Weekly check-in: What made you smile about [child_name] this week?', 0, 60, 'all_ages', '["child_name"]'::jsonb, 8.6),
('activity', '[child_name] must be keeping you busy! Share a quick moment from today.', 0, 60, 'all_ages', '["child_name"]'::jsonb, 8.1),
('activity', 'What''s [child_name]''s favorite [activity_type] lately?', 3, 60, 'all_ages', '["child_name", "activity_type"]'::jsonb, 8.4),
('activity', 'Tummy time with [child_name]! How are they handling their daily practice?', 0, 6, 'newborn', '["child_name"]'::jsonb, 8.7),
('activity', '[child_name]''s nap schedule update! How are the sleep routines going?', 0, 24, 'all_ages', '["child_name"]'::jsonb, 8.0),
('activity', 'Playtime highlights! What''s [child_name]''s current favorite toy or game?', 3, 60, 'all_ages', '["child_name"]'::jsonb, 8.5),
('activity', '[child_name]''s daily routine check-in! Any new patterns or changes?', 0, 60, 'all_ages', '["child_name"]'::jsonb, 7.9),

-- Seasonal templates
('seasonal', '[season] has arrived! Perfect time for outdoor photos with [child_name]!', 0, 60, 'all_ages', '["season", "child_name"]'::jsonb, 8.2),
('seasonal', 'Happy [holiday]! How is [child_name] celebrating?', 0, 60, 'all_ages', '["holiday", "child_name"]'::jsonb, 9.1),
('seasonal', '[weather_activity] weather is perfect for [child_name] to [outdoor_activity]!', 6, 60, 'all_ages', '["weather_activity", "child_name", "outdoor_activity"]'::jsonb, 8.4),
('seasonal', 'It''s [holiday] season! Time to start planning [child_name]''s [holiday_activity]!', 0, 60, 'all_ages', '["holiday", "child_name", "holiday_activity"]'::jsonb, 8.6),
('seasonal', 'First snow with [child_name]! How did they react to the winter wonderland?', 6, 60, 'all_ages', '["child_name"]'::jsonb, 8.9),
('seasonal', 'Spring flowers and [child_name]! Perfect season for outdoor exploration.', 3, 60, 'all_ages', '["child_name"]'::jsonb, 8.1),
('seasonal', 'Summer fun with [child_name]! Any plans for [outdoor_activity] this [day_of_week]?', 0, 60, 'all_ages', '["child_name", "outdoor_activity", "day_of_week"]'::jsonb, 8.3),
('seasonal', 'Fall colors and [child_name]! Great time for family photos in nature.', 0, 60, 'all_ages', '["child_name"]'::jsonb, 8.5),

-- Additional milestone-specific templates
('milestone', 'Crawling adventures begin! Is [child_name] starting to explore on all fours?', 7, 11, 'infant', '["child_name"]'::jsonb, 9.2),
('milestone', 'First tooth alert! Any signs of teething with [child_name]?', 4, 12, 'infant', '["child_name"]'::jsonb, 8.8),
('milestone', '[child_name]''s social smiles! How are they responding to your interactions?', 1, 4, 'newborn', '["child_name"]'::jsonb, 9.0),
('milestone', 'Hand coordination! How is [child_name] doing with grasping and holding objects?', 3, 8, 'infant', '["child_name"]'::jsonb, 8.6),

-- Additional fun templates
('fun', '[child_name]''s favorite faces! What expressions are they making today?', 2, 12, 'infant', '["child_name"]'::jsonb, 8.3),
('fun', 'Toy exploration time! What''s capturing [child_name]''s attention right now?', 3, 24, 'infant', '["child_name"]'::jsonb, 8.4),
('fun', '[child_name] and their stuffed animals! Any special friendships forming?', 6, 36, 'toddler', '["child_name"]'::jsonb, 8.7),
('fun', 'Musical moments! How does [child_name] react to different songs or sounds?', 0, 24, 'all_ages', '["child_name"]'::jsonb, 8.5),

-- Additional activity templates
('activity', '[child_name]''s growth spurts! Any changes in eating or sleeping patterns?', 0, 24, 'all_ages', '["child_name"]'::jsonb, 8.2),
('activity', 'Learning moments with [child_name]! What new skills are they working on?', 6, 60, 'all_ages', '["child_name"]'::jsonb, 8.6),
('activity', '[child_name]''s personality shining! What character traits are you noticing?', 3, 60, 'all_ages', '["child_name"]'::jsonb, 8.8),
('activity', 'Bonding time highlights! What''s your favorite moment with [child_name] today?', 0, 60, 'all_ages', '["child_name"]'::jsonb, 8.9);

-- =============================================================================
-- TEMPLATE EFFECTIVENESS TRACKING
-- =============================================================================

-- Table to track template performance metrics
CREATE TABLE IF NOT EXISTS template_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES prompt_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prompt_id UUID REFERENCES ai_prompts(id) ON DELETE CASCADE,

  -- Performance metrics
  action_taken BOOLEAN DEFAULT false, -- Did user act on the prompt?
  action_type VARCHAR, -- 'created_update', 'dismissed', 'ignored'
  time_to_action INTERVAL, -- How long between prompt and action
  engagement_score INTEGER CHECK (engagement_score >= 1 AND engagement_score <= 10),

  -- Context when used
  child_age_months INTEGER,
  day_of_week VARCHAR,
  time_of_day VARCHAR,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for template_analytics
ALTER TABLE template_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for template_analytics
DROP POLICY IF EXISTS "Users can view their own template analytics" ON template_analytics;
CREATE POLICY "Users can view their own template analytics" ON template_analytics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert template analytics" ON template_analytics;
CREATE POLICY "System can insert template analytics" ON template_analytics
  FOR INSERT WITH CHECK (true); -- Allow system to track analytics

-- Indexes for template_analytics
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_id ON template_analytics(template_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_user_id ON template_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_template_analytics_action_taken ON template_analytics(action_taken);
CREATE INDEX IF NOT EXISTS idx_template_analytics_created_at ON template_analytics(created_at DESC);

-- =============================================================================
-- COMMUNITY PROMPT INTEGRATION FUNCTIONS
-- =============================================================================

-- Function to create template from community prompt
CREATE OR REPLACE FUNCTION create_template_from_community_prompt(
    community_prompt_id_param UUID,
    template_text_param TEXT,
    prompt_type_param VARCHAR,
    age_min INTEGER DEFAULT NULL,
    age_max INTEGER DEFAULT NULL,
    variables_param JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_template_id UUID;
    community_author UUID;
BEGIN
    -- Get the community prompt author
    -- Note: This would reference a community_prompts table when implemented

    INSERT INTO prompt_templates (
        prompt_type,
        template_text,
        age_range_min,
        age_range_max,
        variables,
        is_community_contributed,
        community_prompt_id,
        effectiveness_score
    ) VALUES (
        prompt_type_param,
        template_text_param,
        age_min,
        age_max,
        variables_param,
        true,
        community_prompt_id_param,
        7.0 -- Default score for community templates
    )
    RETURNING id INTO new_template_id;

    RETURN new_template_id;
END;
$$;

-- =============================================================================
-- MAINTENANCE FUNCTIONS
-- =============================================================================

-- Function to recalculate template effectiveness scores
CREATE OR REPLACE FUNCTION recalculate_template_effectiveness()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE prompt_templates
    SET effectiveness_score = (
        SELECT COALESCE(AVG(
            CASE
                WHEN ta.action_taken THEN
                    CASE ta.action_type
                        WHEN 'created_update' THEN 10.0
                        WHEN 'dismissed' THEN 3.0
                        WHEN 'ignored' THEN 1.0
                        ELSE 5.0
                    END
                ELSE 2.0
            END
        ), effectiveness_score) -- Keep current score if no analytics
        FROM template_analytics ta
        WHERE ta.template_id = prompt_templates.id
        AND ta.created_at >= NOW() - INTERVAL '30 days'
    ),
    updated_at = NOW()
    WHERE EXISTS (
        SELECT 1 FROM template_analytics ta
        WHERE ta.template_id = prompt_templates.id
        AND ta.created_at >= NOW() - INTERVAL '30 days'
    );
END;
$$;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant permissions for the template system
GRANT SELECT ON prompt_templates TO authenticated;
GRANT SELECT ON template_analytics TO authenticated;

GRANT EXECUTE ON FUNCTION increment_template_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_template_effectiveness(UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_templates_by_filters(INTEGER, VARCHAR[], UUID[], INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_template_ids(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_template_from_community_prompt(UUID, TEXT, VARCHAR, INTEGER, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_template_effectiveness() TO service_role;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE prompt_templates IS 'Curated prompt templates with variable substitution for cost-effective AI prompt generation';
COMMENT ON TABLE template_analytics IS 'Tracks template performance metrics for effectiveness scoring';

COMMENT ON COLUMN prompt_templates.template_text IS 'Template with [variable_name] placeholders for substitution';
COMMENT ON COLUMN prompt_templates.variables IS 'JSON array of variable names that can be substituted in template_text';
COMMENT ON COLUMN prompt_templates.effectiveness_score IS 'Calculated effectiveness score based on user engagement (1-10)';
COMMENT ON COLUMN prompt_templates.usage_count IS 'Number of times this template has been used';

COMMENT ON FUNCTION increment_template_usage(UUID) IS 'Increments usage count for a template when used';
COMMENT ON FUNCTION get_templates_by_filters(INTEGER, VARCHAR[], UUID[], INTEGER) IS 'Returns filtered templates for selection algorithm';
COMMENT ON FUNCTION get_recent_template_ids(UUID, INTEGER) IS 'Gets recently used template IDs for a child to avoid repetition';
COMMENT ON FUNCTION recalculate_template_effectiveness() IS 'Recalculates effectiveness scores based on recent analytics data';