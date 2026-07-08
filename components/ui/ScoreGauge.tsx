// The app's signature device: every score is out of 10, so every score gets
// rendered as a 10-tick readout instead of a generic badge or donut. Reused
// on the dashboard result cards and the quiz results screen.

const TICKS = Array.from({ length: 10 }, (_, i) => i + 1)

interface ScoreGaugeProps {
  score: number
  size?: 'sm' | 'lg'
}

export default function ScoreGauge({ score, size = 'sm' }: ScoreGaugeProps) {
  const barHeight = size === 'lg' ? 'h-8' : 'h-4'
  const barWidth = size === 'lg' ? 'w-1.5' : 'w-1'
  const gap = size === 'lg' ? 'gap-1' : 'gap-0.5'

  return (
    <div className={`flex items-end ${gap}`} role="img" aria-label={`Score ${score} out of 10`}>
      {TICKS.map((tick) => (
        <span
          key={tick}
          className={`${barWidth} ${barHeight} rounded-[1px]`}
          style={{
            backgroundColor: tick <= score ? 'var(--signal)' : 'var(--line)',
            opacity: tick <= score ? 0.4 + (tick / 10) * 0.6 : 1,
          }}
        />
      ))}
    </div>
  )
}
