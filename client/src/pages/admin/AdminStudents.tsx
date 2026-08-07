import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { Search, Loader2, ChevronLeft, ChevronRight, Users, ShieldCheck } from "lucide-react";
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
} from "@arcevo/facet-components";
import { Alert, AlertDescription } from "@/components/Alert";
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

  function handleSearch(e: FormEvent<HTMLFormElement>): void {
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
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 w-56"
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
              <Loader2 size={20} className="animate-spin mr-2" />
              Loading students…
            </div>
          ) : !data || data.students.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Users size={28} className="text-muted-foreground/50" />
              <p className="text-sm">No students match your filters.</p>
            </div>
          ) : (
            <>
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
                              <ShieldCheck size={14} className="text-success" />
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

              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Page {data.pagination.page} of {data.pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.pagination.page <= 1}
                      onClick={() => goToPage(data.pagination.page - 1)}
                    >
                      <ChevronLeft size={14} />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={data.pagination.page >= data.pagination.totalPages}
                      onClick={() => goToPage(data.pagination.page + 1)}
                    >
                      Next
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
