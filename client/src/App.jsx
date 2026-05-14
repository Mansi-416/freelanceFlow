import { useEffect, useMemo, useState } from 'react';
import {
  fetchClients,
  fetchProjects,
  fetchTasks,
  fetchTimeEntries,
  fetchInvoices,
  fetchDashboard,
  fetchFinancials,
  createClient,
  createProject,
  createTask,
  createTimeEntry,
  createInvoice,
  fetchUnbilledTimeEntries,
  downloadInvoicePdf,
  login,
  register,
  getProjectBurnRate,
  toggleBillable,
  toggleInvoicePaid,
  upgradePlan,
} from './api';
import Stopwatch from './components/Stopwatch';
import RevenueChart from './components/RevenueChart';

const tabs = ['Dashboard', 'Clients', 'Projects', 'Tasks', 'Time', 'Invoices'];

function App() {
  const [token, setToken] = useState(localStorage.getItem('ff_token') || '');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('ff_user') || 'null'));
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [message, setMessage] = useState('');
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [unbilledEntries, setUnbilledEntries] = useState([]);
  const [invoiceWizard, setInvoiceWizard] = useState({ clientId: '', projectId: '', from: '', to: '', selectedIds: [], number: '', dueDate: '', notes: '' });
  const [dashboard, setDashboard] = useState({ revenue: 0, hours: 0, clientsCount: 0, projectsCount: 0, invoiceCount: 0, activeProjects: 0, pendingInvoices: 0, upcomingDeadlines: [], projectBurnRates: [], plan: 'FREE' });
  const [financials, setFinancials] = useState({ monthlyRevenue: [], outstandingPayments: 0 });
  const [mode, setMode] = useState('login');

  const isAuthenticated = Boolean(token);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error(error);
        if (error.error === 'Invalid or expired token') logout();
      }
    };
    load();
  }, [token]);

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('ff_token');
    localStorage.removeItem('ff_user');
  };

  const handleAuth = async (payload, action) => {
    try {
      const result = action === 'login' ? await login(payload) : await register(payload);
      setToken(result.token);
      setUser(result.user);
      localStorage.setItem('ff_token', result.token);
      localStorage.setItem('ff_user', JSON.stringify(result.user));
      setMessage('Authenticated successfully');
    } catch (error) {
      setMessage(error.error || 'Authentication failed');
    }
  };

  const handleUpgradeToPro = async () => {
    try {
      const result = await upgradePlan(token, 'PRO');
      setUser(result.user);
      localStorage.setItem('ff_user', JSON.stringify(result.user));
      setToken(result.token);
      localStorage.setItem('ff_token', result.token);
      setMessage('Plan upgraded to Pro');
      await refreshData();
    } catch (error) {
      setMessage(error.error || 'Could not upgrade plan');
    }
  };

  const refreshData = async () => {
    try {
      setClients(await fetchClients(token));
      setProjects(await fetchProjects(token));
      setTasks(await fetchTasks(token));
      setEntries(await fetchTimeEntries(token));
      setInvoices(await fetchInvoices(token));
      setDashboard(await fetchDashboard(token));
      setFinancials(await fetchFinancials(token));
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreate = async (action, payload) => {
    try {
      if (action === 'client') {
        const created = await createClient(token, payload);
        setClients([created, ...clients]);
      }
      if (action === 'project') {
        const created = await createProject(token, payload);
        setProjects([created, ...projects]);
      }
      if (action === 'task') {
        const created = await createTask(token, payload);
        setTasks([created, ...tasks]);
      }
      if (action === 'time') {
        const created = await createTimeEntry(token, payload);
        setEntries([created, ...entries]);
      }
      if (action === 'invoice') {
        const created = await createInvoice(token, payload);
        setInvoices([created, ...invoices]);
        await refreshData();
      }
      setMessage('Created successfully');
    } catch (error) {
      setMessage(error.error || 'Creation failed');
    }
  };

  const loadUnbilledEntries = async () => {
    try {
      const query = {
        clientId: invoiceWizard.clientId,
        projectId: invoiceWizard.projectId,
        from: invoiceWizard.from,
        to: invoiceWizard.to,
      };
      const entries = await fetchUnbilledTimeEntries(token, query);
      setUnbilledEntries(entries);
      setMessage(`Loaded ${entries.length} unbilled entries`);
    } catch (error) {
      setMessage(error.error || 'Could not load unbilled entries');
    }
  };

  const handleInvoiceSave = async (payload) => {
    if (!payload.number) {
      setMessage('Invoice number is required');
      return;
    }
    if (!payload.timeEntryIds || !payload.timeEntryIds.length) {
      setMessage('Select at least one time entry to invoice');
      return;
    }

    await handleCreate('invoice', payload);
    setInvoiceWizard({ clientId: '', projectId: '', from: '', to: '', selectedIds: [], number: '', dueDate: '', notes: '' });
    setUnbilledEntries([]);
  };

  const handleToggleBillable = async (entryId) => {
    try {
      const updated = await toggleBillable(token, entryId);
      setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
      setMessage('Time entry billable status updated');
    } catch (error) {
      setMessage(error.error || 'Could not update billable status');
    }
  };

  const handleToggleInvoicePaid = async (invoiceId, paid) => {
    try {
      await toggleInvoicePaid(token, invoiceId, paid);
      setInvoices((prev) => prev.map((invoice) => (invoice.id === invoiceId ? { ...invoice, paid } : invoice)));
      setMessage(`Invoice ${paid ? 'marked paid' : 'marked unpaid'}`);
      await refreshData();
    } catch (error) {
      setMessage(error.error || 'Could not update invoice status');
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await downloadInvoicePdf(token, invoiceId);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setMessage('Could not download invoice PDF');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-slate-900 p-8 rounded-3xl shadow-xl ring-1 ring-white/10">
          <h1 className="text-3xl font-bold mb-6 text-center">FreelanceFlow</h1>
          <AuthForm mode={mode} setMode={setMode} onSubmit={handleAuth} message={message} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">FreelanceFlow</p>
            <h1 className="text-2xl font-semibold">Welcome back, {user?.name}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-slate-800 px-4 py-2 text-sm">{user?.email}</span>
            <button onClick={logout} className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Logout</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {message && <div className="mb-6 rounded-2xl bg-emerald-100 p-4 text-slate-900 shadow-sm">{message}</div>}
        <nav className="mb-8 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-slate-950 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
              {tab}
            </button>
          ))}
        </nav>

        {activeTab === 'Dashboard' && <DashboardPanel stats={dashboard} recentInvoices={invoices.slice(0, 4)} financials={financials} onUpgrade={handleUpgradeToPro} />}
        {activeTab === 'Clients' && <ClientsPanel clients={clients} onSave={(payload) => handleCreate('client', payload)} />}
        {activeTab === 'Projects' && <ProjectsPanel projects={projects} clients={clients} onSave={(payload) => handleCreate('project', payload)} />}
        {activeTab === 'Tasks' && <TasksPanel tasks={tasks} projects={projects} onSave={(payload) => handleCreate('task', payload)} />}
        {activeTab === 'Time' && <TimePanel entries={entries} projects={projects} tasks={tasks} token={token} onSave={(payload) => handleCreate('time', payload)} onToggleBillable={handleToggleBillable} />}
        {activeTab === 'Invoices' && <InvoicesPanel invoices={invoices} projects={projects} clients={clients} token={token} invoiceWizard={invoiceWizard} setInvoiceWizard={setInvoiceWizard} unbilledEntries={unbilledEntries} onLoadUnbilled={loadUnbilledEntries} onSave={handleInvoiceSave} onDownloadInvoice={handleDownloadInvoice} onTogglePaid={handleToggleInvoicePaid} plan={user?.plan || 'FREE'} />}
      </main>
    </div>
  );
}

