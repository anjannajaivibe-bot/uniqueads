export default function AdminLoading() {
  return (
    <div className="admin-loading" aria-label="Loading">
      <div className="loading-row">
        <div className="loading-block" />
        <div className="loading-block" />
        <div className="loading-block" />
        <div className="loading-block" />
      </div>
      <div className="loading-block loading-panel" />
    </div>
  );
}
