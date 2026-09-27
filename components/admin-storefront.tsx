"use client";

import { useState, type FormEvent } from "react";
import { ImagePlus, Plus, Save, Trash2 } from "lucide-react";
import type { StorefrontSettings } from "@/lib/storefront-content";

type Category = { name: string; sort_order: number; active: boolean };
const fields: Array<{ key: keyof StorefrontSettings; label: string; max: number; multiline?: boolean; url?: boolean }> = [
  { key: "hero_image_url", label: "Homepage banner image URL", max: 2048, url: true },
  { key: "announcement", label: "Announcement strip", max: 120 }, { key: "eyebrow", label: "Hero eyebrow", max: 100 },
  { key: "title", label: "Hero heading", max: 80 }, { key: "title_emphasis", label: "Hero italic heading", max: 80 },
  { key: "description", label: "Hero description", max: 360, multiline: true }, { key: "cta_label", label: "Button label", max: 50 },
  { key: "caption_one", label: "First hero caption", max: 100 }, { key: "caption_two", label: "Second hero caption", max: 100 },
];

export default function AdminStorefront({ initialSettings, initialCategories }: { initialSettings: StorefrontSettings; initialCategories: Category[] }) {
  const [settings, setSettings] = useState(initialSettings);
  const [categories, setCategories] = useState(initialCategories);
  const [newCategory, setNewCategory] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/storefront", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save homepage content.");
      setSettings(result.settings); setMessage("Homepage content saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save homepage content."); }
    finally { setBusy(false); }
  }
  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/storefront", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newCategory }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not add this category.");
      setCategories((current) => [...current, result.category]); setNewCategory(""); setMessage("Category added to the storefront.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add this category."); }
    finally { setBusy(false); }
  }
  async function deleteCategory(category: Category) {
    if (!window.confirm(`Remove “${category.name}” from the storefront?`)) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/admin/storefront?name=${encodeURIComponent(category.name)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not remove this category.");
      setCategories((current) => current.filter((item) => item.name !== category.name)); setMessage("Category removed.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove this category."); }
    finally { setBusy(false); }
  }
  return <div className="admin-storefront"><section className="admin-panel"><div className="admin-panel-tools"><h2>Homepage content</h2><span>Visible on the storefront</span></div>{message && <p className="admin-inline-message" role="status">{message}</p>}<form className="admin-storefront-form" onSubmit={saveSettings}><div className="admin-content-fields">{fields.map(({ key, label, max, multiline, url }) => <label key={key} className={multiline ? "field-wide" : ""}><span>{label}</span>{!url && <small>{settings[key].length}/{max}</small>}{multiline ? <textarea maxLength={max} required rows={4} value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))}/> : <input type={url ? "url" : "text"} maxLength={max} required={!url} value={settings[key]} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} placeholder={url ? "https://…" : undefined}/>}</label>)}</div><button className="admin-primary" disabled={busy}><Save size={15}/>{busy ? "Saving…" : "Save homepage"}</button></form></section><section className="admin-panel"><div className="admin-panel-tools"><h2>Store categories</h2><span>{categories.length} active</span></div>{categories.length ? <div className="admin-category-list">{categories.map((category) => <div key={category.name}><span>{category.name}</span><button aria-label={`Remove ${category.name}`} disabled={busy} onClick={() => void deleteCategory(category)}><Trash2 size={14}/>Remove</button></div>)}</div> : <div className="admin-empty"><b>No categories yet</b><span>Add at least one category before publishing products.</span></div>}<form className="admin-category-add" onSubmit={addCategory}><label><span>New category</span><input maxLength={60} minLength={2} required value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Fresh & Citrus"/></label><button className="admin-primary" disabled={busy}><Plus size={15}/> Add category</button></form><p className="admin-report-scope"><ImagePlus size={13}/> A category can only be removed when no perfume is assigned to it. Payment and discount settings will be added in the later payment stage.</p></section></div>;
}