function AuthForm({ mode, setMode, onSubmit, message }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(mode === 'login' ? { email: form.email, password: form.password } : form, mode);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-xl font-semibold">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-sm text-slate-400 hover:text-white">
          {mode === 'login' ? 'Register' : 'Login'}
        </button>
      </div>
      {mode === 'register' && (
        <label className="block text-sm font-medium text-slate-300">
          Name
          <input name="name" value={form.name} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400" />
        </label>
      )}
      <label className="block text-sm font-medium text-slate-300">
        Email
        <input name="email" type="email" value={form.email} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400" />
      </label>
      <label className="block text-sm font-medium text-slate-300">
        Password
        <input name="password" type="password" value={form.password} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none focus:border-emerald-400" />
      </label>
      <button type="submit" className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-emerald-400">
        {mode === 'login' ? 'Login' : 'Register'}
      </button>
      {message && <p className="mt-2 text-sm text-rose-300">{message}</p>}
    </form>
  );
}

function DashboardPanel({ stats, financials, recentInvoices, onUpgrade }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {[
            { label: 'Revenue', value: `$${stats.revenue.toFixed(2)}` },
            { label: 'Hours logged', value: `${stats.hours}` },
            { label: 'Active projects', value: stats.activeProjects },
            { label: 'Pending invoices', value: stats.pendingInvoices },
          ].map((item) => (
            <div key={item.label} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Plan</p>
                  <p className="text-xl font-semibold text-slate-900">{stats.plan || 'FREE'}</p>
                </div>
                <div className="rounded-3xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">{stats.plan === 'PRO' ? 'Pro' : 'Free'}</div>
              </div>
              {stats.plan === 'FREE' && (
                <button type="button" onClick={onUpgrade} className="rounded-2xl bg-slate-950 px-4 py-3 text-white text-sm font-semibold transition hover:bg-slate-800">
                  Upgrade to Pro
                </button>
              )}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming deadlines</h2>
            <div className="mt-4 space-y-3">
              {stats.upcomingDeadlines && stats.upcomingDeadlines.length ? stats.upcomingDeadlines.map((task) => (
                <div key={task.id} className="rounded-3xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="text-sm text-slate-500">{task.project}</p>
                  <p className="text-sm text-slate-500">Due {new Date(task.dueDate).toLocaleDateString()}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No deadlines coming up.</p>}
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Budget burn by project</h2>
          <div className="mt-4 space-y-3">
            {stats.projectBurnRates && stats.projectBurnRates.length ? stats.projectBurnRates.map((pb) => (
              <div key={pb.projectId} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{pb.title}</p>
                    <p className="text-sm text-slate-500">Budget ${pb.budget.toFixed(2)}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{pb.utilization}%</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Burned</p>
                    <p className="mt-1 font-semibold text-slate-900">${pb.burnRate.toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Remaining</p>
                    <p className="mt-1 font-semibold text-slate-900">${pb.budgetRemaining.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-slate-500">No project budgets found.</p>}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Revenue trends</h2>
              <p className="text-sm text-slate-500">Monthly revenue and unpaid balances for the last 12 months.</p>
            </div>
          </div>
          <div className="mt-6 h-[320px]">
            <RevenueChart data={financials.monthlyRevenue || []} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientsPanel({ clients, onSave }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', notes: '', defaultHourlyRate: '' });
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Manage clients</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); setForm({ name: '', company: '', email: '', phone: '', notes: '', defaultHourlyRate: '' }); }} className="mt-6 grid gap-4 sm:grid-cols-2">
          {['name', 'company', 'email', 'phone', 'notes', 'defaultHourlyRate'].map((field) => (
            <label key={field} className="block text-sm text-slate-600">
              {field === 'defaultHourlyRate' ? 'Default hourly rate' : field.charAt(0).toUpperCase() + field.slice(1)}
              <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400" />
            </label>
          ))}
          <button type="submit" className="sm:col-span-2 rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800">Add client</button>
        </form>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Client list</h2>
        <div className="mt-4 grid gap-4">
          {clients.length ? clients.map((client) => (
            <div key={client.id} className="rounded-3xl border border-slate-200 p-4">
              <p className="font-semibold text-slate-900">{client.name}</p>
              <p className="text-sm text-slate-500">{client.company}</p>
              <p className="text-sm text-slate-500">{client.email || 'No email'}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No clients yet.</p>}
        </div>
      </section>
    </div>
  );
}

function ProjectsPanel({ projects, clients, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', hourlyRate: '', budget: '', clientId: '', status: 'ONGOING' });
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Create project</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); setForm({ title: '', description: '', hourlyRate: '', budget: '', clientId: '', status: 'ONGOING' }); }} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="block text-sm text-slate-600">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"><option>ONGOING</option><option>COMPLETED</option><option>PAUSED</option></select></label>
          <label className="block text-sm text-slate-600">Client<select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select client</option>
            {clients.map((client) => (<option key={client.id} value={client.id}>{client.company}</option>))}
          </select></label>
          <label className="block text-sm text-slate-600">Hourly rate<input value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="80" /></label>
          <label className="block text-sm text-slate-600">Budget<input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" placeholder="2000" /></label>
          <label className="sm:col-span-2 block text-sm text-slate-600">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" rows="4" /></label>
          <button type="submit" className="sm:col-span-2 rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800">Add project</button>
        </form>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Project board</h2>
        <div className="mt-4 grid gap-4">
          {projects.length ? projects.map((project) => (
            <div key={project.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-slate-900">{project.title}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">{project.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Client: {project.client?.company || 'Missing client'}</p>
              <p className="mt-1 text-sm text-slate-500">Budget: ${project.budget?.toFixed(2) || '0.00'}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No projects yet.</p>}
        </div>
      </section>
    </div>
  );
}

function TasksPanel({ tasks, projects, onSave }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'PENDING', dueDate: '', projectId: '' });
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Track tasks</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); setForm({ title: '', description: '', status: 'PENDING', dueDate: '', projectId: '' }); }} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="block text-sm text-slate-600">Project<select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select project</option>
            {projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
          </select></label>
          <label className="block text-sm text-slate-600">Status<select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3"><option>PENDING</option><option>IN_PROGRESS</option><option>DONE</option></select></label>
          <label className="block text-sm text-slate-600">Due date<input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="sm:col-span-2 block text-sm text-slate-600">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" rows="4" /></label>
          <button type="submit" className="sm:col-span-2 rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800">Add task</button>
        </form>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Task list</h2>
        <div className="mt-4 grid gap-4">
          {tasks.length ? tasks.map((task) => (
            <div key={task.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-slate-900">{task.title}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">{task.status}</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Project: {task.project?.title || 'No project'}</p>
            </div>
          )) : <p className="text-sm text-slate-500">No tasks yet.</p>}
        </div>
      </section>
    </div>
  );
}

function TimePanel({ entries, projects, tasks, onSave, onToggleBillable }) {
  const [form, setForm] = useState({ description: '', startTime: null, date: '', projectId: '', taskId: '' });
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const handleStopwatch = (startTime, endTime, durationSeconds) => {
    onSave({
      description: form.description,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      date: form.date || new Date().toISOString().split('T')[0],
      projectId: form.projectId,
      taskId: form.taskId || null,
    });
    setForm({ description: '', startTime: null, date: '', projectId: '', taskId: '' });
  };

  return (
    <div className="space-y-8">
      {form.projectId && <Stopwatch projectId={form.projectId} onStop={handleStopwatch} />}
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Log time manually</h2>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, startTime: new Date().toISOString(), endTime: new Date().toISOString() }); setForm({ description: '', startTime: null, date: '', projectId: '', taskId: '' }); }} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="block text-sm text-slate-600">Project<select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select project</option>
            {projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
          </select></label>
          <label className="block text-sm text-slate-600">Task<select value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select task</option>
            {tasks.map((task) => (<option key={task.id} value={task.id}>{task.title}</option>))}
          </select></label>
          <label className="block text-sm text-slate-600">Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <button type="submit" className="sm:col-span-2 rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800">Log time manually</button>
        </form>
      </section>
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Time entries</h2>
        <div className="mt-4 grid gap-4">
          {entries.length ? entries.map((entry) => (
            <div key={entry.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{entry.description || 'Logged time'}</p>
                  <p className="text-sm text-slate-500">{entry.durationMinutes} minutes • {new Date(entry.date).toLocaleDateString()}</p>
                  <p className="text-sm text-slate-500">Project: {entry.project?.title || 'None'} • Task: {entry.task?.title || 'None'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${entry.billable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {entry.billable ? 'Billable' : 'Not billable'}
                  </span>
                  {onToggleBillable && (
                    <button type="button" onClick={() => onToggleBillable(entry.id)} className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800">
                      {entry.billable ? 'Unmark billable' : 'Mark billable'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">No time entries yet.</p>}
        </div>
      </section>
    </div>
  );
}

function InvoicesPanel({ invoices, projects, clients, onSave, token, invoiceWizard, setInvoiceWizard, unbilledEntries, onLoadUnbilled, onDownloadInvoice, onTogglePaid, plan }) {
  const selectedEntries = unbilledEntries.filter((entry) => invoiceWizard.selectedIds.includes(entry.id));
  const totalAmount = selectedEntries.reduce((sum, entry) => {
    const rate = entry.project?.hourlyRate || 0;
    return sum + (entry.durationMinutes / 60) * rate;
  }, 0);

  const handleCheckbox = (entryId) => {
    setInvoiceWizard((prev) => {
      const selected = prev.selectedIds.includes(entryId)
        ? prev.selectedIds.filter((id) => id !== entryId)
        : [...prev.selectedIds, entryId];
      return { ...prev, selectedIds: selected };
    });
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Invoice wizard</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">Client<select value={invoiceWizard.clientId} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, clientId: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select client</option>
            {clients.map((client) => (<option key={client.id} value={client.id}>{client.company}</option>))}
          </select></label>
          <label className="block text-sm text-slate-600">Project<select value={invoiceWizard.projectId} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, projectId: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">
            <option value="">Select project</option>
            {projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
          </select></label>
          <label className="block text-sm text-slate-600">From<input type="date" value={invoiceWizard.from} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, from: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="block text-sm text-slate-600">To<input type="date" value={invoiceWizard.to} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, to: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <button onClick={onLoadUnbilled} className="sm:col-span-2 rounded-2xl bg-slate-950 px-4 py-3 text-white transition hover:bg-slate-800">Load unbilled time logs</button>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Select work to invoice</h2>
        <div className="mt-4 space-y-3">
          {unbilledEntries.length ? unbilledEntries.map((entry) => (
            <label key={entry.id} className="flex items-center gap-3 rounded-3xl border border-slate-200 p-4">
              <input type="checkbox" checked={invoiceWizard.selectedIds.includes(entry.id)} onChange={() => handleCheckbox(entry.id)} className="h-5 w-5 rounded border-slate-300 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900">{entry.description || 'Time log'}</p>
                <p className="text-sm text-slate-500">{entry.project?.title || 'Unknown project'} • {entry.durationMinutes} min</p>
              </div>
            </label>
          )) : <p className="text-sm text-slate-500">No unbilled entries loaded.</p>}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Finalize invoice</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({
            number: invoiceWizard.number,
            dueDate: invoiceWizard.dueDate,
            clientId: invoiceWizard.clientId,
            projectId: invoiceWizard.projectId,
            notes: invoiceWizard.notes,
            timeEntryIds: invoiceWizard.selectedIds,
          });
        }} className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-slate-600">Invoice #<input value={invoiceWizard.number} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, number: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="block text-sm text-slate-600">Due date<input type="date" value={invoiceWizard.dueDate} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, dueDate: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
          <label className="sm:col-span-2 block text-sm text-slate-600">Notes<textarea value={invoiceWizard.notes} onChange={(e) => setInvoiceWizard({ ...invoiceWizard, notes: e.target.value })} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" rows="3" /></label>
          <div className="sm:col-span-2 rounded-3xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm text-slate-600">Selected logs: {invoiceWizard.selectedIds.length}</p>
            <p className="mt-2 text-lg font-semibold">Estimated total: ${totalAmount.toFixed(2)}</p>
          </div>
          <button type="submit" className="sm:col-span-2 rounded-2xl bg-emerald-500 px-4 py-3 text-white transition hover:bg-emerald-400">Create invoice from time logs</button>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-xl font-semibold">Invoice archive</h2>
        <div className="mt-4 grid gap-4">
          {invoices.length ? invoices.map((invoice) => (
            <div key={invoice.id} className="rounded-3xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{invoice.number}</p>
                  <p className="text-sm text-slate-500">Client: {invoice.client?.company || 'Unknown'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${invoice.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {invoice.paid ? 'Paid' : 'Unpaid'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-600">${invoice.total.toFixed(2)}</span>
                  {plan === 'PRO' ? (
                    <button onClick={() => onDownloadInvoice(invoice.id)} className="rounded-2xl bg-slate-950 px-4 py-2 text-white text-sm transition hover:bg-slate-800">Download PDF</button>
                  ) : (
                    <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Pro only PDF</span>
                  )}
                  <button type="button" onClick={() => onTogglePaid(invoice.id, !invoice.paid)} className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${invoice.paid ? 'bg-slate-300 text-slate-800 hover:bg-slate-400' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'}`}>
                    {invoice.paid ? 'Mark unpaid' : 'Mark paid'}
                  </button>
                </div>
              </div>
            </div>
          )) : <p className="text-sm text-slate-500">No invoices yet.</p>}
        </div>
      </section>
    </div>
  );
}

export default App;
