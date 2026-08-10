import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/api";
import { getApiErrorMessage } from "@/api/errors";
import { ArrowLeft, Loader2, ShieldCheck, User, GraduationCap, ClipboardList } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  AlertDescription,
} from "@arcevo/facet-components";
import type { UserRole } from "@/types";

interface SubjectScore {
  id: string;
  subject: string;
  level: string;
  score: number;
}

interface AcademicProfile {
  currentStream: string | null;
  jss3OverallAverage: number | null;
  weightedAcademicScore: number | null;
  updatedAt: string;
}

interface RiasecProfile {
  summaryCode: string | null;
  createdAt: string;
}

interface PersonalityProfile {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  createdAt: string;
}

interface Recommendation {
  id: string;
  topStream: string;
  vScience: number;
  vHumanities: number;
  vBusiness: number;
  confidenceLevel: number;
  generatedAt: string;
  inputsSnapshot: unknown;
}

interface JambValidation {
  id: string;
  jambCourse: { id: string; courseName: string; facultyArea: string } | null;
  isCompliant: boolean;
  missingSubjects: string[];
  validatedAt: string;
}

interface AuditEntry {
  id: string;
  studentId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  actor: { id: string; fullName: string; email: string; role: UserRole | null } | null;
  student: { id: string; fullName: string; email: string } | null;
}

interface StudentDetail {
  id: string;
  fullName: string;
  email: string;
  gender: string | null;
  ssLevel: string | null;
  phoneNumber: string | null;
  careerAspiration: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  school: { id: string; name: string } | null;
  academicProfile: AcademicProfile | null;
  subjectScores: SubjectScore[];
  riasecProfile: RiasecProfile | null;
  personalityProfile: PersonalityProfile | null;
  recommendations: Recommendation[];
  jambValidations: JambValidation[];
}

const STREAM_LABELS: Record<string, string> = {
  SCIENCE: "Science",
  HUMANITIES: "Humanities",
  BUSINESS: "Business",
};

const SUBJECT_LABELS: Record<string, string> = {
  ENGLISH_LANGUAGE: "English Language",
  MATHEMATICS: "Mathematics",
  BIOLOGY: "Biology",
  CHEMISTRY: "Chemistry",
  PHYSICS: "Physics",
  LITERATURE_IN_ENGLISH: "Literature in English",
  GOVERNMENT: "Government",
  HISTORY: "History",
  ECONOMICS: "Economics",
  COMMERCE: "Commerce",
  FINANCIAL_ACCOUNTING: "Financial Accounting",
  DIGITAL_TECHNOLOGIES: "Digital Technologies",
  CITIZENSHIP_AND_HERITAGE: "Citizenship & Heritage",
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login",
  SCORES_SUBMITTED: "Scores submitted",
  RIASEC_COMPLETED: "RIASEC completed",
  BFI_COMPLETED: "BFI completed",
  RECOMMENDATION_GENERATED: "Recommendation generated",
  JAMB_VALIDATED: "JAMB validated",
};

