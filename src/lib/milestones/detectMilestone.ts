import type { MilestoneType } from '@/lib/validation/update'

export type MilestoneConfidence = 'low' | 'medium' | 'high'

export interface MilestoneCandidate {
  type: MilestoneType
  score: number
  confidence: MilestoneConfidence
  matches: string[]
}

export interface MilestoneDetectionResult {
  bestMatch: MilestoneCandidate | null
  candidates: MilestoneCandidate[]
}

interface DetectionPattern {
  regex: RegExp
  weight: number
  description: string
}

interface DetectionRule {
  type: MilestoneType
  patterns: DetectionPattern[]
}

const detectionRules: DetectionRule[] = [
  {
    type: 'first_smile',
    patterns: [
      {
        regex: /\b(first|1st)\s+smil(e|ed|es)\b/gi,
        weight: 3,
        description: 'first smile language'
      },
      {
        regex: /\bsmiled?\s+(so\s+big|for\s+the\s+first\s+time)\b/gi,
        weight: 2,
        description: 'smiled for the first time'
      }
    ]
  },
  {
    type: 'rolling',
    patterns: [
      {
        regex: /\brolled?\s+over\b/gi,
        weight: 3,
        description: 'rolled over phrase'
      },
      {
        regex: /\b(tummy|belly)\s+to\s+back\b/gi,
        weight: 1.5,
        description: 'tummy to back wording'
      }
    ]
  },
  {
    type: 'sitting',
    patterns: [
      {
        regex: /\b(sat|sitting)\s+up\b/gi,
        weight: 2.5,
        description: 'sat up wording'
      },
      {
        regex: /\bfirst\s+time\s+sit(ting)?\s+up\b/gi,
        weight: 3,
        description: 'first time sitting up'
      }
    ]
  },
  {
    type: 'crawling',
    patterns: [
      {
        regex: /\b(first|1st)\s+crawl(ed|ing)?\b/gi,
        weight: 3,
        description: 'first crawl phrasing'
      },
      {
        regex: /\bcrawl(ed|ing)\b/gi,
        weight: 1.2,
        description: 'general crawling keyword'
      },
      {
        regex: /\barmy\s+crawl\b/gi,
        weight: 1.5,
        description: 'army crawl keyword'
      }
    ]
  },
  {
    type: 'first_steps',
    patterns: [
      {
        regex: /\b(first|1st)\s+step(s)?\b/gi,
        weight: 3,
        description: 'first steps phrase'
      },
      {
        regex: /\btook\s+(his|her|their)\s+first\s+steps\b/gi,
        weight: 3,
        description: 'took first steps wording'
      },
      {
        regex: /\bstarted\s+(to\s+)?walk(ing)?\b/gi,
        weight: 1.5,
        description: 'started walking phrase'
      },
      {
        regex: /\bwalk(ed|ing)\b/gi,
        weight: 0.7,
        description: 'general walking keyword'
      }
    ]
  },
  {
    type: 'first_words',
    patterns: [
      {
        regex: /\b(first|1st)\s+word(s)?\b/gi,
        weight: 3,
        description: 'first words phrase'
      },
      {
        regex: /\bsaid\s+(mama|dada|papa|\w+)\s+for\s+the\s+first\s+time\b/gi,
        weight: 2.5,
        description: 'said specific word for first time'
      },
      {
        regex: /\bstarted\s+talking\b/gi,
        weight: 1.2,
        description: 'started talking keyword'
      }
    ]
  },
  {
    type: 'first_tooth',
    patterns: [
      {
        regex: /\b(first|1st)\s+tooth\b/gi,
        weight: 3,
        description: 'first tooth phrase'
      },
      {
        regex: /\b(tooth|teeth)\s+(coming|came)\s+in\b/gi,
        weight: 1.8,
        description: 'tooth coming in wording'
      },
      {
        regex: /\b(tooth|teeth)\s+sprout(ed|ing)?\b/gi,
        weight: 1.5,
        description: 'tooth sprouted wording'
      }
    ]
  },
  {
    type: 'walking',
    patterns: [
      {
        regex: /\bwalking\s+all\s+on\s+(his|her|their)\s+own\b/gi,
        weight: 2.5,
        description: 'walking independently wording'
      },
      {
        regex: /\bwalked\s+across\s+the\s+room\b/gi,
        weight: 2,
        description: 'walked across the room phrase'
      },
      {
        regex: /\b(first|1st)\s+walk\b/gi,
        weight: 3,
        description: 'first walk language'
      }
    ]
  },
  {
    type: 'potty_training',
    patterns: [
      {
        regex: /\bpotty\s+(trained|training)\b/gi,
        weight: 3,
        description: 'potty training phrase'
      },
      {
        regex: /\bused\s+the\s+potty\b/gi,
        weight: 1.5,
        description: 'used the potty wording'
      },
      {
        regex: /\b(first|1st)\s+time\s+on\s+the\s+potty\b/gi,
        weight: 3,
        description: 'first time on the potty phrase'
      }
    ]
  },
  {
    type: 'first_day_school',
    patterns: [
      {
        regex: /\bfirst\s+day\s+of\s+(school|kindergarten|preschool)\b/gi,
        weight: 3,
        description: 'first day of school phrase'
      },
      {
        regex: /\bstarted\s+(school|kindergarten|preschool)\b/gi,
        weight: 2,
        description: 'started school wording'
      },
      {
        regex: /\bback\s+to\s+school\b/gi,
        weight: 1.5,
        description: 'back to school phrase'
      }
    ]
  },
  {
    type: 'birthday',
    patterns: [
      {
        regex: /\b(birthday|b-day)\b/gi,
        weight: 3,
        description: 'birthday keyword'
      },
      {
        regex: /\bturned?\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/gi,
        weight: 2.5,
        description: 'turning age phrasing'
      },
      {
        regex: /\bcelebrated\s+(his|her|their)\s+birthday\b/gi,
        weight: 3,
        description: 'celebrated birthday wording'
      }
    ]
  }
]

const HIGH_CONFIDENCE_SCORE = 3
const MEDIUM_CONFIDENCE_SCORE = 1.5

const getConfidenceFromScore = (score: number): MilestoneConfidence => {
  if (score >= HIGH_CONFIDENCE_SCORE) {
    return 'high'
  }
  if (score >= MEDIUM_CONFIDENCE_SCORE) {
    return 'medium'
  }
  return 'low'
}

export function detectMilestone(rawContent: string | null | undefined): MilestoneDetectionResult {
  if (!rawContent) {
    return { bestMatch: null, candidates: [] }
  }

  const candidates: MilestoneCandidate[] = []

  for (const rule of detectionRules) {
    let score = 0
    const matches: string[] = []

    for (const pattern of rule.patterns) {
      pattern.regex.lastIndex = 0
      const occurrences = rawContent.match(pattern.regex) || []
      if (occurrences.length > 0) {
        score += pattern.weight * occurrences.length
        matches.push(
          ...occurrences.map((match) => match.trim())
        )
      }
    }

    if (score > 0) {
      const confidence = getConfidenceFromScore(score)
      candidates.push({
        type: rule.type,
        score,
        confidence,
        matches
      })
    }
  }

  candidates.sort((a, b) => b.score - a.score)

  return {
    bestMatch: candidates[0] ?? null,
    candidates
  }
}
