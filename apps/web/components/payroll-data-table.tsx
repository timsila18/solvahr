"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { downloadCsv, humanize } from "../lib/reporting";

type CellValue = string | number | boolean | null | undefined;

export type PayrollTableColumn<Row extends Record<string, CellValue>> = {
  key: keyof Row & string;
  label: string;
  align?: "left" | "right";
  render?: (value: CellValue, row: Row) => ReactNode;
};

export type PayrollTableFilter<Row extends Record<string, CellValue>> = {
  key: keyof Row & string;
  label: string;
};

type PayrollDataTableProps<Row extends Record<string, CellValue>> = {
  title: string;
  subtitle: string;
  rows: Row[];
  columns: PayrollTableColumn<Row>[];
  searchPlaceholder?: string;
  filters?: PayrollTableFilter<Row>[];
  exportFilename?: string;
  bulkActions?: string[];
  pageSize?: number;
};

function formatCell(value: CellValue) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return value ?? "—";
}

export function PayrollDataTable<Row extends Record<string, CellValue>>({
  title,
  subtitle,
  rows,
  columns,
  searchPlaceholder = "Search records",
  filters = [],
  exportFilename = "solva-payroll-export.csv",
  bulkActions = ["Export Selected"],
  pageSize = 8
}: PayrollDataTableProps<Row>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const filterOptions = useMemo(
    () =>
      filters.reduce<Record<string, string[]>>((accumulator, filter) => {
        accumulator[filter.key] = Array.from(
          new Set(rows.map((row) => String(row[filter.key] ?? "All")))
        ).sort((left, right) => left.localeCompare(right));
        return accumulator;
      }, {}),
    [filters, rows]
  );

  const filteredRows = useMemo(() => {
    const lowered = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesQuery =
        !lowered ||
        Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(lowered));

      const matchesFilters = filters.every((filter) => {
        const filterValue = activeFilters[filter.key];
        if (!filterValue || filterValue === "All") {
          return true;
        }

        return String(row[filter.key] ?? "") === filterValue;
      });

      return matchesQuery && matchesFilters;
    });
  }, [activeFilters, filters, query, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function rowId(row: Row) {
    return String(row.id ?? row.code ?? JSON.stringify(row));
  }

  function toggleRow(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleCurrentPage() {
    const ids = pagedRows.map((row) => rowId(row));
    const allSelected = ids.every((id) => selected.includes(id));

    setSelected((current) =>
      allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids]))
    );
  }

  function exportRows() {
    const selectedRows = rows.filter((row) => selected.includes(rowId(row)));
    const exported = selectedRows.length ? selectedRows : filteredRows;
    const didExport = downloadCsv(exportFilename, exported);
    if (!didExport) {
      return;
    }
  }

  return (
    <section className="payrollDataPanel">
      <div className="payrollSectionHeader">
        <div>
          <p className="eyebrow">{title}</p>
          <h3>{subtitle}</h3>
        </div>
        <div className="payrollSectionActions">
          <button className="secondaryButton" onClick={exportRows} type="button">
            Export
          </button>
        </div>
      </div>

      <div className="payrollTableToolbar">
        <label className="payrollSearch">
          <span className="srOnly">Search</span>
          <input
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            type="search"
            value={query}
          />
        </label>

        <div className="payrollFilterRow">
          {filters.map((filter) => (
            <label className="payrollSelect" key={filter.key}>
              <span>{filter.label}</span>
              <select
                onChange={(event) => {
                  setActiveFilters((current) => ({ ...current, [filter.key]: event.target.value }));
                  setPage(1);
                }}
                value={activeFilters[filter.key] ?? "All"}
              >
                <option value="All">All</option>
                {(filterOptions[filter.key] ?? []).map((option) => (
                  <option key={option} value={option}>
                    {humanize(option)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>

      <div className="payrollBulkBar">
        <span>{selected.length ? `${selected.length} selected` : `${filteredRows.length} records`}</span>
        <div>
          {bulkActions.map((action) => (
            <button className="secondaryButton" disabled={!selected.length && action !== "Export All"} key={action} type="button">
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              <th>
                <input
                  checked={pagedRows.length > 0 && pagedRows.every((row) => selected.includes(rowId(row)))}
                  onChange={toggleCurrentPage}
                  type="checkbox"
                />
              </th>
              {columns.map((column) => (
                <th key={column.key} style={{ textAlign: column.align ?? "left" }}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((row) => (
              <tr key={rowId(row)}>
                <td>
                  <input
                    checked={selected.includes(rowId(row))}
                    onChange={() => toggleRow(rowId(row))}
                    type="checkbox"
                  />
                </td>
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align ?? "left" }}>
                    {column.render ? column.render(row[column.key], row) : formatCell(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!pagedRows.length ? <p className="payrollEmptyState">No records match the current filters.</p> : null}
      </div>

      <div className="payrollPager">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div>
          <button className="secondaryButton" disabled={currentPage === 1} onClick={() => setPage((current) => current - 1)} type="button">
            Previous
          </button>
          <button
            className="secondaryButton"
            disabled={currentPage === totalPages}
            onClick={() => setPage((current) => current + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}