export default function AdminStudentDetail() {
  const { id = "" } = useParams();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detailRes, auditRes] = await Promise.all([
          api.get<{ student: StudentDetail }>(`/admin/students/${id}`),
          api.get<{ logs: AuditEntry[] }>("/admin/audit", {
            params: { studentId: id, limit: 50 },
          }),
        ]);
        if (!cancelled) {
          setStudent(detailRes.data.student);
          setAuditLogs(auditRes.data.logs);
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err, "Failed to load student record."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 size={20} className="animate-spin mr-2" />
        Loading student record…
      </div>
    );
  }

  if (error || !student) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "Student not found."}</AlertDescription>
      </Alert>
    );
  }

  const formatDate = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleString() : "-";

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/admin/students">
          <ArrowLeft size={14} />
          Back to students
        </Link>
      </Button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">
            {student.fullName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </span>
          <div>
            <h1 className="text-2xl font-black text-foreground">{student.fullName}</h1>
            <p className="text-sm text-muted-foreground">{student.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={student.role === "ADMIN" ? "success" : "secondary"}>
                {student.role}
              </Badge>
              <Badge variant={student.isActive ? "default" : "destructive"}>
                {student.isActive ? "Active" : "Inactive"}
              </Badge>
              {student.school && <Badge variant="outline">{student.school.name}</Badge>}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-muted-foreground">
          <dt className="font-medium text-foreground">Joined</dt>
          <dd>{formatDate(student.createdAt)}</dd>
          <dt className="font-medium text-foreground">Last login</dt>
          <dd>{formatDate(student.lastLoginAt)}</dd>
          {student.careerAspiration && (
            <>
              <dt className="font-medium text-foreground">Career aspiration</dt>
              <dd>{student.careerAspiration}</dd>
            </>
          )}
        </dl>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="scores">Scores</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="jamb">JAMB</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <User size={14} />
                  Academic Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {student.academicProfile ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current stream</span>
                      <span className="font-medium text-foreground">
                        {STREAM_LABELS[student.academicProfile.currentStream ?? ""] ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">JSS3 average</span>
                      <span className="font-medium text-foreground">
                        {student.academicProfile.jss3OverallAverage ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Weighted score</span>
                      <span className="font-medium text-foreground">
                        {student.academicProfile.weightedAcademicScore !== null
                          ? Math.round(student.academicProfile.weightedAcademicScore)
                          : "-"}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">No academic profile.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList size={14} />
                  RIASEC
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {student.riasecProfile ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Summary code</span>
                      <span className="font-medium text-foreground">
                        {student.riasecProfile.summaryCode ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="font-medium text-foreground">
                        {formatDate(student.riasecProfile.createdAt)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground">RIASEC quiz not completed.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap size={14} />
                  Personality (BFI)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {student.personalityProfile ? (
                  <>
                    {[
                      ["Openness", student.personalityProfile.openness],
                      ["Conscientiousness", student.personalityProfile.conscientiousness],
                      ["Extraversion", student.personalityProfile.extraversion],
                      ["Agreeableness", student.personalityProfile.agreeableness],
                      ["Neuroticism", student.personalityProfile.neuroticism],
                    ].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">
                          {Number(value).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-muted-foreground">BFI questionnaire not completed.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scores */}
        <TabsContent value="scores">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subject Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {student.subjectScores.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No scores recorded.</p>
              ) : (
                <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                  {student.subjectScores.map((s) => (
                    <div key={s.id} className="flex items-center justify-between border-b py-2 text-sm">
                      <span className="text-foreground">
                        {SUBJECT_LABELS[s.subject] ?? s.subject}
                        <span className="ml-1.5 text-[10px] uppercase text-muted-foreground">{s.level}</span>
                      </span>
                      <span className="font-bold tabular-nums text-foreground">{s.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations */}
        <TabsContent value="recommendations">
          <div className="space-y-4">
            {student.recommendations.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No recommendations generated.
                </CardContent>
              </Card>
            ) : (
              student.recommendations.map((rec) => (
                <Card key={rec.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="success">
                        {STREAM_LABELS[rec.topStream] ?? rec.topStream}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(rec.generatedAt)}
                      </span>
                    </div>
                    <dl className="mt-4 grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-4">
                      {[
                        ["Science", rec.vScience],
                        ["Humanities", rec.vHumanities],
                        ["Business", rec.vBusiness],
                      ].map(([label, value]) => (
                        <div key={label as string} className="rounded-lg bg-muted/50 p-2">
                          <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {label}
                          </dt>
                          <dd className="font-bold tabular-nums text-foreground">
                            {Number(value).toFixed(2)}
                          </dd>
                        </div>
                      ))}
                      <div className="rounded-lg bg-primary/10 p-2">
                        <dt className="text-[10px] uppercase tracking-wide text-primary">Confidence</dt>
                        <dd className="font-bold tabular-nums text-primary">
                          {Math.round(rec.confidenceLevel)}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* JAMB */}
        <TabsContent value="jamb">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">JAMB Validation History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.jambValidations.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No JAMB validations recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {student.jambValidations.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {v.jambCourse?.courseName ?? "Unknown course"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.jambCourse?.facultyArea ?? ""} · {formatDate(v.validatedAt)}
                        </p>
                      </div>
                      <Badge variant={v.isCompliant ? "success" : "destructive"}>
                        {v.isCompliant ? "Compliant" : `Missing: ${v.missingSubjects.join(", ") || "N/A"}`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck size={14} />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No audit records yet. Audit logging is wired up for the next milestone.
                </p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-foreground">
                          {ACTION_LABELS[log.action] ?? log.action}
                        </p>
                        {log.details && (
                          <p className="text-xs text-muted-foreground">{log.details}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-muted-foreground">
                          by{" "}
                          <span className="font-medium text-foreground">
                            {log.actor?.fullName ?? "unknown"}
                          </span>
                          {log.actor?.role && (
                            <span className="ml-1 font-mono text-[10px] uppercase text-muted-foreground">
                              {log.actor.role.replaceAll("_", " ")}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
