"use client";

import { useState } from "react";
import { Check, Clock, Plus, Shield, ShieldAlert, ShieldCheck, Store, UserCheck, X } from "lucide-react";

export type AdminSeller = {
  id: string;
  email: string;
  store_name: string;
  status: "active" | "suspended";
  created_at: string;
  admin_note: string;
};

type SellerCandidate = { id: string; email: string; full_name: string };

export default function AdminSellers({
  initialSellers,
  initialCustomers,
}: {
  initialSellers: AdminSeller[];
  initialCustomers: SellerCandidate[];
}) {
  const [sellers, setSellers] = useState(initialSellers);
  const [customers, setCustomers] = useState(initialCustomers);
  const [customerId, setCustomerId] = useState(initialCustomers[0]?.id ?? "");
  const [storeName, setStoreName] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState("");
  const [creatingSeller, setCreatingSeller] = useState(false);

  // Separate pending applications from approved/managed sellers
  const pendingSellers = sellers.filter(
    (s) => s.status === "suspended" && s.admin_note?.includes("PENDING_APPROVAL")
  );
  const activeSellers = sellers.filter((s) => s.status === "active");
  const suspendedSellers = sellers.filter(
    (s) => s.status === "suspended" && !s.admin_note?.includes("PENDING_APPROVAL")
  );

  async function addSeller(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingSeller(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/sellers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customerId, storeName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not grant seller access.");
      setSellers((current) => [result.seller, ...current]);
      const remaining = customers.filter((customer) => customer.id !== customerId);
      setCustomers(remaining);
      setCustomerId(remaining[0]?.id ?? "");
      setStoreName("");
      setMessage(`Seller access granted to ${result.seller.email}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not grant seller access.");
    } finally {
      setCreatingSeller(false);
    }
  }

  async function approveSeller(seller: AdminSeller) {
    setBusyId(seller.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not approve seller.");
      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id
            ? { ...item, status: "active", admin_note: result.admin_note || "Approved by owner" }
            : item
        )
      );
      setMessage(`Permission granted! "${seller.store_name || seller.email}" is now an active seller.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not approve seller.");
    } finally {
      setBusyId("");
    }
  }

  async function rejectSeller(seller: AdminSeller) {
    if (!window.confirm(`Are you sure you want to reject the seller application for "${seller.store_name || seller.email}"?`)) {
      return;
    }
    setBusyId(seller.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "suspended" }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not reject application.");
      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id
            ? { ...item, status: "suspended", admin_note: "REJECTED: Application rejected by owner" }
            : item
        )
      );
      setMessage(`Application for "${seller.store_name || seller.email}" has been rejected.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reject application.");
    } finally {
      setBusyId("");
    }
  }

  async function toggleActiveStatus(seller: AdminSeller) {
    const nextStatus = seller.status === "active" ? "suspended" : "active";
    setBusyId(seller.id);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update seller access.");
      setSellers((current) =>
        current.map((item) =>
          item.id === seller.id ? { ...item, status: nextStatus, admin_note: result.admin_note } : item
        )
      );
      setMessage(
        `${seller.store_name || seller.email} access ${nextStatus === "active" ? "restored" : "paused"}.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update seller access.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-panel admin-seller-panel">
      <div className="admin-panel-tools">
        <h2>Seller Accounts &amp; Permissions</h2>
        <span>
          {activeSellers.length} active · {pendingSellers.length} pending approval
        </span>
      </div>

      {message && (
        <div className="admin-message" role="status">
          <Check size={15} />
          {message}
        </div>
      )}

      <p className="seller-admin-guidance">
        <strong>Strict Owner Permission Policy:</strong> Nobody can access the seller portal or list products without your direct permission. Review pending merchant applications below to grant or deny access.
      </p>

      {/* 1. PENDING SELLER APPLICATIONS SECTION */}
      {pendingSellers.length > 0 && (
        <div className="pending-approvals-box">
          <div className="pending-approvals-head">
            <Clock size={18} className="pending-clock-icon" />
            <div>
              <h3>Pending Seller Applications ({pendingSellers.length})</h3>
              <p>These merchants have applied to sell on Flovexa and are awaiting your permission.</p>
            </div>
          </div>

          <div className="pending-sellers-list">
            {pendingSellers.map((seller) => (
              <div key={seller.id} className="pending-seller-card">
                <div className="pending-seller-meta">
                  <div className="pending-seller-icon">
                    <Store size={18} />
                  </div>
                  <div>
                    <strong className="pending-store-name">{seller.store_name || "New Merchant"}</strong>
                    <span className="pending-seller-email">{seller.email}</span>
                    {seller.admin_note && (
                      <small className="pending-seller-note">
                        {seller.admin_note.replace("PENDING_APPROVAL:", "Details:").trim()}
                      </small>
                    )}
                    <small className="pending-date">
                      Applied on {new Date(seller.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                    </small>
                  </div>
                </div>

                <div className="pending-seller-actions">
                  <button
                    type="button"
                    className="btn-approve-seller"
                    disabled={busyId === seller.id}
                    onClick={() => void approveSeller(seller)}
                  >
                    <ShieldCheck size={15} />
                    {busyId === seller.id ? "Approving…" : "Approve Seller (Grant Access)"}
                  </button>

                  <button
                    type="button"
                    className="btn-reject-seller"
                    disabled={busyId === seller.id}
                    onClick={() => void rejectSeller(seller)}
                  >
                    <X size={14} />
                    {busyId === seller.id ? "Rejecting…" : "Deny"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. DIRECT SELLER PROVISION FORM */}
      <div className="admin-section-divider">
        <h4>Grant Seller Access to a Registered Customer</h4>
      </div>
      <form className="seller-provision-form" onSubmit={addSeller}>
        <label>
          Customer account
          <select
            required
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            disabled={!customers.length || creatingSeller}
          >
            <option value="">
              {customers.length ? "Choose a customer" : "No eligible customer accounts"}
            </option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.full_name ? `${customer.full_name} · ` : ""}
                {customer.email}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seller store name
          <input
            required
            minLength={2}
            maxLength={100}
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="e.g. Royal Oudh Atelier"
            disabled={!customers.length || creatingSeller}
          />
        </label>
        <button
          className="admin-primary"
          type="submit"
          disabled={!customers.length || creatingSeller}
        >
          <Plus size={14} />
          {creatingSeller ? "Granting…" : "Grant Seller Access"}
        </button>
      </form>

      {/* 3. ACTIVE & MANAGED SELLERS LIST */}
      <div className="admin-section-divider">
        <h4>Authorized Sellers ({activeSellers.length + suspendedSellers.length})</h4>
      </div>

      {activeSellers.length === 0 && suspendedSellers.length === 0 ? (
        <div className="admin-empty">
          <Store size={24} />
          <b>No authorized seller accounts yet</b>
          <span>Approve a pending merchant above or grant access to a customer.</span>
        </div>
      ) : (
        <div className="admin-seller-list">
          {activeSellers.map((seller) => (
            <article className="admin-seller-row" key={seller.id}>
              <div className="admin-seller-icon">
                <Store size={17} />
              </div>
              <div className="admin-seller-identity">
                <b>{seller.store_name || "Seller account"}</b>
                <span>{seller.email}</span>
                <small>
                  Authorized on {new Date(seller.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                </small>
              </div>
              <span className="seller-access-state active">✓ Access Active</span>
              <button
                disabled={busyId === seller.id}
                onClick={() => void toggleActiveStatus(seller)}
                className="btn-pause-access"
              >
                <Shield size={14} />
                {busyId === seller.id ? "Saving…" : "Pause Access"}
              </button>
            </article>
          ))}

          {suspendedSellers.map((seller) => (
            <article className="admin-seller-row suspended" key={seller.id}>
              <div className="admin-seller-icon suspended">
                <Store size={17} />
              </div>
              <div className="admin-seller-identity">
                <b>{seller.store_name || "Seller account"}</b>
                <span>{seller.email}</span>
                <small>
                  {seller.admin_note?.startsWith("REJECTED")
                    ? "Application Rejected by Owner"
                    : "Access Paused by Owner"}
                </small>
              </div>
              <span className="seller-access-state suspended">Paused</span>
              <button
                disabled={busyId === seller.id}
                onClick={() => void toggleActiveStatus(seller)}
                className="btn-restore-access"
              >
                <ShieldCheck size={14} />
                {busyId === seller.id ? "Saving…" : "Restore Access"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
