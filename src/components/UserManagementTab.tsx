import { useEffect, useState } from "react";
import { UsersRound, Plus, Trash2, Shield, Eye, Check, Lock, AlertCircle } from "lucide-react";
import { getUsers, saveUsers, getActiveUserId, setActiveUserId, USERS_EVENT, type ManagedUser } from "@/lib/userManagement";
import { useRole, setStoredRole } from "@/hooks/useRole";

function validEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }

export default function UserManagementTab({ onAudit }: { onAudit?: (action: string, target: string) => void }) {
  const { isAdmin } = useRole();
  const [users, setUsers] = useState<ManagedUser[]>(getUsers);
  const [activeId, setActiveIdState] = useState(getActiveUserId);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftRole, setDraftRole] = useState<"admin" | "viewer">("viewer");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const h = () => { setUsers(getUsers()); setActiveIdState(getActiveUserId()); };
    window.addEventListener(USERS_EVENT, h);
    return () => window.removeEventListener(USERS_EVENT, h);
  }, []);

  const persist = (next: ManagedUser[]) => { saveUsers(next); setUsers(next); };

  const handleAdd = () => {
    setError(null);
    if (!draftName.trim()) { setError("Nama wajib diisi"); return; }
    if (!validEmail(draftEmail)) { setError("Email tidak valid"); return; }
    if (users.some((u) => u.email.toLowerCase() === draftEmail.trim().toLowerCase())) {
      setError("Email sudah terdaftar"); return;
    }
    const u: ManagedUser = {
      id: `u-${Date.now()}`, name: draftName.trim(), email: draftEmail.trim(),
      role: draftRole, createdAt: new Date().toISOString(),
    };
    persist([...users, u]);
    onAudit?.("Create User", `${u.name} (${u.role})`);
    setDraftName(""); setDraftEmail(""); setDraftRole("viewer");
  };

  const handleRoleChange = (id: string, role: "admin" | "viewer") => {
    const next = users.map((u) => u.id === id ? { ...u, role } : u);
    persist(next);
    if (id === activeId) setStoredRole(role);
    const u = users.find((x) => x.id === id);
    onAudit?.("Change User Role", `${u?.name} → ${role}`);
  };

  const handleDelete = (id: string) => {
    if (users.length === 1) { setError("Minimal harus ada satu user"); return; }
    if (!confirm("Hapus user ini?")) return;
    const u = users.find((x) => x.id === id);
    const next = users.filter((x) => x.id !== id);
    persist(next);
    if (activeId === id) {
      setActiveUserId(next[0].id); setActiveIdState(next[0].id);
      setStoredRole(next[0].role);
    }
    onAudit?.("Delete User", u?.name || id);
  };

  const handleActivate = (u: ManagedUser) => {
    setActiveUserId(u.id); setActiveIdState(u.id);
    setStoredRole(u.role);
    onAudit?.("Switch Active User", `${u.name} (${u.role})`);
  };

  if (!isAdmin) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <Lock className="mx-auto text-muted-foreground mb-2" size={32} />
        <h2 className="text-lg font-bold text-foreground">Akses Ditolak</h2>
        <p className="text-sm text-muted-foreground mt-1">Hanya Admin QA yang dapat membuka halaman manajemen user.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <UsersRound size={22} className="text-primary" /> User Management
        </h2>
        <p className="text-sm text-muted-foreground">Kelola roster dan role (Admin QA / Viewer). Role user aktif menentukan akses tombol Admin Mode.</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Tambah User</p>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Nama"
            className="px-3 py-2 text-sm rounded border border-input bg-background" />
          <input value={draftEmail} onChange={(e) => setDraftEmail(e.target.value)} placeholder="email@domain.com"
            className="px-3 py-2 text-sm rounded border border-input bg-background" />
          <select value={draftRole} onChange={(e) => setDraftRole(e.target.value as any)}
            className="px-3 py-2 text-sm rounded border border-input bg-background">
            <option value="viewer">Viewer</option>
            <option value="admin">Admin QA</option>
          </select>
          <button onClick={handleAdd}
            className="px-3 py-2 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center justify-center gap-1">
            <Plus size={14}/> Tambah
          </button>
        </div>
        {error && <p className="text-xs text-red-600 inline-flex items-center gap-1"><AlertCircle size={12}/>{error}</p>}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Aktif</th>
              <th className="px-3 py-2 text-left">Nama</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const active = u.id === activeId;
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    {active ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><Check size={12}/>Active</span>
                    ) : (
                      <button onClick={() => handleActivate(u)}
                        className="text-xs px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted">Set Active</button>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">{u.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2">
                    <div className="inline-flex rounded-md border border-border overflow-hidden text-xs">
                      <button onClick={() => handleRoleChange(u.id, "viewer")}
                        className={`px-2 py-1 inline-flex items-center gap-1 ${u.role === "viewer" ? "bg-muted text-foreground" : "text-muted-foreground"}`}>
                        <Eye size={11}/>Viewer
                      </button>
                      <button onClick={() => handleRoleChange(u.id, "admin")}
                        className={`px-2 py-1 inline-flex items-center gap-1 ${u.role === "admin" ? "bg-emerald-600 text-white" : "text-muted-foreground"}`}>
                        <Shield size={11}/>Admin QA
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded hover:bg-red-50 text-red-600"><Trash2 size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
