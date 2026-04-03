import { memo } from 'react'
import type { PlotOutput } from '@/store/executionStore'

// Dynamic import to keep initial bundle lean
import Plot from 'react-plotly.js'

interface Props {
  output: PlotOutput
}

function PlotViewerInner({ output }: Props) {
  const spec = output.spec as {
    data?: Plotly.Data[]
    layout?: Partial<Plotly.Layout>
    config?: Partial<Plotly.Config>
  }

  const layout: Partial<Plotly.Layout> = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor:  'rgba(0,0,0,0)',
    font: { color: 'hsl(210 20% 92%)', size: 11 },
    margin: { t: 32, r: 16, b: 32, l: 48 },
    ...spec.layout,
  }

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden p-2">
      <Plot
        data={(spec.data ?? []) as Plotly.Data[]}
        layout={layout}
        config={{ responsive: true, displayModeBar: true, displaylogo: false, ...spec.config }}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler
      />
    </div>
  )
}

export const PlotViewer = memo(PlotViewerInner)
