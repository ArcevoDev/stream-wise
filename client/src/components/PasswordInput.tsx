import { useState, type InputHTMLAttributes } from "react";
import { Icon, Input } from "@arcevo/facet-components";

/**
 * Password field with a show/hide toggle (eye icon). Left icon mirrors the
 * other auth inputs (Lock); the right-side button toggles type="password".
 */
export default function PasswordInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Icon
        name="lock"
        size={15}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
      />
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className={`pl-9 pr-10 ${className ?? ""}`}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <Icon name="eye-off" size={15} /> : <Icon name="eye" size={15} />}
      </button>
    </div>
  );
}
