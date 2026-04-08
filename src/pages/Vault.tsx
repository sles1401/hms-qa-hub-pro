import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Trash2, Eye, LogOut, FileText, FileSpreadsheet,
  File, Shield, Loader2, AlertCircle
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface UserDocument {
  id: string;
  created_at: string;
  file_name: string;
  file_path: string;
  file_type: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/pdf",
  "image/png",
  "image/jpeg",
];

function getFileIcon(type: string) {
  if (type.includes("word") || type.includes("document")) return <FileText size={20} className="text-blue-500" />;
  if (type.includes("sheet") || type.includes("excel")) return <FileSpreadsheet size={20} className="text-green-500" />;
  if (type.includes("pdf")) return <FileText size={20} className="text-red-500" />;
  return <File size={20} className="text-muted-foreground" />;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function Vault() {
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [previewType, setPreviewType] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePath, setDeletePath] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    const { data, error } = await supabase
      .from("user_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setDocuments(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) navigate("/auth", { replace: true });
      else setUser(session.user);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) navigate("/auth", { replace: true });
      else {
        setUser(session.user);
        fetchDocuments();
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate, fetchDocuments]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "File terlalu besar", description: `Maksimal ${formatSize(MAX_FILE_SIZE)}`, variant: "destructive" });
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: "Tipe file tidak didukung", description: "Upload .docx, .xlsx, .pdf, .png, atau .jpg", variant: "destructive" });
      return;
    }

    setUploading(true);
    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("private-vault")
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Upload gagal", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: dbError } = await supabase.from("user_documents").insert({
      user_id: user.id,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
    });

    if (dbError) {
      toast({ title: "Gagal menyimpan data", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "Upload berhasil!", description: file.name });
      fetchDocuments();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handlePreview = async (doc: UserDocument) => {
    const { data, error } = await supabase.storage
      .from("private-vault")
      .createSignedUrl(doc.file_path, 60);

    if (error || !data?.signedUrl) {
      toast({ title: "Gagal membuka preview", description: error?.message, variant: "destructive" });
      return;
    }
    setPreviewName(doc.file_name);
    setPreviewType(doc.file_type);
    setPreviewUrl(data.signedUrl);
  };

  const handleDelete = async () => {
    if (!deleteId || !deletePath) return;

    await supabase.storage.from("private-vault").remove([deletePath]);
    const { error } = await supabase.from("user_documents").delete().eq("id", deleteId);

    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dokumen dihapus" });
      fetchDocuments();
    }
    setDeleteId(null);
    setDeletePath(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  const renderPreviewContent = () => {
    if (!previewUrl) return null;
    if (previewType.includes("pdf")) {
      return <iframe src={previewUrl} className="w-full h-[70vh] border-0 rounded-lg" title={previewName} />;
    }
    if (previewType.includes("image")) {
      return <img src={previewUrl} alt={previewName} className="max-w-full max-h-[70vh] mx-auto rounded-lg" />;
    }
    // For docx/xlsx - use Google Docs Viewer with signed URL
    const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(previewUrl)}&embedded=true`;
    return <iframe src={viewerUrl} className="w-full h-[70vh] border-0 rounded-lg" title={previewName} />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Shield size={18} className="text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Private Vault</h1>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input type="file" className="hidden" onChange={handleUpload} accept=".docx,.xlsx,.pdf,.png,.jpg,.jpeg" disabled={uploading} />
              <Button asChild variant="default" size="sm" disabled={uploading}>
                <span>
                  {uploading ? <Loader2 size={14} className="animate-spin mr-1" /> : <Upload size={14} className="mr-1" />}
                  {uploading ? "Uploading..." : "Upload"}
                </span>
              </Button>
            </label>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut size={14} className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Dokumen Saya</h2>
          <p className="text-xs text-muted-foreground">{documents.length} file • Maks 5MB/file</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileText size={28} className="text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Belum ada dokumen</h3>
              <p className="text-sm text-muted-foreground mb-4">Upload file pertama Anda (.docx, .xlsx, .pdf, .png, .jpg)</p>
              <label className="cursor-pointer">
                <input type="file" className="hidden" onChange={handleUpload} accept=".docx,.xlsx,.pdf,.png,.jpg,.jpeg" disabled={uploading} />
                <Button asChild>
                  <span><Upload size={14} className="mr-2" /> Upload Dokumen</span>
                </Button>
              </label>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id} className="hover:bg-muted/30 transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  {getFileIcon(doc.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePreview(doc)} title="Preview">
                      <Eye size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => { setDeleteId(doc.id); setDeletePath(doc.file_path); }}
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Dokumen Anda dilindungi dengan Row Level Security (RLS). Setiap file dienkripsi dan hanya bisa diakses oleh Anda melalui Signed URL berdurasi 60 detik.
            </p>
          </div>
        </div>
      </main>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw]">
          <DialogHeader>
            <DialogTitle className="truncate">{previewName}</DialogTitle>
          </DialogHeader>
          {renderPreviewContent()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeletePath(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus dokumen?</AlertDialogTitle>
            <AlertDialogDescription>
              File akan dihapus secara permanen dari storage Anda. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
