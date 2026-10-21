"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeIndianRupee,
  Check,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Eye,
  EyeOff,
  ImagePlus,
  Package,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  Store,
  Tag,
  Trash2,
  Undo2,
  AlertTriangle,
  Minus,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import ShippingLabelModal, { type ShippingLabelOrder } from "@/components/shipping-label-modal";
import { generateDefaultSku } from "@/lib/products";

export type ProductVariantItem = {
  id?: string;
  sku?: string;
  size: string;
  pricePaise: number;
  compareAtPaise?: number;
  stock: number;
  imageUrl?: string;
  images?: string[];
};

export type VariantForm = {
  id?: string;
  sku?: string;
  size: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  imageUrl: string;
};

type SellerProduct = {
  id: string;
  sku?: string;
  slug: string;
  name: string;
  category: string;
  pricePaise: number;
  compareAtPaise?: number;
  size: string;
  concentration: string;
  notes: string[];
  description: string;
  imageUrl?: string;
  images?: string[];
  accent: string;
  stock: number;
  active: boolean;
  createdAt: string;
  variants?: ProductVariantItem[];
};

type ProductForm = {
  name: string;
  slug: string;
  category: string;
  price: string;
  compareAtPrice: string;
  size: string;
  concentration: string;
  notes: string;
  description: string;
  imageUrl: string;
  images: string[];
  accent: string;
  stock: string;
  active: boolean;
  variants: VariantForm[];
};

type SellerOrderItem = {
  product_name: string;
  size: string;
  unit_price_paise: number;
  quantity: number;
  line_total_paise: number;
};

type SellerOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  shipping_address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  status: string;
  created_at: string;
  order_items: SellerOrderItem[];
  fulfillment: {
    status: string;
    tracking_carrier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
  };
};

type SellerReturn = {
  id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  reason: string;
  details: string;
  status: string;
  created_at: string;
};

const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    paise / 100
  );

const blankForm = (category: string): ProductForm => ({
  name: "",
  slug: "",
  category,
  price: "",
  compareAtPrice: "",
  size: "50 ml",
  concentration: "Eau de Parfum",
  notes: "",
  description: "",
  imageUrl: "",
  images: [],
  accent: "#ad7045",
  stock: "10",
  active: true,
  variants: [
    { size: "50 ml", sku: "", price: "", compareAtPrice: "", stock: "10", imageUrl: "" },
  ],
});

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 140);

const transitions: Record<string, string[]> = {
  paid: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};

