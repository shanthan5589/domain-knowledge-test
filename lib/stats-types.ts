// Shared shapes for the /api/stats and /api/stats/personal responses, used by
// the Stats page and its Community Insights bento-grid components.

export interface DistributionItem {
  label: string
  count: number
  percent: number
}

export interface AverageScoreItem {
  label: string
  count: number
  averageScore: number
}

export interface LocationComparisonItem {
  label: string
  scope: string
  averageScore: number | null
  count: number
}

export interface UserProgress {
  attemptCount: number
  latestScore: number | null
  previousScore: number | null
  scoreChange: number | null
  bestScore: number | null
  latestTimeSeconds: number | null
  averageTimePerQuestionSeconds: number | null
  scorePerMinute: number | null
  latestCompletedAt: string | null
  consistency: {
    label: string
    averageScore: number | null
    scoreRange: number | null
    standardDeviation: number | null
  }
}

export interface RankLadderRung {
  scope: string
  label: string
  rank: number | null
  percentile: number | null
  cohortSize: number
  averageScore: number | null
}

export interface PeerGroupRankItem {
  dimension: string
  label: string | null
  rank: number | null
  percentile: number | null
  cohortSize: number
  averageScore: number | null
}

export interface RankedGroup {
  label: string
  count: number
  averageScore: number
}

export interface TopGroupRow extends RankedGroup {
  rank: number
  isYou: boolean
}

export interface StatsResponse {
  histogram: number[]
  totalUsers: number
  yourScore: number | null
  yourRank: number | null
  percentile: number | null
  averageScore: number | null
  medianScore: number | null
  modeScore: number | null
  topScore: number | null
  lowScore: number | null
  averageTimeSeconds: number | null
  topScoreCount: number
  topScorePercent: number
  roleDistribution: DistributionItem[]
  roleAverageScores: AverageScoreItem[]
  experienceAverageScores: AverageScoreItem[]
  experienceDistribution: DistributionItem[]
  locationDistribution: DistributionItem[]
  locationAverageScores: AverageScoreItem[]
  locationDistributionLabel: string | null
  locationComparisons: LocationComparisonItem[]
  userProgress: UserProgress
  rankLadder: RankLadderRung[]
  peerGroupRanks: PeerGroupRankItem[]
  topCitiesByScore: TopGroupRow[]
  topCitiesByParticipation: TopGroupRow[]
  averageScoreByState: RankedGroup[]
  testTakersByState: RankedGroup[]
}

export interface ActivityDay {
  date: string
  count: number
}

export interface Streaks {
  currentStreak: number
  longestStreak: number
}

export interface TimeOfDayBucket {
  dayOfWeek: number
  hour: number
  averageScore: number
  count: number
}

export interface PacePoint {
  timeTakenSeconds: number
  score: number
  completedAt: string
}

export interface DomainRange {
  domain: string
  min: number
  mean: number
  max: number
  count: number
}

export interface DomainRadarPoint {
  domain: string
  you: number | null
  city: number | null
  country: number | null
}

export interface RecentAttempt {
  domain: string
  score: number
  completedAt: string
  scoreChangeFromPrevious: number | null
}

export interface WeekOverWeek {
  thisWeekAverage: number | null
  lastWeekAverage: number | null
  change: number | null
}

export interface PersonalStatsResponse {
  activityCalendar: ActivityDay[]
  streaks: Streaks
  timeOfDayPerformance: TimeOfDayBucket[]
  pacePoints: PacePoint[]
  domainRanges: DomainRange[]
  domainRadar: DomainRadarPoint[]
  recentAttempts: RecentAttempt[]
  weekOverWeek: WeekOverWeek
}
