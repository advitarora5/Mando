import Link from "next/link";
export default function CompanyNotFound() {
  return <div className="record"><div className="card empty-state">
    <strong>Company not found</strong><span>This company may have been removed or the link is wrong.</span>
    <Link className="btn" href="/">Back to pipeline</Link>
  </div></div>;
}
