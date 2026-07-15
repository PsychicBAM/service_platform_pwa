import { useEffect, useRef, useState, type RefObject } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ADMIN_FOCUS_HIGHLIGHT_CLASS,
  ADMIN_FOCUS_HIGHLIGHT_MS,
} from "@/lib/adminFocus";

type UseAdminSectionFocusResult = {
  ref: RefObject<HTMLDivElement>;
  /** True while the temporary highlight is active. */
  highlighted: boolean;
  /** True once when the URL focus matched (for one-shot side effects like opening editors). */
  matched: boolean;
  highlightClassName: string;
};

/**
 * When `?focus=<expectedFocus>` is present, scroll the section into view,
 * apply a temporary highlight, and clear the focus query param.
 */
export function useAdminSectionFocus(expectedFocus: string): UseAdminSectionFocusResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const ref = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;
  const [highlighted, setHighlighted] = useState(false);
  const [matched, setMatched] = useState(false);
  const handledRef = useRef(false);
  const focus = searchParams.get("focus");

  useEffect(() => {
    if (focus !== expectedFocus || handledRef.current) {
      return;
    }
    handledRef.current = true;

    setMatched(true);
    setHighlighted(true);

    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  }, [expectedFocus, focus, searchParams, setSearchParams]);

  useEffect(() => {
    if (!highlighted) {
      return;
    }

    const scrollTimeout = window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);

    const clearTimeoutId = window.setTimeout(() => {
      setHighlighted(false);
    }, ADMIN_FOCUS_HIGHLIGHT_MS);

    return () => {
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(clearTimeoutId);
    };
  }, [highlighted]);

  return {
    ref,
    highlighted,
    matched,
    highlightClassName: highlighted ? ADMIN_FOCUS_HIGHLIGHT_CLASS : "",
  };
}
