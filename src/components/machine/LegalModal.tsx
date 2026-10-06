import { useEffect } from "react";
import type { LegalTab } from "./Hud";

const TABS: LegalTab[] = ["privacy", "credits", "legal"];

export function LegalModal({ tab, setTab, onClose }: { tab: LegalTab; setTab: (t: LegalTab) => void; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div className="legal-backdrop" onClick={onClose}>
      <div className="legal" role="dialog" aria-modal="true" aria-label="Privacy, credits and legal" onClick={(e) => e.stopPropagation()}>
        <div className="console-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className="console-tab" onClick={() => setTab(t)}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="legal-body">
          {tab === "privacy" && (
            <>
              <h2>Privacy Policy</h2>
              <p>Inside the Machine runs entirely in your browser. It does not ask for, collect or store personal information.</p>
              <ul>
                <li><b>Accounts:</b> none. There is no sign-up or login.</li>
                <li><b>Analytics and tracking:</b> none are built into this experience.</li>
                <li><b>Cookies:</b> this experience does not use non-essential tracking cookies, and sets no cookies of its own.</li>
                <li><b>Local storage:</b> one value, <code>itm:muted</code>, remembers whether you turned the sound off. It stays on your device and you can clear it from your browser settings. Quiz scores and progress are not saved.</li>
                <li><b>Audio:</b> all sound is generated live in your browser. Nothing is recorded; the microphone is never used.</li>
                <li><b>Third parties:</b> your browser fetches web fonts from Google Fonts and the 3D text font from the A-Frame CDN (cdn.aframe.io). Those services receive standard request data such as your IP address, under their own privacy policies. The site host may also keep routine server logs.</li>
              </ul>
              <p><b>Contact:</b> questions about this project can be sent to the project owner, Namish Yadav.</p>
            </>
          )}
          {tab === "credits" && (
            <>
              <h2>Credits</h2>
              <ul>
                <li><b>3D engine:</b> A-Frame (MIT License) on three.js (MIT License).</li>
                <li><b>Fonts:</b> Geist (SIL Open Font License) and JetBrains Mono (SIL Open Font License), served by Google Fonts. In-scene text uses Source Code Pro (SIL Open Font License) via A-Frame.</li>
                <li><b>Models:</b> the room, person, computer and circuits are built from simple shapes in code. No third-party models.</li>
                <li><b>Audio:</b> synthesised in the browser. No recorded or copyrighted music.</li>
                <li><b>UI:</b> React, TanStack Start and Tailwind CSS (MIT License).</li>
              </ul>
            </>
          )}
          {tab === "legal" && (
            <>
              <h2>Legal</h2>
              <p><b>Educational disclaimer.</b> This is an educational visualization. Some computer architecture and digital logic elements are simplified for interactive visualization and are not intended to represent physically exact hardware.</p>
              <p>The experience is provided as is, without warranty. Third-party libraries and fonts remain under their own licenses, listed under Credits.</p>
            </>
          )}
        </div>
        <button className="panel-close" onClick={onClose}>
          CLOSE
        </button>
      </div>
    </div>
  );
}
