import { Ban, Check, Clock, Lock } from 'lucide-react'

const statusLabel = {
  available: '可预约',
  booked: '已预约',
  blocked: '停用',
}

const statusIcon = {
  available: Check,
  booked: Lock,
  blocked: Ban,
}

export function CourtSchedule({ courts, slots, selectedSlotIds, onSelectSlot, onToggleBlock }) {
  const selectedSet = new Set(selectedSlotIds)

  return (
    <section className="panel schedule-panel">
      <div className="section-title">
        <Clock size={18} />
        <h2>场地时段管理</h2>
        {selectedSlotIds.length > 0 && (
          <span className="multi-badge">已选 {selectedSlotIds.length} 个时段</span>
        )}
      </div>
      <div className="schedule-grid">
        {courts.map((court) => (
          <div className="court-column" key={court.id}>
            <div className="court-head">
              <strong>{court.name}</strong>
              <span>{court.surface}</span>
            </div>
            <div className="slot-list">
              {slots
                .filter((slot) => slot.court_id === court.id)
                .map((slot) => {
                  const Icon = statusIcon[slot.status]
                  const isSelected = selectedSet.has(slot.id)
                  return (
                    <button
                      type="button"
                      className={`slot-card ${slot.status} ${isSelected ? 'selected' : ''}`}
                      key={slot.id}
                      onClick={() => slot.status === 'available' && onSelectSlot(slot)}
                    >
                      <span className="slot-time">{slot.label}</span>
                      <span className="slot-meta">
                        <Icon size={15} />
                        {statusLabel[slot.status]} · ¥{slot.price}
                      </span>
                      {slot.status === 'booked' ? (
                        <span className="slot-admin muted">已锁定</span>
                      ) : (
                        <span
                          className="slot-admin"
                          onClick={(event) => {
                            event.stopPropagation()
                            onToggleBlock(slot)
                          }}
                        >
                          {slot.status === 'blocked' ? '恢复' : '停用'}
                        </span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
