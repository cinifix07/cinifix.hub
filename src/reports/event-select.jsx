import { useId, useState } from 'react'
import { Search } from 'lucide-react'

export default function EventSelect({ events, value, onChange, allowNew = false, disabled = false }) {
  const [search, setSearch] = useState('')
  const selectId = useId()
  const matches = events.filter((event) => event._id === value || event.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  return <div className="report-event-picker">
    <div className="report-event-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search event options" placeholder="Search events…" value={search} onChange={(event) => setSearch(event.target.value)} disabled={disabled} /></div>
    <label htmlFor={selectId} className="dashboard-sr-only">Choose an event</label>
    <select id={selectId} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      <option value="">No event selected</option>
      {matches.map((event) => <option key={event._id} value={event._id}>{event.name} · {event.createdBy}</option>)}
      {allowNew && <option value="new">+ Create a new event</option>}
    </select>
    {search && matches.length === 0 && <small>No matching events.</small>}
  </div>
}
