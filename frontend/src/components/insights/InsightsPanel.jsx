export default function InsightsPanel({ chatId, chat, insights, loading, onGenerate, onRefresh }) {
  return (
    <section className="workspace-panel">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Conversation intelligence</span>
          <h2>Summaries, sentiment, and recurring keywords</h2>
          <p>
            Generate structured insight snapshots for solo chats and rooms, then refresh them whenever the
            conversation changes.
          </p>
        </div>
        <div className="row-actions">
          <button onClick={onRefresh} disabled={!chatId}>
            Refresh
          </button>
          <button onClick={onGenerate} disabled={!chatId}>
            Generate Insight
          </button>
        </div>
      </header>

      {!chatId ? <p className="empty-copy">Select a chat first.</p> : null}
      {chatId && insights.length === 0 && !loading ? (
        <p className="empty-copy">No insights yet. Generate one to start.</p>
      ) : null}
      {loading ? <p className="empty-copy">Analyzing the conversation...</p> : null}

      {chat ? (
        <div className="insight-overview">
          <article className="stat-card">
            <span>Chat type</span>
            <strong>{chat.type}</strong>
          </article>
          <article className="stat-card">
            <span>Messages</span>
            <strong>{chat.messages?.length || 0}</strong>
          </article>
          <article className="stat-card">
            <span>Participants</span>
            <strong>{chat.members?.length || 0}</strong>
          </article>
        </div>
      ) : null}

      <div className="insight-list">
        {insights.map((insight) => {
          let keywords = [];
          try {
            keywords = JSON.parse(insight.keywords);
          } catch {
            keywords = [];
          }

          return (
            <article key={insight.id} className="insight-card">
              <div className="insight-meta">
                <strong>{insight.sentiment.toUpperCase()}</strong>
                <span>{new Date(insight.generatedAt).toLocaleString()}</span>
              </div>
              <pre>{insight.summary}</pre>

              <div className="keyword-row">
                {keywords.map((keyword) => (
                  <span key={keyword.word} className="chip">
                    {keyword.word} ({keyword.count})
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
