'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// White-label branding: every surface reads brand from here so an org's portal
// shows "OrgLogo × GrindBuddy" and "Powered by GrindBuddy" consistently.
// Org branding is stashed in localStorage at login (key: org_branding); the
// parent brand (GrindBuddy) is always present.

export interface Branding {
  brandName: string;      // org brand name (defaults to GrindBuddy)
  orgLogoUrl?: string | null;
}

const DEFAULT: Branding = { brandName: 'GrindBuddy', orgLogoUrl: null };
const BrandingContext = createContext<Branding>(DEFAULT);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('org_branding');
      if (raw) {
        const b = JSON.parse(raw);
        setBranding({ brandName: b.brand_name || 'GrindBuddy', orgLogoUrl: b.logo_url || null });
      }
    } catch {
      /* keep defaults */
    }
  }, []);
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}

/** Co-brand header: OrgLogo × GrindBuddy. */
export function CoBrand({ className = '' }: { className?: string }) {
  const { brandName, orgLogoUrl } = useBranding();
  const isOrg = brandName && brandName !== 'GrindBuddy';
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {orgLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={orgLogoUrl} alt="" className="h-7 w-auto rounded" />
      )}
      {isOrg && <span className="font-bold">{brandName}</span>}
      {isOrg && <span className="text-[var(--color-on-surface-variant)]">×</span>}
      <span className="font-black text-[var(--color-success)]">GrindBuddy</span>
    </div>
  );
}

/** Universal footer. */
export function PoweredByGrindBuddy({ className = '' }: { className?: string }) {
  return (
    <p className={`text-center text-[var(--color-on-surface-variant)] text-xs ${className}`}>Powered by GrindBuddy</p>
  );
}
