/**
 * Available time slots as selectable chips.
 */
export function SlotPicker({ slots = [], value, selectedSlot, onChange, onSelect, loading }) {
  const selected = value ?? selectedSlot ?? null;
  const select = onChange ?? onSelect ?? (() => {});

  if (loading) {
    return (
      <div className="d-flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="placeholder-glow" style={{ width: 72, height: 40, borderRadius: 8 }}>
            <span className="placeholder col-12 h-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!slots.length) {
    return <p className="text-muted mb-0">No open slots on this date. Please choose another day.</p>;
  }

  return (
    <div className="d-flex flex-wrap gap-2" role="listbox" aria-label="Select time slot">
      {slots.map((slot) => {
        const isSelected = selected === slot.slotTime;
        const disabled = !slot.isAvailable;
        return (
          <button
            key={slot.slotTime}
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={disabled}
            className={`btn btn-sm ${
              isSelected ? 'btn-primary' : disabled ? 'btn-outline-secondary' : 'btn-outline-primary'
            }`}
            style={{
              minWidth: 72,
              minHeight: 40,
              ...(isSelected ? { backgroundColor: '#1e40af', borderColor: '#1e40af' } : {}),
            }}
            onClick={() => select(slot.slotTime)}
            title={disabled ? 'Slot full' : `${slot.remainingCapacity} seat(s) left`}
          >
            {slot.slotTime}
          </button>
        );
      })}
    </div>
  );
}

export default SlotPicker;
