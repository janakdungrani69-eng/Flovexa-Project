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
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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

function parseBottleSize(sizeStr: string): { amount: string; unit: string } {
  if (!sizeStr) return { amount: "", unit: "ml" };
  const trimmed = sizeStr.trim();
  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(ml|g|oz)?$/i);
  if (match) {
    return {
      amount: match[1],
      unit: (match[2] || "ml").toLowerCase(),
    };
  }
  return { amount: trimmed, unit: "custom" };
}

const transitions: Record<string, string[]> = {
  paid: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
};

const SUGGESTED_NOTES = [
  "Bergamot",
  "Turkish Rose",
  "Mysore Sandalwood",
  "Cambodian Oud",
  "Warm Amber",
  "Cardamom",
  "Madagascar Vanilla",
  "Pink Pepper",
  "White Musk",
  "Italian Neroli",
  "Kashmiri Saffron",
  "Atlas Cedarwood",
  "Indonesian Patchouli",
  "Rich Leather",
];

const CONCENTRATION_PRESETS = [
  "Eau de Parfum",
  "Extrait de Parfum",
  "Concentrated Perfume Oil",
  "Eau de Toilette",
  "Body Mist",
];

function autoGenerateStory(name: string, category: string, concentration: string, notes: string): string {
  const perfumeName = name.trim() || "This signature fragrance";
  const notesList = notes
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const topNotes = notesList.slice(0, 2).join(" and ") || "fresh citrus accords and luminous spices";
  const heartNotes = notesList.slice(2, 4).join(" and ") || "opulent floral essences and aromatic woods";
  const baseNotes = notesList.slice(4).join(", ") || "Mysore sandalwood, warm amber, and sensual musk";

  const templates = [
    `Crafted for connoisseurs of refined luxury, ${perfumeName} opens with captivating bursts of ${topNotes}, seamlessly unfurling into an opulent heart of ${heartNotes}. The fragrance settles into an enduring, magnetic drydown of ${baseNotes}, leaving an unforgettable luxury sillage that lingers gracefully for hours.`,
    `An evocative olfactory creation from Flovexa's luxury archive, ${perfumeName} embodies effortless elegance. It radiates initial accords of ${topNotes}, reveals a deeply rich bouquet of ${heartNotes}, and concludes on a sensual foundation of ${baseNotes}. Perfect for signature everyday luxury and memorable evenings.`,
    `Sensual, sophisticated, and formulated at exquisite ${concentration || "Eau de Parfum"} potency, ${perfumeName} is an artisanal masterpiece. Experience the radiant opening of ${topNotes}, transitioning into intoxicating ${heartNotes}, anchored by warm, long-lasting ${baseNotes} for incomparable longevity.`,
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

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

  // Order Search & Filter State
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | "pending" | "shipped" | "delivered">("all");

  // Inline Quick Stock Edits
  const [stockDrafts, setStockDrafts] = useState<Record<string, number>>({});
  const [savingStockId, setSavingStockId] = useState<string | null>(null);

  // Form states
  const [form, setForm] = useState<ProductForm>(() => blankForm(categories[0] ?? "Perfume"));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [activeFormStep, setActiveFormStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeVariantTab, setActiveVariantTab] = useState<number>(0);
  const [previewVariantIndex, setPreviewVariantIndex] = useState<number>(0);
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
  const totalStockUnits = useMemo(() => {
    return products.reduce((acc, p) => {
      if (p.variants && p.variants.length > 0) {
        return acc + p.variants.reduce((vAcc, v) => vAcc + (Number(v.stock) || 0), 0);
      }
      return acc + (Number(p.stock) || 0);
    }, 0);
  }, [products]);

  // Order Metrics
  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.fulfillment.status === "paid" || o.fulfillment.status === "processing").length,
    [orders]
  );
  const shippedOrdersCount = useMemo(
    () => orders.filter((o) => o.fulfillment.status === "shipped").length,
    [orders]
  );
  const deliveredOrdersCount = useMemo(
    () => orders.filter((o) => o.fulfillment.status === "delivered").length,
    [orders]
  );

  // Return Metrics
  const pendingReturnsCount = useMemo(
    () => returns.filter((r) => r.status === "pending" || r.status === "processing").length,
    [returns]
  );
  const resolvedReturnsCount = useMemo(
    () => returns.filter((r) => r.status === "approved" || r.status === "completed" || r.status === "rejected").length,
    [returns]
  );

  // Filtered Orders for Merchant Orders Tab
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (orderStatusFilter === "pending") {
        if (order.fulfillment.status !== "paid" && order.fulfillment.status !== "processing") return false;
      } else if (orderStatusFilter === "shipped") {
        if (order.fulfillment.status !== "shipped") return false;
      } else if (orderStatusFilter === "delivered") {
        if (order.fulfillment.status !== "delivered") return false;
      }

      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase().trim();
        const matchNum = order.order_number?.toLowerCase().includes(q);
        const matchName = order.customer_name?.toLowerCase().includes(q);
        const matchPhone = order.phone?.includes(q);
        const matchItem = order.order_items?.some((it) => it.product_name.toLowerCase().includes(q));
        if (!matchNum && !matchName && !matchPhone && !matchItem) return false;
      }

      return true;
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

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

  // Sync with URL query (?action=new-product / ?action=edit-product&id=...)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncWithUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const action = params.get("action");
      if (action === "new-product") {
        setEditingId(null);
        setForm(blankForm(categories[0] ?? "Perfume"));
        setActiveFormStep(1);
        setActiveVariantTab(0);
        setPreviewVariantIndex(0);
        setFormOpen(true);
      } else if (action === "edit-product") {
        const id = params.get("id");
        if (id) {
          const found = products.find((p) => p.id === id);
          if (found) {
            setEditingId(found.id);
            setActiveFormStep(1);
            setActiveVariantTab(0);
            setPreviewVariantIndex(0);
            setFormOpen(true);
          }
        }
      } else if (!action) {
        setFormOpen(false);
        setEditingId(null);
      }
    };

    window.addEventListener("popstate", syncWithUrl);
    return () => window.removeEventListener("popstate", syncWithUrl);
  }, [products, categories]);

  function closeStudio() {
    setFormOpen(false);
    setEditingId(null);
    setMessage("");
    setErrorMessage("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      url.searchParams.delete("id");
      window.history.pushState(null, "", url.pathname + (url.search ? url.search : ""));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function beginAdd() {
    setEditingId(null);
    setForm(blankForm(categories[0] ?? "Perfume"));
    setActiveFormStep(1);
    setActiveVariantTab(0);
    setPreviewVariantIndex(0);
    setFormOpen(true);
    setMessage("");
    setErrorMessage("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("action", "new-product");
      url.searchParams.delete("id");
      window.history.pushState({ formOpen: true }, "", url.pathname + "?" + url.searchParams.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleAddVariant(presetSize?: string) {
    setForm((current) => {
      const next = [
        ...current.variants,
        {
          size: presetSize || "50 ml",
          sku: "",
          price: "",
          compareAtPrice: "",
          stock: "10",
          imageUrl: "",
        },
      ];
      setActiveVariantTab(next.length - 1);
      return {
        ...current,
        variants: next,
      };
    });
  }

  function handleRemoveVariant(index: number) {
    setForm((current) => {
      if (current.variants.length <= 1) return current;
      const next = current.variants.filter((_, idx) => idx !== index);
      setActiveVariantTab((prev) => Math.min(prev, next.length - 1));
      return {
        ...current,
        variants: next,
      };
    });
  }

  function handleAutoWriteStory() {
    const generated = autoGenerateStory(form.name, form.category, form.concentration, form.notes);
    setForm((cur) => ({ ...cur, description: generated }));
    setMessage("✨ Luxury perfume story auto-written! You can edit or tweak it freely.");
  }

  function handleToggleNote(note: string) {
    setForm((cur) => {
      const list = cur.notes
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      const exists = list.some((n) => n.toLowerCase() === note.toLowerCase());
      let nextList: string[];
      if (exists) {
        nextList = list.filter((n) => n.toLowerCase() !== note.toLowerCase());
      } else {
        nextList = [...list, note];
      }
      return { ...cur, notes: nextList.join(", ") };
    });
  }
  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void saveProduct();
  }

  async function uploadGalleryImages(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    setMessage("");
    setErrorMessage("");
    try {
      const body = new FormData();
      for (let i = 0; i < fileList.length; i++) {
        body.append("images", fileList[i]);
      }
      const response = await fetch("/api/seller/products/image", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not upload gallery photos.");

      const urls: string[] = Array.isArray(data.imageUrls)
        ? data.imageUrls
        : data.imageUrl
        ? [data.imageUrl]
        : [];

      if (urls.length > 0) {
        setForm((current) => {
          const nextImages = [...current.images];
          urls.forEach((u) => {
            if (!nextImages.includes(u)) nextImages.push(u);
          });
          return {
            ...current,
            images: nextImages,
            imageUrl: current.imageUrl || urls[0],
          };
        });
        setMessage(`${urls.length} photo(s) added to fragrance gallery!`);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Could not upload gallery photo.");
    } finally {
      setBusy(false);
    }
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
    setActiveFormStep(1);
    setActiveVariantTab(0);
    setPreviewVariantIndex(0);
    setFormOpen(true);
    setMessage("");
    setErrorMessage("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("action", "edit-product");
      url.searchParams.set("id", product.id);
      window.history.pushState({ formOpen: true, id: product.id }, "", url.pathname + "?" + url.searchParams.toString());
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function saveProduct(event?: FormEvent<HTMLFormElement>) {
    if (event) event.preventDefault();
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
      closeStudio();
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
        {/* Sticky Luxury Sidebar Navigation */}
        <aside className="seller-sidebar">
          <div className="seller-sidebar-content">
            <div className="seller-sidebar-header">
              <span className="seller-sidebar-label">MERCHANT DASHBOARD</span>
            </div>
            <nav className="seller-sidebar-nav">
              {tabs.map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  type="button"
                  className={`seller-nav-item ${tab === id ? "active" : ""}`}
                  onClick={() => setTab(id)}
                >
                  <Icon size={17} className="seller-nav-icon" />
                  <span className="seller-nav-text">{label}</span>
                  {count !== undefined && <small className="seller-nav-badge">{count}</small>}
                </button>
              ))}
            </nav>
          </div>

          <div className="seller-sidebar-brand">
            <div className="seller-brand-icon-box">
              <Store size={16} />
            </div>
            <div className="seller-brand-text-wrap">
              <strong>FLOVEXA MARKETPLACE</strong>
              <small>Authorized Merchant Portal</small>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="seller-content">
          {tab === "products" && formOpen ? (
            /* DEDICATED NEW PAGE: ADD/EDIT PERFUME STUDIO */
            <div className="seller-dedicated-page-view">
              <div className="seller-dedicated-page-topbar">
                <button
                  type="button"
                  className="seller-back-link-btn"
                  onClick={closeStudio}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Products Catalogue</span>
                </button>

                <div className="seller-dedicated-breadcrumbs">
                  <span className="crumb-root">Flovexa Seller Central</span>
                  <span className="crumb-sep">/</span>
                  <button type="button" onClick={closeStudio} className="crumb-link">
                    Catalogue
                  </button>
                  <span className="crumb-sep">/</span>
                  <span className="crumb-current">
                    {editingId ? `Edit "${form.name || "Perfume"}"` : "Add New Perfume"}
                  </span>
                </div>
              </div>

              {(message || errorMessage) && (
                <div className={`seller-message ${errorMessage ? "seller-message-error" : ""}`}>
                  {errorMessage || message}
                </div>
              )}

              <form className="seller-studio-form-v3" onSubmit={handleFormSubmit}>
                {/* Studio Header Banner */}
                <div className="seller-friendly-header">
                  <div className="seller-friendly-title-group">
                    <span className="seller-friendly-badge">
                      {editingId ? "EDIT PERFUME LISTING" : "NEW LUXURY LISTING"}
                    </span>
                    <h2 className="seller-friendly-title">
                      {editingId ? `Edit "${form.name || "Perfume"}"` : "Add New Fragrance to Flovexa"}
                    </h2>
                    <p className="seller-friendly-subtitle">
                      Fill in your perfume details below. See the real-time customer bottle card update instantly on the right!
                    </p>
                  </div>

                  <div className="seller-friendly-top-actions">
                    <button
                      type="button"
                      className="seller-btn-secondary"
                      onClick={closeStudio}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="seller-btn-primary"
                      disabled={busy || uploadingVariantIndex !== null}
                    >
                      <Sparkles size={15} />
                      {busy ? "Saving…" : editingId ? "Save Changes" : "Publish to Store"}
                    </button>
                  </div>
                </div>

                {/* 2-Column Split Workspace */}
                <div className="seller-studio-layout-grid">
                  {/* LEFT COLUMN: The Friendly Setup Cards */}
                  <div className="seller-studio-main-col">
                    {/* CARD 1: Fragrance Basics */}
                    <div className="seller-card-section">
                      <div className="seller-card-head">
                        <div className="seller-card-icon"><Package size={17} /></div>
                        <div>
                          <h3>1. Fragrance Essentials</h3>
                          <p>Name, category classification, and concentration formulation.</p>
                        </div>
                      </div>

                      <div className="seller-form-grid-2">
                        <div className="seller-form-group span-2">
                          <label>Perfume Name <span className="req">*</span></label>
                          <input
                            required
                            maxLength={120}
                            value={form.name}
                            onChange={(e) =>
                              setForm((cur) => ({
                                ...cur,
                                name: e.target.value,
                                slug: slugify(e.target.value),
                              }))
                            }
                            placeholder="e.g. Saffron Royale / Velvet Amber / Midnight Oud"
                          />
                          <small>Customer-facing product name displayed across Flovexa</small>
                        </div>

                        <div className="seller-form-group">
                          <label>Category <span className="req">*</span></label>
                          <select
                            value={form.category}
                            onChange={(e) => setForm((cur) => ({ ...cur, category: e.target.value }))}
                          >
                            {categories.map((c) => (
                              <option key={c} value={c}>
                                {c === "Perfume"
                                  ? "Perfumes (Eau de Parfum)"
                                  : c === "Fragrance"
                                  ? "Fragrance Oils (Attar)"
                                  : c}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="seller-form-group">
                          <label>Concentration Formulation <span className="req">*</span></label>
                          <input
                            required
                            maxLength={80}
                            value={form.concentration}
                            onChange={(e) => setForm((cur) => ({ ...cur, concentration: e.target.value }))}
                            placeholder="e.g. Eau de Parfum"
                          />
                          {/* Quick Chips for Concentration */}
                          <div className="seller-quick-pill-strip">
                            {CONCENTRATION_PRESETS.map((p) => (
                              <button
                                key={p}
                                type="button"
                                className={`seller-quick-pill ${form.concentration === p ? "selected" : ""}`}
                                onClick={() => setForm((cur) => ({ ...cur, concentration: p }))}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: Friendly Bottle Sizes & Pricing Matrix */}
                    <div className="seller-card-section">
                      <div className="seller-card-head">
                        <div className="seller-card-icon"><BadgeIndianRupee size={17} /></div>
                        <div>
                          <h3>2. Bottle Sizes, Pricing & Stock</h3>
                          <p>Configure all bottle sizes you sell. Set your customer purchase price, MRP, and stock for each.</p>
                        </div>
                      </div>

                      {/* 1-Click Quick Add Presets Bar */}
                      <div className="seller-quick-sizes-bar">
                        <span className="seller-quick-sizes-label">⚡ 1-Click Add Common Sizes:</span>
                        <div className="seller-quick-sizes-chips">
                          {["10 ml", "20 ml", "30 ml", "50 ml", "100 ml", "200 ml", "500 ml", "1000 ml"].map((size) => (
                            <button
                              key={size}
                              type="button"
                              className="seller-quick-size-btn"
                              onClick={() => handleAddVariant(size)}
                            >
                              + {size}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* All Variations Visible Together in Friendly Cards List */}
                      <div className="seller-variations-friendly-list">
                        {form.variants.map((v, idx) => {
                          const { amount, unit } = parseBottleSize(v.size);
                          const autoSku = generateDefaultSku(form.name, v.size, idx);
                          const p = Number(v.price) || 0;
                          const mrp = Number(v.compareAtPrice) || 0;
                          const discount = mrp > p && p > 0 ? Math.round(((mrp - p) / mrp) * 100) : 0;
                          const stockNum = Number(v.stock) || 0;

                          return (
                            <div key={idx} className="seller-var-row-card">
                              <div className="seller-var-row-top">
                                <div className="seller-var-row-badge-wrap">
                                  <span className="seller-var-badge">Size #{idx + 1}</span>
                                  <strong className="seller-var-name">{v.size || "New Size"}</strong>
                                  {idx === 0 && <span className="seller-var-primary-tag">★ Primary Default Size</span>}
                                  {v.imageUrl && <span className="seller-var-custom-photo-badge">📷 Size Photo Set</span>}
                                </div>

                                <div className="seller-var-row-actions">
                                  <span className="seller-var-sku-tag">SKU: <code>{v.sku || autoSku}</code></span>
                                  {form.variants.length > 1 && (
                                    <button
                                      type="button"
                                      className="seller-var-remove-btn"
                                      onClick={() => handleRemoveVariant(idx)}
                                      title="Remove this size"
                                    >
                                      <Trash2 size={13} />
                                      <span>Remove</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="seller-var-row-fields">
                                {/* Size Volume */}
                                <div className="seller-form-group">
                                  <label>Volume / Size <span className="req">*</span></label>
                                  <div className="seller-input-suffix">
                                    <input
                                      required
                                      type={unit === "custom" ? "text" : "number"}
                                      min={unit === "custom" ? undefined : "1"}
                                      value={amount}
                                      onChange={(e) => {
                                        const raw = e.target.value;
                                        if (unit === "custom") {
                                          handleUpdateVariant(idx, { size: raw });
                                        } else {
                                          const cleaned = raw.replace(/[^\d.]/g, "");
                                          handleUpdateVariant(idx, { size: cleaned ? `${cleaned} ${unit}` : "" });
                                        }
                                      }}
                                      placeholder="50"
                                    />
                                    {unit !== "custom" && <span className="seller-unit-badge">{unit}</span>}
                                  </div>
                                </div>

                                {/* Selling Price */}
                                <div className="seller-form-group">
                                  <label>Selling Price (₹) <span className="req">*</span></label>
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
                                </div>

                                {/* MRP Price & Discount */}
                                <div className="seller-form-group">
                                  <div className="seller-label-inline-action">
                                    <label>MRP (₹) <small className="opt">(Optional)</small></label>
                                    {discount > 0 && <span className="seller-variant-discount-badge">{discount}% OFF</span>}
                                  </div>
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
                                </div>

                                {/* Available Stock */}
                                <div className="seller-form-group">
                                  <div className="seller-label-inline-action">
                                    <label>Stock Bottles <span className="req">*</span></label>
                                    {stockNum > 0 ? (
                                      <span className="seller-stock-pill-micro ok">In Stock</span>
                                    ) : (
                                      <span className="seller-stock-pill-micro out">Out</span>
                                    )}
                                  </div>
                                  <input
                                    required
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={v.stock}
                                    onChange={(e) => handleUpdateVariant(idx, { stock: e.target.value })}
                                    placeholder="10"
                                  />
                                </div>
                              </div>

                              {/* Row Bottom: Photo uploader for this size */}
                              <div className="seller-var-row-bottom">
                                <div className="seller-var-photo-mini-zone">
                                  <span className="seller-var-photo-label">Size Bottle Photo:</span>
                                  {v.imageUrl ? (
                                    <div className="seller-var-photo-preview-item">
                                      <Image src={v.imageUrl} alt="" width={32} height={32} unoptimized />
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateVariant(idx, { imageUrl: "" })}
                                        className="seller-var-photo-remove"
                                        title="Remove custom photo (use main cover)"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <label className="seller-var-photo-upload-btn">
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={uploadingVariantIndex === idx || busy}
                                        onChange={(e) => {
                                          void uploadVariantPhoto(idx, e.currentTarget.files);
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                      <UploadCloud size={12} />
                                      <span>{uploadingVariantIndex === idx ? "Uploading…" : "+ Upload Size Photo"}</span>
                                    </label>
                                  )}
                                  <small className="seller-var-photo-hint">
                                    {v.imageUrl ? "Custom photo will display when customer chooses this size" : "(Optional: Flovexa will use main cover if empty)"}
                                  </small>
                                </div>

                                <button
                                  type="button"
                                  className="seller-var-auto-sku-btn"
                                  onClick={() => handleUpdateVariant(idx, { sku: autoSku })}
                                  title="Generate standard SKU barcode"
                                >
                                  <Sparkles size={11} /> Auto SKU
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        className="seller-add-another-size-btn"
                        onClick={() => handleAddVariant()}
                      >
                        <Plus size={15} /> Add Another Bottle Size
                      </button>
                    </div>

                    {/* CARD 3: Photos & Visuals */}
                    <div className="seller-card-section">
                      <div className="seller-card-head">
                        <div className="seller-card-icon"><ImagePlus size={17} /></div>
                        <div>
                          <h3>3. Bottle Photography & Gallery</h3>
                          <p>Upload your main catalogue bottle cover and additional gallery angles.</p>
                        </div>
                      </div>

                      {/* Dropzone */}
                      <label className="seller-modern-dropzone">
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          disabled={busy}
                          onChange={(e) => {
                            void uploadGalleryImages(e.currentTarget.files);
                            e.currentTarget.value = "";
                          }}
                        />
                        <div className="seller-dropzone-inner">
                          <div className="seller-dropzone-icon-circle">
                            <UploadCloud size={24} />
                          </div>
                          <div className="seller-dropzone-texts">
                            <strong>Click or Drag & Drop Bottle Photos Here</strong>
                            <span>Supports JPG, PNG, WebP (up to 10 MB each). Multiple photos allowed.</span>
                          </div>
                          <span className="seller-dropzone-action-btn">
                            <Plus size={14} /> Browse Photos from Device
                          </span>
                        </div>
                      </label>

                      {/* Gallery Preview Grid */}
                      {form.images.length > 0 && (
                        <div className="seller-gallery-preview-grid">
                          {form.images.map((imgUrl, idx) => {
                            const isCover = (form.imageUrl || form.images[0]) === imgUrl;
                            return (
                              <div key={`${imgUrl}-${idx}`} className={`seller-gallery-card-v2 ${isCover ? "is-cover" : ""}`}>
                                <div className="seller-gallery-card-thumb">
                                  <Image src={imgUrl} alt={`Gallery #${idx + 1}`} width={120} height={120} unoptimized />
                                  {isCover && <span className="seller-cover-badge-v2">★ Main Cover</span>}
                                  {!isCover && (
                                    <button
                                      type="button"
                                      className="seller-set-cover-btn-v2"
                                      onClick={() => setForm((c) => ({ ...c, imageUrl: imgUrl }))}
                                      title="Set as main storefront cover"
                                    >
                                      Set as Cover
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="seller-remove-photo-btn-v2"
                                    onClick={() =>
                                      setForm((c) => ({
                                        ...c,
                                        images: c.images.filter((img) => img !== imgUrl),
                                        imageUrl: c.imageUrl === imgUrl ? c.images.find((img) => img !== imgUrl) || "" : c.imageUrl,
                                      }))
                                    }
                                    title="Remove photo"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <span className="seller-gallery-card-idx">Photo #{idx + 1}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* CARD 4: Scent Notes & Auto-Write Story */}
                    <div className="seller-card-section">
                      <div className="seller-card-head">
                        <div className="seller-card-icon"><Sparkles size={17} /></div>
                        <div>
                          <h3>4. Olfactory Scent Notes & Fragrance Story</h3>
                          <p>Pick luxury scent notes and write or auto-generate an evocative brand description.</p>
                        </div>
                      </div>

                      <div className="seller-form-group">
                        <label>Olfactory Notes (Comma-separated) <span className="req">*</span></label>
                        <input
                          required
                          maxLength={240}
                          value={form.notes}
                          placeholder="e.g. Bergamot, Kashmiri Saffron, Mysore Sandalwood, Warm Amber"
                          onChange={(e) => setForm((cur) => ({ ...cur, notes: e.target.value }))}
                        />

                        {/* Clickable Quick Note Chips */}
                        <div className="seller-notes-suggest-wrap">
                          <span className="seller-notes-suggest-label">✦ Click to add popular luxury notes:</span>
                          <div className="seller-notes-suggest-chips">
                            {SUGGESTED_NOTES.map((note) => {
                              const isSelected = form.notes.toLowerCase().includes(note.toLowerCase());
                              return (
                                <button
                                  key={note}
                                  type="button"
                                  className={`seller-notes-suggest-chip ${isSelected ? "selected" : ""}`}
                                  onClick={() => handleToggleNote(note)}
                                >
                                  {isSelected ? `✓ ${note}` : `+ ${note}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="seller-form-group" style={{ marginTop: 16 }}>
                        <div className="seller-label-inline-action">
                          <label>Perfume Description & Story <span className="req">*</span></label>
                          <button
                            type="button"
                            className="seller-magic-write-btn"
                            onClick={handleAutoWriteStory}
                            title="Automatically write a luxury perfume story"
                          >
                            <Sparkles size={13} /> ✨ Auto-Write Luxury Story
                          </button>
                        </div>
                        <textarea
                          required
                          minLength={10}
                          maxLength={1600}
                          rows={4}
                          value={form.description}
                          placeholder="Describe the fragrance journey, opening citrus/spices, rich heart notes, and long-lasting drydown... Or click '✨ Auto-Write Luxury Story'!"
                          onChange={(e) => setForm((cur) => ({ ...cur, description: e.target.value }))}
                        />
                        <small>Rich description displayed to prospective customers on Flovexa</small>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Sticky Real-time Storefront Preview & Instant Action */}
                  <div className="seller-studio-preview-col">
                    <div className="seller-sticky-preview-box">
                      {/* Real-time Customer Product Card Replica */}
                      {(() => {
                        const previewVar = form.variants[previewVariantIndex] || form.variants[0];
                        const coverPhoto = previewVar?.imageUrl || form.imageUrl || form.images[0] || "";
                        const p = Number(previewVar?.price) || 0;
                        const mrp = Number(previewVar?.compareAtPrice) || 0;
                        const discount = mrp > p && p > 0 ? Math.round(((mrp - p) / mrp) * 100) : 0;
                        const notesList = form.notes.split(",").map((n) => n.trim()).filter(Boolean);

                        return (
                          <div className="seller-live-preview-card">
                            <div className="seller-live-preview-header">
                              <span className="seller-live-preview-pulse" />
                              <strong>LIVE FLOVEXA PREVIEW</strong>
                              <small>Real-time customer view</small>
                            </div>

                            {/* Bottle Stage */}
                            <div className="seller-live-stage">
                              {coverPhoto ? (
                                <Image src={coverPhoto} alt={form.name || "Perfume"} width={200} height={200} unoptimized className="seller-live-img" />
                              ) : (
                                <div className="seller-live-empty-stage">
                                  <Sparkles size={32} />
                                  <span>Upload a bottle photo to see it live here</span>
                                </div>
                              )}
                              {discount > 0 && <span className="seller-live-discount-ribbon">{discount}% OFF</span>}
                            </div>

                            {/* Details */}
                            <div className="seller-live-info">
                              <span className="seller-live-brand-tag">FLOVEXA LUXURY ARCHIVE · {currentStoreName || "MERCHANT"}</span>
                              <h4 className="seller-live-perfume-title">{form.name || "Fragrance Name"}</h4>
                              <span className="seller-live-formulation">{form.category || "Perfume"} · {form.concentration || "Eau de Parfum"}</span>

                              {/* Interactive Size Switcher Inside Preview */}
                              <div className="seller-live-size-pills">
                                {form.variants.map((v, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    className={`seller-live-size-pill ${previewVariantIndex === i ? "selected" : ""}`}
                                    onClick={() => setPreviewVariantIndex(i)}
                                    title={`Preview size ${v.size || i + 1}`}
                                  >
                                    <span>{v.size || `Size #${i + 1}`}</span>
                                    {v.price && <b>₹{v.price}</b>}
                                  </button>
                                ))}
                              </div>

                              {/* Pricing Block */}
                              <div className="seller-live-price-wrap">
                                <span className="seller-live-price">₹{previewVar?.price || "—"}</span>
                                {mrp > p && p > 0 && (
                                  <span className="seller-live-mrp">₹{previewVar?.compareAtPrice}</span>
                                )}
                                {discount > 0 && <span className="seller-live-savings">Save {discount}%</span>}
                              </div>

                              {/* Notes Tags */}
                              {notesList.length > 0 && (
                                <div className="seller-live-notes-chips">
                                  {notesList.slice(0, 5).map((n, i) => (
                                    <span key={i} className="seller-live-note-chip">✦ {n}</span>
                                  ))}
                                </div>
                              )}

                              {/* Stock Status */}
                              <div className="seller-live-stock-status">
                                {Number(previewVar?.stock) > 0 ? (
                                  <span className="seller-live-instock"><Check size={12} /> In Stock ({previewVar?.stock} bottles ready)</span>
                                ) : (
                                  <span className="seller-live-outofstock"><AlertTriangle size={12} /> Out of stock</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Publish Action Center */}
                      <div className="seller-publish-action-card">
                        <label className="seller-visibility-simple-toggle">
                          <input
                            type="checkbox"
                            checked={form.active}
                            onChange={(e) => setForm((cur) => ({ ...cur, active: e.target.checked }))}
                          />
                          <div>
                            <strong>Publish immediately to customer store</strong>
                            <small>{form.active ? "✓ Live & searchable on Flovexa catalog" : "🔒 Private draft (hidden from store)"}</small>
                          </div>
                        </label>

                        <button
                          type="submit"
                          className="seller-btn-publish-glamour"
                          disabled={busy || uploadingVariantIndex !== null}
                        >
                          <Sparkles size={16} />
                          {uploadingVariantIndex !== null
                            ? "Uploading photo…"
                            : busy
                            ? "Saving perfume…"
                            : editingId
                            ? "Save Perfume Changes"
                            : "Publish Perfume to Store"}
                        </button>

                        <button
                          type="button"
                          className="seller-btn-cancel-link"
                          onClick={closeStudio}
                        >
                          Cancel & Return to Catalogue
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
              </div>
            ) : (
              <>
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
                        ? "Track paid customer shipments, generate consolidated dispatch labels, and assign courier AWB tracking."
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
                  {tab === "orders" && pendingOrdersCount > 0 && (
                    <div className="seller-header-badge-alert">
                      <Sparkles size={13} />
                      <span>{pendingOrdersCount} Order{pendingOrdersCount > 1 ? "s" : ""} Awaiting Dispatch</span>
                    </div>
                  )}
                </div>

                {(message || errorMessage) && (
                  <div className={`seller-message ${errorMessage ? "seller-message-error" : ""}`}>
                    {errorMessage || message}
                  </div>
                )}

                {/* 1. PRODUCT METRIC STATS (Only on Catalogue Tab) */}
                {tab === "products" && (
                  <div className="seller-stats">
                    <div>
                      <span className="seller-stat-label">TOTAL PERFUMES</span>
                      <b>{products.length}</b>
                      <small>{activeProducts} live in customer store</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">LIVE ON STORE</span>
                      <b style={{ color: activeProducts > 0 ? "#15803d" : "inherit" }}>{activeProducts}</b>
                      <small>{products.length - activeProducts} hidden drafts</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">LOW / OUT OF STOCK</span>
                      <b style={{ color: lowStockProducts > 0 ? "#b45309" : "inherit" }}>{lowStockProducts}</b>
                      <small>{lowStockProducts > 0 ? "Requires restock" : "All stock healthy"}</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">INVENTORY BOTTLES</span>
                      <b>{totalStockUnits}</b>
                      <small>Total units ready to sell</small>
                    </div>
                  </div>
                )}

                {/* 2. ORDER METRIC STATS (Only on Orders & Dispatch Tab) */}
                {tab === "orders" && (
                  <div className="seller-stats seller-stats-orders">
                    <div>
                      <span className="seller-stat-label">TOTAL ORDERS</span>
                      <b>{orders.length}</b>
                      <small>All-time captured orders</small>
                    </div>
                    <div className={pendingOrdersCount > 0 ? "seller-stat-highlight-pending" : ""}>
                      <span className="seller-stat-label">PENDING DISPATCH</span>
                      <b style={{ color: pendingOrdersCount > 0 ? "#b45309" : "inherit" }}>{pendingOrdersCount}</b>
                      <small>{pendingOrdersCount > 0 ? "Ready to pack & dispatch" : "All orders dispatched"}</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">IN TRANSIT</span>
                      <b style={{ color: shippedOrdersCount > 0 ? "#1d4ed8" : "inherit" }}>{shippedOrdersCount}</b>
                      <small>{shippedOrdersCount} shipped with courier</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">DELIVERED</span>
                      <b style={{ color: deliveredOrdersCount > 0 ? "#15803d" : "inherit" }}>{deliveredOrdersCount}</b>
                      <small>{deliveredOrdersCount} completed deliveries</small>
                    </div>
                  </div>
                )}

                {/* 3. RETURNS METRIC STATS (Only on Returns Tab) */}
                {tab === "returns" && (
                  <div className="seller-stats">
                    <div>
                      <span className="seller-stat-label">TOTAL RETURNS</span>
                      <b>{returns.length}</b>
                      <small>Customer return inquiries</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">PENDING REVIEW</span>
                      <b style={{ color: pendingReturnsCount > 0 ? "#b45309" : "inherit" }}>{pendingReturnsCount}</b>
                      <small>Awaiting resolution</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">RESOLVED</span>
                      <b>{resolvedReturnsCount}</b>
                      <small>Completed returns</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">RETURN RATE</span>
                      <b>{orders.length > 0 ? `${((returns.length / orders.length) * 100).toFixed(1)}%` : "0%"}</b>
                      <small>Against total orders</small>
                    </div>
                  </div>
                )}

                {/* 4. EARNINGS METRIC STATS (Only on Earnings Tab) */}
                {tab === "earnings" && (
                  <div className="seller-stats">
                    <div>
                      <span className="seller-stat-label">GROSS PRODUCT SALES</span>
                      <b>{money(grossSales)}</b>
                      <small>Captured revenue</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">TOTAL ORDERS</span>
                      <b>{orders.length}</b>
                      <small>Customer purchases</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">AVG ORDER VALUE</span>
                      <b>{orders.length > 0 ? money(Math.round(grossSales / orders.length)) : money(0)}</b>
                      <small>Average order basket</small>
                    </div>
                    <div>
                      <span className="seller-stat-label">SETTLEMENT</span>
                      <b>Weekly</b>
                      <small>Direct bank transfer</small>
                    </div>
                  </div>
                )}

                {/* 1. PRODUCT MANAGEMENT TAB */}
                {tab === "products" && (
                  <section className="seller-panel">
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
                <span>{filteredOrders.length} of {orders.length} orders shown</span>
              </div>

              {/* Order Controls: Search & Status Filters */}
              {orders.length > 0 && (
                <div className="seller-catalog-controls">
                  <div className="seller-search-box">
                    <Search size={15} />
                    <input
                      type="search"
                      placeholder="Search by Order #, Customer Name, or Phone..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                    />
                    {orderSearchQuery && (
                      <button type="button" onClick={() => setOrderSearchQuery("")} className="seller-search-clear">
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="seller-filter-group">
                    <div className="seller-filter-pills">
                      <button
                        type="button"
                        className={orderStatusFilter === "all" ? "active" : ""}
                        onClick={() => setOrderStatusFilter("all")}
                      >
                        All Orders ({orders.length})
                      </button>
                      <button
                        type="button"
                        className={`${orderStatusFilter === "pending" ? "active" : ""} ${pendingOrdersCount > 0 ? "has-badge" : ""}`}
                        onClick={() => setOrderStatusFilter("pending")}
                      >
                        Pending Dispatch ({pendingOrdersCount})
                      </button>
                      <button
                        type="button"
                        className={orderStatusFilter === "shipped" ? "active" : ""}
                        onClick={() => setOrderStatusFilter("shipped")}
                      >
                        In Transit ({shippedOrdersCount})
                      </button>
                      <button
                        type="button"
                        className={orderStatusFilter === "delivered" ? "active" : ""}
                        onClick={() => setOrderStatusFilter("delivered")}
                      >
                        Delivered ({deliveredOrdersCount})
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
              ) : !filteredOrders.length ? (
                <div className="admin-empty">
                  <Search size={24} />
                  <b>No orders matched your filter</b>
                  <span>Try changing your search keywords or switching status tabs.</span>
                  <button
                    onClick={() => {
                      setOrderSearchQuery("");
                      setOrderStatusFilter("all");
                    }}
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <div className="seller-order-list">
                  {filteredOrders.map((order) => {
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
        </>
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
