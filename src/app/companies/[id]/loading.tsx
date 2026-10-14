export default function Loading() {
  return <div className="record" role="status" aria-label="Loading company">
    <span className="skeleton" style={{ width: 120 }} />
    <div className="record-head"><div className="record-id"><span className="skeleton" style={{ width: 280, height: 22 }} /><span className="skeleton" style={{ width: 360, marginTop: 10 }} /></div><span className="skeleton" style={{ width: 64, height: 32 }} /></div>
    <div className="grid-2"><div className="card card-body stack">{[90, 75, 82].map(w => <span key={w} className="skeleton" style={{ width: `${w}%` }} />)}</div><div className="card card-body stack">{[60, 70, 50, 65, 55].map(w => <span key={w} className="skeleton" style={{ width: `${w}%` }} />)}</div></div>
  </div>;
}
