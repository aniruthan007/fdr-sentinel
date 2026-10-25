"use client";

import { useMemo } from "react";
import { NotificationList } from "@/components/notification-list";
import { PortalPage } from "@/components/portal-page";
import { useDemoData, useSession } from "@/store/hooks";

export default function InstitutionNotificationsPage() {
  const d = useDemoData();
  const session = useSession();
  const items = useMemo(() => d.notifications.filter((n) => n.institutionId === session?.institutionId), [d, session]);

  return (
    <PortalPage href="/institution/notifications">
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground tabular">{items.filter((n) => !n.readAt).length}</span> unread of{" "}
        {items.length}
      </p>
      <NotificationList items={items} />
    </PortalPage>
  );
}
