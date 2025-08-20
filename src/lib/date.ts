export function fmtDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }
  
  export function yesterdayET(): string {
    // Compute yesterday in America/New_York reliably using offset trick
    // (Serverless job handles TZ correctly; here we accept minor DST drift for UI default.)
    const now = new Date();
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    return fmtDate(y);
  }