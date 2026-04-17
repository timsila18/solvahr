"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { downloadCsv, formatCount, groupCounts, humanize, isOverdue, money } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type Vacancy = {
  id: string;
  title: string;
  status: string;
  candidateCount: number;
  closingDate: string;
};

type Candidate = {
  id: string;
  fullName: string;
  source: string;
  stage: string;
  screeningScore: number | null;
  salaryExpectation: number | null;
};

type Goal = {
  id: string;
  employeeName: string;
  title: string;
  status: string;
  progress: number;
};

type Review = {
  id: string;
  employeeName: string;
  score: number;
  recommendation: string;
  status: string;
};

type OnboardingTask = {
  id: string;
  personName: string;
  title: string;
  dueDate: string;
  status: string;
};

export function TalentReportsWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [message, setMessage] = useState("Loading talent reports");

  useEffect(() => {
    async function loadData() {
      const [vacancyResponse, candidateResponse, goalResponse, reviewResponse, taskResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/recruitment/vacancies`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/recruitment/candidates`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/performance/goals`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/performance/reviews`, {
          headers: session.headers,
          cache: "no-store"
        }),
        fetch(`${apiBaseUrl}/api/onboarding/tasks`, {
          headers: session.headers,
          cache: "no-store"
        })
      ]);

      if (!vacancyResponse.ok || !candidateResponse.ok || !goalResponse.ok || !reviewResponse.ok || !taskResponse.ok) {
        throw new Error("Unable to load talent reports");
      }

      const vacancyData = (await vacancyResponse.json()) as Vacancy[];
      const candidateData = (await candidateResponse.json()) as Candidate[];
      const goalData = (await goalResponse.json()) as Goal[];
      const reviewData = (await reviewResponse.json()) as Review[];
      const taskData = (await taskResponse.json()) as OnboardingTask[];

      setVacancies(vacancyData);
      setCandidates(candidateData);
      setGoals(goalData);
      setReviews(reviewData);
      setTasks(taskData);
      setMessage("Talent reporting view refreshed");
    }

    loadData().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load talent reports");
    });
  }, [apiBaseUrl, session.headers]);

  const stageRows = groupCounts(candidates, (candidate) => candidate.stage);
  const goalStatusRows = groupCounts(goals, (goal) => goal.status);
  const overdueTasks = tasks.filter((task) => !["completed", "done"].includes(task.status) && isOverdue(task.dueDate));
  const highPerformerCount = reviews.filter((review) => review.score >= 4).length;

  function exportTalentSnapshot() {
    const rows = [
      ...vacancies.map((vacancy) => ({
        family: "Vacancy",
        item: vacancy.title,
        status: humanize(vacancy.status),
        count: vacancy.candidateCount
      })),
      ...stageRows.map((row) => ({
        family: "Candidate Stage",
        item: humanize(row.label),
        status: "Open",
        count: row.count
      })),
      ...goalStatusRows.map((row) => ({
        family: "Goal Status",
        item: humanize(row.label),
        status: "Tracked",
        count: row.count
      }))
    ];

    if (!downloadCsv("talent-snapshot.csv", rows)) {
      setMessage("No talent rows available for export");
      return;
    }

    setMessage("Talent snapshot CSV prepared");
  }

  return (
    <section className="employeeWorkspace" aria-label="Talent reports workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Talent Reporting</p>
          <h2>Connect recruitment, onboarding, goals, and review outcomes in one talent command center.</h2>
        </div>
        <span className="status">Talent</span>
      </div>

      <div className="reportActionRow">
        <p className="workspaceMessage">{message}</p>
        <button className="secondaryButton" onClick={exportTalentSnapshot} type="button">
          Export Talent CSV
        </button>
      </div>

      <div className="metrics">
        <MetricCard label="Open Vacancies" value={formatCount(vacancies.filter((vacancy) => vacancy.status === "open").length)} hint={`${formatCount(candidates.length)} candidates in pipeline`} />
        <MetricCard label="High Performers" value={formatCount(highPerformerCount)} hint="Review score of 4.0 and above" />
        <MetricCard label="Goal Pressure" value={formatCount(goals.filter((goal) => goal.status !== "on_track").length)} hint="Goals needing attention" />
        <MetricCard label="Overdue Tasks" value={formatCount(overdueTasks.length)} hint="Onboarding actions past due date" />
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Recruitment Pipeline</p>
              <h3>Candidate stage distribution</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Candidates</th>
                </tr>
              </thead>
              <tbody>
                {stageRows.map((row) => (
                  <tr key={row.label}>
                    <td>{humanize(row.label)}</td>
                    <td>{formatCount(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Performance Signal</p>
              <h3>Goal status distribution</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Goals</th>
                </tr>
              </thead>
              <tbody>
                {goalStatusRows.map((row) => (
                  <tr key={row.label}>
                    <td>{humanize(row.label)}</td>
                    <td>{formatCount(row.count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="reportPreviewGrid">
        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Vacancy Watch</p>
              <h3>Open roles and demand signals</h3>
            </div>
          </div>
          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Vacancy</th>
                  <th>Status</th>
                  <th>Candidates</th>
                  <th>Closing</th>
                </tr>
              </thead>
              <tbody>
                {vacancies.map((vacancy) => (
                  <tr key={vacancy.id}>
                    <td>{vacancy.title}</td>
                    <td>{humanize(vacancy.status)}</td>
                    <td>{formatCount(vacancy.candidateCount)}</td>
                    <td>{vacancy.closingDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="reportPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Hiring and Readiness</p>
              <h3>Top candidate and onboarding pressure</h3>
            </div>
          </div>
          <div className="compactList">
            {candidates.slice(0, 4).map((candidate) => (
              <article key={candidate.id}>
                <strong>{candidate.fullName}</strong>
                <span>
                  {humanize(candidate.stage)} - {candidate.source} - {candidate.salaryExpectation ? money(candidate.salaryExpectation) : "Salary pending"}
                </span>
              </article>
            ))}
            {overdueTasks.slice(0, 4).map((task) => (
              <article key={task.id}>
                <strong>{task.personName}</strong>
                <span>
                  Overdue task: {task.title} - due {task.dueDate}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
