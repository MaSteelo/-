'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase, Dispatch } from '@/lib/supabase'
import { CARS, DEPTS, CAR_NUMBERS } from '@/lib/constants'
import FuelBar from '@/components/FuelBar'
import MiniFuel from '@/components/MiniFuel'

const ADMIN_PW = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '1234'
const DOWS = ['일', '월', '화', '수', '목', '금', '토']

type Tab = 'apply' | 'cal' | 'list'
type ModalMode = 'detail' | 'edit' | 'delete' | 'notice' | 'adminLogin' | 'conflict' | null

/* ── 공통 스타일 ── */
const S = {
  input: { fontSize: 14, padding: '8px 10px', border: '1px solid #d0d0d0', borderRadius: 8, background: '#fff', width: '100%', fontFamily: 'inherit' } as React.CSSProperties,
  btn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid #d0d0d0', borderRadius: 8, cursor: 'pointer', background: '#fff' } as React.CSSProperties,
  btnPri: { background: '#c0392b', color: '#fff', border: 'none' } as React.CSSProperties,
  btnDanger: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5' } as React.CSSProperties,
  editBtn: { fontSize: 11, padding: '3px 7px', border: '1px solid #e0e0e0', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: '#666', whiteSpace: 'nowrap' } as React.CSSProperties,
  chip: { display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, padding: '2px 7px', borderRadius: 4, background: '#f5f5f5', color: '#999', border: '1px solid #e8e8e8' } as React.CSSProperties,
  modalBg: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' } as React.CSSProperties,
  modal: { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '1.25rem', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' } as React.CSSProperties,
  fg: { display: 'flex', flexDirection: 'column', gap: 4 } as React.CSSProperties,
  label: { fontSize: 12, color: '#888' } as React.CSSProperties,
  card: { background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' } as React.CSSProperties,
  tag: { fontSize: 10, padding: '2px 6px', borderRadius: 6, background: '#f0f0f0', color: '#666', whiteSpace: 'nowrap' } as React.CSSProperties,
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: '7px 0', borderTop: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: 12, color: '#999', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('apply')
  const [records, setRecords] = useState<Dispatch[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminPwInput, setAdminPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [showAdminBtn, setShowAdminBtn] = useState(false)
  const [loadedMonths, setLoadedMonths] = useState(1)
  const [calMonth, setCalMonth] = useState(new Date())
  const [modal, setModal] = useState<ModalMode>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [conflictMsg, setConflictMsg] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  /* 신청 폼 */
  const [fDate, setFDate] = useState(new Date().toISOString().split('T')[0])
  const [fCar, setFCar] = useState('')
  const [fDept, setFDept] = useState('')
  const [fUser, setFUser] = useState('')
  const [fPassengers, setFPassengers] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fDest, setFDest] = useState('')
  const [fDepart, setFDepart] = useState('')
  const [fArrive, setFArrive] = useState('')

  /* 수정 폼 */
  const [eDate, setEDate] = useState('')
  const [eCar, setECar] = useState('')
  const [eDept, setEDept] = useState('')
  const [eUser, setEUser] = useState('')
  const [ePassengers, setEPassengers] = useState('')
  const [eDesc, setEDesc] = useState('')
  const [eDest, setEDest] = useState('')
  const [eDepart, setEDepart] = useState('')
  const [eArrive, setEArrive] = useState('')
  const [eFuel, setEFuel] = useState(0)
  const [eKm, setEKm] = useState('')

  useEffect(() => {
    const check = () => setShowAdminBtn(window.location.hash === '#admin')
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    check(); checkMobile()
    window.addEventListener('hashchange', check)
    window.addEventListener('resize', checkMobile)
    return () => { window.removeEventListener('hashchange', check); window.removeEventListener('resize', checkMobile) }
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('dispatches').select('*').order('date', { ascending: false })
    if (!error && data) setRecords(data)
    setLoading(false)
  }, [])

  useEffect(() => { if (tab === 'list' || tab === 'cal') fetchRecords() }, [tab, fetchRecords])

  const switchTab = (t: Tab) => { setTab(t); if (t === 'list') setLoadedMonths(1) }

  /* 시간 겹침 체크 */
  const toMin = (t: string) => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const hasConflict = (date: string, car: string, depart: string, arrive: string, excludeId?: number) => {
    if (!depart || !arrive) return false
    const newStart = toMin(depart)!
    const newEnd = toMin(arrive)!
    if (newStart >= newEnd) return false
    return records.some(r => {
      if (r.car !== car || r.date !== date) return false
      if (excludeId && r.id === excludeId) return false
      const s = toMin(r.depart || ''); const e = toMin(r.arrive || '')
      if (s === null || e === null) return false
      return newStart < e && newEnd > s
    })
  }

  /* 배차 신청 */
  const handleSubmit = async () => {
    if (!fDate || !fCar || !fDept || !fUser || !fDest) {
      alert('필수 항목을 입력해 주세요\n(사용일자, 차량, 부서, 사용자, 목적지)'); return
    }
    if (hasConflict(fDate, fCar, fDepart, fArrive)) {
      setConflictMsg(`${fDate} ${fCar}은(는) 해당 시간대에 이미 배차되어 있습니다.\n출발/도착 시간을 확인해 주세요.`)
      setModal('conflict'); return
    }
    const { error } = await supabase.from('dispatches').insert({
      date: fDate, car: fCar, dept: fDept, user: fUser,
      passengers: fPassengers, description: fDesc,
      depart: fDepart, arrive: fArrive, dest: fDest,
      fuel: 0, km: '', locked: false,
    })
    if (error) { alert('저장 중 오류: ' + error.message); return }
    setFCar(''); setFDept(''); setFUser(''); setFPassengers('')
    setFDesc(''); setFDest(''); setFDepart(''); setFArrive('')
    setFDate(new Date().toISOString().split('T')[0])
    showToast('배차 신청이 완료되었습니다.')
    setModal('notice')
  }

  /* 수정 모달 열기 */
  const openEdit = (r: Dispatch) => {
    setSelectedId(r.id); setEDate(r.date); setECar(r.car); setEDept(r.dept)
    setEUser(r.user); setEPassengers(r.passengers || ''); setEDesc(r.description || '')
    setEDest(r.dest); setEDepart(r.depart || ''); setEArrive(r.arrive || '')
    setEFuel(r.fuel || 0); setEKm(r.km || ''); setModal('edit')
  }

  /* 저장 */
  const handleSave = async () => {
    if (!selectedId) return
    if (hasConflict(eDate, eCar, eDepart, eArrive, selectedId)) {
      setConflictMsg(`${eDate} ${eCar}은(는) 해당 시간대에 이미 배차되어 있습니다.`)
      setModal('conflict'); return
    }
    const { error } = await supabase.from('dispatches').update({
      date: eDate, car: eCar, dept: eDept, user: eUser,
      passengers: ePassengers, description: eDesc, dest: eDest,
      depart: eDepart, arrive: eArrive, fuel: eFuel, km: eKm,
    }).eq('id', selectedId)
    if (error) { alert('수정 중 오류: ' + error.message); return }
    setModal(null); showToast('수정되었습니다.'); fetchRecords()
  }

  /* 삭제 */
  const handleDelete = async () => {
    if (!selectedId) return
    const { error } = await supabase.from('dispatches').delete().eq('id', selectedId)
    if (error) { alert('삭제 중 오류: ' + error.message); return }
    setModal(null); showToast('삭제되었습니다.'); fetchRecords()
  }

  /* 잠금 토글 */
  const toggleLock = async (r: Dispatch) => {
    const { error } = await supabase.from('dispatches').update({ locked: !r.locked }).eq('id', r.id)
    if (error) { alert('오류: ' + error.message); return }
    fetchRecords()
  }

  /* 관리자 로그인 */
  const tryAdminLogin = () => {
    if (adminPwInput === ADMIN_PW) { setIsAdmin(true); setModal(null); setPwError(false); setAdminPwInput('') }
    else { setPwError(true); setAdminPwInput('') }
  }

  /* 월별 필터 */
  const now = new Date()
  const monthKeys: { y: number; m: number }[] = []
  for (let i = 0; i < loadedMonths; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthKeys.push({ y: d.getFullYear(), m: d.getMonth() })
  }
  const oldest = monthKeys[monthKeys.length - 1]
  const oldestKey = oldest.y * 100 + oldest.m
  const hasMore = records.some(r => { const [ry, rm] = r.date.split('-').map(Number); return ry * 100 + (rm - 1) < oldestKey })

  /* 달력 */
  const calY = calMonth.getFullYear(); const calM = calMonth.getMonth()
  const calDays = new Date(calY, calM + 1, 0).getDate()
  const selectedRecord = records.find(r => r.id === selectedId)

  /* 리스트 그리드 */
  const listGrid = isMobile
    ? '72px 58px 1fr 80px'
    : '90px 70px 1fr 90px 56px 120px'

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '0 0 2rem' : '0 0.75rem 2rem', fontFamily: 'inherit' }}>

      {/* ── 헤더 ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8', padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem', marginBottom: '1rem' }}>
        <div style={{
          fontSize: isMobile ? 15 : 19,
          fontWeight: 700,
          color: '#1a1a1a',
          letterSpacing: '-0.3px',
          fontFamily: "'Apple SD Gothic Neo', '맑은 고딕', 'Malgun Gothic', sans-serif",
          lineHeight: 1.3,
        }}>광주광역시 보건환경연구원</div>
        <div style={{
          fontSize: isMobile ? 11 : 13,
          fontWeight: 400,
          color: '#888',
          letterSpacing: '0.2px',
          fontFamily: "'Apple SD Gothic Neo', '맑은 고딕', 'Malgun Gothic', sans-serif",
          marginTop: 2,
        }}>공용차량 배차 시스템</div>
      </div>

      <div style={{ padding: isMobile ? '0 0.75rem' : '0' }}>
        {/* ── 탭 ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e0e0e0', marginBottom: '1.25rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {(['apply', 'cal', 'list'] as Tab[]).map((t, i) => (
            <button key={t} onClick={() => switchTab(t)} style={{
              padding: isMobile ? '10px 12px' : '10px 18px',
              fontSize: isMobile ? 13 : 14,
              color: tab === t ? '#c0392b' : '#999',
              background: 'transparent', border: 'none',
              borderBottom: tab === t ? '2px solid #c0392b' : '2px solid transparent',
              cursor: 'pointer', fontWeight: tab === t ? 600 : 400,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {['배차 신청', '일정 확인', '신청 내역 / 수정'][i]}
            </button>
          ))}
        </div>

        {/* 토스트 */}
        {toast && (
          <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#065f46', marginBottom: '1rem' }}>
            {toast}
          </div>
        )}

        {/* ───── 배차 신청 ───── */}
        {tab === 'apply' && (
          <div style={S.card}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: '1rem', color: '#1a1a1a' }}>배차 신청서</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
              <div style={S.fg}><label style={S.label}>사용일자 *</label><input style={S.input} type="date" value={fDate} onChange={e => setFDate(e.target.value)} /></div>
              <div style={S.fg}><label style={S.label}>차량 종류 *</label>
                <select style={S.input} value={fCar} onChange={e => setFCar(e.target.value)}>
                  <option value="">선택하세요</option>
                  {CARS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div style={S.fg}><label style={S.label}>부서 *</label>
                <select style={S.input} value={fDept} onChange={e => setFDept(e.target.value)}>
                  <option value="">선택하세요</option>
                  {DEPTS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div style={S.fg}><label style={S.label}>사용자 (운전자) *</label><input style={S.input} type="text" placeholder="예) 홍길동" value={fUser} onChange={e => setFUser(e.target.value)} /></div>
              <div style={{ ...S.fg, gridColumn: isMobile ? '1' : '1 / -1' }}><label style={S.label}>동승인</label><input style={S.input} type="text" placeholder="예) 김철수, 이영희" value={fPassengers} onChange={e => setFPassengers(e.target.value)} /></div>
              <div style={{ ...S.fg, gridColumn: isMobile ? '1' : '1 / -1' }}><label style={S.label}>운행내용</label><input style={S.input} type="text" placeholder="예) 시청 업무 협의" value={fDesc} onChange={e => setFDesc(e.target.value)} /></div>
              <div style={{ ...S.fg, gridColumn: isMobile ? '1' : '1 / -1' }}><label style={S.label}>목적지 *</label><input style={S.input} type="text" placeholder="예) 시청, 우체국" value={fDest} onChange={e => setFDest(e.target.value)} /></div>
              <div style={S.fg}>
                <label style={S.label}>출발 시간</label>
                <input style={S.input} type="text" inputMode="numeric" placeholder="예) 09:00" value={fDepart}
                  onChange={e => {
                    let v = e.target.value.replace(/[^0-9:]/g, '')
                    if (v.length === 2 && !v.includes(':') && fDepart.length < 2) v = v + ':'
                    setFDepart(v)
                  }} maxLength={5} />
              </div>
              <div style={S.fg}>
                <label style={S.label}>도착 시간 <span style={{ fontSize: 11, color: '#bbb' }}>(복귀 후 기입)</span></label>
                <input style={S.input} type="text" inputMode="numeric" placeholder="예) 18:00" value={fArrive}
                  onChange={e => {
                    let v = e.target.value.replace(/[^0-9:]/g, '')
                    if (v.length === 2 && !v.includes(':') && fArrive.length < 2) v = v + ':'
                    setFArrive(v)
                  }} maxLength={5} />
              </div>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', marginTop: '1rem', lineHeight: 1.6 }}>
              📋 <strong>안내</strong> — 복귀 후 <strong>신청 내역 / 수정</strong> 탭에서 동승인·도착시간·유류잔량·누적거리를 꼭 기입해 주세요.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem', flexWrap: 'wrap' }}>
              <button style={S.btn} onClick={() => { setFCar(''); setFDept(''); setFUser(''); setFPassengers(''); setFDesc(''); setFDest(''); setFDepart(''); setFArrive('') }}>초기화</button>
              <button style={{ ...S.btn, ...S.btnPri }} onClick={handleSubmit}>신청 완료</button>
            </div>
          </div>
        )}

        {/* ───── 일정 확인 ───── */}
        {tab === 'cal' && (
          <div style={S.card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem' }}>
              <button style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }} onClick={() => setCalMonth(new Date(calY, calM - 1, 1))}>‹</button>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{calY}년 {calM + 1}월</span>
              <button style={{ background: 'none', border: '1px solid #e0e0e0', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }} onClick={() => setCalMonth(new Date(calY, calM + 1, 1))}>›</button>
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <div style={{ minWidth: 380 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '52px repeat(4,1fr)' : '72px repeat(4,1fr)', fontSize: 11, fontWeight: 500, color: '#999' }}>
                  <div style={{ padding: '4px 4px', textAlign: 'center' }}>날짜</div>
                  {CARS.map(car => (
                    <div key={car} style={{ padding: '4px 2px', textAlign: 'center' }}>
                      {car.split(' ')[0]}<br />
                      <span style={{ fontSize: 9, color: '#bbb' }}>{CAR_NUMBERS[car]}</span>
                    </div>
                  ))}
                </div>
                {Array.from({ length: calDays }, (_, i) => i + 1).map(d => {
                  const ds = `${calY}-${String(calM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                  const dow = new Date(calY, calM, d).getDay()
                  const isWeekend = dow === 0 || dow === 6
                  return (
                    <div key={d} style={{ display: 'grid', gridTemplateColumns: isMobile ? '52px repeat(4,1fr)' : '72px repeat(4,1fr)', borderTop: '1px solid #f5f5f5', alignItems: 'stretch' }}>
                      <div style={{ fontSize: isMobile ? 10 : 11, color: isWeekend ? '#ef4444' : '#999', padding: isMobile ? '6px 3px' : '7px 6px', display: 'flex', alignItems: 'center' }}>
                        {calM + 1}/{d}<br /><span style={{ fontSize: 9 }}>({DOWS[dow]})</span>
                      </div>
                      {CARS.map(car => {
                        const rec = records.find(r => r.date === ds && r.car === car)
                        return (
                          <div key={car} style={{ padding: '4px 2px', borderLeft: '1px solid #f5f5f5', minHeight: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {rec ? (
                              <span onClick={() => { setSelectedId(rec.id); setModal('detail') }}
                                style={{ fontSize: isMobile ? 9 : 10, padding: '2px 4px', borderRadius: 3, cursor: 'pointer', textAlign: 'center', lineHeight: 1.3, background: rec.locked ? '#f5f5f5' : '#ecfdf5', color: rec.locked ? '#999' : '#065f46' }}>
                                {rec.locked ? '🔒' : ''}{rec.dept}
                              </span>
                            ) : <span style={{ color: '#ddd', fontSize: 10 }}>-</span>}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#bbb', marginTop: 8 }}>부서명을 누르면 상세 정보를 확인할 수 있습니다</p>
          </div>
        )}

        {/* ───── 신청 내역 ───── */}
        {tab === 'list' && (
          <>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '8px 12px', marginBottom: '1rem', fontSize: 12, color: '#065f46', flexWrap: 'wrap' }}>
                <span>🔑</span>
                <span><strong>관리자 모드</strong> — 확인(잠금) 및 해제 권한이 활성화되었습니다</span>
                <button style={{ ...S.editBtn, marginLeft: 'auto' }} onClick={() => setIsAdmin(false)}>로그아웃</button>
              </div>
            )}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>신청 내역</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: '#bbb' }}>
                    {loadedMonths === 1 ? `${now.getFullYear()}년 ${now.getMonth() + 1}월` : `${oldest.y}년 ${oldest.m + 1}월 ~ ${now.getFullYear()}년 ${now.getMonth() + 1}월`}
                  </span>
                  {showAdminBtn && !isAdmin && (
                    <button style={S.editBtn} onClick={() => { setAdminPwInput(''); setPwError(false); setModal('adminLogin') }}>🔑 관리자</button>
                  )}
                </div>
              </div>

              {loading && <p style={{ textAlign: 'center', fontSize: 13, color: '#999', padding: '2rem 0' }}>불러오는 중...</p>}

              {monthKeys.map(({ y, m }) => {
                const key = `${y}-${String(m + 1).padStart(2, '0')}`
                const monthRecs = records.filter(r => r.date.startsWith(key)).sort((a, b) => b.date.localeCompare(a.date))
                if (monthRecs.length === 0) return null
                const isNow = y === now.getFullYear() && m === now.getMonth()
                return (
                  <div key={key} style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {y}년 {m + 1}월{isNow && <span style={{ fontSize: 11, color: '#1D9E75', fontWeight: 400, marginLeft: 6 }}>이번 달</span>}
                      </span>
                      <span style={{ fontSize: 11, color: '#bbb' }}>{monthRecs.length}건</span>
                    </div>
                    {/* 리스트 헤더 */}
                    <div style={{ display: 'grid', gridTemplateColumns: listGrid, gap: 6, padding: '6px 0', fontSize: 11, fontWeight: 500, color: '#999', borderBottom: '1px solid #f0f0f0' }}>
                      <span>사용일자</span><span>차량</span><span>사용자 / 운행내용</span>
                      {!isMobile && <><span>목적지</span><span>유류</span></>}<span>관리</span>
                    </div>
                    {monthRecs.map(r => (
                      <div key={r.id} style={{ display: 'grid', gridTemplateColumns: listGrid, gap: 6, padding: '9px 0', borderTop: '1px solid #f8f8f8', fontSize: 12, alignItems: 'center', ...(r.locked ? { background: '#fafafa', borderRadius: 8, padding: '9px 6px', margin: '2px 0' } : {}) }}>
                        <span style={{ fontSize: isMobile ? 11 : 12 }}>{r.date}</span>
                        <span style={S.tag}>{r.car.split(' ')[0]}</span>
                        <div>
                          <span style={{ fontWeight: 500, fontSize: isMobile ? 12 : 13 }}>{r.user}{r.passengers ? ` (${r.passengers})` : ''}</span><br />
                          <span style={{ color: '#999', fontSize: 11 }}>{r.description || '-'}</span>
                        </div>
                        {!isMobile && <>
                          <span style={{ color: '#999', fontSize: 11 }}>{r.dest}</span>
                          <MiniFuel value={r.fuel || 0} />
                        </>}
                        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                          {r.locked && <span style={S.chip}>🔒</span>}
                          <button style={S.editBtn} onClick={() => { setSelectedId(r.id); setModal('detail') }}>상세</button>
                          {!r.locked && (
                            <>
                              <button style={{ ...S.editBtn, color: '#d97706', borderColor: '#fcd34d' }} onClick={() => openEdit(r)}>수정</button>
                              <button style={{ ...S.editBtn, color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => { setSelectedId(r.id); setModal('delete') }}>삭제</button>
                            </>
                          )}
                          {isAdmin && (r.locked
                            ? <button style={{ ...S.editBtn, color: '#d97706', borderColor: '#fcd34d' }} onClick={() => toggleLock(r)}>🔓 해제</button>
                            : <button style={{ ...S.editBtn, color: '#065f46', borderColor: '#6ee7b7', background: '#ecfdf5' }} onClick={() => toggleLock(r)}>✓ 확인</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}

              {!loading && monthKeys.every(({ y, m }) => records.filter(r => r.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length === 0) && (
                <p style={{ textAlign: 'center', fontSize: 13, color: '#bbb', padding: '2rem 0' }}>이번 달 신청 내역이 없습니다</p>
              )}

              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                  <button style={{ ...S.btn, width: '100%', justifyContent: 'center', color: '#999' }} onClick={() => setLoadedMonths(v => v + 1)}>▲ 이전 달 내역 불러오기</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 안내 팝업 ── */}
      {modal === 'notice' && (
        <div style={S.modalBg}>
          <div style={{ ...S.modal, maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>운행 후 꼭 확인해 주세요</p>
            <p style={{ fontSize: 13, color: '#888', lineHeight: 1.7, marginBottom: '1.25rem' }}>
              출장·운행 복귀 후 <strong style={{ color: '#d97706' }}>신청 내역 / 수정</strong> 탭에서<br />
              아래 항목을 반드시 수정·기입해 주세요.<br /><br />
              <strong style={{ color: '#d97706' }}>동승인 · 실제 도착시간<br />유류(배터리)잔량 · 누적거리(km)</strong>
            </p>
            <button style={{ ...S.btn, ...S.btnPri, width: '100%', justifyContent: 'center' }} onClick={() => setModal(null)}>확인했습니다</button>
          </div>
        </div>
      )}

      {/* ── 시간 충돌 팝업 ── */}
      {modal === 'conflict' && (
        <div style={S.modalBg}>
          <div style={{ ...S.modal, maxWidth: 360, textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>배차 불가</p>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#dc2626', lineHeight: 1.7, marginBottom: '1.25rem', textAlign: 'left' }}>
              {conflictMsg}
            </div>
            <button style={{ ...S.btn, ...S.btnPri, width: '100%', justifyContent: 'center' }} onClick={() => setModal(null)}>확인</button>
          </div>
        </div>
      )}

      {/* ── 상세 모달 ── */}
      {modal === 'detail' && selectedRecord && (
        <div style={S.modalBg} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={S.modal}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>배차 상세 정보</p>
            <p style={{ fontSize: 12, color: '#999', marginBottom: '1rem' }}>{selectedRecord.date} · {selectedRecord.car}{selectedRecord.locked ? ' 🔒' : ''}</p>
            {([
              ['부서', selectedRecord.dept],
              ['사용자(운전자)', selectedRecord.user],
              ['동승인', selectedRecord.passengers || '-'],
              ['운행내용', selectedRecord.description || '-'],
              ['출발 → 도착', (selectedRecord.depart || selectedRecord.arrive) ? `${selectedRecord.depart || '-'} → ${selectedRecord.arrive || '-'}` : '-'],
              ['목적지', selectedRecord.dest],
              ['누적거리', selectedRecord.km ? selectedRecord.km + ' km' : '-'],
            ] as [string, string][]).map(([l, v]) => <DetailRow key={l} label={l} value={v} />)}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderTop: '1px solid #f5f5f5' }}>
              <span style={{ fontSize: 12, color: '#999', minWidth: 110 }}>유류(배터리)잔량</span>
              <FuelBar value={selectedRecord.fuel || 0} readonly />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button style={S.btn} onClick={() => setModal(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 수정 모달 ── */}
      {modal === 'edit' && (
        <div style={S.modalBg} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={S.modal}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>신청 내역 수정</p>
            <p style={{ fontSize: 12, color: '#999', marginBottom: '1rem' }}>{eDate} · {eCar}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={S.fg}><label style={S.label}>사용일자</label><input style={S.input} type="date" value={eDate} onChange={e => setEDate(e.target.value)} /></div>
              <div style={S.fg}><label style={S.label}>차량 종류</label>
                <select style={S.input} value={eCar} onChange={e => setECar(e.target.value)}>{CARS.map(c => <option key={c}>{c}</option>)}</select>
              </div>
              <div style={S.fg}><label style={S.label}>부서</label>
                <select style={S.input} value={eDept} onChange={e => setEDept(e.target.value)}>{DEPTS.map(d => <option key={d}>{d}</option>)}</select>
              </div>
              <div style={S.fg}><label style={S.label}>사용자 (운전자)</label><input style={S.input} type="text" value={eUser} onChange={e => setEUser(e.target.value)} /></div>
              <div style={{ ...S.fg, gridColumn: '1/-1' }}><label style={S.label}>동승인</label><input style={S.input} type="text" value={ePassengers} onChange={e => setEPassengers(e.target.value)} placeholder="없으면 비워두세요" /></div>
              <div style={{ ...S.fg, gridColumn: '1/-1' }}><label style={S.label}>운행내용</label><input style={S.input} type="text" value={eDesc} onChange={e => setEDesc(e.target.value)} /></div>
              <div style={{ ...S.fg, gridColumn: '1/-1' }}><label style={S.label}>목적지</label><input style={S.input} type="text" value={eDest} onChange={e => setEDest(e.target.value)} /></div>
              <div style={S.fg}><label style={S.label}>출발 시간</label><input style={S.input} type="text" inputMode="numeric" placeholder="예) 09:00" value={eDepart}
                onChange={e => { let v = e.target.value.replace(/[^0-9:]/g, ''); if (v.length===2 && !v.includes(':') && eDepart.length<2) v=v+':'; setEDepart(v) }} maxLength={5} /></div>
              <div style={S.fg}><label style={S.label}>도착 시간</label><input style={S.input} type="text" inputMode="numeric" placeholder="예) 18:00" value={eArrive}
                onChange={e => { let v = e.target.value.replace(/[^0-9:]/g, ''); if (v.length===2 && !v.includes(':') && eArrive.length<2) v=v+':'; setEArrive(v) }} maxLength={5} /></div>
              <div style={{ ...S.fg, gridColumn: '1/-1' }}><label style={S.label}>유류(배터리)잔량</label><FuelBar value={eFuel} onChange={setEFuel} /></div>
              <div style={S.fg}><label style={S.label}>누적거리 (km)</label><input style={S.input} type="number" value={eKm} onChange={e => setEKm(e.target.value)} placeholder="km" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
              <button style={S.btn} onClick={() => setModal(null)}>취소</button>
              <button style={{ ...S.btn, ...S.btnPri }} onClick={handleSave}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 삭제 확인 ── */}
      {modal === 'delete' && selectedRecord && (
        <div style={S.modalBg} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={S.modal}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>내역 삭제</p>
            <p style={{ fontSize: 12, color: '#999', marginBottom: '1rem' }}>삭제하면 복구할 수 없습니다</p>
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#dc2626', lineHeight: 1.7 }}>
              {selectedRecord.date} · {selectedRecord.car.split(' ')[0]}<br />
              <strong>{selectedRecord.user}</strong>{selectedRecord.passengers ? ` (${selectedRecord.passengers})` : ''} · {selectedRecord.dest}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
              <button style={S.btn} onClick={() => setModal(null)}>취소</button>
              <button style={{ ...S.btn, ...S.btnDanger }} onClick={handleDelete}>삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 관리자 로그인 ── */}
      {modal === 'adminLogin' && (
        <div style={{ ...S.modalBg, zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ ...S.modal, maxWidth: 320, textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>관리자 로그인</p>
            <p style={{ fontSize: 12, color: '#999', marginBottom: '1rem' }}>관리자 비밀번호를 입력하세요</p>
            <input style={{ ...S.input, textAlign: 'center', letterSpacing: '0.1em', marginBottom: 10 }}
              type="password" placeholder="비밀번호" value={adminPwInput}
              onChange={e => setAdminPwInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && tryAdminLogin()} autoFocus />
            <button style={{ ...S.btn, ...S.btnPri, width: '100%', justifyContent: 'center' }} onClick={tryAdminLogin}>확인</button>
            {pwError && <p style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>비밀번호가 올바르지 않습니다</p>}
          </div>
        </div>
      )}
    </div>
  )
}
