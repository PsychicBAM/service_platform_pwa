import { useEffect, useRef, useState } from "react";
import type { OrderMessageRead, OrderMessageSenderType } from "@/types/api";

const NOTIFICATION_DISMISS_MS = 4000;

export function useIncomingMessageNotification(
  messages: OrderMessageRead[] | undefined,
  incomingSenderType: OrderMessageSenderType,
  scopeKey: string,
) {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const [showNotification, setShowNotification] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    seenIdsRef.current = new Set();
    initializedRef.current = false;
    setShowNotification(false);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, [scopeKey]);

  useEffect(() => {
    if (!messages) {
      return;
    }

    const messageIds = messages.map((message) => message.id);

    if (!initializedRef.current) {
      for (const id of messageIds) {
        seenIdsRef.current.add(id);
      }
      initializedRef.current = true;
      return;
    }

    const hasNewIncoming = messages.some(
      (message) =>
        !seenIdsRef.current.has(message.id) && message.sender_type === incomingSenderType,
    );

    for (const id of messageIds) {
      seenIdsRef.current.add(id);
    }

    if (!hasNewIncoming) {
      return;
    }

    setShowNotification(true);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      setShowNotification(false);
      dismissTimerRef.current = null;
    }, NOTIFICATION_DISMISS_MS);
  }, [messages, incomingSenderType]);

  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  const dismissNotification = () => {
    setShowNotification(false);
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  };

  return { showNotification, dismissNotification };
}
