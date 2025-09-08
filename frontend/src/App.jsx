import { useEffect, useMemo, useState } from "react";
import api from "./api";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const STATUSES = ["Creado", "En progreso", "Bloqueada", "Finalizado", "Cancelada"];

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [responsibles, setResponsibles] = useState([]);

  // Formularios
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [respName, setRespName] = useState("");
  const [respEmail, setRespEmail] = useState("");

  // Filtros (nuevo)
  const [q, setQ] = useState("");
  const [filterResp, setFilterResp] = useState("");

  async function loadAll() {
    const [t, r] = await Promise.all([api.get("/tasks"), api.get("/responsibles")]);
    setTasks(t.data);
    setResponsibles(r.data);
  }
  useEffect(() => { loadAll(); }, []);

  // ------- Responsables -------
  async function createResponsible(e) {
    e.preventDefault();
    if (!respName.trim()) return;
    const { data } = await api.post("/responsibles", { name: respName, email: respEmail || undefined });
    setResponsibles(prev => [...prev, data]);
    setRespName(""); setRespEmail("");
  }

  // ------- Tareas -------
  async function createTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const { data } = await api.post("/tasks", { title, assigneeId: assigneeId || null });
    setTasks(prev => [...prev, data]);
    setTitle(""); setAssigneeId("");
  }

  async function setStatus(taskId, status) {
    const { data } = await api.patch(`/tasks/${taskId}/status`, { status });
    setTasks(prev => prev.map(t => (t.id === taskId ? data : t)));
  }

  async function assignResponsible(taskId, respId) {
    const { data } = await api.put(`/tasks/${taskId}`, { assigneeId: respId || null });
    setTasks(prev => prev.map(t => (t.id === taskId ? data : t)));
  }

  async function editTitle(taskId, currentTitle) {
    const nuevo = prompt("Nuevo título:", currentTitle);
    if (!nuevo || !nuevo.trim()) return;
    const { data } = await api.put(`/tasks/${taskId}`, { title: nuevo.trim() });
    setTasks(prev => prev.map(t => (t.id === taskId ? data : t)));
  }

  async function removeTask(taskId) {
    await api.delete(`/tasks/${taskId}`);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }

  const personName = (id) => responsibles.find(r => r.id === id)?.name || "—";

  // ------- Agrupado + filtros -------
  const grouped = useMemo(() => {
    const g = Object.fromEntries(STATUSES.map(s => [s, []]));
    const term = q.trim().toLowerCase();
    for (const t of tasks) {
      if (term && !t.title.toLowerCase().includes(term)) continue;
      if (filterResp && t.assigneeId !== filterResp) continue;
      (g[t.status] ??= []).push(t);
    }
    return g;
  }, [tasks, q, filterResp]);

  // ------- Drag & Drop -------
  function onDragEnd(result) {
    const { source, destination, draggableId } = result;
    if (!destination) return; // cayó fuera
    const fromStatus = source.droppableId;
    const toStatus = destination.droppableId;
    if (fromStatus === toStatus) return; // misma columna

    // Optimista: muevo primero en UI
    setTasks(prev => prev.map(t => (t.id === draggableId ? { ...t, status: toStatus } : t)));
    // Persisto en backend
    setStatus(draggableId, toStatus).catch(() => {
      // Revierto si falla
      setTasks(prev => prev.map(t => (t.id === draggableId ? { ...t, status: fromStatus } : t)));
    });
  }

  const columnStyle = { background: "#f6f6f6", borderRadius: 8, padding: 10, minHeight: 220 };
  const cardStyle = { background: "#fff", border: "1px solid #eee", borderRadius: 8, padding: 10, marginBottom: 8 };

  return (
    <div style={{ fontFamily: "system-ui, Arial", padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h1>Kanban TEKAI</h1>

      {/* Barra de filtros (nuevo) */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          placeholder="Buscar por título..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ padding: 8, minWidth: 240 }}
        />
        <select value={filterResp} onChange={e => setFilterResp(e.target.value)} style={{ padding: 8 }}>
          <option value="">(todos los responsables)</option>
          {responsibles.map(r => (
            <option key={r.id} value={r.id}>{r.name || r.email || r.id}</option>
          ))}
        </select>
      </div>

      {/* Crear Responsable */}
      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Crear responsable</h3>
        <form onSubmit={createResponsible} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Nombre" value={respName} onChange={(e) => setRespName(e.target.value)} style={{ padding: 8, minWidth: 200 }} />
          <input placeholder="Email (opcional)" value={respEmail} onChange={(e) => setRespEmail(e.target.value)} style={{ padding: 8, minWidth: 240 }} />
          <button type="submit">Crear responsable</button>
        </form>
      </div>

      {/* Crear Tarea */}
      <div style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Crear tarea</h3>
        <form onSubmit={createTask} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input placeholder="Título de la tarea" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 8, minWidth: 260 }} />
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={{ padding: 8 }}>
            <option value="">(sin responsable)</option>
            {responsibles.map((r) => <option key={r.id} value={r.id}>{r.name || r.email || r.id}</option>)}
          </select>
          <button type="submit">Crear tarea</button>
        </form>
      </div>

      {/* Columnas Kanban con Drag & Drop */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {STATUSES.map((st) => (
            <Droppable droppableId={st} key={st}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{ ...columnStyle, outline: snapshot.isDraggingOver ? "2px dashed #999" : "none" }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>{st}</div>

                  {(grouped[st] ?? []).length === 0 && <div style={{ fontSize: 12, opacity: 0.6 }}>(sin tareas)</div>}

                  {(grouped[st] ?? []).map((t, index) => (
                    <Draggable draggableId={t.id} index={index} key={t.id}>
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          style={{
                            ...cardStyle,
                            boxShadow: dragSnapshot.isDragging ? "0 6px 16px rgba(0,0,0,0.15)" : "none",
                            ...dragProvided.draggableProps.style,
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: 12, opacity: 0.7, margin: "4px 0" }}>
                            Estado: {t.status} · Responsable: {personName(t.assigneeId)}
                          </div>

                          {/* Acciones secundarias */}
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "6px 0" }}>
                            {STATUSES.filter((s) => s !== t.status).map((s) => (
                              <button key={s} onClick={() => setStatus(t.id, s)}>{s}</button>
                            ))}
                          </div>

                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <select
                              value={t.assigneeId || ""}
                              onChange={(e) => assignResponsible(t.id, e.target.value)}
                            >
                              <option value="">(sin responsable)</option>
                              {responsibles.map((r) => (
                                <option key={r.id} value={r.id}>{r.name || r.email || r.id}</option>
                              ))}
                            </select>

                            <button onClick={() => editTitle(t.id, t.title)}>Editar</button>
                            <button onClick={() => removeTask(t.id)} style={{ marginLeft: "auto" }}>Eliminar</button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}

                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}