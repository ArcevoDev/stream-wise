import { useEffect, useState, type SubmitEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Alert,
  AlertDescription,
  EmptyState,
  Icon,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@arcevo/facet-components";
import type { UserRole } from "@/types";

interface AdminStudentRow {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  ssLevel: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  currentStream: string | null;
  weightedAcademicScore: number | null;
  hasRecommendation: boolean;
}

interface StudentsResponse {
  students: AdminStudentRow[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

const PAGE_SIZE = 15;

const ROLE_BADGE: Record<UserRole, { label: string; variant: "default" | "secondary" | "warning" | "success" }> = {
  STUDENT: { label: "Student", variant: "secondary" },
  COUNSELOR: { label: "Counselor", variant: "warning" },
  SCHOOL_ADMIN: { label: "School Admin", variant: "default" },
  ADMIN: { label: "Admin", variant: "success" },
};

const STREAM_LABELS: Record<string, string> = {
  SCIENCE: "Science",
  HUMANITIES: "Humanities",
  BUSINESS: "Business",
};

export default function AdminStudents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search = searchParams.get("search") ?? "";

  const [data, setData] = useState<StudentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const { data: res } = await api.get<StudentsResponse>("/admin/students", {
          params: {
            page,
            pageSize: PAGE_SIZE,
            ...(search ? { search } : {}),
          },
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load students."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, search]);

  function handleSearch(e: SubmitEvent<HTMLFormElement>): void {
    e.preventDefault();
    setSearchParams(searchInput ? { search: searchInput, page: "1" } : { page: "1" });
  }

  function goToPage(next: number): void {
    const params: Record<string, string> = { page: String(next) };
    if (search) params.search = search;
    setSearchParams(params);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.pagination.total} total` : "Loading…"}
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 w-full sm:w-56"
              placeholder="Search name or email…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Icon name="loader-circle" size={20} className="animate-spin mr-2" />
              Loading students…
            </div>
          ) : !data || data.students.length === 0 ? (
            <EmptyState
              icon={<Icon name="users" size={28} />}
              title="No students match your filters"
              description="Try adjusting your search, or clear the query to see every student."
              className="my-8"
            />
          ) : (
            <>
              <div className="-mx-4 overflow-x-auto px-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Stream</TableHead>
                      <TableHead className="text-right">Weighted Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.map((s) => {
                      const roleBadge = ROLE_BADGE[s.role] ?? ROLE_BADGE.STUDENT;
                      return (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Link
                              to={`/admin/students/${s.id}`}
                              className="block font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {s.fullName}
                            </Link>
                            <span className="block text-xs text-muted-foreground">{s.email}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {s.currentStream ? STREAM_LABELS[s.currentStream] ?? s.currentStream : "-"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.weightedAcademicScore !== null ? Math.round(s.weightedAcademicScore) : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5">
                              {s.hasRecommendation ? (
                                <Icon name="shield-check" size={14} className="text-success" />
                              ) : (
                                <span className="inline-block h-2 w-2 rounded-full bg-muted" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {s.hasRecommendation ? "Recommended" : "In progress"}
                              </span>
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} total
                  </p>
                  <Pagination className="w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (data.pagination.page > 1) goToPage(data.pagination.page - 1);
                          }}
                          className={data.pagination.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (data.pagination.page < data.pagination.totalPages) goToPage(data.pagination.page + 1);
                          }}
                          className={data.pagination.page >= data.pagination.totalPages ? "pointer-events-none opacity-50" : undefined}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
