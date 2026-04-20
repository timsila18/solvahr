"use client";

import { useMemo, useState } from "react";
import { getPage, loginProfiles, modules, type Metric, type ModuleSpec, type ThemeMode } from "@/lib/solva-data";

function SolvaLogo() {
  return (
    <div className="solva-logo" aria-hidden="true">
      <span className="solva-logo-mark">S</span>
      <span className="solva-logo-ring" />
    </div>
  );
}

function TonePill({ tone = "default", children }: { tone?: Metric["tone"] | "live"; children: React.ReactNode }) {
  return <span className={`tone-pill tone-${tone}`}>{children}</span>;
}

function ChartCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ label: string; value: number; display: string }>;
}) {
  const max = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Visual Summary</p>
          <h3>{title}</h3>
        </div>
        <TonePill tone="live">Live style</TonePill>
      </div>
      <div className="chart-stack">
        {data.map((entry) => (
          <article className="chart-row" key={entry.label}>
            <div className="chart-row-meta">
              <strong>{entry.label}</strong>
              <span>{entry.display}</span>
            </div>
            <div className="chart-track">
              <div className="chart-fill" style={{ width: `${(entry.value / max) * 100}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DataTable({
  title,
  description,
  columns,
  rows,
}: {
  title: string;
  description: string;
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: Array<Record<string, string>>;
}) {
  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="section-eyebrow">Data Table</p>
          <h3>{title}</h3>
        </div>
        <div className="inline-actions">
          <button className="ghost-button">Filters</button>
          <button className="ghost-button">Export CSV</button>
          <button className="ghost-button">Bulk actions</button>
        </div>
      </div>
      <p className="section-description">{description}</p>
      <div className="table-toolbar">
        <label className="search-card">
          <span>Search</span>
          <input placeholder="Find by name, branch, code, or status" />
        </label>
        <div className="table-pagination">Page 1 of 6</div>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input aria-label="Select all rows" type="checkbox" />
              </th>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "align-right" : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${index}-${row[columns[0].key] ?? "row"}`}>
                <td>
                  <input aria-label={`Select row ${index + 1}`} type="checkbox" />
                </td>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "align-right" : undefined}>
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeroModule({
  module,
  onOpenItem,
}: {
  module: ModuleSpec;
  onOpenItem: (item: string) => void;
}) {
  return (
    <section className="module-overview">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="section-eyebrow">Module Focus</p>
          <h2>{module.title}</h2>
          <p>{module.summary}</p>
          <div className="hero-actions">
            {module.quickActions.slice(0, 4).map((action, index) => (
              <button className={index === 0 ? "primary-button" : "ghost-button"} key={action}>
                {action}
              </button>
            ))}
          </div>
        </div>
        <div className="hero-side">
          <p className="hero-tagline">{module.tagline}</p>
          <div className="note-list">
            {module.highlights.map((highlight) => (
              <article key={highlight}>
                <span className="note-dot" />
                <p>{highlight}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="metric-grid">
        {module.heroStats.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
            <TonePill tone={metric.tone ?? "live"}>{metric.tone ?? "live"}</TonePill>
          </article>
        ))}
      </div>

      <div className="overview-grid">
        <ChartCard title={module.chartTitle} data={module.chartData} />
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Navigation</p>
              <h3>{module.title} workspaces</h3>
            </div>
          </div>
          <div className="subitem-grid">
            {module.items.map((item) => (
              <button className="subitem-card" key={item} onClick={() => onOpenItem(item)} type="button">
                <strong>{item}</strong>
                <span>Open workspace</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

export function SolvaShell() {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [moduleKey, setModuleKey] = useState(modules[0]?.key ?? "dashboard");
  const [search, setSearch] = useState("");
  const [activeItems, setActiveItems] = useState<Record<string, string>>(
    Object.fromEntries(modules.map((module) => [module.key, module.items[0] ?? ""]))
  );

  const activeModule = useMemo(
    () => modules.find((module) => module.key === moduleKey) ?? modules[0],
    [moduleKey]
  );

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return modules;
    }

    return modules.filter((module) =>
      `${module.title} ${module.summary} ${module.items.join(" ")}`.toLowerCase().includes(query)
    );
  }, [search]);

  const activeItem = activeItems[activeModule.key] ?? activeModule.items[0] ?? "";
  const page = getPage(activeModule, activeItem);

  function openItem(item: string) {
    setActiveItems((current) => ({
      ...current,
      [activeModule.key]: item,
    }));
  }

  return (
    <main className={`solva-app theme-${theme}`}>
      <aside className="primary-sidebar">
        <div className="brand-card">
          <SolvaLogo />
          <div>
            <strong>Solva HR</strong>
            <span>Kenyan HR and Payroll Cloud Platform</span>
          </div>
        </div>

        <div className="tenant-card">
          <span className="tenant-label">Current Workspace</span>
          <strong>Solva Demo Manufacturing</strong>
          <small>Nairobi HQ • Multi-branch • Kenya payroll</small>
        </div>

        <nav className="primary-nav">
          {filteredModules.map((module) => (
            <button
              className={`nav-item ${module.key === activeModule.key ? "is-active" : ""}`}
              key={module.key}
              onClick={() => setModuleKey(module.key)}
              type="button"
            >
              <span className="nav-icon">{module.icon}</span>
              <span className="nav-copy">
                <strong>{module.title}</strong>
                <small>{module.shortTitle}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="section-eyebrow">Demo Logins</p>
          <div className="login-grid">
            {loginProfiles.map((profile) => (
              <article key={profile.email}>
                <strong>{profile.role}</strong>
                <span>{profile.email}</span>
              </article>
            ))}
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <span>Solva HR</span>
            <strong>{activeModule.title}</strong>
            <small>{activeItem}</small>
          </div>

          <div className="topbar-tools">
            <label className="search-card search-wide">
              <span>Search</span>
              <input
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search modules, payroll features, reports, approvals..."
                value={search}
              />
            </label>
            <button className="icon-button" type="button">
              7
            </button>
            <button className="icon-button" onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))} type="button">
              {theme === "light" ? "Dark" : "Light"}
            </button>
            <button className="profile-chip" type="button">
              <span>SA</span>
              <strong>Super Admin</strong>
            </button>
          </div>
        </header>

        <div className="workspace-body">
          <aside className="module-sidebar">
            <div className="module-card">
              <p className="section-eyebrow">Module Menu</p>
              <h2>{activeModule.title}</h2>
              <p>{activeModule.tagline}</p>
            </div>
            <nav className="secondary-nav">
              {activeModule.items.map((item) => (
                <button
                  className={`secondary-item ${item === activeItem ? "is-active" : ""}`}
                  key={item}
                  onClick={() => openItem(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="module-content">
            <HeroModule module={activeModule} onOpenItem={openItem} />

            <section className="workspace-section">
              <div className="section-heading">
                <div>
                  <p className="section-eyebrow">Active Workspace</p>
                  <h3>{page.title}</h3>
                </div>
                <div className="inline-actions">
                  {page.quickActions.slice(0, 4).map((action, index) => (
                    <button className={index === 0 ? "primary-button" : "ghost-button"} key={action}>
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <p className="section-description">{page.description}</p>

              <div className="status-row">
                <TonePill tone="positive">Prototype ready</TonePill>
                <span className="status-copy">
                  Full Solva HR system shell with Kenyan payroll, HR, reporting, and consultancy structure.
                </span>
              </div>

              <div className="filter-row">
                {page.filters.map((filter) => (
                  <button className="filter-pill" key={filter} type="button">
                    {filter}
                  </button>
                ))}
              </div>

              <div className="metric-grid compact-grid">
                {page.metrics.map((metric) => (
                  <article className="metric-card" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.hint}</small>
                    <TonePill tone={metric.tone ?? "live"}>{metric.tone ?? "live"}</TonePill>
                  </article>
                ))}
              </div>

              <div className="overview-grid">
                <ChartCard title={page.chartTitle} data={page.chartData} />
                <section className="surface-card">
                  <div className="section-heading">
                    <div>
                      <p className="section-eyebrow">Why This Matters</p>
                      <h3>Design Notes</h3>
                    </div>
                  </div>
                  <div className="note-list">
                    {page.highlights.map((highlight) => (
                      <article key={highlight}>
                        <span className="note-dot" />
                        <p>{highlight}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <DataTable
                columns={page.table.columns}
                description={page.table.description}
                rows={page.table.rows}
                title={page.table.title}
              />
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
