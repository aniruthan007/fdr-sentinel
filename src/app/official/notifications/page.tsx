"use client";

import { useMemo } from "react";
import { NotificationList } from "@/components/notification-list";
import { PortalPage } from "@/components/portal-page";
import { useDemoData, useSession } from "@/store/hooks";

export default function OfficialNotificationsPage() {
  const d = useDemoData();
  const session = useSession();
  // Auditors and supervisors see every official-side alert; other roles see their own.
  const items = useMemo(
    () =>
      d.notifications.filter(
        (n) => n.recipientRole !== null && (n.recipientRole === session?.role || session?.role === "auditor" || session?.role === "supervisor"),
      ),
    [d, session],
  );

  return (
    <PortalPage href="/official/notifications">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground tabular">{items.filter((n) => !n.readAt).length}</span> unread of{" "}
        {items.length}
      </p>
      <NotificationList items={items} />
    </PortalPage>
  );
}
