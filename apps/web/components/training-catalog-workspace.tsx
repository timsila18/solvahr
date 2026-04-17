"use client";

import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/api";
import { formatCount, humanize } from "../lib/reporting";
import { MetricCard } from "./metric-card";
import { useStagingSession } from "./staging-session";

type Course = {
  id: string;
  code: string;
  title: string;
  category: string;
  deliveryMode: string;
  provider: string;
  durationHours: number;
  status: string;
  seats: number;
};

export function TrainingCatalogWorkspace() {
  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const session = useStagingSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("Loading training catalogue");

  useEffect(() => {
    async function loadCourses() {
      const response = await fetch(`${apiBaseUrl}/api/training/catalog`, {
        headers: session.headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Unable to load training catalogue");
      }

      const data = (await response.json()) as Course[];
      setCourses(data);
      setMessage(`${data.length} training courses loaded`);
    }

    loadCourses().catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load training catalogue");
    });
  }, [apiBaseUrl, session.headers]);

  return (
    <section className="employeeWorkspace" aria-label="Training catalog workspace">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Course Catalogue</p>
          <h2>See available learning options, providers, and delivery styles in one place.</h2>
        </div>
        <span className="status">Catalog</span>
      </div>

      <p className="workspaceMessage">{message}</p>

      <div className="metrics">
        <MetricCard label="Courses" value={formatCount(courses.length)} hint="Active or scheduled" />
        <MetricCard label="Providers" value={formatCount(new Set(courses.map((course) => course.provider)).size)} hint="Internal and external" />
        <MetricCard label="Seats" value={formatCount(courses.reduce((total, course) => total + course.seats, 0))} hint="Capacity across current catalog" />
        <MetricCard label="Delivery Modes" value={formatCount(new Set(courses.map((course) => course.deliveryMode)).size)} hint="Virtual, classroom, hybrid" />
      </div>

      <div className="leavePolicyGrid">
        {courses.map((course) => (
          <article className="leavePolicyCard" key={course.id}>
            <span>{course.code}</span>
            <strong>{course.title}</strong>
            <small>
              {course.provider} - {humanize(course.deliveryMode)}
            </small>
            <b>{course.durationHours} hours</b>
            <p>
              {course.category} - {humanize(course.status)} - {course.seats} seats
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
