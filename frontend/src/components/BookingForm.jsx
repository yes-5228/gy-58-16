import { CreditCard, X } from 'lucide-react'

export function BookingForm({
  members,
  selectedSlots,
  contactName,
  memberId,
  onContactName,
  onMemberId,
  onSubmit,
  onRemoveSlot,
  onClearSlots,
}) {
  const member = members.find((item) => item.id === Number(memberId))
  const discountRate = member ? member.discount_rate : 1
  const totalOriginal = selectedSlots.reduce((sum, slot) => sum + slot.price, 0)
  const totalPayable = selectedSlots.reduce(
    (sum, slot) => sum + slot.price * discountRate,
    0,
  )

  const canSubmit = selectedSlots.length > 0 && contactName.trim()

  return (
    <section className="panel booking-panel">
      <div className="section-title">
        <CreditCard size={18} />
        <h2>包场预约与费用结算</h2>
        {selectedSlots.length > 0 && (
          <button type="button" className="clear-btn" onClick={onClearSlots}>
            清空选择
          </button>
        )}
      </div>
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          预约人
          <input
            value={contactName}
            onChange={(event) => onContactName(event.target.value)}
            placeholder="输入姓名"
          />
        </label>
        <label>
          会员折扣
          <select value={memberId} onChange={(event) => onMemberId(event.target.value)}>
            {members.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.level} · {(item.discount_rate * 10).toFixed(1)}折
              </option>
            ))}
          </select>
        </label>
        <div className="selected-slots-box">
          <span className="box-label">已选时段</span>
          {selectedSlots.length === 0 ? (
            <span className="box-empty">请点击可预约时段进行选择</span>
          ) : (
            <div className="selected-slot-chips">
              {selectedSlots.map((slot) => (
                <span key={slot.id} className="slot-chip">
                  {slot.label} ¥{slot.price}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => onRemoveSlot(slot.id)}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="settlement-box">
          <span>已选时段</span>
          <strong>{selectedSlots.length} 个</strong>
          <span>原价合计</span>
          <strong>¥{totalOriginal.toFixed(2)}</strong>
          <span>折扣</span>
          <strong>{(discountRate * 10).toFixed(1)}折</strong>
          <span>应付金额</span>
          <strong className="total-amount">¥{totalPayable.toFixed(2)}</strong>
        </div>
        <button className="primary-action" type="submit" disabled={!canSubmit}>
          提交包场预约（{selectedSlots.length} 个时段）
        </button>
      </form>
    </section>
  )
}
