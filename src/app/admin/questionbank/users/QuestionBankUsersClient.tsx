"use client";

import { useState, useEffect } from "react";
import { Loader2, User, Shield, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isAdmin: boolean;
  sessionCount: number;
  createdAt: string;
}

export default function QuestionBankUsersClient() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchUsers = () => {
    fetch("/api/questionbank/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleAdmin = async (id: string) => {
    setToggling(id);
    try {
      const res = await fetch(`/api/questionbank/admin/users/${id}/toggle-admin`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) fetchUsers();
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {users.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No users found</p>
            <p className="text-sm text-muted-foreground">Users appear when they register for interviews</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {users.length} User{users.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/30">
                  <tr>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">User</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Email</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Phone</th>
                    <th className="p-3 text-center text-sm font-medium text-muted-foreground">Role</th>
                    <th className="p-3 text-center text-sm font-medium text-muted-foreground">Sessions</th>
                    <th className="p-3 text-left text-sm font-medium text-muted-foreground">Joined</th>
                    <th className="p-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{user.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{user.email}</td>
                      <td className="p-3 text-muted-foreground">{user.phone || "-"}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.isAdmin
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {user.isAdmin ? <Shield className="h-3 w-3" /> : null}
                          {user.isAdmin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-sm font-medium">{user.sessionCount}</span>
                      </td>
                      <td className="p-3 text-muted-foreground text-sm">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleAdmin(user.id)}
                          disabled={toggling === user.id}
                          className={`gap-1 ${user.isAdmin ? "text-orange-500 hover:text-orange-600" : "text-primary hover:text-primary/80"}`}
                        >
                          {toggling === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : user.isAdmin ? (
                            <>
                              <ShieldOff className="h-3 w-3" />
                              <span className="text-xs">Remove</span>
                            </>
                          ) : (
                            <>
                              <Shield className="h-3 w-3" />
                              <span className="text-xs">Make Admin</span>
                            </>
                          )}
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