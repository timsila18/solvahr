"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchJson } from "../lib/api";
import {
  applyLiveModuleData,
  applyLiveWorkspaceData,
  type ApiCandidate,
  type ApiCompany,
  type ApiDashboardPayload,
  type ApiEmployee,
  type ApiLeaveRequest,
  type ApiOffer,
  type ApiPayrollRun,
  type ApiReportTemplate,
  type ApiRequisition,
  type ApiVacancy,
  type LiveSnapshot
} from "../lib/live-system";
import type { ModuleDefinition, ThemeMode } from "../lib/system-data";
import { getWorkspacePage, loginPersonas, systemModules } from "../lib/system-data";

function SolvaLogo() {
  return (
    <div className="solvaLogo" aria-hidden="true">
      <span className="solvaLogoCore">S</span>
      <span className="solvaLogoOrbit" />
    </div>
  );
}

function StatusPill({ children, tone = "default" }: { children: ReactNode; tone?: string }) {
  return <span className={`statusPill tone-${tone}`}>{children}</span>;
}

function ChartCard({
  title,
  data
}: {
  title: string;
  data: { label: string; value: number; display: string }[];
}) {
  const max = Math.max(...data.map((entry) => entry.value), 1);

  return (
    <section className="canvasCard">
      <div className="sectionHeading">
        <div>
          <p className="sectionEyebrow">Visual Summary</p>
          <h3>{title}</h3>
        </div>
        <StatusPill>Live preview</StatusPill>
      </div>
      <div className="barChart">
        {data.map((entry) => (
          <article className="barItem" key={entry.label}>
            <div className="barMeta">
              <strong>{entry.label}</strong>
              <span>{entry.display}</span>
            </div>
            <div className="barTrack">
              <div className="barFill" style={{ width: `${(entry.value / max) * 100}%` }} />
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
  rows
}: {
  title: string;
  description: string;
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, string>[];
}) {
  return (
    <section className="surfaceCard">
      <div className="sectionHeading">
        <div>
          <p className="sectionEyebrow">Data Table</p>
          <h3>{title}</h3>
        </div>
        <div className="inlineActions">
          <button className="ghostButton">Filters</button>
          <button className="ghostButton">Export CSV</button>
          <button className="ghostButton">Bulk actions</button>
        </div>
      </div>
      <p className="sectionDescription">{description}</p>
      <div className="tableToolbar">
        <div className="searchField">
          <span>Search</span>
          <input defaultValue="" placeholder="Find by name, branch, status, or code" />
        </div>
        <div className="paginationHint">Page 1 of 4</div>
      </div>
      <div className="tableWrap">
        <table className="dataTable">
          <thead>
            <tr>
              <th aria-label="Select row">
                <input type="checkbox" aria-label="Select all rows" />
              </th>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "alignRight" : undefined}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row[columns[0]?.key ?? "row"]}-${index}`}>
                <td>
                  <input type="checkbox" aria-label={`Select row ${index + 1}`} />
                </td>
                {columns.map((column) => (
                  <td key={column.key} className={column.align === "right" ? "alignRight" : undefined}>
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

function ModuleOverview({
  module,
  onOpenItem
}: {
  module: ModuleDefinition;
  onOpenItem: (item: string) => void;
}) {
  return (
    <section className="moduleOverview">
      <div className="heroCard">
        <div className="heroCopy">
          <p className="sectionEyebrow">Module Focus</p>
          <h2>{module.title}</h2>
          <p>{module.summary}</p>
          <div className="heroActions">
            {module.quickActions.slice(0, 3).map((action) => (
              <button className={action === module.quickActions[0] ? "primaryButton" : "ghostButton"} key={action}>
                {action}
              </button>
            ))}
          </div>
        </div>
        <div className="heroPanel">
          <p className="heroTag">{module.tagline}</p>
          <div className="miniLegend">
            {module.highlights.map((highlight) => (
              <article key={highlight}>
                <span />
                <p>{highlight}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="metricsGrid">
        {module.heroStats.map((metric) => (
          <article className="metricTile" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
            <StatusPill tone={metric.tone ?? "default"}>{metric.tone ?? "live"}</StatusPill>
          </article>
        ))}
      </div>

      <div className="overviewGrid">
        <ChartCard title={module.chartTitle} data={module.chartData} />

        <section className="surfaceCard">
          <div className="sectionHeading">
            <div>
              <p className="sectionEyebrow">Navigation</p>
              <h3>{module.title} workspaces</h3>
            </div>
          </div>
          <div className="subitemGrid">
            {module.items.map((item) => (
              <button className="subitemCard" key={item} onClick={() => onOpenItem(item)} type="button">
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

export function SystemShell() {
  const fallbackModule = systemModules[0]!;
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [activeModuleKey, setActiveModuleKey] = useState(fallbackModule.key);
  const [snapshot, setSnapshot] = useState<LiveSnapshot>({
    companies: [],
    dashboard: null,
    employees: [],
    payroll: null,
    leaveRequests: [],
    requisitions: [],
    vacancies: [],
    candidates: [],
    offers: [],
    reportTemplates: []
  });
  const [isLoadingLiveData, setIsLoadingLiveData] = useState(true);
  const [liveDataError, setLiveDataError] = useState<string | null>(null);
  const [activeItems, setActiveItems] = useState<Record<string, string>>(
    Object.fromEntries(systemModules.map((module) => [module.key, module.items[0] ?? ""]))
  );

  useEffect(() => {
    let isMounted = true;

    async function loadLiveData() {
      try {
        setIsLoadingLiveData(true);
        setLiveDataError(null);

        const [companies, dashboard, employees, payroll, leaveRequests, requisitions, vacancies, candidates, offers, reportTemplates] = await Promise.all([
          fetchJson<ApiCompany[]>("/api/companies"),
          fetchJson<ApiDashboardPayload>("/api/dashboard"),
          fetchJson<ApiEmployee[]>("/api/employees"),
          fetchJson<ApiPayrollRun>("/api/payroll/runs/current"),
          fetchJson<ApiLeaveRequest[]>("/api/leave/requests"),
          fetchJson<ApiRequisition[]>("/api/recruitment/requisitions"),
          fetchJson<ApiVacancy[]>("/api/recruitment/vacancies"),
          fetchJson<ApiCandidate[]>("/api/recruitment/candidates"),
          fetchJson<ApiOffer[]>("/api/recruitment/offers"),
          fetchJson<ApiReportTemplate[]>("/api/reports/templates")
        ]);

        if (!isMounted) {
          return;
        }

        setSnapshot({
          companies,
          dashboard,
          employees,
          payroll,
          leaveRequests,
          requisitions,
          vacancies,
          candidates,
          offers,
          reportTemplates
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLiveDataError(error instanceof Error ? error.message : "Failed to load live system data");
      } finally {
        if (isMounted) {
          setIsLoadingLiveData(false);
        }
      }
    }

    void loadLiveData();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeModule = useMemo(
    () => systemModules.find((module) => module.key === activeModuleKey) ?? fallbackModule,
    [activeModuleKey]
  );

  const activeItem = activeItems[activeModule.key] ?? activeModule.items[0] ?? "";
  const liveModule = useMemo(() => applyLiveModuleData(activeModule, snapshot), [activeModule, snapshot]);
  const activePage = useMemo(() => {
    const basePage = getWorkspacePage(liveModule, activeItem);
    return applyLiveWorkspaceData(liveModule, activeItem, basePage, snapshot);
  }, [activeItem, liveModule, snapshot]);

  function openModule(moduleKey: string) {
    setActiveModuleKey(moduleKey);
  }

  function openItem(item: string) {
    setActiveItems((current) => ({
      ...current,
      [activeModule.key]: item
    }));
  }

  return (
    <main className={`systemApp theme-${theme}`}>
      <aside className="primarySidebar" aria-label="Primary navigation">
        <div className="brandBlock">
          <SolvaLogo />
          <div>
            <strong>Solva HR</strong>
            <span>Premium HR and Payroll SaaS</span>
          </div>
        </div>

        <div className="tenantCard">
          <span className="tenantLabel">Current workspace</span>
          <strong>Solva Demo Manufacturing</strong>
          <small>Nairobi HQ • Multi-branch • Kenya payroll</small>
        </div>

        <nav className="primaryNav">
          {systemModules.map((module) => (
            <button
              className={`navButton ${module.key === activeModule.key ? "isActive" : ""}`}
              key={module.key}
              onClick={() => openModule(module.key)}
              type="button"
            >
              <span className="navIcon">{module.icon}</span>
              <span className="navText">
                <strong>{module.title}</strong>
                <small>{module.shortTitle}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebarFooter">
          <p className="sectionEyebrow">Staging Personas</p>
          <div className="personaList">
            {loginPersonas.map((persona) => (
              <article key={persona.email}>
                <strong>{persona.role}</strong>
                <span>{persona.email}</span>
              </article>
            ))}
          </div>
        </div>
      </aside>

      <section className="mainWorkspace">
        <header className="appTopbar">
          <div className="breadcrumbs">
            <span>Solva HR</span>
            <strong>{activeModule.title}</strong>
            <small>{activeItem}</small>
          </div>

          <div className="topbarTools">
            <label className="searchField searchCompact">
              <span>Search</span>
              <input placeholder="Search employees, payrolls, reports, approvals..." />
            </label>
            <button className="iconButton" type="button" aria-label="Notifications">
              5
            </button>
            <button
              className="iconButton"
              onClick={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
              type="button"
            >
              {theme === "light" ? "Dark" : "Light"}
            </button>
            <button className="profileChip" type="button">
              <span>SA</span>
              <strong>Supervisor</strong>
            </button>
          </div>
        </header>

        <div className="workspaceBody">
          <aside className="moduleSidebar" aria-label={`${activeModule.title} sections`}>
            <div className="moduleSidebarCard">
              <p className="sectionEyebrow">Module Menu</p>
              <h2>{liveModule.title}</h2>
              <p>{liveModule.tagline}</p>
            </div>

            <nav className="secondaryNav">
              {liveModule.items.map((item) => (
                <button
                  className={`secondaryButton ${item === activeItem ? "isActive" : ""}`}
                  key={item}
                  onClick={() => openItem(item)}
                  type="button"
                >
                  {item}
                </button>
              ))}
            </nav>
          </aside>

          <section className="moduleContent">
            <ModuleOverview module={liveModule} onOpenItem={openItem} />

            <section className="workspaceSection">
              <div className="sectionHeading">
                <div>
                  <p className="sectionEyebrow">Active Workspace</p>
                  <h3>{activePage.title}</h3>
                </div>
                <div className="inlineActions">
                  {activePage.quickActions.slice(0, 3).map((action) => (
                    <button className={action === activePage.quickActions[0] ? "primaryButton" : "ghostButton"} key={action}>
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <p className="sectionDescription">{activePage.description}</p>

              <div className="liveStateRow">
                <StatusPill tone={liveDataError ? "critical" : isLoadingLiveData ? "warning" : "positive"}>
                  {liveDataError ? "Fallback mode" : isLoadingLiveData ? "Loading live data" : "Live data connected"}
                </StatusPill>
                <span className="liveStateText">
                  {liveDataError
                    ? `Using design-time data while API is unavailable: ${liveDataError}`
                    : isLoadingLiveData
                      ? "Fetching dashboard, people, payroll, leave, recruitment, and report data."
                      : "Dashboard, People, Payroll, Leave, Recruitment, Reports, and Settings are reading from the API snapshot."}
                </span>
              </div>

              <div className="filterRow">
                {activePage.filters.map((filter) => (
                  <button className="filterPill" key={filter} type="button">
                    {filter}
                  </button>
                ))}
              </div>

              <div className="metricsGrid compactMetrics">
                {activePage.metrics.map((metric) => (
                  <article className="metricTile" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                    <small>{metric.hint}</small>
                    <StatusPill tone={metric.tone ?? "default"}>{metric.tone ?? "live"}</StatusPill>
                  </article>
                ))}
              </div>

              <div className="overviewGrid">
                <ChartCard title={activePage.chartTitle} data={activePage.chartData} />

                <section className="surfaceCard">
                  <div className="sectionHeading">
                    <div>
                      <p className="sectionEyebrow">Why This Matters</p>
                      <h3>Design notes</h3>
                    </div>
                  </div>
                  <div className="noteList">
                    {activePage.highlights.map((highlight) => (
                      <article key={highlight}>
                        <span className="noteMarker" />
                        <p>{highlight}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>

              <DataTable
                title={activePage.table.title}
                description={activePage.table.description}
                columns={activePage.table.columns}
                rows={activePage.table.rows}
              />
            </section>
          </section>
        </div>
      </section>
    </main>
  );
}
