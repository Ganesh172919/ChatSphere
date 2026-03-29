import { useMemo, useState } from "react";

const colorPalette = ["#ef4444", "#f59e0b", "#06b6d4", "#22c55e", "#0ea5e9", "#ec4899"];

export default function MemoryGraphPanel({ graph, onRefresh, api }) {
  const [editingNodeId, setEditingNodeId] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [strength, setStrength] = useState(0.5);
  const [color, setColor] = useState(colorPalette[0]);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");

  const nodesById = useMemo(() => {
    const map = new Map();
    graph.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graph.nodes]);

  const resetNodeForm = () => {
    setEditingNodeId("");
    setLabel("");
    setDescription("");
    setStrength(0.5);
    setColor(colorPalette[0]);
  };

  const saveNode = async () => {
    if (!label.trim()) {
      return;
    }

    const payload = {
      label,
      description,
      strength: Number(strength),
      color,
    };

    if (editingNodeId) {
      await api(`/api/memory/nodes/${editingNodeId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await api("/api/memory/nodes", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    resetNodeForm();
    await onRefresh();
  };

  const deleteNode = async (nodeId) => {
    await api(`/api/memory/nodes/${nodeId}`, { method: "DELETE" });
    await onRefresh();
  };

  const createEdge = async () => {
    if (!edgeFrom || !edgeTo) {
      return;
    }

    await api("/api/memory/edges", {
      method: "POST",
      body: JSON.stringify({
        fromNodeId: edgeFrom,
        toNodeId: edgeTo,
        label: edgeLabel,
      }),
    });

    setEdgeLabel("");
    await onRefresh();
  };

  const deleteEdge = async (edgeId) => {
    await api(`/api/memory/edges/${edgeId}`, { method: "DELETE" });
    await onRefresh();
  };

  return (
    <section className="workspace-panel">
      <header className="panel-header">
        <div>
          <span className="eyebrow">Memory graph</span>
          <h2>Editable AI memory for personal context</h2>
          <p>Capture durable preferences, relationships, and context links that can evolve over time.</p>
        </div>
        <button onClick={onRefresh}>Refresh</button>
      </header>

      <div className="memory-grid">
        <div className="card">
          <h3>{editingNodeId ? "Edit memory node" : "Create memory node"}</h3>
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Memory label" />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Context and detail"
          />
          <label>Strength: {Number(strength).toFixed(2)}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={strength}
            onChange={(event) => setStrength(event.target.value)}
          />

          <div className="color-row">
            {colorPalette.map((swatch) => (
              <button
                type="button"
                key={swatch}
                className={`swatch ${color === swatch ? "active" : ""}`}
                style={{ background: swatch }}
                onClick={() => setColor(swatch)}
              />
            ))}
          </div>

          <div className="row-actions">
            <button onClick={saveNode}>{editingNodeId ? "Update node" : "Save node"}</button>
            {editingNodeId ? (
              <button type="button" className="button button--ghost" onClick={resetNodeForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </div>

        <div className="card">
          <h3>Create Memory Link</h3>
          <select value={edgeFrom} onChange={(event) => setEdgeFrom(event.target.value)}>
            <option value="">From node</option>
            {graph.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>

          <select value={edgeTo} onChange={(event) => setEdgeTo(event.target.value)}>
            <option value="">To node</option>
            {graph.nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label}
              </option>
            ))}
          </select>

          <input value={edgeLabel} onChange={(event) => setEdgeLabel(event.target.value)} placeholder="Link label" />
          <button onClick={createEdge}>Create Link</button>
        </div>
      </div>

      <div className="memory-visual">
        <h3>Node Cloud</h3>
        <div className="node-cloud">
          {graph.nodes.map((node) => (
            <article
              key={node.id}
              className="memory-node"
              style={{
                borderColor: node.color || "#0ea5e9",
                boxShadow: `0 0 0 1px ${node.color || "#0ea5e9"}55`,
              }}
            >
              <h4>{node.label}</h4>
              <p>{node.description || "No description"}</p>
              <small>Strength {Number(node.strength).toFixed(2)}</small>
              <div className="row-actions">
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => {
                    setEditingNodeId(node.id);
                    setLabel(node.label);
                    setDescription(node.description || "");
                    setStrength(Number(node.strength || 0.5));
                    setColor(node.color || colorPalette[0]);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => deleteNode(node.id)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="memory-links">
        <h3>Connections</h3>
        {graph.edges.length === 0 ? <p>No links yet.</p> : null}
        {graph.edges.map((edge) => (
          <div key={edge.id} className="edge-item">
            <span>
              {nodesById.get(edge.fromNodeId)?.label || edge.fromNodeId}
              {" -> "}
              {nodesById.get(edge.toNodeId)?.label || edge.toNodeId}
            </span>
            <em>{edge.label || "related"}</em>
            <button onClick={() => deleteEdge(edge.id)}>Delete</button>
          </div>
        ))}
      </div>
    </section>
  );
}
