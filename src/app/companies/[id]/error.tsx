"use client";
import Link from "next/link";
export default function CompanyError({ reset }: { reset: () => void }) {
  return <div className="record"><div className="card empty-state" role="alert">
    <strong>Could not load this company</strong><span>Check the database connection and try again.</span>
    <div className="form-buttons"><button className="btn btn-primary" onClick={reset}>Try again</button><Link className="btn" href="/">Back to pipeline</Link></div>
  </div></div>;
}
