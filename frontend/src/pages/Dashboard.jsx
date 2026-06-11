import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client.js'
import { BookingForm } from '../components/BookingForm.jsx'
import { BookingList } from '../components/BookingList.jsx'
import { CourtSchedule } from '../components/CourtSchedule.jsx'
import { DateTabs } from '../components/DateTabs.jsx'
import { Header } from '../components/Header.jsx'
import { todayISO } from '../utils/date.js'

export function Dashboard() {
  const [courts, setCourts] = useState([])
  const [members, setMembers] = useState([])
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [selectedDate, setSelectedDate] = useState(todayISO())
  const [selectedSlots, setSelectedSlots] = useState([])
  const [contactName, setContactName] = useState('')
  const [memberId, setMemberId] = useState('1')
  const [message, setMessage] = useState('')

  async function loadBaseData() {
    const [courtData, memberData, bookingData] = await Promise.all([
      api.getCourts(),
      api.getMembers(),
      api.getBookings(),
    ])
    setCourts(courtData)
    setMembers(memberData)
    setBookings(bookingData)
  }

  async function loadSlots(date) {
    const slotData = await api.getTimeSlots(date)
    setSlots(slotData)
    setSelectedSlots([])
  }

  useEffect(() => {
    loadBaseData().catch((error) => setMessage(error.message))
  }, [])

  useEffect(() => {
    loadSlots(selectedDate).catch((error) => setMessage(error.message))
  }, [selectedDate])

  const courtsById = useMemo(
    () => Object.fromEntries(courts.map((court) => [court.id, court])),
    [courts],
  )

  const stats = useMemo(
    () => ({
      available: slots.filter((slot) => slot.status === 'available').length,
      pending: bookings.filter((booking) => booking.status === 'pending').length,
      paid: bookings.filter((booking) => booking.status === 'paid').length,
    }),
    [slots, bookings],
  )

  async function refresh() {
    await Promise.all([loadSlots(selectedDate), loadBaseData()])
  }

  function handleSelectSlot(slot) {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.id === slot.id)
      if (exists) {
        return prev.filter((s) => s.id !== slot.id)
      }
      return [...prev, slot]
    })
  }

  function handleRemoveSlot(slotId) {
    setSelectedSlots((prev) => prev.filter((s) => s.id !== slotId))
  }

  function handleClearSlots() {
    setSelectedSlots([])
  }

  async function handleCreateBooking(event) {
    event.preventDefault()
    if (selectedSlots.length === 0) return
    try {
      const slotIds = selectedSlots.map((s) => s.id)
      await api.createBatchBooking({
        slot_ids: slotIds,
        member_id: Number(memberId),
        contact_name: contactName.trim(),
      })
      setMessage(`包场预约成功，共 ${slotIds.length} 个时段`)
      setContactName('')
      await refresh()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleToggleBlock(slot) {
    const status = slot.status === 'blocked' ? 'available' : 'blocked'
    try {
      await api.updateTimeSlot(slot.id, { status })
      await loadSlots(selectedDate)
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleSettle(bookingId) {
    await api.settleBooking(bookingId)
    await refresh()
  }

  async function handleSettleOrder(orderId) {
    try {
      const result = await api.settleOrder(orderId)
      let msg = `已结算 ${result.success_count} 个时段`
      if (result.skipped_count > 0) {
        msg += `，${result.skipped_count} 个时段跳过（${result.skipped_items.map((i) => i.slot_label + ': ' + i.reason).join('；')}）`
      }
      setMessage(msg)
      await refresh()
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function handleCancel(bookingId) {
    await api.cancelBooking(bookingId)
    await refresh()
  }

  async function handleCancelOrder(orderId) {
    try {
      const result = await api.cancelOrder(orderId)
      let msg = `已取消 ${result.success_count} 个时段`
      if (result.skipped_count > 0) {
        msg += `，${result.skipped_count} 个时段无法取消（${result.skipped_items.map((i) => i.slot_label + ': ' + i.reason).join('；')}）`
      }
      setMessage(msg)
      await refresh()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const selectedSlotIds = selectedSlots.map((s) => s.id)

  return (
    <main className="app-shell">
      <Header stats={stats} />
      <DateTabs selectedDate={selectedDate} onChange={setSelectedDate} />
      {message && <div className="notice">{message}</div>}
      <div className="main-grid">
        <CourtSchedule
          courts={courts}
          slots={slots}
          selectedSlotIds={selectedSlotIds}
          onSelectSlot={handleSelectSlot}
          onToggleBlock={handleToggleBlock}
        />
        <div className="side-stack">
          <BookingForm
            members={members}
            selectedSlots={selectedSlots}
            contactName={contactName}
            memberId={memberId}
            onContactName={setContactName}
            onMemberId={setMemberId}
            onSubmit={handleCreateBooking}
            onRemoveSlot={handleRemoveSlot}
            onClearSlots={handleClearSlots}
          />
          <BookingList
            bookings={bookings}
            courtsById={courtsById}
            onSettleOrder={handleSettleOrder}
            onCancelOrder={handleCancelOrder}
          />
        </div>
      </div>
    </main>
  )
}
