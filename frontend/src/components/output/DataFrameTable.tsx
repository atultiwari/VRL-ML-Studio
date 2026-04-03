import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DataFrameOutput } from '@/store/executionStore'

const DTYPE_COLORS: Record<string, string> = {
  int:     'text-blue-400',
  float:   'text-cyan-400',
  object:  'text-amber-400',
  bool:    'text-green-400',
  category:'text-purple-400',
}

function dtypeColor(dtype: string): string {
  for (const [key, cls] of Object.entries(DTYPE_COLORS)) {
    if (dtype.includes(key)) return cls
  }
  return 'text-muted-foreground'
}

interface Props {
  output: DataFrameOutput
}

export function DataFrameTable({ output }: Props) {
  const { columns, data, shape } = output
  const colHelper = createColumnHelper<unknown[]>()

  const tableColumns = useMemo(
    () =>
      columns.map((col, idx) =>
        colHelper.accessor(
          (row) => (row as unknown[])[idx],
          {
            id: col.name,
            header: () => (
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">{col.name}</span>
                <span className={cn('text-[9px]', dtypeColor(col.dtype))}>{col.dtype}</span>
              </div>
            ),
            cell: info => {
              const v = info.getValue()
              if (v === null || v === undefined) return <span className="text-muted-foreground/50 italic text-[10px]">null</span>
              return <span className="text-xs">{String(v)}</span>
            },
          }
        )
      ),
    [columns]
  )

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Info bar */}
      <div className="flex items-center gap-3 border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{shape[0].toLocaleString()} rows × {shape[1]} columns</span>
        {shape[0] > 100 && (
          <span className="text-amber-400/80">Showing first 100 rows</span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th
                    key={h.id}
                    className="border-b border-border px-3 py-2 text-left font-normal whitespace-nowrap"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} className={cn(i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20')}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="border-b border-border/50 px-3 py-1.5 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-1.5">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
