import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { submissionAPI } from "@/api/assessment.api";

/**
 * Anti-cheat hook for the OA page.
 *
 * @param {object}   options
 * @param {string}   options.submissionId        - active submission ID
 * @param {boolean}  options.enabled             - false while loading / after submit
 * @param {object}   options.settings            - assessment.settings from backend
 * @param {Function} options.onAutoSubmit        - called when violations exceed max
 */
export function useAntiCheat({
  submissionId,
  enabled,
  settings,
  onAutoSubmit,
  onViolation,
}) {
  const {
    allowTabSwitch = false,
    maxTabSwitches = 3,
    requireFullscreen = true,
    copyPasteDisabled = true,
  } = settings || {};

  const tabSwitchCountRef = useRef(0);
  const onAutoSubmitRef = useRef(onAutoSubmit);
  onAutoSubmitRef.current = onAutoSubmit;

  // Log violation to backend
  const logViolation = useCallback(async (type) => {
    if (!submissionId || !enabled) return;
    try {
      const res = await submissionAPI.logViolation(submissionId, type);
      const { shouldAutoSubmit, violationCount } = res.data.data;

      // sync count to parent UI
      onViolation?.(violationCount);

      if (shouldAutoSubmit) {
        onAutoSubmitRef.current?.();
      }
    } catch {
      // silent
    }
  }, [submissionId, enabled, onViolation]);

  // 1. Tab / window visibility
  useEffect(() => {
    if (!enabled || allowTabSwitch) return;

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        const count = tabSwitchCountRef.current;
        const remaining = maxTabSwitches - count;

        if (remaining > 0) {
          toast.warning(
            `⚠ Tab switch detected! ${remaining} warning${remaining !== 1 ? "s" : ""} remaining before auto-submit.`,
            { duration: 5000, id: "tab-switch-warn" },
          );
        } else {
          toast.error("🚫 Maximum tab switches exceeded. Auto-submitting…", {
            duration: 4000,
            id: "tab-switch-auto",
          });
        }

        await logViolation("tab_switch");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled, allowTabSwitch, maxTabSwitches, logViolation]);

  // 2. Window focus / blur
  useEffect(() => {
    if (!enabled || allowTabSwitch) return;

    const handleBlur = async () => {
      // only log if tab wasn't already hidden (avoid double-count)
      if (!document.hidden) {
        toast.warning("⚠ Window focus lost.", {
          duration: 3000,
          id: "focus-lost-warn",
        });
        await logViolation("focus_lost");
      }
    };

    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [enabled, allowTabSwitch, logViolation]);

  // 3. Fullscreen enforcement
  useEffect(() => {
    if (!enabled || !requireFullscreen) return;

    const handleFullscreenChange = async () => {
      const isFullscreen =
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement;

      if (!isFullscreen) {
        toast.warning(
          "⚠ Fullscreen exited. Please return to fullscreen to continue.",
          { duration: 6000, id: "fullscreen-warn" },
        );
        await logViolation("fullscreen_exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullscreenChange,
      );
    };
  }, [enabled, requireFullscreen, logViolation]);

  // 4. Copy / paste / cut disable
  useEffect(() => {
    if (!enabled || !copyPasteDisabled) return;

    const handleCopy = (e) => {
      // allow copy inside Monaco editor (it has its own copy handling)
      if (isInsideMonaco(e.target)) return;
      e.preventDefault();
      toast.warning("⚠ Copying is not allowed during the assessment.", {
        duration: 3000,
        id: "copy-warn",
      });
      logViolation("copy_paste");
    };

    const handlePaste = (e) => {
      if (isInsideMonaco(e.target)) return;
      e.preventDefault();
      toast.warning("⚠ Pasting is not allowed during the assessment.", {
        duration: 3000,
        id: "paste-warn",
      });
      logViolation("copy_paste");
    };

    const handleCut = (e) => {
      if (isInsideMonaco(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("cut", handleCut);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("cut", handleCut);
    };
  }, [enabled, copyPasteDisabled, logViolation]);

  // 5. Keyboard shortcut block
  useEffect(() => {
    if (!enabled || !copyPasteDisabled) return;

    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const ctrl = isMac ? e.metaKey : e.ctrlKey;

      // block Ctrl+C / Ctrl+V / Ctrl+X / Ctrl+A (select all) outside Monaco
      if (ctrl && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        if (isInsideMonaco(e.target)) return;
        e.preventDefault();
      }

      // block F12 (devtools)
      if (e.key === "F12") {
        e.preventDefault();
        toast.warning(
          "⚠ Developer tools are not allowed during the assessment.",
          {
            duration: 3000,
            id: "devtools-warn",
          },
        );
      }

      // block right-click context menu via keyboard (ContextMenu key)
      if (e.key === "ContextMenu") e.preventDefault();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, copyPasteDisabled]);

  // 6. Right-click disable
  useEffect(() => {
    if (!enabled || !copyPasteDisabled) return;

    const handleContextMenu = (e) => {
      if (isInsideMonaco(e.target)) return;
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    return () => document.removeEventListener("contextmenu", handleContextMenu);
  }, [enabled, copyPasteDisabled]);
}

// Monaco editor injects elements with data-keybinding-context attribute
// We check if the event target is inside the Monaco editor container
function isInsideMonaco(target) {
  if (!target) return false;
  return (
    target.closest?.(".monaco-editor") !== null ||
    target.classList?.contains("monaco-editor") ||
    target.closest?.("[data-keybinding-context]") !== null
  );
}
