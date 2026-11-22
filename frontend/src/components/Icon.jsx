/** Single-stroke icon language for Garage OS. SVGs follow the Lucide 24px grid. */
import React from 'react';
const glyphs = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>,
  inspection: <><path d="M9 11l3 3 5-5"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>,
  document: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></>,
  wrench: <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4l-5.5 5.5a2 2 0 0 0 2.8 2.8l5.5-5.5a5 5 0 0 0 6.4-6.4l-3.2 3.2-3.2-3.2z"/></>,
  car: <><path d="M5 17h14l1-6-3-5H7l-3 5z"/><path d="M5 17v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2m6 0v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-2M4 11h16M7 14h2m6 0h2"/></>,
  sales: <><path d="M3 8l7-4 5 4-5 4-7-4Z"/><path d="m10 12 4 3 7-4"/><path d="m3 8 0 8 7 4 11-6v-3"/><path d="m10 12 0 8"/></>,
  expenses: <><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18m-14 7h3m4 0h3"/></>,
  reports: <><path d="M3 3v18h18"/><path d="M7 15l4-4 4 2 5-7"/><path d="M17 6h3v3"/></>,
  warranty: <><path d="m12 22 0 0C7 19.5 4 15.5 4 11V5l8-3 8 3v6c0 4.5-3 8.5-8 11Z"/><path d="m9 12 2 2 4-4"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2H3Z"/><path d="M17 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 3 5"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close: <><path d="M5 5l14 14M19 5 5 19"/></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  external: <><path d="M7 17 17 7M8 7h9v9"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  check: <><path d="m5 12 4 4L19 6"/></>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.1"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
};
export default function Icon({name,size=18,className='',...props}){
  return <svg aria-hidden="true" focusable="false" className={`ui-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...props}>{glyphs[name]||glyphs.info}</svg>;
}
