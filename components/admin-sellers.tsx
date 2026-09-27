"use client";

import { useState } from "react";
import { Check, Shield, Store } from "lucide-react";

export type AdminSeller = {
  id: string;
  email: string;
  store_name: string;
  status: "active" | "suspended";
  created_at: string;
  admin_note: string;
};

export default function AdminSellers({ initialSellers }: { initialSellers: AdminSeller[] }) {
  const [sellers, setSellers] = useState(initialSellers);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");

  async function changeStatus(seller: AdminSeller) {
    const status = seller.status === "active" ? "suspended" : "active";
    setBusyId(seller.id); setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update seller access.");
      setSellers((current) => current.map((item) => item.id === seller.id ? { ...item, status } : item));
      setMessage(`${seller.store_name || seller.email} access ${status === "active" ? "restored" : "paused"}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update seller access."); }
    finally { setBusyId(""); }
  }

  return <div className="admin-panel admin-seller-panel">
    <div className="admin-panel-tools"><h2>Seller accounts</h2><span>{sellers.length} managed</span></div>
    {message && <div className="admin-message" role="status"><Check size={15}/>{message}</div>}
    <p className="seller-admin-guidance">Manage access for sellers already approved by the owner. Seller catalogues, order processing and settlements will be added in the Seller stage.</p>
    {!sellers.length ? <div className="admin-empty"><Store size={24}/><b>No seller accounts</b><span>Only accounts that already have an owner-granted seller role appear here.</span></div> :
      <div className="admin-seller-list">{sellers.map((seller) => <article className="admin-seller-row" key={seller.id}>
        <div className="admin-seller-icon"><Store size={17}/></div>
        <div className="admin-seller-identity"><b>{seller.store_name || "Seller account"}</b><span>{seller.email}</span><small>Added {new Date(seller.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></div>
        <span className={`seller-access-state ${seller.status}`}>{seller.status === "active" ? "Access active" : "Access paused"}</span>
        <button disabled={busyId === seller.id} onClick={() => void changeStatus(seller)}><Shield size={14}/>{busyId === seller.id ? "Saving…" : seller.status === "active" ? "Pause access" : "Restore access"}</button>
      </article>)}</div>}
  </div>;
}
