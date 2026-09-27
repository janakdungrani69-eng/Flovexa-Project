"use client";

import { useMemo, useState } from "react";
import { Search, Save, Users } from "lucide-react";

export type AdminCustomer = { id: string; email: string; full_name: string; phone: string; created_at: string; last_sign_in_at: string | null; order_count: number; spent_paise: number; admin_note: string };
const money = (paise: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function AdminCustomers({ customers }: { customers: AdminCustomer[] }) {
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => customers.filter((customer) => `${customer.full_name} ${customer.email} ${customer.phone}`.toLowerCase().includes(search.toLowerCase().trim())), [customers, search]);
  async function saveNote(customer: AdminCustomer) {
    setBusyId(customer.id); setMessage("");
    try {
      const response = await fetch(`/api/admin/customers/${customer.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: notes[customer.id] ?? customer.admin_note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save the customer note.");
      setMessage(`Note saved for ${customer.full_name || customer.email}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the customer note."); }
    finally { setBusyId(""); }
  }
  return <div className="admin-panel"><div className="admin-panel-tools"><h2>Customer directory</h2><label className="admin-filter"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers"/></label></div>{message && <p className="admin-inline-message" role="status">{message}</p>}{!filtered.length ? <div className="admin-empty"><Users size={24}/><b>No customers found</b><span>Customer accounts will appear here after sign-up.</span></div> : <div className="customer-admin-list">{filtered.map((customer) => <article className="customer-admin-card" key={customer.id}><div className="customer-admin-head"><div><b>{customer.full_name || "Customer"}</b><span>{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</span></div><div><strong>{customer.order_count} orders</strong><strong>{money(customer.spent_paise)}</strong></div></div><small>Joined {new Date(customer.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}{customer.last_sign_in_at ? ` · Last sign-in ${new Date(customer.last_sign_in_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : " · Has not signed in yet"}</small><label className="customer-note-field">Private store note<textarea rows={2} maxLength={1000} value={notes[customer.id] ?? customer.admin_note} onChange={(event) => setNotes((all) => ({ ...all, [customer.id]: event.target.value }))} placeholder="Add an internal customer-service note"/></label><button className="customer-note-save" disabled={busyId === customer.id} onClick={() => void saveNote(customer)}><Save size={13}/>{busyId === customer.id ? "Saving…" : "Save note"}</button></article>)}</div>}</div>;
}
