'use client'

type Props = { value: number; onChange?: (n: number) => void; readonly?: boolean }

export default function FuelBar({ value, onChange, readonly }: Props) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          onClick={() => !readonly && onChange && onChange(i + 1)}
          style={{
            width: 30, height: 22,
            border: '1px solid',
            borderColor: i < value ? '#1D9E75' : '#ccc',
            borderRadius: 4,
            background: i < value ? '#1D9E75' : '#f5f5f5',
            cursor: readonly ? 'default' : 'pointer',
            transition: 'background 0.1s',
          }}
        />
      ))}
      <span style={{ fontSize: 12, color: '#888', marginLeft: 4 }}>{value}/8</span>
    </div>
  )
}
