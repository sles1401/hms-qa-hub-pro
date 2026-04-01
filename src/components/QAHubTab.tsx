import { useState } from "react";
import { Plus, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type QAQuestion } from "@/lib/store";

const CATEGORIES = [
  "Matrix Approval", "Master Data", "Finance", "Operasional",
  "User Management", "Reporting", "Integration", "Other",
];

interface Props {
  questions: QAQuestion[];
  onUpdate: (questions: QAQuestion[]) => void;
}

export default function QAHubTab({ questions, onUpdate }: Props) {
  const [showAsk, setShowAsk] = useState(false);
  const [showAnswer, setShowAnswer] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // Ask form state
  const [category, setCategory] = useState("");
  const [question, setQuestion] = useState("");
  const [directedTo, setDirectedTo] = useState<"Developer" | "UI-UX">("Developer");

  // Answer form state
  const [answer, setAnswer] = useState("");
  const [answeredBy, setAnsweredBy] = useState("");

  const resetAskForm = () => { setCategory(""); setQuestion(""); setDirectedTo("Developer"); setEditId(null); };
  const resetAnswerForm = () => { setAnswer(""); setAnsweredBy(""); };

  const handleSaveQuestion = () => {
    if (!category || !question) return;
    if (editId) {
      onUpdate(questions.map((q) =>
        q.id === editId ? { ...q, category, question, directedTo } : q
      ));
    } else {
      const newQ: QAQuestion = {
        id: crypto.randomUUID(),
        category, question, directedTo,
        answer: "", answeredBy: "",
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      onUpdate([...questions, newQ]);
    }
    setShowAsk(false);
    resetAskForm();
  };

  const handleSaveAnswer = () => {
    if (!answer || !answeredBy || !showAnswer) return;
    onUpdate(questions.map((q) =>
      q.id === showAnswer ? { ...q, answer, answeredBy, status: "RESOLVED" as const } : q
    ));
    setShowAnswer(null);
    resetAnswerForm();
  };

  const handleEdit = (q: QAQuestion) => {
    setCategory(q.category);
    setQuestion(q.question);
    setDirectedTo(q.directedTo);
    setEditId(q.id);
    setShowAsk(true);
  };

  const handleEditAnswer = (q: QAQuestion) => {
    setAnswer(q.answer);
    setAnsweredBy(q.answeredBy);
    setShowAnswer(q.id);
  };

  const handleDelete = (id: string) => {
    onUpdate(questions.filter((q) => q.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">QA Q&A Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">
            FAQ & Logic — Diskusi pertanyaan logika antar tim
          </p>
        </div>
        <Button onClick={() => { resetAskForm(); setShowAsk(true); }} className="gap-2">
          <Plus size={16} /> Ask Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-12 text-center">
          <MessageSquare className="mx-auto mb-4 text-muted-foreground" size={48} />
          <p className="text-muted-foreground text-lg font-medium">Belum ada pertanyaan.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Klik <span className="font-semibold text-primary">'Ask Question'</span> untuk memulai diskusi logika.
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">No</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="min-w-[200px]">Pertanyaan</TableHead>
                <TableHead>Ditujukan Ke</TableHead>
                <TableHead className="min-w-[200px]">Jawaban</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q, i) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.category}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{q.question}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{q.directedTo}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {q.answer ? (
                      <div>
                        <p>{q.answer}</p>
                        <p className="text-xs text-muted-foreground mt-1">— {q.answeredBy}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Belum dijawab</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      q.status === "PENDING"
                        ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20"
                        : "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
                    } variant="outline">
                      {q.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditAnswer(q)} title="Jawab">
                        <MessageSquare size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(q)} title="Edit">
                        <Pencil size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(q.id)} title="Hapus">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Ask Question Modal */}
      <Dialog open={showAsk} onOpenChange={(o) => { if (!o) { setShowAsk(false); resetAskForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Pertanyaan" : "Ask Question"}</DialogTitle>
            <DialogDescription>Isi detail pertanyaan logika Anda</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kategori</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Pertanyaan</label>
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Tulis pertanyaan logika Anda..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ditujukan Ke</label>
              <Select value={directedTo} onValueChange={(v) => setDirectedTo(v as "Developer" | "UI-UX")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Developer">Developer</SelectItem>
                  <SelectItem value="UI-UX">UI-UX</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAsk(false); resetAskForm(); }}>Batal</Button>
            <Button onClick={handleSaveQuestion} disabled={!category || !question}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Answer Modal */}
      <Dialog open={!!showAnswer} onOpenChange={(o) => { if (!o) { setShowAnswer(null); resetAnswerForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jawab Pertanyaan</DialogTitle>
            <DialogDescription>Berikan jawaban untuk pertanyaan ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Jawaban</label>
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Tulis jawaban Anda..." rows={4} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nama Penjawab</label>
              <Input value={answeredBy} onChange={(e) => setAnsweredBy(e.target.value)} placeholder="Nama Anda" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAnswer(null); resetAnswerForm(); }}>Batal</Button>
            <Button onClick={handleSaveAnswer} disabled={!answer || !answeredBy}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
