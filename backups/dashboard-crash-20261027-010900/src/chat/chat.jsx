import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useConvexConnectionState, useMutation, usePaginatedQuery, useQuery } from 'convex/react'
import { Archive, ArrowDown, ArrowLeft, CheckCheck, ChevronRight, LoaderCircle, MessageCircle, Plus, Search, Send, Settings2, ShieldCheck, UsersRound, WifiOff, X } from 'lucide-react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../auth/session.jsx'
import cinifixLogo from '../assets/cinifix.jpg'
import './chat.css'

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const fullDateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const errorText = error => typeof error?.data === 'string' ? error.data : 'Unable to complete this request. Check your connection and try again.'
const initials = name => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
function stamp(value) { return new Date(value).toDateString() === new Date().toDateString() ? timeFormat.format(value) : dateFormat.format(value) }
function Avatar({ person, group = false }) {
  return <span className={`chat-avatar${group ? ' chat-avatar-group' : ''}`} aria-hidden="true">{group ? <UsersRound size={21} /> : initials(person?.name || 'CINIFIX')}<i className={`chat-presence${person?.online ? ' online' : ''}`} hidden={group} /></span>
}
function Rank({ role }) { return role === 'admin' ? <span className="chat-rank" title="Official CINIFIX Administrator"><ShieldCheck size={10} aria-hidden="true" />Admin</span> : null }
function IconButton({ label, children, ...props }) { return <button className="chat-icon" type="button" title={label} aria-label={label} {...props}>{children}</button> }
function ErrorNotice({ children }) { return children ? <p className="chat-error" role="alert">{children}</p> : null }
function Empty({ title, children }) { return <div className="chat-empty"><span className="chat-empty-icon"><MessageCircle size={28} strokeWidth={1.4} /></span><h3>{title}</h3><p>{children}</p></div> }
function useAllPages(result) {
  const { status, loadMore } = result
  useEffect(() => { if (status === 'CanLoadMore') loadMore(50) }, [status, loadMore])
}
class ChatBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="chat-failed" role="dialog" aria-modal="true" aria-label="Conversation unavailable"><Empty title="Conversation unavailable">Your access or session may have changed. Return to messages and try again.</Empty><button className="chat-secondary task-modal-close" onClick={this.props.onBack}>Back to messages</button></div> : this.props.children }
}

