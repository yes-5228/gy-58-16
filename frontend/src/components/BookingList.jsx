import { useMemo, useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronUp, CircleX, WalletCards } from 'lucide-react'

export function BookingList({ bookings, courtsById, onSettle, onCancelOrder }) {
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
              onSettle={onSettle}
              onCancelOrder={onCancelOrder}
            />
          ))
        )}
      </div>
    </section>
  )
}

function OrderItem({ order, onSettle, onCancelOrder }) {
  const [expanded, setExpanded] = useState(false)
  const isAllCanceled = order.slots.every((s) => s.status === 'canceled')
  const isAllPaid = order.slots.every((s) => s.status === 'paid')
  const hasPending = order.slots.some((s) => s.status === 'pending')

  const displayStatus = isAllCanceled ? 'canceled' : isAllPaid ? 'paid' : 'pending'

  const pendingBookings = order.slots.filter((s) => s.status === 'pending')

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
          {pendingBookings.length === 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onSettle(pendingBookings[0].id)
              }}
              disabled={!hasPending}
              title="结算"
            >
              <BadgeCheck size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCancelOrder(order.orderId)
            }}
            disabled={isAllCanceled}
            title="整单取消"
          >
            <CircleX size={16} />
          </button>
          <button type="button" className="expand-btn" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}>
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
