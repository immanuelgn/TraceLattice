"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="system-state container">
      <AlertTriangle size={30} />
      <span className="eyebrow">Unexpected application error</span>
      <h1>The interface could not finish rendering.</h1>
      <p>Your scan target was not retried automatically. Reload this view and submit again when you are ready.</p>
      <button className="button button-primary" type="button" onClick={() => unstable_retry()}>
        <RotateCcw size={17} />Try again
      </button>
    </div>
  );
}