export default function ChatLauncher() {
  const user = useCurrentUser()
  return user ? <ChatController user={user} /> : null
}
function ChatController({ user }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [mobileThread, setMobileThread] = useState(false)
  const conversations = usePaginatedQuery(api.chat.conversations.list, {}, { initialNumItems: 50 })
  const self = useQuery(api.chat.conversations.self, {})
  useAllPages(conversations)
  const connection = useConvexConnectionState()
  const heartbeat = useMutation(api.chat.presence.heartbeat)
  const disconnect = useMutation(api.chat.presence.disconnect)
  const [tabId] = useState(() => crypto.randomUUID())
  const launcher = useRef(null)
  const rows = [...conversations.results].sort((a, b) => b.updatedAt - a.updatedAt)
  const unread = rows.reduce((sum, row) => sum + row.unread, 0)
  useEffect(() => {
    if (!connection.isWebSocketConnected) return
    const beat = () => { heartbeat({ tabId }).catch(() => {}) }
    const leave = () => { disconnect({ tabId }).catch(() => {}) }
    beat()
    const interval = window.setInterval(beat, 30000)
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', beat)
    document.addEventListener('visibilitychange', beat)
    return () => { window.clearInterval(interval); window.removeEventListener('pagehide', leave); window.removeEventListener('pageshow', beat); document.removeEventListener('visibilitychange', beat); leave() }
  }, [connection.isWebSocketConnected, heartbeat, disconnect, tabId])
  function choose(id) { setSelected(id); setMobileThread(true) }
  function close() { setOpen(false); window.requestAnimationFrame(() => launcher.current?.focus()) }
  const selectedPresent = rows.some(row => row._id === selected)
  return <>
    <button ref={launcher} type="button" className={`chat-launcher${unread ? ' has-unread' : ''}`} onClick={() => setOpen(!open)} aria-label={`${open ? 'Close' : 'Open'} Messages${unread ? `, ${unread} unread` : ''}`} aria-expanded={open} aria-controls="cinifix-messages"><MessageCircle size={29} strokeWidth={1.8} /><span className="chat-tooltip">Open Messages</span>{unread > 0 && <span className="chat-launcher-count">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && createPortal(<ChatWorkspace user={{ ...user, online: self?.online ?? false }} rows={rows} loading={conversations.status !== 'Exhausted'} selected={selectedPresent ? selected : null} mobileThread={mobileThread && selectedPresent} choose={choose} back={() => setMobileThread(false)} close={close} connected={connection.isWebSocketConnected} />, document.querySelector('.admin-shell') ?? document.body)}
  </>
}
function ChatWorkspace({ user, rows, loading, selected, mobileThread, choose, back, close, connected }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(null)
  const searchRef = useRef(null)
  useEffect(() => { searchRef.current?.focus() }, [])
  const visible = rows.filter(row => (filter === 'all' || row.type === filter) && `${row.name} ${row.description}`.toLowerCase().includes(search.toLowerCase()))
  return <div className="chat-backdrop">
    <section id="cinifix-messages" className={`chat-panel${mobileThread ? ' is-thread' : ''}`} role="dialog" aria-modal="true" aria-labelledby="chat-heading">
      <div className="chat-workspace" inert={Boolean(modal)}>
        <aside className="chat-sidebar">
          <header className="chat-sidebar-header"><div className="chat-brandline"><img src={cinifixLogo} width="25" height="25" alt="" /><span>CINIFIX CONNECT</span><IconButton label="Close messages" className="chat-icon task-modal-close" onClick={close}><X size={18} /></IconButton></div><div className="chat-title-row"><div><p>YOUR PEOPLE. ONE SPACE.</p><h2 id="chat-heading">Messages<span>.</span></h2></div><button className="chat-new" title="New Message" aria-label="New Message" onClick={() => setModal('direct')}><Plus size={21} /></button></div>
            <label className="chat-search"><Search size={16} aria-hidden="true" /><input ref={searchRef} placeholder="Search conversations" aria-label="Search conversations" value={search} onChange={e => setSearch(e.target.value)} /></label>
            <div className="chat-filters" role="group" aria-label="Filter conversations">{[['all', 'All'], ['direct', 'Direct'], ['group', 'Groups']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>)}</div>
          </header>
          <div className="chat-conversations"><p className="chat-section-label">RECENT CONVERSATIONS <span>{rows.length}</span></p>{visible.map(row => <button key={row._id} className={`chat-conversation${selected === row._id ? ' selected' : ''}`} onClick={() => choose(row._id)} aria-current={selected === row._id ? 'true' : undefined}><Avatar person={row.peer} group={row.type === 'group'} /><span className="chat-conversation-copy"><span className="chat-row-name"><strong>{row.name}</strong>{row.type === 'group' ? <ShieldCheck size={13} className="chat-official" aria-label="Official group" /> : <Rank role={row.peer?.role} />}</span><span className="chat-preview">{row.archived ? 'Archived · ' : ''}{row.lastMessage || 'Start the conversation'}</span></span><span className="chat-row-meta"><time dateTime={new Date(row.updatedAt).toISOString()}>{stamp(row.updatedAt)}</time>{row.unread > 0 && <span className="chat-unread" aria-label={`${row.unread} unread messages`}>{row.unread > 99 ? '99+' : row.unread}</span>}</span></button>)}{loading && <p className="chat-muted" role="status">Loading conversations…</p>}{!loading && !visible.length && <Empty title={search ? 'No conversations found' : 'Make a connection'}>{search ? 'Try another name or group.' : 'Start a message with someone in your workspace.'}</Empty>}</div>
          <footer className="chat-sidebar-footer">{user.role === 'admin' && <button className="chat-create-group" onClick={() => setModal('group')}><Plus size={16} />Create Official Group</button>}<div className="chat-self"><Avatar person={{ ...user, online: connected && user.online }} /><span><strong>{user.name}</strong><small>{connected ? 'Connected to your workspace' : 'Reconnecting…'}</small></span><Rank role={user.role} /></div></footer>
        </aside>
        <div className="chat-thread-wrap">{selected ? <ChatBoundary key={selected} onBack={() => choose(null)}><Thread key={selected} conversationId={selected} user={user} back={back} close={close} connected={connected} manage={() => setModal('manage')} /></ChatBoundary> : <div className="chat-welcome"><div className="chat-welcome-orbit"><img src={cinifixLogo} alt="CINIFIX" width="76" height="76" /><span><MessageCircle size={22} /></span></div><p className="chat-eyebrow">GOOD WORK STARTS WITH A CONVERSATION</p><h3>A little closer.<br /><span>A lot more connected.</span></h3><p>Your people, your ideas, your next great thing.<br />Choose a conversation to get started.</p><button className="chat-primary" onClick={() => setModal('direct')}>Start a conversation<ChevronRight size={16} /></button><div className="chat-welcome-note"><ShieldCheck size={14} />Private to conversation members</div></div>}</div>
      </div>
      {!connected && <div className="chat-connection" role="status"><WifiOff size={14} />Connection interrupted. Messages will update when you reconnect.</div>}
    </section>
    {modal && <ChatBoundary key={`${modal}:${selected}`} onBack={() => setModal(null)}>{modal === 'manage' ? <GroupManager conversationId={selected} user={user} close={() => setModal(null)} onRemoved={back} /> : <NewConversation user={user} group={modal === 'group'} close={() => setModal(null)} choose={id => { choose(id); setModal(null) }} />}</ChatBoundary>}
  </div>
}