export default function SellerDashboard({
  storeName: initialStoreName,
  initialProducts,
  categories,
}: {
  storeName: string;
  initialProducts: SellerProduct[];
  categories: string[];
}) {
  const [tab, setTab] = useState<"products" | "orders" | "returns" | "earnings" | "settings">("products");
  const [currentStoreName, setCurrentStoreName] = useState(initialStoreName);
  const [storeNameInput, setStoreNameInput] = useState(initialStoreName);
  const [savingStoreName, setSavingStoreName] = useState(false);

  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [returns, setReturns] = useState<SellerReturn[]>([]);
  const [grossSales, setGrossSales] = useState(0);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedLabelOrder, setSelectedLabelOrder] = useState<ShippingLabelOrder | null>(null);

  // Product Catalog Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden" | "low_stock">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "stock_asc">("newest");

  // Inline Quick Stock Edits
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState<ProductForm>(() => blankForm(categories[0] ?? "Perfume"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingVariantIndex, setUploadingVariantIndex] = useState<number | null>(null);
  const [variantUploadErrors, setVariantUploadErrors] = useState<Record<number, string>>({});
  const [variantUrlInputs, setVariantUrlInputs] = useState<Record<number, boolean>>({});
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [savingFulfillment, setSavingFulfillment] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; trackingCarrier: string; trackingNumber: string; trackingUrl: string }>>({});
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Metrics
  const activeProducts = useMemo(() => products.filter((p) => p.active).length, [products]);
  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= 5).length, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.notes.some((n) => n.toLowerCase().includes(q)) ||
          p.slug.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.variants && p.variants.some((v) => v.sku && v.sku.toLowerCase().includes(q)))
      );
    }

    // Status filter
    if (statusFilter === "active") {
      result = result.filter((p) => p.active);
    } else if (statusFilter === "hidden") {
      result = result.filter((p) => !p.active);
    } else if (statusFilter === "low_stock") {
      result = result.filter((p) => p.stock <= 5);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((p) => p.category === categoryFilter);
    }

    // Sorting
    if (sortBy === "price_asc") {
      result.sort((a, b) => a.pricePaise - b.pricePaise);
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => b.pricePaise - a.pricePaise);
    } else if (sortBy === "stock_asc") {
      result.sort((a, b) => a.stock - b.stock);
    } else {
      // Newest first
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [products, searchQuery, statusFilter, categoryFilter, sortBy]);

  // Load orders
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/seller/orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load Seller orders.");
        if (cancelled) return;
        setOrders(data.orders ?? []);
        setReturns(data.returns ?? []);
        setGrossSales(data.grossSalesPaise ?? 0);
        setOrdersLoaded(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setOrdersError(error instanceof Error ? error.message : "Could not load Seller orders.");
        setOrdersLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function beginAdd() {
    setEditingId(null);
    setForm(blankForm(categories[0] ?? "Perfume"));
    setFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  function handleAddVariant(presetSize?: string) {
    setForm((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          size: presetSize || "",
          sku: "",
          price: "",
          compareAtPrice: "",
          stock: "10",
          imageUrl: "",
        },
      ],
    }));
  }

  function handleRemoveVariant(index: number) {
    setForm((current) => {
      if (current.variants.length <= 1) return current;
      return {
        ...current,
        variants: current.variants.filter((_, idx) => idx !== index),
      };
    });
  }

  function handleUpdateVariant(index: number, patch: Partial<VariantForm>) {
    setForm((current) => {
      const next = [...current.variants];
      next[index] = { ...next[index], ...patch };
      return {
        ...current,
        variants: next,
      };
    });
  }

  async function compressImage(file: File, maxDimension = 1600, quality = 0.85): Promise<File> {
    if (typeof window === "undefined") return file;
    if (file.size <= 500 * 1024) return file;
    return new Promise((resolve) => {
      try {
        const img = new window.Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          let width = img.width;
          let height = img.height;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve(file);
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) return resolve(file);
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = objectUrl;
      } catch {
        resolve(file);
      }
    });
  }

  async function uploadVariantPhoto(variantIndex: number, fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploadingVariantIndex(variantIndex);
    setMessage("");
    setErrorMessage("");
    try {
      const file = fileList[0];
      const body = new FormData();
      body.append("images", file);
      const response = await fetch("/api/seller/products/image", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not upload photo.");

      const newUrl: string =
        Array.isArray(data.imageUrls) && data.imageUrls[0]
          ? data.imageUrls[0]
          : data.imageUrl || "";

      if (newUrl) {
        handleUpdateVariant(variantIndex, { imageUrl: newUrl });
        // Also register in gallery images so seller can reuse it anywhere
        setForm((current) => {
          const hasIt = current.images.includes(newUrl);
          return {
            ...current,
            images: hasIt ? current.images : [...current.images, newUrl],
            imageUrl: current.imageUrl || newUrl,
          };
        });
        setMessage(`Photo for size "${form.variants[variantIndex]?.size || variantIndex + 1}" uploaded successfully!`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not upload photo.");
    } finally {
      setUploadingVariantIndex(null);
    }
  }

  function beginEdit(product: SellerProduct) {
    setEditingId(product.id);
    const existingImages =
      product.images && product.images.length > 0
        ? product.images
        : product.imageUrl
        ? [product.imageUrl]
        : [];

    const initialVariants: VariantForm[] =
      product.variants && product.variants.length > 0
        ? product.variants.map((v, i) => ({
            id: v.id,
            sku: v.sku || generateDefaultSku(product.name, v.size, i),
            size: v.size,
            price: String(v.pricePaise / 100),
            compareAtPrice: v.compareAtPaise ? String(v.compareAtPaise / 100) : "",
            stock: String(v.stock),
            imageUrl: v.imageUrl || "",
          }))
        : [
            {
              sku: product.sku || generateDefaultSku(product.name, product.size || "50 ml", 0),
              size: product.size || "50 ml",
              price: String(product.pricePaise / 100),
              compareAtPrice: product.compareAtPaise ? String(product.compareAtPaise / 100) : "",
              stock: String(product.stock),
              imageUrl: product.imageUrl || "",
            },
          ];

    setForm({
      name: product.name,
      slug: product.slug,
      category: product.category,
      price: initialVariants[0]?.price || String(product.pricePaise / 100),
      compareAtPrice: initialVariants[0]?.compareAtPrice || (product.compareAtPaise ? String(product.compareAtPaise / 100) : ""),
      size: initialVariants[0]?.size || product.size,
      concentration: product.concentration,
      notes: product.notes.join(", "),
      description: product.description,
      imageUrl: product.imageUrl ?? existingImages[0] ?? "",
      images: existingImages,
      accent: product.accent,
      stock: String(product.stock),
      active: product.active,
      variants: initialVariants,
    });
    setFormOpen(true);
    setMessage("");
    setErrorMessage("");
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    try {
      if (!form.variants || form.variants.length === 0) {
        throw new Error("Please add at least one bottle size variation.");
      }

      for (let i = 0; i < form.variants.length; i++) {
        const v = form.variants[i];
        if (!v.size.trim()) {
          throw new Error(`Size name is required for size variation #${i + 1}`);
        }
        const p = Number(v.price);
        if (Number.isNaN(p) || p <= 0) {
          throw new Error(`Valid selling price in ₹ is required for variation "${v.size}"`);
        }
      }

      const variantPhotos = form.variants
        .map((v) => v.imageUrl?.trim())
        .filter((url): url is string => Boolean(url));
      const combinedImages = Array.from(new Set([...variantPhotos, ...form.images.filter(Boolean)]));
      const primaryImage = variantPhotos[0] || combinedImages[0] || form.imageUrl.trim() || undefined;
      const finalImages = combinedImages.length > 0 ? combinedImages : primaryImage ? [primaryImage] : [];

      const primaryVar = form.variants[0];
      const primaryPrice = Number(primaryVar.price);
      const primaryCompareAt = primaryVar.compareAtPrice ? Number(primaryVar.compareAtPrice) : null;
      const totalStock = form.variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0);

      const payload = {
        ...(editingId ? { id: editingId } : {}),
        ...form,
        size: primaryVar.size.trim(),
        price: primaryPrice,
        compareAtPrice: primaryCompareAt,
        stock: totalStock,
        imageUrl: primaryImage,
        images: finalImages,
        slug: slugify(form.slug || form.name) || `perfume-${Date.now()}`,
        variants: form.variants.map((v, i) => ({
          id: v.id,
          sku: v.sku?.trim().toUpperCase() || generateDefaultSku(form.name, v.size, i),
          size: v.size.trim(),
          price: Number(v.price),
          compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
          stock: Number(v.stock) || 0,
          imageUrl: v.imageUrl.trim() || null,
        })),
      };
      const response = await fetch("/api/seller/products", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save this perfume.");
      const product = data.product as SellerProduct;
      setProducts((current) =>
        editingId ? current.map((item) => (item.id === product.id ? product : item)) : [product, ...current]
      );
      setFormOpen(false);
      setEditingId(null);
      setMessage(editingId ? `Changes saved for "${product.name}".` : `"${product.name}" added to your catalogue!`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save this perfume.");
    } finally {
      setBusy(false);
    }
  }



  async function deleteProduct(product: SellerProduct) {
    if (!window.confirm(`Delete "${product.name}" from your catalogue?`)) return;
    setDeletingProductId(product.id);
    setMessage("");
    setErrorMessage("");
    try {
      const response = await fetch("/api/seller/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this perfume.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setMessage(`"${product.name}" deleted from your catalogue.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not delete this perfume.");
    } finally {
      setDeletingProductId(null);
    }
  }

  // Quick 1-click toggle visibility
  async function toggleProduct(product: SellerProduct) {
    setErrorMessage("");
    setMessage("");
    try {
      const response = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, active: !product.active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update status.");
      setProducts((current) => current.map((item) => (item.id === product.id ? data.product : item)));
      setMessage(
        data.product.active
          ? `"${product.name}" is now LIVE on Flovexa store!`
          : `"${product.name}" is now HIDDEN (Draft).`
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update visibility.");
    }
  }

  // Inline Quick Stock edit
  function handleStockChange(productId: string, val: number) {
    setStockDrafts((curr) => ({ ...curr, [productId]: Math.max(0, val) }));
  }

  async function saveQuickStock(product: SellerProduct) {
    const newStock = stockDrafts[product.id] ?? product.stock;
    setSavingStockId(product.id);
    setErrorMessage("");
    setMessage("");
    try {
      const response = await fetch("/api/seller/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, stock: newStock }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update stock.");
      setProducts((current) => current.map((item) => (item.id === product.id ? data.product : item)));
      setMessage(`Stock updated for "${product.name}" to ${newStock} units.`);
      setStockDrafts((curr) => {
        const copy = { ...curr };
        delete copy[product.id];
        return copy;
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update stock.");
    } finally {
      setSavingStockId(null);
    }
  }

  // Update store profile name
  async function handleUpdateStoreName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingStoreName(true);
    setErrorMessage("");
    setMessage("");
    try {
      const res = await fetch("/api/seller/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: storeNameInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update store name.");
      setCurrentStoreName(data.storeName);
      setMessage("Store brand name updated successfully!");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not update store name.");
    } finally {
      setSavingStoreName(false);
    }
  }

  function draftFor(order: SellerOrder) {
    return (
      drafts[order.id] ?? {
        status: order.fulfillment.status,
        trackingCarrier: order.fulfillment.tracking_carrier ?? "",
        trackingNumber: order.fulfillment.tracking_number ?? "",
        trackingUrl: order.fulfillment.tracking_url ?? "",
      }
    );
  }

  async function saveFulfillment(order: SellerOrder) {
    const draft = draftFor(order);
    setSavingFulfillment(order.id);
    setMessage("");
    setErrorMessage("");
    try {
      const response = await fetch(`/api/seller/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update shipment.");
      setOrders((current) =>
        current.map((item) => (item.id === order.id ? { ...item, fulfillment: data.fulfillment } : item))
      );
      setMessage(`Order ${order.order_number} shipment details updated.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not update shipment.");
    } finally {
      setSavingFulfillment(null);
    }
  }

  const tabs = [
    { id: "products" as const, label: "Catalogue & Products", icon: Package, count: products.length },
    { id: "orders" as const, label: "Customer Orders", icon: ClipboardList, count: orders.length },
    { id: "returns" as const, label: "Returns", icon: Undo2, count: returns.length },
    { id: "earnings" as const, label: "Gross Sales & Payouts", icon: BadgeIndianRupee },
    { id: "settings" as const, label: "Store Profile", icon: Settings },
  ];

  return (
    <main className="seller-page">
      {/* Top Navbar */}
      <header className="admin-topbar">
        <div className="admin-topbar-brand-wrap">
          <Link href="/store" className="wordmark">
            FLOVEXA<span>PERFUMES</span>
          </Link>
          <span className="portal-badge portal-badge-seller">
            <Store size={12} /> SELLER CENTRAL · MERCHANT WORKSPACE
          </span>
        </div>
        <div className="admin-topbar-actions">
          <Link href="/store" className="portal-switch-link" target="_blank" rel="noopener noreferrer">
            <ExternalLink size={12} /> View Customer Store ↗
          </Link>
          <span className="seller-badge-name">Merchant: {currentStoreName || "Seller account"}</span>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <section className="seller-shell">
        {/* Sidebar Navigation */}
        <aside className="seller-sidebar">
          <span className="seller-sidebar-label">MERCHANT DASHBOARD</span>
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
              <Icon size={15} />
              {label}
              {count !== undefined && <small>{count}</small>}
            </button>
          ))}
          <div className="seller-sidebar-brand">
            <Store size={17} />
            <span>FLOVEXA MARKETPLACE</span>
          </div>
        </aside>

        {/* Content Area */}
        <div className="seller-content">
          <div className="seller-heading">
            <div>
              <span className="eyebrow">FLOVEXA SELLER CENTRAL · MERCHANT HUB</span>
              <h1>
                {tab === "products"
                  ? "Product Catalogue & Inventory"
                  : tab === "orders"
                  ? "Merchant Orders & Dispatch"
                  : tab === "returns"
                  ? "Customer Return Requests"
                  : tab === "earnings"
                  ? "Sales Revenue & Settlements"
                  : "Store Profile & Settings"}
              </h1>
              <p>
                {tab === "products"
                  ? "Add, edit, manage stock, and toggle visibility for your luxury perfumes on Flovexa."
                  : tab === "orders"
                  ? "Track paid orders containing your fragrances, and provide courier tracking numbers."
                  : tab === "returns"
                  ? "Review any return inquiries filed by fragrance customers."
                  : tab === "earnings"
                  ? "Overview of your gross product sales and settlement information."
                  : "Update your perfume brand name and merchant details."}
              </p>
            </div>
            {tab === "products" && (
              <button className="admin-primary seller-add-btn" onClick={beginAdd}>
                <Plus size={16} /> Add New Perfume
              </button>
            )}
          </div>

          {(message || errorMessage) && (
            <div className={`seller-message ${errorMessage ? "seller-message-error" : ""}`}>
              {errorMessage || message}
            </div>
          )}

          {/* Metric Stats Cards */}
          <div className="seller-stats">
            <div>
              <span>TOTAL LISTINGS</span>
              <b>{products.length}</b>
              <small>{activeProducts} live in customer store</small>
            </div>
            <div>
              <span>LOW / OUT OF STOCK</span>
              <b style={{ color: lowStockProducts > 0 ? "#b45309" : "inherit" }}>{lowStockProducts}</b>
              <small>{lowStockProducts > 0 ? "Requires restock" : "Inventory healthy"}</small>
            </div>
            <div>
              <span>OPEN ORDERS</span>
              <b>{orders.filter((order) => order.fulfillment.status !== "delivered").length}</b>
              <small>{orders.length} total customer orders</small>
            </div>
            <div>
              <span>GROSS SALES</span>
              <b>{money(grossSales)}</b>
              <small>Captured revenue</small>
            </div>
          </div>

          {/* 1. PRODUCT MANAGEMENT TAB */}
          {tab === "products" && (
            <section className="seller-panel">
              {/* Add / Edit Drawer Form */}
              {formOpen && (
                <form className="seller-product-form-v2" onSubmit={saveProduct}>
                  {/* Form Header */}
                  <div className="seller-form-header-v2">
                    <div>
                      <span className="seller-form-badge">{editingId ? "EDIT PERFUME LISTING" : "NEW PERFUME LISTING"}</span>
                      <h3 className="seller-form-title">{editingId ? `Edit "${form.name}"` : "Add a Perfume to Flovexa"}</h3>
                      <p className="seller-form-subtitle">Fill in the details below to create or update this luxury perfume in your catalogue.</p>
                    </div>
                    <button type="button" className="seller-form-close-btn" onClick={() => setFormOpen(false)}>
                      ✕ Cancel
                    </button>
                  </div>

                  {/* SECTION 1: Basic Information */}
                  <div className="seller-form-section">
                    <div className="seller-form-section-title">
                      <Package size={17} />
                      <span>1. Basic Fragrance Information</span>
                    </div>

                    <div className="seller-form-grid-2">
                      <div className="seller-form-group span-2">
                        <label>
                          Perfume Name <span className="req">*</span>
                        </label>
                        <input
                          required
                          maxLength={120}
                          value={form.name}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              name: event.target.value,
                              slug: slugify(event.target.value),
                            }))
                          }
                          placeholder="e.g. Saffron Royale / Oud Imperial"
                        />
                        <small>The primary luxury fragrance name customers see on the storefront</small>
                      </div>

                      <div className="seller-form-group">
                        <label>
                          Category <span className="req">*</span>
                        </label>
                        <select
                          value={form.category}
                          onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                        >
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category === "Perfume"
                                ? "Perfumes (Eau de Parfum)"
                                : category === "Fragrance"
                                ? "Fragrance Oils (Attar)"
                                : category}
                            </option>
                          ))}
                        </select>
                        <small>Store category & filter group</small>
                      </div>

                      <div className="seller-form-group">
                        <label>
                          Concentration Type <span className="req">*</span>
                        </label>
                        <input
                          required
                          maxLength={80}
                          value={form.concentration}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, concentration: event.target.value }))
                          }
                          placeholder="e.g. Eau de Parfum / Extrait de Parfum / Concentrated Perfume Oil"
                        />
                        <small>Fragrance potency and formulation level</small>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Bottle Sizes & Variations */}
                  <div className="seller-form-section">
                    <div className="seller-form-section-title">
                      <BadgeIndianRupee size={17} />
                      <span>2. Bottle Size & Volume Variations ({form.variants.length} size{form.variants.length > 1 ? "s" : ""})</span>
                    </div>
                    <p className="seller-section-desc">
                      Add all bottle sizes (e.g. 50 ml, 20 ml, 10 ml) for this perfume. You can upload bottle photos directly from your device, with live customer price switching on Flovexa.
                    </p>

                    {/* Quick Add Presets */}
                    <div className="seller-variant-presets-row">
                      <span className="seller-variant-presets-label">⚡ Quick Add Common Sizes:</span>
                      <div className="seller-variant-presets-btns">
                        {["10 ml", "20 ml", "30 ml", "50 ml", "100 ml"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className="seller-variant-preset-btn"
                            onClick={() => handleAddVariant(preset)}
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Variant Cards List */}
                    <div className="seller-variants-list">
                      {form.variants.map((v, idx) => (
                        <div key={idx} className="seller-variant-card">
                          <div className="seller-variant-card-header">
                            <div className="seller-variant-card-title">
                              <span className="seller-variant-num-badge">Size #{idx + 1}</span>
                              <strong className="seller-variant-heading">{v.size ? v.size : "New Size Variation"}</strong>
                              {idx === 0 && <span className="seller-variant-primary-badge">★ Primary / Default</span>}
                              {v.imageUrl && <span className="seller-variant-custom-photo-badge">📷 Custom Photo</span>}
                              {v.sku && <span className="seller-variant-sku-badge">SKU: {v.sku}</span>}
                            </div>
                            {form.variants.length > 1 && (
                              <button
                                type="button"
                                className="seller-variant-delete-btn"
                                onClick={() => handleRemoveVariant(idx)}
                                title="Remove this size variation"
                              >
                                <Trash2 size={13} /> Remove Size
                              </button>
                            )}
                          </div>

                          {/* 2-Column Responsive Body */}
                          <div className="seller-variant-card-body">
                            {/* Column 1: Pricing & Inventory Details */}
                            <div className="seller-variant-col-details">
                              <div className="seller-variant-field-row">
                                <div className="seller-form-group">
                                  <label>
                                    Bottle Size / Volume <span className="req">*</span>
                                  </label>
                                  <input
                                    required
                                    maxLength={40}
                                    value={v.size}
                                    onChange={(e) => handleUpdateVariant(idx, { size: e.target.value })}
                                    placeholder="e.g. 50 ml, 20 ml, 10 ml"
                                  />
                                  <small>Volume shown on size selection pill</small>
                                </div>

                                <div className="seller-form-group">
                                  <label>
                                    Available Stock (Bottles) <span className="req">*</span>
                                  </label>
                                  <input
                                    required
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={v.stock}
                                    onChange={(e) => handleUpdateVariant(idx, { stock: e.target.value })}
                                    placeholder="10"
                                  />
                                  <small>Units ready to ship</small>
                                </div>
                              </div>

                              <div className="seller-variant-field-row">
                                <div className="seller-form-group">
                                  <label>
                                    Selling Price (₹) <span className="req">*</span>
                                  </label>
                                  <div className="seller-input-prefix">
                                    <span>₹</span>
                                    <input
                                      required
                                      type="number"
                                      min="1"
                                      step="0.01"
                                      value={v.price}
                                      onChange={(e) => handleUpdateVariant(idx, { price: e.target.value })}
                                      placeholder="499"
                                    />
                                  </div>
                                  <small>Customer purchase price</small>
                                </div>

                                <div className="seller-form-group">
                                  <label>
                                    MRP / Regular Price (₹) <small className="opt">(Optional)</small>
                                  </label>
                                  <div className="seller-input-prefix">
                                    <span>₹</span>
                                    <input
                                      type="number"
                                      min="1"
                                      step="0.01"
                                      value={v.compareAtPrice}
                                      onChange={(e) => handleUpdateVariant(idx, { compareAtPrice: e.target.value })}
                                      placeholder="999"
                                    />
                                  </div>
                                  {(() => {
                                    const p = Number(v.price) || 0;
                                    const mrp = Number(v.compareAtPrice) || 0;
                                    if (mrp > p && p > 0) {
                                      const disc = Math.round(((mrp - p) / mrp) * 100);
                                      return <small className="seller-variant-discount-calc">✓ {disc}% discount shown to customer</small>;
                                    }
                                    return <small>Strikethrough discount price</small>;
                                  })()}
                                </div>
                              </div>

                              {/* SKU Field Row */}
                              <div className="seller-variant-sku-row">
                                <div className="seller-form-group">
                                  <label>
                                    SKU (Stock Keeping Unit) <small className="opt">(Optional - Auto-generated if blank)</small>
                                  </label>
                                  <div className="seller-sku-input-wrap">
                                    <input
                                      type="text"
                                      maxLength={50}
                                      value={v.sku || ""}
                                      onChange={(e) => handleUpdateVariant(idx, { sku: e.target.value.toUpperCase() })}
                                      placeholder={`e.g. ${generateDefaultSku(form.name, v.size, idx)}`}
                                      className="seller-sku-input"
                                    />
                                    <button
                                      type="button"
                                      className="seller-auto-sku-btn"
                                      title="Auto-generate SKU code"
                                      onClick={() => handleUpdateVariant(idx, { sku: generateDefaultSku(form.name, v.size, idx) })}
                                    >
                                      Auto SKU
                                    </button>
                                  </div>
                                  <small>Inventory tracking barcode / SKU for warehouse & shipping</small>
                                </div>
                              </div>
                            </div>

                            {/* Column 2: Bottle Photo Upload (Direct Device Browse) */}
                            <div className="seller-variant-col-photo">
                              <div className="seller-variant-photo-card">
                                <div className="seller-variant-photo-card-header">
                                  <strong>Bottle Photo for {v.size || `Size #${idx + 1}`}</strong>
                                  <small className="opt">(Optional)</small>
                                </div>

                                <div className="seller-variant-photo-interactive">
                                  {/* Preview Box */}
                                  <div className={`seller-variant-photo-preview-box ${v.imageUrl ? "has-image" : "empty"}`}>
                                    {v.imageUrl ? (
                                      <Image
                                        src={v.imageUrl}
                                        alt={`Photo for ${v.size}`}
                                        width={76}
                                        height={76}
                                        unoptimized
                                      />
                                    ) : (
                                      <div className="seller-variant-photo-placeholder">
                                        <ImagePlus size={22} />
                                        <span>No photo</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Upload Controls */}
                                  <div className="seller-variant-photo-controls">
                                    <label className={`seller-variant-file-btn ${uploadingVariantIndex === idx ? "uploading" : ""}`}>
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={uploadingVariantIndex === idx || busy}
                                        onChange={(e) => {
                                          void uploadVariantPhoto(idx, e.currentTarget.files);
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                      <UploadCloud size={14} />
                                      <span>
                                        {uploadingVariantIndex === idx
                                          ? "Uploading photo…"
                                          : v.imageUrl
                                          ? "Change Photo (Browse)"
                                          : "📁 Browse & Upload Photo"}
                                      </span>
                                    </label>

                                    {v.imageUrl && (
                                      <button
                                        type="button"
                                        className="seller-variant-photo-reset-btn"
                                        onClick={() => handleUpdateVariant(idx, { imageUrl: "" })}
                                      >
                                        <Trash2 size={12} /> Remove (Use Default Cover)
                                      </button>
                                    )}

                                    <span className="seller-variant-photo-hint">
                                      {v.imageUrl
                                        ? "✓ This photo displays when customer selects this size."
                                        : "Upload a specific photo for this size, or Flovexa will use the main perfume cover."}
                                    </span>
                                  </div>
                                </div>

                                {/* Gallery Thumbs Quick Pick */}
                                {form.images.length > 0 && (
                                  <div className="seller-variant-gallery-picker-wrap">
                                    <span className="seller-variant-gallery-picker-label">Or choose from uploaded photos:</span>
                                    <div className="seller-variant-gallery-picker-grid">
                                      {form.images.map((imgUrl, thumbIdx) => {
                                        const isSelected = v.imageUrl === imgUrl;
                                        return (
                                          <button
                                            key={`${imgUrl}-${thumbIdx}`}
                                            type="button"
                                            className={`seller-variant-gallery-pick-btn ${isSelected ? "selected" : ""}`}
                                            onClick={() => handleUpdateVariant(idx, { imageUrl: imgUrl })}
                                            title={`Assign photo #${thumbIdx + 1} to this size`}
                                          >
                                            <Image src={imgUrl} alt="" width={38} height={38} unoptimized />
                                            {isSelected && <span className="seller-variant-pick-tick">✓</span>}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="seller-add-variant-btn"
                      onClick={() => handleAddVariant()}
                    >
                      <Plus size={16} /> + Add Another Bottle Size Variation
                    </button>
                  </div>

                  {/* SECTION 3: Fragrance Notes & Description */}
                  <div className="seller-form-section">
                    <div className="seller-form-section-title">
                      <Sparkles size={17} />
                      <span>3. Fragrance Notes & Story</span>
                    </div>

                    <div className="seller-form-grid-1">
                      <div className="seller-form-group">
                        <label>
                          Fragrance Notes (comma separated) <span className="req">*</span>
                        </label>
                        <input
                          required
                          maxLength={240}
                          value={form.notes}
                          placeholder="e.g. Bergamot, Turkish Rose, Amber, Mysore Sandalwood, Dark Cocoa"
                          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                        />
                        <small>Key scent ingredients separated by commas (shown on product page highlights)</small>
                      </div>

                      <div className="seller-form-group">
                        <label>
                          Perfume Description & Story <span className="req">*</span>
                        </label>
                        <textarea
                          required
                          minLength={10}
                          maxLength={1600}
                          rows={4}
                          value={form.description}
                          placeholder="Describe the mood, fragrance journey, opening citrus/spices, rich heart notes, and long-lasting luxury drydown..."
                          onChange={(event) =>
                            setForm((current) => ({ ...current, description: event.target.value }))
                          }
                        />
                        <small>Detailed fragrance description for prospective customers</small>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: Visibility Toggle & Submit Action */}
                  <div className="seller-form-footer-v2">
                    <label className="seller-visibility-toggle-card">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, active: event.target.checked }))
                        }
                      />
                      <div>
                        <strong>Publish to customer store immediately</strong>
                        <small>When enabled, this perfume appears on Flovexa catalog and can be purchased right away</small>
                      </div>
                    </label>

                    <div className="seller-form-action-buttons">
                      <button
                        type="button"
                        className="seller-btn-cancel-v2"
                        onClick={() => setFormOpen(false)}
                        disabled={busy || uploadingVariantIndex !== null}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="seller-btn-save-v2"
                        disabled={busy || uploadingVariantIndex !== null}
                      >
                        <Save size={16} />
                        {uploadingVariantIndex !== null
                          ? "Uploading photo…"
                          : busy
                          ? "Saving perfume…"
                          : editingId
                          ? "Save Perfume Changes"
                          : "Publish Perfume to Store"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Catalog Controls: Search, Filters & Sorting (Meesho/Flipkart Style) */}
              <div className="seller-catalog-controls">
                <div className="seller-search-box">
                  <Search size={15} />
                  <input
                    type="search"
                    placeholder="Search by perfume name, notes, or slug..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => setSearchQuery("")} className="seller-search-clear">
                      ✕
                    </button>
                  )}
                </div>

                <div className="seller-filter-group">
                  <div className="seller-filter-pills">
                    <button
                      type="button"
                      className={statusFilter === "all" ? "active" : ""}
                      onClick={() => setStatusFilter("all")}
                    >
                      All ({products.length})
                    </button>
                    <button
                      type="button"
                      className={statusFilter === "active" ? "active" : ""}
                      onClick={() => setStatusFilter("active")}
                    >
                      Live ({activeProducts})
                    </button>
                    <button
                      type="button"
                      className={statusFilter === "hidden" ? "active" : ""}
                      onClick={() => setStatusFilter("hidden")}
                    >
                      Hidden ({products.length - activeProducts})
                    </button>
                    <button
                      type="button"
                      className={statusFilter === "low_stock" ? "active" : ""}
                      onClick={() => setStatusFilter("low_stock")}
                    >
                      Low Stock ({lowStockProducts})
                    </button>
                  </div>

                  <div className="seller-select-filters">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      aria-label="Filter by category"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                      aria-label="Sort listings"
                    >
                      <option value="newest">Newest First</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="stock_asc">Stock: Low to High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Products List / Cards */}
              {!products.length ? (
                <div className="admin-empty">
                  <Package size={28} />
                  <b>Your merchant catalogue is empty</b>
                  <span>Start by adding your first luxury perfume with pricing, stock and olfactory notes.</span>
                  <button onClick={beginAdd}>
                    <Plus size={15} /> Add First Perfume
                  </button>
                </div>
              ) : !filteredProducts.length ? (
                <div className="admin-empty">
                  <Search size={24} />
                  <b>No perfumes matched your filter</b>
                  <span>Try changing your search keyword or clearing the status filter.</span>
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setCategoryFilter("all");
                    }}
                  >
                    Clear All Filters
                  </button>
                </div>
              ) : (
                <div className="seller-product-grid-wrap">
                  <div className="seller-product-table-header">
                    <span>PERFUME</span>
                    <span>PRICE / MRP</span>
                    <span>INVENTORY (STOCK)</span>
                    <span>STORE STATUS</span>
                    <span>ACTIONS</span>
                  </div>

                  <div className="seller-product-list">
                    {filteredProducts.map((product) => {
                      const discountPercent =
                        product.compareAtPaise && product.compareAtPaise > product.pricePaise
                          ? Math.round(
                              ((product.compareAtPaise - product.pricePaise) / product.compareAtPaise) * 100
                            )
                          : 0;

                      const currentDraftStock = stockDrafts[product.id] ?? product.stock;
                      const hasStockDraft =
                        stockDrafts[product.id] !== undefined && stockDrafts[product.id] !== product.stock;

                      return (
                        <article className="seller-product-item" key={product.id}>
                          {/* Column 1: Media & Details */}
                          <div className="seller-product-col-main">
                            <div
                              className="seller-product-mark"
                              style={{ "--juice": product.accent } as React.CSSProperties}
                            >
                              {product.imageUrl ? (
                                <Image
                                  src={product.imageUrl}
                                  alt={product.name}
                                  width={46}
                                  height={54}
                                  unoptimized
                                />
                              ) : (
                                "F"
                              )}
                            </div>
                            <div className="seller-product-details">
                              <div className="seller-product-title-row">
                                <b className="seller-product-name">{product.name}</b>
                                <Link
                                  href={`/products/${product.slug}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="seller-live-preview-link"
                                  title="View on public customer store"
                                >
                                  <ExternalLink size={11} /> View in Store
                                </Link>
                              </div>
                              <div className="seller-product-meta">
                                <span>{product.category}</span>
                                <span>·</span>
                                <span>{product.size}</span>
                                <span>·</span>
                                <span>{product.concentration}</span>
                              </div>
                              {/* SKU Badges */}
                              {product.variants && product.variants.length > 0 ? (
                                <div className="seller-sku-row">
                                  {product.variants.map((v) => (
                                    <span key={v.id || v.size} className="seller-sku-pill" title={`SKU for ${product.name} (${v.size})`}>
                                      <span className="seller-sku-label">SKU</span> {v.sku || generateDefaultSku(product.name, v.size, 0)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="seller-sku-row">
                                  <span className="seller-sku-pill" title={`SKU for ${product.name}`}>
                                    <span className="seller-sku-label">SKU</span> {product.sku || generateDefaultSku(product.name, product.size, 0)}
                                  </span>
                                </div>
                              )}
                              {product.variants && product.variants.length > 1 && (
                                <div className="seller-variants-badge">
                                  ✨ {product.variants.length} Sizes: {product.variants.map((v) => v.size).join(" · ")}
                                </div>
                              )}
                              <div className="seller-notes-chips">
                                {product.notes.slice(0, 3).map((n) => (
                                  <span key={n} className="seller-note-tag">
                                    {n}
                                  </span>
                                ))}
                                {product.notes.length > 3 && (
                                  <span className="seller-note-more">+{product.notes.length - 3}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Column 2: Price & Discount */}
                          <div className="seller-product-col-price">
                            {product.variants && product.variants.length > 1 ? (
                              (() => {
                                const prices = product.variants.map((v) => v.pricePaise);
                                const min = Math.min(...prices);
                                const max = Math.max(...prices);
                                return (
                                  <div className="seller-price-wrap">
                                    <strong>{min === max ? money(min) : `${money(min)} – ${money(max)}`}</strong>
                                    <span className="seller-variants-count-pill">{product.variants.length} Sizes</span>
                                  </div>
                                );
                              })()
                            ) : (
                              <>
                                <div className="seller-price-wrap">
                                  <strong>{money(product.pricePaise)}</strong>
                                  {product.compareAtPaise && <del>{money(product.compareAtPaise)}</del>}
                                </div>
                                {discountPercent > 0 && (
                                  <span className="seller-discount-badge">{discountPercent}% OFF</span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Column 3: Quick Stock Manager (Flipkart/Meesho style) */}
                          <div className="seller-product-col-stock">
                            <div className="seller-stock-control">
                              <button
                                type="button"
                                className="seller-stock-btn"
                                onClick={() => handleStockChange(product.id, currentDraftStock - 1)}
                                disabled={currentDraftStock <= 0}
                                aria-label="Decrease stock"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                className="seller-stock-input"
                                value={currentDraftStock}
                                onChange={(e) => handleStockChange(product.id, Number(e.target.value) || 0)}
                                aria-label="Units in stock"
                              />
                              <button
                                type="button"
                                className="seller-stock-btn"
                                onClick={() => handleStockChange(product.id, currentDraftStock + 1)}
                                aria-label="Increase stock"
                              >
                                <Plus size={11} />
                              </button>
                              {hasStockDraft && (
                                <button
                                  type="button"
                                  className="seller-stock-save-btn"
                                  onClick={() => void saveQuickStock(product)}
                                  disabled={savingStockId === product.id}
                                  title="Save new stock count"
                                >
                                  <Check size={12} />
                                </button>
                              )}
                            </div>
                            <span
                              className={`seller-stock-indicator ${
                                product.stock === 0
                                  ? "seller-stock-out"
                                  : product.stock <= 5
                                  ? "seller-stock-low"
                                  : "seller-stock-ok"
                              }`}
                            >
                              {product.stock === 0 ? (
                                <>
                                  <AlertTriangle size={10} /> Out of stock
                                </>
                              ) : product.stock <= 5 ? (
                                <>Only {product.stock} left</>
                              ) : (
                                <>In stock ({product.stock})</>
                              )}
                            </span>
                            {product.variants && product.variants.length > 1 && (
                              <small className="seller-stock-breakdown">
                                {product.variants.map((v) => `${v.size}: ${v.stock}`).join(" | ")}
                              </small>
                            )}
                          </div>

                          {/* Column 4: Visibility Switch */}
                          <div className="seller-product-col-status">
                            <button
                              type="button"
                              className={`seller-status-toggle-btn ${
                                product.active ? "is-live" : "is-hidden"
                              }`}
                              onClick={() => void toggleProduct(product)}
                              title={
                                product.active
                                  ? "Click to hide from store"
                                  : "Click to publish to store"
                              }
                            >
                              {product.active ? (
                                <>
                                  <Eye size={12} /> LIVE ON STORE
                                </>
                              ) : (
                                <>
                                  <EyeOff size={12} /> HIDDEN DRAFT
                                </>
                              )}
                            </button>
                          </div>

                          {/* Column 5: Actions */}
                          <div className="seller-product-col-actions">
                            <button
                              type="button"
                              className="seller-action-edit"
                              onClick={() => beginEdit(product)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="seller-action-delete"
                              disabled={deletingProductId === product.id}
                              onClick={() => void deleteProduct(product)}
                              title="Delete from catalogue"
                            >
                              {deletingProductId === product.id ? "…" : <Trash2 size={13} />}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 2. ORDERS MANAGEMENT TAB */}
          {tab === "orders" && (
            <section className="seller-panel">
              <div className="seller-panel-head">
                <h2>Paid Orders for Your Perfumes</h2>
                <span>{orders.length} orders captured</span>
              </div>
              {!ordersLoaded ? (
                <div className="seller-loading">Loading your merchant orders…</div>
              ) : ordersError ? (
                <div className="seller-loading seller-error-text">{ordersError}</div>
              ) : !orders.length ? (
                <div className="admin-empty">
                  <ClipboardList size={28} />
                  <b>No customer orders yet</b>
                  <span>Orders containing your perfumes will appear here immediately after payment.</span>
                </div>
              ) : (
                <div className="seller-order-list">
                  {orders.map((order) => {
                    const draft = draftFor(order);
                    const next = transitions[order.fulfillment.status] ?? [];
                    const totalBottles = order.order_items.reduce((sum, item) => sum + (item.quantity || 1), 0);
                    const isCombo = totalBottles > 1 || order.order_items.length > 1;

                    return (
                      <article className="seller-order" key={order.id}>
                        <div className="seller-order-head">
                          <div>
                            <b>{order.order_number}</b>
                            <small>
                              {new Date(order.created_at).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </small>
                          </div>
                          <div className="seller-order-head-actions">
                            <button
                              type="button"
                              className="seller-order-label-btn"
                              onClick={() =>
                                setSelectedLabelOrder({
                                  id: order.id,
                                  order_number: order.order_number,
                                  customer_name: order.customer_name,
                                  phone: order.phone,
                                  shipping_address: order.shipping_address,
                                  status: draft.status,
                                  payment_status: "captured",
                                  total_paise: order.order_items.reduce((s, it) => s + it.line_total_paise, 0),
                                  created_at: order.created_at,
                                  tracking_carrier: draft.trackingCarrier,
                                  tracking_number: draft.trackingNumber,
                                  tracking_url: draft.trackingUrl,
                                  order_items: order.order_items,
                                })
                              }
                              title="Print 1 shipping label for all items to this address"
                            >
                              <Printer size={13} />
                              <span>{isCombo ? `Print Combo Label (1 for Address)` : `Print Label`}</span>
                            </button>
                            <span className={`seller-status seller-status-${draft.status}`}>
                              {draft.status.replaceAll("_", " ")}
                            </span>
                          </div>
                        </div>

                        {/* Multi-Item Fragrance Combo Strip */}
                        {isCombo && (
                          <div className="seller-combo-badge-strip">
                            <Sparkles size={12} />
                            <strong>Consolidated Fragrance Combo ({totalBottles} Items)</strong>
                            <span>· 1 Single Shipping Label Generated for Address</span>
                          </div>
                        )}
                        <div className="seller-order-customer">
                          <b>{order.customer_name}</b>
                          <a href={`tel:${order.phone}`}>{order.phone}</a>
                        </div>
                        <div className="seller-order-lines">
                          {order.order_items.map((item, index) => (
                            <div key={`${order.id}-${index}`}>
                              <span>
                                {item.product_name} · {item.size} × {item.quantity}
                              </span>
                              <b>{money(item.line_total_paise)}</b>
                            </div>
                          ))}
                        </div>
                        <p className="seller-order-address">
                          {order.shipping_address.line1}
                          {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ""},{" "}
                          {order.shipping_address.city}, {order.shipping_address.state}{" "}
                          {order.shipping_address.pincode}
                        </p>
                        {next.length > 0 && (
                          <div className="seller-fulfillment">
                            <label>
                              Next step
                              <select
                                value={draft.status}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [order.id]: { ...draft, status: event.target.value },
                                  }))
                                }
                              >
                                <option value={order.fulfillment.status}>
                                  {order.fulfillment.status.replaceAll("_", " ")}
                                </option>
                                {next.map((status) => (
                                  <option key={status} value={status}>
                                    {status.replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Courier Partner
                              <input
                                value={draft.trackingCarrier}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [order.id]: { ...draft, trackingCarrier: event.target.value },
                                  }))
                                }
                                placeholder="e.g. Blue Dart, Delhivery"
                              />
                            </label>
                            <label>
                              Tracking Number / AWB
                              <input
                                value={draft.trackingNumber}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [order.id]: { ...draft, trackingNumber: event.target.value },
                                  }))
                                }
                                placeholder="Shipment reference"
                              />
                            </label>
                            <label>
                              Tracking URL
                              <input
                                type="url"
                                value={draft.trackingUrl}
                                onChange={(event) =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [order.id]: { ...draft, trackingUrl: event.target.value },
                                  }))
                                }
                                placeholder="https://..."
                              />
                            </label>
                            <button
                              onClick={() => void saveFulfillment(order)}
                              disabled={savingFulfillment === order.id}
                            >
                              <Check size={13} />
                              {savingFulfillment === order.id ? "Saving…" : "Save update"}
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* 3. RETURNS TAB */}
          {tab === "returns" && (
            <section className="seller-panel">
              <div className="seller-panel-head">
                <h2>Customer Return Requests</h2>
                <span>{returns.length} requests</span>
              </div>
              {!ordersLoaded ? (
                <div className="seller-loading">Loading return requests…</div>
              ) : ordersError ? (
                <div className="seller-loading seller-error-text">{ordersError}</div>
              ) : !returns.length ? (
                <div className="admin-empty">
                  <Undo2 size={28} />
                  <b>No return requests</b>
                  <span>Return inquiries for your perfume orders will be shown here.</span>
                </div>
              ) : (
                <div className="seller-order-list">
                  {returns.map((request) => (
                    <article className="seller-order" key={request.id}>
                      <div className="seller-order-head">
                        <div>
                          <b>{request.order_number}</b>
                          <small>
                            {request.customer_name} ·{" "}
                            {new Date(request.created_at).toLocaleDateString("en-IN", {
                              dateStyle: "medium",
                            })}
                          </small>
                        </div>
                        <span className="seller-status">{request.status.replaceAll("_", " ")}</span>
                      </div>
                      <b className="seller-return-reason">{request.reason.replaceAll("_", " ")}</b>
                      <p className="seller-order-address">{request.details || "No extra details supplied."}</p>
                      <small className="seller-owner-note">
                        Coordinated with Flovexa customer support team.
                      </small>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* 4. EARNINGS TAB */}
          {tab === "earnings" && (
            <section className="seller-panel seller-earnings">
              <div className="seller-panel-head">
                <h2>Gross Sales & Settlements</h2>
                <span>Captured revenue breakdown</span>
              </div>
              <div className="seller-earning-total">
                <BadgeIndianRupee size={22} />
                <div>
                  <span>GROSS PRODUCT SALES</span>
                  <b>{money(grossSales)}</b>
                </div>
              </div>
              <p>
                This amount represents the gross product value of captured customer orders containing your
                perfumes. It excludes store delivery charges and returns.
              </p>
              <div className="seller-settlement-note">
                <b>Settlement & Direct Bank Transfers</b>
                <span>
                  Flovexa settles merchant accounts weekly. Bank account information, commission statements,
                  and GST invoices can be configured in your Store Profile.
                </span>
              </div>
            </section>
          )}

          {/* 5. STORE SETTINGS & PROFILE TAB */}
          {tab === "settings" && (
            <section className="seller-panel">
              <div className="seller-panel-head">
                <h2>Merchant Store Profile</h2>
                <span>Brand identification & details</span>
              </div>

              <div className="seller-settings-card">
                <form onSubmit={handleUpdateStoreName} className="seller-settings-form">
                  <label>
                    Perfume Brand / Merchant Store Name
                    <input
                      type="text"
                      required
                      minLength={2}
                      maxLength={100}
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                    />
                  </label>

                  <button type="submit" className="admin-primary" disabled={savingStoreName}>
                    <Save size={14} />
                    {savingStoreName ? "Saving…" : "Update Store Name"}
                  </button>
                </form>

                <div className="seller-info-meta-box">
                  <div>
                    <span>MERCHANT STATUS</span>
                    <b>ACTIVE AUTHORIZED SELLER</b>
                  </div>
                  <div>
                    <span>STOREFRONT LINK</span>
                    <Link href="/store" target="_blank" rel="noopener noreferrer">
                      Visit Public Storefront ↗
                    </Link>
                  </div>
                  <div>
                    <span>CUSTOMER SUPPORT</span>
                    <Link href="/contact">Flovexa Merchant Support Helpdesk</Link>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </section>
      {/* Printable Consolidated Shipping Label Modal */}
      {selectedLabelOrder && (
        <ShippingLabelModal
          order={selectedLabelOrder}
          onClose={() => setSelectedLabelOrder(null)}
        />
      )}
    </main>
  );
}
