import type { ConvenioOption } from "@/app/(app)/patients/actions";
import type { ReactNode } from "react";
import { AppNavigation } from "@/components/layout/app-navigation";
import { TopbarActions } from "@/components/layout/topbar-actions";
import { LogoMark } from "@/components/brand/logo";
import type { ShellIdentity } from "@/features/tenant-identity/shell";

export function AppShell({
  children,
  identity,
  convenios,
}: {
  children: ReactNode;
  identity: ShellIdentity;
  convenios: ConvenioOption[];
}) {
  return (
    <div className="app-shell app-compact">
      <header className="app-header">
        <div className="topbar">
          <a className="topbar-brand" href="/dashboard" title={identity.displayName}>
            <LogoMark />
            <span className="tenant-identity">{identity.displayName}</span>
          </a>
          <div className="topbar-desktop-nav">
            <AppNavigation variant="desktop" />
          </div>
          <TopbarActions
            userName={identity.userName}
            email={identity.email}
            pendingNotifications={identity.pendingNotifications}
            convenios={convenios}
          />
        </div>
      </header>
      <div className="app-content">{children}</div>
      <AppNavigation variant="mobile" />
    </div>
  );
}
