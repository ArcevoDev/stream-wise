import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import {
  Alert,
  AlertDescription,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@arcevo/facet-components";
import GeneratedIcon from "../icons.generated.tsx";
import type { ClearHistoryResponse, RecommendationHistoryResponse, Stream } from "@/types/index";

const STREAM_VARIANTS: Record<Stream, "default" | "secondary" | "success"> = {
  Science: "default",
  Humanities: "secondary",
  Business: "success",
};

/** Rows-per-page options for the display-count select. */
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function History() {
  const navigate = useNavigate();
  const [data, setData] = useState<RecommendationHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  // Bumped after a clear so the fetch effect re-runs without changing page.
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await api.get<RecommendationHistoryResponse>("/recommend/history", {
          params: { page, pageSize },
        });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load recommendation history."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, refreshKey]);

  const totalPages = data?.pagination.totalPages ?? 1;
  // Keep the page in range when the page size changes shrinks the result set.
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  async function handleClearHistory(): Promise<void> {
    setClearing(true);
    setClearError("");
    try {
      const { data: res } = await api.delete<ClearHistoryResponse>("/recommend/history");
      setPage(1);
      setRefreshKey((k) => k + 1);
      toast.success("History cleared", {
        description:
          res.deletedCount > 0
            ? `${res.deletedCount} recommendation(s) deleted.`
            : "There was nothing to clear.",
      });
    } catch (err) {
      setClearError(getApiErrorMessage(err, "Could not clear your history. Please try again."));
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:py-10">
      <div>
        <h1 className="text-2xl font-black text-foreground">Recommendation History</h1>
        <p className="text-sm text-muted-foreground">
          Your past stream recommendations and how confident the engine was
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GeneratedIcon name="clipboard-list" size={14} />
            Past recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <GeneratedIcon name="loader-circle" size={20} className="animate-spin mr-2" />
              Loading history…
            </div>
          ) : !data || data.history.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No recommendations yet. Complete the assessment to get your first one.
              </p>
              <Button size="sm" className="mt-4" onClick={() => navigate("/scores")}>
                Start the assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {data.history.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={STREAM_VARIANTS[row.topStream]}>
                      {row.topStream}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-semibold text-foreground">
                        {Math.round(row.confidenceLevel)}% confidence
                      </span>
                      <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                        {row.algorithmVersion}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(row.generatedAt).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      onClick={() => navigate(`/results/${row.id}`)}
                    >
                      <GeneratedIcon name="document" size={12} />
                      View details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer: display-count select + facet pagination nav */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-xs">Show</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs">per page</span>
        </div>

        {data && data.history.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={clearing}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <GeneratedIcon name="trash" size={14} />
                Clear history
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm z-[120]">
              <DialogHeader>
                <DialogTitle>Clear all recommendation history?</DialogTitle>
                <DialogDescription>
                  This permanently deletes all {data.pagination.total} past
                  recommendation(s). Your saved scores and quiz answers stay
                  intact, so you can retake the assessment anytime.
                </DialogDescription>
              </DialogHeader>
              {clearError && (
                <Alert variant="destructive">
                  <AlertDescription>{clearError}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={clearing}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button variant="destructive" disabled={clearing} onClick={handleClearHistory}>
                  {clearing ? <GeneratedIcon name="loader-circle" size={14} className="animate-spin" /> : <GeneratedIcon name="trash" size={14} />}
                  Clear history
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {data && data.pagination.totalPages > 1 && (
          <Pagination className="w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.max(1, p - 1));
                  }}
                />
              </PaginationItem>
              {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((n) => (
                <PaginationItem key={n}>
                  <PaginationLink
                    href="#"
                    isActive={n === page}
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(n);
                    }}
                  >
                    {n}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  aria-disabled={page >= data.pagination.totalPages}
                  className={page >= data.pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                  onClick={(e) => {
                    e.preventDefault();
                    setPage((p) => Math.min(data.pagination.totalPages, p + 1));
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
