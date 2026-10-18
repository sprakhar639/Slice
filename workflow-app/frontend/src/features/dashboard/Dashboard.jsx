import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api.js";
import { PRIORITIES, STATUSES, TYPES, label } from "../../shared/constants.js";

const VIEWS = [
  ["assigned", "Assigned to me"],
  ["unassigned_urgent", "Unassigned urgent"],
  ["awaiting_approval", "Awaiting my approval"],
  ["all", "All"],
];

export default function Dashboard({ me, onOpen }) {
  const [view, setView] = useState("assigned");

  const [filters, setFilters] = useState({
    q: "",
    status: "",
    priority: "",
    type: "",
    teamId: "",
  });

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [cursors, setCursors] = useState({ 1: null });

  // Debounce search to avoid sending a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(filters.q.trim());
      setPage(1);
      setCursors({ 1: null });
    }, 300);

    return () => clearTimeout(timer);
  }, [filters.q]);

  function resetPaging() {
    setPage(1);
    setCursors({ 1: null });
  }

  function setFilter(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));

    if (key !== "q") {
      resetPaging();
    }
  }

  const params = useMemo(() => {
    const query = new URLSearchParams({
      pageSize: "10",
    });

    if (view !== "all") {
      query.set("view", view);
    }

    if (search) {
      query.set("q", search);
    }

    if (cursors[page]) {
      query.set("cursor", String(cursors[page]));
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (key !== "q" && value) {
        query.set(key, value);
      }
    });

    return query.toString();
  }, [view, search, cursors, page, filters]);

  const {
    data,
    isPending,
    isError,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["items", params],
    queryFn: () => api(`/items?${params}`),
    refetchInterval: 10000,
    placeholderData: keepPreviousData,
  });

  function selectFilter(key, options, placeholder) {
    return (
      <select
        aria-label={placeholder}
        value={filters[key]}
        onChange={(event) => setFilter(key, event.target.value)}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {label(option)}
          </option>
        ))}
      </select>
    );
  }

  function nextPage() {
    if (!data?.hasMore || !data.nextCursor || isFetching) {
      return;
    }

    const next = page + 1;

    setCursors((current) => ({
      ...current,
      [next]: data.nextCursor,
    }));

    setPage(next);
  }

  function previousPage() {
    if (page <= 1 || isFetching) {
      return;
    }

    setPage((current) => current - 1);
  }

  function changeView(value) {
    setView(value);
    resetPaging();
  }

  function clearFilters() {
    setFilters({
      q: "",
      status: "",
      priority: "",
      type: "",
      teamId: "",
    });

    setSearch("");
    setView("assigned");
    resetPaging();
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        {VIEWS.map(([value, title]) => (
          <button
            key={value}
            disabled={view === value}
            onClick={() => changeView(value)}
          >
            {title}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <input
          type="search"
          placeholder="Search title or description"
          aria-label="Search title or description"
          value={filters.q}
          onChange={(event) => setFilter("q", event.target.value)}
        />

        {selectFilter("status", STATUSES, "Any status")}

        {selectFilter("priority", PRIORITIES, "Any priority")}

        {selectFilter("type", TYPES, "Any type")}

        <select
          aria-label="Filter by team"
          value={filters.teamId}
          onChange={(event) => setFilter("teamId", event.target.value)}
        >
          <option value="">Any team</option>

          {me.teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <button onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      {isError && (
        <p role="alert">
          Could not load work items: {error.message}
        </p>
      )}

      {isPending && <p>Loading work items...</p>}

      {isFetching && !isPending && (
        <p aria-live="polite">Refreshing work items...</p>
      )}

      <table
        width="100%"
        cellPadding={4}
        style={{ borderCollapse: "collapse" }}
      >
        <thead>
          <tr align="left">
            <th>ID</th>
            <th>Title</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Team</th>
            <th>Assignee</th>
            <th>Due date</th>
          </tr>
        </thead>

        <tbody>
          {data?.items.map((item) => (
            <tr
              key={item.id}
              style={{
                borderTop: "1px solid #ddd",
                cursor: "pointer",
              }}
              onClick={() => onOpen(item.id)}
            >
              <td>{item.id}</td>
              <td>{item.title}</td>
              <td>{label(item.type)}</td>
              <td>{item.priority}</td>
              <td>{label(item.status)}</td>
              <td>{item.team.name}</td>
              <td>{item.assignee?.name ?? "Unassigned"}</td>
              <td>{item.dueDate?.slice(0, 10) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data && data.items.length === 0 && (
        <p>No work items match your filters.</p>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <button
          disabled={page <= 1 || isFetching}
          onClick={previousPage}
        >
          Previous
        </button>

        <span>
          Page {page} · {data?.total ?? 0} matching items
        </span>

        <button
          disabled={!data?.hasMore || isFetching}
          onClick={nextPage}
        >
          Next
        </button>
      </div>
    </div>
  );
}