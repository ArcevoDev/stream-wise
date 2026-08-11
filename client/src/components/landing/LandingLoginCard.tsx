import { type SubmitEvent } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Icon,
  Input,
  Label,
} from "@arcevo/facet-components";
import PasswordInput from "../PasswordInput";

interface LandingLoginCardProps {
  email: string;
  password: string;
  loggingIn: boolean;
  error: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
}

/**
 * "Returning student?" quick sign-in block shown to anonymous visitors on the
 * landing page. Keeps the auth form local to the landing experience.
 */
export default function LandingLoginCard({
  email,
  password,
  loggingIn,
  error,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LandingLoginCardProps) {
  return (
    <div className="mx-auto mt-12 max-w-md">
      <Card variant="glass" className="rounded-2xl border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="clipboard-list" size={16} className="text-primary" />
            Returning student?
          </CardTitle>
          <CardDescription>Sign in to see your results and history</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="landing-email" className="text-xs">
                Email
              </Label>
              <Input
                id="landing-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="landing-password" className="text-xs">
                Password
              </Label>
              <PasswordInput
                id="landing-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={loggingIn} className="w-full">
              {loggingIn ? <Icon name="loader-circle" size={14} className="animate-spin" /> : "Log in"}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-3">
              <Icon name="circle-alert" size={14} className="mt-0.5 shrink-0" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