function Thread({ conversationId, user, back, close, connected, manage }) {
  const details = useQuery(api.chat.conversations.details, { conversationId })
  const history = usePaginatedQuery(api.chat.messages.list, { conversationId }, { initialNumItems: 40 })
  const send = useMutation(api.chat.messages.send)
  const read = useMutation(api.chat.messages.read)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [newBelow, setNewBelow] = useState(false)
  const scroll = useRef(null)
  const input = useRef(null)
  const nearBottom = useRef(true)
  const initialized = useRef(false)
  const older = useRef(null)
  const readThrough = useRef(0)
  const readPending = useRef(false)
  const pendingSend = useRef(null)
  const sendLocked = useRef(false)
  const latest = history.results[0]?.seq ?? 0
  const oldest = history.results.at(-1)?.seq ?? 0
  const messageCount = history.results.length
  const ready = Boolean(details)
  const messages = [...history.results].reverse()
  const markRead = useCallback(() => {
    const box = scroll.current
    if (!box || box.scrollHeight - box.scrollTop - box.clientHeight > 2 || !latest || !nearBottom.current || document.visibilityState !== 'visible' || !document.hasFocus() || readThrough.current >= latest || readPending.current) return
    readPending.current = true
    read({ conversationId, throughSeq: latest }).then(() => { readThrough.current = latest }).catch(() => {}).finally(() => { readPending.current = false })
  }, [conversationId, latest, read])
  useLayoutEffect(() => {
    const box = scroll.current
    if (!box || !messageCount) return
    if (older.current && oldest < older.current.oldest) { box.scrollTop = older.current.top + box.scrollHeight - older.current.height; older.current = null }
    else if (nearBottom.current || !initialized.current) { box.scrollTop = box.scrollHeight; initialized.current = true }
  }, [messageCount, latest, oldest, ready])
  useEffect(() => {
    markRead()
    const interval = window.setInterval(markRead, 1000)
    window.addEventListener('focus', markRead)
    document.addEventListener('visibilitychange', markRead)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', markRead); document.removeEventListener('visibilitychange', markRead) }
  }, [markRead])
  useEffect(() => { if (ready) input.current?.focus() }, [ready])
  function onScroll() {
    const box = scroll.current
    nearBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 64
    setNewBelow(!nearBottom.current)
    markRead()
  }
  function loadOlder() {
    const box = scroll.current
    older.current = { top: box.scrollTop, height: box.scrollHeight, oldest: messages[0]?.seq ?? 0 }
    nearBottom.current = false
    history.loadMore(40)
  }
  async function submit(event) {
    event?.preventDefault()
    if (!body.trim() || sendLocked.current || !connected || body.length > 10000) return
    sendLocked.current = true
    setSending(true); setError('')
    const attempt = pendingSend.current?.body === body ? pendingSend.current : { body, clientId: crypto.randomUUID() }
    pendingSend.current = attempt
    try {
      await send({ conversationId, ...attempt })
      setBody(''); pendingSend.current = null
      nearBottom.current = true
      window.requestAnimationFrame(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; input.current?.focus() })
    } catch (failure) { setError(errorText(failure)) }
    finally { setSending(false); sendLocked.current = false }
  }
  if (!details) return <Empty title="Opening conversation">Loading your messages…</Empty>
  const readOnly = details.archived || details.peer?.archived
  return <section className="chat-thread" aria-label={`Conversation with ${details.name}`}>
    <header className="chat-thread-header"><span className="chat-mobile-back"><IconButton label="Back to conversations" onClick={back}><ArrowLeft size={20} /></IconButton></span><Avatar person={details.peer} group={details.type === 'group'} /><div className="chat-thread-title"><h3>{details.name}<Rank role={details.peer?.role} /></h3><p>{details.archived ? 'Archived · Read-only' : details.type === 'group' ? `${details.memberCount} members · Official CINIFIX group` : details.peer?.online ? <><i />Online now</> : details.peer?.lastSeen ? `Last seen ${fullDateFormat.format(details.peer.lastSeen)}` : 'Offline'}</p></div>{details.type === 'group' && <IconButton label="View group members and settings" onClick={manage}><Settings2 size={19} /></IconButton>}<IconButton label="Close messages" className="chat-icon task-modal-close" onClick={close}><X size={19} /></IconButton></header>
    {details.type === 'group' && details.description && <p className="chat-description">{details.description}</p>}
    <div className="chat-history" ref={scroll} onScroll={onScroll} tabIndex={0} aria-label="Message history" aria-busy={history.status === 'LoadingFirstPage'}>
      {history.status === 'CanLoadMore' && <button className="chat-load" onClick={loadOlder}>Load older messages</button>}{(history.status === 'LoadingMore' || history.status === 'LoadingFirstPage') && <p className="chat-muted" role="status">Loading messages…</p>}
      {!messages.length && history.status === 'Exhausted' && <Empty title="A fresh conversation">Say hello. Great things start small.</Empty>}
      {messages.map((message, index) => {
        const own = message.senderId === user._id
        const date = new Date(message.createdAt).toDateString()
        const dateBreak = !index || date !== new Date(messages[index - 1].createdAt).toDateString()
        return <div key={message._id}>{dateBreak && <div className="chat-date-divider"><span>{dateFormat.format(message.createdAt)}</span></div>}<article className={`chat-message${own ? ' own' : ''}`}>
          {!own && <Avatar person={message.sender} />}<div className="chat-message-content"><div className="chat-message-byline"><strong>{own ? 'You' : message.sender.name}</strong><Rank role={message.sender.role} /></div><p className="chat-bubble">{message.body}</p><div className="chat-message-meta"><time title={fullDateFormat.format(message.createdAt)} dateTime={new Date(message.createdAt).toISOString()}>{timeFormat.format(message.createdAt)}</time>{own && details.type === 'direct' && <span title={details.peerReadSeq >= message.seq ? 'Read' : 'Sent'} className={details.peerReadSeq >= message.seq ? 'read' : ''}><CheckCheck size={13} />{details.peerReadSeq >= message.seq ? 'Read' : 'Sent'}</span>}</div></div>
        </article></div>
      })}
    </div>
    {newBelow && <button className="chat-jump" onClick={() => { nearBottom.current = true; scroll.current.scrollTop = scroll.current.scrollHeight; setNewBelow(false); markRead() }}><ArrowDown size={14} />Latest messages</button>}
    <form className="chat-composer" onSubmit={submit}><ErrorNotice>{error}</ErrorNotice>{readOnly ? <p className="chat-muted">{details.archived ? 'This group is archived.' : 'This account is archived.'} Message history is still available.</p> : <><div className="chat-composer-row"><textarea ref={input} rows={2} aria-label="Write a message" placeholder={`Message ${details.name}…`} value={body} maxLength={10000} disabled={sending} onChange={e => setBody(e.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); submit() } }} /><button className="chat-send" type="submit" disabled={sending || !body.trim() || !connected} title="Send message" aria-label="Send message">{sending ? <LoaderCircle className="chat-spin" size={19} /> : <Send size={19} />}</button></div><div className="chat-composer-hint"><span>Enter to send <i>·</i> Shift + Enter for a new line</span><span>{body.length.toLocaleString()}/10,000</span></div></>}</form>
  </section>
}

