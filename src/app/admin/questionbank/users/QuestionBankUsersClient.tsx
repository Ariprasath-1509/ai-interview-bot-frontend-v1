"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, User, Shield, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EnhancedDataTable } from "@/components/common/EnhancedDataTable";

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

  const fetchUsers = useCallback(() => {
    fetch("/api/questionbank/admin/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleAdmin = useCallback(async (id: string) => {
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
  }, [fetchUsers]);

  const columns = useMemo<ColumnDef<UserProfile, unknown>[]>(
    () => [
      {
        id: "user",
        header: "User",
        accessorFn: (u) => `${u.name} ${u.email}`,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      { accessorKey: "email", header: "Email" },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone || "-"}</span>,
      },
      {
        accessorKey: "isAdmin",
        header: "Role",
        cell: ({ row }) => (
          <div className="text-center">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                row.original.isAdmin
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {row.original.isAdmin ? <Shield className="h-3 w-3" /> : null}
              {row.original.isAdmin ? "Admin" : "User"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "sessionCount",
        header: "Sessions",
        cell: ({ row }) => (
          <div className="text-center">
            <span className="text-sm font-medium">{row.original.sessionCount}</span>
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        sortingFn: (a, b) =>
          new Date(a.original.createdAt).getTime() - new Date(b.original.createdAt).getTime(),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleToggleAdmin(row.original.id)}
              disabled={toggling === row.original.id}
              className={`gap-1 ${row.original.isAdmin ? "text-orange-500 hover:text-orange-600" : "text-primary hover:text-primary/80"}`}
            >
              {toggling === row.original.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : row.original.isAdmin ? (
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
          </div>
        ),
      },
    ],
    [toggling, handleToggleAdmin]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
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
          <CardContent className="p-4">
            <EnhancedDataTable<UserProfile>
              tableId="questionbank-users"
              data={users}
              columns={columns}
              getRowId={(u) => u.id}
              emptyMessage="No users found"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
