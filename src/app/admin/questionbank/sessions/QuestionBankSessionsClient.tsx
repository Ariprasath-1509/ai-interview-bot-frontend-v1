"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  candidateName: string;
  companyName: string;
  companySlug: string;
  round: string;
  interviewDate: string;
  interviewerName?: string;
  questionCount?: number;
}

const ROUND_COLORS: Record<string, string> = {
  L1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  L2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  L3: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  L4: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  HR: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
};

export default function QuestionBankSessionsClient() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = () => {
    fetch("/api/questionbank/sessions")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSessions(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    try {
      const res = await fetch(`/api/questionbank/sessions/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchSessions();
    } catch (e) {
      console.error(e);
    }
  };

  const getRoundColor = (round: string) => ROUND_COLORS[round] || "bg-muted text-muted-foreground";

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {sessions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sessions found</p>
            <p className="text-sm text-muted-foreground">Sessions are created when you ingest interview data</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {sessions.length} Session{sessions.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Candidate</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Company</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Round</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Interviewer</th>
                    <th className="p-3 text-center text-sm font-medium text-muted-foreground">Questions</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{session.candidateName}</span>
                        </div>
                      </td>
                      <td className="p-3">{session.companyName}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoundColor(session.round)}`}>
                          {session.round}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {session.interviewDate ? new Date(session.interviewDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-3 text-muted-foreground">{session.interviewerName || "-"}</td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium">{session.questionCount || 0}</span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(session.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}