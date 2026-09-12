import { useMemo, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Clock3,
  Compass,
  Flag,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Megaphone,
  Menu,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  getGetIssuesQueryKey,
  useCreateIssue,
  useDemoAuth,
  useGetAnnouncements,
  useGetAssignments,
  useGetClubs,
  useGetDashboard,
  useGetDeadlines,
  useGetEvents,
  useGetIssues,
  useGetOpportunities,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';

const queryClient = new QueryClient();
const roleOptions = ['Student', 'Faculty', 'Club President', 'Club Vice President', 'Administrator'] as const;
type Role = typeof roleOptions[number];
const roleProfiles: Record<Role, { name: string; email: string; initials: string }> = {
  Student: { name: 'Aarav Mehta', email: 'aarav.mehta@demo.campussync', initials: 'AM' },
  Faculty: { name: 'Dr. Maya Rao', email: 'maya.rao@demo.campussync', initials: 'MR' },
  'Club President': { name: 'Riya Kapoor', email: 'riya.kapoor@demo.campussync', initials: 'RK' },
  'Club Vice President': { name: 'Kabir Shah', email: 'kabir.shah@demo.campussync', initials: 'KS' },
  Administrator: { name: 'Nisha Iyer', email: 'nisha.iyer@demo.campussync', initials: 'NI' },
};

function readStoredIds(key: string) {
  if (typeof window === 'undefined') return new Set<number>();
  try {
    const stored = JSON.parse(window.localStorage.getItem(key) ?? '[]');
    return new Set<number>(Array.isArray(stored) ? stored.filter((value): value is number => typeof value === 'number') : []);
  } catch {
    return new Set<number>();
  }
}

function writeStoredIds(key: string, ids: Set<number>) {
  window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
}

const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/clubs', label: 'Clubs & societies', icon: Users },
  { href: '/calendar', label: 'Campus calendar', icon: CalendarDays },
  { href: '/deadlines', label: 'Deadlines', icon: Clock3 },
  { href: '/opportunities', label: 'Opportunities', icon: Compass },
  { href: '/assignments', label: 'Assignments', icon: BookOpen },
  { href: '/issues', label: 'Campus issues', icon: CircleAlert },
  { href: '/assistant', label: 'Campus assistant', icon: Bot },
];

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
}

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-label="Loading" />;
}

function QueryState({
  loading,
  error,
  empty,
  onRetry,
  children,
}: {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="space-y-3" data-testid="state-loading">
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-20 w-11/12" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-14 text-center" data-testid="state-error">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--accent)/.15)] text-[hsl(var(--accent))]"><CircleAlert size={22} /></div>
        <h3 className="font-display text-xl font-semibold">That signal went quiet.</h3>
        <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))]">We could not load this part of campus right now. Try the connection once more.</p>
        <button type="button" className="action-btn action-secondary" onClick={onRetry} data-testid="button-retry">Try again</button>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="surface flex flex-col items-center justify-center gap-3 px-6 py-14 text-center" data-testid="state-empty">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]"><Sparkles size={20} /></div>
        <h3 className="font-display text-xl font-semibold">Nothing here yet.</h3>
        <p className="max-w-sm text-sm text-[hsl(var(--muted-foreground))]">Fresh campus signals will land here when they are ready.</p>
      </div>
    );
  }
  return <>{children}</>;
}

