import { useMemo, useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronUp, CircleX, WalletCards } from 'lucide-react'

export function BookingList({ bookings, courtsById, onSettleOrder, onCancelOrder }) {
  const orders = useMemo(() => {
    const map = new Map()
    for (const booking of bookings) {
      const orderId = booking.order_id || `single-${booking.id}`
      if (!map.has(orderId)) {
        map.set(orderId, {
          orderId,
          contactName: booking.contact_name,
          memberName: booking.member_name,
          courtName: booking.court_name,
          status: booking.status,
          totalOriginal: 0,
          totalPayable: 0,
          slots: [],
          createdAt: booking.created_at,
        })
      }
      const order = map.get(orderId)
      order.totalOriginal += booking.original_amount
      order.totalPayable += booking.payable_amount
      order.slots.push(booking)
      if (booking.status !== order.status) {
        if (booking.status === 'pending' || order.status === 'pending') order.status = 'pending'
        else if (booking.status === 'paid' || order.status === 'paid') order.status = 'paid'
      }
    }
    return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [bookings])

  const [confirmOrder, setConfirmOrder] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  function handleSettleClick(order) {
    setConfirmOrder(order)
    setConfirmAction('settle')
  }

  function handleCancelClick(order) {
    setConfirmOrder(order)
    setConfirmAction('cancel')
  }

  function closeConfirm() {
    setConfirmOrder(null)
    setConfirmAction(null)
  }

  async function handleConfirm() {
    if (!confirmOrder || !confirmAction) return
    try {
      if (confirmAction === 'settle') {
        await onSettleOrder(confirmOrder.orderId)
      } else if (confirmAction === 'cancel') {
        await onCancelOrder(confirmOrder.orderId)
      }
    } finally {
      closeConfirm()
    }
  }

  const pendingCount = confirmOrder
    ? confirmOrder.slots.filter((s) => s.status === 'pending').length
    : 0

  return (
    <section className="panel">
      <div className="section-title">
        <WalletCards size={18} />
        <h2>预约订单</h2>
        <span className="order-count">共 {orders.length} 单</span>
      </div>
      <div className="booking-list">
        {orders.length === 0 ? (
          <div className="empty-state">暂无预约订单</div>
        ) : (
          orders.map((order) => (
            <OrderItem
              key={order.orderId}
              order={order}
              onSettle={handleSettleClick}
              onCancel={handleCancelClick}
            />
          ))
        )}
      </div>

      {confirmOrder && (
        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>
              {confirmAction === 'settle' ? '确认结算' : '确认取消'}
            </h3>
            <p className="confirm-desc">
              {confirmAction === 'settle'
                ? `确定要结算订单 ${confirmOrder.orderId} 吗？`
                : `确定要取消订单 ${confirmOrder.orderId} 吗？`}
            </p>
            {confirmAction === 'settle' && (
              <p className="confirm-detail">
                共 {pendingCount} 个待结算时段，合计 ¥{confirmOrder.totalPayable.toFixed(2)}
              </p>
            )}
            {confirmAction === 'cancel' && (
              <p className="confirm-detail">
                已支付的时段将无法取消，仅取消待结算的 {pendingCount} 个时段
              </p>
            )}
            <div className="confirm-actions">
              <button className="btn-secondary" onClick={closeConfirm}>
                再想想
              </button>
              <button className="btn-primary" onClick={handleConfirm}>
                {confirmAction === 'settle' ? '确认结算' : '确认取消'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function OrderItem({ order, onSettle, onCancel }) {
  const [expanded, setExpanded] = useState(false)
  const isAllCanceled = order.slots.every((s) => s.status === 'canceled')
  const isAllPaid = order.slots.every((s) => s.status === 'paid')
  const hasPending = order.slots.some((s) => s.status === 'pending')
  const pendingCount = order.slots.filter((s) => s.status === 'pending').length

  const displayStatus = isAllCanceled ? 'canceled' : isAllPaid ? 'paid' : 'pending'

  return (
    <article className={`order-item ${displayStatus}`}>
      <div className="order-head" onClick={() => setExpanded(!expanded)}>
        <div className="order-main">
          <div>
            <strong>{order.contactName}</strong>
            <span className="order-id">{order.orderId}</span>
          </div>
          <span className="order-meta">
            {order.courtName} · {order.memberName} · {order.slots.length} 个时段
          </span>
        </div>
        <div className="amount-block">
          <span>合计 ¥{order.totalOriginal.toFixed(2)}</span>
          <strong>实付 ¥{order.totalPayable.toFixed(2)}</strong>
        </div>
        <div className={`status-pill ${displayStatus}`}>
          {displayStatus === 'pending' && '待结算'}
          {displayStatus === 'paid' && '已支付'}
          {displayStatus === 'canceled' && '已取消'}
        </div>
        <div className="row-actions">
          {hasPending && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSettle(order)
              }}
              title={pendingCount > 1 ? '整单结算' : '结算'}
            >
              <BadgeCheck size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCancel(order)
            }}
            disabled={isAllCanceled || isAllPaid}
            title="整单取消"
          >
            <CircleX size={16} />
          </button>
          <button
            type="button"
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="order-slots">
          {order.slots.map((slot) => (
            <div key={slot.id} className={`slot-row ${slot.status}`}>
              <span className="slot-time-text">{slot.slot_label}</span>
              <span className="slot-court">{slot.court_name}</span>
              <span className="slot-price">¥{slot.payable_amount.toFixed(2)}</span>
              <span className={`slot-status-mini ${slot.status}`}>
                {slot.status === 'pending' && '待结算'}
                {slot.status === 'paid' && '已支付'}
                {slot.status === 'canceled' && '已取消'}
              </span>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}
