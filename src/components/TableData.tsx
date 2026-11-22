import type { Key, ReactNode } from "react";

export type TableDataColumn<T> = {
  key: string;
  title: ReactNode;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
};

export type TableDataProps<T> = {
  header: ReactNode;
  description?: ReactNode;
  columns: TableDataColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => Key;
  headerAction?: ReactNode;
  toolbar?: ReactNode;
  actions?: {
    title?: ReactNode;
    render: (row: T, index: number) => ReactNode;
  };
  loading?: boolean;
  loadingMessage?: ReactNode;
  error?: ReactNode;
  emptyMessage?: ReactNode;
  footer?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

function defaultCellValue(row: unknown, key: string): ReactNode {
  if (!row || typeof row !== "object") return "—";

  const value = Reflect.get(row, key);
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return "—";
}

function defaultRowKey<T>(row: T, index: number): Key {
  if (row && typeof row === "object") {
    const id = Reflect.get(row, "id") ?? Reflect.get(row, "key");
    if (typeof id === "string" || typeof id === "number") return String(id);
  }
  return index;
}

export default function TableData<T>({
  header,
  description,
  columns,
  rows,
  getRowKey = defaultRowKey,
  headerAction,
  toolbar,
  actions,
  loading = false,
  loadingMessage = "Loading records…",
  error,
  emptyMessage = "No records to display.",
  footer,
  ariaLabel,
  className = "",
}: TableDataProps<T>) {
  const columnCount = columns.length + (actions ? 1 : 0);

  return (
    <section className={`access-panel ${className}`.trim()}>
      <div className="access-panel-heading">
        <div>
          <h2>{header}</h2>
          {description && <p>{description}</p>}
        </div>
        {headerAction}
      </div>

      {error && (
        <p className="access-alert" role="alert">
          {error}
        </p>
      )}

      {toolbar && <div className="access-toolbar">{toolbar}</div>}

      <div className="access-table-wrap">
        <table className="access-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  className={column.className}
                  key={column.key}
                  scope="col"
                  style={{ textAlign: column.align ?? "left" }}
                >
                  {column.title}
                </th>
              ))}
              {actions && (
                <th scope="col" style={{ textAlign: "right" }}>
                  {actions.title ?? "Actions"}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="access-empty" colSpan={columnCount || 1}>
                  {loadingMessage}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="access-empty" colSpan={columnCount || 1}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={getRowKey(row, index)}>
                  {columns.map((column) => (
                    <td
                      className={column.className}
                      key={column.key}
                      style={{ textAlign: column.align ?? "left" }}
                    >
                      {column.render
                        ? column.render(row, index)
                        : defaultCellValue(row, column.key)}
                    </td>
                  ))}
                  {actions && (
                    <td>
                      <div className="row-actions">
                        {actions.render(row, index)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="table-footer">
        {footer ?? `Showing ${rows.length} ${rows.length === 1 ? "entry" : "entries"}`}
      </div>
    </section>
  );
}