function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const demoAuth = useDemoAuth();
  const [role, setRole] = useState<Role>(() => {
    if (typeof window === 'undefined') return 'Student';
    const stored = window.localStorage.getItem('campussync-demo-role') as Role | null;
    return stored && roleOptions.includes(stored) ? stored : 'Student';
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profile = demoAuth.data ?? roleProfiles[role];

  const updateRole = (nextRole: Role) => {
    setRole(nextRole);
    window.localStorage.setItem('campussync-demo-role', nextRole);
    demoAuth.mutate({ data: { role: nextRole } });
  };

  return (
    <div className="app-shell">
      <div className="mobile-topbar">
        <Link href="/" className="flex items-center gap-2" data-testid="link-mobile-brand">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span className="font-display text-lg font-semibold">CampusSync</span>
        </Link>
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg bg-[hsl(var(--sidebar-accent))]" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Toggle navigation" data-testid="button-toggle-navigation">
          {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      <aside className={`sidebar-shell ${mobileNavOpen ? '!flex !fixed inset-0 z-30 w-full' : ''}`}>
        <div className="mb-9 flex items-center gap-3 px-2">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <div>
            <Link href="/" className="font-display text-[19px] font-semibold tracking-tight" data-testid="link-brand">CampusSync</Link>
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.48)]">your campus, in sync</p>
          </div>
        </div>
        <p className="mb-3 px-3 font-mono text-[9px] uppercase tracking-[.15em] text-[hsl(var(--sidebar-foreground)/.38)]">Navigate</p>
        <nav className="space-y-1" aria-label="Primary navigation">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${location === href ? 'active' : ''}`} onClick={() => setMobileNavOpen(false)} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
              <Icon size={17} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
            <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[hsl(var(--sidebar-foreground)/.46)]">Demo session</p>
            <label className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold" htmlFor="role-select">
              <span className="text-[hsl(var(--sidebar-foreground)/.8)]">Viewing as</span>
              {demoAuth.isPending && <LoaderCircle size={13} className="animate-spin text-[hsl(var(--primary))]" />}
            </label>
            <div className="relative mt-2">
              <select id="role-select" className="select-field appearance-none border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar)/.7)] pr-8 text-xs text-[hsl(var(--sidebar-foreground))]" value={role} onChange={(event) => updateRole(event.target.value as Role)} data-testid="select-demo-role">
                {roleOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3 text-[hsl(var(--sidebar-foreground)/.5)]" />
            </div>
            <p className="mt-2 text-[10px] leading-4 text-[hsl(var(--sidebar-foreground)/.48)]" data-testid="text-current-role">Session synced as {role}.</p>
          </div>
          <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] pt-4">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[hsl(var(--primary))] font-display text-sm font-bold text-[hsl(var(--primary-foreground))]">{profile.initials}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{profile.name}</p>
              <p className="truncate text-[10px] text-[hsl(var(--sidebar-foreground)/.48)]">{profile.email}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="main-shell">{children}</main>
    </div>
  );
}

function PageFrame({ eyebrow, title, subtitle, action, children }: { eyebrow: string; title: string; subtitle: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="content-wrap">
      <header className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div className="stagger-in">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle mt-3">{subtitle}</p>
        </div>
        {action && <div className="stagger-in delay-1">{action}</div>}
      </header>
      {children}
    </div>
  );
}

function DashboardPage() {
  const dashboard = useGetDashboard();
  const data = dashboard.data;
  return (
    <PageFrame
      eyebrow="Monday · March 16, 2026"
      title={`Good morning${data?.user?.name ? `, ${data.user.name.split(' ')[0]}` : ''}.`}
      subtitle="A quick read on what needs your attention, what is moving on campus, and where to show up next."
      action={<Link href="/announcements" className="action-btn action-primary" data-testid="link-dashboard-announcements">Read campus brief <ArrowRight size={15} /></Link>}
    >
      <QueryState loading={dashboard.isLoading} error={dashboard.isError} onRetry={() => dashboard.refetch()}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(data?.stats ?? []).map((stat, index) => (
            <div key={stat.label} className={`surface stat-card stagger-in delay-${Math.min(index + 1, 4)}`} style={{ '--tone': stat.tone.includes('coral') ? '7 78% 64%' : stat.tone.includes('teal') ? '186 33% 55%' : '39 96% 62%' } as CSSProperties} data-testid={`card-stat-${index}`}>
              <p className="eyebrow">{stat.label}</p>
              <p className="mt-3 font-display text-4xl font-semibold tracking-tight">{stat.value}</p>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{stat.detail}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
          <section className="surface stagger-in delay-2 p-5 md:p-7" data-testid="section-dashboard-announcements">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="eyebrow mb-2">Verified on campus</p><h2 className="font-display text-2xl font-semibold">The campus brief</h2></div>
              <Link href="/announcements" className="action-btn action-quiet" data-testid="link-view-all-announcements">View all <ArrowRight size={14} /></Link>
            </div>
            <div>
              {(data?.announcements ?? []).slice(0, 4).map((item) => (
                <article className="data-row surface-hover flex gap-4 rounded-xl px-2" key={item.id} data-testid={`row-announcement-${item.id}`}>
                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.isPinned ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary-foreground)/.28)]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2"><span className="badge badge-cool">{item.category}</span>{item.isPinned && <span className="badge badge-warm">Pinned</span>}</div>
                    <h3 className="font-display text-lg font-semibold leading-tight">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.summary}</p>
                    <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{item.source} · {formatDate(item.publishedAt)}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <div className="space-y-6">
            <section className="surface stagger-in delay-3 p-5 md:p-6" data-testid="section-dashboard-events">
              <div className="mb-5 flex items-start justify-between"><div><p className="eyebrow mb-2">Next up</p><h2 className="font-display text-2xl font-semibold">On your radar</h2></div><Link href="/calendar" className="text-xs font-bold text-[hsl(var(--accent))]" data-testid="link-view-calendar">Calendar <ArrowRight size={13} className="ml-1 inline" /></Link></div>
              {(data?.events ?? []).slice(0, 3).map((event) => <EventRow key={event.id} event={event} />)}
            </section>
            <section className="surface stagger-in delay-4 p-5 md:p-6" data-testid="section-dashboard-deadlines">
              <div className="mb-5 flex items-start justify-between"><div><p className="eyebrow mb-2">Keep moving</p><h2 className="font-display text-2xl font-semibold">Deadlines</h2></div><Link href="/deadlines" className="text-xs font-bold text-[hsl(var(--accent))]" data-testid="link-view-deadlines">Open list <ArrowRight size={13} className="ml-1 inline" /></Link></div>
              {(data?.deadlines ?? []).slice(0, 3).map((deadline) => <DeadlineRow key={deadline.id} deadline={deadline} />)}
            </section>
          </div>
        </div>
      </QueryState>
    </PageFrame>
  );
}

function EventRow({ event }: { event: { id: number; title: string; date: string; time: string; location: string; category: string; color: string } }) {
  const parsed = new Date(event.date);
  return (
    <div className="mb-3 flex gap-3" data-testid={`row-event-${event.id}`}>
      <div className="calendar-strip" style={{ borderTop: `3px solid ${event.color || 'hsl(39 96% 62%)'}` }}><span className="font-mono text-[9px] uppercase opacity-70">{Number.isNaN(parsed.getTime()) ? 'UP' : new Intl.DateTimeFormat('en', { month: 'short' }).format(parsed)}</span><strong>{Number.isNaN(parsed.getTime()) ? '—' : parsed.getDate()}</strong></div>
      <div className="min-w-0 pt-1"><span className="badge badge-coral">{event.category}</span><h3 className="mt-1 truncate text-sm font-bold">{event.title}</h3><p className="mt-1 truncate text-xs text-[hsl(var(--muted-foreground))]">{event.time} · {event.location}</p></div>
    </div>
  );
}

function DeadlineRow({ deadline }: { deadline: { id: number; title: string; course: string; dueDate: string; dueLabel: string; status: string; priority: string } }) {
  return <div className="data-row flex items-center gap-3" data-testid={`row-deadline-${deadline.id}`}><div className={`h-2.5 w-2.5 rounded-full ${deadline.priority.toLowerCase().includes('high') ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{deadline.title}</p><p className="mt-1 truncate font-mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{deadline.course} · {deadline.dueLabel || formatDate(deadline.dueDate)}</p></div><span className="badge badge-ink">{deadline.status}</span></div>;
}

function AnnouncementsPage() {
  const [search, setSearch] = useState('');
  const announcements = useGetAnnouncements(search ? { q: search } : undefined);
  const items = announcements.data ?? [];
  return <PageFrame eyebrow="Campus brief" title="Announcements" subtitle="Verified updates from the people and places that keep Northstar moving." action={<div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" /><input className="input-field pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the brief" data-testid="input-search-announcements" /></div>}>
    <QueryState loading={announcements.isLoading} error={announcements.isError} empty={!items.length} onRetry={() => announcements.refetch()}>
      <div className="space-y-3">{items.map((item, index) => <article key={item.id} className={`surface surface-hover stagger-in delay-${Math.min(index + 1, 4)} p-5 md:p-6`} data-testid={`card-announcement-${item.id}`}><div className="flex flex-col gap-4 md:flex-row md:items-start"><div className="flex flex-1 gap-4"><div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.isPinned ? 'bg-[hsl(var(--primary)/.22)] text-[hsl(var(--primary-foreground))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]'}`}><Megaphone size={18} /></div><div><div className="mb-2 flex flex-wrap gap-2"><span className="badge badge-cool">{item.category}</span>{item.isPinned && <span className="badge badge-warm">Pinned by campus</span>}</div><h2 className="font-display text-xl font-semibold">{item.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.summary}</p><p className="mt-4 font-mono text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{item.source} · published {formatDate(item.publishedAt)}</p></div></div><button type="button" className="action-btn action-quiet self-start" onClick={() => window.alert(`You are viewing: ${item.title}`)} data-testid={`button-open-announcement-${item.id}`}>Open brief <ArrowRight size={14} /></button></div></article>)}</div>
    </QueryState>
  </PageFrame>;
}

function ClubsPage() {
  const clubs = useGetClubs();
  const [filter, setFilter] = useState('All');
  const [interestedClubs, setInterestedClubs] = useState(() => readStoredIds('campussync-interested-clubs'));
  const items = clubs.data ?? [];
  const categories = ['All', ...Array.from(new Set(items.map((club) => club.category)))];
  const filtered = filter === 'All' ? items : items.filter((club) => club.category === filter);
  const toggleInterest = (id: number) => {
    setInterestedClubs((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredIds('campussync-interested-clubs', next);
      return next;
    });
  };
  return <PageFrame eyebrow="Find your people" title="Clubs & societies" subtitle="Small rooms, big interests, and the quickest way to make campus feel like yours." action={<div className="flex flex-wrap gap-2">{categories.slice(0, 4).map((category) => <button type="button" key={category} className={`badge ${filter === category ? 'badge-warm' : 'badge-ink'}`} onClick={() => setFilter(category)} data-testid={`button-filter-club-${category.toLowerCase().replaceAll(' ', '-')}`}>{category}</button>)}</div>}>
    <QueryState loading={clubs.isLoading} error={clubs.isError} empty={!filtered.length} onRetry={() => clubs.refetch()}>
       <div className="grid gap-4 md:grid-cols-2">{filtered.map((club, index) => <article key={club.id} className={`surface surface-hover stagger-in delay-${Math.min(index + 1, 4)} overflow-hidden p-6`} data-testid={`card-club-${club.id}`}><div className="mb-5 flex items-start justify-between"><div className="h-11 w-11 rounded-2xl" style={{ background: club.accent || 'hsl(39 96% 62%)' }} /><span className="badge badge-ink">{club.category}</span></div><h2 className="font-display text-2xl font-semibold">{club.name}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{club.description}</p><div className="mt-6 grid grid-cols-2 gap-3 border-t border-[hsl(var(--border))] pt-4"><div><p className="eyebrow mb-1">Community</p><p className="text-sm font-bold">{club.members} members</p></div><div><p className="eyebrow mb-1">Next meeting</p><p className="text-sm font-bold">{club.nextMeeting}</p></div></div><button type="button" className="action-btn action-secondary mt-5 w-full" onClick={() => toggleInterest(club.id)} data-testid={`button-join-club-${club.id}`}>{interestedClubs.has(club.id) ? 'Interested' : 'I’m interested'} <ArrowRight size={14} /></button></article>)}</div>
    </QueryState>
  </PageFrame>;
}

function CalendarPage() {
  const events = useGetEvents();
  const [plannedEvents, setPlannedEvents] = useState(() => readStoredIds('campussync-planned-events'));
  const items = events.data ?? [];
  const togglePlan = (id: number) => {
    setPlannedEvents((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredIds('campussync-planned-events', next);
      return next;
    });
  };
  return <PageFrame eyebrow="Show up for something" title="Campus calendar" subtitle="The talks, gatherings, and rituals that make a week on campus feel full." action={<Link href="/clubs" className="action-btn action-secondary" data-testid="link-calendar-clubs">Explore clubs <Users size={15} /></Link>}>
    <QueryState loading={events.isLoading} error={events.isError} empty={!items.length} onRetry={() => events.refetch()}>
       <div className="grid gap-4 lg:grid-cols-2">{items.map((event, index) => <article key={event.id} className={`surface surface-hover stagger-in delay-${Math.min(index + 1, 4)} flex gap-4 p-5 md:p-6`} data-testid={`card-event-${event.id}`}><div className="calendar-strip shrink-0" style={{ borderTop: `3px solid ${event.color || 'hsl(39 96% 62%)'}` }}><span className="font-mono text-[9px] uppercase opacity-70">{formatDate(event.date).split(' ')[0]}</span><strong>{new Date(event.date).getDate() || '—'}</strong></div><div className="min-w-0 flex-1"><span className="badge badge-coral">{event.category}</span><h2 className="mt-2 font-display text-2xl font-semibold">{event.title}</h2><div className="mt-4 space-y-2 text-xs text-[hsl(var(--muted-foreground))]"><p className="flex items-center gap-2"><Clock3 size={14} /> {event.time}</p><p className="flex items-center gap-2"><MapPin size={14} /> {event.location}</p></div><button type="button" className="action-btn action-quiet mt-5" onClick={() => togglePlan(event.id)} data-testid={`button-save-event-${event.id}`}>{plannedEvents.has(event.id) ? 'Saved to my plan' : 'Save to my plan'} <Check size={14} /></button></div></article>)}</div>
    </QueryState>
  </PageFrame>;
}

function DeadlinesPage() {
  const deadlines = useGetDeadlines();
  const items = deadlines.data ?? [];
  return <PageFrame eyebrow="Keep your promises to future you" title="Deadlines" subtitle="A softer view of the hard dates. Sort your energy, then make the next move." action={<Link href="/assignments" className="action-btn action-primary" data-testid="link-deadlines-assignments">Open assignments <BookOpen size={15} /></Link>}>
    <QueryState loading={deadlines.isLoading} error={deadlines.isError} empty={!items.length} onRetry={() => deadlines.refetch()}>
      <div className="surface p-5 md:p-7"><div className="mb-4 grid grid-cols-[1fr_auto_auto] gap-4 border-b border-[hsl(var(--border))] pb-3 font-mono text-[9px] uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]"><span>Work to do</span><span>Due</span><span>Status</span></div>{items.map((deadline, index) => <div key={deadline.id} className={`data-row stagger-in delay-${Math.min(index + 1, 4)} grid grid-cols-[1fr_auto_auto] items-center gap-4`} data-testid={`card-deadline-${deadline.id}`}><div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${deadline.priority.toLowerCase().includes('high') ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--primary))]'}`} /><h2 className="truncate text-sm font-bold">{deadline.title}</h2></div><p className="mt-1 pl-4 font-mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{deadline.course} · {deadline.priority} priority</p></div><p className="text-right text-xs font-bold">{deadline.dueLabel || formatDate(deadline.dueDate)}</p><span className={`badge ${deadline.status.toLowerCase().includes('done') ? 'badge-cool' : 'badge-warm'}`}>{deadline.status}</span></div>)}</div>
    </QueryState>
  </PageFrame>;
}

function OpportunitiesPage() {
  const opportunities = useGetOpportunities();
  const [savedOpportunities, setSavedOpportunities] = useState(() => readStoredIds('campussync-saved-opportunities'));
  const items = opportunities.data ?? [];
  const toggleSaved = (id: number) => {
    setSavedOpportunities((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredIds('campussync-saved-opportunities', next);
      return next;
    });
  };
  return <PageFrame eyebrow="A door, slightly open" title="Opportunities" subtitle="Internships, scholarships, and campus roles with enough detail to make a real decision." action={<span className="badge badge-warm"><Sparkles size={12} /> Curated for students</span>}>
    <QueryState loading={opportunities.isLoading} error={opportunities.isError} empty={!items.length} onRetry={() => opportunities.refetch()}>
       <div className="space-y-4">{items.map((item, index) => <article key={item.id} className={`surface surface-hover stagger-in delay-${Math.min(index + 1, 4)} p-5 md:p-7`} data-testid={`card-opportunity-${item.id}`}><div className="flex flex-col justify-between gap-4 md:flex-row"><div className="max-w-3xl"><div className="mb-3 flex flex-wrap gap-2"><span className="badge badge-cool">{item.type}</span><span className="badge badge-ink">{item.tag}</span></div><h2 className="font-display text-2xl font-semibold">{item.title}</h2><p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">{item.organization}</p><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.description}</p></div><div className="flex shrink-0 flex-col items-start gap-3 md:items-end"><div className="text-left md:text-right"><p className="eyebrow mb-1">Apply by</p><p className="font-display text-xl font-semibold">{formatDate(item.deadline)}</p></div><button type="button" className="action-btn action-primary" onClick={() => toggleSaved(item.id)} data-testid={`button-save-opportunity-${item.id}`}>{savedOpportunities.has(item.id) ? 'Saved' : 'Save opportunity'} <Check size={14} /></button></div></div></article>)}</div>
    </QueryState>
  </PageFrame>;
}

function AssignmentsPage() {
  const assignments = useGetAssignments();
  const items = assignments.data ?? [];
  return <PageFrame eyebrow="Your working set" title="Assignments" subtitle="Make the invisible work visible. Pick one thing, move it a little, then pick the next." action={<span className="badge badge-cool"><BookOpen size={12} /> {items.length} active items</span>}>
    <QueryState loading={assignments.isLoading} error={assignments.isError} empty={!items.length} onRetry={() => assignments.refetch()}>
      <div className="grid gap-4 md:grid-cols-2">{items.map((item, index) => <article key={item.id} className={`surface surface-hover stagger-in delay-${Math.min(index + 1, 4)} p-5 md:p-6`} data-testid={`card-assignment-${item.id}`}><div className="flex items-start justify-between gap-3"><span className="badge badge-ink">{item.course}</span><span className={`badge ${item.status.toLowerCase().includes('progress') ? 'badge-warm' : item.status.toLowerCase().includes('done') ? 'badge-cool' : 'badge-coral'}`}>{item.status}</span></div><h2 className="mt-5 font-display text-2xl font-semibold">{item.title}</h2><div className="mt-6 flex items-center justify-between text-xs"><span className="font-mono uppercase text-[hsl(var(--muted-foreground))]">Progress</span><strong>{item.progress}%</strong></div><div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${item.progress}%` }} /></div><div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4"><span className="text-xs text-[hsl(var(--muted-foreground))]">Due {formatDate(item.dueDate)}</span><button type="button" className="action-btn action-quiet" onClick={() => window.alert(`Opening work plan for ${item.title}`)} data-testid={`button-open-assignment-${item.id}`}>Open plan <ArrowRight size={14} /></button></div></article>)}</div>
    </QueryState>
  </PageFrame>;
}

function IssuesPage() {
  const issues = useGetIssues();
  const createIssue = useCreateIssue();
  const [showForm, setShowForm] = useState(false);
  const [justCreated, setJustCreated] = useState<{ title: string; category: string; location: string; description: string; status?: string; id?: number; createdAt?: string; reportedBy?: string } | null>(null);
  const [form, setForm] = useState({ title: '', category: 'Facilities', location: '', description: '' });
  const list = useMemo(() => {
    const existing = issues.data ?? [];
    if (!justCreated) return existing;
    return [justCreated, ...existing.filter((item) => item.id !== justCreated.id)];
  }, [justCreated, issues.data]);
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createIssue.mutate({ data: form }, {
      onSuccess: (created) => {
        setJustCreated(created);
        setForm({ title: '', category: 'Facilities', location: '', description: '' });
        setShowForm(false);
        queryClient.invalidateQueries({ queryKey: getGetIssuesQueryKey() });
      },
    });
  };
  return <PageFrame eyebrow="Make campus better" title="Campus issues" subtitle="See what is being worked on, and report the small friction that should not become everyone’s problem." action={<button type="button" className="action-btn action-primary" onClick={() => setShowForm(!showForm)} data-testid="button-toggle-issue-form">{showForm ? <X size={15} /> : <Flag size={15} />} {showForm ? 'Close report' : 'Report an issue'}</button>}>
    {showForm && <form onSubmit={submit} className="surface mb-6 stagger-in p-5 md:p-7" data-testid="form-create-issue"><div className="mb-6"><p className="eyebrow mb-2">New report</p><h2 className="font-display text-2xl font-semibold">What needs attention?</h2></div><div className="grid gap-4 md:grid-cols-2"><label className="text-xs font-bold">Short title<input className="input-field mt-2" required minLength={2} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="e.g. Printer on level 2 is jammed" data-testid="input-issue-title" /></label><label className="text-xs font-bold">Category<select className="select-field mt-2" value={form.category} onChange={(event) => update('category', event.target.value)} data-testid="select-issue-category"><option>Facilities</option><option>Technology</option><option>Safety</option><option>Accessibility</option><option>Other</option></select></label><label className="text-xs font-bold md:col-span-2">Location<input className="input-field mt-2" required value={form.location} onChange={(event) => update('location', event.target.value)} placeholder="Building, room, or landmark" data-testid="input-issue-location" /></label><label className="text-xs font-bold md:col-span-2">What is happening?<textarea className="textarea-field mt-2" required minLength={5} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Give the team enough context to find and fix it." data-testid="textarea-issue-description" /></label></div><div className="mt-5 flex items-center justify-between gap-3"><p className="text-xs text-[hsl(var(--muted-foreground))]">Your report will be visible to the campus community.</p><button type="submit" className="action-btn action-primary" disabled={createIssue.isPending} data-testid="button-submit-issue">{createIssue.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} {createIssue.isPending ? 'Sending report' : 'Send report'}</button></div>{createIssue.isError && <p className="mt-3 text-xs font-bold text-[hsl(var(--destructive))]" data-testid="status-issue-error">The report did not send. Please try again.</p>}</form>}
    <QueryState loading={issues.isLoading} error={issues.isError} empty={!list.length} onRetry={() => issues.refetch()}>
      <div className="space-y-3">{list.map((item, index) => <article key={`${item.id ?? 'new'}-${index}`} className={`surface surface-hover stagger-in delay-${Math.min(index + 1, 4)} p-5`} data-testid={`card-issue-${item.id ?? `new-${index}`}`}><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="flex gap-4"><div className={`mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.status?.toLowerCase().includes('resolved') ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]' : 'bg-[hsl(var(--primary)/.22)] text-[hsl(var(--primary-foreground))]'}`}><CircleCheck size={19} /></div><div><div className="mb-2 flex flex-wrap gap-2"><span className="badge badge-ink">{item.category}</span><span className={`badge ${item.status?.toLowerCase().includes('resolved') ? 'badge-cool' : 'badge-warm'}`}>{item.status || 'Submitted'}</span></div><h2 className="font-display text-xl font-semibold">{item.title}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"><MapPin size={13} /> {item.location}</p><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{item.description}</p></div></div><p className="shrink-0 font-mono text-[10px] uppercase text-[hsl(var(--muted-foreground))]">{item.createdAt ? formatDate(item.createdAt) : 'Just now'}</p></div></article>)}</div>
    </QueryState>
  </PageFrame>;
}

function AssistantPage() {
  return <PageFrame eyebrow="Coming into focus" title="Campus assistant" subtitle="A future front door for finding your way through campus life. We are building it carefully, with verified information at the center." action={<span className="badge badge-coral"><Bot size={12} /> In staged preview</span>}>
    <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="surface relative overflow-hidden p-6 md:p-10" data-testid="section-assistant-stage">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[hsl(var(--primary)/.18)] blur-3xl" />
        <div className="relative max-w-xl"><span className="brand-mark mb-8 inline-grid h-14 w-14 rounded-2xl"><Bot size={25} /></span><h2 className="font-display text-4xl font-semibold leading-[.98] tracking-tight md:text-6xl">Ask campus.<br /><span className="text-[hsl(var(--accent))]">Get grounded.</span></h2><p className="mt-6 max-w-md text-base leading-7 text-[hsl(var(--muted-foreground))]">When this opens, it will help you navigate the real shape of Northstar — people, places, policies, and the next right step. No pretend answers before it is ready.</p><div className="mt-8 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><Check size={14} /></span><span className="text-sm font-semibold">Verified sources first</span></div><button type="button" className="action-btn action-primary mt-8" onClick={() => window.alert('We will let you know when the assistant is ready.')} data-testid="button-assistant-notify"><Bell size={15} /> Notify me when ready</button></div>
      </section>
      <section className="surface p-6 md:p-7" data-testid="section-assistant-principles"><p className="eyebrow mb-3">Before launch</p><h2 className="font-display text-2xl font-semibold">Built around trust.</h2><div className="mt-6 space-y-1">{['Only campus-verified context', 'Clear source links with every answer', 'A handoff when a person is the better answer'].map((item, index) => <div className="data-row flex gap-3" key={item}><span className="font-mono text-xs text-[hsl(var(--accent))]">0{index + 1}</span><p className="text-sm font-semibold leading-5">{item}</p></div>)}</div><div className="mt-8 rounded-xl bg-[hsl(var(--secondary)/.55)] p-4"><p className="font-mono text-[10px] uppercase tracking-wide text-[hsl(var(--muted-foreground))]">Current stage</p><p className="mt-2 text-sm font-bold">Designing the source layer</p><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">This preview intentionally does not generate answers yet.</p></div></section>
    </div>
  </PageFrame>;
}

function NotFound() {
  return <div className="content-wrap flex min-h-[80dvh] items-center justify-center"><div className="text-center"><p className="eyebrow">404 · Lost signal</p><h1 className="page-title mt-3">That page is not on the map.</h1><Link href="/" className="action-btn action-primary mt-6" data-testid="link-not-found-home">Back to overview <ArrowRight size={15} /></Link></div></div>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><Shell><Switch><Route path="/" component={DashboardPage} /><Route path="/announcements" component={AnnouncementsPage} /><Route path="/clubs" component={ClubsPage} /><Route path="/calendar" component={CalendarPage} /><Route path="/deadlines" component={DeadlinesPage} /><Route path="/opportunities" component={OpportunitiesPage} /><Route path="/assignments" component={AssignmentsPage} /><Route path="/issues" component={IssuesPage} /><Route path="/assistant" component={AssistantPage} /><Route component={NotFound} /></Switch></Shell></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;