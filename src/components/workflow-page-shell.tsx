import Link from "next/link";
import type { ReactNode } from "react";

type Breadcrumb = {
  label: string;
  href?: string;
};

export function WorkflowPageShell({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  breadcrumbs: Breadcrumb[];
  children: ReactNode;
}) {
  return (
    <main className="workflow-page">
      <div className="workflow-page__inner">
        <nav aria-label="Breadcrumb" className="workflow-breadcrumbs">
          {breadcrumbs.map((crumb, index) => (
            <span className="workflow-breadcrumbs__item" key={`${crumb.label}-${index}`}>
              {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              {index < breadcrumbs.length - 1 ? <span className="workflow-breadcrumbs__sep">/</span> : null}
            </span>
          ))}
        </nav>

        <header className="workflow-page__header">
          <div>
            <p className="section-eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="section-description">{description}</p>
          </div>
        </header>

        <section className="workflow-surface">{children}</section>
      </div>
    </main>
  );
}

