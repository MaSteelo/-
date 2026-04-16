type Props = { value: number }

export default function MiniFuel({ value }: Props) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{
          width: 8, height: 12, borderRadius: 2,
          background: i < value ? '#1D9E75' : '#e0e0e0',
        }} />
      ))}
    </div>
  )
}
