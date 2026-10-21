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

  function handleAddSuggestedNote(note: string) {
    setForm((current) => {
      const existing = current.notes
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      if (existing.some((n) => n.toLowerCase() === note.toLowerCase())) {
        return current;
      }
      const updated = [...existing, note].join(", ");
      return { ...current, notes: updated };
    });
  }

  function handleNextStep() {
    setErrorMessage("");
    if (activeFormStep === 1) {
      if (!form.name.trim()) {
        setErrorMessage("Please enter a perfume name before continuing.");
        return;
      }
      if (!form.category.trim()) {
        setErrorMessage("Please select a perfume category.");
        return;
      }
      setActiveFormStep(2);
    } else if (activeFormStep === 2) {
      if (!form.variants || form.variants.length === 0) {
        setErrorMessage("Please configure at least one bottle size.");
        return;
      }
      for (let i = 0; i < form.variants.length; i++) {
        const v = form.variants[i];
        if (!v.size.trim()) {
          setErrorMessage(`Size volume is required for size #${i + 1}`);
          setActiveVariantTab(i);
          return;
        }
        const p = Number(v.price);
        if (Number.isNaN(p) || p <= 0) {
          setErrorMessage(`Please enter a valid selling price in ₹ for size "${v.size}"`);
          setActiveVariantTab(i);
          return;
        }
      }
      setActiveFormStep(3);
    } else if (activeFormStep === 3) {
      setActiveFormStep(4);
    }
  }

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (activeFormStep < 4) {
      handleNextStep();
      return;
    }
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

              <form className="seller-studio-form" onSubmit={handleFormSubmit}>
                  {/* Studio Header: Sleek, Focused Luxury Portal Banner */}
                  <div className="seller-studio-header">
                    <div className="seller-studio-title-wrap">
                      <div className="seller-studio-badge-row">
                        <span className="seller-studio-badge">
                          {editingId ? "PERFUME STUDIO · EDIT MODE" : "PERFUME STUDIO · CREATION MODE"}
                        </span>
                        <span className="seller-studio-step-indicator">
                          Step {activeFormStep} of 4:{" "}
                          {activeFormStep === 1
                            ? "Fragrance Identity"
                            : activeFormStep === 2
                            ? "Bottle Sizes & Stock"
                            : activeFormStep === 3
                            ? "Bottle Photos & Artwork"
                            : "Live Storefront Preview"}
                        </span>
                      </div>
                      <h3 className="seller-studio-title">
                        {editingId ? `Edit "${form.name || "Untitled Perfume"}"` : "Craft a New Luxury Perfume Listing"}
                      </h3>
                      <p className="seller-studio-subtitle">
                        Guided 4-step fragrance builder with real-time Flovexa storefront simulation and multi-size inventory.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="seller-studio-close-btn"
                      onClick={closeStudio}
                      title="Close studio and return to catalogue"
                    >
                      ✕ Exit Studio
                    </button>
                  </div>

                  {/* Luxury Stepper Bar (Horizontal Progress Navigator) */}
                  <div className="seller-studio-stepper" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFormStep === 1}
                      className={`seller-stepper-tab ${activeFormStep === 1 ? "active" : activeFormStep > 1 ? "completed" : ""}`}
                      onClick={() => {
                        setErrorMessage("");
                        setActiveFormStep(1);
                      }}
                    >
                      <div className="seller-stepper-tab-num">
                        {activeFormStep > 1 ? <Check size={14} /> : "01"}
                      </div>
                      <div className="seller-stepper-tab-text">
                        <strong>Fragrance Identity</strong>
                        <small>Name, notes & story</small>
                      </div>
                    </button>

                    <div className={`seller-stepper-connector ${activeFormStep > 1 ? "completed" : ""}`} />

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFormStep === 2}
                      className={`seller-stepper-tab ${activeFormStep === 2 ? "active" : activeFormStep > 2 ? "completed" : ""}`}
                      onClick={() => {
                        if (!form.name.trim()) {
                          setErrorMessage("Please enter a perfume name first.");
                          return;
                        }
                        setErrorMessage("");
                        setActiveFormStep(2);
                      }}
                    >
                      <div className="seller-stepper-tab-num">
                        {activeFormStep > 2 ? <Check size={14} /> : "02"}
                      </div>
                      <div className="seller-stepper-tab-text">
                        <strong>Sizes & Pricing</strong>
                        <small>{form.variants.length} size{form.variants.length > 1 ? "s" : ""}, prices & SKU</small>
                      </div>
                    </button>

                    <div className={`seller-stepper-connector ${activeFormStep > 2 ? "completed" : ""}`} />

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFormStep === 3}
                      className={`seller-stepper-tab ${activeFormStep === 3 ? "active" : activeFormStep > 3 ? "completed" : ""}`}
                      onClick={() => {
                        setErrorMessage("");
                        setActiveFormStep(3);
                      }}
                    >
                      <div className="seller-stepper-tab-num">
                        {activeFormStep > 3 ? <Check size={14} /> : "03"}
                      </div>
                      <div className="seller-stepper-tab-text">
                        <strong>Bottle Photos</strong>
                        <small>{form.images.length || (form.imageUrl ? 1 : 0)} photo(s)</small>
                      </div>
                    </button>

                    <div className={`seller-stepper-connector ${activeFormStep > 3 ? "completed" : ""}`} />

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeFormStep === 4}
                      className={`seller-stepper-tab ${activeFormStep === 4 ? "active" : ""}`}
                      onClick={() => {
                        setErrorMessage("");
                        setActiveFormStep(4);
                      }}
                    >
                      <div className="seller-stepper-tab-num">
                        <Sparkles size={14} />
                      </div>
                      <div className="seller-stepper-tab-text">
                        <strong>Storefront Preview</strong>
                        <small>Review & publish</small>
                      </div>
                    </button>
                  </div>

                  {/* STEP CONTENT BODY */}
                  <div className="seller-studio-content">
                    {/* ======================================================== */}
                    {/* STEP 1: FRAGRANCE IDENTITY & SCENT STORY                 */}
                    {/* ======================================================== */}
                    {activeFormStep === 1 && (
                      <div className="seller-studio-step-pane">
                        <div className="seller-step-section-header">
                          <div className="seller-step-icon-box">
                            <Package size={18} />
                          </div>
                          <div>
                            <h4>Fragrance Identity & Olfactory Formulation</h4>
                            <p>Establish the foundation of your perfume: name, category, scent potency, ingredients, and description.</p>
                          </div>
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
                              placeholder="e.g. Saffron Royale / Oud Imperial / Velvet Amber"
                            />
                            <small>The signature name shoppers see on Flovexa storefront</small>
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
                            <small>Catalog classification & navigation filter</small>
                          </div>

                          <div className="seller-form-group">
                            <label>
                              Concentration Formulation <span className="req">*</span>
                            </label>
                            <input
                              required
                              maxLength={80}
                              value={form.concentration}
                              onChange={(event) =>
                                setForm((current) => ({ ...current, concentration: event.target.value }))
                              }
                              placeholder="e.g. Eau de Parfum / Extrait de Parfum / Concentrated Attar"
                            />
                            <small>Oil potency and sillage projection level</small>
                          </div>

                          <div className="seller-form-group span-2">
                            <label>
                              Olfactory Notes (Comma-separated) <span className="req">*</span>
                            </label>
                            <input
                              required
                              maxLength={240}
                              value={form.notes}
                              placeholder="e.g. Bergamot, Turkish Rose, Amber, Mysore Sandalwood, Dark Cocoa"
                              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                            />
                            <small>Key ingredients highlighted on customer product details</small>

                            {/* 1-Click Note Suggestions Chips */}
                            <div className="seller-notes-suggest-wrap">
                              <span className="seller-notes-suggest-label">✦ Click to add luxury notes:</span>
                              <div className="seller-notes-suggest-chips">
                                {SUGGESTED_NOTES.map((note) => (
                                  <button
                                    key={note}
                                    type="button"
                                    className="seller-notes-suggest-chip"
                                    onClick={() => handleAddSuggestedNote(note)}
                                  >
                                    + {note}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="seller-form-group span-2">
                            <label>
                              Perfume Story & Olfactory Journey <span className="req">*</span>
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
                            <small>Romantic brand story and evocative fragrance experience for prospective buyers</small>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* STEP 2: BOTTLE SIZES, PRICING & INVENTORY               */}
                    {/* ======================================================== */}
                    {activeFormStep === 2 && (
                      <div className="seller-studio-step-pane">
                        <div className="seller-step-section-header">
                          <div className="seller-step-icon-box">
                            <BadgeIndianRupee size={18} />
                          </div>
                          <div>
                            <h4>Bottle Sizes, Pricing & Stock Management</h4>
                            <p>Configure each volume variation individually with tabbed navigation, SKU barcodes, and live discount calculations.</p>
                          </div>
                        </div>

                        {/* Quick Presets Bar */}
                        <div className="seller-variant-presets-row">
                          <span className="seller-variant-presets-label">⚡ 1-Click Add Common Sizes:</span>
                          <div className="seller-variant-presets-btns">
                            {["10 ml", "20 ml", "30 ml", "50 ml", "100 ml", "200 ml", "500 ml", "1000 ml"].map((preset) => (
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

                        {/* Horizontal Size Switcher Tabs */}
                        <div className="seller-variant-tabs-row">
                          <div className="seller-variant-tabs-list">
                            {form.variants.map((v, idx) => {
                              const isSelected = activeVariantTab === idx;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  className={`seller-variant-tab-btn ${isSelected ? "selected" : ""}`}
                                  onClick={() => setActiveVariantTab(idx)}
                                >
                                  <span className="seller-tab-num">#{idx + 1}</span>
                                  <strong className="seller-tab-size">{v.size || "New Size"}</strong>
                                  {idx === 0 && <span className="seller-tab-primary-badge" title="Default primary size">★ Primary</span>}
                                  {v.price && <span className="seller-tab-price">₹{v.price}</span>}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            className="seller-variant-add-tab-btn"
                            onClick={() => handleAddVariant()}
                            title="Add another bottle size"
                          >
                            <Plus size={14} /> Add Size
                          </button>
                        </div>

                        {/* Focused Active Size Card */}
                        {(() => {
                          const currentIdx = Math.min(activeVariantTab, form.variants.length - 1);
                          const v = form.variants[currentIdx] || form.variants[0];
                          const { amount, unit } = parseBottleSize(v.size);
                          const autoSku = generateDefaultSku(form.name, v.size, currentIdx);
                          const currentSku = v.sku || autoSku;
                          const stockNum = Number(v.stock) || 0;

                          return (
                            <div className="seller-variant-focused-card">
                              <div className="seller-variant-card-header">
                                <div className="seller-variant-card-title">
                                  <span className="seller-variant-num-badge">Size #{currentIdx + 1}</span>
                                  <strong className="seller-variant-heading">Editing: {v.size || "Untitled Size"}</strong>
                                  {currentIdx === 0 && <span className="seller-variant-primary-badge">★ Default / Primary Size</span>}
                                  {v.imageUrl && <span className="seller-variant-custom-photo-badge">📷 Size-Specific Photo</span>}
                                </div>

                                <div className="seller-variant-card-actions">
                                  <span className="seller-variant-sku-pill" title="SKU barcode for this size">
                                    <span className="seller-variant-sku-tag">SKU</span>
                                    <code>{currentSku}</code>
                                  </span>
                                  {form.variants.length > 1 && (
                                    <button
                                      type="button"
                                      className="seller-variant-delete-btn"
                                      onClick={() => handleRemoveVariant(currentIdx)}
                                      title="Remove this size variation"
                                    >
                                      <Trash2 size={13} />
                                      <span>Remove Size</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="seller-variant-card-body">
                                {/* Left Column: Details */}
                                <div className="seller-variant-col-details">
                                  {/* Row 1: Volume & SKU */}
                                  <div className="seller-variant-field-row">
                                    <div className="seller-form-group">
                                      <label>
                                        Bottle Size / Volume <span className="req">*</span>
                                      </label>
                                      <div className="seller-size-input-cluster">
                                        <div className="seller-input-suffix">
                                          <input
                                            required
                                            type={unit === "custom" ? "text" : "number"}
                                            min={unit === "custom" ? undefined : "1"}
                                            step="any"
                                            value={amount}
                                            onChange={(e) => {
                                              const raw = e.target.value;
                                              if (unit === "custom") {
                                                handleUpdateVariant(currentIdx, { size: raw });
                                              } else {
                                                const cleaned = raw.replace(/[^\d.]/g, "");
                                                handleUpdateVariant(currentIdx, { size: cleaned ? `${cleaned} ${unit}` : "" });
                                              }
                                            }}
                                            placeholder={unit === "custom" ? "e.g. Travel Spray" : "50"}
                                          />
                                          {unit !== "custom" && <span className="seller-unit-badge">{unit}</span>}
                                        </div>
                                        <select
                                          className="seller-unit-select"
                                          value={unit}
                                          onChange={(e) => {
                                            const nextUnit = e.target.value;
                                            if (nextUnit === "custom") {
                                              handleUpdateVariant(currentIdx, { size: amount });
                                            } else {
                                              const cleaned = amount.replace(/[^\d.]/g, "");
                                              handleUpdateVariant(currentIdx, { size: cleaned ? `${cleaned} ${nextUnit}` : "" });
                                            }
                                          }}
                                          title="Unit of measurement"
                                        >
                                          <option value="ml">ml (Default)</option>
                                          <option value="g">g</option>
                                          <option value="oz">oz</option>
                                          <option value="custom">Custom</option>
                                        </select>
                                      </div>
                                      <small>Default unit: ml (e.g. 50, 100, 500, 1000)</small>
                                    </div>

                                    <div className="seller-form-group">
                                      <div className="seller-label-inline-action">
                                        <label>SKU / Barcode ID</label>
                                        <button
                                          type="button"
                                          className="seller-sku-auto-link"
                                          onClick={() => handleUpdateVariant(currentIdx, { sku: autoSku })}
                                          title="Click to generate standard SKU code"
                                        >
                                          <Sparkles size={11} /> Auto
                                        </button>
                                      </div>
                                      <div className="seller-sku-field-box">
                                        <input
                                          type="text"
                                          maxLength={50}
                                          value={v.sku || ""}
                                          onChange={(e) => handleUpdateVariant(currentIdx, { sku: e.target.value.toUpperCase() })}
                                          placeholder={autoSku}
                                          className="seller-sku-input"
                                        />
                                      </div>
                                      <small>Warehouse barcode & shipping inventory ID</small>
                                    </div>
                                  </div>

                                  {/* Row 2: Pricing */}
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
                                          onChange={(e) => handleUpdateVariant(currentIdx, { price: e.target.value })}
                                          placeholder="499"
                                        />
                                      </div>
                                      <small>Customer purchase price on Flovexa</small>
                                    </div>

                                    <div className="seller-form-group">
                                      <div className="seller-label-inline-action">
                                        <label>
                                          MRP / Regular Price (₹) <small className="opt">(Optional)</small>
                                        </label>
                                        {(() => {
                                          const p = Number(v.price) || 0;
                                          const mrp = Number(v.compareAtPrice) || 0;
                                          if (mrp > p && p > 0) {
                                            const disc = Math.round(((mrp - p) / mrp) * 100);
                                            return <span className="seller-variant-discount-badge">{disc}% OFF</span>;
                                          }
                                          return null;
                                        })()}
                                      </div>
                                      <div className="seller-input-prefix">
                                        <span>₹</span>
                                        <input
                                          type="number"
                                          min="1"
                                          step="0.01"
                                          value={v.compareAtPrice}
                                          onChange={(e) => handleUpdateVariant(currentIdx, { compareAtPrice: e.target.value })}
                                          placeholder="999"
                                        />
                                      </div>
                                      <small>Strikethrough discount reference price</small>
                                    </div>
                                  </div>

                                  {/* Row 3: Stock & Inventory Status */}
                                  <div className="seller-variant-field-row">
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
                                        onChange={(e) => handleUpdateVariant(currentIdx, { stock: e.target.value })}
                                        placeholder="10"
                                      />
                                      <small>Bottles packed & ready in warehouse</small>
                                    </div>

                                    <div className="seller-form-group">
                                      <label>Inventory Status</label>
                                      <div className="seller-stock-status-box">
                                        {stockNum === 0 ? (
                                          <span className="seller-status-chip out">
                                            <AlertTriangle size={12} /> Out of stock
                                          </span>
                                        ) : stockNum <= 5 ? (
                                          <span className="seller-status-chip low">
                                            <AlertTriangle size={12} /> Low Stock ({stockNum} left)
                                          </span>
                                        ) : (
                                          <span className="seller-status-chip ok">
                                            <Check size={12} /> In Stock ({stockNum} ready)
                                          </span>
                                        )}
                                      </div>
                                      <small>Real-time availability shown to customers</small>
                                    </div>
                                  </div>
                                </div>

                                {/* Right Column: Bottle Photo Upload */}
                                <div className="seller-variant-col-photo">
                                  <div className="seller-variant-photo-card">
                                    <div className="seller-variant-photo-card-header">
                                      <div className="seller-photo-card-title">
                                        <ImagePlus size={14} />
                                        <strong>Bottle Photo for {v.size || `Size #${currentIdx + 1}`}</strong>
                                      </div>
                                      <small className="opt">(Optional)</small>
                                    </div>

                                    <div className="seller-variant-photo-interactive">
                                      <div className={`seller-variant-photo-preview-box ${v.imageUrl ? "has-image" : "empty"}`}>
                                        {v.imageUrl ? (
                                          <Image
                                            src={v.imageUrl}
                                            alt={`Photo for ${v.size}`}
                                            width={82}
                                            height={82}
                                            unoptimized
                                          />
                                        ) : (
                                          <div className="seller-variant-photo-placeholder">
                                            <ImagePlus size={24} />
                                            <span>No photo</span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="seller-variant-photo-controls">
                                        <label className={`seller-variant-file-btn ${uploadingVariantIndex === currentIdx ? "uploading" : ""}`}>
                                          <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            disabled={uploadingVariantIndex === currentIdx || busy}
                                            onChange={(e) => {
                                              void uploadVariantPhoto(currentIdx, e.currentTarget.files);
                                              e.currentTarget.value = "";
                                            }}
                                          />
                                          <UploadCloud size={14} />
                                          <span>
                                            {uploadingVariantIndex === currentIdx
                                              ? "Uploading photo…"
                                              : v.imageUrl
                                              ? "Change Photo"
                                              : "Upload Bottle Photo"}
                                          </span>
                                        </label>

                                        {v.imageUrl && (
                                          <button
                                            type="button"
                                            className="seller-variant-photo-reset-btn"
                                            onClick={() => handleUpdateVariant(currentIdx, { imageUrl: "" })}
                                          >
                                            <Trash2 size={12} /> Remove (Use Default Cover)
                                          </button>
                                        )}

                                        <span className="seller-variant-photo-hint">
                                          {v.imageUrl
                                            ? "✓ Displays when customer chooses this size."
                                            : "Flovexa will use main cover if left empty."}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Gallery Thumbs Quick Pick */}
                                    {form.images.length > 0 && (
                                      <div className="seller-variant-gallery-picker-wrap">
                                        <span className="seller-variant-gallery-picker-label">Or choose from perfume gallery:</span>
                                        <div className="seller-variant-gallery-picker-grid">
                                          {form.images.map((imgUrl, thumbIdx) => {
                                            const isSelected = v.imageUrl === imgUrl;
                                            return (
                                              <button
                                                key={`${imgUrl}-${thumbIdx}`}
                                                type="button"
                                                className={`seller-variant-gallery-pick-btn ${isSelected ? "selected" : ""}`}
                                                onClick={() => handleUpdateVariant(currentIdx, { imageUrl: imgUrl })}
                                                title={`Use photo #${thumbIdx + 1} for this size`}
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
                          );
                        })()}

                        {/* Sizes Summary Bar */}
                        <div className="seller-sizes-summary-card">
                          <span className="seller-sizes-summary-title">Summary of All Configured Sizes ({form.variants.length}):</span>
                          <div className="seller-sizes-summary-chips">
                            {form.variants.map((v, i) => (
                              <button
                                key={i}
                                type="button"
                                className={`seller-sizes-summary-chip ${activeVariantTab === i ? "active" : ""}`}
                                onClick={() => setActiveVariantTab(i)}
                              >
                                <span className="seller-chip-size">{v.size || `Size #${i + 1}`}</span>
                                <span className="seller-chip-sep">·</span>
                                <span className="seller-chip-price">{v.price ? `₹${v.price}` : "No price"}</span>
                                <span className="seller-chip-sep">·</span>
                                <span className="seller-chip-stock">{v.stock || 0} in stock</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* STEP 3: GALLERY & ARTWORK                                */}
                    {/* ======================================================== */}
                    {activeFormStep === 3 && (
                      <div className="seller-studio-step-pane">
                        <div className="seller-step-section-header">
                          <div className="seller-step-icon-box">
                            <ImagePlus size={18} />
                          </div>
                          <div>
                            <h4>Luxury Bottle Photography & Gallery</h4>
                            <p>Upload high-resolution perfume imagery. Set your official catalogue cover and showcase packaging angles.</p>
                          </div>
                        </div>

                        {/* Spotlight Primary Cover */}
                        <div className="seller-gallery-cover-spotlight">
                          <div className="seller-cover-spotlight-visual">
                            {form.imageUrl || form.images[0] ? (
                              <Image
                                src={form.imageUrl || form.images[0]}
                                alt="Primary Cover"
                                width={140}
                                height={140}
                                unoptimized
                                className="seller-cover-spotlight-img"
                              />
                            ) : (
                              <div className="seller-cover-spotlight-placeholder">
                                <ImagePlus size={36} />
                                <span>No primary cover photo</span>
                              </div>
                            )}
                          </div>

                          <div className="seller-cover-spotlight-info">
                            <span className="seller-cover-tag">★ OFFICIAL CATALOGUE COVER</span>
                            <h5>Primary Storefront Display Image</h5>
                            <p>This image is displayed on the Flovexa homepage, search results, and category listings.</p>
                            {form.imageUrl && (
                              <span className="seller-cover-active-hint">✓ Cover image is set and active</span>
                            )}
                          </div>
                        </div>

                        {/* Modern Dropzone */}
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
                              <span>Supports JPG, PNG, WebP (up to 10 MB each). Multiple uploads allowed.</span>
                            </div>
                            <span className="seller-dropzone-action-btn">
                              <Plus size={14} /> Browse from Device
                            </span>
                          </div>
                        </label>

                        {/* Uploaded Gallery Grid */}
                        {form.images.length > 0 ? (
                          <div className="seller-gallery-preview-grid">
                            {form.images.map((imgUrl, idx) => {
                              const isCover = (form.imageUrl || form.images[0]) === imgUrl;
                              return (
                                <div key={`${imgUrl}-${idx}`} className={`seller-gallery-card-v2 ${isCover ? "is-cover" : ""}`}>
                                  <div className="seller-gallery-card-thumb">
                                    <Image src={imgUrl} alt={`Gallery #${idx + 1}`} width={120} height={120} unoptimized />
                                    {isCover && <span className="seller-cover-badge-v2">★ Cover</span>}
                                    {!isCover && (
                                      <button
                                        type="button"
                                        className="seller-set-cover-btn-v2"
                                        onClick={() => setForm((c) => ({ ...c, imageUrl: imgUrl }))}
                                        title="Set as primary catalogue cover"
                                      >
                                        Set Cover
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
                        ) : (
                          <div className="seller-gallery-empty-hint">
                            <Sparkles size={16} />
                            <span>You haven&apos;t uploaded any gallery photos yet. Flovexa will use standard luxury bottle placeholders until photos are uploaded.</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ======================================================== */}
                    {/* STEP 4: LIVE STOREFRONT PREVIEW & INSTANT PUBLISH        */}
                    {/* ======================================================== */}
                    {activeFormStep === 4 && (
                      <div className="seller-studio-step-pane">
                        <div className="seller-step-section-header">
                          <div className="seller-step-icon-box">
                            <Eye size={18} />
                          </div>
                          <div>
                            <h4>Real-time Flovexa Storefront Simulation</h4>
                            <p>Experience how prospective customers will view, interact with, and purchase this fragrance on the Flovexa live store.</p>
                          </div>
                        </div>

                        {/* Interactive Split Grid */}
                        <div className="seller-preview-split-grid">
                          {/* Left: Customer Product Mockup */}
                          {(() => {
                            const currentPreviewVar = form.variants[previewVariantIndex] || form.variants[0];
                            const previewPhoto = currentPreviewVar?.imageUrl || form.imageUrl || form.images[0] || "";
                            const p = Number(currentPreviewVar?.price) || 0;
                            const mrp = Number(currentPreviewVar?.compareAtPrice) || 0;
                            const discount = mrp > p && p > 0 ? Math.round(((mrp - p) / mrp) * 100) : 0;
                            const notesList = form.notes.split(",").map((n) => n.trim()).filter(Boolean);

                            return (
                              <div className="seller-preview-mockup-wrapper">
                                <div className="seller-preview-mockup-topbar">
                                  <span className="seller-preview-mockup-dot red" />
                                  <span className="seller-preview-mockup-dot yellow" />
                                  <span className="seller-preview-mockup-dot green" />
                                  <span className="seller-preview-mockup-url">flovexa.com/products/{form.slug || "fragrance"}</span>
                                </div>

                                <div className="seller-preview-card" style={{ borderColor: form.accent || "#ad7045" }}>
                                  {/* Visual Bottle Stage */}
                                  <div className="seller-preview-stage">
                                    <div className="seller-preview-bottle-box" style={{ boxShadow: `0 12px 36px ${form.accent || "#ad7045"}33` }}>
                                      {previewPhoto ? (
                                        <Image
                                          src={previewPhoto}
                                          alt={form.name || "Perfume"}
                                          width={220}
                                          height={220}
                                          unoptimized
                                          className="seller-preview-img"
                                        />
                                      ) : (
                                        <div className="seller-preview-img-empty">
                                          <Sparkles size={34} />
                                          <span>No photo uploaded</span>
                                        </div>
                                      )}
                                      {discount > 0 && <span className="seller-preview-discount-ribbon">{discount}% OFF</span>}
                                    </div>
                                  </div>

                                  {/* Details Column */}
                                  <div className="seller-preview-details">
                                    <div className="seller-preview-brand-tag">
                                      <span>FLOVEXA LUXURY ARCHIVE · {currentStoreName || "OFFICIAL MERCHANT"}</span>
                                    </div>

                                    <h3 className="seller-preview-perfume-name">{form.name || "Untitled Fragrance"}</h3>

                                    <div className="seller-preview-formulation-pill">
                                      <span>{form.category || "Perfume"}</span>
                                      <span>·</span>
                                      <span>{form.concentration || "Eau de Parfum"}</span>
                                    </div>

                                    {/* Interactive Size Switcher Inside Preview */}
                                    <div className="seller-preview-size-switcher">
                                      <span className="seller-preview-size-label">Select Bottle Size (Interactive):</span>
                                      <div className="seller-preview-size-btns">
                                        {form.variants.map((v, i) => {
                                          const isPSelected = previewVariantIndex === i;
                                          return (
                                            <button
                                              key={i}
                                              type="button"
                                              className={`seller-preview-size-btn ${isPSelected ? "selected" : ""}`}
                                              onClick={() => setPreviewVariantIndex(i)}
                                            >
                                              <span>{v.size || `Size #${i + 1}`}</span>
                                              {v.price && <b>₹{v.price}</b>}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Live Price Display */}
                                    <div className="seller-preview-pricing-block">
                                      <div className="seller-preview-price-current">
                                        ₹{currentPreviewVar?.price || "—"}
                                      </div>
                                      {mrp > p && p > 0 && (
                                        <div className="seller-preview-price-mrp">
                                          ₹{currentPreviewVar?.compareAtPrice}
                                        </div>
                                      )}
                                      {discount > 0 && (
                                        <span className="seller-preview-savings-badge">Save ₹{mrp - p} ({discount}%)</span>
                                      )}
                                    </div>

                                    {/* Notes Chips */}
                                    {notesList.length > 0 && (
                                      <div className="seller-preview-notes-wrap">
                                        <span className="seller-preview-notes-title">Olfactory Notes:</span>
                                        <div className="seller-preview-notes-tags">
                                          {notesList.slice(0, 6).map((note, i) => (
                                            <span key={i} className="seller-preview-note-tag">
                                              ✦ {note}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Stock & Fulfillment */}
                                    <div className="seller-preview-fulfillment-strip">
                                      {Number(currentPreviewVar?.stock) > 0 ? (
                                        <span className="seller-preview-stock-chip ok">
                                          <Check size={12} /> In Stock ({currentPreviewVar?.stock} bottles ready to ship)
                                        </span>
                                      ) : (
                                        <span className="seller-preview-stock-chip out">
                                          <AlertTriangle size={12} /> Out of stock
                                        </span>
                                      )}
                                      <span className="seller-preview-trust-item">🚚 Express 24h Courier Dispatch</span>
                                      <span className="seller-preview-trust-item">🛡️ 100% Genuine Flovexa Guarantee</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Right: Pre-Flight Readiness & Publish Center */}
                          <div className="seller-preview-publish-center">
                            {/* Readiness Checklist */}
                            <div className="seller-preview-checklist-card">
                              <div className="seller-checklist-header">
                                <CheckCircle2 size={16} />
                                <strong>Catalogue Readiness Check</strong>
                              </div>

                              <div className="seller-checklist-items">
                                <div className={`seller-checklist-item ${form.name.trim() ? "ready" : "warning"}`}>
                                  <span className="seller-checklist-icon">{form.name.trim() ? "✓" : "!"}</span>
                                  <div>
                                    <strong>Perfume Name</strong>
                                    <small>{form.name.trim() || "Missing perfume name"}</small>
                                  </div>
                                </div>

                                <div className={`seller-checklist-item ${form.variants.length > 0 && form.variants.every((v) => Number(v.price) > 0) ? "ready" : "warning"}`}>
                                  <span className="seller-checklist-icon">
                                    {form.variants.length > 0 && form.variants.every((v) => Number(v.price) > 0) ? "✓" : "!"}
                                  </span>
                                  <div>
                                    <strong>Bottle Variations</strong>
                                    <small>{form.variants.length} size(s) configured with prices</small>
                                  </div>
                                </div>

                                <div className={`seller-checklist-item ${form.imageUrl || form.images.length > 0 ? "ready" : "warning"}`}>
                                  <span className="seller-checklist-icon">
                                    {form.imageUrl || form.images.length > 0 ? "✓" : "!"}
                                  </span>
                                  <div>
                                    <strong>Bottle Photography</strong>
                                    <small>
                                      {form.imageUrl || form.images.length > 0
                                        ? `${form.images.length || 1} photo(s) ready`
                                        : "No photo uploaded (placeholder will be used)"}
                                    </small>
                                  </div>
                                </div>

                                <div className={`seller-checklist-item ${form.notes.trim() ? "ready" : "warning"}`}>
                                  <span className="seller-checklist-icon">{form.notes.trim() ? "✓" : "!"}</span>
                                  <div>
                                    <strong>Olfactory Notes & Story</strong>
                                    <small>{form.notes.trim() ? "Ingredients configured" : "Optional notes empty"}</small>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Visibility Switch */}
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

                            {/* Big Publish Action */}
                            <div className="seller-publish-action-box">
                              <button
                                type="button"
                                className="seller-btn-save-v2 seller-btn-publish-glamour"
                                onClick={() => void saveProduct()}
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
                              <small className="seller-publish-footnote">
                                {form.active
                                  ? "✓ Will be instantly visible on Flovexa customer storefront."
                                  : "🔒 Will be saved as a private draft (hidden from shoppers)."}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ======================================================== */}
                  {/* STICKY FOOTER CONTROLS ACROSS ALL STEPS                  */}
                  {/* ======================================================== */}
                  <div className="seller-studio-footer-nav">
                    <div className="seller-studio-footer-left">
                      {activeFormStep > 1 ? (
                        <button
                          type="button"
                          className="seller-studio-nav-back-btn"
                          onClick={() => {
                            setErrorMessage("");
                            setActiveFormStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1));
                          }}
                        >
                          <ArrowLeft size={14} /> Back
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="seller-studio-nav-cancel-btn"
                          onClick={closeStudio}
                        >
                          ✕ Cancel & Close
                        </button>
                      )}
                      <span className="seller-studio-step-counter">
                        Step {activeFormStep} of 4 ·{" "}
                        {activeFormStep === 1
                          ? "Fragrance Identity"
                          : activeFormStep === 2
                          ? "Bottle Sizes & Stock"
                          : activeFormStep === 3
                          ? "Bottle Photos & Artwork"
                          : "Storefront Preview & Publish"}
                      </span>
                    </div>

                    <div className="seller-studio-footer-right">
                      {activeFormStep < 4 ? (
                        <button
                          type="button"
                          className="seller-studio-nav-next-btn"
                          onClick={handleNextStep}
                        >
                          Continue to{" "}
                          {activeFormStep === 1
                            ? "Sizes & Pricing"
                            : activeFormStep === 2
                            ? "Bottle Photos"
                            : "Live Preview & Publish"}{" "}
                          <ArrowRight size={14} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="seller-btn-save-v2 seller-btn-publish-glamour"
                          onClick={() => void saveProduct()}
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
                      )}
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