function ModalFrame({ title, close, children }) {
  return <div className="chat-modal-backdrop"><section className="chat-modal" role="dialog" aria-modal="true" aria-labelledby="chat-modal-title"><header><div><p className="chat-eyebrow">CINIFIX CONNECT</p><h3 id="chat-modal-title">{title}</h3></div><button className="chat-icon task-modal-close" aria-label="Close dialog" onClick={close}><X size={19} /></button></header>{children}</section></div>
}
function Directory({ results, search, setSearch, selected, toggle, selfId, disabled, exclude = [], actionLabel = 'Select account' }) {
  const rows = results.filter(person => person._id !== selfId && !exclude.includes(person._id) && person.name.toLowerCase().includes(search.toLowerCase()))
  return <><label className="chat-search"><Search size={16} /><input placeholder="Search people by name" aria-label="Search people" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="chat-directory">{rows.map(person => <button type="button" key={person._id} className={`chat-person${selected?.includes(person._id) ? ' selected' : ''}`} onClick={() => toggle(person._id)} disabled={disabled} aria-label={`${actionLabel}: ${person.name}`} aria-pressed={selected ? selected.includes(person._id) : undefined}><Avatar person={person} /><span><strong>{person.name}<Rank role={person.role} /></strong><small>{person.online ? 'Online now' : 'Offline'}</small></span>{selected ? <span className="chat-checkbox">{selected.includes(person._id) ? '✓' : ''}</span> : <ChevronRight size={17} />}</button>)}{!rows.length && <p className="chat-muted">No matching accounts.</p>}</div></>
}
function NewConversation({ user, group, close, choose }) {
  const people = usePaginatedQuery(api.chat.conversations.directory, {}, { initialNumItems: 50 })
  useAllPages(people)
  const direct = useMutation(api.chat.conversations.direct)
  const createGroup = useMutation(api.chat.groups.create)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [includeAll, setIncludeAll] = useState(false)
  const [future, setFuture] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const locked = useRef(false)
  async function start(id) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try { choose(await direct({ recipientId: id })) } catch (failure) { setError(errorText(failure)) } finally { locked.current = false; setBusy(false) }
  }
  async function submit(event) {
    event.preventDefault()
    if (locked.current) return
    locked.current = true; setBusy(true); setError('')
    try { choose(await createGroup({ name, description, memberIds: includeAll ? [] : selected, includeAllCurrent: includeAll, autoJoin: includeAll && future })) } catch (failure) { setError(errorText(failure)) } finally { locked.current = false; setBusy(false) }
  }
  function toggle(id) {
    if (selected.includes(id)) setSelected(selected.filter(value => value !== id))
    else if (selected.length < 200) setSelected([...selected, id])
    else setError('Select up to 200 people, or include all current users.')
  }
  return <ModalFrame title={group ? 'Create Official Group Chat' : 'Start a conversation'} close={close}><form onSubmit={submit}><ErrorNotice>{error}</ErrorNotice>{group && <><label className="chat-field">Group name<input required maxLength={80} placeholder="Enter official group name" value={name} onChange={e => setName(e.target.value)} /></label><label className="chat-field">Description<textarea rows={2} maxLength={500} placeholder="Describe the purpose of this group" value={description} onChange={e => setDescription(e.target.value)} /></label><label className="chat-option"><input type="checkbox" checked={includeAll} onChange={e => { setIncludeAll(e.target.checked); if (!e.target.checked) setFuture(false) }} /><span><strong>Include All Current Users</strong><small>Every active account, including accounts beyond this list.</small></span></label><label className="chat-option"><input type="checkbox" checked={future} disabled={!includeAll} onChange={e => setFuture(e.target.checked)} /><span><strong>Automatically Include Future Users</strong><small>Only this official organization-wide group.</small></span></label><div className="chat-selection-actions"><span>Group members · {includeAll ? 'All active users' : `${selected.length} selected`}</span><button type="button" onClick={() => { setIncludeAll(true); setSelected([]) }}>Select all eligible users</button><button type="button" onClick={() => { setSelected([]); setIncludeAll(false); setFuture(false) }}>Clear</button></div></>}
    <Directory results={people.results} search={search} setSearch={setSearch} selected={group ? selected : null} toggle={group ? toggle : start} selfId={user._id} disabled={busy || includeAll} />{people.status !== 'Exhausted' && <p className="chat-muted" role="status">Loading account directory…</p>}{group && <footer><p className="chat-muted">You are included as the creating administrator.</p><button className="chat-primary" disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="chat-spin" size={17} /> : <ShieldCheck size={17} />}Create Official Group</button></footer>}</form></ModalFrame>
}
function GroupManager({ conversationId, user, close, onRemoved }) {
  const details = useQuery(api.chat.conversations.details, { conversationId })
  const members = usePaginatedQuery(api.chat.groups.members, { conversationId }, { initialNumItems: 50 })
  const people = usePaginatedQuery(api.chat.conversations.directory, user.role === 'admin' ? {} : 'skip', { initialNumItems: 50 })
  useAllPages(members); useAllPages(people)
  const update = useMutation(api.chat.groups.update)
  const membership = useMutation(api.chat.groups.membership)
  const archive = useMutation(api.chat.groups.archive)
  const [name, setName] = useState(null)
  const [description, setDescription] = useState(null)
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const locked = useRef(false)
  async function run(operation, success) {
    if (locked.current) return
    locked.current = true; setBusy(true); setError(''); setNotice('')
    try { await operation(); setNotice(success) } catch (failure) { setError(errorText(failure)) } finally { locked.current = false; setBusy(false) }
  }
  const admin = user.role === 'admin' && !details?.archived
  return <ModalFrame title={admin ? 'Official group settings' : 'Group members'} close={close}><ErrorNotice>{error}</ErrorNotice>{notice && <p className="chat-success" role="status">{notice}</p>}{!details ? <p className="chat-muted">Loading group…</p> : <>{admin ? <form onSubmit={e => { e.preventDefault(); run(() => update({ conversationId, name: name ?? details.name, description: description ?? details.description }), 'Group details saved.') }}><label className="chat-field">Group name<input required maxLength={80} value={name ?? details.name} onChange={e => setName(e.target.value)} /></label><label className="chat-field">Description<textarea rows={2} maxLength={500} value={description ?? details.description} onChange={e => setDescription(e.target.value)} /></label><button className="chat-secondary" disabled={busy}>Save details</button></form> : <p className="chat-muted">{details.description}</p>}
    <div className="chat-selection-actions"><strong>Members · {members.results.length}{members.status !== 'Exhausted' ? '+' : ''}</strong>{admin && <button onClick={() => setAdding(!adding)}>{adding ? 'View members' : '+ Add members'}</button>}</div>
    {adding ? <Directory results={people.results} search={search} setSearch={setSearch} exclude={members.results.map(person => person._id)} toggle={id => run(() => membership({ conversationId, userId: id, active: true }), 'Member added.')} disabled={busy || members.status !== 'Exhausted'} actionLabel="Add member" /> : <><label className="chat-search"><Search size={16} /><input aria-label="Search group members" placeholder="Search members" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="chat-directory">{members.results.filter(person => person.name.toLowerCase().includes(search.toLowerCase())).map(person => <div key={person._id} className="chat-person"><Avatar person={person} /><span><strong>{person.name}<Rank role={person.role} /></strong><small>{person.archived ? 'Archived account' : person.online ? 'Online now' : 'Offline'}</small></span>{admin && <button className="chat-remove" disabled={busy} aria-label={`Remove ${person.name}`} onClick={() => run(async () => { await membership({ conversationId, userId: person._id, active: false }); if (person._id === user._id) { close(); onRemoved() } }, 'Member removed.')}>Remove</button>}</div>)}</div></>}
    {members.status !== 'Exhausted' && <p className="chat-muted" role="status">Loading all members…</p>}{admin && <footer className="chat-archive">{confirmArchive ? <><p>Archive this group? Members keep access to its read-only history.</p><button className="chat-danger" disabled={busy} onClick={() => run(async () => { await archive({ conversationId }); close() }, 'Group archived.')}>Confirm archive</button><button className="chat-secondary" onClick={() => setConfirmArchive(false)}>Cancel</button></> : <button className="chat-remove" onClick={() => setConfirmArchive(true)}><Archive size={15} />Archive group</button>}</footer>}</>}</ModalFrame>
}
